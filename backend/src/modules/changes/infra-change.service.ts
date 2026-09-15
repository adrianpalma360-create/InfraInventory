import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateInfraChangeInput, UpdateInfraChangeInput, ChangeApprovalDecisionInput } from './infra-change.schema.js';
import { logChange } from '../../utils/changelog.js';

export class InfraChangeService {
  constructor(private prisma: PrismaClient) {}

  private async generateChangeNumber(): Promise<string> {
    const seq = await this.prisma.ticketSequence.upsert({
      where: { prefix: 'CHG' },
      update: { lastNumber: { increment: 1 } },
      create: { prefix: 'CHG', lastNumber: 1 },
    });
    return `CHG-${seq.lastNumber.toString().padStart(6, '0')}`;
  }

  async listChanges(filters: { status?: any; risk?: any; impact?: any } = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.risk) where.risk = filters.risk;
    if (filters.impact) where.impact = filters.impact;

    return this.prisma.change.findMany({
      where,
      orderBy: { plannedStart: 'desc' },
      include: {
        requester: { select: { id: true, username: true, name: true } },
        approver: { select: { id: true, username: true, name: true } },
        executor: { select: { id: true, username: true, name: true } },
        machine: { select: { id: true, hostname: true, primaryIp: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
        location: { select: { id: true, name: true } },
        runbook: { select: { id: true, name: true } },
        approvals: { include: { user: { select: { id: true, username: true, name: true } } } },
      },
    });
  }

  async getChangeById(id: string) {
    const change = await this.prisma.change.findUnique({
      where: { id },
      include: {
        requester: true,
        approver: true,
        executor: true,
        machine: {
          include: {
            interfaces: true,
            ports: true,
            location: true,
          },
        },
        asset: true,
        location: true,
        runbook: { include: { steps: { orderBy: { stepOrder: 'asc' } } } },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, username: true, name: true } } },
        },
      },
    });
    if (!change) throw new Error('Change not found');
    return change;
  }

  async createChange(data: CreateInfraChangeInput, requesterId?: string, actorUsername = 'admin') {
    const changeNumber = await this.generateChangeNumber();

    const change = await this.prisma.change.create({
      data: {
        changeNumber,
        title: data.title,
        description: data.description,
        reason: data.reason || null,
        risk: data.risk,
        impact: data.impact,
        status: data.status || 'DRAFT',
        plannedStart: new Date(data.plannedStart),
        plannedEnd: new Date(data.plannedEnd),
        requesterId: requesterId || data.requesterId || null,
        approverId: data.approverId || null,
        executorId: data.executorId || null,
        machineId: data.machineId || null,
        assetId: data.assetId || null,
        locationId: data.locationId || null,
        rollbackPlan: data.rollbackPlan || null,
        validationPlan: data.validationPlan || null,
        affectedItems: data.affectedItems || null,
        runbookId: data.runbookId || null,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Change',
      entityId: change.id,
      action: ChangeAction.CREATE,
      details: `Created Change Request ${change.changeNumber}: "${change.title}" (${change.risk} Risk)`,
      user: actorUsername,
      machineId: change.machineId || undefined,
    });

    return change;
  }

  async updateChange(id: string, data: UpdateInfraChangeInput, actorUsername = 'admin') {
    const existing = await this.prisma.change.findUnique({ where: { id } });
    if (!existing) throw new Error('Change not found');

    const updateData: any = { ...data };
    if (data.plannedStart) updateData.plannedStart = new Date(data.plannedStart);
    if (data.plannedEnd) updateData.plannedEnd = new Date(data.plannedEnd);

    if (data.status === 'IN_PROGRESS' && existing.status !== 'IN_PROGRESS') {
      updateData.actualStart = new Date();
    } else if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      updateData.actualEnd = new Date();
    }

    const updated = await this.prisma.change.update({
      where: { id },
      data: updateData,
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Change',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated Change ${updated.changeNumber}: Status ${updated.status}`,
      user: actorUsername,
    });

    return updated;
  }

  async decideApproval(id: string, input: ChangeApprovalDecisionInput, userId?: string, userName = 'Admin') {
    const change = await this.prisma.change.findUnique({ where: { id } });
    if (!change) throw new Error('Change not found');

    const approval = await this.prisma.changeApproval.create({
      data: {
        changeId: id,
        userId: userId || null,
        userName,
        decision: input.decision,
        comments: input.comments || null,
        decidedAt: new Date(),
      },
    });

    const newStatus = input.decision === 'APPROVED' ? 'APPROVED' : 'DRAFT';
    await this.prisma.change.update({
      where: { id },
      data: {
        status: newStatus,
        approverId: userId || null,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'ChangeApproval',
      entityId: approval.id,
      action: ChangeAction.CREATE,
      details: `Decision for ${change.changeNumber}: ${input.decision} by ${userName}`,
      user: userName,
    });

    return { approval, newStatus };
  }
}
