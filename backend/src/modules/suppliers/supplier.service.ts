import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateSupplierInput, UpdateSupplierInput } from './supplier.schema.js';
import { logChange } from '../../utils/changelog.js';

export class SupplierService {
  constructor(private prisma: PrismaClient) {}

  async listSuppliers() {
    return this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            assets: true,
            purchases: true,
            warranties: true,
          },
        },
      },
    });
  }

  async getSupplierById(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        assets: {
          select: { id: true, assetTag: true, name: true, status: true, purchasePrice: true },
        },
        purchases: {
          orderBy: { purchaseDate: 'desc' },
        },
        warranties: {
          orderBy: { endDate: 'desc' },
        },
      },
    });
    if (!supplier) throw new Error('Supplier not found');
    return supplier;
  }

  async createSupplier(data: CreateSupplierInput, actor = 'admin') {
    const existing = await this.prisma.supplier.findUnique({ where: { name: data.name } });
    if (existing) throw new Error(`Supplier "${data.name}" already exists`);

    const supplier = await this.prisma.supplier.create({
      data: {
        name: data.name,
        taxId: data.taxId,
        contact: data.contact,
        email: data.email || null,
        phone: data.phone,
        website: data.website || null,
        address: data.address,
        notes: data.notes,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Supplier',
      entityId: supplier.id,
      action: ChangeAction.CREATE,
      details: `Created Supplier "${supplier.name}"`,
      user: actor,
    });

    return supplier;
  }

  async updateSupplier(id: string, data: UpdateSupplierInput, actor = 'admin') {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new Error('Supplier not found');

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.taxId !== undefined && { taxId: data.taxId }),
        ...(data.contact !== undefined && { contact: data.contact }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Supplier',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated Supplier "${updated.name}"`,
      user: actor,
    });

    return updated;
  }

  async deleteSupplier(id: string, actor = 'admin') {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new Error('Supplier not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Supplier',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted Supplier "${existing.name}"`,
      user: actor,
    });

    await this.prisma.supplier.delete({ where: { id } });
    return { success: true, message: 'Supplier deleted successfully' };
  }
}
