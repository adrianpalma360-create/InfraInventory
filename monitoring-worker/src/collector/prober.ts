import net from 'net';
import http from 'http';
import https from 'https';
import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

export async function pingHost(
  ip: string,
  timeoutMs = 1000
): Promise<{ isAlive: boolean; latencyMs?: number; packetLoss: number }> {
  const startTime = Date.now();
  try {
    // Ping 2 packets to estimate packet loss and latency
    await execFileAsync('ping', ['-c', '2', '-W', '1', '-w', '2', ip], {
      timeout: timeoutMs * 2,
    });
    const latencyMs = Math.max(1, (Date.now() - startTime) / 2);
    return { isAlive: true, latencyMs, packetLoss: 0 };
  } catch (err: any) {
    // Check if 1 packet made it or completely failed
    return { isAlive: false, packetLoss: 100 };
  }
}

export async function probePort(
  ip: string,
  port: number,
  timeoutMs = 800
): Promise<{ isOpen: boolean; responseTimeMs?: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let isResolved = false;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const responseTimeMs = Date.now() - startTime;
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve({ isOpen: true, responseTimeMs });
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve({ isOpen: false });
      }
    });

    socket.on('error', () => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve({ isOpen: false });
      }
    });

    try {
      socket.connect(port, ip);
    } catch {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve({ isOpen: false });
      }
    }
  });
}

export async function probeHttpService(
  ip: string,
  port: number,
  isSsl = false,
  timeoutMs = 1200
): Promise<{ isOk: boolean; statusCode?: number; responseTimeMs?: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = isSsl ? https : http;

    const req = client.get(
      {
        hostname: ip,
        port,
        path: '/',
        timeout: timeoutMs,
        rejectUnauthorized: false,
      },
      (res) => {
        const responseTimeMs = Date.now() - startTime;
        resolve({
          isOk: res.statusCode !== undefined && res.statusCode < 500,
          statusCode: res.statusCode,
          responseTimeMs,
        });
        res.resume(); // consume response data to free memory
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({ isOk: false });
    });

    req.on('error', () => {
      resolve({ isOk: false });
    });
  });
}
