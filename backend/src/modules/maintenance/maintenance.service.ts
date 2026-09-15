import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateMaintenanceInput, UpdateMaintenanceInput, CreateMaintenanceWindowInput, UpdateMaintenanceWindowInput } from './maintenance.schema.js';
import { logChange } from '../../utils/changelog.js';

export class MaintenanceService {
  constructor(private prisma: PrismaClient) {}

  async listMaintenances(filters: { status?: any; machineId?: string; assetId?: string } = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.machineId) where.machineId = filters.machineId;
    if (filters.assetId) where.assetId = filters.assetId;

    return this.prisma.maintenance.findMany({
      where,
      orderBy: { scheduledStart: 'asc' },
      include: {
        machine: { select: { id: true, hostname: true, primaryIp: true, status: true } },
        asset: { select: { id: true, assetTag: true, name: true, assetType: true } },
        location: { select: { id: true, name: true, type: true } },
        assignee: { select: { id: true, username: true, name: true } },
        creator: { select: { id: true, username: true, name: true } },
        runbook: { select: { id: true, name: true, category: true } },
        checklists: { orderBy: { itemOrder: 'asc' } },
        _count: { select: { tasks: true, checklists: true } },
      },
    });
  }

  async getMaintenanceById(id: string) {
    const item = await this.prisma.maintenance.findUnique({
      where: { id },
      include: {
        machine: true,
        asset: true,
        location: true,
        assignee: { select: { id: true, username: true, name: true, email: true } },
        creator: { select: { id: true, username: true, name: true } },
        window: true,
        runbook: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
        checklists: { orderBy: { itemOrder: 'asc' } },
        tasks: {
          include: { assignee: { select: { id: true, username: true, name: true } } },
        },
      },
    });
    if (!item) throw new Error('Maintenance not found');
    return item;
  }

  async createMaintenance(data: CreateMaintenanceInput, actorId?: string, actorUsername = 'admin') {
    // Check conflicts on the same machine or asset
    const conflicts = await this.prisma.maintenance.findMany({
      where: {
        status: { in: ['PLANNED', 'SCHEDULED', 'IN_PROGRESS'] },
        OR: [
          ...(data.machineId ? [{ machineId: data.machineId }] : []),
          ...(data.assetId ? [{ assetId: data.assetId }] : []),
        ],
        scheduledStart: { lte: new Date(data.scheduledEnd) },
        scheduledEnd: { gte: new Date(data.scheduledStart) },
      },
    });

    const maintenance = await this.prisma.maintenance.create({
      data: {
        title: data.title,
        description: data.description || null,
        type: data.type,
        status: data.status,
        assetId: data.assetId || null,
        machineId: data.machineId || null,
        locationId: data.locationId || null,
        assignedToId: data.assignedToId || null,
        createdById: actorId || null,
        windowId: data.windowId || null,
        runbookId: data.runbookId || null,
        scheduledStart: new Date(data.scheduledStart),
        scheduledEnd: new Date(data.scheduledEnd),
        isRecurring: data.isRecurring || false,
        recurrenceRule: data.recurrenceRule || null,
        suppressAlerts: data.suppressAlerts !== false,
        notes: data.notes || null,
      },
    });

    // If checklist items provided or inherited from runbook
    let checklistDefs: string[] = data.checklistItems || [];
    if (checklistDefs.length === 0 && data.runbookId) {
      const runbook = await this.prisma.runbook.findUnique({
        where: { id: data.runbookId },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      if (runbook?.steps) {
        checklistDefs = runbook.steps.map((s) => s.title);
      }
    }

    if (checklistDefs.length > 0) {
      await this.prisma.maintenanceChecklistItem.createMany({
        data: checklistDefs.map((desc, idx) => ({
          maintenanceId: maintenance.id,
          itemOrder: idx + 1,
          description: desc,
          isCompleted: false,
        })),
      });
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Maintenance',
      entityId: maintenance.id,
      action: ChangeAction.CREATE,
      details: `Scheduled Maintenance "${maintenance.title}" (${maintenance.type})`,
      user: actorUsername,
      machineId: maintenance.machineId || undefined,
    });

    return { ...maintenance, conflictsCount: conflicts.length };
  }

  async updateMaintenance(id: string, data: UpdateMaintenanceInput, actorUsername = 'admin') {
    const existing = await this.prisma.maintenance.findUnique({ where: { id } });
    if (!existing) throw new Error('Maintenance not found');

    const updateData: any = { ...data };
    if (data.scheduledStart) updateData.scheduledStart = new Date(data.scheduledStart);
    if (data.scheduledEnd) updateData.scheduledEnd = new Date(data.scheduledEnd);

    if (data.status === 'IN_PROGRESS' && existing.status !== 'IN_PROGRESS') {
      updateData.actualStart = new Date();
    } else if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      updateData.actualEnd = new Date();
      if (!existing.actualStart) updateData.actualStart = new Date();
    }

    const updated = await this.prisma.maintenance.update({
      where: { id },
      data: updateData,
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Maintenance',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated Maintenance "${updated.title}" (Status: ${updated.status})`,
      user: actorUsername,
    });

    return updated;
  }

  async toggleChecklistItem(itemId: string, isCompleted: boolean, actorName = 'Admin') {
    return this.prisma.maintenanceChecklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted,
        completedBy: isCompleted ? actorName : null,
        completedAt: isCompleted ? new Date() : null,
      },
    });
  }

  async deleteMaintenance(id: string, actorUsername = 'admin') {
    const existing = await this.prisma.maintenance.findUnique({ where: { id } });
    if (!existing) throw new Error('Maintenance not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Maintenance',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted Maintenance "${existing.title}"`,
      user: actorUsername,
    });

    await this.prisma.maintenance.delete({ where: { id } });
    return { success: true, message: 'Maintenance deleted successfully' };
  }

  // Maintenance Windows
  async listWindows() {
    return this.prisma.maintenanceWindow.findMany({
      orderBy: { startTime: 'desc' },
      include: {
        machine: { select: { id: true, hostname: true } },
        location: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true, name: true } },
      },
    });
  }

  async createWindow(data: CreateMaintenanceWindowInput, actorId?: string, actorUsername = 'admin') {
    const window = await this.prisma.maintenanceWindow.create({
      data: {
        name: data.name,
        description: data.description || null,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        machineId: data.machineId || null,
        locationId: data.locationId || null,
        group: data.group || null,
        enabled: data.enabled !== false,
        createdById: actorId || null,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'MaintenanceWindow',
      entityId: window.id,
      action: ChangeAction.CREATE,
      details: `Created Maintenance Window "${window.name}"`,
      user: actorUsername,
    });

    return window;
  }
}
