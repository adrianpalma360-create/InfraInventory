import { PrismaClient, ChangeAction, IPStatus } from '@prisma/client';
import {
  CreateNetworkInput,
  UpdateNetworkInput,
  CreateVlanInput,
  UpdateVlanInput,
  CreateIPInput,
  UpdateIPInput,
  CreateInterfaceInput,
  UpdateInterfaceInput,
} from './networks.schema.js';
import { logChange } from '../../utils/changelog.js';
import { isValidIPv4, isValidCIDR, isValidMAC } from '../../utils/validators.js';
import { calculateIPv4Subnet, calculateSubnet, isIpInSubnet } from '../../utils/subnetCalculator.js';

export interface IPConflict {
  ip: string;
  count: number;
  machines: Array<{
    id: string;
    hostname: string;
    primaryIp: string | null;
    status: string;
  }>;
  interfaces: Array<{
    id: string;
    name: string;
    macAddress: string | null;
    machineName: string;
  }>;
  message: string;
}

export class NetworksService {
  constructor(private prisma: PrismaClient) {}

  // ----------------------------------------------------
  // Networks & IPAM
  // ----------------------------------------------------
  async listNetworks() {
    const networks = await this.prisma.network.findMany({
      include: {
        vlans: true,
        vlan: true,
        location: true,
        ipAddresses: {
          include: {
            machine: {
              include: {
                location: true,
                ports: true,
                serviceChecks: true,
                metricAnomalies: { where: { isResolved: false } },
              },
            },
            interface: true,
          },
        },
      },
      orderBy: { cidr: 'asc' },
    });

    // Compute real IPAM utilization and statistics for each network
    return networks.map((net) => {
      let calc: any = null;
      try {
        calc = calculateIPv4Subnet(net.cidr);
      } catch {
        calc = { totalAddresses: 0, usableAddresses: 0, firstUsableIp: 'N/A', lastUsableIp: 'N/A' };
      }

      const assignedCount = net.ipAddresses.filter(
        (ip) => ip.status === 'ASSIGNED' || ip.machineId !== null
      ).length;
      const reservedCount = net.ipAddresses.filter((ip) => ip.status === 'RESERVED').length;
      const dhcpCount = net.ipAddresses.filter((ip) => ip.status === 'DHCP').length;
      const conflictCount = net.ipAddresses.filter((ip) => ip.status === 'CONFLICT').length;

      const totalUsable = calc ? calc.usableAddresses : 254;
      const usedTotal = assignedCount + reservedCount + dhcpCount;
      const freeCount = Math.max(0, totalUsable - usedTotal);
      const usagePercentage =
        totalUsable > 0 ? Math.min(100, Number(((usedTotal / totalUsable) * 100).toFixed(1))) : 0;

      return {
        ...net,
        calculation: calc,
        stats: {
          totalAddresses: calc ? calc.totalAddresses : 0,
          usableAddresses: totalUsable,
          assignedCount,
          reservedCount,
          dhcpCount,
          conflictCount,
          freeCount,
          usagePercentage,
        },
      };
    });
  }

  async getNetworkById(id: string) {
    const net = await this.prisma.network.findUnique({
      where: { id },
      include: {
        vlan: true,
        vlans: true,
        location: true,
        ipAddresses: {
          include: {
            machine: {
              include: {
                location: true,
                ports: { include: { service: true } },
                serviceChecks: true,
                metricAnomalies: { where: { isResolved: false } },
              },
            },
            interface: true,
          },
          orderBy: { address: 'asc' },
        },
      },
    });

    if (!net) return null;

    let calc: any = null;
    try {
      calc = calculateIPv4Subnet(net.cidr);
    } catch {
      calc = { totalAddresses: 0, usableAddresses: 0, firstUsableIp: 'N/A', lastUsableIp: 'N/A' };
    }

    const assignedCount = net.ipAddresses.filter(
      (ip) => ip.status === 'ASSIGNED' || ip.machineId !== null
    ).length;
    const reservedCount = net.ipAddresses.filter((ip) => ip.status === 'RESERVED').length;
    const dhcpCount = net.ipAddresses.filter((ip) => ip.status === 'DHCP').length;
    const conflictCount = net.ipAddresses.filter((ip) => ip.status === 'CONFLICT').length;

    const totalUsable = calc ? calc.usableAddresses : 254;
    const usedTotal = assignedCount + reservedCount + dhcpCount;
    const freeCount = Math.max(0, totalUsable - usedTotal);
    const usagePercentage =
      totalUsable > 0 ? Math.min(100, Number(((usedTotal / totalUsable) * 100).toFixed(1))) : 0;

    return {
      ...net,
      calculation: calc,
      stats: {
        totalAddresses: calc ? calc.totalAddresses : 0,
        usableAddresses: totalUsable,
        assignedCount,
        reservedCount,
        dhcpCount,
        conflictCount,
        freeCount,
        usagePercentage,
      },
    };
  }

