export type ScanType = 'BASIC' | 'FULL';
export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type PortProtocol = 'TCP' | 'UDP';
export type PortState = 'OPEN' | 'CLOSED' | 'FILTERED';
export type HostStatus = 'ONLINE' | 'OFFLINE' | 'UNRESPONSIVE';

export interface DiscoveredPortInfo {
  portNumber: number;
  protocol: PortProtocol;
  state: PortState;
  serviceName?: string;
  banner?: string;
}

export interface DiscoveredHostResult {
  ip: string;
  macAddress?: string;
  hostname?: string;
  vendor?: string;
  osGuess?: string;
  status: HostStatus;
  responseTimeMs?: number;
  ports: DiscoveredPortInfo[];
}

export interface ScanProgress {
  scanId: string;
  networkCidr: string;
  scanType: ScanType;
  status: ScanStatus;
  progress: number; // 0 to 100
  totalHosts: number;
  scannedHosts: number;
  activeHosts: number;
  discoveredHosts: DiscoveredHostResult[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface StartScanOptions {
  scanId: string;
  cidr: string;
  scanType: ScanType;
  concurrency?: number;
  timeoutMs?: number;
}
