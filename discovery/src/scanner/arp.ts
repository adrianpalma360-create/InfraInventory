import fs from 'fs';
import { execFile } from 'child_process';
import util from 'util';
import os from 'os';

const execFileAsync = util.promisify(execFile);

export interface ArpResult {
  ip: string;
  macAddress?: string;
}

/**
 * Format raw MAC to standard AA:BB:CC:DD:EE:FF
 */
export function normalizeMac(rawMac: string): string | undefined {
  if (!rawMac) return undefined;
  const hexOnly = rawMac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (hexOnly.length !== 12) return undefined;
  if (hexOnly === '000000000000' || hexOnly === 'FFFFFFFFFFFF') {
    return undefined;
  }

  const parts = hexOnly.match(/.{1,2}/g);
  return parts ? parts.join(':') : undefined;
}

/**
 * Parse Linux /proc/net/arp
 */
export function getArpTableFromProc(): Map<string, string> {
  const table = new Map<string, string>();
  try {
    if (fs.existsSync('/proc/net/arp')) {
      const content = fs.readFileSync('/proc/net/arp', 'utf-8');
      const lines = content.split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const ip = parts[0];
          const mac = normalizeMac(parts[3]);
          if (ip && mac) {
            table.set(ip, mac);
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return table;
}

/**
 * Perform ARP lookup for an IP
 */
export async function lookupArp(ip: string, timeoutMs = 600): Promise<string | undefined> {
  // 1. Try reading /proc/net/arp
  const procTable = getArpTableFromProc();
  if (procTable.has(ip)) {
    return procTable.get(ip);
  }

  const isWindows = os.platform() === 'win32';

  // 2. Command lookup fallback
  try {
    if (isWindows) {
      const { stdout } = await execFileAsync('arp', ['-a', ip], { timeout: timeoutMs });
      const match = stdout.match(/([0-9a-f]{2}[:-][0-9a-f]{2}[:-][0-9a-f]{2}[:-][0-9a-f]{2}[:-][0-9a-f]{2}[:-][0-9a-f]{2})/i);
      if (match) {
        return normalizeMac(match[1]);
      }
    } else {
      // Try `ip neigh show <ip>`
      try {
        const { stdout } = await execFileAsync('ip', ['neigh', 'show', ip], { timeout: timeoutMs });
        const match = stdout.match(/lladdr\s+([0-9a-f:]{17})/i);
        if (match) {
          return normalizeMac(match[1]);
        }
      } catch {
        // Try `arp -an <ip>`
        const { stdout } = await execFileAsync('arp', ['-an', ip], { timeout: timeoutMs });
        const match = stdout.match(/([0-9a-f]{1,2}:[0-9a-f]{1,2}:[0-9a-f]{1,2}:[0-9a-f]{1,2}:[0-9a-f]{1,2}:[0-9a-f]{1,2})/i);
        if (match) {
          const parts = match[1].split(':').map((p) => p.padStart(2, '0')).join(':');
          return normalizeMac(parts);
        }
      }
    }
  } catch {
    // ARP lookup not fatal
  }

  return undefined;
}
