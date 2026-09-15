import { PrismaClient } from '@prisma/client';

export class OperationsService {
  constructor(private prisma: PrismaClient) {}

  async getOperationsStats() {
    const now = new Date();
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      openTicketsCount,
      criticalTicketsCount,
      unassignedTicketsCount,
      slaBreachedTicketsCount,
      slaWarningTicketsCount,
      maintenancesTodayCount,
      maintenancesUpcomingCount,
      changesPendingApprovalCount,
      changesScheduledCount,
      tasksPendingCount,
      tasksOverdueCount,
      recentTickets,
      upcomingMaintenances,
      pendingChanges,
      activeSlas,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING', 'WAITING'] } } }),
      this.prisma.ticket.count({ where: { priority: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } }),
      this.prisma.ticket.count({ where: { assignedToId: null, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } }),
      this.prisma.ticket.count({ where: { slaStatus: 'BREACHED', status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } }),
      this.prisma.ticket.count({ where: { slaStatus: 'WARNING', status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } }),
      this.prisma.maintenance.count({
        where: {
          scheduledStart: { gte: new Date(now.setHours(0,0,0,0)), lte: new Date(now.setHours(23,59,59,999)) },
        },
      }),
      this.prisma.maintenance.count({
        where: {
          scheduledStart: { gte: new Date(), lte: endOfWeek },
          status: { in: ['PLANNED', 'SCHEDULED'] },
        },
      }),
      this.prisma.change.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.change.count({ where: { status: 'SCHEDULED' } }),
      this.prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] } } }),
      this.prisma.task.count({ where: { dueDate: { lt: new Date() }, status: { notIn: ['DONE', 'CANCELLED'] } } }),
      this.prisma.ticket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: { select: { id: true, name: true } },
          machine: { select: { id: true, hostname: true } },
          asset: { select: { id: true, assetTag: true } },
        },
      }),
      this.prisma.maintenance.findMany({
        take: 5,
        where: { status: { in: ['PLANNED', 'SCHEDULED', 'IN_PROGRESS'] } },
        orderBy: { scheduledStart: 'asc' },
        include: {
          assignee: { select: { id: true, name: true } },
          machine: { select: { id: true, hostname: true } },
        },
      }),
      this.prisma.change.findMany({
        take: 5,
        where: { status: { in: ['DRAFT', 'PENDING_APPROVAL', 'SCHEDULED'] } },
        orderBy: { plannedStart: 'asc' },
        include: {
          requester: { select: { id: true, name: true } },
          machine: { select: { id: true, hostname: true } },
        },
      }),
      this.prisma.sLA.findMany({ where: { enabled: true } }),
    ]);

    return {
      tickets: {
        open: openTicketsCount,
        critical: criticalTicketsCount,
        unassigned: unassignedTicketsCount,
        slaBreached: slaBreachedTicketsCount,
        slaWarning: slaWarningTicketsCount,
      },
      maintenances: {
        today: maintenancesTodayCount,
        upcoming: maintenancesUpcomingCount,
      },
      changes: {
        pendingApproval: changesPendingApprovalCount,
        scheduled: changesScheduledCount,
      },
      tasks: {
        pending: tasksPendingCount,
        overdue: tasksOverdueCount,
      },
      recentTickets,
      upcomingMaintenances,
      pendingChanges,
      activeSlas,
    };
  }

  // Unified Calendar Feed for V9
  async getCalendarEvents(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const [maintenances, changes, tickets, warranties] = await Promise.all([
      this.prisma.maintenance.findMany({
        where: { scheduledStart: { gte: startDate, lte: endDate } },
        include: { machine: { select: { hostname: true } }, asset: { select: { assetTag: true } } },
      }),
      this.prisma.change.findMany({
        where: { plannedStart: { gte: startDate, lte: endDate } },
        include: { machine: { select: { hostname: true } } },
      }),
      this.prisma.ticket.findMany({
        where: { dueDate: { gte: startDate, lte: endDate } },
        include: { assignee: { select: { name: true } } },
      }),
      this.prisma.warranty.findMany({
        where: { endDate: { gte: startDate, lte: endDate } },
        include: { asset: { select: { assetTag: true, name: true } } },
      }),
    ]);

    const events = [
      ...maintenances.map((m) => ({
        id: m.id,
        entityType: 'MAINTENANCE',
        title: `[Mantenimiento] ${m.title}`,
        start: m.scheduledStart,
        end: m.scheduledEnd,
        status: m.status,
        color: '#22C55E', // Green
        details: `Tipo: ${m.type}, Equipo: ${m.machine?.hostname || m.asset?.assetTag || 'N/A'}`,
      })),
      ...changes.map((c) => ({
        id: c.id,
        entityType: 'CHANGE',
        title: `[${c.changeNumber}] ${c.title}`,
        start: c.plannedStart,
        end: c.plannedEnd,
        status: c.status,
        color: '#F59E0B', // Amber
        details: `Riesgo: ${c.risk}, Impacto: ${c.impact}`,
      })),
      ...tickets.map((t) => ({
        id: t.id,
        entityType: 'TICKET',
        title: `[${t.ticketNumber}] ${t.title}`,
        start: t.dueDate || t.createdAt,
        end: t.dueDate || t.createdAt,
        status: t.status,
        color: '#3B82F6', // Blue
        details: `Prioridad: ${t.priority}, Asignado: ${t.assignee?.name || 'Sin asignar'}`,
      })),
      ...warranties.map((w) => ({
        id: w.id,
        entityType: 'WARRANTY',
        title: `[Garantía Vence] ${w.asset?.assetTag || 'Activo'} - ${w.provider}`,
        start: w.endDate,
        end: w.endDate,
        status: 'EXPIRING',
        color: '#A855F7', // Purple
        details: `Contrato: ${w.contractNumber || 'N/A'}`,
      })),
    ];

    return events;
  }
}
