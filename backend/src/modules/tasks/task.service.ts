import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateTaskInput, UpdateTaskInput } from './task.schema.js';
import { logChange } from '../../utils/changelog.js';

export class TaskService {
  constructor(private prisma: PrismaClient) {}

  async listTasks(filters: { status?: any; ticketId?: string; maintenanceId?: string; assignedToId?: string } = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.ticketId) where.ticketId = filters.ticketId;
    if (filters.maintenanceId) where.maintenanceId = filters.maintenanceId;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;

    return this.prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        assignee: { select: { id: true, username: true, name: true } },
        ticket: { select: { id: true, ticketNumber: true, title: true } },
        maintenance: { select: { id: true, title: true } },
      },
    });
  }

  async createTask(data: CreateTaskInput, actor = 'admin') {
    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        assignedToId: data.assignedToId || null,
        ticketId: data.ticketId || null,
        maintenanceId: data.maintenanceId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        assignee: true,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Task',
      entityId: task.id,
      action: ChangeAction.CREATE,
      details: `Created Task "${task.title}"`,
      user: actor,
    });

    return task;
  }

  async updateTask(id: string, data: UpdateTaskInput, actor = 'admin') {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new Error('Task not found');

    const updateData: any = { ...data };
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.status === 'DONE' && existing.status !== 'DONE') updateData.completedAt = new Date();

    const updated = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: { assignee: true },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Task',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated Task "${updated.title}" (Status: ${updated.status})`,
      user: actor,
    });

    return updated;
  }

  async deleteTask(id: string, actor = 'admin') {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new Error('Task not found');

    await this.prisma.task.delete({ where: { id } });
    return { success: true, message: 'Task deleted successfully' };
  }
}
