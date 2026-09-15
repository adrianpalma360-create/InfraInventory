import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateRunbookInput, UpdateRunbookInput } from './runbook.schema.js';
import { logChange } from '../../utils/changelog.js';

export class RunbookService {
  constructor(private prisma: PrismaClient) {}

  async listRunbooks(category?: string) {
    const where: any = {};
    if (category) where.category = category;
    return this.prisma.runbook.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        _count: { select: { steps: true, maintenances: true, changes: true } },
      },
    });
  }

  async getRunbookById(id: string) {
    const rb = await this.prisma.runbook.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        creator: { select: { id: true, username: true, name: true } },
      },
    });
    if (!rb) throw new Error('Runbook not found');
    return rb;
  }

  async createRunbook(data: CreateRunbookInput, creatorId?: string, actor = 'admin') {
    const runbook = await this.prisma.runbook.create({
      data: {
        name: data.name,
        description: data.description || null,
        category: data.category || 'General',
        version: data.version || '1.0',
        content: data.content || null,
        createdById: creatorId || null,
        steps: {
          create: (data.steps || []).map((s, idx) => ({
            stepOrder: s.stepOrder || idx + 1,
            title: s.title,
            description: s.description || null,
            isRequired: s.isRequired !== false,
          })),
        },
      },
      include: { steps: true },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Runbook',
      entityId: runbook.id,
      action: ChangeAction.CREATE,
      details: `Created Runbook "${runbook.name}"`,
      user: actor,
    });

    return runbook;
  }

  async updateRunbook(id: string, data: UpdateRunbookInput, updaterId?: string, actor = 'admin') {
    const existing = await this.prisma.runbook.findUnique({ where: { id } });
    if (!existing) throw new Error('Runbook not found');

    const updated = await this.prisma.runbook.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.version && { version: data.version }),
        ...(data.content !== undefined && { content: data.content }),
        updatedById: updaterId || null,
      },
    });

    // If steps provided, replace them
    if (data.steps) {
      await this.prisma.runbookStep.deleteMany({ where: { runbookId: id } });
      await this.prisma.runbookStep.createMany({
        data: data.steps.map((s, idx) => ({
          runbookId: id,
          stepOrder: s.stepOrder || idx + 1,
          title: s.title,
          description: s.description || null,
          isRequired: s.isRequired !== false,
        })),
      });
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Runbook',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated Runbook "${updated.name}"`,
      user: actor,
    });

    return this.getRunbookById(id);
  }

  async deleteRunbook(id: string, actor = 'admin') {
    const existing = await this.prisma.runbook.findUnique({ where: { id } });
    if (!existing) throw new Error('Runbook not found');

    await this.prisma.runbook.delete({ where: { id } });
    return { success: true, message: 'Runbook deleted successfully' };
  }
}
