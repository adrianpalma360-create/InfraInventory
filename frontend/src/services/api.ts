import {
  ApiResponse,
  DashboardSummary,
  Machine,
  PaginatedResult,
  Network,
  VLAN,
  IPAddress,
  NetworkInterface,
  Service,
  Port,
  Location,
  ChangeLog,
  DiscoveryScan,
  DiscoveryHost,
  DiscoveryChange,
  DiscoveryNetwork,
  StartScanPayload,
  ScanStatus,
  User,
  Role,
  SystemSettings,
  Permission,
  RealtimeSummary,
  HistoricalMetricsData,
  ChartPeriod,
  ServiceCheck,
  MetricAnomaly,
  MachineGroupSummary,
  MonitoringConfig,
  MonitoringOverviewData,
  Tag,
  SubnetCalculationResult,
  IPConflict,
  IpamStats,
  Topology,
  TopologyNode,
  TopologyEdge,
  TopologyStatusSummary,
  Asset,
  AssetStats,
  HardwareComponent,
  Warranty,
  Supplier,
  Purchase,
  License,
  LicenseAssignment,
  Software,
  RackView,
  Ticket,
  TicketComment,
  SLA,
  Maintenance,
  MaintenanceWindow,
  OperationalTask,
  InfraChange,
  Runbook,
  OperationsStats,
  CalendarEvent,
  AIConversation,
  AIGroundedResponse,
  AIConfiguration,
  AIToolInfo,
  AIDashboardStats,
  AutomationActionItem,
  WorkflowStepItem,
  WorkflowItem,
  WorkflowRunItem,
  ApprovalRequestItem,
  AutomationPolicyItem,
  AgentItem,
  AIActionProposalItem,
  AutomationStats,
} from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('palma_auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const result: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    data: null as any,
    message: `HTTP ${response.status} ${response.statusText}`,
  }));

  if (!response.ok || !result.success) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      // Dispatch unauthorized event for session handling
      window.dispatchEvent(new CustomEvent('palma:unauthorized'));
    }
    throw new ApiError(
      result.message || `Error en la petición (Código HTTP ${response.status})`,
      response.status
    );
  }

  return result.data;
}

