import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreatePurchaseInput, UpdatePurchaseInput } from './purchase.schema.js';
import { logChange } from '../../utils/changelog.js';

export class PurchaseService {
  constructor(private prisma: PrismaClient) {}

  async listPurchases() {
    return this.prisma.purchase.findMany({
      orderBy: { purchaseDate: 'desc' },
      include: {
        supplier: true,
        items: {
          include: {
            asset: {
              select: { id: true, assetTag: true, name: true },
            },
          },
        },
      },
    });
  }

  async getPurchaseById(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            asset: true,
          },
        },
      },
    });
    if (!purchase) throw new Error('Purchase not found');
    return purchase;
  }

  async createPurchase(data: CreatePurchaseInput, actor = 'admin') {
    let calculatedTotal = 0;
    const itemsData = (data.items || []).map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      calculatedTotal += lineTotal;
      return {
        assetId: item.assetId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: lineTotal,
      };
    });

    const purchase = await this.prisma.purchase.create({
      data: {
        supplierId: data.supplierId || null,
        invoiceNumber: data.invoiceNumber,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
        currency: data.currency || 'EUR',
        total: calculatedTotal,
        notes: data.notes,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Purchase',
      entityId: purchase.id,
      action: ChangeAction.CREATE,
      details: `Created Purchase order "${purchase.invoiceNumber}" (Total: ${purchase.total} ${purchase.currency})`,
      user: actor,
    });

    return purchase;
  }

  async updatePurchase(id: string, data: UpdatePurchaseInput, actor = 'admin') {
    const existing = await this.prisma.purchase.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new Error('Purchase not found');

    const updated = await this.prisma.purchase.update({
      where: { id },
      data: {
        ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
        ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber }),
        ...(data.purchaseDate !== undefined && {
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Purchase',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated Purchase order "${updated.invoiceNumber}"`,
      user: actor,
    });

    return updated;
  }

  async deletePurchase(id: string, actor = 'admin') {
    const existing = await this.prisma.purchase.findUnique({ where: { id } });
    if (!existing) throw new Error('Purchase not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Purchase',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted Purchase order "${existing.invoiceNumber}"`,
      user: actor,
    });

    await this.prisma.purchase.delete({ where: { id } });
    return { success: true, message: 'Purchase deleted successfully' };
  }
}
