import { PrismaClient, ChangeAction, TicketPriority, TicketStatus, TicketType } from '@prisma/client';
import { CreateTicketInput, UpdateTicketInput, CreateTicketCommentInput } from './ticket.schema.js';
import { logChange } from '../../utils/changelog.js';

export class TicketService {
  constructor(private prisma: PrismaClient) {}

  private async generateTicketNumber(prefix = 'TCK'): Promise<string> {
    const seq = await this.prisma.ticketSequence.upsert({
      where: { prefix },
      update: { lastNumber: { increment: 1 } },
      create: { prefix, lastNumber: 1 },
    });
    return `${prefix}-${seq.lastNumber.toString().padStart(6, '0')}`;
  }

  async listTickets(filters: {
    status?: TicketStatus;
    priority?: TicketPriority;
    type?: TicketType;
    assignedToId?: string;
    machineId?: string;
    assetId?: string;
    incidentId?: string;
    locationId?: string;
    search?: string;
  } = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.type) where.type = filters.type;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.machineId) where.machineId = filters.machineId;
    if (filters.assetId) where.assetId = filters.assetId;
    if (filters.incidentId) where.incidentId = filters.incidentId;
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.search) {
      where.OR = [
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.ticket.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        creator: { select: { id: true, username: true, name: true, email: true } },
        assignee: { select: { id: true, username: true, name: true, email: true } },
        requester: { select: { id: true, username: true, name: true, email: true } },
        asset: { select: { id: true, assetTag: true, name: true, assetType: true, status: true } },
        machine: { select: { id: true, hostname: true, primaryIp: true, status: true } },
        incident: { select: { id: true, metricType: true, severity: true, message: true, detectedAt: true } },
        location: { select: { id: true, name: true, type: true } },
        sla: true,
        _count: { select: { comments: true, tasks: true } },
      },
    });
  }

  async getTicketById(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, name: true, email: true } },
        assignee: { select: { id: true, username: true, name: true, email: true } },
        requester: { select: { id: true, username: true, name: true, email: true } },
        asset: {
          include: {
            hardware: true,
            location: true,
            warranties: { where: { endDate: { gte: new Date() } } },
          },
        },
        machine: {
          select: {
            id: true,
            hostname: true,
            primaryIp: true,
            status: true,
            group: true,
            interfaces: true,
            ports: { where: { state: 'OPEN' } },
          },
        },
        incident: true,
        location: true,
        sla: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, username: true, name: true } } },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, username: true, name: true } } },
        },
        tasks: {
          orderBy: { createdAt: 'asc' },
          include: { assignee: { select: { id: true, username: true, name: true } } },
        },
      },
    });

    if (!ticket) throw new Error('Ticket not found');
    return ticket;
  }

  async createTicket(data: CreateTicketInput, actorId?: string, actorUsername = 'admin') {
    const prefix = data.type === 'INCIDENT' ? 'INC' : 'TCK';
    const ticketNumber = await this.generateTicketNumber(prefix);

    // Calculate SLA if available
    let slaId: string | null = null;
    let responseDue: Date | null = null;
    let resolutionDue: Date | null = null;

    const matchedSla = await this.prisma.sLA.findFirst({
      where: { priority: data.priority, enabled: true },
    });

    const now = new Date();
    if (matchedSla) {
      slaId = matchedSla.id;
      responseDue = new Date(now.getTime() + matchedSla.responseTimeMinutes * 60 * 1000);
      resolutionDue = new Date(now.getTime() + matchedSla.resolutionTimeMinutes * 60 * 1000);
    } else {
      // Default SLA calculations based on priority
      const hours = data.priority === 'CRITICAL' ? 4 : data.priority === 'URGENT' ? 8 : data.priority === 'HIGH' ? 24 : 72;
      responseDue = new Date(now.getTime() + (hours > 4 ? 60 : 15) * 60 * 1000);
      resolutionDue = new Date(now.getTime() + hours * 60 * 60 * 1000);
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        status: 'OPEN',
        createdById: actorId || null,
        assignedToId: data.assignedToId || null,
        requesterId: data.requesterId || null,
        requesterEmail: data.requesterEmail || null,
        assetId: data.assetId || null,
        machineId: data.machineId || null,
        incidentId: data.incidentId || null,
        locationId: data.locationId || null,
        group: data.group || null,
        serviceName: data.serviceName || null,
        portNumber: data.portNumber || null,
        slaId,
        slaStatus: 'ON_TRACK',
        responseDue,
        resolutionDue,
        dueDate: data.dueDate ? new Date(data.dueDate) : resolutionDue,
      },
      include: {
        creator: true,
        assignee: true,
        machine: true,
        asset: true,
        location: true,
        incident: true,
      },
    });

    // Record creation in ticket history
    await this.prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        userId: actorId || null,
        userName: actorUsername,
        action: 'CREATE',
        details: `Ticket ${ticket.ticketNumber} creado con prioridad ${ticket.priority}`,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Ticket',
      entityId: ticket.id,
      action: ChangeAction.CREATE,
      details: `Created Ticket ${ticket.ticketNumber}: "${ticket.title}"`,
      user: actorUsername,
      machineId: ticket.machineId || undefined,
    });

    return ticket;
  }

  async updateTicket(id: string, data: UpdateTicketInput, actorId?: string, actorUsername = 'admin') {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) throw new Error('Ticket not found');

    const updateData: any = { ...data };
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const now = new Date();
    if (data.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
      updateData.resolvedAt = now;
    } else if (data.status === 'CLOSED' && existing.status !== 'CLOSED') {
      updateData.closedAt = now;
      if (!existing.resolvedAt) updateData.resolvedAt = now;
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        creator: true,
        assignee: true,
        machine: true,
        asset: true,
        location: true,
      },
    });

    // Track status, priority, or assignee change in TicketHistory
    const changes: string[] = [];
    if (data.status && data.status !== existing.status) {
      changes.push(`Estado cambiado de ${existing.status} a ${data.status}`);
    }
    if (data.priority && data.priority !== existing.priority) {
      changes.push(`Prioridad cambiada de ${existing.priority} a ${data.priority}`);
    }
    if (data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId) {
      changes.push(data.assignedToId ? `Asignado a usuario ID ${data.assignedToId}` : 'Asignación removida');
    }

    if (changes.length > 0) {
      await this.prisma.ticketHistory.create({
        data: {
          ticketId: id,
          userId: actorId || null,
          userName: actorUsername,
          action: 'UPDATE',
          details: changes.join(', '),
        },
      });
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Ticket',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated Ticket ${updated.ticketNumber}: ${changes.join(', ') || 'fields updated'}`,
      user: actorUsername,
      machineId: updated.machineId || undefined,
    });

    return updated;
  }

  async addComment(ticketId: string, data: CreateTicketCommentInput, userId?: string, userName = 'System') {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId,
        userId: userId || null,
        authorName: userName,
        content: data.content,
        isInternal: data.isInternal || false,
      },
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
    });

    // Record in history & update first response if not set
    const updateData: any = {};
    if (!ticket.firstRespondedAt && userId && userId !== ticket.createdById) {
      updateData.firstRespondedAt = new Date();
    }
    if (ticket.status === 'OPEN') {
      updateData.status = 'IN_PROGRESS';
    }
    if (Object.keys(updateData).length > 0) {
      await this.prisma.ticket.update({ where: { id: ticketId }, data: updateData });
    }

    await this.prisma.ticketHistory.create({
      data: {
        ticketId,
        userId: userId || null,
        userName,
        action: 'COMMENT',
        details: `Nuevo comentario: "${data.content.slice(0, 80)}${data.content.length > 80 ? '...' : ''}"`,
      },
    });

    return comment;
  }

  async deleteTicket(id: string, actorUsername = 'admin') {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) throw new Error('Ticket not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Ticket',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted Ticket ${existing.ticketNumber}: "${existing.title}"`,
      user: actorUsername,
    });

    await this.prisma.ticket.delete({ where: { id } });
    return { success: true, message: 'Ticket deleted successfully' };
  }
}
