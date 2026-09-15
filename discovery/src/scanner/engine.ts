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
    const { scanId, cidr, scanType, concurrency = 20, timeoutMs = 600 } = options;

    const { ips } = parseCidr(cidr);
    const portsToScan = scanType === 'FULL' ? FULL_PORTS : BASIC_PORTS;

    const scanRecord: ScanProgress = {
      scanId,
      networkCidr: cidr,
      scanType,
      status: 'RUNNING',
      progress: 0,
      totalHosts: ips.length,
      scannedHosts: 0,
      activeHosts: 0,
      discoveredHosts: [],
      startedAt: new Date().toISOString(),
    };

    this.activeScans.set(scanId, scanRecord);

    // Run scan asynchronously in background worker
    this.runScanWorker(scanRecord, ips, portsToScan, concurrency, timeoutMs).catch((err) => {
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
    concurrency: number,
    timeoutMs: number
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
          const result = await probeHost(ip, portsToScan, timeoutMs);
          scan.scannedHosts++;
          scan.progress = Math.min(99, Math.round((scan.scannedHosts / scan.totalHosts) * 100));

          if (result.status === 'ONLINE') {
            scan.activeHosts++;
            discovered.push({
              ip: result.ip,
              hostname: result.hostname,
              status: 'ONLINE',
              responseTimeMs: result.responseTimeMs,
              ports: result.ports,
            });
            scan.discoveredHosts = [...discovered];
          }
        } catch {
          scan.scannedHosts++;
        }
      }
    };

    // Run parallel workers limited by concurrency
    const workers = Array.from({ length: Math.min(concurrency, ips.length) }, () => worker());
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
