export interface MonitoredMachine {
  id: string;
  hostname: string;
  primaryIp: string | null;
  type: string;
  group?: string | null;
  ports: {
    portNumber: number;
    protocol: 'TCP' | 'UDP';
    service?: {
      name: string;
    } | null;
  }[];
}

export interface ProbedServiceResult {
  serviceName: string;
  portNumber: number;
  protocol: 'TCP' | 'UDP';
  status: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  latencyMs?: number | null;
  responseTimeMs?: number | null;
  errorRate?: number;
  details?: string | null;
}

export interface MachineSampleResult {
  machineId: string;
  cpuUsage?: number | null;
  ramUsage?: number | null;
  diskUsage?: number | null;
  networkRxKbps?: number | null;
  networkTxKbps?: number | null;
  networkErrors?: number;
  latencyMs?: number | null;
  responseTimeMs?: number | null;
  errorRate?: number;
  activeConnections?: number;
  healthState?: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  timestamp: string;
  services: ProbedServiceResult[];
}
