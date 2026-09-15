import { PrismaClient, WorkflowRunStatus, StepExecutionStatus } from '@prisma/client';
import { ActionsRegistry, ActionDefinition } from './automation.actions-registry.js';
import { targetLockManager } from './automation.locks.js';
import { circuitBreakerManager } from './automation.circuit-breaker.js';

export interface ExecuteRunOptions {
  runId: string;
  workflowId: string;
  targetType: string;
  targetIdentifier: string;
  isDryRun: boolean;
  userRole: string;
  userId?: string;
  overrideParameters?: Record<string, any>;
}

export class AutomationWorker {
  private registry: ActionsRegistry;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient, registry: ActionsRegistry) {
    this.prisma = prisma;
    this.registry = registry;
  }

  public async executeWorkflowRun(options: ExecuteRunOptions): Promise<{ success: boolean; status: WorkflowRunStatus; error?: string }> {
    const { runId, workflowId, targetType, targetIdentifier, isDryRun, userRole, userId, overrideParameters } = options;

    // 1. Fetch workflow & version
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        workflow: {
          include: {
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
              include: { steps: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });

    if (!run || !run.workflow) {
      throw new Error(`Workflow run ${runId} no encontrado`);
    }

    const workflow = run.workflow;
    const version = workflow.versions[0];
    if (!version || version.steps.length === 0) {
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errorMessage: 'El workflow no tiene pasos configurados en su versión activa',
          completedAt: new Date(),
        },
      });
      return { success: false, status: 'FAILED', error: 'No steps configured' };
    }

    // 2. Check Circuit Breaker
    const cbState = circuitBreakerManager.getState(workflowId, workflow.circuitBreakerThreshold);
    if (cbState.isOpen && !isDryRun) {
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errorMessage: `Circuit Breaker ABIERTO para el workflow '${workflow.name}'. Razón: ${cbState.trippedReason}`,
          completedAt: new Date(),
        },
      });
      return { success: false, status: 'FAILED', error: 'Circuit breaker is open' };
    }

    // 3. Acquire Target Lock (only for real write executions, not dry-run)
    const lockAcquired = isDryRun ? { acquired: true } : targetLockManager.acquireLock(targetIdentifier, runId);
    if (!lockAcquired.acquired) {
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errorMessage: `Objetivo ${targetIdentifier} bloqueado actualmente por otra ejecución (${lockAcquired.currentHolder})`,
          completedAt: new Date(),
        },
      });
      return { success: false, status: 'FAILED', error: `Target ${targetIdentifier} is locked` };
    }

    // Update run to RUNNING
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    const executionLogs: string[] = [];
    executionLogs.push(`[${new Date().toISOString()}] Iniciando ejecución del workflow '${workflow.name}' (v${version.versionNumber})`);
    executionLogs.push(`[${new Date().toISOString()}] Modo: ${isDryRun ? 'DRY-RUN (Simulación Segura)' : 'REAL EXECUTION'} | Target: [${targetType}] ${targetIdentifier}`);

    let runFailed = false;
    let runTimeout = false;
    const startTime = Date.now();
    const totalTimeoutMs = (workflow.timeoutTotalSec || 600) * 1000;

    try {
      for (const step of version.steps) {
        // Check total timeout
        if (Date.now() - startTime > totalTimeoutMs) {
          executionLogs.push(`[${new Date().toISOString()}] TIMEOUT TOTAL alcanzado (${workflow.timeoutTotalSec}s). Cancelando pasos restantes.`);
          runTimeout = true;
          break;
        }

        // Check step condition
        if (step.condition === 'ON_SUCCESS' && runFailed) {
          executionLogs.push(`[${new Date().toISOString()}] Paso #${step.order} '${step.label || step.actionName}' OMITIDO por condición ON_SUCCESS`);
          await this.createOrUpdateStepRun(runId, step.order, step.actionName, targetIdentifier, isDryRun, 'SKIPPED', 'Omitido debido a fallo en pasos anteriores', 0);
          continue;
        }

        if (step.condition === 'ON_FAILURE' && !runFailed) {
          executionLogs.push(`[${new Date().toISOString()}] Paso #${step.order} '${step.label || step.actionName}' OMITIDO por condición ON_FAILURE`);
          await this.createOrUpdateStepRun(runId, step.order, step.actionName, targetIdentifier, isDryRun, 'SKIPPED', 'Omitido porque la ejecución va con éxito', 0);
          continue;
        }

        // Execute action with retries
        executionLogs.push(`[${new Date().toISOString()}] Ejecutando Paso #${step.order}: ${step.label || step.actionName} (Acción: ${step.actionName})`);
        const stepRunRecord = await this.createOrUpdateStepRun(runId, step.order, step.actionName, targetIdentifier, isDryRun, 'RUNNING', '', 0);

        const mergedParams = {
          ...(step.parameters as Record<string, any> || {}),
          ...(overrideParameters || {}),
        };

        const actionDef = this.registry.get(step.actionName);
        if (!actionDef) {
          const err = `Acción '${step.actionName}' no está registrada en el catálogo de InfraInventory`;
          executionLogs.push(`[${new Date().toISOString()}] ERROR: ${err}`);
          await this.prisma.workflowRunStep.update({
            where: { id: stepRunRecord.id },
            data: { status: 'FAILED', error: err, completedAt: new Date() },
          });
          runFailed = true;
          if (!step.continueOnError) break;
          continue;
        }

        let stepSuccess = false;
        let attempt = 0;
        const maxAttempts = (step.retryCount || 0) + 1;
        let lastOutput = '';
        let lastError = '';
        let stepDuration = 0;

        while (attempt < maxAttempts && !stepSuccess) {
          attempt++;
          if (attempt > 1) {
            executionLogs.push(`[${new Date().toISOString()}] Reintento ${attempt}/${maxAttempts} para el paso #${step.order}...`);
            await new Promise((res) => setTimeout(res, (step.retryIntervalSec || 5) * 1000));
          }

          const actionRes = await actionDef.execute(targetIdentifier, mergedParams, {
            isDryRun,
            userRole,
            userId,
            prisma: this.prisma,
            timeoutMs: (step.timeoutSec || 30) * 1000,
          });

          stepDuration += actionRes.durationMs;
          lastOutput = actionRes.output;
          lastError = actionRes.error || '';

          if (actionRes.success) {
            stepSuccess = true;
            executionLogs.push(`[${new Date().toISOString()}] Paso #${step.order} completado con éxito: ${actionRes.output}`);
          } else {
            executionLogs.push(`[${new Date().toISOString()}] Paso #${step.order} falló (intento ${attempt}): ${actionRes.error || actionRes.output}`);
          }
        }

        await this.prisma.workflowRunStep.update({
          where: { id: stepRunRecord.id },
          data: {
            status: stepSuccess ? 'SUCCESS' : 'FAILED',
            output: lastOutput,
            error: lastError || null,
            retriesUsed: attempt - 1,
            durationMs: stepDuration,
            completedAt: new Date(),
          },
        });

        if (!stepSuccess) {
          runFailed = true;
          if (!step.continueOnError) {
            executionLogs.push(`[${new Date().toISOString()}] Deteniendo ejecución del workflow debido a fallo en el paso #${step.order}`);
            break;
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      let finalStatus: WorkflowRunStatus = 'SUCCESS';

      if (runTimeout) {
        finalStatus = 'TIMEOUT';
      } else if (runFailed) {
        finalStatus = 'FAILED';
      }

      // Record circuit breaker metrics
      if (!isDryRun) {
        if (finalStatus === 'SUCCESS') {
          circuitBreakerManager.recordSuccess(workflowId);
        } else if (finalStatus === 'FAILED') {
          const trip = circuitBreakerManager.recordFailure(workflowId, workflow.circuitBreakerThreshold);
          if (trip.tripped) {
            executionLogs.push(`[${new Date().toISOString()}] ALERTA: Circuit breaker activado para '${workflow.name}' tras fallos consecutivos.`);
          }
        }
      }

      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          durationMs: totalDuration,
          resultSummary: executionLogs.join('\n'),
          errorMessage: runFailed ? 'Uno o más pasos críticos fallaron' : null,
        },
      });

      return { success: finalStatus === 'SUCCESS', status: finalStatus };
    } catch (err: any) {
      executionLogs.push(`[${new Date().toISOString()}] EXCEPCIÓN NO CONTROLADA: ${err.message}`);
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
          completedAt: new Date(),
          resultSummary: executionLogs.join('\n'),
        },
      });
      return { success: false, status: 'FAILED', error: err.message };
    } finally {
      if (!isDryRun) {
        targetLockManager.releaseLock(targetIdentifier, runId);
      }
    }
  }

  private async createOrUpdateStepRun(
    runId: string,
    stepOrder: number,
    actionName: string,
    targetHost: string,
    isDryRun: boolean,
    status: StepExecutionStatus,
    output: string,
    durationMs: number
  ) {
    return await this.prisma.workflowRunStep.create({
      data: {
        runId,
        stepOrder,
        actionName,
        targetHost,
        isDryRun,
        status,
        output,
        durationMs,
        startedAt: new Date(),
      },
    });
  }
}