  async createNetwork(data: CreateNetworkInput, actor = 'admin') {
    if (!isValidCIDR(data.cidr)) {
      throw new Error(`Invalid CIDR format: ${data.cidr}. Example: 192.168.1.0/24`);
    }

    const calc = calculateIPv4Subnet(data.cidr);

    const network = await this.prisma.network.create({
      data: {
        name: data.name,
        cidr: calc.cidr,
        networkAddress: calc.networkAddress,
        broadcastAddress: calc.broadcastAddress,
        gateway: data.gateway || calc.gateway,
        dns: data.dns || '8.8.8.8, 1.1.1.1',
        description: data.description,
        vlanId: data.vlanId,
        locationId: data.locationId,
        dhcpEnabled: data.dhcpEnabled || false,
        dhcpStart: data.dhcpStart,
        dhcpEnd: data.dhcpEnd,
      },
      include: { vlan: true, location: true },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Network',
      entityId: network.id,
      action: ChangeAction.CREATE,
      details: `Created network ${network.name} (${network.cidr})`,
      user: actor,
    });

    return network;
  }

  async updateNetwork(id: string, data: UpdateNetworkInput, actor = 'admin') {
    let extraFields: any = {};
    if (data.cidr) {
      if (!isValidCIDR(data.cidr)) {
        throw new Error(`Invalid CIDR format: ${data.cidr}`);
      }
      const calc = calculateIPv4Subnet(data.cidr);
      extraFields = {
        cidr: calc.cidr,
        networkAddress: calc.networkAddress,
        broadcastAddress: calc.broadcastAddress,
      };
    }

    const network = await this.prisma.network.update({
      where: { id },
      data: {
        ...data,
        ...extraFields,
      },
      include: { vlan: true, location: true },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Network',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated network ${network.name} (${network.cidr})`,
      user: actor,
    });

    return network;
  }

  async deleteNetwork(id: string, actor = 'admin') {
    const existing = await this.prisma.network.findUnique({ where: { id } });
    if (!existing) throw new Error('Network not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Network',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted network ${existing.name} (${existing.cidr})`,
      user: actor,
    });

    await this.prisma.network.delete({ where: { id } });
    return { success: true, message: 'Network deleted successfully' };
  }

  // ----------------------------------------------------
  // VLANs
  // ----------------------------------------------------
  async listVlans() {
    return this.prisma.vLAN.findMany({
      include: {
        network: true,
        location: true,
        machines: {
          select: { id: true, hostname: true, primaryIp: true, status: true },
        },
        interfaces: true,
        _count: {
          select: { machines: true, interfaces: true },
        },
      },
      orderBy: { vlanId: 'asc' },
    });
  }

  async getVlanById(id: string) {
    return this.prisma.vLAN.findUnique({
      where: { id },
      include: {
        network: {
          include: { ipAddresses: true },
        },
        location: true,
        machines: {
          include: {
            ports: { include: { service: true } },
            location: true,
            metricAnomalies: { where: { isResolved: false } },
          },
        },
        interfaces: {
          include: { machine: true, ipAddresses: true },
        },
      },
    });
  }

  async createVlan(data: CreateVlanInput, actor = 'admin') {
    const existing = await this.prisma.vLAN.findUnique({ where: { vlanId: data.vlanId } });
    if (existing) throw new Error(`VLAN ID ${data.vlanId} already exists`);

    const vlan = await this.prisma.vLAN.create({
      data,
      include: { network: true, location: true },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'VLAN',
      entityId: vlan.id,
      action: ChangeAction.CREATE,
      details: `Created VLAN ${vlan.vlanId} - ${vlan.name}`,
      user: actor,
    });

    return vlan;
  }

  async updateVlan(id: string, data: UpdateVlanInput, actor = 'admin') {
    const vlan = await this.prisma.vLAN.update({
      where: { id },
      data,
      include: { network: true, location: true },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'VLAN',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated VLAN ${vlan.vlanId} - ${vlan.name}`,
      user: actor,
    });

