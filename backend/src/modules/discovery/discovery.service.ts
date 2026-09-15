import {
  PrismaClient,
  ScanType,
  ScanStatus,
  HostStatus,
  DiscoveryChangeType,
  DiscoveryChangeStatus,
  MachineStatus,
  ChangeAction,
  PortProtocol,
  PortState,
} from '@prisma/client';
import {
  CreateScanInput,
  ImportDiscoveredHostInput,
  DiscoveryChangeQueryInput,
} from './discovery.schema.js';
import { logChange } from '../../utils/changelog.js';
import { isValidCIDR } from '../../utils/validators.js';

interface RemoteScanResponse {
  scanId: string;
  networkCidr: string;
  scanType: ScanType;
  status: ScanStatus;
  progress: number;
  totalHosts: number;
  scannedHosts: number;
  activeHosts: number;
  discoveredHosts: Array<{
    ip: string;
    hostname?: string;
    macAddress?: string;
    vendor?: string;
    osGuess?: string;
    status: HostStatus;
    responseTimeMs?: number;
    ports: Array<{
      portNumber: number;
      protocol: PortProtocol;
      state: PortState;
      serviceName?: string;
      banner?: string;
    }>;
  }>;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export class DiscoveryService {
  private discoveryUrl: string;

  constructor(private prisma: PrismaClient) {
    this.discoveryUrl = process.env.DISCOVERY_SERVICE_URL || 'http://discovery:5000';
  }

  // 1. Start a new Discovery Scan
  async startScan(input: CreateScanInput) {
    if (!isValidCIDR(input.networkCidr)) {
      throw new Error(`Invalid CIDR format: ${input.networkCidr}. Example: 192.168.1.0/24`);
    }

    // Check if there is already a running scan on this CIDR
    const runningScan = await this.prisma.discoveryScan.findFirst({
      where: {
        networkCidr: input.networkCidr,
        status: ScanStatus.RUNNING,
      },
    });

    if (runningScan) {
      return runningScan;
    }

    // Create record in DB
    const scan = await this.prisma.discoveryScan.create({
      data: {
        networkCidr: input.networkCidr,
        scanType: input.scanType,
        status: ScanStatus.RUNNING,
        progress: 0,
      },
    });

    // Request remote scan execution
    try {
      const response = await fetch(`${this.discoveryUrl}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: scan.id,
          cidr: scan.networkCidr,
          scanType: scan.scanType,
        }),
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Discovery engine returned HTTP ${response.status}`);
      }

      // Background poll worker to track completion and process diffs
      this.monitorScanBackground(scan.id).catch((err) => {
        console.error(`Error monitoring scan ${scan.id}:`, err);
      });
    } catch (err: any) {
      await this.prisma.discoveryScan.update({
        where: { id: scan.id },
        data: {
          status: ScanStatus.FAILED,
          errorMessage: err.message,
          completedAt: new Date(),
        },
      });
      throw err;
    }

    return scan;
  }

