import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  GitFork,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Server,
  Network as NetworkIcon,
  Shield,
  Radio,
  Monitor,
  HardDrive,
  Cpu,
  Package,
  Printer,
  Database,
  Zap,
  Phone,
  HelpCircle,
  Globe,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Topology,
  TopologyNode,
  TopologyNodeType,
  TopologyConnectionType,
  TopologyStatusSummary,
  Machine,
  Network,
  VLAN,
  Location,
} from '../types/index.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';

interface TopologyPageProps {
  onSelectMachine?: (machineId: string) => void;
  onNavigateToIpam?: () => void;
  onNavigateToMonitoring?: () => void;
  onNavigateToAlerts?: () => void;
}

const NODE_TYPE_ICONS: Record<TopologyNodeType, React.ElementType> = {
  INTERNET: Globe,
  ROUTER: NetworkIcon,
  FIREWALL: Shield,
  SWITCH: Layers,
  ACCESS_POINT: Radio,
  SERVER: Server,
  WORKSTATION: Monitor,
  NAS: HardDrive,
  VM: Cpu,
  CONTAINER: Package,
  NETWORK: Globe,
  VLAN: Layers,
  PRINTER: Printer,
  STORAGE: Database,
  UPS: Zap,
  PHONE: Phone,
  OTHER: HelpCircle,
};

const CONNECTION_TYPE_COLORS: Record<TopologyConnectionType, { stroke: string; dash?: string; label: string }> = {
  ETHERNET: { stroke: '#06B6D4', label: 'Ethernet (Cyan)' },
  FIBER: { stroke: '#F59E0B', label: 'Fibra Óptica (Ámbar)' },
  WIFI: { stroke: '#22C55E', dash: '5,5', label: 'WiFi (Verde discontinuo)' },
  VPN: { stroke: '#A855F7', dash: '6,4', label: 'Túnel VPN (Púrpura)' },
  VLAN: { stroke: '#3B82F6', dash: '3,3', label: 'VLAN Trunk/Access (Azul)' },
  LOGICAL: { stroke: '#64748B', dash: '4,4', label: 'Lógico / Enrutado (Gris)' },
  OTHER: { stroke: '#94A3B8', label: 'Otro' },
};

