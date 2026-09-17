export type ScanType = 'BASIC' | 'FULL' | 'CUSTOM';
export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type PortProtocol = 'TCP' | 'UDP';
export type PortState = 'OPEN' | 'CLOSED' | 'FILTERED';
export type HostStatus = 'ONLINE' | 'OFFLINE' | 'UNRESPONSIVE';

export type DeviceType =
  | 'Server'
  | 'Workstation'
  | 'Laptop'
  | 'Router'
  | 'Firewall'
  | 'Switch'
  | 'Access Point'
  | 'Printer'
  | 'NAS'
  | 'Storage'
  | 'Virtualization Host'
  | 'Hypervisor'
  | 'Docker Host'
  | 'IoT'
  | 'Camera'
  | 'Unknown';

export interface DiscoveredPortInfo {
  portNumber: number;
  protocol: PortProtocol;
  state: PortState;
  serviceName?: string;
  banner?: string;
}

export interface SnmpInterfaceInfo {
  index: number;
  name: string;
  type?: string;
  speed?: string;
  macAddress?: string;
  adminStatus?: 'UP' | 'DOWN' | 'TESTING';
  operStatus?: 'UP' | 'DOWN' | 'TESTING' | 'UNKNOWN';
}

export interface SnmpDiscoveryResult {
  available: boolean;
  sysName?: string;
  sysDescr?: string;
  sysObjectID?: string;
  sysUpTime?: string;
  vendor?: string;
  model?: string;
  interfaces: SnmpInterfaceInfo[];
  error?: string;
}

export interface SshDiscoveryResult {
  available: boolean;
  hostname?: string;
  os?: string;
  kernel?: string;
  cpu?: string;
  ram?: string;
  disks?: Array<{ filesystem: string; size: string; used: string; mountedOn: string }>;
  interfaces?: string[];
  uptime?: string;
  error?: string;
}

export interface WinrmDiscoveryResult {
  available: boolean;
  hostname?: string;
  windowsVersion?: string;
  cpu?: string;
  ram?: string;
  disks?: Array<{ drive: string; size: string; free: string }>;
  interfaces?: string[];
  uptime?: string;
  domainWorkgroup?: string;
  services?: string[];
  statusMessage?: string;
  error?: string;
}

export interface DiscoveredHostResult {
  ip: string;
  macAddress?: string;
  hostname?: string;
  vendor?: string;
  osGuess?: string;
  deviceType: DeviceType;
  classificationReason?: string;
  status: HostStatus;
  responseTimeMs?: number;
  ports: DiscoveredPortInfo[];
  snmp?: SnmpDiscoveryResult;
  ssh?: SshDiscoveryResult;
  winrm?: WinrmDiscoveryResult;
  hardware?: {
    cpu?: string;
    ram?: string;
    disks?: string[];
  };
  methodsUsed: string[];
}

export interface DiscoveryMethodsConfig {
  icmp: boolean;
  arp: boolean;
  tcp: boolean;
  dns: boolean;
  snmp: boolean;
  ssh: boolean;
  winrm: boolean;
}

export interface SnmpConfig {
  version: 'v2c' | 'v3';
  community: string;
  port: number;
  timeoutMs: number;
  retries: number;
  v3User?: string;
  v3AuthPass?: string;
  v3PrivPass?: string;
  v3AuthProto?: 'MD5' | 'SHA';
  v3PrivProto?: 'DES' | 'AES';
}

export interface RemoteCredentialsConfig {
  ssh?: {
    username: string;
    password?: string;
    privateKey?: string;
    port?: number;
  };
  winrm?: {
    username: string;
    password?: string;
    port?: number;
    useHttps?: boolean;
  };
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
  newDevices: number;
  changedDevices: number;
  missingDevices: number;
  discoveredHosts: DiscoveredHostResult[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface StartScanOptions {
  scanId: string;
  cidr: string;
  scanType?: ScanType;
  customPorts?: number[];
  excludedIps?: string[];
  methods?: Partial<DiscoveryMethodsConfig>;
  snmp?: Partial<SnmpConfig>;
  credentials?: RemoteCredentialsConfig;
  concurrency?: number;
  timeoutMs?: number;
}
