import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateServiceInput, UpdateServiceInput } from './services.schema.js';
import { logChange } from '../../utils/changelog.js';

export class ServicesService {
  constructor(private prisma: PrismaClient) {}

  async list() {
    return this.prisma.service.findMany({
      include: {
        ports: {
          include: { machine: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: CreateServiceInput) {
    const existing = await this.prisma.service.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new Error(`Service "${data.name}" already exists`);
    }

    const service = await this.prisma.service.create({ data });

    await logChange({
      prisma: this.prisma,
      entityType: 'Service',
      entityId: service.id,
      action: ChangeAction.CREATE,
      details: `Registered new service catalog entry "${service.name}"`,
    });

    return service;
  }

  async update(id: string, data: UpdateServiceInput) {
    const service = await this.prisma.service.update({
      where: { id },
      data,
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Service',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated service "${service.name}"`,
    });

    return service;
  }

  async delete(id: string) {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing) throw new Error('Service not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Service',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted service catalog entry "${existing.name}"`,
    });

    await this.prisma.service.delete({ where: { id } });
    return { success: true, message: 'Service deleted successfully' };
  }
}