export const TopologyPage: React.FC<TopologyPageProps> = ({
  onSelectMachine,
  onNavigateToIpam,
  onNavigateToAlerts,
}) => {
  const { hasPermission } = useAuth();
  const toast = useToast();

  // Topologies list & selection
  const [topologies, setTopologies] = useState<Topology[]>([]);
  const [selectedTopologyId, setSelectedTopologyId] = useState<string>('');
  const [currentTopology, setCurrentTopology] = useState<Topology | null>(null);
  const [statusSummary, setStatusSummary] = useState<TopologyStatusSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter criteria for topology nodes
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterNodeType, setFilterNodeType] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Selected node for inspector side-sheet
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Canvas Pan & Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPanPos, setStartPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasUnsavedPositions, setHasUnsavedPositions] = useState<boolean>(false);

  // Entities for linking in modals
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([]);
  const [availableNetworks, setAvailableNetworks] = useState<Network[]>([]);
  const [availableVlans, setAvailableVlans] = useState<VLAN[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);

  // Modals state
  const [isCreateTopoModalOpen, setIsCreateTopoModalOpen] = useState(false);
  const [isEditTopoModalOpen, setIsEditTopoModalOpen] = useState(false);
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
  const [isAddEdgeModalOpen, setIsAddEdgeModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    type: 'topology' | 'node' | 'edge';
    id: string;
    title: string;
    description: string;
  } | null>(null);

  // Form states
  const [topoFormData, setTopoFormData] = useState<{
    name: string;
    description: string;
    isDefault: boolean;
  }>({ name: '', description: '', isDefault: false });

  const [nodeFormData, setNodeFormData] = useState<{
    nodeType: TopologyNodeType;
    label: string;
    machineId: string;
    networkId: string;
    vlanId: string;
    locationId: string;
    positionX: number;
    positionY: number;
    customIcon: string;
  }>({
    nodeType: 'SERVER',
    label: '',
    machineId: '',
    networkId: '',
    vlanId: '',
    locationId: '',
    positionX: 300,
    positionY: 200,
    customIcon: '',
  });

  const [edgeFormData, setEdgeFormData] = useState<{
    sourceNodeId: string;
    targetNodeId: string;
    connectionType: TopologyConnectionType;
    label: string;
    speed: string;
    sourceInterfaceId: string;
    targetInterfaceId: string;
  }>({
    sourceNodeId: '',
    targetNodeId: '',
    connectionType: 'ETHERNET',
    label: '',
    speed: '1 Gbps',
    sourceInterfaceId: '',
    targetInterfaceId: '',
  });

  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load auxiliary data (machines, networks, vlans, locations)
  const loadAuxData = async () => {
    try {
      const [machRes, netRes, locRes] = await Promise.all([
        api.getMachines({ limit: 100 }),
        api.getNetworks(),
        api.getLocations(),
      ]);
      setAvailableMachines(machRes.items || []);
      setAvailableNetworks(netRes || []);
      setAvailableLocations(locRes || []);

      try {
        const vlanRes = await api.getVlans();
        setAvailableVlans(vlanRes || []);
      } catch {
        // vlan endpoint might return empty
      }
    } catch (err) {
      console.error('Error loading aux topology data:', err);
    }
  };

  // Load specific topology details and status summary
  const loadTopologyDetails = async (id: string) => {
    try {
      setIsRefreshing(true);
      const [topo, summary] = await Promise.all([
        api.getTopology(id),
        api.getTopologyStatus(id),
      ]);
      setCurrentTopology(topo);
      setStatusSummary(summary);
      setHasUnsavedPositions(false);
    } catch (err: any) {
      toast.error('Error al cargar mapa', err.message || 'Error de conexión');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load topologies list
  const loadTopologies = async (selectId?: string) => {
    try {
      setIsRefreshing(true);
      const topos = await api.getTopologies();
      setTopologies(topos || []);

      if (topos && topos.length > 0) {
        const targetId = selectId || selectedTopologyId || topos.find((t) => t.isDefault)?.id || topos[0].id;
        setSelectedTopologyId(targetId);
        await loadTopologyDetails(targetId);
      } else {
        setSelectedTopologyId('');
        setCurrentTopology(null);
        setStatusSummary(null);
      }
    } catch (err: any) {
      toast.error('Error cargando topologías', err.message || 'Error desconocido');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAuxData();
    loadTopologies();
  }, []);

  const handleSelectTopology = (id: string) => {
    setSelectedTopologyId(id);
    setSelectedNodeId(null);
    loadTopologyDetails(id);
  };

  // Create Topology
  const handleCreateTopology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topoFormData.name.trim()) {
      toast.warning('Campo requerido', 'Introduce un nombre para la topología');
      return;
    }

    try {
      const created = await api.createTopology(topoFormData);
      toast.success('Topología Creada', `Se ha creado el mapa "${created.name}"`);
      setIsCreateTopoModalOpen(false);
      setTopoFormData({ name: '', description: '', isDefault: false });
      await loadTopologies(created.id);
    } catch (err: any) {
      toast.error('Error al crear topología', err.message);
    }
  };

  // Edit Topology
  const handleUpdateTopology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTopology) return;

    try {
      const updated = await api.updateTopology(currentTopology.id, topoFormData);
      toast.success('Topología Actualizada', `Se ha actualizado "${updated.name}"`);
      setIsEditTopoModalOpen(false);
      await loadTopologies(updated.id);
    } catch (err: any) {
      toast.error('Error al actualizar', err.message);
    }
  };

  // Delete Topology
  const handleDeleteTopology = async () => {
    if (!currentTopology) return;

    try {
      await api.deleteTopology(currentTopology.id);
      toast.success('Topología Eliminada', 'El mapa ha sido eliminado sin alterar el inventario físico.');
      setDeleteConfirmModal(null);
      await loadTopologies();
    } catch (err: any) {
      toast.error('Error al eliminar topología', err.message);
    }
  };

  // Add Node
  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopologyId) return;

    let finalLabel = nodeFormData.label.trim();
    if (!finalLabel) {
      if (nodeFormData.machineId) {
        const m = availableMachines.find((x) => x.id === nodeFormData.machineId);
        finalLabel = m ? m.hostname : 'Host';
      } else if (nodeFormData.networkId) {
        const n = availableNetworks.find((x) => x.id === nodeFormData.networkId);
        finalLabel = n ? n.name || n.cidr : 'Red';
      } else if (nodeFormData.vlanId) {
        const v = availableVlans.find((x) => x.id === nodeFormData.vlanId);
        finalLabel = v ? `VLAN ${v.vlanId} - ${v.name}` : 'VLAN';
      } else {
        finalLabel = `Nodo ${nodeFormData.nodeType}`;
      }
    }

    try {
      await api.addTopologyNode(selectedTopologyId, {
        ...nodeFormData,
        label: finalLabel,
        machineId: nodeFormData.machineId || null,
        networkId: nodeFormData.networkId || null,
        vlanId: nodeFormData.vlanId || null,
        locationId: nodeFormData.locationId || null,
      });

      toast.success('Nodo Añadido', `Nodo "${finalLabel}" insertado en el mapa.`);
      setIsAddNodeModalOpen(false);
      setNodeFormData({
        nodeType: 'SERVER',
        label: '',
        machineId: '',
        networkId: '',
        vlanId: '',
        locationId: '',
        positionX: 300 + Math.floor(Math.random() * 80),
        positionY: 200 + Math.floor(Math.random() * 80),
        customIcon: '',
      });
      await loadTopologyDetails(selectedTopologyId);
    } catch (err: any) {
      toast.error('Error al añadir nodo', err.message);
    }
  };

  // Delete Node
  const handleDeleteNode = async (nodeId: string) => {
    try {
      await api.deleteTopologyNode(nodeId);
      toast.success('Nodo Retirado', 'Nodo eliminado del diagrama sin modificar la máquina en inventario.');
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      setDeleteConfirmModal(null);
      await loadTopologyDetails(selectedTopologyId);
    } catch (err: any) {
      toast.error('Error al retirar nodo', err.message);
    }
  };

  // Add Edge / Connection
  const handleAddEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopologyId) return;

    if (!edgeFormData.sourceNodeId || !edgeFormData.targetNodeId) {
      toast.warning('Selección requerida', 'Debes elegir el nodo origen y el nodo destino.');
      return;
    }

    if (edgeFormData.sourceNodeId === edgeFormData.targetNodeId) {
      toast.warning('Nodos idénticos', 'No puedes conectar un nodo consigo mismo.');
      return;
    }

    try {
      await api.addTopologyEdge(selectedTopologyId, {
        sourceNodeId: edgeFormData.sourceNodeId,
        targetNodeId: edgeFormData.targetNodeId,
        connectionType: edgeFormData.connectionType,
        label: edgeFormData.label.trim() || null,
        speed: edgeFormData.speed.trim() || null,
        sourceInterfaceId: edgeFormData.sourceInterfaceId || null,
        targetInterfaceId: edgeFormData.targetInterfaceId || null,
      });

      toast.success('Enlace Creado', 'Conexión registrada en la topología.');
      setIsAddEdgeModalOpen(false);
      setEdgeFormData({
        sourceNodeId: '',
        targetNodeId: '',
        connectionType: 'ETHERNET',
        label: '',
        speed: '1 Gbps',
        sourceInterfaceId: '',
        targetInterfaceId: '',
      });
      await loadTopologyDetails(selectedTopologyId);
    } catch (err: any) {
      toast.error('Error al crear conexión', err.message);
    }
  };

  // Delete Edge
  const handleDeleteEdge = async (edgeId: string) => {
    try {
      await api.deleteTopologyEdge(edgeId);
      toast.success('Enlace Eliminado', 'Conexión retirada de la topología.');
      setDeleteConfirmModal(null);
      await loadTopologyDetails(selectedTopologyId);
    } catch (err: any) {
      toast.error('Error al eliminar enlace', err.message);
    }
  };

  // Batch Save Node Positions
  const handleSavePositions = async () => {
    if (!currentTopology || !currentTopology.nodes) return;

    try {
      const positions = currentTopology.nodes.map((n) => ({
        id: n.id,
        positionX: Math.round(n.positionX),
        positionY: Math.round(n.positionY),
      }));

      await api.batchSaveTopologyPositions(currentTopology.id, positions);
      setHasUnsavedPositions(false);
      toast.success('Posiciones Guardadas', 'El diseño de la topología ha sido actualizado.');
    } catch (err: any) {
      toast.error('Error al guardar posiciones', err.message);
    }
  };

  // Export Topology to JSON
  const handleExportTopology = async () => {
    if (!currentTopology) return;

    try {
      const data = await api.exportTopology(currentTopology.id);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `topology_${currentTopology.name.toLowerCase().replace(/\s+/g, '_')}_v7.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Exportación Completa', 'Archivo JSON descargado exitosamente.');
    } catch (err: any) {
      toast.error('Error exportando topología', err.message);
    }
  };

  // Import Topology from JSON
  const handleImportTopology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) {
      toast.warning('JSON vacío', 'Pega o sube un archivo JSON con la definición de la topología.');
      return;
    }

    try {
      setImporting(true);
      const parsed = JSON.parse(importJsonText);
      const res = await api.importTopology(parsed);
      toast.success(
        'Topología Importada',
        `Topología "${res.name}" importada con ${res.nodesCount} nodos y ${res.edgesCount} enlaces.`
      );
      setIsImportModalOpen(false);
      setImportJsonText('');
      await loadTopologies(res.topologyId);
    } catch (err: any) {
      toast.error('Error al importar topología', err.message || 'Formato JSON inválido.');
    } finally {
      setImporting(false);
    }
  };

  // Auto-arrange layout algorithms
  const handleAutoArrange = (layoutType: 'grid' | 'circle' | 'hierarchical') => {
    if (!currentTopology || !currentTopology.nodes || currentTopology.nodes.length === 0) return;

    const nodes = [...currentTopology.nodes];
    const n = nodes.length;

    if (layoutType === 'circle') {
      const centerX = 550;
      const centerY = 380;
      const radius = Math.max(220, n * 35);
      nodes.forEach((node, idx) => {
        const angle = (idx / n) * 2 * Math.PI - Math.PI / 2;
        node.positionX = Math.round(centerX + radius * Math.cos(angle));
        node.positionY = Math.round(centerY + radius * Math.sin(angle));
      });
    } else if (layoutType === 'grid') {
      const cols = Math.ceil(Math.sqrt(n));
      const startX = 200;
      const startY = 150;
      const gapX = 220;
      const gapY = 170;

      nodes.forEach((node, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        node.positionX = startX + col * gapX;
        node.positionY = startY + row * gapY;
      });
    } else if (layoutType === 'hierarchical') {
      const tiers: Record<string, TopologyNode[]> = {
        tier1: [],
        tier2: [],
        tier3: [],
        tier4: [],
        tier5: [],
      };

      nodes.forEach((node) => {
        if (node.nodeType === 'INTERNET' || node.nodeType === 'FIREWALL') {
          tiers.tier1.push(node);
        } else if (node.nodeType === 'ROUTER' || node.nodeType === 'SWITCH') {
          tiers.tier2.push(node);
        } else if (node.nodeType === 'ACCESS_POINT' || node.nodeType === 'NETWORK' || node.nodeType === 'VLAN') {
          tiers.tier3.push(node);
        } else if (node.nodeType === 'SERVER' || node.nodeType === 'STORAGE' || node.nodeType === 'NAS' || node.nodeType === 'UPS') {
          tiers.tier4.push(node);
        } else {
          tiers.tier5.push(node);
        }
      });

      const tierKeys = ['tier1', 'tier2', 'tier3', 'tier4', 'tier5'];
      const tierY = [120, 260, 420, 580, 740];

      tierKeys.forEach((key, tIdx) => {
        const tNodes = tiers[key];
        const count = tNodes.length;
        if (count === 0) return;
        const totalWidth = 1000;
        const spacing = totalWidth / (count + 1);

        tNodes.forEach((node, idx) => {
          node.positionX = Math.round(150 + (idx + 1) * spacing);
          node.positionY = tierY[tIdx];
        });
      });
    }

    setCurrentTopology({ ...currentTopology, nodes });
    setHasUnsavedPositions(true);
    toast.info('Distribución Aplicada', `Diseño ${layoutType} configurado. Recuerda pulsar "Guardar Posiciones".`);
  };

  // Canvas Pan Handlers
  const handleMouseDownCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPanPos.x,
        y: e.clientY - startPanPos.y,
      });
    } else if (draggingNodeId && currentTopology && currentTopology.nodes) {
      const updatedNodes = currentTopology.nodes.map((node) => {
        if (node.id === draggingNodeId) {
          const newX = (e.clientX - dragOffset.x - pan.x) / zoom;
          const newY = (e.clientY - dragOffset.y - pan.y) / zoom;
          return {
            ...node,
            positionX: Math.max(40, Math.min(2400, newX)),
            positionY: Math.max(40, Math.min(1800, newY)),
          };
        }
        return node;
      });
      setCurrentTopology({ ...currentTopology, nodes: updatedNodes });
      setHasUnsavedPositions(true);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag Start
  const handleNodeDragStart = (e: React.MouseEvent, node: TopologyNode) => {
    e.stopPropagation();
    setDraggingNodeId(node.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setSelectedNodeId(node.id);
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom((prev) => Math.min(2.5, prev + 0.15));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.4, prev - 0.15));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!currentTopology || !currentTopology.nodes) return [];
    return currentTopology.nodes.filter((node) => {
      if (filterNodeType && node.nodeType !== filterNodeType) return false;
      if (filterLocation && node.locationId !== filterLocation) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const matchesLabel = node.label.toLowerCase().includes(q);
        const matchesHost = node.machine?.hostname.toLowerCase().includes(q);
        const matchesIp = node.machine?.primaryIp?.toLowerCase().includes(q);
        if (!matchesLabel && !matchesHost && !matchesIp) return false;
      }
      return true;
    });
  }, [currentTopology, filterNodeType, filterLocation, searchFilter]);

  // Selected Node Object
  const activeSelectedNode = useMemo(() => {
    if (!selectedNodeId || !currentTopology || !currentTopology.nodes) return null;
    return currentTopology.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, currentTopology]);

  // Render Status Badge
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            ONLINE
          </span>
        );
      case 'WARNING':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 animate-pulse" />
            CRITICAL
          </span>
        );
      case 'DOWN':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" />
            DOWN
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-[#94A3B8] bg-[#151B23] border border-[#252D38] px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-[#64748B]" />
            DESCONOCIDO
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0F14] text-[#F1F5F9] overflow-hidden select-none">
      {/* 1. Header Toolbar */}
      <div className="bg-[#0F141B] border-b border-[#252D38] p-3 flex flex-wrap items-center justify-between gap-3 z-20">
        {/* Left: Topology selector & actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#151B23] border border-[#252D38] rounded-lg px-2.5 py-1">
            <GitFork className="w-4 h-4 text-[#06B6D4]" />
            <select
              value={selectedTopologyId}
              onChange={(e) => handleSelectTopology(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#F1F5F9] focus:outline-none cursor-pointer pr-4"
            >
              {topologies.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#0F141B] text-[#F1F5F9]">
                  {t.name} {t.isDefault ? '★ (Predeterminada)' : ''}
                </option>
              ))}
            </select>
          </div>

          {hasPermission('TOPOLOGY_CREATE') && (
            <button
              onClick={() => {
                setTopoFormData({ name: '', description: '', isDefault: false });
                setIsCreateTopoModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30 text-xs font-medium transition-colors"
              title="Crear Nueva Topología"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Topología</span>
            </button>
          )}

          {currentTopology && hasPermission('TOPOLOGY_UPDATE') && (
            <button
              onClick={() => {
                setTopoFormData({
                  name: currentTopology.name,
                  description: currentTopology.description || '',
                  isDefault: !!currentTopology.isDefault,
                });
                setIsEditTopoModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] border border-transparent hover:border-[#252D38] transition-colors"
              title="Editar Topología"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {currentTopology && hasPermission('TOPOLOGY_DELETE') && (
            <button
              onClick={() => {
                setDeleteConfirmModal({
                  type: 'topology',
                  id: currentTopology.id,
                  title: `¿Eliminar topología "${currentTopology.name}"?`,
                  description:
                    'Esta acción solo elimina la representación visual del mapa y sus enlaces. NINGÚN dato de inventario ni máquina será alterado.',
                });
              }}
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors"
              title="Eliminar Topología"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Middle: Live Stats Summary Badges */}
        {statusSummary && (
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-[#151B23] border border-[#252D38] px-2.5 py-1 rounded-lg">
              <span className="text-[#64748B]">Nodos:</span>
              <span className="font-bold text-[#F1F5F9]">{statusSummary.totalNodes}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#151B23] border border-[#252D38] px-2.5 py-1 rounded-lg">
              <span className="text-[#64748B]">Enlaces:</span>
              <span className="font-bold text-[#06B6D4]">{statusSummary.totalEdges}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#22C55E]/10 border border-[#22C55E]/30 px-2 py-1 rounded-lg text-[#22C55E] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span>{statusSummary.online} Online</span>
            </div>
            {statusSummary.warning > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-2 py-1 rounded-lg text-[#F59E0B] font-medium">
                <AlertTriangle className="w-3 h-3" />
                <span>{statusSummary.warning} Warn</span>
              </div>
            )}
            {statusSummary.critical > 0 && (
              <div className="flex items-center gap-1.5 bg-[#EF4444]/10 border border-[#EF4444]/30 px-2 py-1 rounded-lg text-[#EF4444] font-medium">
                <XCircle className="w-3 h-3" />
                <span>{statusSummary.critical} Crit</span>
              </div>
            )}
            {statusSummary.totalIncidents > 0 && (
              <button
                onClick={onNavigateToAlerts}
                className="flex items-center gap-1.5 bg-[#EF4444]/20 border border-[#EF4444]/40 px-2 py-1 rounded-lg text-[#EF4444] font-bold animate-pulse"
                title="Ver Incidentes Activos en Alertas"
              >
                <span>{statusSummary.totalIncidents} Incidentes</span>
              </button>
            )}
          </div>
        )}

        {/* Right: Map Operations & Layout Controls */}
        <div className="flex items-center gap-2">
          {hasUnsavedPositions && (
            <button
              onClick={handleSavePositions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16a34a] text-[#0B0F14] font-bold text-xs shadow-md shadow-emerald-500/20 transition-all animate-bounce"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Posiciones</span>
            </button>
          )}

          {hasPermission('TOPOLOGY_UPDATE') && (
            <>
              <button
                onClick={() => {
                  setNodeFormData({
                    nodeType: 'SERVER',
                    label: '',
                    machineId: '',
                    networkId: '',
                    vlanId: '',
                    locationId: '',
                    positionX: 350 + Math.floor(Math.random() * 60),
                    positionY: 250 + Math.floor(Math.random() * 60),
                    customIcon: '',
                  });
                  setIsAddNodeModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#151B23] hover:bg-[#1A212B] text-[#F1F5F9] border border-[#252D38] text-xs font-medium transition-colors"
                title="Añadir Nodo al Mapa"
              >
                <Plus className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>Nodo</span>
              </button>

              <button
                onClick={() => {
                  setEdgeFormData({
                    sourceNodeId: '',
                    targetNodeId: '',
                    connectionType: 'ETHERNET',
                    label: '',
                    speed: '1 Gbps',
                    sourceInterfaceId: '',
                    targetInterfaceId: '',
                  });
                  setIsAddEdgeModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#151B23] hover:bg-[#1A212B] text-[#F1F5F9] border border-[#252D38] text-xs font-medium transition-colors"
                title="Conectar Nodos (Añadir Enlace)"
              >
                <ArrowRight className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>Enlace</span>
              </button>

              {/* Auto arrange menu dropdown */}
              <div className="relative group">
                <button
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#151B23] hover:bg-[#1A212B] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#252D38] text-xs font-medium transition-colors"
                  title="Auto-organizar distribución"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Organizar</span>
                </button>
                <div className="absolute right-0 mt-1 w-44 bg-[#0F141B] border border-[#252D38] rounded-xl shadow-2xl py-1 hidden group-hover:block z-50">
                  <button
                    onClick={() => handleAutoArrange('hierarchical')}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#94A3B8] hover:text-[#06B6D4] hover:bg-[#151B23] transition-colors"
                  >
                    Jerárquico (NOC Core/Access)
                  </button>
                  <button
                    onClick={() => handleAutoArrange('circle')}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#94A3B8] hover:text-[#06B6D4] hover:bg-[#151B23] transition-colors"
                  >
                    Circular / Radial
                  </button>
                  <button
                    onClick={() => handleAutoArrange('grid')}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#94A3B8] hover:text-[#06B6D4] hover:bg-[#151B23] transition-colors"
                  >
                    Cuadrícula / Grid
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Export / Import */}
          {hasPermission('TOPOLOGY_EXPORT') && (
            <button
              onClick={handleExportTopology}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] border border-transparent hover:border-[#252D38] transition-colors"
              title="Exportar Mapa JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {hasPermission('TOPOLOGY_IMPORT') && (
            <button
              onClick={() => {
                setImportJsonText('');
                setIsImportModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] border border-transparent hover:border-[#252D38] transition-colors"
              title="Importar Topología JSON"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => selectedTopologyId && loadTopologyDetails(selectedTopologyId)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] border border-transparent hover:border-[#252D38] transition-colors"
            title="Refrescar Estados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#06B6D4]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Secondary Filter & Quick Search Bar */}
      <div className="bg-[#0F141B]/80 border-b border-[#252D38] px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar por etiqueta, host o IP..."
              className="w-full bg-[#151B23] border border-[#252D38] rounded-md pl-8 pr-2 py-1 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
            />
          </div>

          <div className="flex items-center gap-1 text-[#64748B]">
            <Filter className="w-3 h-3" />
            <span>Tipo:</span>
            <select
              value={filterNodeType}
              onChange={(e) => setFilterNodeType(e.target.value)}
              className="bg-[#151B23] border border-[#252D38] rounded px-2 py-0.5 text-xs text-[#F1F5F9] focus:outline-none"
            >
              <option value="">Todos los tipos</option>
              <option value="ROUTER">Routers</option>
              <option value="FIREWALL">Firewalls</option>
              <option value="SWITCH">Switches</option>
              <option value="SERVER">Servidores</option>
              <option value="ACCESS_POINT">APs / WiFi</option>
              <option value="WORKSTATION">Workstations</option>
              <option value="NETWORK">Subredes</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-[#64748B]">
            <span>Ubicación:</span>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="bg-[#151B23] border border-[#252D38] rounded px-2 py-0.5 text-xs text-[#F1F5F9] focus:outline-none"
            >
              <option value="">Todas las ubicaciones</option>
              {availableLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.building ? `(${loc.building})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden xl:flex items-center gap-3 text-[11px] text-[#94A3B8]">
          <span className="text-[#64748B] font-semibold uppercase tracking-wider">Enlaces:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-[#06B6D4]" /> Ethernet
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-[#F59E0B]" /> Fibra
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t border-dashed border-[#22C55E]" /> WiFi
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t border-dashed border-[#A855F7]" /> VPN
          </span>
        </div>
      </div>

      {/* 3. Main Topology Canvas Area */}
      <div className="relative flex-1 bg-[#0B0F14] overflow-hidden">
        {/* Floating Zoom & Canvas Controls */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 bg-[#0F141B]/90 border border-[#252D38] rounded-xl p-1 shadow-2xl backdrop-blur-md">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] transition-colors"
            title="Acercar (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] transition-colors"
            title="Alejar (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-[#06B6D4] hover:bg-[#151B23] transition-colors"
            title="Centrar / Restablecer vista"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="px-1.5 py-1 text-center text-[10px] font-mono text-[#64748B] border-t border-[#252D38]">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Empty Canvas State */}
        {(!currentTopology || !currentTopology.nodes || currentTopology.nodes.length === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-0">
            <div className="w-16 h-16 rounded-2xl bg-[#151B23] border border-[#252D38] flex items-center justify-center text-[#06B6D4] mb-4 shadow-xl">
              <GitFork className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#F1F5F9] mb-1">
              {currentTopology ? `Topología "${currentTopology.name}" sin nodos` : 'No hay topología seleccionada'}
            </h3>
            <p className="text-sm text-[#94A3B8] max-w-md mb-5">
              Empieza añadiendo nodos (máquinas de inventario, routers, firewalls, subredes) y conectándolos mediante enlaces.
            </p>
            {hasPermission('TOPOLOGY_UPDATE') && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setNodeFormData({
                      nodeType: 'SERVER',
                      label: '',
                      machineId: '',
                      networkId: '',
                      vlanId: '',
                      locationId: '',
                      positionX: 450,
                      positionY: 280,
                      customIcon: '',
                    });
                    setIsAddNodeModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#06B6D4] hover:bg-[#0891b2] text-[#0B0F14] font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Primer Nodo</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Interactive Infinite Drag/Pan Canvas */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`w-full h-full relative cursor-${isPanning ? 'grabbing' : 'grab'}`}
          style={{
            backgroundImage:
              'radial-gradient(circle, #252D38 1px, transparent 1px), radial-gradient(circle, #151B23 1px, transparent 1px)',
            backgroundSize: '32px 32px, 8px 8px',
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* Zoom/Pan Scaled Layer */}
          <div
            className="absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isPanning || draggingNodeId ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            {/* SVG Edges Layer */}
            <svg className="absolute top-0 left-0 w-[4000px] h-[4000px] overflow-visible pointer-events-auto">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#06B6D4" />
                </marker>
              </defs>

              {currentTopology?.edges?.map((edge) => {
                const source = currentTopology.nodes?.find((n) => n.id === edge.sourceNodeId);
                const target = currentTopology.nodes?.find((n) => n.id === edge.targetNodeId);
                if (!source || !target) return null;

                const sx = source.positionX + 88;
                const sy = source.positionY + 32;
                const tx = target.positionX + 88;
                const ty = target.positionY + 32;

                const midX = (sx + tx) / 2;
                const midY = (sy + ty) / 2;

                const connStyle = CONNECTION_TYPE_COLORS[edge.connectionType] || CONNECTION_TYPE_COLORS.OTHER;

                return (
                  <g key={edge.id} className="cursor-pointer group">
                    <line
                      x1={sx}
                      y1={sy}
                      x2={tx}
                      y2={ty}
                      stroke={connStyle.stroke}
                      strokeWidth="2.5"
                      strokeDasharray={connStyle.dash || 'none'}
                      className="opacity-80 group-hover:opacity-100 group-hover:stroke-white transition-opacity"
                    />

                    {/* Edge Label Badge */}
                    <foreignObject
                      x={midX - 45}
                      y={midY - 14}
                      width="90"
                      height="28"
                      className="overflow-visible"
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasPermission('TOPOLOGY_DELETE')) {
                            setDeleteConfirmModal({
                              type: 'edge',
                              id: edge.id,
                              title: '¿Eliminar conexión?',
                              description: `Eliminar el enlace entre "${source.label}" y "${target.label}".`,
                            });
                          }
                        }}
                        className="bg-[#0F141B]/90 border border-[#252D38] hover:border-[#06B6D4] px-1.5 py-0.5 rounded text-[10px] text-[#94A3B8] hover:text-[#06B6D4] text-center font-mono truncate shadow cursor-pointer transition-colors"
                        title={`Conexión: ${edge.label || edge.connectionType} (${edge.speed || 'N/A'})\nHaz clic para eliminar`}
                      >
                        {edge.label || edge.speed || edge.connectionType}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>

            {/* Topology Nodes Layer */}
            {filteredNodes.map((node) => {
              const IconComponent = NODE_TYPE_ICONS[node.nodeType] || HelpCircle;
              const isSelected = selectedNodeId === node.id;
              const status = node.computedStatus || node.machine?.status || 'UNKNOWN';

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeDragStart(e, node)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                  style={{
                    transform: `translate(${node.positionX}px, ${node.positionY}px)`,
                  }}
                  className={`absolute w-44 rounded-xl border p-2.5 transition-shadow cursor-grab active:cursor-grabbing pointer-events-auto select-none ${
                    isSelected
                      ? 'bg-[#151B23] border-[#06B6D4] shadow-xl shadow-cyan-500/20 ring-2 ring-[#06B6D4]/50'
                      : 'bg-[#0F141B]/95 hover:bg-[#151B23] border-[#252D38] hover:border-[#64748B] shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          status === 'ONLINE'
                            ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                            : status === 'WARNING'
                            ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30'
                            : status === 'CRITICAL' || status === 'DOWN'
                            ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                            : 'bg-[#151B23] text-[#94A3B8] border border-[#252D38]'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#F1F5F9] truncate" title={node.label}>
                          {node.label}
                        </div>
                        <div className="text-[10px] text-[#64748B] uppercase font-mono tracking-wider">
                          {node.nodeType}
                        </div>
                      </div>
                    </div>

                    {/* Status pulse dot */}
                    <div className="flex items-center gap-1 mt-0.5">
                      {node.activeIncidentsCount && node.activeIncidentsCount > 0 ? (
                        <span
                          className="px-1 py-0.2 rounded-full text-[9px] font-bold bg-[#EF4444] text-[#0B0F14] animate-pulse"
                          title={`${node.activeIncidentsCount} Incidentes activos`}
                        >
                          {node.activeIncidentsCount}
                        </span>
                      ) : (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            status === 'ONLINE'
                              ? 'bg-[#22C55E]'
                              : status === 'WARNING'
                              ? 'bg-[#F59E0B]'
                              : status === 'CRITICAL' || status === 'DOWN'
                              ? 'bg-[#EF4444]'
                              : 'bg-[#64748B]'
                          }`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Subtitle: IP or Network */}
                  <div className="text-[10px] text-[#94A3B8] font-mono truncate flex items-center justify-between border-t border-[#252D38]/60 pt-1 mt-1">
                    <span className="truncate">
                      {node.machine?.primaryIp || node.network?.cidr || (node.location ? node.location.name : '—')}
                    </span>
                    {node.machine?.group && (
                      <span className="text-[#64748B] text-[9px] bg-[#151B23] px-1 rounded">
                        {node.machine.group}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Slide-over Inspector Drawer for Selected Node */}
        {activeSelectedNode && (
          <div className="absolute top-0 right-0 h-full w-96 bg-[#0F141B] border-l border-[#252D38] shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#252D38] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#151B23] border border-[#252D38] flex items-center justify-center text-[#06B6D4]">
                  {React.createElement(NODE_TYPE_ICONS[activeSelectedNode.nodeType] || HelpCircle, {
                    className: 'w-4 h-4',
                  })}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F1F5F9] truncate max-w-[200px]">
                    {activeSelectedNode.label}
                  </h3>
                  <div className="text-[10px] text-[#64748B] uppercase font-mono">
                    {activeSelectedNode.nodeType} &bull; ID: {activeSelectedNode.id.substring(0, 8)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Info */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar text-xs">
              {/* Status Section */}
              <div className="bg-[#151B23] border border-[#252D38] p-3 rounded-xl space-y-2">
                <div className="text-[#64748B] text-[10px] uppercase font-semibold tracking-wider">
                  Estado Operativo
                </div>
                <div className="flex items-center justify-between">
                  {getStatusBadge(activeSelectedNode.computedStatus || activeSelectedNode.machine?.status)}
                  {activeSelectedNode.activeIncidentsCount !== undefined && (
                    <span className="text-[#EF4444] font-semibold text-[11px]">
                      {activeSelectedNode.activeIncidentsCount} Incidente(s)
                    </span>
                  )}
                </div>
              </div>

              {/* Linked Entity Info */}
              {activeSelectedNode.machine ? (
                <div className="space-y-3 bg-[#151B23] border border-[#252D38] p-3 rounded-xl">
                  <div className="text-[#06B6D4] font-semibold flex items-center justify-between">
                    <span>Host de Inventario</span>
                    <button
                      onClick={() => onSelectMachine && onSelectMachine(activeSelectedNode.machine!.id)}
                      className="text-[11px] text-[#06B6D4] hover:underline flex items-center gap-1"
                    >
                      Ver Ficha <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Hostname:</span>
                      <span className="font-mono text-[#F1F5F9]">{activeSelectedNode.machine.hostname}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">IP Principal:</span>
                      <span className="font-mono text-[#06B6D4]">{activeSelectedNode.machine.primaryIp || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">SO / Kernel:</span>
                      <span className="text-[#F1F5F9]">{activeSelectedNode.machine.os || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Grupo:</span>
                      <span className="text-[#F1F5F9]">{activeSelectedNode.machine.group || 'Sin grupo'}</span>
                    </div>
                  </div>
                </div>
              ) : activeSelectedNode.network ? (
                <div className="space-y-3 bg-[#151B23] border border-[#252D38] p-3 rounded-xl">
                  <div className="text-[#06B6D4] font-semibold flex items-center justify-between">
                    <span>Subred Asociada</span>
                    <button
                      onClick={onNavigateToIpam}
                      className="text-[11px] text-[#06B6D4] hover:underline flex items-center gap-1"
                    >
                      Ir a IPAM <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Nombre:</span>
                      <span className="text-[#F1F5F9]">{activeSelectedNode.network.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">CIDR:</span>
                      <span className="font-mono text-[#06B6D4]">{activeSelectedNode.network.cidr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Gateway:</span>
                      <span className="font-mono text-[#F1F5F9]">{activeSelectedNode.network.gateway || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#151B23] border border-[#252D38] p-3 rounded-xl text-center text-[#64748B]">
                  Nodo lógico independiente (no vinculado a host específico).
                </div>
              )}

              {/* Physical Location Info */}
              {activeSelectedNode.location && (
                <div className="space-y-2 bg-[#151B23] border border-[#252D38] p-3 rounded-xl">
                  <div className="text-[#22C55E] font-semibold">Ubicación Física</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Lugar:</span>
                      <span className="text-[#F1F5F9]">{activeSelectedNode.location.name}</span>
                    </div>
                    {activeSelectedNode.location.building && (
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Edificio:</span>
                        <span className="text-[#F1F5F9]">{activeSelectedNode.location.building}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Connected Edges */}
              <div className="space-y-2">
                <div className="text-[#64748B] text-[10px] uppercase font-semibold tracking-wider">
                  Enlaces Conectados
                </div>
                {currentTopology?.edges?.filter(
                  (e) => e.sourceNodeId === activeSelectedNode.id || e.targetNodeId === activeSelectedNode.id
                ).length === 0 ? (
                  <div className="text-[#64748B] italic">No hay enlaces directos.</div>
                ) : (
                  <div className="space-y-1.5">
                    {currentTopology?.edges
                      ?.filter(
                        (e) => e.sourceNodeId === activeSelectedNode.id || e.targetNodeId === activeSelectedNode.id
                      )
                      .map((edge) => {
                        const isSource = edge.sourceNodeId === activeSelectedNode.id;
                        const otherNodeId = isSource ? edge.targetNodeId : edge.sourceNodeId;
                        const otherNode = currentTopology.nodes?.find((n) => n.id === otherNodeId);

                        return (
                          <div
                            key={edge.id}
                            className="bg-[#151B23] border border-[#252D38] p-2 rounded-lg flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-[#F1F5F9] flex items-center gap-1">
                                <span>{isSource ? 'Hacia &rarr;' : 'Desde &larr;'}</span>
                                <span className="text-[#06B6D4] font-semibold">{otherNode?.label || 'Nodo'}</span>
                              </div>
                              <div className="text-[10px] text-[#64748B] font-mono">
                                {edge.connectionType} {edge.speed ? `&bull; ${edge.speed}` : ''}
                              </div>
                            </div>
                            {hasPermission('TOPOLOGY_DELETE') && (
                              <button
                                onClick={() => handleDeleteEdge(edge.id)}
                                className="p-1 text-rose-400 hover:text-rose-300 transition-colors"
                                title="Eliminar este enlace"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-[#252D38] space-y-2 bg-[#0B0F14]/60">
              {hasPermission('TOPOLOGY_DELETE') && (
                <button
                  onClick={() => {
                    setDeleteConfirmModal({
                      type: 'node',
                      id: activeSelectedNode.id,
                      title: `¿Retirar nodo "${activeSelectedNode.label}" del mapa?`,
                      description:
                        'Esta acción solo elimina la representación visual del nodo en esta topología. NINGUNA máquina de inventario será eliminada.',
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Retirar Nodo del Mapa</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* MODALS */}
      {/* ==================================================== */}

      {/* 1. Create Topology Modal */}
      {isCreateTopoModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F141B] border border-[#252D38] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#F1F5F9] mb-1 flex items-center gap-2">
              <GitFork className="w-5 h-5 text-[#06B6D4]" />
              <span>Nueva Topología de Red</span>
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              Crea un nuevo mapa de infraestructura lógico o físico.
            </p>

            <form onSubmit={handleCreateTopology} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">Nombre del Mapa *</label>
                <input
                  type="text"
                  required
                  placeholder="p. ej. Datacenter Principal, Red DMZ, Planta 2"
                  value={topoFormData.name}
                  onChange={(e) => setTopoFormData({ ...topoFormData, name: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3.5 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre este diagrama de red..."
                  value={topoFormData.description}
                  onChange={(e) => setTopoFormData({ ...topoFormData, description: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3.5 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="topoDefault"
                  checked={topoFormData.isDefault}
                  onChange={(e) => setTopoFormData({ ...topoFormData, isDefault: e.target.checked })}
                  className="rounded border-[#252D38] bg-[#151B23] text-[#06B6D4] focus:ring-0"
                />
                <label htmlFor="topoDefault" className="text-xs text-[#F1F5F9] cursor-pointer">
                  Marcar como topología predeterminada
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#252D38]">
                <button
                  type="button"
                  onClick={() => setIsCreateTopoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#151B23] hover:bg-[#1A212B] text-[#94A3B8] text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#06B6D4] hover:bg-[#0891b2] text-[#0B0F14] text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Crear Mapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Topology Modal */}
      {isEditTopoModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F141B] border border-[#252D38] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#F1F5F9] mb-1 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#06B6D4]" />
              <span>Editar Topología</span>
            </h3>

            <form onSubmit={handleUpdateTopology} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={topoFormData.name}
                  onChange={(e) => setTopoFormData({ ...topoFormData, name: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3.5 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={topoFormData.description}
                  onChange={(e) => setTopoFormData({ ...topoFormData, description: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3.5 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="topoEditDefault"
                  checked={topoFormData.isDefault}
                  onChange={(e) => setTopoFormData({ ...topoFormData, isDefault: e.target.checked })}
                  className="rounded border-[#252D38] bg-[#151B23] text-[#06B6D4] focus:ring-0"
                />
                <label htmlFor="topoEditDefault" className="text-xs text-[#F1F5F9] cursor-pointer">
                  Marcar como topología predeterminada
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#252D38]">
                <button
                  type="button"
                  onClick={() => setIsEditTopoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#151B23] hover:bg-[#1A212B] text-[#94A3B8] text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#06B6D4] hover:bg-[#0891b2] text-[#0B0F14] text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Node Modal */}
      {isAddNodeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F141B] border border-[#252D38] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#F1F5F9] mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#06B6D4]" />
              <span>Añadir Nodo al Diagrama</span>
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              Selecciona una máquina física de inventario o crea un nodo conceptual / periférico de red.
            </p>

            <form onSubmit={handleAddNode} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">Tipo de Dispositivo *</label>
                  <select
                    value={nodeFormData.nodeType}
                    onChange={(e) =>
                      setNodeFormData({ ...nodeFormData, nodeType: e.target.value as TopologyNodeType })
                    }
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="ROUTER">Router</option>
                    <option value="FIREWALL">Firewall</option>
                    <option value="SWITCH">Switch</option>
                    <option value="ACCESS_POINT">Punto de Acceso (AP)</option>
                    <option value="SERVER">Servidor</option>
                    <option value="WORKSTATION">Estación de Trabajo</option>
                    <option value="NAS">NAS / Almacenamiento</option>
                    <option value="VM">Máquina Virtual (VM)</option>
                    <option value="CONTAINER">Contenedor</option>
                    <option value="NETWORK">Subred / Red</option>
                    <option value="VLAN">VLAN</option>
                    <option value="INTERNET">Nube / Internet</option>
                    <option value="UPS">UPS / SAI</option>
                    <option value="PRINTER">Impresora</option>
                    <option value="PHONE">Teléfono IP</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Vincular a Host (Opcional)
                  </label>
                  <select
                    value={nodeFormData.machineId}
                    onChange={(e) => {
                      const mId = e.target.value;
                      const match = availableMachines.find((x) => x.id === mId);
                      setNodeFormData({
                        ...nodeFormData,
                        machineId: mId,
                        label: match ? match.hostname : nodeFormData.label,
                      });
                    }}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="">-- Sin host vinculado --</option>
                    {availableMachines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.hostname} ({m.primaryIp || 'Sin IP'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Etiqueta Visible (Label)
                </label>
                <input
                  type="text"
                  placeholder="p. ej. Router Core 01, Web Server, Firewall DMZ"
                  value={nodeFormData.label}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, label: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3.5 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">Subred (Opcional)</label>
                  <select
                    value={nodeFormData.networkId}
                    onChange={(e) => setNodeFormData({ ...nodeFormData, networkId: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="">-- Ninguna --</option>
                    {availableNetworks.map((net) => (
                      <option key={net.id} value={net.id}>
                        {net.name} ({net.cidr})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">Ubicación (Opcional)</label>
                  <select
                    value={nodeFormData.locationId}
                    onChange={(e) => setNodeFormData({ ...nodeFormData, locationId: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="">-- Ninguna --</option>
                    {availableLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#252D38]">
                <button
                  type="button"
                  onClick={() => setIsAddNodeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#151B23] hover:bg-[#1A212B] text-[#94A3B8] text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#06B6D4] hover:bg-[#0891b2] text-[#0B0F14] text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Insertar Nodo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Edge / Connection Modal */}
      {isAddEdgeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F141B] border border-[#252D38] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#F1F5F9] mb-1 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-[#22C55E]" />
              <span>Conectar Nodos (Añadir Enlace)</span>
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              Establece una relación física o lógica entre dos elementos del mapa.
            </p>

            <form onSubmit={handleAddEdge} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">Nodo Origen (Source) *</label>
                <select
                  required
                  value={edgeFormData.sourceNodeId}
                  onChange={(e) => setEdgeFormData({ ...edgeFormData, sourceNodeId: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value="">-- Seleccionar origen --</option>
                  {currentTopology?.nodes?.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.nodeType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">Nodo Destino (Target) *</label>
                <select
                  required
                  value={edgeFormData.targetNodeId}
                  onChange={(e) => setEdgeFormData({ ...edgeFormData, targetNodeId: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value="">-- Seleccionar destino --</option>
                  {currentTopology?.nodes?.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.nodeType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">Tipo de Conexión</label>
                  <select
                    value={edgeFormData.connectionType}
                    onChange={(e) =>
                      setEdgeFormData({
                        ...edgeFormData,
                        connectionType: e.target.value as TopologyConnectionType,
                      })
                    }
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="ETHERNET">Ethernet (Cobre)</option>
                    <option value="FIBER">Fibra Óptica</option>
                    <option value="WIFI">Inalámbrico (WiFi)</option>
                    <option value="VPN">Túnel VPN</option>
                    <option value="VLAN">VLAN Trunk / Access</option>
                    <option value="LOGICAL">Lógico / Enrutado</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">Velocidad / Ancho de Banda</label>
                  <input
                    type="text"
                    placeholder="1 Gbps, 10 Gbps, 100 Mbps"
                    value={edgeFormData.speed}
                    onChange={(e) => setEdgeFormData({ ...edgeFormData, speed: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">Etiqueta Opcional</label>
                <input
                  type="text"
                  placeholder="p. ej. Eth0 -> Port 24, Trunk VLAN 100"
                  value={edgeFormData.label}
                  onChange={(e) => setEdgeFormData({ ...edgeFormData, label: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl px-3.5 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#252D38]">
                <button
                  type="button"
                  onClick={() => setIsAddEdgeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#151B23] hover:bg-[#1A212B] text-[#94A3B8] text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#16a34a] text-[#0B0F14] text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Crear Conexión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Import Topology JSON Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F141B] border border-[#252D38] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#F1F5F9] mb-1 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#06B6D4]" />
              <span>Importar Topología desde JSON</span>
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              Pega la estructura JSON generada por InfraInventory para restaurar o duplicar un mapa.
            </p>

            <form onSubmit={handleImportTopology} className="space-y-4">
              <div>
                <textarea
                  rows={9}
                  required
                  placeholder='{"name": "Mi Mapa", "nodes": [...], "edges": [...]}'
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl p-3 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#252D38]">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#151B23] hover:bg-[#1A212B] text-[#94A3B8] text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-4 py-2 rounded-xl bg-[#06B6D4] hover:bg-[#0891b2] text-[#0B0F14] text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
                >
                  {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Procesar Importación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Non-Destructive Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F141B] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-rose-400 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>{deleteConfirmModal.title}</span>
            </h3>
            <p className="text-xs text-[#94A3B8] mt-2 mb-4 leading-relaxed">
              {deleteConfirmModal.description}
            </p>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-[#252D38]">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-[#151B23] hover:bg-[#1A212B] text-[#94A3B8] text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmModal.type === 'topology') handleDeleteTopology();
                  else if (deleteConfirmModal.type === 'node') handleDeleteNode(deleteConfirmModal.id);
                  else if (deleteConfirmModal.type === 'edge') handleDeleteEdge(deleteConfirmModal.id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopologyPage;
