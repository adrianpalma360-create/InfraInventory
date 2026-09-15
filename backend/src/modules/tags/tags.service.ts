import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateTagInput, UpdateTagInput } from './tags.schema.js';
import { logChange } from '../../utils/changelog.js';

export class TagsService {
  constructor(private prisma: PrismaClient) {}

  async list() {
    return this.prisma.tag.findMany({
      include: {
        _count: {
          select: { machines: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string) {
    return this.prisma.tag.findUnique({
      where: { id },
      include: {
        machines: {
          include: {
            machine: {
              include: {
                location: true,
                vlan: true,
              },
            },
          },
        },
      },
    });
  }

  async create(data: CreateTagInput, actor = 'admin') {
    const existing = await this.prisma.tag.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new Error(`Tag with name "${data.name}" already exists`);
    }

    const tag = await this.prisma.tag.create({
      data: {
        name: data.name,
        color: data.color || '#06B6D4',
        description: data.description,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Tag',
      entityId: tag.id,
      action: ChangeAction.CREATE,
      details: `Created tag "${tag.name}" (${tag.color})`,
      user: actor,
    });

    return tag;
  }

  async update(id: string, data: UpdateTagInput, actor = 'admin') {
    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing) throw new Error('Tag not found');

    if (data.name && data.name !== existing.name) {
      const nameConflict = await this.prisma.tag.findUnique({ where: { name: data.name } });
      if (nameConflict) throw new Error(`Tag name "${data.name}" is already in use`);
    }

    const updated = await this.prisma.tag.update({
      where: { id },
      data,
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Tag',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated tag "${updated.name}"`,
      user: actor,
    });

    return updated;
  }

  async delete(id: string, actor = 'admin') {
    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing) throw new Error('Tag not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Tag',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted tag "${existing.name}"`,
      user: actor,
    });

    await this.prisma.tag.delete({ where: { id } });
    return { success: true, message: 'Tag deleted successfully' };
  }

  async assignTagsToMachine(machineId: string, tagIds: string[], actor = 'admin') {
    const machine = await this.prisma.machine.findUnique({ where: { id: machineId } });
    if (!machine) throw new Error('Machine not found');

    // Remove existing relations
    await this.prisma.machineTag.deleteMany({ where: { machineId } });

    // Insert new relations
    if (tagIds.length > 0) {
      await this.prisma.machineTag.createMany({
        data: tagIds.map((tagId) => ({ machineId, tagId })),
      });
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Machine',
      entityId: machineId,
      action: ChangeAction.UPDATE,
      details: `Updated machine tags (assigned ${tagIds.length} tags)`,
      user: actor,
      machineId,
    });

    return this.prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        tags: { include: { tag: true } },
      },
    });
  }
}
