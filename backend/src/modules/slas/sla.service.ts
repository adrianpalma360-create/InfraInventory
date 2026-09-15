import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateSlaInput, UpdateSlaInput } from './sla.schema.js';
import { logChange } from '../../utils/changelog.js';

export class SlaService {
  constructor(private prisma: PrismaClient) {}

  async listSlas() {
    return this.prisma.sLA.findMany({
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { tickets: true } },
      },
    });
  }

  async getSlaById(id: string) {
    const sla = await this.prisma.sLA.findUnique({
      where: { id },
      include: {
        tickets: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: { id: true, ticketNumber: true, title: true, priority: true, status: true, slaStatus: true },
        },
      },
    });
    if (!sla) throw new Error('SLA definition not found');
    return sla;
  }

  async createSla(data: CreateSlaInput, actor = 'admin') {
    const sla = await this.prisma.sLA.create({ data });
    await logChange({
      prisma: this.prisma,
      entityType: 'SLA',
      entityId: sla.id,
      action: ChangeAction.CREATE,
      details: `Created SLA "${sla.name}" (Priority: ${sla.priority}, Response: ${sla.responseTimeMinutes}m, Resolution: ${sla.resolutionTimeMinutes}m)`,
      user: actor,
    });
    return sla;
  }

  async updateSla(id: string, data: UpdateSlaInput, actor = 'admin') {
    const existing = await this.prisma.sLA.findUnique({ where: { id } });
    if (!existing) throw new Error('SLA not found');

    const updated = await this.prisma.sLA.update({ where: { id }, data });
    await logChange({
      prisma: this.prisma,
      entityType: 'SLA',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated SLA "${updated.name}"`,
      user: actor,
    });
    return updated;
  }

  async deleteSla(id: string, actor = 'admin') {
    const existing = await this.prisma.sLA.findUnique({ where: { id } });
    if (!existing) throw new Error('SLA not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'SLA',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted SLA "${existing.name}"`,
      user: actor,
    });
    await this.prisma.sLA.delete({ where: { id } });
    return { success: true, message: 'SLA deleted successfully' };
  }
}
