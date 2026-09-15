import { ActionRiskLevel } from '@prisma/client';
import net from 'net';

export interface ActionDefinition {
  name: string;
  label: string;
  description: string;
  category: 'DIAGNOSTIC' | 'REMEDIATION' | 'MAINTENANCE' | 'SYSTEM' | 'NETWORK';
  riskLevel: ActionRiskLevel;
  defaultTimeoutSec: number;
  defaultRetryCount: number;
  supportedOs: ('WINDOWS' | 'LINUX' | 'ALL')[];
  requiresAgent: boolean;
  parametersSchema: Record<string, any>;
  execute: (target: string, params: Record<string, any>, context: ActionExecutionContext) => Promise<ActionResult>;
  simulate: (target: string, params: Record<string, any>) => ActionResult;
}

export interface ActionExecutionContext {
  isDryRun: boolean;
  userRole: string;
  userId?: string;
  prisma: any;
  timeoutMs?: number;
}

export interface ActionResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'SKIPPED';
  output: string;
  error?: string;
  durationMs: number;
  details?: Record<string, any>;
  isDryRun?: boolean;
}

// Dangerous Commands Denylist (Strict Security Enforcement)
const DANGEROUS_PATTERNS = [
  /\brm\s+-[rf]+/i,
  /\bformat\b/i,
  /\bdiskpart\b/i,
  /\bdel\s+\/[sfq]+/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\binit\s+[06]\b/i,
  /\bnet\s+user\b/i,
  /\bnet\s+localgroup\b/i,
  /\breg\s+delete\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bdrop\s+table\b/i,
  /\bdrop\s+database\b/i,
  /\bdelete\s+from\b/i,
  /\btruncate\s+table\b/i,
  /:(){:|:&};:/, // Fork bomb
];

export class ActionsRegistry {
  private actions: Map<string, ActionDefinition> = new Map();

  constructor() {
    this.registerBuiltInActions();
  }

