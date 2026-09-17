import { execFile } from 'child_process';
import util from 'util';
import os from 'os';

const execFileAsync = util.promisify(execFile);

export interface IcmpResult {
  isAlive: boolean;
  responseTimeMs?: number;
}

/**
 * Perform ICMP ping on target IP with timeout handling
 */
export async function pingHost(ip: string, timeoutMs = 800): Promise<IcmpResult> {
  const startTime = Date.now();
  const isWindows = os.platform() === 'win32';

  const cmd = 'ping';
  const args = isWindows
    ? ['-n', '1', '-w', String(Math.max(200, timeoutMs)), ip]
    : ['-c', '1', '-W', String(Math.max(1, Math.ceil(timeoutMs / 1000))), ip];

  try {
    const { stdout } = await execFileAsync(cmd, args, {
      timeout: timeoutMs + 300,
    });

    const elapsed = Date.now() - startTime;

    // Check stdout indicators
    if (isWindows) {
      if (stdout.includes('TTL=') || stdout.includes('bytes=')) {
        // Extract time=Xms if possible
        const match = stdout.match(/time[<=](\d+)ms/i);
        const rtt = match ? parseInt(match[1], 10) : elapsed;
        return { isAlive: true, responseTimeMs: Math.max(1, rtt) };
      }
    } else {
      if (stdout.includes('1 packets transmitted, 1 received') || stdout.includes('1 received') || stdout.includes('ttl=')) {
        const match = stdout.match(/time=([\d.]+)\s*ms/i);
        const rtt = match ? Math.round(parseFloat(match[1])) : elapsed;
        return { isAlive: true, responseTimeMs: Math.max(1, rtt) };
      }
    }

    return { isAlive: false };
  } catch {
    return { isAlive: false };
  }
}
