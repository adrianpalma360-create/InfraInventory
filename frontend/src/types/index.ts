export type MachineType =
  | 'PHYSICAL_SERVER'
  | 'VIRTUAL_SERVER'
  | 'PC'
  | 'LAPTOP'
  | 'ROUTER'
  | 'SWITCH'
  | 'FIREWALL'
  | 'NAS'
  | 'PRINTER'
  | 'VM'
  | 'OTHER';

export type MachineStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'UNCHECKED';

export type PortProtocol = 'TCP' | 'UDP';
export type PortState = 'OPEN' | 'CLOSED' | 'FILTERED';
export type ChangeAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type IPStatus = 'FREE' | 'ASSIGNED' | 'RESERVED' | 'DHCP' | 'CONFLICT' | 'UNKNOWN';

export type LocationType =
  | 'COMPANY'
  | 'OFFICE'
  | 'DATACENTER'
  | 'ROOM'
  | 'RACK'
  | 'WAREHOUSE'
  | 'REMOTE'
  | 'OTHER';

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  _count?: {
    machines: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface MachineTag {
  machineId: string;
  tagId: string;
  tag: Tag;
}

export interface Location {
  id: string;
  name: string;
  description?: string | null;
  type: LocationType;
  parentId?: string | null;
  parent?: Location | null;
  children?: Location[];
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  rack?: string | null;
  machines?: Machine[];
  networks?: Network[];
  vlans?: VLAN[];
  _count?: {
    machines: number;
    networks: number;
    vlans: number;
    children: number;
  };
  stats?: {
    totalMachines: number;
    onlineCount: number;
    warningCount: number;
    offlineCount: number;
    uncheckedCount: number;
    totalServices: number;
    openIncidentsCount: number;
    availability: number;
  };
  incidents?: MetricAnomaly[];
  createdAt: string;
  updatedAt: string;
}

export interface Network {
  id: string;
  name: string;
  cidr: string;
  networkAddress?: string | null;
  broadcastAddress?: string | null;
  gateway?: string | null;
  dns?: string | null;
  description?: string | null;
  vlanId?: string | null;
  vlan?: VLAN | null;
  vlans?: VLAN[];
  locationId?: string | null;
  location?: Location | null;
  dhcpEnabled?: boolean;
  dhcpStart?: string | null;
  dhcpEnd?: string | null;
  ipAddresses?: IPAddress[];
  calculation?: SubnetCalculationResult;
  stats?: {
    totalAddresses: number;
    usableAddresses: number;
    assignedCount: number;
    reservedCount: number;
    dhcpCount: number;
    conflictCount: number;
    freeCount: number;
    usagePercentage: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VLAN {
  id: string;
  vlanId: number;
  name: string;
  description?: string | null;
  networkId?: string | null;
  network?: Network | null;
  locationId?: string | null;
  location?: Location | null;
  machines?: Machine[];
  interfaces?: NetworkInterface[];
  _count?: {
    machines: number;
    interfaces: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IPAddress {
  id: string;
  address: string;
  ip: string;
  version: 'IPv4' | 'IPv6';
  status: IPStatus;
  hostname?: string | null;
  macAddress?: string | null;
  isPrimary: boolean;
  subnet?: string | null;
  description?: string | null;
  machineId?: string | null;
  machine?: Machine | null;
  interfaceId?: string | null;
  interface?: NetworkInterface | null;
  networkId?: string | null;
  network?: Network | null;
  lastChecked?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubnetCalculationResult {
  cidr: string;
  ip: string;
  prefix: number;
  version: 'IPv4' | 'IPv6';
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  wildcardMask: string;
  firstUsableIp: string;
  lastUsableIp: string;
  gateway: string;
  totalAddresses: number;
  usableAddresses: number;
  isPrivate: boolean;
  ipClass?: string;
}

export interface IPConflict {
  ip: string;
  count: number;
  machines: Array<{
    id: string;
    hostname: string;
    primaryIp: string | null;
    status: string;
  }>;
  interfaces: Array<{
    id: string;
    name: string;
    macAddress: string | null;
    machineName: string;
  }>;
  message: string;
}

export interface IpamStats {
  totalNetworks: number;
  totalVlans: number;
  totalIps: number;
  assignedIps: number;
  reservedIps: number;
  dhcpIps: number;
  freeIps: number;
  conflictIps: number;
  conflicts: IPConflict[];
}

export interface NetworkInterface {
  id: string;
  name: string;
  macAddress?: string | null;
  speed?: string | null;
  status?: string | null;
  description?: string | null;
  machineId: string;
  machine?: Machine | null;
  vlanId?: string | null;
  vlan?: VLAN | null;
  ipAddresses?: IPAddress[];
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  defaultPort?: number | null;
  protocol?: string | null;
  version?: string | null;
  description?: string | null;
  ports?: Port[];
  createdAt: string;
  updatedAt: string;
}

export interface Port {
  id: string;
  portNumber: number;
  protocol: PortProtocol;
  state: PortState;
  description?: string | null;
  machineId: string;
  machine?: Machine | null;
  serviceId?: string | null;
  service?: Service | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeLog {
  id: string;
  entityType: string;
  entityId: string;
  action: ChangeAction;
  details: string;
  user: string;
  machineId?: string | null;
  machine?: { id: string; hostname: string; primaryIp?: string | null } | null;
  createdAt: string;
}

export type HealthState = 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';

export interface Machine {
  id: string;
  hostname: string;
  type: MachineType;
  status: MachineStatus;
  group?: string | null;
  os?: string | null;
  osVersion?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  description?: string | null;
  primaryIp?: string | null;
  macAddress?: string | null;
  gateway?: string | null;
  dns?: string | null;
  locationId?: string | null;
  location?: Location | null;
  vlanId?: string | null;
  vlan?: VLAN | null;
  tags?: MachineTag[];
  interfaces?: NetworkInterface[];
  ipAddresses?: IPAddress[];
  ports?: Port[];
  metricAnomalies?: MetricAnomaly[];
  changeLogs?: ChangeLog[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  metrics: {
    totalMachines: number;
    totalIPs: number;
    totalServices: number;
    totalPorts: number;
    totalChanges: number;
    totalNetworks: number;
    totalVlans: number;
    totalLocations: number;
    totalTags: number;
  };
  ipamSummary?: {
    totalNetworks: number;
    totalVlans: number;
    assignedIps: number;
    freeIps: number;
    conflictIps: number;
  };
  locationsSummary?: {
    totalLocations: number;
    totalMachines: number;
  };
  incidentsSummary?: {
    critical: number;
    warning: number;
    total: number;
  };
  statusDistribution: {
    online: number;
    warning: number;
    offline: number;
    unchecked: number;
  };
  availableTags?: Tag[];
  activeTagFilter?: string | null;
  lastScan?: DiscoveryScan | null;
  recentMachines: Machine[];
  recentChanges: ChangeLog[];
}

export type ScanType = 'BASIC' | 'FULL';
export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type HostStatus = 'ONLINE' | 'OFFLINE' | 'UNRESPONSIVE';

export type DiscoveryChangeType =
  | 'NEW_DEVICE'
  | 'IP_CHANGED'
  | 'NEW_PORT'
  | 'PORT_CLOSED'
  | 'SERVICE_MODIFIED'
  | 'DEVICE_OFFLINE'
  | 'DEVICE_NOT_DETECTED';

export type DiscoveryChangeStatus = 'PENDING' | 'APPROVED' | 'IGNORED' | 'APPLIED';

export interface DiscoveredPort {
  id: string;
  hostId: string;
  portNumber: number;
  protocol: PortProtocol;
  state: PortState;
  serviceName?: string | null;
  banner?: string | null;
  createdAt: string;
}

export interface DiscoveryHost {
  id: string;
  scanId: string;
  ip: string;
  macAddress?: string | null;
  hostname?: string | null;
  vendor?: string | null;
  osGuess?: string | null;
  status: HostStatus;
  responseTimeMs?: number | null;
  isNew: boolean;
  matchedMachineId?: string | null;
  matchedMachine?: Machine | null;
  ports: DiscoveredPort[];
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryChange {
  id: string;
  scanId: string;
  scan?: DiscoveryScan | null;
  changeType: DiscoveryChangeType;
  status: DiscoveryChangeStatus;
  ip: string;
  hostname?: string | null;
  machineId?: string | null;
  machine?: Machine | null;
  details: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryScan {
  id: string;
  networkCidr: string;
  scanType: ScanType;
  status: ScanStatus;
  progress: number;
  totalHosts: number;
  scannedHosts: number;
  activeHosts: number;
  newDevices: number;
  changedDevices: number;
  missingDevices: number;
  startedAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
  errorMessage?: string | null;
  hosts?: DiscoveryHost[];
  changes?: DiscoveryChange[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  token?: string;
  user?: User;
  permissions?: Permission[];
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type Role = 'ADMIN' | 'TECHNICIAN' | 'VIEWER';

export type Permission =
  | 'MACHINE_READ'
  | 'MACHINE_CREATE'
  | 'MACHINE_UPDATE'
  | 'MACHINE_DELETE'
  | 'NETWORK_READ'
  | 'NETWORK_CREATE'
  | 'NETWORK_UPDATE'
  | 'NETWORK_DELETE'
  | 'PORT_READ'
  | 'PORT_CREATE'
  | 'PORT_UPDATE'
  | 'PORT_DELETE'
  | 'SERVICE_READ'
  | 'SERVICE_CREATE'
  | 'SERVICE_UPDATE'
  | 'SERVICE_DELETE'
  | 'LOCATION_READ'
  | 'LOCATION_CREATE'
  | 'LOCATION_UPDATE'
  | 'LOCATION_DELETE'
  | 'DISCOVERY_READ'
  | 'DISCOVERY_RUN'
  | 'DISCOVERY_IMPORT'
  | 'CHANGE_READ'
  | 'USER_READ'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'SETTINGS_READ'
  | 'SETTINGS_UPDATE'
  | 'METRICS_READ'
  | 'METRICS_CONFIG'
  | 'MONITORING_UPDATE'
  | 'TAG_READ'
  | 'TAG_CREATE'
  | 'TAG_UPDATE'
  | 'TAG_DELETE'
  | 'IPAM_READ'
  | 'IPAM_MANAGE'
  | 'IPAM_IMPORT'
  | 'IPAM_EXPORT'
  | 'TOPOLOGY_READ'
  | 'TOPOLOGY_CREATE'
  | 'TOPOLOGY_UPDATE'
  | 'TOPOLOGY_DELETE'
  | 'TOPOLOGY_EXPORT'
  | 'TOPOLOGY_IMPORT'
  | 'ASSET_READ'
  | 'ASSET_CREATE'
  | 'ASSET_UPDATE'
  | 'ASSET_DELETE'
  | 'ASSET_EXPORT'
  | 'ASSET_IMPORT'
  | 'LICENSE_READ'
  | 'LICENSE_MANAGE'
  | 'LICENSE_REVEAL'
  | 'SUPPLIER_MANAGE'
  | 'PURCHASE_MANAGE'
  | 'WARRANTY_MANAGE'
  | 'SOFTWARE_MANAGE'
  // V9 Operational Management
  | 'TICKET_READ'
  | 'TICKET_CREATE'
  | 'TICKET_UPDATE'
  | 'TICKET_DELETE'
  | 'TICKET_EXPORT'
  | 'SLA_READ'
  | 'SLA_MANAGE'
  | 'MAINTENANCE_READ'
  | 'MAINTENANCE_MANAGE'
  | 'MAINTENANCE_EXPORT'
  | 'TASK_READ'
  | 'TASK_MANAGE'
  | 'CHANGE_MANAGE'
  | 'CHANGE_APPROVE'
  | 'CHANGE_EXPORT'
  | 'RUNBOOK_READ'
  | 'RUNBOOK_MANAGE'
  | 'OPERATIONS_READ'
  // V10 AI Assistant
  | 'AI_CHAT'
  | 'AI_ANALYZE'
  | 'AI_CONFIG'
  // V11 Automation & Workflows
  | 'AUTOMATION_READ'
  | 'AUTOMATION_EXECUTE'
  | 'AUTOMATION_APPROVE'
  | 'AUTOMATION_MANAGE'
  | 'AGENT_READ'
  | 'AGENT_MANAGE';

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SystemSettings {
  organizationName: string;
  primarySubnet: string;
  discoveryTimeoutMs: number;
  discoveryConcurrency: number;
  sessionExpiryDays: number;
  enableAuditLogs: boolean;
  auditRetentionDays: number;
}

export type ChartPeriod = 'realtime' | '5m' | '15m' | '1h' | '6h' | '24h' | '7d' | '30d';

export interface MetricSample {
  id: string;
  machineId: string;
  hostname?: string;
  group?: string | null;
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
  healthState: HealthState;
  timestamp: string;
}

export interface HistoricalPoint {
  timestamp: string;
  timeLabel: string;
  cpuUsage: number | null;
  cpuMax?: number | null;
  ramUsage: number | null;
  diskUsage: number | null;
  networkRxKbps: number | null;
  networkTxKbps: number | null;
  networkErrors: number;
  latencyMs: number | null;
  responseTimeMs: number | null;
  errorRate: number;
  activeConnections: number;
  samplesCount: number;
}

export interface HistoricalMetricsData {
  period: ChartPeriod;
  bucketSeconds: number;
  pointsCount: number;
  data: HistoricalPoint[];
}

export interface MetricValueCard {
  value: number | null;
  unit: string;
  trend?: 'RISING' | 'FALLING' | 'STEADY';
}

export interface RealtimeSummary {
  machineId: string;
  hostname: string;
  group?: string | null;
  timestamp: string;
  healthState: HealthState;
  cpu: MetricValueCard;
  ram: MetricValueCard;
  disk: MetricValueCard;
  latency: MetricValueCard;
  responseTime: MetricValueCard;
  networkRx: MetricValueCard;
  networkTx: MetricValueCard;
  networkErrors: MetricValueCard;
  errorRate: MetricValueCard;
  connections: MetricValueCard;
}

export interface ServiceCheck {
  id: string;
  machineId: string;
  serviceName: string;
  portNumber: number;
  protocol: PortProtocol;
  status: HealthState;
  latencyMs?: number | null;
  responseTimeMs?: number | null;
  errorRate?: number;
  details?: string | null;
  lastChecked: string;
  machine?: {
    id: string;
    hostname: string;
    primaryIp?: string | null;
    group?: string | null;
  };
}

export interface MetricAnomaly {
  id: string;
  machineId: string;
  metricType: string;
  currentValue: number;
  expectedMean: number;
  standardDeviation: number;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  isResolved: boolean;
  detectedAt: string;
  resolvedAt?: string | null;
  machine?: {
    id: string;
    hostname: string;
    group?: string | null;
  };
}

export interface MachineGroupSummary {
  name: string;
  totalMachines: number;
  onlineCount: number;
  offlineCount: number;
  avgCpu: number | null;
  avgRam: number | null;
  avgLatency: number | null;
}

export interface MonitoringProblem {
  id: string;
  type: 'ANOMALY' | 'SERVICE_OUTAGE' | 'HOST_OFFLINE' | 'PORT_CLOSED';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  hostname: string;
  machineId?: string;
  timestamp: string;
  anomalyId?: string;
  isResolved?: boolean;
}

export interface MonitoringHostStatus {
  id: string;
  hostname: string;
  primaryIp?: string | null;
  group: string;
  status: MachineStatus;
  healthState: HealthState;
  cpuUsage: number | null;
  ramUsage: number | null;
  diskUsage: number | null;
  latencyMs: number | null;
  lastSeen: string;
}

export interface MonitoringOverviewData {
  overview: {
    totalMachines: number;
    healthyCount: number;
    warningCount: number;
    degradedCount: number;
    criticalCount: number;
    offlineCount: number;
    totalServices: number;
    servicesUp: number;
    servicesWarning: number;
    servicesDegraded: number;
    servicesDown: number;
    totalPorts: number;
    portsOpen: number;
    portsClosed: number;
    portsFiltered: number;
    activeProblemsCount: number;
  };
  hostStatuses: MonitoringHostStatus[];
  serviceChecks: ServiceCheck[];
  ports: Port[];
  problems: MonitoringProblem[];
  anomalies: MetricAnomaly[];
}

export interface MonitoringConfig {
  id: string;
  checkIntervalSec: number;
  retentionDays: number;
  enableAnomalies: boolean;
  thresholdCpuWarn: number;
  thresholdCpuCrit: number;
  thresholdRamWarn: number;
  thresholdRamCrit: number;
  thresholdDiskWarn: number;
  thresholdDiskCrit: number;
  thresholdLatencyWarn: number;
  thresholdLatencyCrit: number;
  updatedAt: string;
}

// ====================================================
// V7 TOPOLOGY & INFRASTRUCTURE MAP TYPES
// ====================================================

export type TopologyNodeType =
  | 'INTERNET'
  | 'ROUTER'
  | 'FIREWALL'
  | 'SWITCH'
  | 'ACCESS_POINT'
  | 'SERVER'
  | 'WORKSTATION'
  | 'NAS'
  | 'VM'
  | 'CONTAINER'
  | 'NETWORK'
  | 'VLAN'
  | 'PRINTER'
  | 'STORAGE'
  | 'UPS'
  | 'PHONE'
  | 'OTHER';

export type TopologyConnectionType =
  | 'ETHERNET'
  | 'FIBER'
  | 'WIFI'
  | 'VPN'
  | 'VLAN'
  | 'LOGICAL'
  | 'OTHER';

export interface TopologyNode {
  id: string;
  topologyId: string;
  nodeType: TopologyNodeType;
  label: string;
  positionX: number;
  positionY: number;
  machineId?: string | null;
  machine?: Machine | null;
  networkId?: string | null;
  network?: Network | null;
  vlanId?: string | null;
  vlan?: VLAN | null;
  locationId?: string | null;
  location?: Location | null;
  customIcon?: string | null;
  statusOverride?: string | null;
  computedStatus?: string;
  activeIncidentsCount?: number;
  lastMetrics?: any;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TopologyEdge {
  id: string;
  topologyId: string;
  sourceNodeId: string;
  sourceNode?: TopologyNode;
  targetNodeId: string;
  targetNode?: TopologyNode;
  connectionType: TopologyConnectionType;
  label?: string | null;
  sourceInterfaceId?: string | null;
  sourceInterface?: NetworkInterface | null;
  targetInterfaceId?: string | null;
  targetInterface?: NetworkInterface | null;
  speed?: string | null;
  status?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Topology {
  id: string;
  name: string;
  description?: string | null;
  groupId?: string | null;
  locationId?: string | null;
  tagId?: string | null;
  isDefault?: boolean;
  metadata?: Record<string, any> | null;
  nodes?: TopologyNode[];
  edges?: TopologyEdge[];
  _count?: {
    nodes: number;
    edges: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TopologyStatusSummary {
  topologyId: string;
  name: string;
  totalNodes: number;
  totalEdges: number;
  online: number;
  warning: number;
  critical: number;
  down: number;
  unknown: number;
  totalIncidents: number;
}

// ====================================================
// V8 ASSET MANAGEMENT, HARDWARE, WARRANTIES & LICENSES
// ====================================================

export type AssetType =
  | 'SERVER'
  | 'WORKSTATION'
  | 'LAPTOP'
  | 'ROUTER'
  | 'SWITCH'
  | 'FIREWALL'
  | 'ACCESS_POINT'
  | 'STORAGE'
  | 'PRINTER'
  | 'MONITOR'
  | 'PHONE'
  | 'UPS'
  | 'PERIPHERAL'
  | 'OTHER';

export type AssetStatus =
  | 'IN_USE'
  | 'IN_STOCK'
  | 'IN_REPAIR'
  | 'DECOMMISSIONED'
  | 'RESERVED'
  | 'DISPOSED'
  | 'LOST';

export type HardwareComponentType =
  | 'CPU'
  | 'RAM'
  | 'DISK'
  | 'NIC'
  | 'GPU'
  | 'POWER_SUPPLY'
  | 'MOTHERBOARD'
  | 'FAN'
  | 'CONTROLLER'
  | 'OTHER';

export type DiskHealthStatus = 'GOOD' | 'WARNING' | 'CRITICAL' | 'FAILED' | 'UNKNOWN';

export type WarrantyType = 'MANUFACTURER' | 'EXTENDED' | 'ON_SITE' | 'REPLACEMENT' | 'SUPPORT_ONLY';

export type LicenseType =
  | 'PERPETUAL'
  | 'SUBSCRIPTION'
  | 'PER_USER'
  | 'PER_DEVICE'
  | 'PER_CORE'
  | 'SITE'
  | 'OEM'
  | 'OPEN_SOURCE'
  | 'FREE';

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
  portalUrl?: string | null;
  notes?: string | null;
  assets?: Asset[];
  purchases?: Purchase[];
  warranties?: Warranty[];
  licenses?: License[];
  _count?: {
    assets: number;
    purchases: number;
    warranties: number;
    licenses: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  assetType?: AssetType | null;
  assetId?: string | null;
  asset?: Asset | null;
  licenseId?: string | null;
  license?: License | null;
  createdAt: string;
}

export interface Purchase {
  id: string;
  orderNumber: string;
  purchaseDate: string;
  supplierId?: string | null;
  supplier?: Supplier | null;
  invoiceNumber?: string | null;
  totalCost: number;
  currency: string;
  status: string;
  notes?: string | null;
  items?: PurchaseItem[];
  assets?: Asset[];
  licenses?: License[];
  _count?: {
    items: number;
    assets: number;
    licenses: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HardwareComponent {
  id: string;
  assetId: string;
  asset?: Asset;
  type: HardwareComponentType;
  model?: string | null;
  manufacturer?: string | null;
  serialNumber?: string | null;
  capacity?: string | null;
  speed?: string | null;
  slot?: string | null;
  diskHealth?: DiskHealthStatus | null;
  smartStatus?: string | null;
  temperatureC?: number | null;
  powerOnHours?: number | null;
  details?: Record<string, any> | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Warranty {
  id: string;
  assetId?: string | null;
  asset?: Asset | null;
  supplierId?: string | null;
  supplier?: Supplier | null;
  warrantyType: WarrantyType;
  provider: string;
  contractNumber?: string | null;
  startDate: string;
  endDate: string;
  supportTier?: string | null;
  slaResponseHours?: number | null;
  notes?: string | null;
  status?: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
  daysRemaining?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseAssignment {
  id: string;
  licenseId: string;
  license?: License;
  machineId?: string | null;
  machine?: Machine | null;
  assetId?: string | null;
  asset?: Asset | null;
  userId?: string | null;
  user?: User | null;
  assignedUser?: string | null;
  assignedAt: string;
  notes?: string | null;
}

export interface License {
  id: string;
  name: string;
  publisher: string;
  version?: string | null;
  licenseType: LicenseType;
  licenseKey?: string | null;
  isKeyEncrypted: boolean;
  totalSeats: number;
  usedSeats: number;
  isUnlimited: boolean;
  purchaseDate?: string | null;
  expirationDate?: string | null;
  cost?: number | null;
  currency: string;
  orderNumber?: string | null;
  supplierId?: string | null;
  supplier?: Supplier | null;
  purchaseId?: string | null;
  purchase?: Purchase | null;
  notes?: string | null;
  assignments?: LicenseAssignment[];
  softwareId?: string | null;
  software?: Software | null;
  _count?: {
    assignments: number;
  };
  status?: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
  isOverallocated?: boolean;
  availableSeats?: number;
  daysRemaining?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Software {
  id: string;
  name: string;
  vendor?: string | null;
  category?: string | null;
  latestVersion?: string | null;
  description?: string | null;
  licenses?: License[];
  assetSoftwares?: AssetSoftware[];
  _count?: {
    licenses: number;
    assetSoftwares: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AssetSoftware {
  id: string;
  assetId: string;
  asset?: Asset;
  machineId?: string | null;
  machine?: Machine | null;
  softwareId: string;
  software: Software;
  installedVersion?: string | null;
  installDate?: string | null;
  isCompliant: boolean;
  createdAt: string;
}

export interface AssetDocument {
  id: string;
  assetId: string;
  name: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  documentType: string;
  uploadedAt: string;
}

export interface AssetHistory {
  id: string;
  assetId: string;
  eventType: string;
  description: string;
  performedBy?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  barcode?: string | null;
  qrCode?: string | null;
  assignedUser?: string | null;
  assignedDepartment?: string | null;
  locationId?: string | null;
  location?: Location | null;
  rackUnit?: number | null;
  rackHeightU?: number | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  currency: string;
  currentValue?: number | null;
  depreciationYears?: number | null;
  supplierId?: string | null;
  supplier?: Supplier | null;
  purchaseId?: string | null;
  purchase?: Purchase | null;
  machineId?: string | null;
  machine?: Machine | null;
  notes?: string | null;
  customFields?: Record<string, any> | null;
  hardware?: HardwareComponent[];
  warranties?: Warranty[];
  licenses?: LicenseAssignment[];
  software?: AssetSoftware[];
  documents?: AssetDocument[];
  history?: AssetHistory[];
  _count?: {
    hardware: number;
    warranties: number;
    licenses: number;
    software: number;
    documents: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AssetStats {
  totalAssets: number;
  totalCost: number;
  totalCurrentValue: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byLocation: Array<{ locationName: string; count: number; totalCost: number }>;
  warrantiesSummary: {
    total: number;
    active: number;
    expiring30Days: number;
    expiring90Days: number;
    expired: number;
  };
  licensesSummary: {
    total: number;
    active: number;
    expiring30Days: number;
    expired: number;
    overallocated: number;
    totalSeats: number;
    usedSeats: number;
  };
}

export interface RackUnitSlot {
  unit: number;
  asset: Asset | null;
  isOccupied: boolean;
  isHead: boolean;
}

export interface RackView {
  rackLocation: Location;
  totalUnits: number;
  occupiedUnits: number;
  freeUnits: number;
  units: RackUnitSlot[];
}

// ====================================================
// V9 OPERATIONAL MANAGEMENT, TICKETS, SLA, MAINTENANCE, TASKS, CHANGES, RUNBOOKS
// ====================================================

export type TicketType =
  | 'INCIDENT'
  | 'REQUEST'
  | 'TASK'
  | 'MAINTENANCE'
  | 'CHANGE'
  | 'QUESTION'
  | 'OTHER';

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'PENDING'
  | 'WAITING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';

export type SlaStatus = 'ON_TRACK' | 'WARNING' | 'BREACHED' | 'PAUSED';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'SCHEDULED' | 'EMERGENCY';

export type MaintenanceStatus = 'PLANNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';

export type ChangeRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ChangeImpact = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ChangeStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'CANCELLED';

export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'PENDING';

export interface SLA {
  id: string;
  name: string;
  description?: string | null;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  priority: TicketPriority;
  enabled: boolean;
  businessHoursOnly: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  _count?: {
    tickets: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId?: string | null;
  user?: { id: string; username: string; name: string } | null;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketHistory {
  id: string;
  ticketId: string;
  userId?: string | null;
  user?: { id: string; username: string; name: string } | null;
  userName: string;
  action: string;
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  details: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  createdById?: string | null;
  creator?: User | null;
  assignedToId?: string | null;
  assignee?: User | null;
  requesterId?: string | null;
  requester?: User | null;
  requesterEmail?: string | null;
  assetId?: string | null;
  asset?: Asset | null;
  machineId?: string | null;
  machine?: Machine | null;
  incidentId?: string | null;
  incident?: any | null;
  locationId?: string | null;
  location?: Location | null;
  group?: string | null;
  serviceName?: string | null;
  portNumber?: number | null;
  slaId?: string | null;
  sla?: SLA | null;
  slaStatus: SlaStatus;
  responseDue?: string | null;
  firstRespondedAt?: string | null;
  resolutionDue?: string | null;
  dueDate?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  comments?: TicketComment[];
  history?: TicketHistory[];
  tasks?: OperationalTask[];
  _count?: {
    comments: number;
    tasks: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceChecklistItem {
  id: string;
  maintenanceId: string;
  itemOrder: number;
  description: string;
  isCompleted: boolean;
  completedBy?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceWindow {
  id: string;
  name: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  createdById?: string | null;
  creator?: User | null;
  machineId?: string | null;
  machine?: Machine | null;
  locationId?: string | null;
  location?: Location | null;
  group?: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Maintenance {
  id: string;
  title: string;
  description?: string | null;
  type: MaintenanceType;
  status: MaintenanceStatus;
  assetId?: string | null;
  asset?: Asset | null;
  machineId?: string | null;
  machine?: Machine | null;
  locationId?: string | null;
  location?: Location | null;
  assignedToId?: string | null;
  assignee?: User | null;
  createdById?: string | null;
  creator?: User | null;
  windowId?: string | null;
  window?: MaintenanceWindow | null;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  isRecurring: boolean;
  recurrenceRule?: string | null;
  suppressAlerts: boolean;
  notes?: string | null;
  runbookId?: string | null;
  runbook?: Runbook | null;
  tasks?: OperationalTask[];
  checklists?: MaintenanceChecklistItem[];
  _count?: {
    tasks: number;
    checklists: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OperationalTask {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TicketPriority;
  assignedToId?: string | null;
  assignee?: User | null;
  ticketId?: string | null;
  ticket?: Ticket | null;
  maintenanceId?: string | null;
  maintenance?: Maintenance | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeApproval {
  id: string;
  changeId: string;
  userId?: string | null;
  user?: User | null;
  userName: string;
  decision: ApprovalDecision;
  comments?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

export interface InfraChange {
  id: string;
  changeNumber: string;
  title: string;
  description: string;
  reason?: string | null;
  risk: ChangeRisk;
  impact: ChangeImpact;
  status: ChangeStatus;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  requesterId?: string | null;
  requester?: User | null;
  approverId?: string | null;
  approver?: User | null;
  executorId?: string | null;
  executor?: User | null;
  machineId?: string | null;
  machine?: Machine | null;
  assetId?: string | null;
  asset?: Asset | null;
  locationId?: string | null;
  location?: Location | null;
  rollbackPlan?: string | null;
  validationPlan?: string | null;
  affectedItems?: string | null;
  runbookId?: string | null;
  runbook?: Runbook | null;
  approvals?: ChangeApproval[];
  createdAt: string;
  updatedAt: string;
}

export interface RunbookStep {
  id: string;
  runbookId: string;
  stepOrder: number;
  title: string;
  description?: string | null;
  isRequired: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Runbook {
  id: string;
  name: string;
  description?: string | null;
  category?: string;
  version: string;
  content?: string | null;
  createdById?: string | null;
  creator?: User | null;
  steps?: RunbookStep[];
  _count?: {
    steps: number;
    maintenances: number;
    changes: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OperationsStats {
  tickets: {
    open: number;
    critical: number;
    unassigned: number;
    slaBreached: number;
    slaWarning: number;
  };
  maintenances: {
    today: number;
    upcoming: number;
  };
  changes: {
    pendingApproval: number;
    scheduled: number;
  };
  tasks: {
    pending: number;
    overdue: number;
  };
  recentTickets: Ticket[];
  upcomingMaintenances: Maintenance[];
  pendingChanges: InfraChange[];
  activeSlas: SLA[];
}

export interface CalendarEvent {
  id: string;
  entityType: 'MAINTENANCE' | 'CHANGE' | 'TICKET' | 'WARRANTY';
  title: string;
  start: string;
  end: string;
  status: string;
  color: string;
  details: string;
}

// ============================================================
// INFRAINVENTORY V10: AI & INTELLIGENT ASSISTANT TYPES
// ============================================================

export interface AIFinding {
  label: string;
  value: string;
  severity?: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'INFO';
}

export interface AIEvidence {
  source: string;
  detail: string;
  link?: string;
}

export interface AIRelatedEntity {
  type: 'machine' | 'metric' | 'incident' | 'asset' | 'ticket' | 'maintenance' | 'change';
  id: string;
  label: string;
}

export interface AIGroundedResponse {
  content: string;
  findings: AIFinding[];
  evidence: AIEvidence[];
  recommendations: string[];
  relatedEntities: AIRelatedEntity[];
  toolsUsed: string[];
  durationMs: number;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  findings?: AIFinding[] | null;
  evidence?: AIEvidence[] | null;
  recommendations?: string[] | null;
  relatedEntities?: AIRelatedEntity[] | null;
  toolsUsed: string[];
  durationMs?: number | null;
  tokensUsed?: number | null;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  title: string;
  userId?: string | null;
  messages?: AIMessage[];
  _count?: {
    messages: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AIQueryLog {
  id: string;
  query: string;
  user: string;
  role: string;
  durationMs: number;
  toolsCalled: string[];
  success: boolean;
  errorMessage?: string | null;
  createdAt: string;
}

export interface AIConfiguration {
  id: string;
  isEnabled: boolean;
  provider: 'ollama' | 'openai' | 'custom' | string;
  baseUrl: string;
  model: string;
  apiKeyEncrypted?: string | null;
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
  rateLimitPerMinute: number;
  maxHistoryMessages: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIToolInfo {
  name: string;
  description: string;
  requiredPermission: Permission;
  parameters: {
    type: string;
    properties: Record<string, any>;
  };
}

export interface AIDashboardStats {
  status: 'OPERATIONAL' | 'DISABLED';
  provider: string;
  model: string;
  baseUrl: string;
  queriesToday: number;
  totalQueries: number;
  avgLatencyMs: number;
  successRate: string;
  recentLogs: AIQueryLog[];
}

// ==========================================
// V11: AUTOMATION & WORKFLOW TYPES
// ==========================================
export type ActionRiskLevel = 'READ_ONLY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ActionTargetType = 'MACHINE' | 'ASSET' | 'GROUP' | 'TAG' | 'LOCATION' | 'NETWORK';
export type WorkflowRunStatus = 'QUEUED' | 'RUNNING' | 'WAITING_APPROVAL' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT' | 'PARTIAL';
export type StepExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'TIMEOUT' | 'CANCELLED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'REVOKED';
export type AgentOsType = 'WINDOWS' | 'LINUX' | 'DARWIN' | 'OTHER';
export type AIProposalStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'EXECUTED' | 'DISCARDED';

export interface AutomationActionItem {
  id?: string;
  name: string;
  label: string;
  description?: string;
  category: string;
  riskLevel: ActionRiskLevel;
  defaultTimeoutSec: number;
  defaultRetryCount: number;
  supportedOs: string[];
  requiresAgent: boolean;
  parametersSchema?: Record<string, any>;
  enabled?: boolean;
}

export interface WorkflowStepItem {
  id?: string;
  order: number;
  actionName: string;
  label?: string;
  parameters?: Record<string, any>;
  condition: 'ALWAYS' | 'ON_SUCCESS' | 'ON_FAILURE';
  continueOnError: boolean;
  timeoutSec: number;
  retryCount: number;
  retryIntervalSec: number;
}

export interface WorkflowVersionItem {
  id: string;
  version: number;
  notes?: string | null;
  createdAt: string;
  steps: WorkflowStepItem[];
}

export interface WorkflowItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  enabled: boolean;
  targetType: ActionTargetType;
  concurrencyLimit: number;
  timeoutTotalSec: number;
  cronSchedule?: string | null;
  isTemplate: boolean;
  circuitBreakerThreshold: number;
  versions: WorkflowVersionItem[];
  _count?: { runs: number };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunStepItem {
  id: string;
  workflowRunId: string;
  workflowStepId: string;
  workflowStep?: WorkflowStepItem;
  status: StepExecutionStatus;
  output?: string | null;
  errorMessage?: string | null;
  durationMs: number;
  startedAt: string;
  finishedAt?: string | null;
}

export interface WorkflowRunItem {
  id: string;
  workflowId: string;
  workflow?: { name: string; category: string };
  workflowVersionId?: string | null;
  status: WorkflowRunStatus;
  targetType: ActionTargetType;
  targetIdentifier: string;
  isDryRun: boolean;
  logs?: string | null;
  errorMessage?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  createdAt: string;
  runSteps?: WorkflowRunStepItem[];
  user?: { name: string; username: string } | null;
}

export interface ApprovalRequestItem {
  id: string;
  actionName: string;
  targetType: ActionTargetType;
  targetIdentifier: string;
  targetLabel?: string | null;
  parameters?: Record<string, any>;
  riskLevel: ActionRiskLevel;
  reason: string;
  status: ApprovalStatus;
  requestedById: string;
  requestedBy?: { id: string; name: string; username: string };
  approvedById?: string | null;
  approvedBy?: { id: string; name: string; username: string } | null;
  rejectionReason?: string | null;
  decidedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface AutomationPolicyItem {
  id: string;
  name: string;
  description?: string | null;
  groupName?: string | null;
  maxRiskLevelAllowed: ActionRiskLevel;
  requireApprovalForRisk: ActionRiskLevel;
  enforceFourEyes: boolean;
  allowAutoRemediation: boolean;
  allowRemoteExecution: boolean;
  maintenanceWindowAware: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentHeartbeatItem {
  id: string;
  agentId: string;
  cpuUsage?: number | null;
  ramUsage?: number | null;
  diskUsage?: number | null;
  uptimeSeconds?: number | null;
  activeServicesCount?: number | null;
  activeProcessesCount?: number | null;
  systemPayload?: Record<string, any>;
  timestamp: string;
}

export interface AgentItem {
  id: string;
  hostname: string;
  osType: AgentOsType;
  osVersion?: string | null;
  ipAddress?: string | null;
  agentVersion: string;
  status: AgentStatus;
  capabilities: string[];
  allowRemoteExecution: boolean;
  lastSeenAt: string;
  machineId?: string | null;
  machine?: { hostname: string; primaryIp?: string; os?: string; status: string } | null;
  heartbeats?: AgentHeartbeatItem[];
  createdAt: string;
}

export interface AIActionProposalItem {
  id: string;
  problemDescription: string;
  proposedAction: string;
  targetType: ActionTargetType;
  targetId: string;
  targetLabel?: string | null;
  parameters?: Record<string, any>;
  riskLevel: ActionRiskLevel;
  reason: string;
  evidence?: Record<string, any>;
  status: AIProposalStatus;
  suggestedByModel: string;
  executedAt?: string | null;
  executionResult?: Record<string, any>;
  createdAt: string;
}

export interface AutomationStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  successRate: number;
  pendingApprovals: number;
  onlineAgents: number;
  totalAgents: number;
  activePolicies: number;
  pendingAIProposals: number;
  activeLocks: Array<{ target: string; runId: string; ageSeconds: number }>;
  circuitBreakers: Array<{ workflowId: string; consecutiveFailures: number; isOpen: boolean; trippedReason?: string }>;
}

export interface SetupStatus {
  isConfigured: boolean;
  status: 'CONFIGURED' | 'NOT_CONFIGURED';
  appName?: string;
}

export interface SetupInitializeInput {
  name: string;
  username: string;
  email: string;
  password: string;
  organizationName?: string;
  description?: string;
  timezone?: string;
  language?: string;
}