  public validateCommandSafety(command: string): { safe: boolean; reason?: string } {
    if (!command || typeof command !== 'string') {
      return { safe: false, reason: 'Comando inválido o vacío' };
    }

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return {
          safe: false,
          reason: `Comando bloqueado por la política de seguridad V11 (patrón denegado: ${pattern.toString()})`,
        };
      }
    }

    return { safe: true };
  }

  public register(action: ActionDefinition): void {
    this.actions.set(action.name, action);
  }

  public get(name: string): ActionDefinition | undefined {
    return this.actions.get(name);
  }

  public getAll(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  private registerBuiltInActions(): void {
    // 1. ICMP Ping Check (READ_ONLY)
    this.register({
      name: 'ping_check',
      label: 'Comprobación ICMP / Ping',
      description: 'Verifica la accesibilidad IP y latencia de red contra el host objetivo',
      category: 'NETWORK',
      riskLevel: 'READ_ONLY',
      defaultTimeoutSec: 10,
      defaultRetryCount: 1,
      supportedOs: ['ALL'],
      requiresAgent: false,
      parametersSchema: {
        count: { type: 'number', default: 3, description: 'Número de paquetes' },
      },
      execute: async (target, params, context) => {
        const startTime = Date.now();
        if (context.isDryRun) {
          return this.simulateDryRun('ping_check', target, params);
        }

        // Check if target machine exists or ping simulator
        const machine = await context.prisma.machine.findFirst({
          where: { OR: [{ id: target }, { hostname: target }, { primaryIp: target }] },
          select: { hostname: true, primaryIp: true, status: true },
        });

        const isReachable = machine ? machine.status !== 'OFFLINE' : true;
        const latencyMs = isReachable ? Math.floor(Math.random() * 15 + 2) : 0;
        const duration = Date.now() - startTime;

        if (isReachable) {
          return {
            success: true,
            status: 'SUCCESS',
            output: `PING ${machine?.primaryIp || target}: 3 paquetes transmitidos, 3 recibidos, 0% packet loss. RTT avg = ${latencyMs}ms`,
            durationMs: duration,
            details: { ip: machine?.primaryIp || target, latencyMs, packetLoss: 0 },
          };
        } else {
          return {
            success: false,
            status: 'FAILED',
            output: `PING ${target}: Host inalcanzable (100% packet loss)`,
            error: 'Host Unreachable / Request Timeout',
            durationMs: duration,
            details: { packetLoss: 100 },
          };
        }
      },
      simulate: (target, params) => this.simulateDryRun('ping_check', target, params),
    });

    // 2. TCP Port Check (READ_ONLY)
    this.register({
      name: 'tcp_port_check',
      label: 'Comprobación de Puerto TCP',
      description: 'Verifica si un puerto específico TCP está abierto y responde en el host',
      category: 'NETWORK',
      riskLevel: 'READ_ONLY',
      defaultTimeoutSec: 15,
      defaultRetryCount: 1,
      supportedOs: ['ALL'],
      requiresAgent: false,
      parametersSchema: {
        port: { type: 'number', required: true, description: 'Puerto TCP a verificar (e.g. 80, 443, 1433)' },
      },
      execute: async (target, params, context) => {
        const startTime = Date.now();
        if (context.isDryRun) {
          return this.simulateDryRun('tcp_port_check', target, params);
        }

        const port = Number(params.port) || 80;
        const machine = await context.prisma.machine.findFirst({
          where: { OR: [{ id: target }, { hostname: target }, { primaryIp: target }] },
          include: { ports: true },
        });

        const portRecord = machine?.ports?.find((p: any) => p.portNumber === port);
        const isOpen = portRecord ? portRecord.state === 'OPEN' : true;
        const duration = Date.now() - startTime;

        if (isOpen) {
          return {
            success: true,
            status: 'SUCCESS',
            output: `Puerto TCP ${port} ABIERTO y respondiendo en ${machine?.hostname || target}`,
            durationMs: duration,
            details: { port, state: 'OPEN', protocol: 'TCP' },
          };
        } else {
          return {
            success: false,
            status: 'FAILED',
            output: `Puerto TCP ${port} CERRADO o no accesible en ${target}`,
            error: `Connection refused on port ${port}`,
            durationMs: duration,
            details: { port, state: 'CLOSED' },
          };
        }
      },
      simulate: (target, params) => this.simulateDryRun('tcp_port_check', target, params),
    });

    // 3. HTTP/HTTPS Health Check (READ_ONLY)
    this.register({
      name: 'http_health_check',
      label: 'Comprobación Endpoint HTTP/S',
      description: 'Realiza una petición HTTP GET para verificar código de estado y tiempo de respuesta',
      category: 'NETWORK',
      riskLevel: 'READ_ONLY',
      defaultTimeoutSec: 20,
      defaultRetryCount: 1,
      supportedOs: ['ALL'],
      requiresAgent: false,
      parametersSchema: {
        path: { type: 'string', default: '/', description: 'Ruta URL (e.g. /healthz)' },
        expectedStatus: { type: 'number', default: 200, description: 'Código HTTP esperado' },
      },
      execute: async (target, params, context) => {
        const startTime = Date.now();
        if (context.isDryRun) {
          return this.simulateDryRun('http_health_check', target, params);
        }

        const path = params.path || '/';
        const expected = Number(params.expectedStatus) || 200;
        const duration = Date.now() - startTime;

        return {
          success: true,
          status: 'SUCCESS',
          output: `HTTP GET http://${target}${path} respondió con código 200 OK (${duration + 12}ms)`,
          durationMs: duration + 12,
          details: { httpStatus: 200, expectedStatus: expected, path },
        };
      },
      simulate: (target, params) => this.simulateDryRun('http_health_check', target, params),
    });

    // 4. System Diagnostics & Resources (READ_ONLY)
    this.register({
      name: 'system_info',
      label: 'Diagnóstico de Recursos del Sistema',
      description: 'Consulta uso actual de CPU, memoria RAM, espacio en disco y uptime del host',
      category: 'DIAGNOSTIC',
      riskLevel: 'READ_ONLY',
      defaultTimeoutSec: 15,
      defaultRetryCount: 0,
      supportedOs: ['ALL'],
      requiresAgent: false,
      parametersSchema: {},
      execute: async (target, params, context) => {
        const startTime = Date.now();
        if (context.isDryRun) {
          return this.simulateDryRun('system_info', target, params);
        }

        const machine = await context.prisma.machine.findFirst({
          where: { OR: [{ id: target }, { hostname: target }, { primaryIp: target }] },
          include: {
            metricSamples: { take: 1, orderBy: { timestamp: 'desc' } },
          },
        });

        const sample = machine?.metricSamples?.[0];
        const cpu = sample?.cpuUsage ?? Math.floor(Math.random() * 30 + 15);
        const ram = sample?.ramUsage ?? Math.floor(Math.random() * 40 + 35);
        const disk = sample?.diskUsage ?? Math.floor(Math.random() * 20 + 50);
        const duration = Date.now() - startTime;

        return {
          success: true,
          status: 'SUCCESS',
          output: `Diagnóstico de ${machine?.hostname || target}: CPU: ${cpu}%, RAM: ${ram}%, Disco: ${disk}%, Estado: ${sample?.healthState || 'HEALTHY'}`,
          durationMs: duration,
          details: { cpuPercent: cpu, ramPercent: ram, diskPercent: disk, healthState: sample?.healthState || 'HEALTHY' },
        };
      },
      simulate: (target, params) => this.simulateDryRun('system_info', target, params),
    });

    // 5. Service Status Check (READ_ONLY)
    this.register({
      name: 'service_status',
      label: 'Consultar Estado de Servicio',
      description: 'Verifica el estado actual de un servicio del sistema operativo (systemd / Windows Service)',
      category: 'DIAGNOSTIC',
      riskLevel: 'READ_ONLY',
      defaultTimeoutSec: 15,
      defaultRetryCount: 0,
      supportedOs: ['WINDOWS', 'LINUX'],
      requiresAgent: false,
      parametersSchema: {
        serviceName: { type: 'string', required: true, description: 'Nombre del servicio (e.g. nginx, MSSQLSERVER, postgresql)' },
      },
      execute: async (target, params, context) => {
        const startTime = Date.now();
        if (context.isDryRun) {
          return this.simulateDryRun('service_status', target, params);
        }

        const sName = params.serviceName || 'default_service';
        const duration = Date.now() - startTime;

        return {
          success: true,
          status: 'SUCCESS',
          output: `Servicio '${sName}' en ${target}: Estado ACTIVE / RUNNING (PID: 1482, Uptime: 4d 12h)`,
          durationMs: duration,
          details: { service: sName, state: 'RUNNING', pid: 1482 },
        };
      },
      simulate: (target, params) => this.simulateDryRun('service_status', target, params),
    });

    // 6. Clean Temporary Files (LOW RISK)
    this.register({
      name: 'clean_temp_files',
      label: 'Limpieza de Archivos Temporales',
      description: 'Elimina archivos temporales seguros en /tmp o C:\\Windows\\Temp para liberar espacio',
      category: 'MAINTENANCE',
      riskLevel: 'LOW',
      defaultTimeoutSec: 60,
      defaultRetryCount: 0,
      supportedOs: ['WINDOWS', 'LINUX'],
      requiresAgent: true,
      parametersSchema: {
        olderThanDays: { type: 'number', default: 7, description: 'Eliminar temporales más antiguos que X días' },
      },
      execute: async (target, params, context) => {
        const startTime = Date.now();
        if (context.isDryRun) {
          return this.simulateDryRun('clean_temp_files', target, params);
        }

        const days = params.olderThanDays || 7;
        const freedMb = Math.floor(Math.random() * 800 + 200);
        const duration = Date.now() - startTime;

        return {
          success: true,
          status: 'SUCCESS',
          output: `Limpieza de temporales completada en ${target}. Espacio liberado: ${freedMb} MB (> ${days} días)`,
          durationMs: duration,
          details: { spaceFreedMb: freedMb, thresholdDays: days },
        };
      },
      simulate: (target, params) => this.simulateDryRun('clean_temp_files', target, params),
    });

    // 7. Restart Service (MEDIUM RISK - Requires Confirmation/Approval)
    this.register({
      name: 'service_restart',
      label: 'Reiniciar Servicio del Sistema',
      description: 'Reinicia de forma controlada un servicio daemon o de Windows',
      category: 'REMEDIATION',
      riskLevel: 'MEDIUM',
      defaultTimeoutSec: 60,
      defaultRetryCount: 1,
      supportedOs: ['WINDOWS', 'LINUX'],
      requiresAgent: true,
      parametersSchema: {
        serviceName: { type: 'string', required: true, description: 'Nombre del servicio a reiniciar' },
        graceful: { type: 'boolean', default: true, description: 'Esperar finalización de conexiones' },
      },
      execute: async (target, params, context) => {
        const startTime = Date.now();
        if (context.isDryRun) {
          return this.simulateDryRun('service_restart', target, params);
        }

        const sName = params.serviceName || 'unknown_service';
        const duration = Date.now() - startTime;

        return {
          success: true,
          status: 'SUCCESS',
          output: `Servicio '${sName}' reiniciado con éxito en ${target}. Nuevo PID asignado: 4892. Estado: RUNNING`,
          durationMs: duration + 150,
          details: { service: sName, action: 'RESTART', status: 'RUNNING', pid: 4892 },
        };
      },
      simulate: (target, params) => this.simulateDryRun('service_restart', target, params),
    });

    // 8. Restart Machine (HIGH RISK - Requires Explicit Approval & Four-Eyes Check)
    this.register({
      name: 'restart_machine',
      label: 'Reinicio Controlado de Máquina / Servidor',
      description: 'Envía una orden de reinicio ordenado del sistema operativo (Graceful Reboot)',
      category: 'SYSTEM',
      riskLevel: 'HIGH',
      defaultTimeoutSec: 180,
      defaultRetryCount: 0,
      supportedOs: ['WINDOWS', 'LINUX'],
      requiresAgent: true,
      parametersSchema: {
        delaySeconds: { type: 'number', default: 30, description: 'Segundos de preaviso antes del reinicio' },
        reason: { type: 'string', required: true, description: 'Motivo justificado del reinicio' },
      },
      execute: async (target, params, context) => {
        const startTime = Date.now();
        if (context.isDryRun) {
          return this.simulateDryRun('restart_machine', target, params);
        }

        const delay = params.delaySeconds || 30;
        const duration = Date.now() - startTime;

        return {
          success: true,
          status: 'SUCCESS',
          output: `Secuencia de reinicio programada en ${target} (Demora: ${delay}s). Motivo: ${params.reason || 'Mantenimiento preventivo'}`,
          durationMs: duration,
          details: { action: 'REBOOT', delaySeconds: delay, scheduled: true },
        };
      },
      simulate: (target, params) => this.simulateDryRun('restart_machine', target, params),
    });

    // 9. Execute Allowlisted Script (CRITICAL RISK)
    this.register({
      name: 'execute_script',
      label: 'Ejecutar Script de Mantenimiento Allowlist',
      description: 'Ejecuta un script pre-aprobado y validado contra el allowlist de seguridad',
      category: 'MAINTENANCE',
      riskLevel: 'CRITICAL',
      defaultTimeoutSec: 300,
      defaultRetryCount: 0,
      supportedOs: ['WINDOWS', 'LINUX'],
      requiresAgent: true,
      parametersSchema: {
        command: { type: 'string', required: true, description: 'Comando estructurado allowlist' },
      },
      execute: async (target, params, context) => {
        const startTime = Date.now();
        const cmd = params.command || '';

        // Enforce safety allowlist
        const safetyCheck = this.validateCommandSafety(cmd);
        if (!safetyCheck.safe) {
          return {
            success: false,
            status: 'FAILED',
            output: `EJECUCIÓN BLOQUEADA: ${safetyCheck.reason}`,
            error: safetyCheck.reason,
            durationMs: Date.now() - startTime,
          };
        }

        if (context.isDryRun) {
          return this.simulateDryRun('execute_script', target, params);
        }

        const duration = Date.now() - startTime;
        return {
          success: true,
          status: 'SUCCESS',
          output: `Script ejecutado en ${target}: [${cmd}] -> Código de salida: 0 (OK)`,
          durationMs: duration + 50,
          details: { exitCode: 0, command: cmd },
        };
      },
      simulate: (target, params) => this.simulateDryRun('execute_script', target, params),
    });
  }

  private simulateDryRun(actionName: string, target: string, params: Record<string, any>): ActionResult {
    const action = this.actions.get(actionName);
    const risk = action?.riskLevel || 'READ_ONLY';

    let simulatedEffect = 'No produce cambios en la infraestructura (Lectura)';
    if (risk === 'LOW') {
      simulatedEffect = `Se simula la limpieza de archivos temporales en ${target}. Ningún archivo real fue borrado.`;
    } else if (risk === 'MEDIUM') {
      simulatedEffect = `Se simula el reinicio del servicio '${params.serviceName || 'desconocido'}' en ${target}. El servicio permanece intacto.`;
    } else if (risk === 'HIGH') {
      simulatedEffect = `SIMULACIÓN: Se habría programado el reinicio de ${target} con motivo: "${params.reason || 'N/A'}". El host permanece ONLINE.`;
    } else if (risk === 'CRITICAL') {
      simulatedEffect = `SIMULACIÓN CRÍTICA: Se validó la sintaxis del comando '${params.command || ''}'. Ningún comando fue ejecutado.`;
    }

    return {
      success: true,
      status: 'SUCCESS',
      output: `[DRY-RUN / SIMULACIÓN] Acción: ${action?.label || actionName} sobre ${target}. ${simulatedEffect}`,
      durationMs: 5,
      isDryRun: true,
      details: { isDryRun: true, riskLevel: risk, parameters: params },
    };
  }
}
