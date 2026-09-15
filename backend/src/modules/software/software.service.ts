import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateSoftwareInput, UpdateSoftwareInput, InstallSoftwareInput } from './software.schema.js';
import { logChange } from '../../utils/changelog.js';

export class SoftwareService {
  constructor(private prisma: PrismaClient) {}

  async listSoftware() {
    return this.prisma.software.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { assetSoftwares: true },
        },
      },
    });
  }

  async getSoftwareById(id: string) {
    const s = await this.prisma.software.findUnique({
      where: { id },
      include: {
        assetSoftwares: {
          include: {
            asset: { select: { id: true, assetTag: true, name: true } },
            machine: { select: { id: true, hostname: true, primaryIp: true, status: true } },
          },
        },
      },
    });
    if (!s) throw new Error('Software not found');
    return s;
  }

  async createSoftware(data: CreateSoftwareInput, actor = 'admin') {
    const software = await this.prisma.software.create({
      data: {
        name: data.name,
        vendor: data.vendor,
        version: data.version,
        category: data.category,
        description: data.description,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Software',
      entityId: software.id,
      action: ChangeAction.CREATE,
      details: `Added software package "${software.name}" (${software.version || 'latest'})`,
      user: actor,
    });

    return software;
  }

  async updateSoftware(id: string, data: UpdateSoftwareInput, actor = 'admin') {
    const existing = await this.prisma.software.findUnique({ where: { id } });
    if (!existing) throw new Error('Software not found');

    const updated = await this.prisma.software.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.vendor !== undefined && { vendor: data.vendor }),
        ...(data.version !== undefined && { version: data.version }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Software',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated software package "${updated.name}"`,
      user: actor,
    });

    return updated;
  }

  async deleteSoftware(id: string, actor = 'admin') {
    const existing = await this.prisma.software.findUnique({ where: { id } });
    if (!existing) throw new Error('Software not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Software',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted software package "${existing.name}"`,
      user: actor,
    });

    await this.prisma.software.delete({ where: { id } });
    return { success: true, message: 'Software deleted successfully' };
  }

  async installSoftware(softwareId: string, data: InstallSoftwareInput, actor = 'admin') {
    const software = await this.prisma.software.findUnique({ where: { id: softwareId } });
    if (!software) throw new Error('Software not found');

    const installation = await this.prisma.assetSoftware.create({
      data: {
        softwareId,
        assetId: data.assetId || null,
        machineId: data.machineId || null,
        installedVersion: data.installedVersion || software.version,
      },
      include: {
        asset: true,
        machine: true,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Software',
      entityId: softwareId,
      action: ChangeAction.UPDATE,
      details: `Installed "${software.name}" on ${installation.machine?.hostname || installation.asset?.name || 'host'}`,
      user: actor,
    });

    return installation;
  }

  async uninstallSoftware(installationId: string, actor = 'admin') {
    const existing = await this.prisma.assetSoftware.findUnique({ where: { id: installationId } });
    if (!existing) throw new Error('Installation not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Software',
      entityId: existing.softwareId,
      action: ChangeAction.UPDATE,
      details: `Uninstalled software installation ${installationId}`,
      user: actor,
    });

    await this.prisma.assetSoftware.delete({ where: { id: installationId } });
    return { success: true, message: 'Software uninstalled successfully' };
  }
}
