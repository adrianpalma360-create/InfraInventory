import { PrismaClient, AssetType, AssetStatus, ChangeAction, HardwareComponentType, DiskHealthStatus } from '@prisma/client';
import {
  CreateAssetInput,
  UpdateAssetInput,
  ListAssetsQuery,
  CreateHardwareComponentInput,
  UpdateHardwareComponentInput,
} from './asset.schema.js';
import { logChange } from '../../utils/changelog.js';

export class AssetService {
  constructor(private prisma: PrismaClient) {}

  // ----------------------------------------------------
  // ASSET CRUD
  // ----------------------------------------------------
  async listAssets(query: ListAssetsQuery) {
    const {
      search,
      assetType,
      status,
      locationId,
      supplierId,
      machineId,
      group,
      hasMachine,
      page = 1,
      limit = 50,
    } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { assetTag: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { machine: { hostname: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (assetType) where.assetType = assetType;
    if (status) where.status = status;
    if (locationId) where.locationId = locationId;
    if (supplierId) where.supplierId = supplierId;
    if (machineId) where.machineId = machineId;
    if (group) where.machine = { ...where.machine, group };
    if (hasMachine !== undefined) {
      where.machineId = hasMachine ? { not: null } : null;
    }

    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { assetTag: 'asc' },
        include: {
          location: true,
          supplier: true,
          machine: {
            select: {
              id: true,
              hostname: true,
              type: true,
              status: true,
              primaryIp: true,
              group: true,
              os: true,
            },
          },
          _count: {
            select: {
              hardware: true,
              warranties: true,
              licenseAssignments: true,
              documents: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAssetById(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        location: true,
        supplier: true,
        machine: {
          include: {
            interfaces: true,
            ports: { include: { service: true } },
            metricSamples: { take: 1, orderBy: { timestamp: 'desc' } },
            metricAnomalies: { where: { isResolved: false } },
          },
        },
        hardware: {
          orderBy: { createdAt: 'asc' },
        },
        warranties: {
          orderBy: { endDate: 'desc' },
          include: { supplier: true },
        },
        purchaseItems: {
          include: { purchase: { include: { supplier: true } } },
        },
        licenseAssignments: {
          include: { license: true },
        },
        assetSoftwares: {
          include: { software: true },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!asset) throw new Error('Asset not found');
    return asset;
  }

  async createAsset(data: CreateAssetInput, actor = 'admin') {
    // Check if assetTag unique
    const existingTag = await this.prisma.asset.findUnique({
      where: { assetTag: data.assetTag },
    });
    if (existingTag) {
      throw new Error(`Asset Tag "${data.assetTag}" already exists.`);
    }

    const asset = await this.prisma.asset.create({
      data: {
        assetTag: data.assetTag,
        name: data.name,
        description: data.description,
        assetType: data.assetType,
        status: data.status,
        serialNumber: data.serialNumber,
        manufacturer: data.manufacturer,
        model: data.model,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchasePrice: data.purchasePrice,
        currency: data.currency || 'EUR',
        invoiceNumber: data.invoiceNumber,
        warrantyStart: data.warrantyStart ? new Date(data.warrantyStart) : null,
        warrantyEnd: data.warrantyEnd ? new Date(data.warrantyEnd) : null,
        rackUnit: data.rackUnit,
        supplierId: data.supplierId || null,
        locationId: data.locationId || null,
        machineId: data.machineId || null,
        notes: data.notes,
        metadata: data.metadata || {},
      },
      include: {
        location: true,
        supplier: true,
        machine: true,
      },
    });

    // Record initial history entry
    await this.prisma.assetHistory.create({
      data: {
        assetId: asset.id,
        action: 'CREATE',
        description: `Asset ${asset.assetTag} created with status ${asset.status}`,
        newValue: asset.status,
        user: actor,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Asset',
      entityId: asset.id,
      action: ChangeAction.CREATE,
      details: `Created Asset "${asset.name}" (${asset.assetTag})`,
      user: actor,
      machineId: asset.machineId || undefined,
    });

    return asset;
  }

  async updateAsset(id: string, data: UpdateAssetInput, actor = 'admin') {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new Error('Asset not found');

    if (data.assetTag && data.assetTag !== existing.assetTag) {
      const tagConflict = await this.prisma.asset.findUnique({ where: { assetTag: data.assetTag } });
      if (tagConflict) throw new Error(`Asset Tag "${data.assetTag}" already in use.`);
    }

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        ...(data.assetTag !== undefined && { assetTag: data.assetTag }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.assetType !== undefined && { assetType: data.assetType }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
        ...(data.manufacturer !== undefined && { manufacturer: data.manufacturer }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.purchaseDate !== undefined && {
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        }),
        ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber }),
        ...(data.warrantyStart !== undefined && {
          warrantyStart: data.warrantyStart ? new Date(data.warrantyStart) : null,
        }),
        ...(data.warrantyEnd !== undefined && {
          warrantyEnd: data.warrantyEnd ? new Date(data.warrantyEnd) : null,
        }),
        ...(data.rackUnit !== undefined && { rackUnit: data.rackUnit }),
        ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
        ...(data.locationId !== undefined && { locationId: data.locationId }),
        ...(data.machineId !== undefined && { machineId: data.machineId }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.metadata !== undefined && { metadata: data.metadata || {} }),
      },
      include: {
        location: true,
        supplier: true,
        machine: true,
      },
    });

    // Check if status changed -> log history
    if (data.status && data.status !== existing.status) {
      await this.prisma.assetHistory.create({
        data: {
          assetId: id,
          action: 'STATUS_CHANGE',
          description: `Status changed from ${existing.status} to ${data.status}`,
          previousValue: existing.status,
          newValue: data.status,
          user: actor,
        },
      });
    }

    // Check if location changed -> log history
    if (data.locationId !== undefined && data.locationId !== existing.locationId) {
      await this.prisma.assetHistory.create({
        data: {
          assetId: id,
          action: 'LOCATION_CHANGE',
          description: `Location changed`,
          previousValue: existing.locationId || 'None',
          newValue: data.locationId || 'None',
          user: actor,
        },
      });
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Asset',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated Asset "${updated.name}" (${updated.assetTag})`,
      user: actor,
      machineId: updated.machineId || undefined,
    });

    return updated;
  }

  // Non-destructive deletion: Machine remains completely untouched
  async deleteAsset(id: string, actor = 'admin') {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new Error('Asset not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Asset',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted Asset "${existing.name}" (${existing.assetTag})`,
      user: actor,
      machineId: existing.machineId || undefined,
    });

    await this.prisma.asset.delete({ where: { id } });
    return { success: true, message: 'Asset deleted successfully. Physical inventory remains unaffected.' };
  }

  // ----------------------------------------------------
  // HARDWARE COMPONENTS
  // ----------------------------------------------------
  async addHardwareComponent(assetId: string, data: CreateHardwareComponentInput, actor = 'admin') {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');

    const component = await this.prisma.hardwareComponent.create({
      data: {
        assetId,
        type: data.type,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        capacity: data.capacity,
        unit: data.unit,
        quantity: data.quantity || 1,
        diskType: data.diskType,
        diskHealth: data.diskHealth || 'HEALTHY',
        description: data.description,
      },
    });

    await this.prisma.assetHistory.create({
      data: {
        assetId,
        action: 'HARDWARE_ADDED',
        description: `Added hardware component: ${component.type} ${component.manufacturer || ''} ${component.model || ''}`,
        newValue: component.type,
        user: actor,
      },
    });

    return component;
  }

  async updateHardwareComponent(id: string, data: UpdateHardwareComponentInput) {
    const existing = await this.prisma.hardwareComponent.findUnique({ where: { id } });
    if (!existing) throw new Error('Hardware component not found');

    return this.prisma.hardwareComponent.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.manufacturer !== undefined && { manufacturer: data.manufacturer }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.diskType !== undefined && { diskType: data.diskType }),
        ...(data.diskHealth !== undefined && { diskHealth: data.diskHealth }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  async deleteHardwareComponent(id: string, actor = 'admin') {
    const existing = await this.prisma.hardwareComponent.findUnique({ where: { id } });
    if (!existing) throw new Error('Hardware component not found');

    await this.prisma.assetHistory.create({
      data: {
        assetId: existing.assetId,
        action: 'HARDWARE_REMOVED',
        description: `Removed hardware component: ${existing.type} ${existing.model || ''}`,
        previousValue: existing.type,
        user: actor,
      },
    });

    await this.prisma.hardwareComponent.delete({ where: { id } });
    return { success: true, message: 'Hardware component removed' };
  }

  // ----------------------------------------------------
  // ASSET STATS & DASHBOARD
  // ----------------------------------------------------
  async getAssetStats() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalAssets,
      activeAssets,
      maintenanceAssets,
      retiredAssets,
      totalPurchaseCost,
      assetsByTypeRaw,
      assetsByLocationRaw,
      warrantiesExpiringCount,
      warrantiesExpiredCount,
      licensesExpiringCount,
      licensesExpiredCount,
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'ACTIVE' } }),
      this.prisma.asset.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.asset.count({ where: { status: 'RETIRED' } }),
      this.prisma.asset.aggregate({
        _sum: { purchasePrice: true },
      }),
      this.prisma.asset.groupBy({
        by: ['assetType'],
        _count: { id: true },
        _sum: { purchasePrice: true },
      }),
      this.prisma.asset.groupBy({
        by: ['locationId'],
        _count: { id: true },
        _sum: { purchasePrice: true },
      }),
      this.prisma.warranty.count({
        where: {
          endDate: { gte: now, lte: in30Days },
        },
      }),
      this.prisma.warranty.count({
        where: {
          endDate: { lt: now },
        },
      }),
      this.prisma.license.count({
        where: {
          expirationDate: { gte: now, lte: in30Days },
        },
      }),
      this.prisma.license.count({
        where: {
          expirationDate: { lt: now },
        },
      }),
    ]);

    // Resolve location names
    const locationIds = assetsByLocationRaw
      .map((r) => r.locationId)
      .filter((id): id is string => id !== null);

    const locations = await this.prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true },
    });

    const locationMap = new Map(locations.map((l) => [l.id, l.name]));

    const costByLocation = assetsByLocationRaw.map((r) => ({
      locationId: r.locationId,
      locationName: r.locationId ? locationMap.get(r.locationId) || 'Desconocida' : 'Sin Ubicación',
      count: r._count.id,
      totalCost: r._sum.purchasePrice || 0,
    }));

    const costByType = assetsByTypeRaw.map((r) => ({
      type: r.assetType,
      count: r._count.id,
      totalCost: r._sum.purchasePrice || 0,
    }));

    return {
      totalAssets,
      activeAssets,
      maintenanceAssets,
      retiredAssets,
      totalCost: totalPurchaseCost._sum.purchasePrice || 0,
      warrantiesExpiringCount,
      warrantiesExpiredCount,
      licensesExpiringCount,
      licensesExpiredCount,
      costByLocation,
      costByType,
    };
  }

  // ----------------------------------------------------
  // RACK VIEW (U1..U42)
  // ----------------------------------------------------
  async getRackView(locationId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location) throw new Error('Location not found');

    const assets = await this.prisma.asset.findMany({
      where: { locationId, rackUnit: { not: null } },
      orderBy: { rackUnit: 'desc' },
      include: {
        machine: {
          select: {
            id: true,
            hostname: true,
            status: true,
            primaryIp: true,
            metricSamples: { take: 1, orderBy: { timestamp: 'desc' } },
            metricAnomalies: { where: { isResolved: false } },
          },
        },
        hardware: true,
      },
    });

    // Populate rack grid from U42 down to U1
    const totalUnits = 42;
    const units = [];

    for (let u = totalUnits; u >= 1; u--) {
      const match = assets.find((a) => a.rackUnit === u);
      units.push({
        unit: u,
        occupied: !!match,
        asset: match || null,
      });
    }

    return {
      rackLocation: location,
      totalUnits,
      units,
    };
  }

  // ----------------------------------------------------
  // CSV IMPORT & EXPORT
  // ----------------------------------------------------
  async importAssetsCsv(csvContent: string, actor = 'admin') {
    const lines = csvContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error('CSV file is empty or missing headers');
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    let importedCount = 0;
    let errorsCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const assetTag = row.assetTag || row['Asset Tag'] || row.tag;
      const name = row.name || row.Name || row.hostname || assetTag;

      if (!assetTag || !name) {
        errorsCount++;
        errors.push(`Row ${i}: Missing assetTag or name`);
        continue;
      }

      // Check if exists
      const existing = await this.prisma.asset.findUnique({ where: { assetTag } });
      if (existing) {
        errorsCount++;
        errors.push(`Row ${i}: Asset Tag "${assetTag}" already exists (skipped)`);
        continue;
      }

      try {
        await this.createAsset(
          {
            assetTag,
            name,
            assetType: (row.type?.toUpperCase() as AssetType) || 'SERVER',
            status: (row.status?.toUpperCase() as AssetStatus) || 'ACTIVE',
            serialNumber: row.serialNumber || row.serial || null,
            manufacturer: row.manufacturer || null,
            model: row.model || null,
            purchasePrice: row.purchasePrice ? parseFloat(row.purchasePrice) : null,
            invoiceNumber: row.invoiceNumber || null,
          },
          actor
        );
        importedCount++;
      } catch (err: any) {
        errorsCount++;
        errors.push(`Row ${i}: ${err.message}`);
      }
    }

    return {
      success: true,
      importedCount,
      errorsCount,
      errors,
    };
  }

  async exportAssetsCsv() {
    const assets = await this.prisma.asset.findMany({
      orderBy: { assetTag: 'asc' },
      include: {
        location: true,
        supplier: true,
        machine: true,
        hardware: true,
      },
    });

    const headers = [
      'Asset Tag',
      'Name',
      'Type',
      'Status',
      'Serial Number',
      'Manufacturer',
      'Model',
      'Purchase Price',
      'Currency',
      'Purchase Date',
      'Location',
      'Linked Machine',
      'Supplier',
      'Invoice Number',
      'Created At',
    ];

    const rows = assets.map((a) => [
      `"${a.assetTag}"`,
      `"${a.name}"`,
      `"${a.assetType}"`,
      `"${a.status}"`,
      `"${a.serialNumber || ''}"`,
      `"${a.manufacturer || ''}"`,
      `"${a.model || ''}"`,
      `"${a.purchasePrice || 0}"`,
      `"${a.currency}"`,
      `"${a.purchaseDate ? a.purchaseDate.toISOString().split('T')[0] : ''}"`,
      `"${a.location?.name || ''}"`,
      `"${a.machine?.hostname || ''}"`,
      `"${a.supplier?.name || ''}"`,
      `"${a.invoiceNumber || ''}"`,
      `"${a.createdAt.toISOString()}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
