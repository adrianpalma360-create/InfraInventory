import { PrismaClient, MachineStatus } from '@prisma/client';

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  async getDashboardSummary(tagFilter?: string) {
    const machineWhere: any = {};
    if (tagFilter) {
      machineWhere.tags = {
        some: {
          tag: {
            name: { equals: tagFilter, mode: 'insensitive' },
          },
        },
      };
    }

    const [
      totalMachines,
      totalIPs,
      totalServices,
      totalPorts,
      totalChanges,
      totalNetworks,
      totalVlans,
      totalLocations,
      totalTags,
      onlineMachines,
      warningMachines,
      offlineMachines,
      uncheckedMachines,
      assignedIps,
      freeIps,
      conflictIps,
      criticalIncidents,
      warningIncidents,
      recentMachines,
      recentChanges,
      lastScan,
      allTags,
    ] = await Promise.all([
      this.prisma.machine.count({ where: machineWhere }),
      this.prisma.iPAddress.count(),
      this.prisma.service.count(),
      this.prisma.port.count(),
      this.prisma.changeLog.count(),
      this.prisma.network.count(),
      this.prisma.vLAN.count(),
      this.prisma.location.count(),
      this.prisma.tag.count(),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.ONLINE } }),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.WARNING } }),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.OFFLINE } }),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.UNCHECKED } }),
      this.prisma.iPAddress.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.iPAddress.count({ where: { status: 'FREE' } }),
      this.prisma.iPAddress.count({ where: { status: 'CONFLICT' } }),
      this.prisma.metricAnomaly.count({ where: { isResolved: false, severity: 'CRITICAL' } }),
      this.prisma.metricAnomaly.count({ where: { isResolved: false, severity: 'WARNING' } }),
      this.prisma.machine.findMany({
        where: machineWhere,
        take: 6,
        orderBy: { updatedAt: 'desc' },
        include: {
          location: true,
          vlan: true,
          tags: { include: { tag: true } },
          ports: {
            include: { service: true },
          },
          metricAnomalies: { where: { isResolved: false } },
        },
      }),
      this.prisma.changeLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.discoveryScan.findFirst({
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.tag.findMany({
        include: { _count: { select: { machines: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      metrics: {
        totalMachines,
        totalIPs,
        totalServices,
        totalPorts,
        totalChanges,
        totalNetworks,
        totalVlans,
        totalLocations,
        totalTags,
      },
      ipamSummary: {
        totalNetworks,
        totalVlans,
        assignedIps,
        freeIps,
        conflictIps,
      },
      locationsSummary: {
        totalLocations,
        totalMachines,
      },
      incidentsSummary: {
        critical: criticalIncidents,
        warning: warningIncidents,
        total: criticalIncidents + warningIncidents,
      },
      statusDistribution: {
        online: onlineMachines,
        warning: warningMachines,
        offline: offlineMachines,
        unchecked: uncheckedMachines,
      },
      availableTags: allTags,
      activeTagFilter: tagFilter || null,
      lastScan,
      recentMachines,
      recentChanges,
    };
  }
}
