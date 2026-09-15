import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateWarrantyInput, UpdateWarrantyInput } from './warranty.schema.js';
import { logChange } from '../../utils/changelog.js';

export class WarrantyService {
  constructor(private prisma: PrismaClient) {}

  async listWarranties(assetId?: string) {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where: any = {};
    if (assetId) where.assetId = assetId;

    const warranties = await this.prisma.warranty.findMany({
      where,
      orderBy: { endDate: 'asc' },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            assetType: true,
            status: true,
            machine: {
              select: { id: true, hostname: true, primaryIp: true },
            },
          },
        },
        supplier: true,
      },
    });

    return warranties.map((w) => {
      const isExpired = new Date(w.endDate) < now;
      const isExpiring = !isExpired && new Date(w.endDate) <= in30Days;
      let status = 'ACTIVE';
      if (isExpired) status = 'EXPIRED';
      else if (isExpiring) status = 'EXPIRING';

      return {
        ...w,
        status,
        daysRemaining: Math.ceil((new Date(w.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });
  }

  async getWarrantyById(id: string) {
    const w = await this.prisma.warranty.findUnique({
      where: { id },
      include: {
        asset: true,
        supplier: true,
      },
    });
    if (!w) throw new Error('Warranty not found');

    const now = new Date();
    const isExpired = new Date(w.endDate) < now;
    const isExpiring = !isExpired && new Date(w.endDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let status = 'ACTIVE';
    if (isExpired) status = 'EXPIRED';
    else if (isExpiring) status = 'EXPIRING';

    return {
      ...w,
      status,
      daysRemaining: Math.ceil((new Date(w.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    };
  }

  async createWarranty(data: CreateWarrantyInput, actor = 'admin') {
    const asset = await this.prisma.asset.findUnique({ where: { id: data.assetId } });
    if (!asset) throw new Error('Asset not found');

    const warranty = await this.prisma.warranty.create({
      data: {
        assetId: data.assetId,
        supplierId: data.supplierId || null,
        provider: data.provider,
        contractNumber: data.contractNumber,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        type: data.type,
        notes: data.notes,
      },
      include: {
        asset: true,
        supplier: true,
      },
    });

    // Also update asset's warranty dates if needed
    await this.prisma.asset.update({
      where: { id: data.assetId },
      data: {
        warrantyStart: new Date(data.startDate),
        warrantyEnd: new Date(data.endDate),
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Warranty',
      entityId: warranty.id,
      action: ChangeAction.CREATE,
      details: `Created warranty for "${asset.name}" (${warranty.provider}, ends ${warranty.endDate.toISOString().split('T')[0]})`,
      user: actor,
    });

    return warranty;
  }

  async updateWarranty(id: string, data: UpdateWarrantyInput, actor = 'admin') {
    const existing = await this.prisma.warranty.findUnique({ where: { id } });
    if (!existing) throw new Error('Warranty not found');

    const updated = await this.prisma.warranty.update({
      where: { id },
      data: {
        ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
        ...(data.provider !== undefined && { provider: data.provider }),
        ...(data.contractNumber !== undefined && { contractNumber: data.contractNumber }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        asset: true,
        supplier: true,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Warranty',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated warranty "${updated.provider}"`,
      user: actor,
    });

    return updated;
  }

  async deleteWarranty(id: string, actor = 'admin') {
    const existing = await this.prisma.warranty.findUnique({ where: { id } });
    if (!existing) throw new Error('Warranty not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Warranty',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted warranty ${id}`,
      user: actor,
    });

    await this.prisma.warranty.delete({ where: { id } });
    return { success: true, message: 'Warranty deleted successfully' };
  }
}
