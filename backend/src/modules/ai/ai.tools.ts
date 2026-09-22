import { PrismaClient, MachineStatus } from '@prisma/client';
import { Permission, hasPermission } from '../../utils/permissions.js';
import { sanitizeSecrets } from './ai.sanitizer.js';

export interface ToolDefinition {
  name: string;
  description: string;
  requiredPermission: Permission;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (params: any, context: { prisma: PrismaClient; userRole: any; userId?: string }) => Promise<any>;
}

export class AIToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor(private prisma: PrismaClient) {
    this.registerAllTools();
  }

  private register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  getAvailableTools(userRole: any): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => hasPermission(userRole, t.requiredPermission));
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async executeTool(name: string, params: any, userRole: any, userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Herramienta desconocida: "${name}"` };
    }

    if (!hasPermission(userRole, tool.requiredPermission)) {
      return {
        success: false,
        error: `Acceso denegado: El rol ${userRole} no dispone del permiso requerido (${tool.requiredPermission}) para ejecutar ${name}.`,
      };
    }

    try {
      const rawData = await tool.execute(params, { prisma: this.prisma, userRole, userId });
      const data = sanitizeSecrets(rawData);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error interno ejecutando la herramienta' };
    }
  }

  private registerAllTools() {
    // ----------------------------------------------------
    // 1. Devices & Hosts Search (get_devices / searchMachines)
    // ----------------------------------------------------
    const searchMachinesTool: ToolDefinition = {
      name: 'get_devices',
      description: 'Busca máquinas/servidores por nombre, IP, estado (ONLINE, OFFLINE, WARNING, UNCHECKED), SO, grupo o tag',
      requiredPermission: 'MACHINE_READ',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Término de búsqueda opcional' },
          status: { type: 'string', enum: ['ONLINE', 'OFFLINE', 'WARNING', 'UNCHECKED'] },
          group: { type: 'string', description: 'Grupo (e.g. Producción, Base de Datos)' },
          os: { type: 'string', description: 'Sistema operativo (e.g. Linux, Windows, Ubuntu)' },
          tag: { type: 'string', description: 'Nombre de tag/etiqueta' },
          limit: { type: 'number', default: 20 },
        },
      },
      execute: async (params, { prisma }) => {
        const where: any = {};
        if (params.status) where.status = params.status;
        if (params.group) where.group = { contains: params.group, mode: 'insensitive' };
        if (params.os) where.os = { contains: params.os, mode: 'insensitive' };
        if (params.query) {
          where.OR = [
            { hostname: { contains: params.query, mode: 'insensitive' } },
            { primaryIp: { contains: params.query, mode: 'insensitive' } },
            { description: { contains: params.query, mode: 'insensitive' } },
          ];
        }
        if (params.tag) {
          where.tags = { some: { tag: { name: { contains: params.tag, mode: 'insensitive' } } } };
        }

        const machines = await prisma.machine.findMany({
          where,
          take: Math.min(params.limit || 20, 50),
          include: {
            location: { select: { id: true, name: true } },
            vlan: { select: { id: true, name: true, vlanId: true } },
            tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
            assets: { select: { id: true, assetTag: true, name: true } },
          },
          orderBy: { hostname: 'asc' },
        });

        return machines.map((m: any) => ({
          id: m.id,
          hostname: m.hostname,
          type: m.type,
          status: m.status,
          primaryIp: m.primaryIp,
          os: m.os,
          group: m.group,
          location: m.location?.name,
          tags: m.tags?.map((t: any) => t.tag?.name) || [],
          assetTag: m.assets?.[0]?.assetTag,
        }));
      },
    };
    this.register(searchMachinesTool);
    this.register({ ...searchMachinesTool, name: 'searchMachines' });

    // ----------------------------------------------------
    // 2. Device Details (get_device / getMachine)
    // ----------------------------------------------------
    const getMachineTool: ToolDefinition = {
      name: 'get_device',
      description: 'Obtiene el detalle completo de un host/servidor específico incluyendo interfaces, IPs, puertos y servicios',
      requiredPermission: 'MACHINE_READ',
      parameters: {
        type: 'object',
        properties: {
          hostnameOrId: { type: 'string', description: 'Hostname exacto o ID de la máquina' },
        },
        required: ['hostnameOrId'],
      },
      execute: async (params, { prisma }) => {
        const query = params.hostnameOrId;
        const machine = await prisma.machine.findFirst({
          where: {
            OR: [
              { id: query },
              { hostname: { equals: query, mode: 'insensitive' } },
              { primaryIp: query },
            ],
          },
          include: {
            interfaces: { include: { ipAddresses: true, vlan: true } },
            ports: { include: { service: true } },
            location: true,
            assets: { include: { warranties: true, hardware: true } },
            tags: { include: { tag: true } },
            metricSamples: { take: 5, orderBy: { timestamp: 'desc' } },
            metricAnomalies: { take: 5, orderBy: { detectedAt: 'desc' } },
            tickets: { take: 5, orderBy: { createdAt: 'desc' } },
            maintenances: { take: 3, orderBy: { scheduledStart: 'desc' } },
          },
        });

        if (!machine) return { error: `Máquina no encontrada: "${query}"` };
        const m: any = machine;
        return {
          id: m.id,
          hostname: m.hostname,
          status: m.status,
          type: m.type,
          primaryIp: m.primaryIp,
          macAddress: m.macAddress,
          os: m.os,
          osVersion: m.osVersion,
          group: m.group,
          location: m.location?.name,
          tags: m.tags?.map((t: any) => t.tag?.name) || [],
          interfaces: m.interfaces?.map((i: any) => ({
            name: i.name,
            mac: i.macAddress,
            ips: i.ipAddresses?.map((ip: any) => ip.address) || [],
          })) || [],
          ports: m.ports?.map((p: any) => ({
            portNumber: p.portNumber,
            protocol: p.protocol,
            state: p.state,
            service: p.service?.name,
          })) || [],
          recentMetrics: m.metricSamples?.map((s: any) => ({
            timestamp: s.timestamp,
            cpu: s.cpuUsage,
            ram: s.ramUsage,
            disk: s.diskUsage,
            latency: s.latencyMs,
            state: s.healthState,
          })) || [],
          recentIncidents: m.metricAnomalies?.map((a: any) => ({
            type: a.metricType,
            message: a.message,
            severity: a.severity,
            detectedAt: a.detectedAt,
            resolved: !!a.resolvedAt,
          })) || [],
          recentTickets: m.tickets?.map((t: any) => ({
            code: t.ticketNumber,
            title: t.title,
            status: t.status,
            priority: t.priority,
          })) || [],
          asset: m.assets?.[0] ? {
            tag: m.assets[0].assetTag,
            name: m.assets[0].name,
            serial: m.assets[0].serialNumber,
            warrantyEnd: m.assets[0].warranties?.[0]?.endDate,
          } : null,
        };
      },
    };
    this.register(getMachineTool);
    this.register({ ...getMachineTool, name: 'getMachine' });

    // ----------------------------------------------------
    // 3. Telemetry & Metrics (get_device_metrics / getMachineMetrics)
    // ----------------------------------------------------
    const getMachineMetricsTool: ToolDefinition = {
      name: 'get_device_metrics',
      description: 'Consulta el rendimiento histórico y telemetría de un host (CPU, RAM, Disco, Latencia)',
      requiredPermission: 'METRICS_READ',
      parameters: {
        type: 'object',
        properties: {
          hostnameOrId: { type: 'string', description: 'Hostname o ID de la máquina' },
          limit: { type: 'number', default: 30 },
        },
        required: ['hostnameOrId'],
      },
      execute: async (params, { prisma }) => {
        const query = params.hostnameOrId;
        const machine = await prisma.machine.findFirst({
          where: {
            OR: [
              { id: query },
              { hostname: { equals: query, mode: 'insensitive' } },
              { primaryIp: query },
            ],
          },
        });

        if (!machine) return { error: `Host no encontrado: "${query}"` };

        const samples = await prisma.metricSample.findMany({
          where: { machineId: machine.id },
          orderBy: { timestamp: 'desc' },
          take: Math.min(params.limit || 30, 100),
        });

        if (samples.length === 0) {
          return {
            host: machine.hostname,
            status: machine.status,
            samplesCount: 0,
            summary: 'No hay telemetría histórica registrada para este host.',
            metrics: [],
          };
        }

        const validCpu = samples.map((s) => s.cpuUsage).filter((v): v is number => v !== null && v !== undefined);
        const validRam = samples.map((s) => s.ramUsage).filter((v): v is number => v !== null && v !== undefined);
        const validDisk = samples.map((s) => s.diskUsage).filter((v): v is number => v !== null && v !== undefined);
        const validLatency = samples.map((s) => s.latencyMs).filter((v): v is number => v !== null && v !== undefined);

        const avg = (arr: number[]) => (arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null);
        const max = (arr: number[]) => (arr.length > 0 ? Number(Math.max(...arr).toFixed(1)) : null);

        return {
          host: machine.hostname,
          status: machine.status,
          samplesCount: samples.length,
          stats: {
            cpuAvg: avg(validCpu),
            cpuMax: max(validCpu),
            ramAvg: avg(validRam),
            ramMax: max(validRam),
            diskAvg: avg(validDisk),
            diskMax: max(validDisk),
            latencyAvg: avg(validLatency),
          },
          metrics: samples.slice(0, 10).map((s) => ({
            time: s.timestamp,
            cpu: s.cpuUsage,
            ram: s.ramUsage,
            disk: s.diskUsage,
            latencyMs: s.latencyMs,
            state: s.healthState,
          })),
        };
      },
    };
    this.register(getMachineMetricsTool);
    this.register({ ...getMachineMetricsTool, name: 'getMachineMetrics' });

    // ----------------------------------------------------
    // 4. Incidents & Active Alerts (get_active_alerts / getActiveIncidents)
    // ----------------------------------------------------
    const getActiveIncidentsTool: ToolDefinition = {
      name: 'get_active_alerts',
      description: 'Consulta las anomalías y alertas activas detectadas por la monitorización NOC',
      requiredPermission: 'METRICS_READ',
      parameters: {
        type: 'object',
        properties: {
          onlyUnresolved: { type: 'boolean', default: true },
          severity: { type: 'string', enum: ['WARNING', 'CRITICAL'] },
          limit: { type: 'number', default: 20 },
        },
      },
      execute: async (params, { prisma }) => {
        const where: any = {};
        if (params.onlyUnresolved !== false) where.resolvedAt = null;
        if (params.severity) where.severity = params.severity;

        const incidents = await prisma.metricAnomaly.findMany({
          where,
          take: Math.min(params.limit || 20, 50),
          orderBy: { detectedAt: 'desc' },
          include: { machine: { select: { id: true, hostname: true, primaryIp: true } } },
        });

        return incidents.map((i: any) => ({
          id: i.id,
          machine: i.machine?.hostname,
          ip: i.machine?.primaryIp,
          metricType: i.metricType,
          currentValue: i.currentValue,
          expectedMean: i.expectedMean,
          severity: i.severity,
          message: i.message,
          detectedAt: i.detectedAt,
          isResolved: !!i.resolvedAt,
        }));
      },
    };
    this.register(getActiveIncidentsTool);
    this.register({ ...getActiveIncidentsTool, name: 'getActiveIncidents' });

    // ----------------------------------------------------
    // 5. Offline Devices (get_offline_devices / getOfflineDevices)
    // ----------------------------------------------------
    const getOfflineDevicesTool: ToolDefinition = {
      name: 'get_offline_devices',
      description: 'Consulta todos los dispositivos y servidores actualmente inaccesibles u OFFLINE',
      requiredPermission: 'MACHINE_READ',
      parameters: { type: 'object', properties: {} },
      execute: async (_, { prisma }) => {
        const offline = await prisma.machine.findMany({
          where: { status: MachineStatus.OFFLINE },
          include: {
            location: { select: { name: true } },
            tags: { select: { tag: { select: { name: true } } } },
          },
          orderBy: { hostname: 'asc' },
        });

        return offline.map((m: any) => ({
          id: m.id,
          hostname: m.hostname,
          primaryIp: m.primaryIp,
          group: m.group,
          os: m.os,
          location: m.location?.name,
          tags: m.tags?.map((t: any) => t.tag?.name) || [],
          lastDiscoveredAt: m.lastDiscoveredAt,
        }));
      },
    };
    this.register(getOfflineDevicesTool);
    this.register({ ...getOfflineDevicesTool, name: 'getOfflineDevices' });

    // ----------------------------------------------------
    // 6. Discovery Results (get_discovery_results / getDiscoveryResults)
    // ----------------------------------------------------
    const getDiscoveryResultsTool: ToolDefinition = {
      name: 'get_discovery_results',
      description: 'Consulta los últimos escaneos de red, nuevos dispositivos descubiertos y cambios detectados en topología',
      requiredPermission: 'DISCOVERY_READ',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 5 },
        },
      },
      execute: async (params, { prisma }) => {
        const scans = await prisma.discoveryScan.findMany({
          take: Math.min(params.limit || 5, 20),
          orderBy: { startedAt: 'desc' },
          include: {
            hosts: { take: 10 },
            changes: { take: 10 },
          },
        });

        return scans.map((s) => ({
          id: s.id,
          networkCidr: s.networkCidr,
          status: s.status,
          startedAt: s.startedAt,
          activeHosts: s.activeHosts,
          newDevicesCount: s.newDevices,
          changedDevicesCount: s.changedDevices,
          missingDevicesCount: s.missingDevices,
          recentChanges: s.changes.map((c) => ({
            type: c.changeType,
            hostname: c.hostname,
            ip: c.ip,
            details: c.details,
          })),
        }));
      },
    };
    this.register(getDiscoveryResultsTool);
    this.register({ ...getDiscoveryResultsTool, name: 'getDiscoveryResults' });

    // ----------------------------------------------------
    // 7. Backup Status & Integrity (get_backup_status / getBackupStatus)
    // ----------------------------------------------------
    const getBackupStatusTool: ToolDefinition = {
      name: 'get_backup_status',
      description: 'Consulta el estado, historial e integridad SHA-256 de las copias de seguridad de la infraestructura',
      requiredPermission: 'SETTINGS_READ',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 },
        },
      },
      execute: async (params, { prisma }) => {
        const backups = await prisma.backup.findMany({
          take: Math.min(params.limit || 10, 30),
          orderBy: { createdAt: 'desc' },
        });

        return backups.map((b) => ({
          id: b.id,
          name: b.name,
          type: b.type,
          status: b.status,
          sizeBytes: b.sizeBytes,
          tablesCount: b.tablesCount,
          recordsCount: b.recordsCount,
          isProtected: b.isProtected,
          createdAt: b.createdAt,
          errorDetails: b.errorDetails,
        }));
      },
    };
    this.register(getBackupStatusTool);
    this.register({ ...getBackupStatusTool, name: 'getBackupStatus' });

    // ----------------------------------------------------
    // 8. Infrastructure Overview (get_inventory_summary / getDashboardStats)
    // ----------------------------------------------------
    const getDashboardStatsTool: ToolDefinition = {
      name: 'get_inventory_summary',
      description: 'Obtiene un resumen global en tiempo real de toda la infraestructura (dispositivos por estado, incidentes, tickets y capacidad)',
      requiredPermission: 'SETTINGS_READ',
      parameters: { type: 'object', properties: {} },
      execute: async (_, { prisma }) => {
        const [
          totalMachines,
          onlineMachines,
          warningMachines,
          offlineMachines,
          activeIncidents,
          criticalAlerts,
          openTickets,
          totalBackups,
          failedBackups,
        ] = await Promise.all([
          prisma.machine.count(),
          prisma.machine.count({ where: { status: 'ONLINE' } }),
          prisma.machine.count({ where: { status: 'WARNING' } }),
          prisma.machine.count({ where: { status: 'OFFLINE' } }),
          prisma.metricAnomaly.count({ where: { resolvedAt: null } }),
          prisma.metricAnomaly.count({ where: { resolvedAt: null, severity: 'CRITICAL' } }),
          prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING', 'WAITING'] } } }),
          prisma.backup.count(),
          prisma.backup.count({ where: { status: 'FAILED' } }),
        ]);

        return {
          infrastructure: {
            totalHosts: totalMachines,
            online: onlineMachines,
            warning: warningMachines,
            offline: offlineMachines,
            healthRate: totalMachines > 0 ? `${Math.round((onlineMachines / totalMachines) * 100)}%` : '100%',
          },
          alerts: {
            activeIncidents,
            criticalAlerts,
          },
          operations: {
            openTickets,
            totalBackups,
            failedBackups,
          },
        };
      },
    };
    this.register(getDashboardStatsTool);
    this.register({ ...getDashboardStatsTool, name: 'getDashboardStats' });

    // ----------------------------------------------------
    // 9. Recent Activity & Audit (get_recent_activity / getRecentActivity)
    // ----------------------------------------------------
    const getRecentActivityTool: ToolDefinition = {
      name: 'get_recent_activity',
      description: 'Consulta los cambios y eventos recientes registrados en el registro de auditoría (ChangeLog)',
      requiredPermission: 'CHANGE_READ',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20 },
        },
      },
      execute: async (params, { prisma }) => {
        const logs = await prisma.changeLog.findMany({
          take: Math.min(params.limit || 20, 50),
          orderBy: { createdAt: 'desc' },
        });

        return logs.map((l) => ({
          id: l.id,
          entityType: l.entityType,
          action: l.action,
          details: l.details,
          user: l.user,
          createdAt: l.createdAt,
        }));
      },
    };
    this.register(getRecentActivityTool);
    this.register({ ...getRecentActivityTool, name: 'getRecentActivity' });

    // ----------------------------------------------------
    // 10. Groups & Categories (get_groups / getGroups)
    // ----------------------------------------------------
    const getGroupsTool: ToolDefinition = {
      name: 'get_groups',
      description: 'Consulta los grupos funcionales de máquinas y la cantidad de equipos en cada uno',
      requiredPermission: 'MACHINE_READ',
      parameters: { type: 'object', properties: {} },
      execute: async (_, { prisma }) => {
        const machines = await prisma.machine.findMany({
          select: { group: true, status: true },
        });

        const map: Record<string, { total: number; online: number; offline: number; warning: number }> = {};
        for (const m of machines) {
          const g = m.group || 'Sin Grupo';
          if (!map[g]) map[g] = { total: 0, online: 0, offline: 0, warning: 0 };
          map[g].total++;
          if (m.status === 'ONLINE') map[g].online++;
          if (m.status === 'OFFLINE') map[g].offline++;
          if (m.status === 'WARNING') map[g].warning++;
        }

        return Object.entries(map).map(([group, counts]) => ({ group, ...counts }));
      },
    };
    this.register(getGroupsTool);
    this.register({ ...getGroupsTool, name: 'getGroups' });

    // ----------------------------------------------------
    // 11. Tags (get_tags / getTags)
    // ----------------------------------------------------
    const getTagsTool: ToolDefinition = {
      name: 'get_tags',
      description: 'Consulta las etiquetas/tags asignadas a los dispositivos de infraestructura',
      requiredPermission: 'TAG_READ',
      parameters: { type: 'object', properties: {} },
      execute: async (_, { prisma }) => {
        const tags = await prisma.tag.findMany({
          include: { _count: { select: { machines: true } } },
          orderBy: { name: 'asc' },
        });

        return tags.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          assignedMachinesCount: t._count.machines,
        }));
      },
    };
    this.register(getTagsTool);
    this.register({ ...getTagsTool, name: 'getTags' });

    // ----------------------------------------------------
    // 12. IPAM & Subnets (get_network_ipam / searchIPAM)
    // ----------------------------------------------------
    const searchIPAMTool: ToolDefinition = {
      name: 'get_network_ipam',
      description: 'Consulta redes, VLANs y asignación de direcciones IP',
      requiredPermission: 'IPAM_READ',
      parameters: {
        type: 'object',
        properties: {
          cidrOrVlan: { type: 'string', description: 'CIDR e.g. "192.168.1.0/24" o número de VLAN' },
          limit: { type: 'number', default: 25 },
        },
      },
      execute: async (params, { prisma }) => {
        const networks = await prisma.network.findMany({
          include: { vlan: true, _count: { select: { ipAddresses: true } } },
        });

        return networks.map((n) => ({
          name: n.name,
          cidr: n.cidr,
          vlan: n.vlan ? `${n.vlan.name} (VLAN ${n.vlan.vlanId})` : 'Sin VLAN',
          dhcp: n.dhcpEnabled,
          ipsRegistered: n._count.ipAddresses,
        }));
      },
    };
    this.register(searchIPAMTool);
    this.register({ ...searchIPAMTool, name: 'searchIPAM' });

    // ----------------------------------------------------
    // 13. Network Topology (get_topology / getTopology)
    // ----------------------------------------------------
    const getTopologyTool: ToolDefinition = {
      name: 'get_topology',
      description: 'Consulta diagramas de topología de red y conexiones entre equipos',
      requiredPermission: 'TOPOLOGY_READ',
      parameters: { type: 'object', properties: {} },
      execute: async (_, { prisma }) => {
        const topologies = await prisma.topology.findMany({
          take: 3,
          include: {
            nodes: { include: { machine: { select: { hostname: true, primaryIp: true, status: true } } } },
            edges: true,
          },
        });

        return topologies.map((t) => ({
          id: t.id,
          name: t.name,
          nodesCount: t.nodes.length,
          edgesCount: t.edges.length,
          connectedMachines: t.nodes.map((n) => ({
            label: n.label,
            hostname: n.machine?.hostname,
            ip: n.machine?.primaryIp,
            status: n.machine?.status,
          })),
        }));
      },
    };
    this.register(getTopologyTool);
    this.register({ ...getTopologyTool, name: 'getTopology' });
  }
}
