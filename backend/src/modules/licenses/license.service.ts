import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreateLicenseInput, UpdateLicenseInput, AssignLicenseInput } from './license.schema.js';
import { encryptLicenseKey, decryptLicenseKey, maskLicenseKey } from '../../utils/encryption.js';
import { logChange } from '../../utils/changelog.js';

export class LicenseService {
  constructor(private prisma: PrismaClient) {}

  async listLicenses() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const licenses = await this.prisma.license.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    return licenses.map((l) => {
      const isExpired = l.expirationDate && new Date(l.expirationDate) < now;
      const isExpiring = l.expirationDate && !isExpired && new Date(l.expirationDate) <= in30Days;
      const isOverallocated = l._count.assignments > l.seats;

      let status = 'ACTIVE';
      if (isExpired) status = 'EXPIRED';
      else if (isExpiring) status = 'EXPIRING';
      else if (isOverallocated) status = 'OVERALLOCATED';

      return {
        id: l.id,
        name: l.name,
        vendor: l.vendor,
        product: l.product,
        version: l.version,
        licenseType: l.licenseType,
        licenseKeyMasked: maskLicenseKey(l.licenseKeyEncrypted || ''),
        seats: l.seats,
        usedSeats: l._count.assignments,
        availableSeats: Math.max(0, l.seats - l._count.assignments),
        isOverallocated,
        purchaseDate: l.purchaseDate,
        expirationDate: l.expirationDate,
        renewalCost: l.renewalCost,
        currency: l.currency,
        status,
        notes: l.notes,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      };
    });
  }

  async getLicenseById(id: string) {
    const l = await this.prisma.license.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            asset: { select: { id: true, assetTag: true, name: true } },
            machine: { select: { id: true, hostname: true, primaryIp: true, status: true } },
            user: { select: { id: true, username: true, name: true } },
          },
        },
      },
    });
    if (!l) throw new Error('License not found');

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const isExpired = l.expirationDate && new Date(l.expirationDate) < now;
    const isExpiring = l.expirationDate && !isExpired && new Date(l.expirationDate) <= in30Days;
    const isOverallocated = l.assignments.length > l.seats;

    let status = 'ACTIVE';
    if (isExpired) status = 'EXPIRED';
    else if (isExpiring) status = 'EXPIRING';
    else if (isOverallocated) status = 'OVERALLOCATED';

    return {
      ...l,
      licenseKeyEncrypted: undefined, // Never expose raw encrypted or plaintext in standard payload
      licenseKeyMasked: maskLicenseKey(l.licenseKeyEncrypted || ''),
      usedSeats: l.assignments.length,
      availableSeats: Math.max(0, l.seats - l.assignments.length),
      status,
    };
  }

  async createLicense(data: CreateLicenseInput, actor = 'admin') {
    const encryptedKey = data.licenseKey ? encryptLicenseKey(data.licenseKey) : null;

    const license = await this.prisma.license.create({
      data: {
        name: data.name,
        vendor: data.vendor,
        product: data.product,
        version: data.version,
        licenseType: data.licenseType,
        licenseKeyEncrypted: encryptedKey,
        seats: data.seats || 1,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        renewalCost: data.renewalCost,
        currency: data.currency || 'EUR',
        notes: data.notes,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'License',
      entityId: license.id,
      action: ChangeAction.CREATE,
      details: `Created License "${license.name}" (${license.vendor} ${license.product})`,
      user: actor,
    });

    return {
      ...license,
      licenseKeyEncrypted: undefined,
      licenseKeyMasked: maskLicenseKey(encryptedKey || ''),
    };
  }

  async updateLicense(id: string, data: UpdateLicenseInput, actor = 'admin') {
    const existing = await this.prisma.license.findUnique({ where: { id } });
    if (!existing) throw new Error('License not found');

    let encryptedKey = existing.licenseKeyEncrypted;
    if (data.licenseKey !== undefined) {
      encryptedKey = data.licenseKey ? encryptLicenseKey(data.licenseKey) : null;
    }

    const updated = await this.prisma.license.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.vendor !== undefined && { vendor: data.vendor }),
        ...(data.product !== undefined && { product: data.product }),
        ...(data.version !== undefined && { version: data.version }),
        ...(data.licenseType !== undefined && { licenseType: data.licenseType }),
        ...(data.licenseKey !== undefined && { licenseKeyEncrypted: encryptedKey }),
        ...(data.seats !== undefined && { seats: data.seats }),
        ...(data.purchaseDate !== undefined && {
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        }),
        ...(data.expirationDate !== undefined && {
          expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        }),
        ...(data.renewalCost !== undefined && { renewalCost: data.renewalCost }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'License',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated License "${updated.name}"`,
      user: actor,
    });

    return {
      ...updated,
      licenseKeyEncrypted: undefined,
      licenseKeyMasked: maskLicenseKey(updated.licenseKeyEncrypted || ''),
    };
  }

  async deleteLicense(id: string, actor = 'admin') {
    const existing = await this.prisma.license.findUnique({ where: { id } });
    if (!existing) throw new Error('License not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'License',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted License "${existing.name}"`,
      user: actor,
    });

    await this.prisma.license.delete({ where: { id } });
    return { success: true, message: 'License deleted successfully' };
  }

  // Secure reveal of full license key (Audited)
  async revealLicenseKey(id: string, actor = 'admin') {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) throw new Error('License not found');

    if (!license.licenseKeyEncrypted) {
      return { licenseKey: null, message: 'No license key configured' };
    }

    const decrypted = decryptLicenseKey(license.licenseKeyEncrypted);

    await logChange({
      prisma: this.prisma,
      entityType: 'License',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Decrypted and revealed license key for "${license.name}"`,
      user: actor,
    });

    return {
      licenseKey: decrypted,
      licenseName: license.name,
    };
  }

  // Assign license to Machine, Asset, or User
  async assignLicense(licenseId: string, data: AssignLicenseInput, actor = 'admin') {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: { assignments: true },
    });
    if (!license) throw new Error('License not found');

    const assignment = await this.prisma.licenseAssignment.create({
      data: {
        licenseId,
        machineId: data.machineId || null,
        assetId: data.assetId || null,
        userId: data.userId || null,
        notes: data.notes,
      },
      include: {
        machine: true,
        asset: true,
        user: true,
      },
    });

    const isOverallocated = license.assignments.length + 1 > license.seats;

    await logChange({
      prisma: this.prisma,
      entityType: 'License',
      entityId: licenseId,
      action: ChangeAction.UPDATE,
      details: `Assigned license to ${assignment.machine?.hostname || assignment.asset?.name || assignment.user?.username || 'entity'} (${isOverallocated ? 'OVERALLOCATED' : 'OK'})`,
      user: actor,
    });

    return assignment;
  }

  async removeAssignment(assignmentId: string, actor = 'admin') {
    const existing = await this.prisma.licenseAssignment.findUnique({ where: { id: assignmentId } });
    if (!existing) throw new Error('License assignment not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'License',
      entityId: existing.licenseId,
      action: ChangeAction.UPDATE,
      details: `Removed license assignment ${assignmentId}`,
      user: actor,
    });

    await this.prisma.licenseAssignment.delete({ where: { id: assignmentId } });
    return { success: true, message: 'Assignment removed successfully' };
  }
}