export const api = {
  // Setup & First-Time Installation
  getSetupStatus: async (): Promise<{ isConfigured: boolean; status: 'CONFIGURED' | 'NOT_CONFIGURED' }> => {
    try {
      const res = await fetch(`${API_BASE}/setup/status`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return {
        isConfigured: Boolean(data.isConfigured),
        status: data.status || 'CONFIGURED',
      };
    } catch {
      return { isConfigured: true, status: 'CONFIGURED' };
    }
  },

  initializeSetup: async (data: any) => {
    const url = `${API_BASE}/setup/initialize`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new ApiError(result.message || 'Error al completar la instalación', response.status);
    }
    if (result.token) {
      localStorage.setItem('palma_auth_token', result.token);
    }
    return {
      token: result.token as string,
      user: result.user as User,
      permissions: result.permissions as Permission[],
    };
  },

  // Authentication
  login: async (credentials: { username: string; password: string }) => {
    const url = `${API_BASE}/auth/login`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new ApiError(result.message || 'Error de autenticación', response.status);
    }
    if (result.token) {
      localStorage.setItem('palma_auth_token', result.token);
    }
    return {
      token: result.token as string,
      user: result.user as User,
      permissions: result.permissions as Permission[],
    };
  },

  logout: async () => {
    try {
      await request<{ message: string }>('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('palma_auth_token');
    }
  },

  getMe: () => request<User & { permissions: Permission[] }>('/auth/me'),

  getProfile: () => request<User & { permissions: Permission[] }>('/profile'),

  updateProfile: (data: { name?: string; email?: string | null }) =>
    request<User & { permissions: Permission[] }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<User>('/profile/password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Users Management (Admin)
  getUsers: (params?: {
    search?: string;
    role?: Role;
    isActive?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<PaginatedResult<User>>(`/users${qStr ? `?${qStr}` : ''}`);
  },

  getUser: (id: string) => request<User>(`/users/${id}`),

  createUser: (data: {
    username: string;
    name: string;
    email?: string | null;
    password: string;
    role: Role;
    isActive?: boolean;
    mustChangePassword?: boolean;
  }) =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (
    id: string,
    data: {
      name?: string;
      email?: string | null;
      role?: Role;
      isActive?: boolean;
      mustChangePassword?: boolean;
    }
  ) =>
    request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  resetUserPassword: (
    id: string,
    data: { password: string; mustChangePassword?: boolean }
  ) =>
    request<User>(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteUser: (id: string) =>
    request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),

  // System Settings
  getSettings: () => request<SystemSettings>('/settings'),

  updateSettings: (data: Partial<SystemSettings>) =>
    request<SystemSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Dashboard
  getDashboard: (tagOrParams?: string | { tag?: string }) => {
    let tag: string | undefined;
    if (typeof tagOrParams === 'string') {
      tag = tagOrParams;
    } else if (tagOrParams && typeof tagOrParams === 'object') {
      tag = tagOrParams.tag;
    }
    const qStr = tag ? `?tag=${encodeURIComponent(tag)}` : '';
    return request<DashboardSummary>(`/dashboard${qStr}`);
  },

  // Machines
  getMachines: (params?: {
    search?: string;
    type?: string;
    status?: string;
    locationId?: string;
    vlanId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<PaginatedResult<Machine>>(`/machines${qStr ? `?${qStr}` : ''}`);
  },

  getMachine: (id: string) => request<Machine>(`/machines/${id}`),

  createMachine: (data: Partial<Machine>) =>
    request<Machine>('/machines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMachine: (id: string, data: Partial<Machine>) =>
    request<Machine>(`/machines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMachine: (id: string) =>
    request<{ success: boolean; message: string }>(`/machines/${id}`, {
      method: 'DELETE',
    }),

  getMachineInterfaces: (id: string) => request<NetworkInterface[]>(`/machines/${id}/interfaces`),
  getMachinePorts: (id: string) => request<Port[]>(`/machines/${id}/ports`),
  getMachineChanges: (id: string) => request<ChangeLog[]>(`/machines/${id}/changes`),

  // Networks & VLANs
  getNetworks: () => request<Network[]>('/networks'),
  getNetwork: (id: string) => request<Network>(`/networks/${id}`),
  createNetwork: (data: Partial<Network>) =>
    request<Network>('/networks', { method: 'POST', body: JSON.stringify(data) }),
  updateNetwork: (id: string, data: Partial<Network>) =>
    request<Network>(`/networks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNetwork: (id: string) =>
    request<{ success: boolean }>(`/networks/${id}`, { method: 'DELETE' }),

  getVlans: () => request<VLAN[]>('/vlans'),
  createVlan: (data: Partial<VLAN>) =>
    request<VLAN>('/vlans', { method: 'POST', body: JSON.stringify(data) }),
  updateVlan: (id: string, data: Partial<VLAN>) =>
    request<VLAN>(`/vlans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVlan: (id: string) =>
    request<{ success: boolean }>(`/vlans/${id}`, { method: 'DELETE' }),

  getIPs: () => request<IPAddress[]>('/ips'),
  createIP: (data: Partial<IPAddress>) =>
    request<IPAddress>('/ips', { method: 'POST', body: JSON.stringify(data) }),
  updateIP: (id: string, data: Partial<IPAddress>) =>
    request<IPAddress>(`/ips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIP: (id: string) =>
    request<{ success: boolean }>(`/ips/${id}`, { method: 'DELETE' }),

  createInterface: (data: Partial<NetworkInterface> & { machineId?: string; ipAddress?: string }) =>
    request<NetworkInterface>('/interfaces', { method: 'POST', body: JSON.stringify(data) }),
  updateInterface: (id: string, data: Partial<NetworkInterface> & { ipAddress?: string }) =>
    request<NetworkInterface>(`/interfaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInterface: (id: string) =>
    request<{ success: boolean }>(`/interfaces/${id}`, { method: 'DELETE' }),

  // Services
  getServices: () => request<Service[]>('/services'),
  createService: (data: Partial<Service>) =>
    request<Service>('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id: string, data: Partial<Service>) =>
    request<Service>(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (id: string) =>
    request<{ success: boolean }>(`/services/${id}`, { method: 'DELETE' }),

  // Ports
  getPorts: (machineId?: string) => {
    const q = machineId ? `?machineId=${machineId}` : '';
    return request<Port[]>(`/ports${q}`);
  },
  createPort: (data: Partial<Port>) =>
    request<Port>('/ports', { method: 'POST', body: JSON.stringify(data) }),
  updatePort: (id: string, data: Partial<Port>) =>
    request<Port>(`/ports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePort: (id: string) =>
    request<{ success: boolean }>(`/ports/${id}`, { method: 'DELETE' }),

  // Locations
  getLocations: () => request<Location[]>('/locations'),
  getLocation: (id: string) => request<Location>(`/locations/${id}`),
  createLocation: (data: Partial<Location>) =>
    request<Location>('/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id: string, data: Partial<Location>) =>
    request<Location>(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocation: (id: string) =>
    request<{ success: boolean }>(`/locations/${id}`, { method: 'DELETE' }),

  // Changes & Audit
  getChanges: (params?: { entityType?: string; entityId?: string; limit?: number; page?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<PaginatedResult<ChangeLog>>(`/changes${qStr ? `?${qStr}` : ''}`);
  },

  // Discovery Engine
  startDiscoveryScan: (data: StartScanPayload) =>
    request<DiscoveryScan>('/discovery/scans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDiscoveryScans: () => request<DiscoveryScan[]>('/discovery/scans'),

  getDiscoveryScan: (id: string) => request<DiscoveryScan>(`/discovery/scans/${id}`),

  getDiscoveryScanHosts: (id: string) => request<DiscoveryHost[]>(`/discovery/scans/${id}/hosts`),

  getDiscoveryScanProgress: (id: string) =>
    request<{
      id: string;
      status: ScanStatus;
      progress: number;
      scannedHosts: number;
      totalHosts: number;
      activeHosts: number;
      durationMs?: number;
    }>(`/discovery/scans/${id}/progress`),

  cancelDiscoveryScan: (id: string) =>
    request<{ success: boolean; message: string }>(`/discovery/scans/${id}/cancel`, {
      method: 'POST',
    }),

  getDiscoveryChanges: (params?: {
    scanId?: string;
    changeType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<PaginatedResult<DiscoveryChange>>(`/discovery/changes${qStr ? `?${qStr}` : ''}`);
  },

  approveDiscoveryChange: (id: string) =>
    request<DiscoveryChange>(`/discovery/changes/${id}/approve`, {
      method: 'POST',
    }),

  ignoreDiscoveryChange: (id: string) =>
    request<DiscoveryChange>(`/discovery/changes/${id}/ignore`, {
      method: 'POST',
    }),

  importDiscoveredHost: (
    id: string,
    data: {
      hostname: string;
      type: string;
      os?: string | null;
      manufacturer?: string | null;
      model?: string | null;
      locationId?: string | null;
      vlanId?: string | null;
      description?: string | null;
    }
  ) =>
    request<Machine>(`/discovery/hosts/${id}/import`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDiscoveryNetworks: () => request<DiscoveryNetwork[]>('/discovery/networks'),

  saveDiscoveryNetwork: (data: Partial<DiscoveryNetwork>) =>
    request<DiscoveryNetwork>('/discovery/networks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteDiscoveryNetwork: (id: string) =>
    request<{ success: boolean; message: string }>(`/discovery/networks/${id}`, {
      method: 'DELETE',
    }),

  // V4 Metrics & Real-time Monitoring Endpoints
  getRealtimeMetrics: (params?: { machineId?: string; groupId?: string }) => {
    const query = new URLSearchParams();
    if (params?.machineId) query.append('machineId', params.machineId);
    if (params?.groupId) query.append('groupId', params.groupId);
    const qStr = query.toString();
    return request<RealtimeSummary | null>(`/metrics/realtime${qStr ? `?${qStr}` : ''}`);
  },

  getHistoricalMetrics: (params: { machineId?: string; groupId?: string; period: ChartPeriod }) => {
    const query = new URLSearchParams();
    if (params.machineId) query.append('machineId', params.machineId);
    if (params.groupId) query.append('groupId', params.groupId);
    if (params.period) query.append('period', params.period);
    return request<HistoricalMetricsData>(`/metrics/history?${query.toString()}`);
  },

  getServiceChecks: (machineId?: string) => {
    const query = new URLSearchParams();
    if (machineId) query.append('machineId', machineId);
    const qStr = query.toString();
    return request<ServiceCheck[]>(`/metrics/services${qStr ? `?${qStr}` : ''}`);
  },

  getAnomalies: (machineId?: string) => {
    const query = new URLSearchParams();
    if (machineId) query.append('machineId', machineId);
    const qStr = query.toString();
    return request<MetricAnomaly[]>(`/metrics/anomalies${qStr ? `?${qStr}` : ''}`);
  },

  getGroups: () => request<MachineGroupSummary[]>('/groups'),

  getMonitoringConfig: () => request<MonitoringConfig>('/monitoring/config'),

  updateMonitoringConfig: (data: Partial<MonitoringConfig>) =>
    request<MonitoringConfig>('/monitoring/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // V5 Monitoring Overview & Alerts Endpoints
  getMonitoringOverview: () => request<MonitoringOverviewData>('/monitoring/overview'),

  getAlerts: (params?: { machineId?: string; isResolved?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.machineId) query.append('machineId', params.machineId);
    if (params?.isResolved !== undefined) query.append('isResolved', String(params.isResolved));
    const qStr = query.toString();
    return request<MetricAnomaly[]>(`/alerts${qStr ? `?${qStr}` : ''}`);
  },

  resolveAlert: (id: string) =>
    request<MetricAnomaly>(`/alerts/${id}/resolve`, {
      method: 'POST',
    }),

  // ====================================================
  // V6 IPAM, Subnet Calculator, Tags & Hierarchy Methods
  // ====================================================
  // IPAM Statistics & Diagnostics
  getIpamStats: () => request<IpamStats>('/ipam/stats'),
  getIpamConflicts: () => request<IPConflict[]>('/ipam/conflicts'),
  calculateSubnet: (cidr: string) =>
    request<SubnetCalculationResult>(`/ipam/subnet-calculator?cidr=${encodeURIComponent(cidr)}`),
  exportIpamCsv: async () => {
    const token = localStorage.getItem('palma_auth_token');
    const res = await fetch(`${API_BASE}/ipam/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.text();
  },
  importIpamCsv: (csvContent: string) =>
    request<{ success: boolean; importedCount: number; errorsCount: number; errors: string[] }>(
      '/ipam/import',
      {
        method: 'POST',
        body: JSON.stringify({ csvContent }),
      }
    ),

  // Locations Tree
  getLocationTree: () => request<Location[]>('/locations/tree'),

  // Tags Management
  getTags: () => request<Tag[]>('/tags'),
  getTag: (id: string) => request<Tag>(`/tags/${id}`),
  createTag: (data: { name: string; color?: string; description?: string | null }) =>
    request<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTag: (id: string, data: { name?: string; color?: string; description?: string | null }) =>
    request<Tag>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTag: (id: string) =>
    request<{ success: boolean; message: string }>(`/tags/${id}`, {
      method: 'DELETE',
    }),
  assignTagsToMachine: (machineId: string, tagIds: string[]) =>
    request<Machine>(`/tags/assign/${machineId}`, {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    }),

  // Multidomain Global Search
  searchGlobal: (q: string) =>
    request<{
      query: string;
      totalResults: number;
      results: {
        machines: Machine[];
        ips: IPAddress[];
        networks: Network[];
        vlans: VLAN[];
        services: Service[];
        ports: Port[];
        locations: Location[];
        tags: Tag[];
        incidents: MetricAnomaly[];
        topologies?: Topology[];
      };
    }>(`/search?q=${encodeURIComponent(q)}`),

  // ====================================================
  // V7 Topology & Infrastructure Map Methods
  // ====================================================
  getTopologies: (params?: { groupId?: string; locationId?: string; tagId?: string }) => {
    const query = new URLSearchParams();
    if (params?.groupId) query.append('groupId', params.groupId);
    if (params?.locationId) query.append('locationId', params.locationId);
    if (params?.tagId) query.append('tagId', params.tagId);
    const qStr = query.toString();
    return request<Topology[]>(`/topologies${qStr ? `?${qStr}` : ''}`);
  },

  getTopology: (id: string) => request<Topology>(`/topologies/${id}`),

  createTopology: (data: Partial<Topology>) =>
    request<Topology>('/topologies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTopology: (id: string, data: Partial<Topology>) =>
    request<Topology>(`/topologies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTopology: (id: string) =>
    request<{ success: boolean; message: string }>(`/topologies/${id}`, {
      method: 'DELETE',
    }),

  getTopologyStatus: (id: string) =>
    request<TopologyStatusSummary>(`/topologies/${id}/status`),

  getTopologyNodes: (topologyId: string) =>
    request<TopologyNode[]>(`/topologies/${topologyId}/nodes`),

  addTopologyNode: (topologyId: string, data: Partial<TopologyNode>) =>
    request<TopologyNode>(`/topologies/${topologyId}/nodes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTopologyNode: (id: string, data: Partial<TopologyNode>) =>
    request<TopologyNode>(`/topology-nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTopologyNode: (id: string) =>
    request<{ success: boolean; message: string }>(`/topology-nodes/${id}`, {
      method: 'DELETE',
    }),

  batchSaveTopologyPositions: (
    topologyId: string,
    positions: { id: string; positionX: number; positionY: number }[]
  ) =>
    request<{ success: boolean; updatedCount: number }>(
      `/topologies/${topologyId}/positions`,
      {
        method: 'POST',
        body: JSON.stringify({ positions }),
      }
    ),

  getTopologyEdges: (topologyId: string) =>
    request<TopologyEdge[]>(`/topologies/${topologyId}/edges`),

  addTopologyEdge: (topologyId: string, data: Partial<TopologyEdge>) =>
    request<TopologyEdge>(`/topologies/${topologyId}/edges`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTopologyEdge: (id: string, data: Partial<TopologyEdge>) =>
    request<TopologyEdge>(`/topology-edges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTopologyEdge: (id: string) =>
    request<{ success: boolean; message: string }>(`/topology-edges/${id}`, {
      method: 'DELETE',
    }),

  exportTopology: (id: string) => request<any>(`/topologies/${id}/export`),

  importTopology: (data: any) =>
    request<{
      success: boolean;
      topologyId: string;
      name: string;
      nodesCount: number;
      edgesCount: number;
    }>('/topologies/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ====================================================
  // V8 IT Asset Management, Hardware, Warranties & Licenses
  // ====================================================

  // Assets
  getAssets: (params?: {
    search?: string;
    type?: string;
    status?: string;
    locationId?: string;
    supplierId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<PaginatedResult<Asset>>(`/assets${qStr ? `?${qStr}` : ''}`);
  },

  getAsset: (id: string) => request<Asset>(`/assets/${id}`),

  createAsset: (data: Partial<Asset>) =>
    request<Asset>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAsset: (id: string, data: Partial<Asset>) =>
    request<Asset>(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAsset: (id: string) =>
    request<{ success: boolean; message: string }>(`/assets/${id}`, {
      method: 'DELETE',
    }),

  getAssetStats: () => request<AssetStats>('/assets/stats'),

  getRackView: (locationId: string) => request<RackView>(`/assets/rack/${locationId}`),

  getAssetHardware: (assetId: string) =>
    request<HardwareComponent[]>(`/assets/${assetId}/hardware`),

  addAssetHardware: (assetId: string, data: Partial<HardwareComponent>) =>
    request<HardwareComponent>(`/assets/${assetId}/hardware`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteAssetHardware: (assetId: string, hardwareId: string) =>
    request<{ success: boolean; message: string }>(`/assets/${assetId}/hardware/${hardwareId}`, {
      method: 'DELETE',
    }),

  exportAssetsCsv: async () => {
    const token = localStorage.getItem('palma_auth_token');
    const res = await fetch(`${API_BASE}/assets/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.text();
  },

  importAssetsCsv: (csvContent: string) =>
    request<{ success: boolean; count: number; errorsCount: number; errors: string[] }>(
      '/assets/import',
      {
        method: 'POST',
        body: JSON.stringify({ csvContent }),
      }
    ),

  // Suppliers
  getSuppliers: (params?: { search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<PaginatedResult<Supplier>>(`/suppliers${qStr ? `?${qStr}` : ''}`);
  },

  getSupplier: (id: string) => request<Supplier>(`/suppliers/${id}`),

  createSupplier: (data: Partial<Supplier>) =>
    request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSupplier: (id: string, data: Partial<Supplier>) =>
    request<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSupplier: (id: string) =>
    request<{ success: boolean; message: string }>(`/suppliers/${id}`, {
      method: 'DELETE',
    }),

  // Purchases
  getPurchases: (params?: {
    supplierId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<PaginatedResult<Purchase>>(`/purchases${qStr ? `?${qStr}` : ''}`);
  },

  getPurchase: (id: string) => request<Purchase>(`/purchases/${id}`),

  createPurchase: (data: Partial<Purchase>) =>
    request<Purchase>('/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePurchase: (id: string, data: Partial<Purchase>) =>
    request<Purchase>(`/purchases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deletePurchase: (id: string) =>
    request<{ success: boolean; message: string }>(`/purchases/${id}`, {
      method: 'DELETE',
    }),

  // Warranties
  getWarranties: (params?: {
    assetId?: string;
    status?: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<PaginatedResult<Warranty>>(`/warranties${qStr ? `?${qStr}` : ''}`);
  },

  getWarranty: (id: string) => request<Warranty>(`/warranties/${id}`),

  createWarranty: (data: Partial<Warranty>) =>
    request<Warranty>('/warranties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateWarranty: (id: string, data: Partial<Warranty>) =>
    request<Warranty>(`/warranties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteWarranty: (id: string) =>
    request<{ success: boolean; message: string }>(`/warranties/${id}`, {
      method: 'DELETE',
    }),

  // Licenses
  getLicenses: (params?: {
    search?: string;
    licenseType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<PaginatedResult<License>>(`/licenses${qStr ? `?${qStr}` : ''}`);
  },

  getLicense: (id: string) => request<License>(`/licenses/${id}`),

  createLicense: (data: Partial<License>) =>
    request<License>('/licenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLicense: (id: string, data: Partial<License>) =>
    request<License>(`/licenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteLicense: (id: string) =>
    request<{ success: boolean; message: string }>(`/licenses/${id}`, {
      method: 'DELETE',
    }),

  revealLicenseKey: (id: string) =>
    request<{ licenseId: string; licenseKey: string }>(`/licenses/${id}/reveal`, {
      method: 'POST',
    }),

  assignLicenseSeat: (
    licenseId: string,
    data: { machineId?: string; assetId?: string; userId?: string; assignedUser?: string; notes?: string }
  ) =>
    request<LicenseAssignment>(`/licenses/${licenseId}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeLicenseSeat: (_licenseId: string, assignmentId: string) =>
    request<{ success: boolean; message: string }>(
      `/licenses/assignments/${assignmentId}`,
      {
        method: 'DELETE',
      }
    ),

  // Software
  getSoftwareList: (params?: { search?: string; category?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<PaginatedResult<Software>>(`/software${qStr ? `?${qStr}` : ''}`);
  },

  getSoftware: (id: string) => request<Software>(`/software/${id}`),

  createSoftware: (data: Partial<Software>) =>
    request<Software>('/software', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSoftware: (id: string, data: Partial<Software>) =>
    request<Software>(`/software/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSoftware: (id: string) =>
    request<{ success: boolean; message: string }>(`/software/${id}`, {
      method: 'DELETE',
    }),

  // ====================================================
  // V9 OPERATIONAL MANAGEMENT APIS
  // ====================================================

  // Tickets
  getTickets: (params?: {
    status?: string;
    priority?: string;
    type?: string;
    assignedToId?: string;
    machineId?: string;
    assetId?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<Ticket[]>(`/tickets${qStr ? `?${qStr}` : ''}`);
  },

  getTicket: (id: string) => request<Ticket>(`/tickets/${id}`),

  createTicket: (data: Partial<Ticket>) =>
    request<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTicket: (id: string, data: Partial<Ticket>) =>
    request<Ticket>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTicket: (id: string) =>
    request<{ success: boolean; message: string }>(`/tickets/${id}`, {
      method: 'DELETE',
    }),

  addTicketComment: (ticketId: string, data: { content: string; isInternal?: boolean }) =>
    request<TicketComment>(`/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // SLAs
  getSlas: () => request<SLA[]>('/slas'),
  getSla: (id: string) => request<SLA>(`/slas/${id}`),
  createSla: (data: Partial<SLA>) =>
    request<SLA>('/slas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSla: (id: string, data: Partial<SLA>) =>
    request<SLA>(`/slas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSla: (id: string) =>
    request<{ success: boolean; message: string }>(`/slas/${id}`, {
      method: 'DELETE',
    }),

  // Maintenance & Windows
  getMaintenances: (params?: { status?: string; machineId?: string; assetId?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<Maintenance[]>(`/maintenance${qStr ? `?${qStr}` : ''}`);
  },

  getMaintenance: (id: string) => request<Maintenance>(`/maintenance/${id}`),

  createMaintenance: (data: Partial<Maintenance> & { checklistItems?: string[] }) =>
    request<Maintenance>('/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMaintenance: (id: string, data: Partial<Maintenance>) =>
    request<Maintenance>(`/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMaintenance: (id: string) =>
    request<{ success: boolean; message: string }>(`/maintenance/${id}`, {
      method: 'DELETE',
    }),

  toggleChecklistItem: (itemId: string, isCompleted: boolean) =>
    request<{ success: boolean }>(`/maintenance/checklist/${itemId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ isCompleted }),
    }),

  getMaintenanceWindows: () => request<MaintenanceWindow[]>('/maintenance-windows'),

  createMaintenanceWindow: (data: Partial<MaintenanceWindow>) =>
    request<MaintenanceWindow>('/maintenance-windows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Tasks
  getTasks: (params?: { status?: string; ticketId?: string; maintenanceId?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<OperationalTask[]>(`/tasks${qStr ? `?${qStr}` : ''}`);
  },

  createTask: (data: Partial<OperationalTask>) =>
    request<OperationalTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, data: Partial<OperationalTask>) =>
    request<OperationalTask>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (id: string) =>
    request<{ success: boolean; message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),

  // Change Management
  getInfraChanges: (params?: { status?: string; risk?: string; impact?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return request<InfraChange[]>(`/infra-changes${qStr ? `?${qStr}` : ''}`);
  },

  getInfraChange: (id: string) => request<InfraChange>(`/infra-changes/${id}`),

  createInfraChange: (data: Partial<InfraChange>) =>
    request<InfraChange>('/infra-changes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateInfraChange: (id: string, data: Partial<InfraChange>) =>
    request<InfraChange>(`/infra-changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  approveInfraChange: (id: string, comments?: string) =>
    request<{ approval: any; newStatus: string }>(`/infra-changes/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    }),

  rejectInfraChange: (id: string, comments?: string) =>
    request<{ approval: any; newStatus: string }>(`/infra-changes/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    }),

  // Runbooks
  getRunbooks: (category?: string) =>
    request<Runbook[]>(`/runbooks${category ? `?category=${category}` : ''}`),

  getRunbook: (id: string) => request<Runbook>(`/runbooks/${id}`),

  createRunbook: (data: Partial<Runbook>) =>
    request<Runbook>('/runbooks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRunbook: (id: string, data: Partial<Runbook>) =>
    request<Runbook>(`/runbooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteRunbook: (id: string) =>
    request<{ success: boolean; message: string }>(`/runbooks/${id}`, {
      method: 'DELETE',
    }),

  // Operations Dashboard & Calendar
  getOperationsStats: () => request<OperationsStats>('/operations/stats'),

  getOperationsCalendar: (start?: string, end?: string) => {
    const query = new URLSearchParams();
    if (start) query.append('start', start);
    if (end) query.append('end', end);
    const qStr = query.toString();
    return request<CalendarEvent[]>(`/operations/calendar${qStr ? `?${qStr}` : ''}`);
  },

  // ============================================================
  // INFRAINVENTORY V10: AI & INTELLIGENT ASSISTANT API
  // ============================================================
  sendAIChat: (data: { message: string; conversationId?: string; context?: any }) =>
    request<{ conversationId: string; messageId: string; response: AIGroundedResponse }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendAIQuery: (query: string, maxResults = 20) =>
    request<AIGroundedResponse>('/ai/query', {
      method: 'POST',
      body: JSON.stringify({ query, maxResults }),
    }),

  sendAIAnalyze: (data: { targetType: string; targetId?: string; targetIds?: string[]; question?: string; period?: string }) =>
    request<any>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateAIReport: (data: { reportType: string; period: string; format?: string }) =>
    request<{ title: string; generatedAt: string; reportType: string; period: string; format: string; content: string; metrics: any }>('/ai/report', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAIHistory: () => request<AIConversation[]>('/ai/history'),

  getAIConversation: (id: string) => request<AIConversation>(`/ai/history/${id}`),

  deleteAIConversation: (id: string) =>
    request<{ success: boolean; message: string }>(`/ai/history/${id}`, {
      method: 'DELETE',
    }),

  getAIStatus: () =>
    request<{ isEnabled: boolean; provider: string; model: string; baseUrl: string }>('/ai/status'),

  getAITools: () => request<AIToolInfo[]>('/ai/tools'),

  getAIDashboard: () => request<AIDashboardStats>('/ai/dashboard'),

  getAIConfig: () => request<AIConfiguration>('/ai/config'),

  updateAIConfig: (data: Partial<AIConfiguration> & { apiKey?: string }) =>
    request<AIConfiguration>('/ai/config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  testAIConnection: (data: { provider: string; baseUrl: string; model: string; apiKey?: string }) =>
    request<{ success: boolean; message: string; models?: string[]; latencyMs: number }>('/ai/test-connection', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==========================================
// V11: AUTOMATION & AGENT API METHODS
// ==========================================
export const automationApi = {
  getStats: () => request<AutomationStats>('/automation/stats'),

  getActions: () => request<{ builtIns: AutomationActionItem[]; dbActions: AutomationActionItem[] }>('/automation/actions'),

  getWorkflows: (params?: { category?: string; enabled?: boolean; isTemplate?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.enabled !== undefined) query.append('enabled', String(params.enabled));
    if (params?.isTemplate !== undefined) query.append('isTemplate', String(params.isTemplate));
    const qs = query.toString();
    return request<WorkflowItem[]>(`/automation/workflows${qs ? `?${qs}` : ''}`);
  },

  getWorkflow: (id: string) => request<WorkflowItem>(`/automation/workflows/${id}`),

  createWorkflow: (data: Partial<WorkflowItem> & { steps: WorkflowStepItem[] }) =>
    request<WorkflowItem>('/automation/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateWorkflow: (id: string, data: Partial<WorkflowItem> & { steps?: WorkflowStepItem[]; createNewVersion?: boolean; versionNotes?: string }) =>
    request<WorkflowItem>(`/automation/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteWorkflow: (id: string) =>
    request<void>(`/automation/workflows/${id}`, {
      method: 'DELETE',
    }),

  executeWorkflow: (id: string, data: { targetType: string; targetIdentifier: string; isDryRun?: boolean; reason?: string; overrideParameters?: Record<string, any> }) =>
    request<{ runId: string; status: string; isDryRun?: boolean; message: string; approvalId?: string; execution?: any }>(`/automation/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRuns: (params?: { workflowId?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.workflowId) query.append('workflowId', params.workflowId);
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<WorkflowRunItem[]>(`/automation/runs${qs ? `?${qs}` : ''}`);
  },

  getRun: (id: string) => request<WorkflowRunItem>(`/automation/runs/${id}`),

  getApprovals: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<ApprovalRequestItem[]>(`/automation/approvals${qs}`);
  },

  createApproval: (data: Partial<ApprovalRequestItem>) =>
    request<ApprovalRequestItem>('/automation/approvals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  decideApproval: (id: string, decision: 'APPROVE' | 'REJECT', rejectionReason?: string) =>
    request<ApprovalRequestItem>(`/automation/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, rejectionReason }),
    }),

  getPolicies: () => request<AutomationPolicyItem[]>('/automation/policies'),

  createPolicy: (data: Partial<AutomationPolicyItem>) =>
    request<AutomationPolicyItem>('/automation/policies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePolicy: (id: string, data: Partial<AutomationPolicyItem>) =>
    request<AutomationPolicyItem>(`/automation/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getAIProposals: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<AIActionProposalItem[]>(`/automation/ai-proposals${qs}`);
  },

  createAIProposal: (data: Partial<AIActionProposalItem>) =>
    request<AIActionProposalItem>('/automation/ai-proposals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  decideAIProposal: (id: string, action: 'ACCEPT' | 'REJECT' | 'EXECUTE') =>
    request<AIActionProposalItem>(`/automation/ai-proposals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
};

export const agentApi = {
  getAgents: () => request<AgentItem[]>('/agents'),

  registerAgent: (data: Partial<AgentItem>) =>
    request<{ agent: AgentItem; token: string }>('/agents/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  revokeAgent: (id: string) =>
    request<AgentItem>(`/agents/${id}/revoke`, {
      method: 'POST',
    }),
};

