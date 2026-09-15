import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  Network,
  VLAN,
  IPAddress,
  Location,
  Machine,
  IpamStats,
  IPConflict,
  SubnetCalculationResult,
} from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import {
  Network as NetworkIcon,
  Binary,
  Calculator,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Download,
  Upload,
  Server,
  MapPin,
  Trash2,
  Edit2,
} from 'lucide-react';

interface IpamPageProps {
  onSelectMachine?: (id: string) => void;
  onNavigateToVlans?: () => void;
  onNavigateToLocations?: () => void;
}

export const IpamPage: React.FC<IpamPageProps> = ({
  onSelectMachine,
  onNavigateToVlans: _onNavigateToVlans,
  onNavigateToLocations: _onNavigateToLocations,
}) => {
  const toast = useToast();

  // Primary Data states
  const [networks, setNetworks] = useState<Network[]>([]);
  const [vlans, setVlans] = useState<VLAN[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState<IpamStats | null>(null);
  const [conflicts, setConflicts] = useState<IPConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Network for deep dive view
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [selectedNetworkDetail, setSelectedNetworkDetail] = useState<Network | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [networkSearch, setNetworkSearch] = useState('');
  const [ipTableSearch, setIpTableSearch] = useState('');

  // Subnet Calculator interactive modal state
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcInput, setCalcInput] = useState('192.168.10.0/24');
  const [calcResult, setCalcResult] = useState<SubnetCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Add / Edit Network Modal
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  const [netName, setNetName] = useState('');
  const [netCidr, setNetCidr] = useState('');
  const [netGateway, setNetGateway] = useState('');
  const [netDns, setNetDns] = useState('');
  const [netVlanId, setNetVlanId] = useState('');
  const [netLocationId, setNetLocationId] = useState('');
  const [netDhcpEnabled, setNetDhcpEnabled] = useState(false);
  const [netDhcpStart, setNetDhcpStart] = useState('');
  const [netDhcpEnd, setNetDhcpEnd] = useState('');
  const [netDescription, setNetDescription] = useState('');
  const [isSubmittingNet, setIsSubmittingNet] = useState(false);

  // Add / Edit IP Modal
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [editingIp, setEditingIp] = useState<IPAddress | null>(null);
  const [ipAddressVal, setIpAddressVal] = useState('');
  const [ipStatusVal, setIpStatusVal] = useState<'FREE' | 'ASSIGNED' | 'RESERVED' | 'DHCP'>('ASSIGNED');
  const [ipMachineIdVal, setIpMachineIdVal] = useState('');
  const [ipHostnameVal, setIpHostnameVal] = useState('');
  const [ipMacVal, setIpMacVal] = useState('');
  const [ipDescriptionVal, setIpDescriptionVal] = useState('');
  const [isSubmittingIp, setIsSubmittingIp] = useState(false);

  // CSV Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Delete Modals
  const [networkToDelete, setNetworkToDelete] = useState<Network | null>(null);
  const [ipToDelete, setIpToDelete] = useState<IPAddress | null>(null);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [netsData, vlansData, locsData, machData, statsData, conflictsData] = await Promise.all([
        api.getNetworks(),
        api.getVlans(),
        api.getLocations(),
        api.getMachines({ limit: 100 }),
        api.getIpamStats(),
        api.getIpamConflicts(),
      ]);

      setNetworks(netsData || []);
      setVlans(vlansData || []);
      setLocations(locsData || []);
      setMachines(machData.items || []);
      setStats(statsData || null);
      setConflicts(conflictsData || []);

      // Auto-select first network if none selected
      if (!selectedNetworkId && netsData && netsData.length > 0) {
        setSelectedNetworkId(netsData[0].id);
      }
    } catch (err: any) {
      toast.error('Error al cargar datos de IPAM', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNetworkDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await api.getNetwork(id);
      setSelectedNetworkDetail(detail);
    } catch (err: any) {
      toast.error('Error al cargar detalle de red', err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (selectedNetworkId) {
      loadNetworkDetail(selectedNetworkId);
    }
  }, [selectedNetworkId]);

  // Subnet Calculator Action
  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!calcInput.trim()) return;
    setIsCalculating(true);
    try {
      const result = await api.calculateSubnet(calcInput.trim());
      setCalcResult(result);
    } catch (err: any) {
      toast.error('Error de cálculo CIDR', err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Open Network Create / Edit
  const handleOpenAddNetwork = () => {
    setEditingNetwork(null);
    setNetName('');
    setNetCidr('');
    setNetGateway('');
    setNetDns('8.8.8.8, 1.1.1.1');
    setNetVlanId('');
    setNetLocationId('');
    setNetDhcpEnabled(false);
    setNetDhcpStart('');
    setNetDhcpEnd('');
    setNetDescription('');
    setIsNetworkModalOpen(true);
  };

  const handleOpenEditNetwork = (net: Network) => {
    setEditingNetwork(net);
    setNetName(net.name);
    setNetCidr(net.cidr);
    setNetGateway(net.gateway || '');
    setNetDns(net.dns || '');
    setNetVlanId(net.vlanId || '');
    setNetLocationId(net.locationId || '');
    setNetDhcpEnabled(net.dhcpEnabled || false);
    setNetDhcpStart(net.dhcpStart || '');
    setNetDhcpEnd(net.dhcpEnd || '');
    setNetDescription(net.description || '');
    setIsNetworkModalOpen(true);
  };

  const handleSaveNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!netName.trim() || !netCidr.trim()) {
      toast.warning('Campos requeridos', 'Ingresa nombre y formato CIDR válido (ej: 192.168.1.0/24)');
      return;
    }

    setIsSubmittingNet(true);
    try {
      if (editingNetwork) {
        await api.updateNetwork(editingNetwork.id, {
          name: netName.trim(),
          cidr: netCidr.trim(),
          gateway: netGateway.trim() || null,
          dns: netDns.trim() || null,
          vlanId: netVlanId || null,
          locationId: netLocationId || null,
          dhcpEnabled: netDhcpEnabled,
          dhcpStart: netDhcpStart.trim() || null,
          dhcpEnd: netDhcpEnd.trim() || null,
          description: netDescription.trim() || null,
        });
        toast.success('Red actualizada', `La subred ${netCidr} ha sido actualizada.`);
      } else {
        const created = await api.createNetwork({
          name: netName.trim(),
          cidr: netCidr.trim(),
          gateway: netGateway.trim() || null,
          dns: netDns.trim() || null,
          vlanId: netVlanId || null,
          locationId: netLocationId || null,
          dhcpEnabled: netDhcpEnabled,
          dhcpStart: netDhcpStart.trim() || null,
          dhcpEnd: netDhcpEnd.trim() || null,
          description: netDescription.trim() || null,
        });
        toast.success('Red creada', `Subred ${created.cidr} agregada a IPAM.`);
        setSelectedNetworkId(created.id);
      }
      setIsNetworkModalOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error('Error al guardar red', err.message);
    } finally {
      setIsSubmittingNet(false);
    }
  };

  const handleDeleteNetwork = async () => {
    if (!networkToDelete) return;
    try {
      await api.deleteNetwork(networkToDelete.id);
      toast.success('Red eliminada', `Subred ${networkToDelete.cidr} eliminada.`);
      setNetworkToDelete(null);
      if (selectedNetworkId === networkToDelete.id) {
        setSelectedNetworkId(null);
      }
      loadAll();
    } catch (err: any) {
      toast.error('Error al eliminar red', err.message);
    }
  };

  // Open IP Create / Edit
  const handleOpenAddIp = () => {
    setEditingIp(null);
    setIpAddressVal('');
    setIpStatusVal('ASSIGNED');
    setIpMachineIdVal('');
    setIpHostnameVal('');
    setIpMacVal('');
    setIpDescriptionVal('');
    setIsIpModalOpen(true);
  };

  const handleOpenEditIp = (ip: IPAddress) => {
    setEditingIp(ip);
    setIpAddressVal(ip.address || ip.ip);
    setIpStatusVal(ip.status as any || 'ASSIGNED');
    setIpMachineIdVal(ip.machineId || '');
    setIpHostnameVal(ip.hostname || (ip.machine ? ip.machine.hostname : ''));
    setIpMacVal(ip.macAddress || (ip.machine ? ip.machine.macAddress || '' : ''));
    setIpDescriptionVal(ip.description || '');
    setIsIpModalOpen(true);
  };

  const handleSaveIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddressVal.trim()) {
      toast.warning('Campo requerido', 'Ingresa una dirección IPv4 válida.');
      return;
    }

    setIsSubmittingIp(true);
    try {
      if (editingIp) {
        await api.updateIP(editingIp.id, {
          ip: ipAddressVal.trim(),
          address: ipAddressVal.trim(),
          status: ipStatusVal,
          machineId: ipMachineIdVal || null,
          hostname: ipHostnameVal.trim() || null,
          macAddress: ipMacVal.trim() || null,
          description: ipDescriptionVal.trim() || null,
          networkId: selectedNetworkId || undefined,
        });
        toast.success('IP actualizada', `La dirección ${ipAddressVal} ha sido actualizada.`);
      } else {
        await api.createIP({
          ip: ipAddressVal.trim(),
          address: ipAddressVal.trim(),
          status: ipStatusVal,
          machineId: ipMachineIdVal || null,
          hostname: ipHostnameVal.trim() || null,
          macAddress: ipMacVal.trim() || null,
          description: ipDescriptionVal.trim() || null,
          networkId: selectedNetworkId || null,
        });
        toast.success('IP registrada', `Dirección ${ipAddressVal} asignada en IPAM.`);
      }
      setIsIpModalOpen(false);
      if (selectedNetworkId) loadNetworkDetail(selectedNetworkId);
      loadAll();
    } catch (err: any) {
      toast.error('Error al guardar IP', err.message);
    } finally {
      setIsSubmittingIp(false);
    }
  };

  const handleDeleteIp = async () => {
    if (!ipToDelete) return;
    try {
      await api.deleteIP(ipToDelete.id);
      toast.success('IP eliminada', `Dirección ${ipToDelete.address || ipToDelete.ip} eliminada.`);
      setIpToDelete(null);
      if (selectedNetworkId) loadNetworkDetail(selectedNetworkId);
      loadAll();
    } catch (err: any) {
      toast.error('Error al eliminar IP', err.message);
    }
  };

  // Quick Action: Release IP
  const handleReleaseIp = async (ip: IPAddress) => {
    try {
      await api.updateIP(ip.id, {
        machineId: null,
        interfaceId: null,
        status: 'FREE',
      });
      toast.success('IP Liberada', `La dirección ${ip.address || ip.ip} ahora está disponible (FREE).`);
      if (selectedNetworkId) loadNetworkDetail(selectedNetworkId);
      loadAll();
    } catch (err: any) {
      toast.error('Error al liberar IP', err.message);
    }
  };

  // Quick Action: Reserve IP
  const handleReserveIp = async (ip: IPAddress) => {
    try {
      await api.updateIP(ip.id, {
        status: 'RESERVED',
        description: 'Reservada para infraestructura',
      });
      toast.info('IP Reservada', `La dirección ${ip.address || ip.ip} ha sido marcada como RESERVED.`);
      if (selectedNetworkId) loadNetworkDetail(selectedNetworkId);
      loadAll();
    } catch (err: any) {
      toast.error('Error al reservar IP', err.message);
    }
  };

  // CSV Export & Import Handlers
  const handleExportCsv = async () => {
    try {
      const csvText = await api.exportIpamCsv();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `infrainventory-ipam-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exportación completa', 'Archivo CSV de IPAM generado exitosamente.');
    } catch (err: any) {
      toast.error('Error en exportación CSV', err.message);
    }
  };

  const handleImportCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      toast.warning('Contenido vacío', 'Pega el texto CSV a importar.');
      return;
    }

    setIsImporting(true);
    try {
      const result = await api.importIpamCsv(csvContent);
      if (result.errorsCount > 0) {
        toast.warning('Importación parcial', `Se importaron ${result.importedCount} registros con ${result.errorsCount} avisos.`);
      } else {
        toast.success('Importación exitosa', `${result.importedCount} registros de IPAM importados.`);
      }
      setIsImportModalOpen(false);
      setCsvContent('');
      loadAll();
    } catch (err: any) {
      toast.error('Error al importar CSV', err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered networks list
  const filteredNetworks = networks.filter((n) => {
    const term = networkSearch.toLowerCase();
    return (
      n.name.toLowerCase().includes(term) ||
      n.cidr.toLowerCase().includes(term) ||
      (n.gateway && n.gateway.toLowerCase().includes(term)) ||
      (n.location && n.location.name.toLowerCase().includes(term)) ||
      (n.vlan && n.vlan.name.toLowerCase().includes(term))
    );
  });

  // Filtered IP table in selected network
  const currentNetworkIps = selectedNetworkDetail?.ipAddresses || [];
  const filteredIps = currentNetworkIps.filter((ip) => {
    const term = ipTableSearch.toLowerCase();
    const addr = (ip.address || ip.ip).toLowerCase();
    const hostname = (ip.hostname || (ip.machine ? ip.machine.hostname : '')).toLowerCase();
    const mac = (ip.macAddress || (ip.machine ? ip.machine.macAddress || '' : '')).toLowerCase();
    const status = ip.status.toLowerCase();
    return addr.includes(term) || hostname.includes(term) || mac.includes(term) || status.includes(term);
  });

  const getIpStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFLICT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> CONFLICT
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
            ASSIGNED
          </span>
        );
      case 'RESERVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
            RESERVED
          </span>
        );
      case 'DHCP':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30">
            DHCP
          </span>
        );
      case 'FREE':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#64748B]/20 text-[#94A3B8] border border-[#64748B]/30">
            FREE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Quick Action Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#06B6D4]" />
            Módulo IPAM & Gestión Integral de Subredes
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Control de direccionamiento IP, subredes CIDR, gateways, VLANs y prevención de conflictos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Calculator className="w-3.5 h-3.5 text-[#06B6D4]" />}
            onClick={() => {
              setIsCalcModalOpen(true);
              if (!calcResult) handleCalculate();
            }}
          >
            Calculadora CIDR
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCsv}
          >
            Exportar CSV
          </Button>

          <Can permission="IPAM_IMPORT">
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => setIsImportModalOpen(true)}
            >
              Importar CSV
            </Button>
          </Can>

          <Can permission="NETWORK_CREATE">
            <Button
              variant="cyan"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenAddNetwork}
            >
              Nueva Red
            </Button>
          </Can>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadAll}
          />
        </div>
      </div>

      {/* Conflicts Alert Banner if any detected */}
      {conflicts.length > 0 && (
        <Card className="p-4 bg-[#EF4444]/10 border-[#EF4444]/40 border-l-4 border-l-[#EF4444] animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1 flex-1">
              <div className="text-sm font-bold text-[#EF4444] flex items-center gap-2">
                <span>¡Alerta de Conflicto de Direcciones IP Detectado!</span>
                <span className="text-xs font-mono px-2 py-0.2 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/40">
                  {conflicts.length} conflicto(s) activo(s)
                </span>
              </div>
              <p className="text-xs text-[#F1F5F9]/80">
                Se detectaron direcciones IP duplicadas asignadas a múltiples hosts simultáneamente:
              </p>
              <div className="mt-2 space-y-1 text-xs font-mono">
                {conflicts.map((c, idx) => (
                  <div key={idx} className="p-2 rounded bg-[#0B0F14]/70 border border-[#EF4444]/30 flex items-center justify-between">
                    <div>
                      <span className="text-[#EF4444] font-bold">{c.ip}</span> &rarr; Asignada a:{' '}
                      <span className="text-[#F1F5F9]">{c.machines.map((m) => m.hostname).join(', ')}</span>
                    </div>
                    <span className="text-[10px] text-[#94A3B8]">Detección en tiempo real</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <Card className="p-4 border-l-2 border-l-[#06B6D4] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Subredes Totales</div>
          <div className="text-2xl font-bold font-mono text-[#06B6D4] mt-1.5 flex items-baseline gap-2">
            <span>{stats?.totalNetworks || networks.length}</span>
            <span className="text-xs font-normal text-[#64748B]">redes</span>
          </div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#22C55E] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">IPs Asignadas</div>
          <div className="text-2xl font-bold font-mono text-[#22C55E] mt-1.5 flex items-baseline gap-2">
            <span>{stats?.assignedIps || 0}</span>
            <span className="text-xs font-normal text-[#64748B]">en uso</span>
          </div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#64748B] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">IPs Disponibles (Free)</div>
          <div className="text-2xl font-bold font-mono text-[#94A3B8] mt-1.5 flex items-baseline gap-2">
            <span>{stats?.freeIps || 0}</span>
            <span className="text-xs font-normal text-[#64748B]">libres</span>
          </div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#F59E0B] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">IPs Reservadas</div>
          <div className="text-2xl font-bold font-mono text-[#F59E0B] mt-1.5 flex items-baseline gap-2">
            <span>{stats?.reservedIps || 0}</span>
            <span className="text-xs font-normal text-[#64748B]">reservadas</span>
          </div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#EF4444] bg-[#0F141B] col-span-2 sm:col-span-1">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Conflictos IP</div>
          <div className="text-2xl font-bold font-mono text-[#EF4444] mt-1.5 flex items-baseline gap-2">
            <span>{conflicts.length}</span>
            <span className="text-xs font-normal text-[#64748B]">alertas</span>
          </div>
        </Card>
      </div>

      {/* Main 2-Column Layout: Left (Networks list) | Right (Selected Network IPAM Visualizer & IP Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Subnets Directory */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-1.5">
              <NetworkIcon className="w-4 h-4 text-[#06B6D4]" />
              Catálogo de Subredes ({filteredNetworks.length})
            </h2>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={networkSearch}
              onChange={(e) => setNetworkSearch(e.target.value)}
              placeholder="Filtrar por nombre, CIDR, VLAN o ubicación..."
              className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
            />
          </div>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-1">
            {isLoading ? (
              Array(4)
                .fill(0)
                .map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
            ) : filteredNetworks.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B] border border-dashed border-[#252D38] rounded-xl">
                No se encontraron subredes registradas.
              </div>
            ) : (
              filteredNetworks.map((net) => {
                const isSelected = selectedNetworkId === net.id;
                const usage = net.stats?.usagePercentage || 0;
                return (
                  <div
                    key={net.id}
                    onClick={() => setSelectedNetworkId(net.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#151B23] border-[#06B6D4] shadow-md shadow-cyan-950/20 ring-1 ring-[#06B6D4]/30'
                        : 'bg-[#0F141B] border-[#252D38] hover:border-[#3B82F6]/50 hover:bg-[#151B23]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                          <span>{net.name}</span>
                          {net.vlan && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30">
                              VLAN {net.vlan.vlanId}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-[#06B6D4] font-semibold mt-0.5">
                          {net.cidr}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Can permission="NETWORK_UPDATE">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditNetwork(net);
                            }}
                            className="p-1 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#F1F5F9]"
                            title="Editar Red"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                        <Can permission="NETWORK_DELETE">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNetworkToDelete(net);
                            }}
                            className="p-1 rounded hover:bg-rose-500/20 text-[#64748B] hover:text-rose-400"
                            title="Eliminar Red"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                      </div>
                    </div>

                    {/* Utilization Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                        <span>Uso: <strong className="text-[#F1F5F9]">{net.stats?.assignedCount || 0}</strong> / {net.stats?.usableAddresses || 254}</span>
                        <span className="font-mono text-[10px]">{usage}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#1A212B] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            usage > 90 ? 'bg-[#EF4444]' : usage > 75 ? 'bg-[#F59E0B]' : 'bg-[#06B6D4]'
                          }`}
                          style={{ width: `${Math.min(100, usage)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#252D38]/60 flex items-center justify-between text-[10px] text-[#64748B] font-mono">
                      <span>GW: {net.gateway || 'N/A'}</span>
                      <span>{net.location ? net.location.name : 'Sin Ubicación'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep IPAM Visualization & IP Addresses Matrix */}
        <div className="lg:col-span-8 space-y-4">
          {isLoadingDetail || !selectedNetworkDetail ? (
            <Card className="p-8 text-center bg-[#0F141B] border-[#252D38]">
              <div className="text-xs text-[#94A3B8]">Selecciona una red para visualizar su espacio de direccionamiento IPAM.</div>
            </Card>
          ) : (
            <>
              {/* Selected Network Summary Banner */}
              <Card className="p-5 bg-gradient-to-br from-[#0F141B] to-[#151B23] border-[#252D38] relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-[#F1F5F9]">{selectedNetworkDetail.name}</h2>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 font-bold">
                        {selectedNetworkDetail.cidr}
                      </span>
                      {selectedNetworkDetail.vlan && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30">
                          VLAN {selectedNetworkDetail.vlan.vlanId} ({selectedNetworkDetail.vlan.name})
                        </span>
                      )}
                      {selectedNetworkDetail.location && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {selectedNetworkDetail.location.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      {selectedNetworkDetail.description || 'Subred administrada bajo motor IPAM.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Can permission="NETWORK_CREATE">
                      <Button
                        variant="cyan"
                        size="sm"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={handleOpenAddIp}
                      >
                        Asignar IP
                      </Button>
                    </Can>
                  </div>
                </div>

                {/* Subnet Technical Specs Bar */}
                <div className="mt-4 pt-3 border-t border-[#252D38] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2 rounded bg-[#0B0F14] border border-[#252D38]/60">
                    <div className="text-[10px] text-[#64748B]">Gateway Principal</div>
                    <div className="text-[#F1F5F9] font-bold">{selectedNetworkDetail.gateway || 'N/A'}</div>
                  </div>
                  <div className="p-2 rounded bg-[#0B0F14] border border-[#252D38]/60">
                    <div className="text-[10px] text-[#64748B]">Rango Útil</div>
                    <div className="text-[#F1F5F9] truncate" title={`${selectedNetworkDetail.calculation?.firstUsableIp} - ${selectedNetworkDetail.calculation?.lastUsableIp}`}>
                      {selectedNetworkDetail.calculation?.firstUsableIp} - {selectedNetworkDetail.calculation?.lastUsableIp}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#0B0F14] border border-[#252D38]/60">
                    <div className="text-[10px] text-[#64748B]">Mascara de Subred</div>
                    <div className="text-[#F1F5F9]">{selectedNetworkDetail.calculation?.subnetMask || '255.255.255.0'}</div>
                  </div>
                  <div className="p-2 rounded bg-[#0B0F14] border border-[#252D38]/60">
                    <div className="text-[10px] text-[#64748B]">DNS Configurado</div>
                    <div className="text-[#F1F5F9] truncate">{selectedNetworkDetail.dns || '8.8.8.8'}</div>
                  </div>
                </div>

                {/* Network IP Usage Breakdown */}
                <div className="mt-4 p-3 rounded-lg bg-[#0B0F14] border border-[#252D38] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#F1F5F9]">Distribución del Espacio de Direccionamiento</span>
                    <span className="font-mono text-xs text-[#94A3B8]">
                      {selectedNetworkDetail.stats?.assignedCount || 0} asignadas &bull; {selectedNetworkDetail.stats?.reservedCount || 0} reservadas &bull; {selectedNetworkDetail.stats?.freeCount || 0} libres
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#1A212B] flex overflow-hidden">
                    <div
                      title="Asignadas"
                      className="bg-[#22C55E] h-full"
                      style={{
                        width: `${((selectedNetworkDetail.stats?.assignedCount || 0) / (selectedNetworkDetail.stats?.usableAddresses || 254)) * 100}%`,
                      }}
                    />
                    <div
                      title="Reservadas"
                      className="bg-[#F59E0B] h-full"
                      style={{
                        width: `${((selectedNetworkDetail.stats?.reservedCount || 0) / (selectedNetworkDetail.stats?.usableAddresses || 254)) * 100}%`,
                      }}
                    />
                    <div
                      title="Conflictos"
                      className="bg-[#EF4444] h-full"
                      style={{
                        width: `${((selectedNetworkDetail.stats?.conflictCount || 0) / (selectedNetworkDetail.stats?.usableAddresses || 254)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </Card>

              {/* IP Addresses Table */}
              <Card className="p-5 bg-[#0F141B] border-[#252D38] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-1.5">
                    <Binary className="w-4 h-4 text-[#06B6D4]" />
                    Tabla de Direccionamiento IP ({filteredIps.length})
                  </h3>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      type="text"
                      value={ipTableSearch}
                      onChange={(e) => setIpTableSearch(e.target.value)}
                      placeholder="Filtrar por IP, host o MAC..."
                      className="w-full bg-[#151B23] border border-[#252D38] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#252D38] text-[#94A3B8] font-mono text-[11px]">
                        <th className="pb-2.5 font-semibold">DIRECCIÓN IP</th>
                        <th className="pb-2.5 font-semibold">ESTADO</th>
                        <th className="pb-2.5 font-semibold">MÁQUINA / HOSTNAME</th>
                        <th className="pb-2.5 font-semibold">MAC ADDRESS</th>
                        <th className="pb-2.5 font-semibold">INTERFAZ</th>
                        <th className="pb-2.5 font-semibold text-right">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252D38]/60">
                      {filteredIps.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#64748B]">
                            No hay direcciones IP registradas en esta subred que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        filteredIps.map((ip) => {
                          const machine = ip.machine;
                          const hasIncidents = machine?.metricAnomalies && machine.metricAnomalies.length > 0;
                          return (
                            <tr key={ip.id} className="hover:bg-[#151B23]/50 transition-colors group">
                              {/* IP Column */}
                              <td className="py-3 font-mono font-bold text-[#F1F5F9]">
                                <div className="flex items-center gap-1.5">
                                  <span>{ip.address || ip.ip}</span>
                                  {ip.isPrimary && (
                                    <span className="text-[9px] font-sans px-1 py-0.2 rounded bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/40">
                                      Primaria
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3">{getIpStatusBadge(ip.status)}</td>

                              {/* Machine / Hostname Link */}
                              <td className="py-3">
                                {machine ? (
                                  <button
                                    onClick={() => onSelectMachine && onSelectMachine(machine.id)}
                                    className="flex items-center gap-1.5 font-medium text-[#06B6D4] hover:underline text-left"
                                  >
                                    <Server className="w-3.5 h-3.5 text-[#64748B]" />
                                    <span>{machine.hostname}</span>
                                    {hasIncidents && (
                                      <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" title="Incidentes activos" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-[#64748B] italic">
                                    {ip.hostname || 'Sin asignar'}
                                  </span>
                                )}
                              </td>

                              {/* MAC */}
                              <td className="py-3 font-mono text-[#94A3B8]">
                                {ip.macAddress || (machine ? machine.macAddress || 'N/A' : 'N/A')}
                              </td>

                              {/* Interface */}
                              <td className="py-3 font-mono text-[#94A3B8]">
                                {ip.interface ? ip.interface.name : 'eth0'}
                              </td>

                              {/* Actions */}
                              <td className="py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {ip.status === 'ASSIGNED' && (
                                    <button
                                      onClick={() => handleReleaseIp(ip)}
                                      className="text-[10px] px-2 py-0.5 rounded bg-[#151B23] border border-[#252D38] text-[#94A3B8] hover:text-[#22C55E] hover:border-[#22C55E]/40 transition-colors"
                                      title="Liberar IP"
                                    >
                                      Liberar
                                    </button>
                                  )}

                                  {ip.status === 'FREE' && (
                                    <button
                                      onClick={() => handleReserveIp(ip)}
                                      className="text-[10px] px-2 py-0.5 rounded bg-[#151B23] border border-[#252D38] text-[#94A3B8] hover:text-[#F59E0B] hover:border-[#F59E0B]/40 transition-colors"
                                      title="Reservar IP"
                                    >
                                      Reservar
                                    </button>
                                  )}

                                  <Can permission="NETWORK_UPDATE">
                                    <button
                                      onClick={() => handleOpenEditIp(ip)}
                                      className="p-1 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#F1F5F9]"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </Can>

                                  <Can permission="NETWORK_DELETE">
                                    <button
                                      onClick={() => setIpToDelete(ip)}
                                      className="p-1 rounded hover:bg-rose-500/20 text-[#64748B] hover:text-rose-400"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </Can>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ======================================================= */}
      {/* 🧮 MODAL: CALCULADORA DE SUBREDES CIDR                 */}
      {/* ======================================================= */}
      <Modal
        isOpen={isCalcModalOpen}
        onClose={() => setIsCalcModalOpen(false)}
        title="Calculadora de Subredes IP & CIDR"
        size="lg"
      >
        <div className="space-y-4">
          <form onSubmit={handleCalculate} className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Dirección de Red / Prefijo CIDR"
                value={calcInput}
                onChange={(e) => setCalcInput(e.target.value)}
                placeholder="ej: 192.168.1.0/24 o 10.0.0.0/16"
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="cyan" isLoading={isCalculating}>
                Calcular
              </Button>
            </div>
          </form>

          {calcResult && (
            <div className="p-4 rounded-xl bg-[#0B0F14] border border-[#252D38] space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#252D38]">
                <span className="text-xs font-bold text-[#06B6D4] font-mono">{calcResult.cidr}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 font-bold">
                  {calcResult.ipClass || 'IPv4 Unicast'} {calcResult.isPrivate ? '(Privada RFC1918)' : '(Pública)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[#64748B] text-[10px]">Dirección de Red (Network):</span>
                  <div className="font-bold text-[#F1F5F9]">{calcResult.networkAddress}</div>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px]">Máscara de Subred:</span>
                  <div className="font-bold text-[#F1F5F9]">{calcResult.subnetMask}</div>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px]">Primera IP Útil:</span>
                  <div className="font-bold text-[#22C55E]">{calcResult.firstUsableIp}</div>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px]">Última IP Útil:</span>
                  <div className="font-bold text-[#22C55E]">{calcResult.lastUsableIp}</div>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px]">Broadcast Address:</span>
                  <div className="font-bold text-[#EF4444]">{calcResult.broadcastAddress}</div>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px]">Default Gateway Sugerido:</span>
                  <div className="font-bold text-[#06B6D4]">{calcResult.gateway}</div>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px]">Total de Direcciones:</span>
                  <div className="font-bold text-[#F1F5F9]">{calcResult.totalAddresses.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px]">Direcciones Útiles para Hosts:</span>
                  <div className="font-bold text-[#22C55E]">{calcResult.usableAddresses.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ======================================================= */}
      {/* 📦 MODAL: CREAR / EDITAR RED                           */}
      {/* ======================================================= */}
      <Modal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        title={editingNetwork ? 'Editar Subred' : 'Crear Nueva Subred'}
        size="md"
      >
        <form onSubmit={handleSaveNetwork} className="space-y-4">
          <Input
            label="Nombre de la Red *"
            value={netName}
            onChange={(e) => setNetName(e.target.value)}
            placeholder="ej: SERVERS, DMZ, USERS"
            required
          />

          <Input
            label="Rango CIDR *"
            value={netCidr}
            onChange={(e) => setNetCidr(e.target.value)}
            placeholder="ej: 192.168.10.0/24"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Gateway"
              value={netGateway}
              onChange={(e) => setNetGateway(e.target.value)}
              placeholder="ej: 192.168.10.1"
            />
            <Input
              label="Servidores DNS"
              value={netDns}
              onChange={(e) => setNetDns(e.target.value)}
              placeholder="ej: 8.8.8.8, 1.1.1.1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">VLAN Asociada</label>
              <select
                value={netVlanId}
                onChange={(e) => setNetVlanId(e.target.value)}
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="">Sin VLAN</option>
                {vlans.map((v) => (
                  <option key={v.id} value={v.id}>
                    VLAN {v.vlanId} - {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Ubicación Física</label>
              <select
                value={netLocationId}
                onChange={(e) => setNetLocationId(e.target.value)}
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="">Sin Ubicación</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B0F14] border border-[#252D38] space-y-2">
            <label className="flex items-center gap-2 text-xs text-[#F1F5F9] cursor-pointer">
              <input
                type="checkbox"
                checked={netDhcpEnabled}
                onChange={(e) => setNetDhcpEnabled(e.target.checked)}
                className="rounded border-[#252D38] bg-[#151B23] text-[#06B6D4] focus:ring-0"
              />
              <span className="font-semibold">Habilitar Rango DHCP en esta Red</span>
            </label>

            {netDhcpEnabled && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Input
                  label="DHCP Inicio"
                  value={netDhcpStart}
                  onChange={(e) => setNetDhcpStart(e.target.value)}
                  placeholder="ej: 192.168.10.100"
                />
                <Input
                  label="DHCP Fin"
                  value={netDhcpEnd}
                  onChange={(e) => setNetDhcpEnd(e.target.value)}
                  placeholder="ej: 192.168.10.200"
                />
              </div>
            )}
          </div>

          <Input
            label="Descripción"
            value={netDescription}
            onChange={(e) => setNetDescription(e.target.value)}
            placeholder="Propósito u observaciones de la subred"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
            <Button variant="secondary" onClick={() => setIsNetworkModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="cyan" isLoading={isSubmittingNet}>
              {editingNetwork ? 'Actualizar Red' : 'Crear Red'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================= */}
      {/* 📍 MODAL: ASIGNAR / EDITAR IP                           */}
      {/* ======================================================= */}
      <Modal
        isOpen={isIpModalOpen}
        onClose={() => setIsIpModalOpen(false)}
        title={editingIp ? 'Editar Dirección IP' : 'Asignar Dirección IP'}
        size="md"
      >
        <form onSubmit={handleSaveIp} className="space-y-4">
          <Input
            label="Dirección IP *"
            value={ipAddressVal}
            onChange={(e) => setIpAddressVal(e.target.value)}
            placeholder="ej: 192.168.10.25"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Estado</label>
              <select
                value={ipStatusVal}
                onChange={(e) => setIpStatusVal(e.target.value as any)}
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="ASSIGNED">ASSIGNED (Asignada)</option>
                <option value="RESERVED">RESERVED (Reservada)</option>
                <option value="DHCP">DHCP (Dinámica)</option>
                <option value="FREE">FREE (Disponible)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Máquina Asociada</label>
              <select
                value={ipMachineIdVal}
                onChange={(e) => setIpMachineIdVal(e.target.value)}
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="">Ninguna</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.hostname} ({m.primaryIp || 'Sin IP'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hostname"
              value={ipHostnameVal}
              onChange={(e) => setIpHostnameVal(e.target.value)}
              placeholder="ej: sql01.local"
            />
            <Input
              label="MAC Address"
              value={ipMacVal}
              onChange={(e) => setIpMacVal(e.target.value)}
              placeholder="ej: 00:11:22:33:44:55"
            />
          </div>

          <Input
            label="Descripción"
            value={ipDescriptionVal}
            onChange={(e) => setIpDescriptionVal(e.target.value)}
            placeholder="Propósito de la IP"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
            <Button variant="secondary" onClick={() => setIsIpModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="cyan" isLoading={isSubmittingIp}>
              {editingIp ? 'Guardar Cambios' : 'Registrar IP'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================= */}
      {/* 📥 MODAL: IMPORTAR CSV                                  */}
      {/* ======================================================= */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importar Datos de IPAM vía CSV"
        size="lg"
      >
        <form onSubmit={handleImportCsvSubmit} className="space-y-4">
          <p className="text-xs text-[#94A3B8]">
            Pega aquí el contenido en formato CSV. Ejemplo compatible:
          </p>
          <pre className="p-3 rounded bg-[#0B0F14] border border-[#252D38] text-[11px] font-mono text-[#06B6D4]">
{`NETWORK,,SERVERS,192.168.10.0/24,192.168.10.1
VLAN,,10,SERVERS
IP,,192.168.10.25,ASSIGNED,sql01.palma.local`}
          </pre>

          <textarea
            rows={8}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="Pega las líneas CSV aquí..."
            className="w-full bg-[#151B23] border border-[#252D38] rounded-xl p-3 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[#252D38]">
            <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="cyan" isLoading={isImporting}>
              Procesar Importación
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Network Confirmation Modal */}
      {networkToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setNetworkToDelete(null)}
          title="Confirmar Eliminación de Red"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#F1F5F9]">
              ¿Estás seguro de que deseas eliminar la subred <strong>{networkToDelete.name} ({networkToDelete.cidr})</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setNetworkToDelete(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDeleteNetwork}>
                Eliminar Red
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete IP Confirmation Modal */}
      {ipToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setIpToDelete(null)}
          title="Confirmar Eliminación de IP"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#F1F5F9]">
              ¿Estás seguro de que deseas eliminar la dirección IP <strong>{ipToDelete.address || ipToDelete.ip}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIpToDelete(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDeleteIp}>
                Eliminar IP
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default IpamPage;