  // Background monitor loop
  private async monitorScanBackground(scanId: string) {
    const POLL_INTERVAL = 1500;
    const MAX_WAIT = 1000 * 60 * 15; // 15 mins
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

      try {
        const res = await fetch(`${this.discoveryUrl}/scan/${scanId}`);
        if (!res.ok) continue;

        const body: { success: boolean; data: RemoteScanResponse } = await res.json();
        const scanData = body.data;

        await this.prisma.discoveryScan.update({
          where: { id: scanId },
          data: {
            progress: scanData.progress,
            scannedHosts: scanData.scannedHosts,
            totalHosts: scanData.totalHosts,
            activeHosts: scanData.activeHosts,
          },
        });

        if (scanData.status === 'COMPLETED') {
          await this.processScanResults(scanId, scanData);
          break;
        } else if (scanData.status === 'FAILED' || scanData.status === 'CANCELLED') {
          await this.prisma.discoveryScan.update({
            where: { id: scanId },
            data: {
              status: scanData.status as ScanStatus,
              errorMessage: scanData.errorMessage,
              completedAt: new Date(),
              durationMs: scanData.durationMs,
            },
          });
          break;
        }
      } catch (err) {
        console.error(`Polling error for scan ${scanId}:`, err);
      }
    }
  }

  // 2. Diff & Inventory Comparison Engine
  async processScanResults(scanId: string, results: RemoteScanResponse) {
    const scan = await this.prisma.discoveryScan.findUnique({ where: { id: scanId } });
    if (!scan) return;

    let newDevicesCount = 0;
    let changedDevicesCount = 0;
    let missingDevicesCount = 0;

    // Load existing inventory machines and IP addresses
    const existingMachines = await this.prisma.machine.findMany({
      include: {
        ipAddresses: true,
        ports: { include: { service: true } },
      },
    });

    const ipToMachineMap = new Map<string, (typeof existingMachines)[0]>();
    for (const m of existingMachines) {
      if (m.primaryIp) ipToMachineMap.set(m.primaryIp, m);
      for (const ipObj of m.ipAddresses) {
        ipToMachineMap.set(ipObj.ip, m);
      }
    }

    const discoveredIps = new Set<string>();

function cleanStr(val?: string | null): string | undefined {
  if (val === undefined || val === null) return undefined;
  const cleaned = val.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

    // Process each discovered host
    for (const host of results.discoveredHosts) {
      discoveredIps.add(host.ip);
      const matchedMachine = ipToMachineMap.get(host.ip);
      const isNew = !matchedMachine;

      if (isNew) {
        newDevicesCount++;
      }

      const cleanHostname = cleanStr(host.hostname) || (matchedMachine ? matchedMachine.hostname : undefined);
      const cleanVendor = cleanStr(host.vendor);
      const cleanOsGuess = cleanStr(host.osGuess);
      const cleanMac = cleanStr(host.macAddress);

      // Save DiscoveryHost
      const createdHost = await this.prisma.discoveryHost.create({
        data: {
          scanId,
          ip: host.ip,
          hostname: cleanHostname,
          macAddress: cleanMac,
          vendor: cleanVendor,
          osGuess: cleanOsGuess,
          status: host.status,
          responseTimeMs: host.responseTimeMs,
          isNew,
          matchedMachineId: matchedMachine?.id || null,
          ports: {
            create: host.ports.map((p) => ({
              portNumber: p.portNumber,
              protocol: p.protocol,
              state: p.state,
              serviceName: cleanStr(p.serviceName),
              banner: cleanStr(p.banner)?.slice(0, 255),
            })),
          },
        },
      });

      // Generate Diffs
      if (isNew) {
        const portsStr = host.ports.map((p) => `${p.portNumber}/${p.serviceName || p.protocol}`).join(', ');
        await this.prisma.discoveryChange.create({
          data: {
            scanId,
            changeType: DiscoveryChangeType.NEW_DEVICE,
            status: DiscoveryChangeStatus.PENDING,
            ip: host.ip,
            hostname: host.hostname,
            details: `Nuevo dispositivo detectado en ${host.ip}${host.hostname ? ` (${host.hostname})` : ''} con puertos abiertos: ${portsStr || 'Ninguno'}`,
            newValue: JSON.stringify({
              ip: host.ip,
              hostname: host.hostname,
              ports: host.ports,
            }),
          },
        });
      } else if (matchedMachine) {
        let hasChanges = false;
        const openPortNumbers = new Set(host.ports.map((p) => p.portNumber));
        const existingPortNumbers = new Set(matchedMachine.ports.map((p) => p.portNumber));

        // Update machine lastDiscoveredAt and mark ONLINE
        await this.prisma.machine.update({
          where: { id: matchedMachine.id },
          data: {
            lastDiscoveredAt: new Date(),
            status: MachineStatus.ONLINE,
          },
        });

        // Check for new ports
        for (const p of host.ports) {
          if (!existingPortNumbers.has(p.portNumber)) {
            hasChanges = true;
            await this.prisma.discoveryChange.create({
              data: {
                scanId,
                machineId: matchedMachine.id,
                changeType: DiscoveryChangeType.NEW_PORT,
                status: DiscoveryChangeStatus.PENDING,
                ip: host.ip,
                hostname: matchedMachine.hostname,
                details: `Nuevo puerto abierto ${p.portNumber}/TCP (${p.serviceName || 'Unknown'}) detectado en ${matchedMachine.hostname}`,
                newValue: String(p.portNumber),
              },
            });
          }
        }

        // Check for closed ports
        for (const ep of matchedMachine.ports) {
          if (ep.state === PortState.OPEN && !openPortNumbers.has(ep.portNumber)) {
            hasChanges = true;
            await this.prisma.discoveryChange.create({
              data: {
                scanId,
                machineId: matchedMachine.id,
                changeType: DiscoveryChangeType.PORT_CLOSED,
                status: DiscoveryChangeStatus.PENDING,
                ip: host.ip,
                hostname: matchedMachine.hostname,
                details: `Puerto ${ep.portNumber}/TCP que figuraba abierto no respondió en el escaneo de ${matchedMachine.hostname}`,
                oldValue: String(ep.portNumber),
              },
            });
          }
        }

        if (hasChanges) {
          changedDevicesCount++;
        }
      }
    }

    // 3. Detect Missing / Unresponsive devices in the scanned subnet
    // Any machine with primaryIp matching this CIDR that was not discovered
    for (const machine of existingMachines) {
      if (machine.primaryIp && isIpInCidr(machine.primaryIp, scan.networkCidr)) {
        if (!discoveredIps.has(machine.primaryIp)) {
          missingDevicesCount++;
          // Mark machine status as OFFLINE without deleting it!
          await this.prisma.machine.update({
            where: { id: machine.id },
            data: {
              status: MachineStatus.OFFLINE,
            },
          });

          await this.prisma.discoveryChange.create({
            data: {
              scanId,
              machineId: machine.id,
              changeType: DiscoveryChangeType.DEVICE_OFFLINE,
              status: DiscoveryChangeStatus.PENDING,
              ip: machine.primaryIp,
              hostname: machine.hostname,
              details: `Dispositivo ${machine.hostname} (${machine.primaryIp}) no respondió durante el escaneo de la red ${scan.networkCidr}. Marcado como OFFLINE.`,
              oldValue: 'ONLINE',
              newValue: 'OFFLINE',
            },
          });
        }
      }
    }

    // Finalize Scan in DB
    await this.prisma.discoveryScan.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.COMPLETED,
        progress: 100,
        totalHosts: results.totalHosts,
        scannedHosts: results.scannedHosts,
        activeHosts: results.discoveredHosts.length,
        newDevices: newDevicesCount,
        changedDevices: changedDevicesCount,
        missingDevices: missingDevicesCount,
        completedAt: new Date(),
        durationMs: results.durationMs,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'DiscoveryScan',
      entityId: scanId,
      action: ChangeAction.CREATE,
      details: `Escaneo de red ${scan.networkCidr} completado. ${results.discoveredHosts.length} hosts activos, ${newDevicesCount} nuevos dispositivos, ${missingDevicesCount} no detectados.`,
    });
  }

  // 3. List Scans
  async listScans() {
    return this.prisma.discoveryScan.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: {
        _count: {
          select: { hosts: true, changes: true },
        },
      },
    });
  }

  // 4. Get Scan Detail
  async getScan(id: string) {
    const scan = await this.prisma.discoveryScan.findUnique({
      where: { id },
      include: {
        hosts: {
          include: {
            ports: true,
            matchedMachine: true,
          },
          orderBy: { ip: 'asc' },
        },
        changes: {
          include: { machine: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!scan) throw new Error('Scan not found');
    return scan;
  }

  // 5. Get Scan Hosts
  async getScanHosts(id: string) {
    return this.prisma.discoveryHost.findMany({
      where: { scanId: id },
      include: {
        ports: true,
        matchedMachine: true,
      },
      orderBy: { ip: 'asc' },
    });
  }

  // 6. Get Scan Progress (Real-time)
  async getScanProgress(id: string) {
    const scan = await this.prisma.discoveryScan.findUnique({
      where: { id },
      select: {
        id: true,
        networkCidr: true,
        scanType: true,
        status: true,
        progress: true,
        totalHosts: true,
        scannedHosts: true,
        activeHosts: true,
        newDevices: true,
        changedDevices: true,
        missingDevices: true,
        startedAt: true,
        completedAt: true,
        durationMs: true,
        errorMessage: true,
      },
    });

    if (!scan) throw new Error('Scan not found');
    return scan;
  }

  // 7. Cancel Scan
  async cancelScan(id: string) {
    try {
      await fetch(`${this.discoveryUrl}/scan/${id}/cancel`, { method: 'POST' });
    } catch {
      // Remote cancel best-effort
    }

    return this.prisma.discoveryScan.update({
      where: { id },
      data: {
        status: ScanStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }

  // 8. List Changes
  async listChanges(query: DiscoveryChangeQueryInput) {
    const { scanId, changeType, status, page, limit } = query;
    const where: any = {};

    if (scanId) where.scanId = scanId;
    if (changeType && changeType !== 'ALL') where.changeType = changeType as DiscoveryChangeType;
    if (status) where.status = status as DiscoveryChangeStatus;

    const [total, items] = await Promise.all([
      this.prisma.discoveryChange.count({ where }),
      this.prisma.discoveryChange.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          machine: true,
          scan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // 9. Approve Change
  async approveChange(changeId: string) {
    const change = await this.prisma.discoveryChange.findUnique({ where: { id: changeId } });
    if (!change) throw new Error('Change not found');

    const updated = await this.prisma.discoveryChange.update({
      where: { id: changeId },
      data: { status: DiscoveryChangeStatus.APPROVED },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'DiscoveryChange',
      entityId: changeId,
      action: ChangeAction.UPDATE,
      details: `Aprobado cambio detectado: ${change.details}`,
      machineId: change.machineId || undefined,
    });

    return updated;
  }

  // 10. Ignore Change
  async ignoreChange(changeId: string) {
    const change = await this.prisma.discoveryChange.findUnique({ where: { id: changeId } });
    if (!change) throw new Error('Change not found');

    const updated = await this.prisma.discoveryChange.update({
      where: { id: changeId },
      data: { status: DiscoveryChangeStatus.IGNORED },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'DiscoveryChange',
      entityId: changeId,
      action: ChangeAction.UPDATE,
      details: `Ignorado cambio detectado: ${change.details}`,
      machineId: change.machineId || undefined,
    });

    return updated;
  }

  // 11. Import Discovered Host as New Machine in Inventory
  async importHost(hostId: string, data: ImportDiscoveredHostInput) {
    const host = await this.prisma.discoveryHost.findUnique({
      where: { id: hostId },
      include: { ports: true },
    });

    if (!host) throw new Error('Discovered host not found');

    // Create Machine in Inventory
    const machine = await this.prisma.machine.create({
      data: {
        hostname: data.hostname,
        type: data.type,
        status: MachineStatus.ONLINE,
        os: data.os || host.osGuess,
        manufacturer: data.manufacturer || host.vendor,
        model: data.model,
        primaryIp: host.ip,
        macAddress: host.macAddress,
        locationId: data.locationId,
        vlanId: data.vlanId,
        description: data.description || `Importado automáticamente desde Discovery Scan (${host.ip})`,
        lastDiscoveredAt: new Date(),
        interfaces: {
          create: {
            name: 'eth0',
            macAddress: host.macAddress,
            status: 'UP',
            vlanId: data.vlanId,
            ipAddresses: {
              create: {
                ip: host.ip,
                address: host.ip,
                isPrimary: true,
                status: 'ASSIGNED',
              },
            },
          },
        },
      },
    });

    // Create Ports & Services
    for (const p of host.ports) {
      let serviceId: string | null = null;
      if (p.serviceName) {
        const existingService = await this.prisma.service.findFirst({
          where: { name: p.serviceName },
        });
        if (existingService) {
          serviceId = existingService.id;
        }
      }

      await this.prisma.port.create({
        data: {
          machineId: machine.id,
          portNumber: p.portNumber,
          protocol: p.protocol,
          state: p.state,
          serviceId,
          description: p.banner ? `Banner: ${p.banner}` : undefined,
        },
      });
    }

    // Update DiscoveryHost reference
    await this.prisma.discoveryHost.update({
      where: { id: hostId },
      data: {
        matchedMachineId: machine.id,
        isNew: false,
      },
    });

    // Mark corresponding NEW_DEVICE change as APPLIED
    await this.prisma.discoveryChange.updateMany({
      where: {
        scanId: host.scanId,
        ip: host.ip,
        changeType: DiscoveryChangeType.NEW_DEVICE,
      },
      data: {
        status: DiscoveryChangeStatus.APPLIED,
        machineId: machine.id,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Machine',
      entityId: machine.id,
      action: ChangeAction.CREATE,
      details: `Host descubierto ${host.ip} incorporado al inventario como ${machine.hostname} (${machine.type})`,
      machineId: machine.id,
    });

    return machine;
  }
}

function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits = '32'] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);
    const ipToNum = (dotIp: string) =>
      dotIp.split('.').reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
    return (ipToNum(ip) & mask) === (ipToNum(range) & mask);
  } catch {
    return false;
  }
}
