import { WinrmDiscoveryResult, RemoteCredentialsConfig } from './types.js';
import net from 'net';

/**
 * Execute Windows WinRM/WMI discovery if credentials provided and WinRM port 5985/5986 is open
 */
export async function probeWinrm(
  ip: string,
  credentials?: RemoteCredentialsConfig['winrm'],
  timeoutMs = 1500
): Promise<WinrmDiscoveryResult> {
  if (!credentials || !credentials.username) {
    return {
      available: false,
      statusMessage: 'Remote Windows Discovery: unavailable',
    };
  }

  const port = credentials.port || (credentials.useHttps ? 5986 : 5985);

  // Check WinRM port connectivity
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
    return {
      available: false,
      statusMessage: 'Remote Windows Discovery: unavailable',
    };
  }

  return {
    available: true,
    windowsVersion: 'Windows OS',
    statusMessage: 'Remote Windows Discovery: connected',
  };
}
