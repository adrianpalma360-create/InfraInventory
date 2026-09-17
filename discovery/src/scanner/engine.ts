import { BASIC_PORTS, FULL_PORTS } from './ports.js';
import { parseCidr } from './cidr.js';
import { probeHost } from './prober.js';
import {
  DiscoveredHostResult,
  ScanProgress,
  StartScanOptions,
} from './types.js';

export class DiscoveryEngine {
  private activeScans = new Map<string, ScanProgress>();
  private cancelledScans = new Set<string>();

  getScan(scanId: string): ScanProgress | undefined {
    return this.activeScans.get(scanId);
  }

  getAllScans(): ScanProgress[] {
    return Array.from(this.activeScans.values());
  }

  cancelScan(scanId: string): boolean {
    const scan = this.activeScans.get(scanId);
    if (!scan || scan.status === 'COMPLETED' || scan.status === 'FAILED') {
      return false;
    }
    this.cancelledScans.add(scanId);
    scan.status = 'CANCELLED';
    scan.completedAt = new Date().toISOString();
    return true;
  }

  async startScan(options: StartScanOptions): Promise<ScanProgress> {
    const {
      scanId,
      cidr,
      scanType = 'BASIC',
      customPorts,
      excludedIps,
      methods,
      snmp,
      credentials,
      concurrency = 20,
      timeoutMs = 600,
    } = options;

    const { ips } = parseCidr(cidr, excludedIps);

    let portsToScan: number[];
    if (scanType === 'CUSTOM' && customPorts && customPorts.length > 0) {
      portsToScan = customPorts;
    } else if (scanType === 'FULL') {
      portsToScan = FULL_PORTS;
    } else {
      portsToScan = BASIC_PORTS;
    }

    const scanRecord: ScanProgress = {
      scanId,
      networkCidr: cidr,
      scanType,
      status: 'RUNNING',
      progress: 0,
      totalHosts: ips.length,
      scannedHosts: 0,
      activeHosts: 0,
      newDevices: 0,
      changedDevices: 0,
      missingDevices: 0,
      discoveredHosts: [],
      startedAt: new Date().toISOString(),
    };

    this.activeScans.set(scanId, scanRecord);

    // Run scan asynchronously in background worker
    this.runScanWorker(scanRecord, ips, portsToScan, {
      concurrency,
      timeoutMs,
      methods,
      snmp,
      credentials,
    }).catch((err) => {
      scanRecord.status = 'FAILED';
      scanRecord.errorMessage = err.message;
      scanRecord.completedAt = new Date().toISOString();
    });

    return scanRecord;
  }

  private async runScanWorker(
    scan: ScanProgress,
    ips: string[],
    portsToScan: number[],
    options: {
      concurrency: number;
      timeoutMs: number;
      methods?: any;
      snmp?: any;
      credentials?: any;
    }
  ) {
    const startTime = Date.now();
    const discovered: DiscoveredHostResult[] = [];
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < ips.length) {
        if (this.cancelledScans.has(scan.scanId)) {
          break;
        }

        const ip = ips[currentIndex++];
        try {
          const result = await probeHost(ip, {
            portsToScan,
            timeoutMs: options.timeoutMs,
            methods: options.methods,
            snmp: options.snmp,
            credentials: options.credentials,
          });

          scan.scannedHosts++;
          scan.progress = Math.min(
            99,
            Math.round((scan.scannedHosts / Math.max(1, scan.totalHosts)) * 100)
          );

          if (result && result.status === 'ONLINE') {
            scan.activeHosts++;
            discovered.push(result);
            scan.discoveredHosts = [...discovered];
          }
        } catch {
          scan.scannedHosts++;
        }
      }
    };

    // Run parallel workers limited by concurrency
    const actualConcurrency = Math.max(1, Math.min(options.concurrency, ips.length));
    const workers = Array.from({ length: actualConcurrency }, () => worker());
    await Promise.all(workers);

    if (this.cancelledScans.has(scan.scanId)) {
      scan.status = 'CANCELLED';
      this.cancelledScans.delete(scan.scanId);
    } else {
      scan.status = 'COMPLETED';
      scan.progress = 100;
    }

    scan.completedAt = new Date().toISOString();
    scan.durationMs = Date.now() - startTime;
  }
}

export const discoveryEngine = new DiscoveryEngine();
