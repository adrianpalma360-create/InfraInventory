import { PrismaClient, ChangeAction, Prisma } from '@prisma/client';
import { CreateMachineInput, UpdateMachineInput, MachineQueryInput } from './machines.schema.js';
import { logChange } from '../../utils/changelog.js';
import { isValidIPv4 } from '../../utils/validators.js';

export class MachinesService {
  constructor(private prisma: PrismaClient) {}

  async list(query: MachineQueryInput) {
    const { search, type, status, group, locationId, vlanId, tagId, tag, os, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MachineWhereInput = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (group) where.group = group;
    if (locationId) where.locationId = locationId;
    if (vlanId) where.vlanId = vlanId;
    if (os) where.os = { contains: os, mode: 'insensitive' };

    if (tagId) {
      where.tags = {
        some: { tagId },
      };
    } else if (tag) {
      where.tags = {
        some: { tag: { name: { equals: tag, mode: 'insensitive' } } },
      };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { hostname: { contains: term, mode: 'insensitive' } },
        { primaryIp: { contains: term, mode: 'insensitive' } },
        { macAddress: { contains: term, mode: 'insensitive' } },
        { os: { contains: term, mode: 'insensitive' } },
        { manufacturer: { contains: term, mode: 'insensitive' } },
        { model: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { location: { name: { contains: term, mode: 'insensitive' } } },
        { tags: { some: { tag: { name: { contains: term, mode: 'insensitive' } } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.machine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          location: true,
          vlan: true,
          tags: {
            include: { tag: true },
          },
          interfaces: {
            include: { ipAddresses: true },
          },
          ipAddresses: true,
          ports: {
            include: { service: true },
          },
          metricAnomalies: {
            where: { isResolved: false },
          },
        },
      }),
      this.prisma.machine.count({ where }),
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

  async getById(id: string) {
    return this.prisma.machine.findUnique({
      where: { id },
      include: {
        location: {
          include: { parent: true },
        },
        vlan: {
          include: { network: true },
        },
        tags: {
          include: { tag: true },
        },
        interfaces: {
          include: {
            ipAddresses: {
              include: { network: true },
            },
            vlan: true,
          },
          orderBy: { name: 'asc' },
        },
        ipAddresses: {
          include: { network: true, interface: true },
          orderBy: { isPrimary: 'desc' },
        },
        ports: {
          include: { service: true },
          orderBy: { portNumber: 'asc' },
        },
        serviceChecks: {
          orderBy: { lastChecked: 'desc' },
        },
        metricAnomalies: {
          orderBy: { detectedAt: 'desc' },
          take: 20,
        },
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  async create(data: CreateMachineInput, actor = 'admin') {
    if (data.primaryIp && !isValidIPv4(data.primaryIp)) {
      throw new Error(`Invalid primary IPv4 address format: ${data.primaryIp}`);
    }

    const existingHostname = await this.prisma.machine.findUnique({
      where: { hostname: data.hostname },
    });
    if (existingHostname) {
      throw new Error(`A machine with hostname "${data.hostname}" already exists`);
    }

    const machine = await this.prisma.machine.create({
      data: {
        hostname: data.hostname,
        type: data.type,
        status: data.status,
        os: data.os,
        osVersion: data.osVersion,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        description: data.description,
        primaryIp: data.primaryIp,
        macAddress: data.macAddress,
        gateway: data.gateway,
        dns: data.dns,
        locationId: data.locationId,
        vlanId: data.vlanId,
        group: data.group || 'Servidores',
      },
      include: {
        location: true,
        vlan: true,
      },
    });

    if (data.primaryIp) {
      await this.prisma.iPAddress.create({
        data: {
          address: data.primaryIp,
          ip: data.primaryIp,
          isPrimary: true,
          status: 'ASSIGNED',
          hostname: data.hostname,
          macAddress: data.macAddress,
          machineId: machine.id,
          description: 'Primary IP (auto-assigned)',
        },
      });
    }

    // Attach tags if specified
    if (data.tagIds && data.tagIds.length > 0) {
      await this.prisma.machineTag.createMany({
        data: data.tagIds.map((tagId) => ({ machineId: machine.id, tagId })),
      });
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Machine',
      entityId: machine.id,
      action: ChangeAction.CREATE,
      details: `Machine ${machine.hostname} created with type ${machine.type}`,
      user: actor,
      machineId: machine.id,
    });

    return this.getById(machine.id);
  }

  async update(id: string, data: UpdateMachineInput, actor = 'admin') {
    const existing = await this.prisma.machine.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Machine not found');
    }

    if (data.primaryIp && !isValidIPv4(data.primaryIp)) {
      throw new Error(`Invalid primary IPv4 address format: ${data.primaryIp}`);
    }

    if (data.hostname && data.hostname !== existing.hostname) {
      const hostnameTaken = await this.prisma.machine.findUnique({
        where: { hostname: data.hostname },
      });
      if (hostnameTaken) {
        throw new Error(`Hostname "${data.hostname}" is already taken`);
      }
    }

    const updated = await this.prisma.machine.update({
      where: { id },
      data: {
        hostname: data.hostname,
        type: data.type,
        status: data.status,
        os: data.os,
        osVersion: data.osVersion,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        description: data.description,
        primaryIp: data.primaryIp,
        macAddress: data.macAddress,
        gateway: data.gateway,
        dns: data.dns,
        locationId: data.locationId,
        vlanId: data.vlanId,
        group: data.group !== undefined ? data.group : undefined,
      },
      include: {
        location: true,
        vlan: true,
      },
    });

    if (data.primaryIp && data.primaryIp !== existing.primaryIp) {
      await this.prisma.iPAddress.updateMany({
        where: { machineId: id },
        data: { isPrimary: false },
      });

      const existingIp = await this.prisma.iPAddress.findFirst({
        where: { machineId: id, ip: data.primaryIp },
      });

      if (existingIp) {
        await this.prisma.iPAddress.update({
          where: { id: existingIp.id },
          data: { isPrimary: true, status: 'ASSIGNED' },
        });
      } else {
        await this.prisma.iPAddress.create({
          data: {
            address: data.primaryIp,
            ip: data.primaryIp,
            isPrimary: true,
            status: 'ASSIGNED',
            hostname: updated.hostname,
            macAddress: updated.macAddress,
            machineId: id,
            description: 'Primary IP (updated)',
          },
        });
      }
    }

    // Update tags if provided
    if (data.tagIds !== undefined) {
      await this.prisma.machineTag.deleteMany({ where: { machineId: id } });
      if (data.tagIds.length > 0) {
        await this.prisma.machineTag.createMany({
          data: data.tagIds.map((tagId) => ({ machineId: id, tagId })),
        });
      }
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Machine',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated machine ${updated.hostname}`,
      user: actor,
      machineId: id,
    });

    return this.getById(id);
  }

  async delete(id: string, actor = 'admin') {
    const existing = await this.prisma.machine.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Machine not found');
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Machine',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted machine ${existing.hostname} (${existing.primaryIp || 'No IP'})`,
      user: actor,
    });

    await this.prisma.machine.delete({ where: { id } });
    return { success: true, message: `Machine ${existing.hostname} deleted successfully` };
  }

  async getInterfaces(machineId: string) {
    return this.prisma.networkInterface.findMany({
      where: { machineId },
      include: { ipAddresses: true, vlan: true },
      orderBy: { name: 'asc' },
    });
  }

  async getPorts(machineId: string) {
    return this.prisma.port.findMany({
      where: { machineId },
      include: { service: true },
      orderBy: { portNumber: 'asc' },
    });
  }

  async getChanges(machineId: string) {
    return this.prisma.changeLog.findMany({
      where: { machineId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
