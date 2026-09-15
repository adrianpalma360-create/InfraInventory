import { PrismaClient } from '@prisma/client';
import { Permission, hasPermission } from '../../utils/permissions.js';

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
      const data = await tool.execute(params, { prisma: this.prisma, userRole, userId });
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error interno ejecutando la herramienta' };
    }
  }

  private registerAllTools() {
    // 1. Search Machines
    this.register({
      name: 'searchMachines',
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
          take: params.limit || 20,
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
    });

    // 2. Get Machine Details
    this.register({
      name: 'getMachine',
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
    });

    // 3. Get Machine Metrics
    this.register({
      name: 'getMachineMetrics',
      description: 'Consulta el rendimiento histórico y telemetría de un host (CPU, RAM, Disco, Latencia, Conexiones)',
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
          take: params.limit || 30,
        });

        return {
          host: machine.hostname,
          status: machine.status,
          samplesCount: samples.length,
          metrics: samples.map((s) => ({
            time: s.timestamp,
            cpu: s.cpuUsage,
            ram: s.ramUsage,
            disk: s.diskUsage,
            latencyMs: s.latencyMs,
            rxKbps: s.networkRxKbps,
            txKbps: s.networkTxKbps,
            state: s.healthState,
          })),
        };
      },
    });

    // 4. Incidents & Anomalies
    this.register({
      name: 'getActiveIncidents',
      description: 'Consulta las anomalías estadísticas y fallos activos detectados por el sistema de monitorización NOC',
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
        if (params.onlyUnresolved !== false) where.isResolved = false;
        if (params.severity) where.severity = params.severity;

        const incidents = await prisma.metricAnomaly.findMany({
          where,
          take: params.limit || 20,
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
          isSuppressed: i.isSuppressed,
          suppressedReason: i.suppressedReason,
        }));
      },
    });

    // 5. IPAM & Subnets
    this.register({
      name: 'searchIPAM',
      description: 'Consulta redes, VLANs y asignación de direcciones IP libres, ocupadas o en conflicto',
      requiredPermission: 'IPAM_READ',
      parameters: {
        type: 'object',
        properties: {
          cidrOrVlan: { type: 'string', description: 'CIDR e.g. "192.168.1.0/24" o número de VLAN' },
          status: { type: 'string', enum: ['FREE', 'ASSIGNED', 'RESERVED', 'DHCP', 'CONFLICT'] },
          limit: { type: 'number', default: 25 },
        },
      },
      execute: async (params, { prisma }) => {
        const networks = await prisma.network.findMany({
          include: { vlan: true, _count: { select: { ipAddresses: true } } },
        });

        const where: any = {};
        if (params.status) where.status = params.status;
        if (params.cidrOrVlan) {
          where.OR = [
            { subnet: { contains: params.cidrOrVlan } },
            { address: { contains: params.cidrOrVlan } },
            { network: { cidr: { contains: params.cidrOrVlan } } },
          ];
        }

        const ips = await prisma.iPAddress.findMany({
          where,
          take: params.limit || 25,
          include: { machine: { select: { hostname: true } } },
          orderBy: { address: 'asc' },
        });

        return {
          networks: networks.map((n) => ({
            name: n.name,
            cidr: n.cidr,
            vlan: n.vlan ? `${n.vlan.name} (VLAN ${n.vlan.vlanId})` : 'Sin VLAN',
            dhcp: n.dhcpEnabled,
            ipsRegistered: n._count.ipAddresses,
          })),
          sampleIPs: ips.map((ip) => ({
            ip: ip.address,
            status: ip.status,
            assignedToHost: ip.machine?.hostname || ip.hostname || 'Libre',
          })),
        };
      },
    });

    // 6. IT Assets, Warranties & Hardware
    this.register({
      name: 'getAssets',
      description: 'Consulta el inventario de activos de hardware, componentes, estado de amortización y vencimiento de garantías',
      requiredPermission: 'ASSET_READ',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Buscar por tag de activo, nombre, modelo o serie' },
          warrantiesExpiringWithinDays: { type: 'number', description: 'Días para vencimiento de garantía (e.g. 30, 90)' },
          limit: { type: 'number', default: 20 },
        },
      },
      execute: async (params, { prisma }) => {
        const where: any = {};
        if (params.query) {
          where.OR = [
            { assetTag: { contains: params.query, mode: 'insensitive' } },
            { name: { contains: params.query, mode: 'insensitive' } },
            { model: { contains: params.query, mode: 'insensitive' } },
            { serialNumber: { contains: params.query, mode: 'insensitive' } },
          ];
        }

        if (params.warrantiesExpiringWithinDays) {
          const targetDate = new Date(Date.now() + params.warrantiesExpiringWithinDays * 24 * 3600 * 1000);
          where.warranty = {
            endDate: { lte: targetDate, gte: new Date() },
          };
        }

        const assets = await prisma.asset.findMany({
          where,
          take: params.limit || 20,
          include: {
            warranties: true,
            supplier: { select: { name: true } },
            machine: { select: { hostname: true } },
            location: { select: { name: true } },
          },
          orderBy: { assetTag: 'asc' },
        });

        return assets.map((a: any) => ({
          id: a.id,
          assetTag: a.assetTag,
          name: a.name,
          type: a.assetType,
          status: a.status,
          model: a.model,
          manufacturer: a.manufacturer,
          serialNumber: a.serialNumber,
          linkedHost: a.machine?.hostname,
          location: a.location?.name,
          supplier: a.supplier?.name,
          warranty: a.warranties?.[0] ? {
            provider: a.warranties[0].provider,
            endDate: a.warranties[0].endDate,
            contractNumber: a.warranties[0].contractNumber,
          } : 'Sin garantía registrada',
        }));
      },
    });

    // 7. Software Licenses
    this.register({
      name: 'getLicenses',
      description: 'Consulta licencias de software, fabricantes, asientos utilizados, libres y sobreasignaciones (las claves privadas se mantienen ocultas)',
      requiredPermission: 'LICENSE_READ',
      parameters: {
        type: 'object',
        properties: {
          vendorOrProduct: { type: 'string', description: 'Nombre de proveedor o producto de software' },
          limit: { type: 'number', default: 20 },
        },
      },
      execute: async (params, { prisma }) => {
        const where: any = {};
        if (params.vendorOrProduct) {
          where.OR = [
            { vendor: { contains: params.vendorOrProduct, mode: 'insensitive' } },
            { product: { contains: params.vendorOrProduct, mode: 'insensitive' } },
            { name: { contains: params.vendorOrProduct, mode: 'insensitive' } },
          ];
        }

        const licenses = await prisma.license.findMany({
          where,
          take: params.limit || 20,
          include: { _count: { select: { assignments: true } } },
        });

        return licenses.map((l: any) => ({
          id: l.id,
          name: l.name,
          vendor: l.vendor,
          product: l.product,
          type: l.licenseType,
          totalSeats: l.seats,
          usedSeats: l._count?.assignments ?? l.usedSeats ?? 0,
          availableSeats: Math.max(0, l.seats - (l._count?.assignments ?? l.usedSeats ?? 0)),
          isOverAssigned: (l._count?.assignments ?? l.usedSeats ?? 0) > l.seats,
          expiresAt: l.expirationDate,
        }));
      },
    });

    // 8. Tickets & SLAs
    this.register({
      name: 'getTickets',
      description: 'Consulta tickets de soporte, estado, prioridad, cumplimiento de SLA y técnicos asignados',
      requiredPermission: 'TICKET_READ',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'PENDING', 'WAITING', 'RESOLVED', 'CLOSED', 'CANCELLED'] },
          priority: { type: 'string', enum: ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'] },
          slaStatus: { type: 'string', enum: ['ON_TRACK', 'WARNING', 'BREACHED', 'EXEMPT'] },
          limit: { type: 'number', default: 20 },
        },
      },
      execute: async (params, { prisma }) => {
        const where: any = {};
        if (params.status) where.status = params.status;
        if (params.priority) where.priority = params.priority;
        if (params.slaStatus) where.slaStatus = params.slaStatus;

        const tickets = await prisma.ticket.findMany({
          where,
          take: params.limit || 20,
          include: {
            assignee: { select: { name: true, username: true } },
            machine: { select: { hostname: true } },
            asset: { select: { assetTag: true } },
            sla: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        return tickets.map((t: any) => ({
          id: t.id,
          code: t.ticketNumber,
          title: t.title,
          type: t.type,
          status: t.status,
          priority: t.priority,
          slaStatus: t.slaStatus,
          slaName: t.sla?.name,
          assignee: t.assignee?.name || 'Sin asignar',
          linkedHost: t.machine?.hostname,
          linkedAsset: t.asset?.assetTag,
          createdAt: t.createdAt,
          dueDate: t.dueDate,
        }));
      },
    });

    // 9. Maintenances & Windows
    this.register({
      name: 'getMaintenances',
      description: 'Consulta ventanas de mantenimiento preventivo y correctivo programadas en infraestructura',
      requiredPermission: 'MAINTENANCE_READ',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['PREVENTIVE', 'CORRECTIVE', 'SCHEDULED', 'EMERGENCY'] },
          status: { type: 'string', enum: ['PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          limit: { type: 'number', default: 20 },
        },
      },
      execute: async (params, { prisma }) => {
        const where: any = {};
        if (params.type) where.type = params.type;
        if (params.status) where.status = params.status;

        const maintenances = await prisma.maintenance.findMany({
          where,
          take: params.limit || 20,
          include: {
            machine: { select: { hostname: true } },
            assignee: { select: { name: true } },
            checklists: true,
          },
          orderBy: { scheduledStart: 'asc' },
        });

        return maintenances.map((m: any) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          status: m.status,
          start: m.scheduledStart,
          end: m.scheduledEnd,
          host: m.machine?.hostname,
          suppressAlerts: m.suppressAlerts,
          assignee: m.assignee?.name || 'Sin asignar',
          checklistTotal: m.checklists?.length || 0,
          checklistCompleted: m.checklists?.filter((c: any) => c.isCompleted)?.length || 0,
        }));
      },
    });

    // 10. Change Management (RFC)
    this.register({
      name: 'getChanges',
      description: 'Consulta solicitudes de cambio (RFC ITIL), evaluaciones de riesgo, impacto y aprobaciones',
      requiredPermission: 'CHANGE_READ',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK'] },
          limit: { type: 'number', default: 20 },
        },
      },
      execute: async (params, { prisma }) => {
        const where: any = {};
        if (params.status) where.status = params.status;

        const changes = await prisma.change.findMany({
          where,
          take: params.limit || 20,
          include: {
            requester: { select: { name: true } },
            machine: { select: { hostname: true } },
            approvals: true,
          },
          orderBy: { plannedStart: 'asc' },
        });

        return changes.map((c) => ({
          id: c.id,
          code: c.changeNumber,
          title: c.title,
          risk: c.risk,
          impact: c.impact,
          status: c.status,
          start: c.plannedStart,
          end: c.plannedEnd,
          requester: c.requester?.name || 'Admin',
          host: c.machine?.hostname,
          hasRollbackPlan: !!c.rollbackPlan,
          approvalsCount: c.approvals.length,
        }));
      },
    });

    // 11. Network Topology
    this.register({
      name: 'getTopology',
      description: 'Consulta diagramas de topología de red y conexiones entre equipos',
      requiredPermission: 'TOPOLOGY_READ',
      parameters: {
        type: 'object',
        properties: {
          topologyIdOrName: { type: 'string', description: 'ID o nombre de la topología' },
        },
      },
      execute: async (params, { prisma }) => {
        const where: any = {};
        if (params.topologyIdOrName) {
          where.OR = [
            { id: params.topologyIdOrName },
            { name: { contains: params.topologyIdOrName, mode: 'insensitive' } },
          ];
        }

        const topologies = await prisma.topology.findMany({
          where,
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
    });

    // 12. Dashboard & Platform Overview Stats
    this.register({
      name: 'getDashboardStats',
      description: 'Obtiene un resumen global en tiempo real de toda la infraestructura (máquinas por estado, incidentes, tickets y capacidad)',
      requiredPermission: 'SETTINGS_READ',
      parameters: { type: 'object', properties: {} },
      execute: async (_, { prisma }) => {
        const [
          totalMachines,
          onlineMachines,
          warningMachines,
          offlineMachines,
          activeIncidents,
          openTickets,
          criticalTickets,
          pendingChanges,
          upcomingMaintenances,
        ] = await Promise.all([
          prisma.machine.count(),
          prisma.machine.count({ where: { status: 'ONLINE' } }),
          prisma.machine.count({ where: { status: 'WARNING' } }),
          prisma.machine.count({ where: { status: 'OFFLINE' } }),
          prisma.metricAnomaly.count({ where: { resolvedAt: null } }),
          prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING', 'WAITING'] } } }),
          prisma.ticket.count({ where: { priority: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } }),
          prisma.change.count({ where: { status: 'PENDING_APPROVAL' } }),
          prisma.maintenance.count({ where: { status: { in: ['PLANNED', 'SCHEDULED'] } } }),
        ]);

        return {
          infrastructure: {
            totalHosts: totalMachines,
            online: onlineMachines,
            warning: warningMachines,
            offline: offlineMachines,
            healthRate: totalMachines > 0 ? `${Math.round((onlineMachines / totalMachines) * 100)}%` : '100%',
          },
          operations: {
            activeIncidents,
            openTickets,
            criticalTickets,
            pendingChanges,
            upcomingMaintenances,
          },
        };
      },
    });
  }
}