    return vlan;
  }

  async deleteVlan(id: string, actor = 'admin') {
    const existing = await this.prisma.vLAN.findUnique({ where: { id } });
    if (!existing) throw new Error('VLAN not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'VLAN',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted VLAN ${existing.vlanId} - ${existing.name}`,
      user: actor,
    });

    await this.prisma.vLAN.delete({ where: { id } });
    return { success: true, message: 'VLAN deleted successfully' };
  }

  // ----------------------------------------------------
  // IP Addresses (IPAM)
  // ----------------------------------------------------
  async listIPs(networkId?: string, status?: IPStatus) {
    const where: any = {};
    if (networkId) where.networkId = networkId;
    if (status) where.status = status;

    return this.prisma.iPAddress.findMany({
      where,
      include: {
        machine: {
          include: {
            location: true,
            vlan: true,
            ports: { include: { service: true } },
            serviceChecks: true,
            metricAnomalies: { where: { isResolved: false } },
          },
        },
        network: {
          include: { vlan: true, location: true },
        },
        interface: {
          include: { vlan: true },
        },
      },
      orderBy: { address: 'asc' },
    });
  }

  async getIPById(id: string) {
    return this.prisma.iPAddress.findUnique({
      where: { id },
      include: {
        machine: {
          include: {
            location: true,
            vlan: true,
            tags: { include: { tag: true } },
            interfaces: true,
            ports: { include: { service: true } },
            serviceChecks: true,
            metricAnomalies: { where: { isResolved: false } },
          },
        },
        network: {
          include: { vlan: true, location: true },
        },
        interface: {
          include: { vlan: true },
        },
      },
    });
  }

  async createIP(data: CreateIPInput, actor = 'admin') {
    const rawIp = (data.address || data.ip).trim();
    if (!isValidIPv4(rawIp)) {
      throw new Error(`Invalid IPv4 address format: ${rawIp}`);
    }

    // Determine status automatically if not specified
    let status: IPStatus = data.status || 'FREE';
    if (data.machineId || data.interfaceId) {
      status = 'ASSIGNED';
    }

    // Match network if not provided
    let networkId = data.networkId;
    if (!networkId) {
      const networks = await this.prisma.network.findMany();
      for (const net of networks) {
        if (isIpInSubnet(rawIp, net.cidr)) {
          networkId = net.id;
          break;
        }
      }
    }

    // Check duplicate in the same network
    if (networkId) {
      const existing = await this.prisma.iPAddress.findFirst({
        where: { address: rawIp, networkId },
      });
      if (existing) {
        throw new Error(`IP ${rawIp} already exists in this network.`);
      }
    }

    if (data.machineId && data.isPrimary) {
      await this.prisma.iPAddress.updateMany({
        where: { machineId: data.machineId },
        data: { isPrimary: false },
      });
      await this.prisma.machine.update({
        where: { id: data.machineId },
        data: { primaryIp: rawIp },
      });
    }

    const ipAddress = await this.prisma.iPAddress.create({
      data: {
        address: rawIp,
        ip: rawIp,
        version: data.version || 'IPv4',
        status,
        hostname: data.hostname,
        macAddress: data.macAddress,
        isPrimary: data.isPrimary || false,
        subnet: data.subnet,
        description: data.description,
        machineId: data.machineId,
        interfaceId: data.interfaceId,
        networkId,
        lastChecked: new Date(),
      },
      include: { machine: true, network: true, interface: true },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'IPAddress',
      entityId: ipAddress.id,
      action: ChangeAction.CREATE,
      details: `Created IP ${ipAddress.address} [${status}]${ipAddress.machine ? ` assigned to ${ipAddress.machine.hostname}` : ''}`,
      user: actor,
      machineId: data.machineId || undefined,
    });

    return ipAddress;
  }

  async updateIP(id: string, data: UpdateIPInput, actor = 'admin') {
    const rawIp = data.address || data.ip;
    if (rawIp && !isValidIPv4(rawIp)) {
      throw new Error(`Invalid IPv4 address format: ${rawIp}`);
    }

    const existing = await this.prisma.iPAddress.findUnique({ where: { id } });
    if (!existing) throw new Error('IP Address not found');

    let status = data.status || existing.status;
    if (data.machineId !== undefined) {
      status = data.machineId ? 'ASSIGNED' : 'FREE';
    }

    const ipAddress = await this.prisma.iPAddress.update({
      where: { id },
      data: {
        address: rawIp || existing.address,
        ip: rawIp || existing.ip,
        version: data.version || existing.version,
        status,
        hostname: data.hostname !== undefined ? data.hostname : existing.hostname,
        macAddress: data.macAddress !== undefined ? data.macAddress : existing.macAddress,
        isPrimary: data.isPrimary !== undefined ? data.isPrimary : existing.isPrimary,
        subnet: data.subnet !== undefined ? data.subnet : existing.subnet,
        description: data.description !== undefined ? data.description : existing.description,
        machineId: data.machineId !== undefined ? data.machineId : existing.machineId,
        interfaceId: data.interfaceId !== undefined ? data.interfaceId : existing.interfaceId,
        networkId: data.networkId !== undefined ? data.networkId : existing.networkId,
        lastChecked: new Date(),
      },
      include: { machine: true, network: true, interface: true },
    });

    if (data.isPrimary && ipAddress.machineId) {
      await this.prisma.iPAddress.updateMany({
        where: { machineId: ipAddress.machineId, NOT: { id } },
        data: { isPrimary: false },
      });
      await this.prisma.machine.update({
        where: { id: ipAddress.machineId },
        data: { primaryIp: ipAddress.address },
      });
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'IPAddress',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated IP ${ipAddress.address} [${status}]`,
      user: actor,
      machineId: ipAddress.machineId || undefined,
    });

    return ipAddress;
  }

  async deleteIP(id: string, actor = 'admin') {
    const existing = await this.prisma.iPAddress.findUnique({ where: { id } });
    if (!existing) throw new Error('IP Address not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'IPAddress',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted IP ${existing.address}`,
      user: actor,
      machineId: existing.machineId || undefined,
    });

    await this.prisma.iPAddress.delete({ where: { id } });
    return { success: true, message: 'IP address deleted' };
  }

  // ----------------------------------------------------
  // IP Conflict Detection
  // ----------------------------------------------------
  async detectConflicts(): Promise<IPConflict[]> {
    // 1. Check duplicate IPs across active machines
    const ips = await this.prisma.iPAddress.findMany({
      where: {
        machineId: { not: null },
      },
      include: {
        machine: true,
        interface: true,
      },
    });

    const ipMap = new Map<string, typeof ips>();
    ips.forEach((item) => {
      const addr = item.address;
      if (!ipMap.has(addr)) ipMap.set(addr, []);
      ipMap.get(addr)!.push(item);
    });

    const conflicts: IPConflict[] = [];

    for (const [ip, occurrences] of ipMap.entries()) {
      // Group by distinct machine
      const uniqueMachineIds = new Set(occurrences.map((o) => o.machineId).filter(Boolean));

      if (uniqueMachineIds.size > 1) {
        const machines = occurrences
          .map((o) => o.machine)
          .filter(Boolean)
          .map((m: any) => ({
            id: m.id,
            hostname: m.hostname,
            primaryIp: m.primaryIp,
            status: m.status,
          }));

        const interfaces = occurrences
          .map((o) => o.interface)
          .filter(Boolean)
          .map((iface: any) => ({
            id: iface.id,
            name: iface.name,
            macAddress: iface.macAddress,
            machineName: occurrences.find((o) => o.interfaceId === iface.id)?.machine?.hostname || 'Unknown',
          }));

        conflicts.push({
          ip,
          count: uniqueMachineIds.size,
          machines,
          interfaces,
          message: `Conflicto detectado: La dirección IP ${ip} está asignada simultáneamente a ${uniqueMachineIds.size} máquinas distintas (${machines.map((m) => m.hostname).join(', ')}).`,
        });

        // Mark in DB as CONFLICT
        await this.prisma.iPAddress.updateMany({
          where: { address: ip },
          data: { status: 'CONFLICT' },
        });
      }
    }

    return conflicts;
  }

  // ----------------------------------------------------
  // IPAM Overall Statistics
  // ----------------------------------------------------
  async getIpamStats() {
    const [
      totalNetworks,
      totalVlans,
      totalIps,
      assignedIps,
      reservedIps,
      dhcpIps,
      freeIps,
      conflictIps,
      conflicts,
    ] = await Promise.all([
      this.prisma.network.count(),
      this.prisma.vLAN.count(),
      this.prisma.iPAddress.count(),
      this.prisma.iPAddress.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.iPAddress.count({ where: { status: 'RESERVED' } }),
      this.prisma.iPAddress.count({ where: { status: 'DHCP' } }),
      this.prisma.iPAddress.count({ where: { status: 'FREE' } }),
      this.prisma.iPAddress.count({ where: { status: 'CONFLICT' } }),
      this.detectConflicts(),
    ]);

    return {
      totalNetworks,
      totalVlans,
      totalIps,
      assignedIps,
      reservedIps,
      dhcpIps,
      freeIps,
      conflictIps: Math.max(conflictIps, conflicts.length),
      conflicts,
    };
  }

  // ----------------------------------------------------
  // Interfaces
  // ----------------------------------------------------
  async createInterface(data: CreateInterfaceInput, actor = 'admin') {
    if (data.macAddress && !isValidMAC(data.macAddress)) {
      throw new Error(`Invalid MAC address format: ${data.macAddress}`);
    }

    const iface = await this.prisma.networkInterface.create({
      data: {
        machineId: data.machineId,
        name: data.name,
        macAddress: data.macAddress,
        speed: data.speed,
        status: data.status,
        vlanId: data.vlanId,
        description: data.description,
      },
      include: { vlan: true, machine: true },
    });

    if (data.ipAddress) {
      if (!isValidIPv4(data.ipAddress)) {
        throw new Error(`Invalid IP address format: ${data.ipAddress}`);
      }
      await this.createIP(
        {
          ip: data.ipAddress,
          address: data.ipAddress,
          machineId: data.machineId,
          interfaceId: iface.id,
          status: 'ASSIGNED',
          macAddress: data.macAddress,
          description: `Interface ${iface.name} IP`,
        },
        actor
      );
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'NetworkInterface',
      entityId: iface.id,
      action: ChangeAction.CREATE,
      details: `Added network interface ${iface.name} to machine ${iface.machine.hostname}`,
      user: actor,
      machineId: data.machineId,
    });

    return iface;
  }

  async updateInterface(id: string, data: UpdateInterfaceInput, actor = 'admin') {
    if (data.macAddress && !isValidMAC(data.macAddress)) {
      throw new Error(`Invalid MAC address format: ${data.macAddress}`);
    }

    const iface = await this.prisma.networkInterface.update({
      where: { id },
      data: {
        name: data.name,
        macAddress: data.macAddress,
        speed: data.speed,
        status: data.status,
        vlanId: data.vlanId,
        description: data.description,
      },
      include: { vlan: true, machine: true, ipAddresses: true },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'NetworkInterface',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated interface ${iface.name}`,
      user: actor,
      machineId: iface.machineId,
    });

    return iface;
  }

  async deleteInterface(id: string, actor = 'admin') {
    const existing = await this.prisma.networkInterface.findUnique({ where: { id } });
    if (!existing) throw new Error('Interface not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'NetworkInterface',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted interface ${existing.name}`,
      user: actor,
      machineId: existing.machineId,
    });

    await this.prisma.networkInterface.delete({ where: { id } });
    return { success: true, message: 'Interface deleted' };
  }

  // ----------------------------------------------------
  // CSV Export & Import
  // ----------------------------------------------------
  async exportCsv() {
    const [networks, vlans, ips, machines] = await Promise.all([
      this.prisma.network.findMany({ include: { vlan: true, location: true } }),
      this.prisma.vLAN.findMany({ include: { network: true, location: true } }),
      this.prisma.iPAddress.findMany({ include: { machine: true, network: true, interface: true } }),
      this.prisma.machine.findMany({ include: { location: true, vlan: true, tags: { include: { tag: true } } } }),
    ]);

    let csv = '# INFRAINVENTORY IPAM EXPORT V6\n';
    csv += '# TYPE,ID,NAME_OR_IP,DETAILS,EXTRA1,EXTRA2\n';

    networks.forEach((n) => {
      csv += `NETWORK,${n.id},"${n.name}","${n.cidr}","GW:${n.gateway || 'N/A'}","VLAN:${n.vlan?.vlanId || 'N/A'}"\n`;
    });

    vlans.forEach((v) => {
      csv += `VLAN,${v.id},${v.vlanId},"${v.name}","${v.description || ''}","LOC:${v.location?.name || 'N/A'}"\n`;
    });

    ips.forEach((ip) => {
      csv += `IP,${ip.id},${ip.address},"${ip.status}","HOST:${ip.machine?.hostname || 'N/A'}","MAC:${ip.macAddress || 'N/A'}"\n`;
    });

    machines.forEach((m) => {
      const tags = m.tags.map((t) => t.tag.name).join(';');
      csv += `MACHINE,${m.id},"${m.hostname}","${m.primaryIp || ''}","${m.status}","TAGS:${tags}"\n`;
    });

    return csv;
  }

  async importCsv(csvContent: string, actor = 'admin') {
    const lines = csvContent.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    let importedCount = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      const type = cols[0]?.toUpperCase();

      try {
        if (type === 'NETWORK') {
          // Format: NETWORK, ID, NAME, CIDR, GATEWAY
          const name = cols[2];
          const cidr = cols[3];
          if (name && cidr && isValidCIDR(cidr)) {
            await this.prisma.network.upsert({
              where: { cidr },
              update: { name },
              create: { name, ...calculateIPv4Subnet(cidr) },
            });
            importedCount++;
          }
        } else if (type === 'VLAN') {
          // Format: VLAN, ID, VLAN_ID, NAME
          const vlanId = parseInt(cols[2], 10);
          const name = cols[3] || `VLAN ${vlanId}`;
          if (!isNaN(vlanId)) {
            await this.prisma.vLAN.upsert({
              where: { vlanId },
              update: { name },
              create: { vlanId, name },
            });
            importedCount++;
          }
        } else if (type === 'IP') {
          // Format: IP, ID, ADDRESS, STATUS, HOSTNAME
          const address = cols[2];
          const status = (cols[3]?.toUpperCase() as IPStatus) || 'FREE';
          if (address && isValidIPv4(address)) {
            await this.createIP({ ip: address, address, status }, actor);
            importedCount++;
          }
        }
      } catch (err: any) {
        errors.push(`Línea ${idx + 1}: ${err.message}`);
      }
    }

    return {
      success: true,
      importedCount,
      errorsCount: errors.length,
      errors,
    };
  }
}
