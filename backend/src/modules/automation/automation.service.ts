import { PrismaClient, ActionRiskLevel, ActionTargetType, WorkflowRunStatus, ApprovalStatus, AgentStatus, AgentOsType, AIProposalStatus } from '@prisma/client';
import crypto from 'crypto';
import { ActionsRegistry } from './automation.actions-registry.js';
import { AutomationWorker } from './automation.worker.js';
import { circuitBreakerManager } from './automation.circuit-breaker.js';
import { targetLockManager } from './automation.locks.js';

export class AutomationService {
  private prisma: PrismaClient;
  public registry: ActionsRegistry;
  public worker: AutomationWorker;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.registry = new ActionsRegistry();
    this.worker = new AutomationWorker(prisma, this.registry);
    this.seedDefaultActionsAndTemplates().catch(console.error);
  }

  // ==========================================
  // 1. ACTIONS CATALOGUE & STATS
  // ==========================================
  public async getActionsCatalogue() {
    const builtIns = this.registry.getAll();
    const dbActions = await this.prisma.automationAction.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { builtIns, dbActions };
  }

  public async getAutomationStats() {
    const totalWorkflows = await this.prisma.workflow.count();
    const activeWorkflows = await this.prisma.workflow.count({ where: { enabled: true } });
    const totalRuns = await this.prisma.workflowRun.count();
    const successRuns = await this.prisma.workflowRun.count({ where: { status: 'SUCCESS' } });
    const failedRuns = await this.prisma.workflowRun.count({ where: { status: 'FAILED' } });
    const pendingApprovals = await this.prisma.approvalRequest.count({ where: { status: 'PENDING' } });
    const onlineAgents = await this.prisma.agent.count({ where: { status: 'ONLINE' } });
    const totalAgents = await this.prisma.agent.count();
    const activePolicies = await this.prisma.automationPolicy.count({ where: { enabled: true } });
    const pendingAIProposals = await this.prisma.aIActionProposal.count({ where: { status: 'PROPOSED' } });

    const activeLocks = targetLockManager.getActiveLocks();
    const circuitBreakers = circuitBreakerManager.getAllStates();

    return {
      totalWorkflows,
      activeWorkflows,
      totalRuns,
      successRuns,
      failedRuns,
      successRate: totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100,
      pendingApprovals,
      onlineAgents,
      totalAgents,
      activePolicies,
      pendingAIProposals,
      activeLocks,
      circuitBreakers,
    };
  }

  // ==========================================
  // 2. WORKFLOWS CRUD & VERSIONING
  // ==========================================
  public async listWorkflows(filter?: { category?: string; enabled?: boolean; isTemplate?: boolean }) {
    return await this.prisma.workflow.findMany({
      where: {
        ...(filter?.category ? { category: filter.category } : {}),
        ...(filter?.enabled !== undefined ? { enabled: filter.enabled } : {}),
        ...(filter?.isTemplate !== undefined ? { isTemplate: filter.isTemplate } : {}),
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { steps: { orderBy: { order: 'asc' } } },
        },
        _count: { select: { runs: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  public async getWorkflowById(id: string) {
    return await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { steps: { orderBy: { order: 'asc' } } },
        },
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { stepRuns: { orderBy: { startedAt: 'asc' } }, executor: { select: { name: true, username: true } } },
        },
      },
    });
  }

  public async createWorkflow(data: any, createdById?: string) {
    const { steps, ...workflowData } = data;

    const workflow = await this.prisma.workflow.create({
      data: {
        ...workflowData,
        createdById,
        versions: {
          create: {
            versionNumber: 1,
            notes: 'Versión inicial',
            createdById,
            steps: {
              create: steps.map((s: any) => ({
                order: s.order,
                actionName: s.actionName,
                label: s.label || s.actionName,
                parameters: s.parameters || {},
                condition: s.condition || 'ALWAYS',
                continueOnError: s.continueOnError || false,
                timeoutSec: s.timeoutSec || 30,
                retryCount: s.retryCount || 0,
                retryIntervalSec: s.retryIntervalSec || 5,
              })),
            },
          },
        },
      },
      include: {
        versions: {
          include: { steps: true },
        },
      },
    });

    return workflow;
  }

  public async updateWorkflow(id: string, data: any, updatedById?: string) {
    const { steps, createNewVersion, versionNotes, ...workflowData } = data;

    const currentWorkflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!currentWorkflow) {
      throw new Error('Workflow no encontrado');
    }

    const currentVersionNum = currentWorkflow.versions[0]?.versionNumber || 1;

    let versionUpdate: any = {};
    if (steps && steps.length > 0) {
      if (createNewVersion) {
        versionUpdate = {
          versions: {
            create: {
              versionNumber: currentVersionNum + 1,
              notes: versionNotes || `Actualización v${currentVersionNum + 1}`,
              createdById: updatedById,
              steps: {
                create: steps.map((s: any) => ({
                  order: s.order,
                  actionName: s.actionName,
                  label: s.label || s.actionName,
                  parameters: s.parameters || {},
                  condition: s.condition || 'ALWAYS',
                  continueOnError: s.continueOnError || false,
                  timeoutSec: s.timeoutSec || 30,
                  retryCount: s.retryCount || 0,
                  retryIntervalSec: s.retryIntervalSec || 5,
                })),
              },
            },
          },
        };
      }
    }

    return await this.prisma.workflow.update({
      where: { id },
      data: {
        ...workflowData,
        ...versionUpdate,
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { steps: true },
        },
      },
    });
  }

  public async deleteWorkflow(id: string) {
    return await this.prisma.workflow.delete({
      where: { id },
    });
  }

  // ==========================================
  // 3. WORKFLOW RUNS EXECUTION & DRY-RUN
  // ==========================================
  public async executeWorkflow(workflowId: string, options: any, userId?: string, userRole: string = 'ADMIN') {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { steps: true },
        },
      },
    });

    if (!workflow) {
      throw new Error('Workflow no encontrado');
    }

    if (!workflow.enabled) {
      throw new Error('El workflow se encuentra deshabilitado por política administrativa');
    }

    // Check if any step requires approval based on policy
    let maxRisk: ActionRiskLevel = 'READ_ONLY';
    const riskWeights: Record<ActionRiskLevel, number> = {
      READ_ONLY: 1,
      LOW: 2,
      MEDIUM: 3,
      HIGH: 4,
      CRITICAL: 5,
    };

    const latestVersion = workflow.versions[0];
    if (latestVersion) {
      for (const step of latestVersion.steps) {
        const actionDef = this.registry.get(step.actionName);
        if (actionDef && riskWeights[actionDef.riskLevel] > riskWeights[maxRisk]) {
          maxRisk = actionDef.riskLevel;
        }
      }
    }

    const versionNum = latestVersion?.versionNumber || 1;

    // If maxRisk is HIGH or CRITICAL and not dry run, check if approval is required
    if (!options.isDryRun && (maxRisk === 'HIGH' || maxRisk === 'CRITICAL')) {
      const activePolicy = await this.prisma.automationPolicy.findFirst({
        where: { enabled: true },
      });

      if (activePolicy && activePolicy.enforceFourEyes) {
        // Create an approval request instead of executing immediately
        const approval = await this.prisma.approvalRequest.create({
          data: {
            actionName: `Workflow: ${workflow.name}`,
            targetType: options.targetType || workflow.targetType,
            targetIdentifier: options.targetIdentifier,
            targetLabel: options.targetIdentifier,
            parameters: options.overrideParameters || {},
            riskLevel: maxRisk,
            reason: options.reason || `Ejecución de workflow ${workflow.name} con riesgo ${maxRisk}`,
            requestedById: userId || 'system',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        // Create run in WAITING_APPROVAL state
        const run = await this.prisma.workflowRun.create({
          data: {
            workflowId,
            workflowVersion: versionNum,
            workflowName: workflow.name,
            status: 'WAITING_APPROVAL',
            targetType: options.targetType || workflow.targetType,
            targetIdentifier: options.targetIdentifier,
            isDryRun: false,
            executedById: userId,
            approvalRequestId: approval.id,
            resultSummary: `[${new Date().toISOString()}] Ejecución pausada. Requiere Aprobación (Four-Eyes) ID: ${approval.id}`,
          },
        });

        return {
          runId: run.id,
          status: 'WAITING_APPROVAL',
          approvalId: approval.id,
          message: 'La ejecución contiene acciones de alto riesgo y requiere aprobación previa (Principio de 4 ojos)',
        };
      }
    }

    // Create run record
    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId,
        workflowVersion: versionNum,
        workflowName: workflow.name,
        status: 'QUEUED',
        targetType: options.targetType || workflow.targetType,
        targetIdentifier: options.targetIdentifier,
        isDryRun: !!options.isDryRun,
        executedById: userId,
        resultSummary: `[${new Date().toISOString()}] Ejecución encolada`,
      },
    });

    // Execute via worker
    const execPromise = this.worker.executeWorkflowRun({
      runId: run.id,
      workflowId,
      targetType: options.targetType || workflow.targetType,
      targetIdentifier: options.targetIdentifier,
      isDryRun: !!options.isDryRun,
      userRole,
      userId,
      overrideParameters: options.overrideParameters,
    });

    return {
      runId: run.id,
      status: 'QUEUED',
      isDryRun: options.isDryRun,
      message: options.isDryRun ? 'Simulación iniciada (Dry-Run)' : 'Ejecución iniciada',
      execution: await execPromise,
    };
  }

  public async listRuns(workflowId?: string, limit: number = 50) {
    return await this.prisma.workflowRun.findMany({
      where: workflowId ? { workflowId } : {},
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        workflow: { select: { name: true, category: true } },
        stepRuns: { orderBy: { startedAt: 'asc' } },
        executor: { select: { name: true, username: true } },
      },
    });
  }

  public async getRunById(id: string) {
    return await this.prisma.workflowRun.findUnique({
      where: { id },
      include: {
        workflow: true,
        stepRuns: {
          orderBy: { startedAt: 'asc' },
        },
        executor: { select: { name: true, username: true } },
        approvalRequest: true,
      },
    });
  }

  // ==========================================
  // 4. APPROVALS (FOUR-EYES PRINCIPLE)
  // ==========================================
  public async listApprovals(status?: ApprovalStatus) {
    return await this.prisma.approvalRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, username: true } },
        approver: { select: { id: true, name: true, username: true } },
      },
    });
  }

  public async createApprovalRequest(data: any, requestedById: string) {
    const { expiresInMinutes, expiresAt, ...rest } = data;
    const computedExpiresAt = expiresAt ? new Date(expiresAt) : new Date(Date.now() + (expiresInMinutes || 1440) * 60 * 1000);
    return await this.prisma.approvalRequest.create({
      data: {
        actionName: rest.actionName,
        targetType: rest.targetType || 'MACHINE',
        targetIdentifier: rest.targetIdentifier,
        targetLabel: rest.targetLabel || rest.targetIdentifier,
        parameters: rest.parameters || {},
        riskLevel: rest.riskLevel || 'MEDIUM',
        reason: rest.reason,
        evidence: rest.evidence || {},
        requestedById,
        status: 'PENDING',
        expiresAt: computedExpiresAt,
      },
    });
  }

  public async decideApproval(id: string, decision: 'APPROVE' | 'REJECT', userId: string, rejectionReason?: string) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id },
    });

    if (!approval) {
      throw new Error('Solicitud de aprobación no encontrada');
    }

    if (approval.status !== 'PENDING') {
      throw new Error(`La solicitud ya fue resuelta con estado: ${approval.status}`);
    }

    // Enforce Four-Eyes Principle: Requester CANNOT approve their own action
    if (decision === 'APPROVE' && approval.requestedById === userId) {
      throw new Error('Violación del Principio de Cuatro Ojos: El solicitante no puede auto-aprobar acciones críticas');
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approvedById: userId,
        approvedAt: decision === 'APPROVE' ? new Date() : null,
        rejectedAt: decision === 'REJECT' ? new Date() : null,
        rejectionReason: decision === 'REJECT' ? rejectionReason : null,
      },
    });

    return updated;
  }

  // ==========================================
  // 5. INFRAINVENTORY AGENTS & TELEMETRY
  // ==========================================
  public async listAgents() {
    return await this.prisma.agent.findMany({
      orderBy: { lastSeenAt: 'desc' },
      include: {
        machine: { select: { hostname: true, primaryIp: true, os: true, status: true } },
        heartbeats: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  public async registerAgent(data: any) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const agentId = 'AGT-' + crypto.randomUUID().substring(0, 8).toUpperCase();

    const agent = await this.prisma.agent.create({
      data: {
        agentId,
        hostname: data.hostname,
        osType: data.osType || 'LINUX',
        osVersion: data.osVersion,
        ipAddress: data.ipAddress,
        agentVersion: data.agentVersion || '1.0.0',
        capabilities: data.capabilities || ['TELEMETRY', 'HEALTH_CHECK'],
        allowRemoteExecution: data.allowRemoteExecution || false,
        machineId: data.machineId,
        tokenHash,
        status: 'ONLINE',
        lastSeenAt: new Date(),
      },
    });

    return { agent, token }; // Return raw token once upon registration
  }

  public async processAgentHeartbeat(data: any) {
    const { agentId, token, cpuUsage, ramUsage, diskUsage, uptimeSeconds, activeServicesCount, activeProcessesCount, systemPayload } = data;

    // Search by primary UUID or public AGT-UUID
    const agent = await this.prisma.agent.findFirst({
      where: {
        OR: [
          { id: agentId },
          { agentId: agentId },
        ],
      },
    });

    if (!agent) {
      throw new Error('Agente no registrado');
    }

    if (agent.status === 'REVOKED') {
      throw new Error('El token de este agente ha sido revocado');
    }

    // Verify token hash
    const inputHash = crypto.createHash('sha256').update(token).digest('hex');
    if (agent.tokenHash !== inputHash) {
      throw new Error('Autenticación de agente fallida: Token inválido');
    }

    // Record heartbeat
    const heartbeat = await this.prisma.agentHeartbeat.create({
      data: {
        agentId: agent.id,
        cpuUsage: cpuUsage ?? null,
        ramUsage: ramUsage ?? null,
        diskUsage: diskUsage ?? null,
        uptimeSeconds: uptimeSeconds ?? null,
        activeServicesCount: activeServicesCount ?? null,
        activeProcessesCount: activeProcessesCount ?? null,
        systemPayload: systemPayload ?? {},
      },
    });

    // Update agent state
    await this.prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: 'ONLINE',
        lastSeenAt: new Date(),
      },
    });

    return { status: 'OK', heartbeatId: heartbeat.id, timestamp: heartbeat.createdAt };
  }

  public async revokeAgent(agentId: string) {
    return await this.prisma.agent.update({
      where: { id: agentId },
      data: { status: 'REVOKED' },
    });
  }

  // ==========================================
  // 6. AUTOMATION POLICIES
  // ==========================================
  public async listPolicies() {
    return await this.prisma.automationPolicy.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  public async createPolicy(data: any) {
    return await this.prisma.automationPolicy.create({ data });
  }

  public async updatePolicy(id: string, data: any) {
    return await this.prisma.automationPolicy.update({
      where: { id },
      data,
    });
  }

  // ==========================================
  // 7. AI ACTION PROPOSALS (CONTROLLED)
  // ==========================================
  public async listAIProposals(status?: AIProposalStatus) {
    return await this.prisma.aIActionProposal.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  public async createAIProposal(data: any) {
    return await this.prisma.aIActionProposal.create({
      data: {
        ...data,
        status: 'PROPOSED',
      },
    });
  }

  public async decideAIProposal(id: string, action: 'ACCEPT' | 'REJECT' | 'EXECUTE', userId?: string) {
    const proposal = await this.prisma.aIActionProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new Error('Propuesta de IA no encontrada');
    }

    if (action === 'REJECT') {
      return await this.prisma.aIActionProposal.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
    }

    if (action === 'ACCEPT') {
      return await this.prisma.aIActionProposal.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });
    }

    if (action === 'EXECUTE') {
      // Execute the proposed action safely via action registry
      const actionDef = this.registry.get(proposal.proposedAction);
      if (!actionDef) {
        throw new Error(`Acción propuesta '${proposal.proposedAction}' no existe en el catálogo`);
      }

      const res = await actionDef.execute(proposal.targetId, proposal.parameters as any || {}, {
        isDryRun: false,
        userRole: 'ADMIN',
        userId,
        prisma: this.prisma,
      });

      return await this.prisma.aIActionProposal.update({
        where: { id },
        data: {
          status: 'EXECUTED',
        },
      });
    }
  }

  // ==========================================
  // SEED DEFAULT ACTIONS & TEMPLATES
  // ==========================================
  private async seedDefaultActionsAndTemplates() {
    const defaultPolicy = await this.prisma.automationPolicy.findFirst();
    if (!defaultPolicy) {
      await this.prisma.automationPolicy.create({
        data: {
          name: 'Política Global de Seguridad de Automatización V11',
          description: 'Control estricto con principio de 4 ojos para acciones HIGH/CRITICAL y denegación de comandos peligrosos',
          maxRiskLevelAllowed: 'CRITICAL',
          requireApprovalForRisk: 'HIGH',
          enforceFourEyes: true,
          allowAutoRemediation: true,
          allowRemoteExecution: false,
          maintenanceWindowAware: true,
          enabled: true,
        },
      });
    }

    // Seed default workflow template if empty
    const count = await this.prisma.workflow.count();
    if (count === 0) {
      await this.createWorkflow({
        name: 'Diagnóstico y Verificación de Salud de Servidor',
        description: 'Verifica conectividad ICMP, estado de puertos HTTP y consulta recursos del sistema de forma no invasiva',
        category: 'DIAGNOSTIC',
        enabled: true,
        targetType: 'MACHINE',
        isTemplate: true,
        concurrencyLimit: 5,
        timeoutTotalSec: 120,
        circuitBreakerThreshold: 5,
        steps: [
          { order: 1, actionName: 'ping_check', label: 'Verificación ICMP Ping', parameters: { count: 3 } },
          { order: 2, actionName: 'tcp_port_check', label: 'Verificación Puerto Web 80', parameters: { port: 80 } },
          { order: 3, actionName: 'system_info', label: 'Diagnóstico de CPU y Memoria', parameters: {} },
        ],
      });

      await this.createWorkflow({
        name: 'Mantenimiento Preventivo y Limpieza de Espacio',
        description: 'Comprueba el estado de salud y libera archivos temporales antiguos (> 7 días)',
        category: 'MAINTENANCE',
        enabled: true,
        targetType: 'MACHINE',
        isTemplate: true,
        concurrencyLimit: 3,
        timeoutTotalSec: 300,
        circuitBreakerThreshold: 3,
        steps: [
          { order: 1, actionName: 'system_info', label: 'Comprobación de Recursos', parameters: {} },
          { order: 2, actionName: 'clean_temp_files', label: 'Limpieza de Temporales', parameters: { olderThanDays: 7 } },
          { order: 3, actionName: 'system_info', label: 'Verificación Post-Limpieza', parameters: {} },
        ],
      });
    }
  }
}
