import net from 'net';
import tls from 'tls';
import { DiscoveredPortInfo } from './types.js';
import { getServiceForPort } from './ports.js';

export interface TcpProbeResult {
  isOpen: boolean;
  banner?: string;
  responseTimeMs: number;
}

/**
 * Probe a single TCP port and attempt light banner grabbing
 */
export async function probeTcpPort(
  ip: string,
  port: number,
  timeoutMs = 600
): Promise<TcpProbeResult> {
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

      // Handle banner acquisition based on port protocol
      if (port === 22 || port === 21 || port === 23 || port === 25 || port === 110 || port === 143) {
        // Line-based text banner
        socket.once('data', (data) => {
          banner = data
            .toString('utf-8')
            .replace(/\0/g, '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
            .trim()
            .slice(0, 150);
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve({ isOpen: true, banner, responseTimeMs });
          }
        });

        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve({ isOpen: true, banner: undefined, responseTimeMs });
          }
        }, 150);
      } else if (port === 80 || port === 8080 || port === 8000 || port === 8006 || port === 9000 || port === 8123) {
        // Send a fast HTTP HEAD request to extract Server header
        try {
          socket.write(`HEAD / HTTP/1.0\r\nHost: ${ip}\r\nUser-Agent: InfraInventory-Discovery\r\n\r\n`);
          socket.once('data', (data) => {
            const text = data.toString('utf-8');
            const serverMatch = text.match(/Server:\s*([^\r\n]+)/i);
            const titleMatch = text.match(/<title>([^<]+)<\/title>/i);

            if (serverMatch) {
              banner = serverMatch[1].trim().slice(0, 100);
            } else if (titleMatch) {
              banner = titleMatch[1].trim().slice(0, 100);
            } else {
              banner = text.split('\r\n')[0]?.slice(0, 80);
            }

            if (port === 8006 && text.toLowerCase().includes('proxmox')) {
              banner = banner ? `Proxmox VE (${banner})` : 'Proxmox VE';
            }

            if (!isResolved) {
              isResolved = true;
              cleanup();
              resolve({ isOpen: true, banner, responseTimeMs });
            }
          });

          setTimeout(() => {
            if (!isResolved) {
              isResolved = true;
              cleanup();
              resolve({ isOpen: true, banner: undefined, responseTimeMs });
            }
          }, 200);
        } catch {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve({ isOpen: true, banner: undefined, responseTimeMs });
          }
        }
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

/**
 * Scan a list of ports on target IP
 */
export async function scanTcpPorts(
  ip: string,
  ports: number[],
  timeoutMs = 600
): Promise<DiscoveredPortInfo[]> {
  const openPorts: DiscoveredPortInfo[] = [];

  const results = await Promise.all(
    ports.map(async (port) => {
      const res = await probeTcpPort(ip, port, timeoutMs);
      return { port, ...res };
    })
  );

  for (const r of results) {
    if (r.isOpen) {
      openPorts.push({
        portNumber: r.port,
        protocol: 'TCP',
        state: 'OPEN',
        serviceName: getServiceForPort(r.port),
        banner: r.banner,
      });
    }
  }

  return openPorts;
}
