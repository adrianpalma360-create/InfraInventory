import { PrismaClient, ChangeAction, MachineStatus, HealthState } from '@prisma/client';
import { CreateLocationInput, UpdateLocationInput } from './locations.schema.js';
import { logChange } from '../../utils/changelog.js';

export class LocationsService {
  constructor(private prisma: PrismaClient) {}

  async list() {
    return this.prisma.location.findMany({
      include: {
        parent: { select: { id: true, name: true, type: true } },
        children: { select: { id: true, name: true, type: true } },
        _count: {
          select: { machines: true, networks: true, vlans: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTree() {
    // Returns full recursive tree of locations
    const allLocations = await this.prisma.location.findMany({
      include: {
        machines: {
          select: { id: true, hostname: true, type: true, status: true, primaryIp: true },
        },
        networks: {
          select: { id: true, name: true, cidr: true },
        },
        vlans: {
          select: { id: true, vlanId: true, name: true },
        },
        _count: {
          select: { machines: true, networks: true, vlans: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const locationMap = new Map<string, any>();
    allLocations.forEach((loc) => locationMap.set(loc.id, { ...loc, children: [] }));

    const roots: any[] = [];
    allLocations.forEach((loc) => {
      const node = locationMap.get(loc.id);
      if (loc.parentId && locationMap.has(loc.parentId)) {
        locationMap.get(loc.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async getById(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        machines: {
          include: {
            vlan: true,
            ports: { include: { service: true } },
            tags: { include: { tag: true } },
            metricAnomalies: { where: { isResolved: false } },
          },
        },
        networks: {
          include: {
            vlans: true,
            _count: { select: { ipAddresses: true } },
          },
        },
        vlans: {
          include: {
            network: true,
            _count: { select: { machines: true, interfaces: true } },
          },
        },
      },
    });

    if (!location) return null;

    // Calculate aggregated stats and incidents for this location & children
    const machineIds = location.machines.map((m) => m.id);
    const totalMachines = location.machines.length;
    const onlineCount = location.machines.filter((m) => m.status === MachineStatus.ONLINE).length;
    const warningCount = location.machines.filter((m) => m.status === MachineStatus.WARNING).length;
    const offlineCount = location.machines.filter((m) => m.status === MachineStatus.OFFLINE).length;
    const uncheckedCount = location.machines.filter((m) => m.status === MachineStatus.UNCHECKED).length;

    // Count services and ports
    let totalServices = 0;
    location.machines.forEach((m) => {
      totalServices += m.ports.length;
    });

    // Active anomalies / incidents
    const incidents = await this.prisma.metricAnomaly.findMany({
      where: {
        machineId: { in: machineIds },
        isResolved: false,
      },
      include: {
        machine: { select: { id: true, hostname: true, primaryIp: true } },
      },
      orderBy: { detectedAt: 'desc' },
      take: 20,
    });

    const availability =
      totalMachines > 0 ? Number(((onlineCount / totalMachines) * 100).toFixed(2)) : 100.0;

    return {
      ...location,
      stats: {
        totalMachines,
        onlineCount,
        warningCount,
        offlineCount,
        uncheckedCount,
        totalServices,
        openIncidentsCount: incidents.length,
        availability,
      },
      incidents,
    };
  }

  async create(data: CreateLocationInput, actor = 'admin') {
    const existing = await this.prisma.location.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new Error(`Location "${data.name}" already exists`);
    }

    const location = await this.prisma.location.create({ data });

    await logChange({
      prisma: this.prisma,
      entityType: 'Location',
      entityId: location.id,
      action: ChangeAction.CREATE,
      details: `Created location ${location.name} (Type: ${location.type}, Building: ${location.building || 'N/A'}, Room: ${location.room || 'N/A'})`,
      user: actor,
    });

    return location;
  }

  async update(id: string, data: UpdateLocationInput, actor = 'admin') {
    const existing = await this.prisma.location.findUnique({ where: { id } });
    if (!existing) throw new Error('Location not found');

    if (data.parentId && data.parentId === id) {
      throw new Error('A location cannot be its own parent');
    }

    const location = await this.prisma.location.update({
      where: { id },
      data,
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Location',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated location ${location.name}`,
      user: actor,
    });

    return location;
  }

  async delete(id: string, actor = 'admin') {
    const existing = await this.prisma.location.findUnique({
      where: { id },
      include: { machines: true, networks: true, vlans: true, children: true },
    });
    if (!existing) throw new Error('Location not found');

    if (existing.children.length > 0) {
      throw new Error(`Cannot delete location because it has ${existing.children.length} sub-locations. Reassign or delete them first.`);
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Location',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted location ${existing.name}`,
      user: actor,
    });

    await this.prisma.location.delete({ where: { id } });
    return { success: true, message: 'Location deleted successfully' };
  }
}
