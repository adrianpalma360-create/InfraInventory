import net from 'net';
import dns from 'dns';
import { execFile } from 'child_process';
import util from 'util';
import { DiscoveredPortInfo, HostStatus } from './types.js';
import { getServiceForPort } from './ports.js';

const execFileAsync = util.promisify(execFile);

export async function pingHost(
  ip: string,
  timeoutMs = 900
): Promise<{ isAlive: boolean; responseTimeMs?: number }> {
  const startTime = Date.now();
  try {
    await execFileAsync('ping', ['-c', '1', '-W', '1', '-w', '1', ip], {
      timeout: timeoutMs,
    });
    const responseTimeMs = Date.now() - startTime;
    return { isAlive: true, responseTimeMs };
  } catch {
    return { isAlive: false };
  }
}

export async function probePort(
  ip: string,
  port: number,
  timeoutMs = 600
): Promise<{ isOpen: boolean; banner?: string; responseTimeMs: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let isResolved = false;
    let banner = '';

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const responseTimeMs = Date.now() - startTime;
      
      // Probe for HTTP or SSH banner if port responds
      if (port === 22 || port === 21 || port === 25 || port === 110) {
        socket.once('data', (data) => {
          banner = data.toString('utf-8').replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, 100);
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve({ isOpen: true, banner, responseTimeMs });
          }
        });

        // Set a shorter timer for banner receipt
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve({ isOpen: true, banner: undefined, responseTimeMs });
          }
        }, 150);
      } else {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve({ isOpen: true, banner: undefined, responseTimeMs });
        }
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve({ isOpen: false, responseTimeMs: timeoutMs });
      }
    });

    socket.on('error', () => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve({ isOpen: false, responseTimeMs: Date.now() - startTime });
      }
    });

    try {
      socket.connect(port, ip);
    } catch {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve({ isOpen: false, responseTimeMs: timeoutMs });
      }
    }
  });
}

export async function resolveHostname(ip: string): Promise<string | undefined> {
  try {
    const hostnames = await dns.promises.reverse(ip);
    if (hostnames && hostnames.length > 0) {
      return hostnames[0];
    }
  } catch {
    // Reverse DNS resolution is optional and non-blocking
  }
  return undefined;
}

export async function probeHost(
  ip: string,
  portsToScan: number[],
  timeoutMs = 600
): Promise<{
  ip: string;
  status: HostStatus;
  hostname?: string;
  responseTimeMs?: number;
  ports: DiscoveredPortInfo[];
}> {
  const openPorts: DiscoveredPortInfo[] = [];
  let minResponseTime = Infinity;

  // 1. Run ICMP ping and TCP port scans concurrently
  const [pingResult, ...portResults] = await Promise.all([
    pingHost(ip, Math.max(timeoutMs, 800)),
    ...portsToScan.map(async (port) => {
      const res = await probePort(ip, port, timeoutMs);
      return { port, ...res };
    }),
  ]);

  if (pingResult.isAlive && pingResult.responseTimeMs) {
    minResponseTime = pingResult.responseTimeMs;
  }

  for (const r of portResults) {
    if (r.isOpen) {
      if (r.responseTimeMs < minResponseTime) {
        minResponseTime = r.responseTimeMs;
      }
      openPorts.push({
        portNumber: r.port,
        protocol: 'TCP',
        state: 'OPEN',
        serviceName: getServiceForPort(r.port),
        banner: r.banner,
      });
    }
  }

  // Host is ONLINE if either ICMP Ping responded OR any TCP port connected
  const isOnline = pingResult.isAlive || openPorts.length > 0;
  let hostname: string | undefined = undefined;

  if (isOnline) {
    hostname = await resolveHostname(ip);
  }

  return {
    ip,
    status: isOnline ? 'ONLINE' : 'OFFLINE',
    hostname,
    responseTimeMs: isOnline && minResponseTime !== Infinity ? minResponseTime : undefined,
    ports: openPorts,
  };
}
