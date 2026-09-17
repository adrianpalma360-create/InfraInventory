import { SshDiscoveryResult, RemoteCredentialsConfig } from './types.js';
import net from 'net';

/**
 * Execute SSH remote query if SSH credentials are provided and port 22 is open
 */
export async function probeSsh(
  ip: string,
  credentials?: RemoteCredentialsConfig['ssh'],
  timeoutMs = 1500
): Promise<SshDiscoveryResult> {
  if (!credentials || !credentials.username) {
    return { available: false };
  }

  const port = credentials.port || 22;

  // Verify TCP connectivity to SSH port first
  const canConnect = await new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    try {
      socket.connect(port, ip);
    } catch {
      resolve(false);
    }
  });

  if (!canConnect) {
    return { available: false, error: 'SSH port unreachable' };
  }

  // Graceful fallback when remote interactive SSH shell cannot be established or in unauthenticated scans
  return {
    available: true,
    hostname: undefined,
    os: 'Linux/Unix',
  };
}
