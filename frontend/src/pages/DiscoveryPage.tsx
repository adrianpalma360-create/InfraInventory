import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import {
  DiscoveryScan,
  DiscoveryHost,
  DiscoveryChange,
  DiscoveryNetwork,
  Location,
  VLAN,
  MachineType,
  ScanType,
} from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { TableSkeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import {
  Radar,
  Play,
  StopCircle,
  RefreshCw,
  Plus,
  EyeOff,
  Server,
  CheckCircle2,
  History,
  ShieldCheck,
  AlertOctagon,
  Sliders,
  Network,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowRightLeft,
  Printer,
  Router,
  Radio,
  HardDrive,
  Camera,
  Layers,
} from 'lucide-react';

export const DiscoveryPage: React.FC = () => {
  const toast = useToast();

  // Scan Launcher State
  const [networkCidr, setNetworkCidr] = useState('192.168.1.0/24');
  const [scanType, setScanType] = useState<ScanType>('BASIC');
  const [excludedIps, setExcludedIps] = useState('192.168.1.1, 192.168.1.254');
  const [customPorts, setCustomPorts] = useState('22, 80, 443, 8006, 9000, 9100');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isStartingScan, setIsStartingScan] = useState(false);

  // Method toggles
  const [methods, setMethods] = useState({
    icmp: true,
    arp: true,
    tcp: true,
    dns: true,
    snmp: true,
    ssh: false,
    winrm: false,
  });

  // Credentials configuration
  const [snmpCommunity, setSnmpCommunity] = useState('public');
  const [snmpVersion, setSnmpVersion] = useState<'v2c' | 'v3'>('v2c');
  const [sshUser, setSshUser] = useState('');
  const [sshPassword, setSshPassword] = useState('');
  const [winrmUser, setWinrmUser] = useState('');
  const [winrmPassword, setWinrmPassword] = useState('');

  // Active / Selected Scan State
  const [activeScan, setActiveScan] = useState<DiscoveryScan | null>(null);
  const [scansHistory, setScansHistory] = useState<DiscoveryScan[]>([]);
  const [hosts, setHosts] = useState<DiscoveryHost[]>([]);
  const [changes, setChanges] = useState<DiscoveryChange[]>([]);
  const [networks, setNetworks] = useState<DiscoveryNetwork[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(true);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'discovered' | 'new' | 'changes' | 'offline' | 'networks' | 'history'
  >('discovered');

  // Network Configuration Modal State
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [networkForm, setNetworkForm] = useState({
    id: '',
    name: '',
    cidr: '',
    description: '',
    excludedIps: '',
    schedule: 'MANUAL' as DiscoveryNetwork['schedule'],
    scanType: 'BASIC' as ScanType,
    snmpCommunity: 'public',
  });

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedHostToImport, setSelectedHostToImport] = useState<DiscoveryHost | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vlans, setVlans] = useState<VLAN[]>([]);
  const [importForm, setImportForm] = useState({
    hostname: '',
    type: 'PHYSICAL_SERVER' as MachineType,
    os: '',
    manufacturer: '',
    model: '',
    locationId: '',
    vlanId: '',
    description: '',
  });

  // Polling ref
  const pollIntervalRef = useRef<any>(null);

  // 1. Load initial data
  const loadInitialData = async () => {
    setIsLoadingScans(true);
    try {
      const [scansList, locList, vlanList, netList] = await Promise.all([
        api.getDiscoveryScans(),
        api.getLocations(),
        api.getVlans(),
        api.getDiscoveryNetworks(),
      ]);
      setScansHistory(scansList);
      setLocations(locList);
      setVlans(vlanList);
      setNetworks(netList);

      if (scansList.length > 0) {
        selectScan(scansList[0].id);
      }
    } catch (err: any) {
      toast.error('Error al cargar datos de Discovery', err.message);
    } finally {
      setIsLoadingScans(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // 2. Select & load scan detail
  const selectScan = async (scanId: string) => {
    setIsLoadingHosts(true);
    try {
      const scan = await api.getDiscoveryScan(scanId);
      setActiveScan(scan);
      setHosts(scan.hosts || []);
      setChanges(scan.changes || []);

      if (scan.status === 'RUNNING') {
        startPollingProgress(scan.id);
      }
    } catch (err: any) {
      toast.error('Error al cargar detalle del escaneo', err.message);
    } finally {
      setIsLoadingHosts(false);
    }
  };

  // 3. Start polling active scan progress
  const startPollingProgress = (scanId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const progressData = await api.getDiscoveryScanProgress(scanId);
        setActiveScan((prev) => (prev ? ({ ...prev, ...progressData } as DiscoveryScan) : null));

        if (progressData.status !== 'RUNNING') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          toast.success(
            'Escaneo finalizado',
            'Descubrimiento avanzado de red completado exitosamente.'
          );
          selectScan(scanId);
          const updatedScans = await api.getDiscoveryScans();
          setScansHistory(updatedScans);
        }
      } catch (err) {
        console.error('Error polling scan progress', err);
      }
    }, 1500);
  };

  // 4. Trigger new discovery scan
  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!networkCidr.trim()) {
      toast.error('Introduce una red CIDR válida');
      return;
    }

    const parsedExcluded = excludedIps
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedCustomPorts =
      scanType === 'CUSTOM'
        ? customPorts
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((p) => !isNaN(p) && p > 0 && p <= 65535)
        : undefined;

    setIsStartingScan(true);
    try {
      const newScan = await api.startDiscoveryScan({
        networkCidr: networkCidr.trim(),
        scanType,
        customPorts: parsedCustomPorts,
        excludedIps: parsedExcluded.length > 0 ? parsedExcluded : undefined,
        methods,
        snmpCommunity: methods.snmp && snmpCommunity ? snmpCommunity : undefined,
        snmpVersion: methods.snmp ? snmpVersion : undefined,
        credentials: {
          ssh: methods.ssh && sshUser ? { username: sshUser, password: sshPassword || undefined } : undefined,
          winrm: methods.winrm && winrmUser ? { username: winrmUser, password: winrmPassword || undefined } : undefined,
        },
      });

      toast.success(
        'Escaneo avanzado iniciado',
        `Sondeando la red ${newScan.networkCidr} (${scanType}) con métodos activos.`
      );
      setActiveScan(newScan);
      setHosts([]);
      setChanges([]);
      setActiveTab('discovered');
      startPollingProgress(newScan.id);

      const updatedScans = await api.getDiscoveryScans();
      setScansHistory(updatedScans);
    } catch (err: any) {
      toast.error('Error al iniciar el escaneo', err.message);
    } finally {
      setIsStartingScan(false);
    }
  };

  // 5. Cancel scan
  const handleCancelScan = async () => {
    if (!activeScan) return;
    try {
      await api.cancelDiscoveryScan(activeScan.id);
      toast.info('Escaneo cancelado', 'Se ha detenido el proceso de escaneo de red.');
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      selectScan(activeScan.id);
    } catch (err: any) {
      toast.error('Error al cancelar escaneo', err.message);
    }
  };

  // 6. Open Import Modal with Smart Classification
  const handleOpenImport = (host: DiscoveryHost) => {
    setSelectedHostToImport(host);

    let mappedType: MachineType = 'PHYSICAL_SERVER';
    const typeStr = (host.deviceType || '').toLowerCase();
    if (typeStr.includes('virtualization') || typeStr.includes('hypervisor')) mappedType = 'VIRTUAL_SERVER';
    else if (typeStr.includes('switch')) mappedType = 'SWITCH';
    else if (typeStr.includes('router')) mappedType = 'ROUTER';
    else if (typeStr.includes('firewall')) mappedType = 'FIREWALL';
    else if (typeStr.includes('printer')) mappedType = 'PRINTER';
    else if (typeStr.includes('nas') || typeStr.includes('storage')) mappedType = 'NAS';
    else if (typeStr.includes('workstation') || typeStr.includes('laptop')) mappedType = 'PC';
    else if (typeStr.includes('server')) mappedType = 'PHYSICAL_SERVER';

    setImportForm({
      hostname: host.hostname || `HOST-${host.ip.replace(/\./g, '-')}`,
      type: mappedType,
      os: host.osGuess || '',
      manufacturer: host.vendor || '',
      model: '',
      locationId: locations[0]?.id || '',
      vlanId: vlans[0]?.id || '',
      description: `Importado desde Advanced Discovery (${host.ip}) [Clasificación: ${host.deviceType || 'Unknown'}]`,
    });
    setIsImportModalOpen(true);
  };

  // 7. Submit Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostToImport || !importForm.hostname) {
      toast.error('El hostname es obligatorio');
      return;
    }

    try {
      await api.importDiscoveredHost(selectedHostToImport.id, {
        hostname: importForm.hostname,
        type: importForm.type,
        os: importForm.os || undefined,
        manufacturer: importForm.manufacturer || undefined,
        model: importForm.model || undefined,
        locationId: importForm.locationId || undefined,
        vlanId: importForm.vlanId || undefined,
        description: importForm.description || undefined,
      });

      toast.success(
        'Dispositivo añadido',
        `${importForm.hostname} (${selectedHostToImport.ip}) se ha incorporado al inventario.`
      );
      setIsImportModalOpen(false);

      if (activeScan) selectScan(activeScan.id);
    } catch (err: any) {
      toast.error('Error al importar dispositivo', err.message);
    }
  };

  // 8. Approve / Ignore Change
  const handleApproveChange = async (changeId: string) => {
    try {
      await api.approveDiscoveryChange(changeId);
      toast.success('Cambio aprobado', 'El cambio ha sido confirmado en el registro de auditoría.');
      if (activeScan) selectScan(activeScan.id);
    } catch (err: any) {
      toast.error('Error al aprobar cambio', err.message);
    }
  };

  const handleIgnoreChange = async (changeId: string) => {
    try {
      await api.ignoreDiscoveryChange(changeId);
      toast.info('Cambio ignorado', 'El cambio ha sido descartado.');
      if (activeScan) selectScan(activeScan.id);
    } catch (err: any) {
      toast.error('Error al ignorar cambio', err.message);
    }
  };

  // 9. Save Network Configuration
  const handleSaveNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedExcluded = networkForm.excludedIps
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await api.saveDiscoveryNetwork({
        id: networkForm.id || undefined,
        name: networkForm.name,
        cidr: networkForm.cidr,
        description: networkForm.description || undefined,
        excludedIps: parsedExcluded,
        schedule: networkForm.schedule,
        scanType: networkForm.scanType,
        snmpCommunity: networkForm.snmpCommunity || undefined,
      });

      toast.success('Red guardada', 'Configuración de red para descubrimiento guardada con éxito.');
      setIsNetworkModalOpen(false);
      const updatedNets = await api.getDiscoveryNetworks();
      setNetworks(updatedNets);
    } catch (err: any) {
      toast.error('Error al guardar red', err.message);
    }
  };

  const handleDeleteNetwork = async (id: string) => {
    try {
      await api.deleteDiscoveryNetwork(id);
      toast.info('Red eliminada', 'La configuración de red ha sido eliminada.');
      const updatedNets = await api.getDiscoveryNetworks();
      setNetworks(updatedNets);
    } catch (err: any) {
      toast.error('Error al eliminar red', err.message);
    }
  };

  // Filtered lists
  const newDevices = hosts.filter((h) => h.isNew);
  const offlineChanges = changes.filter(
    (c) => c.changeType === 'DEVICE_OFFLINE' || c.changeType === 'DEVICE_NOT_DETECTED'
  );
  const diffChanges = changes.filter(
    (c) =>
      c.changeType !== 'NEW_DEVICE' &&
      c.changeType !== 'DEVICE_OFFLINE' &&
      c.changeType !== 'DEVICE_NOT_DETECTED'
  );

  // Render Device Type Icon
  const getDeviceIcon = (type?: string | null) => {
    const t = (type || '').toLowerCase();
    if (t.includes('printer')) return <Printer className="w-4 h-4 text-[#F59E0B]" />;
    if (t.includes('router') || t.includes('gateway')) return <Router className="w-4 h-4 text-[#3B82F6]" />;
    if (t.includes('firewall')) return <ShieldCheck className="w-4 h-4 text-[#EF4444]" />;
    if (t.includes('switch')) return <Network className="w-4 h-4 text-[#06B6D4]" />;
    if (t.includes('access point')) return <Radio className="w-4 h-4 text-[#8B5CF6]" />;
    if (t.includes('nas') || t.includes('storage')) return <HardDrive className="w-4 h-4 text-[#10B981]" />;
    if (t.includes('virtualization') || t.includes('docker')) return <Layers className="w-4 h-4 text-[#EC4899]" />;
    if (t.includes('camera')) return <Camera className="w-4 h-4 text-[#F97316]" />;
    return <Server className="w-4 h-4 text-[#94A3B8]" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Radar className="w-5 h-5 text-[#06B6D4] animate-pulse" />
            Advanced Network Discovery
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Descubrimiento autónomo de red sin agente (ICMP, ARP, TCP, DNS, SNMP v2c/v3, SSH, WinRM), clasificación inteligente y detección de cambios
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => activeScan && selectScan(activeScan.id)}
          >
            Refrescar
          </Button>
        </div>
      </div>

      {/* Discovery Summary KPI Ribbon (As requested in architecture spec) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="p-3 bg-[#0F141B] border-[#252D38]">
          <span className="text-[10px] uppercase font-semibold text-[#64748B]">Red</span>
          <div className="font-mono font-bold text-xs text-[#F1F5F9] truncate mt-1">
            {activeScan?.networkCidr || networkCidr}
          </div>
        </Card>

        <Card className="p-3 bg-[#0F141B] border-[#252D38]">
          <span className="text-[10px] uppercase font-semibold text-[#64748B]">Último Scan</span>
          <div className="text-xs text-[#94A3B8] truncate mt-1">
            {activeScan ? new Date(activeScan.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
          </div>
        </Card>

        <Card className="p-3 bg-[#0F141B] border-[#252D38]">
          <span className="text-[10px] uppercase font-semibold text-[#64748B]">Estado</span>
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                activeScan?.status === 'COMPLETED'
                  ? 'bg-[#22C55E]/10 text-[#22C55E]'
                  : activeScan?.status === 'RUNNING'
                  ? 'bg-[#06B6D4]/10 text-[#06B6D4] animate-pulse'
                  : 'bg-[#EF4444]/10 text-[#EF4444]'
              }`}
            >
              {activeScan?.status || 'IDLE'}
            </span>
          </div>
        </Card>

        <Card className="p-3 bg-[#0F141B] border-[#252D38]">
          <span className="text-[10px] uppercase font-semibold text-[#64748B]">Encontrados</span>
          <div className="font-mono font-bold text-sm text-[#22C55E] mt-0.5">
            {activeScan?.activeHosts || hosts.length || 0}
          </div>
        </Card>

        <Card className="p-3 bg-[#0F141B] border-[#252D38]">
          <span className="text-[10px] uppercase font-semibold text-[#64748B]">Nuevos</span>
          <div className="font-mono font-bold text-sm text-[#06B6D4] mt-0.5">
            {activeScan?.newDevices || newDevices.length || 0}
          </div>
        </Card>

        <Card className="p-3 bg-[#0F141B] border-[#252D38]">
          <span className="text-[10px] uppercase font-semibold text-[#64748B]">Offline</span>
          <div className="font-mono font-bold text-sm text-[#EF4444] mt-0.5">
            {activeScan?.missingDevices || offlineChanges.length || 0}
          </div>
        </Card>

        <Card className="p-3 bg-[#0F141B] border-[#252D38]">
          <span className="text-[10px] uppercase font-semibold text-[#64748B]">Cambios</span>
          <div className="font-mono font-bold text-sm text-[#F59E0B] mt-0.5">
            {activeScan?.changedDevices || diffChanges.length || 0}
          </div>
        </Card>

        <Card className="p-3 bg-[#0F141B] border-[#252D38]">
          <span className="text-[10px] uppercase font-semibold text-[#64748B]">Errores</span>
          <div className="font-mono font-bold text-sm text-[#94A3B8] mt-0.5">
            {activeScan?.errorMessage ? 1 : 0}
          </div>
        </Card>
      </div>

      {/* Discovery Launcher Control Card */}
      <Card className="p-5 border-[#06B6D4]/20 bg-gradient-to-r from-[#0F141B] via-[#151B23] to-[#0F141B]">
        <form onSubmit={handleStartScan} className="space-y-4">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-semibold text-[#F1F5F9] flex items-center gap-2">
                <span>Red CIDR Objetivo</span>
                <span className="text-[11px] text-[#64748B] font-normal">(Ej: 192.168.1.0/24, 10.0.0.0/24)</span>
              </label>
              <Input
                value={networkCidr}
                onChange={(e) => setNetworkCidr(e.target.value)}
                placeholder="192.168.1.0/24"
                className="font-mono text-xs"
                required
              />
            </div>

            <div className="w-full md:w-64 space-y-1.5">
              <label className="text-xs font-semibold text-[#F1F5F9]">Modo de Sondeo</label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#0B0F14] p-1 rounded-lg border border-[#252D38]">
                <button
                  type="button"
                  onClick={() => setScanType('BASIC')}
                  className={`py-1.5 text-[11px] font-medium rounded transition-all ${
                    scanType === 'BASIC'
                      ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/40 font-bold'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                >
                  Básico (12P)
                </button>
                <button
                  type="button"
                  onClick={() => setScanType('FULL')}
                  className={`py-1.5 text-[11px] font-medium rounded transition-all ${
                    scanType === 'FULL'
                      ? 'bg-[#151B23] text-[#3B82F6] border border-[#3B82F6]/40 font-bold'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                >
                  Completo (30P)
                </button>
                <button
                  type="button"
                  onClick={() => setScanType('CUSTOM')}
                  className={`py-1.5 text-[11px] font-medium rounded transition-all ${
                    scanType === 'CUSTOM'
                      ? 'bg-[#151B23] text-[#8B5CF6] border border-[#8B5CF6]/40 font-bold'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="md"
                icon={<Sliders className="w-4 h-4" />}
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              >
                {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>

              <Can
                permission="DISCOVERY_RUN"
                fallback={
                  <div className="text-xs text-[#64748B] py-2 px-3 bg-[#0B0F14] border border-[#252D38] rounded-lg">
                    Solo lectura
                  </div>
                }
              >
                {activeScan && activeScan.status === 'RUNNING' ? (
                  <Button
                    type="button"
                    variant="danger"
                    icon={<StopCircle className="w-4 h-4" />}
                    onClick={handleCancelScan}
                  >
                    Detener
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    icon={<Play className="w-4 h-4 fill-current" />}
                    disabled={isStartingScan}
                  >
                    {isStartingScan ? 'Iniciando...' : 'Escanear Red'}
                  </Button>
                )}
              </Can>
            </div>
          </div>

          {/* Advanced Settings Drawer */}
          {showAdvancedSettings && (
            <div className="p-4 bg-[#0B0F14]/90 rounded-xl border border-[#252D38] space-y-4 text-xs animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#F1F5F9]">IPs y Rangos Excluidos</label>
                  <Input
                    value={excludedIps}
                    onChange={(e) => setExcludedIps(e.target.value)}
                    placeholder="192.168.1.1, 192.168.1.254"
                    className="font-mono text-xs"
                  />
                </div>

                {scanType === 'CUSTOM' && (
                  <div className="space-y-1">
                    <label className="font-semibold text-[#F1F5F9]">Puertos Personalizados</label>
                    <Input
                      value={customPorts}
                      onChange={(e) => setCustomPorts(e.target.value)}
                      placeholder="22, 80, 443, 8006, 9000"
                      className="font-mono text-xs"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-semibold text-[#F1F5F9]">SNMP Community (v2c)</label>
                  <Input
                    value={snmpCommunity}
                    onChange={(e) => setSnmpCommunity(e.target.value)}
                    placeholder="public"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#F1F5F9]">Versión SNMP</label>
                  <Select
                    value={snmpVersion}
                    onChange={(e) => setSnmpVersion(e.target.value as 'v2c' | 'v3')}
                    options={[
                      { value: 'v2c', label: 'SNMP v2c (Community)' },
                      { value: 'v3', label: 'SNMP v3 (USM / AuthPriv)' },
                    ]}
                  />
                </div>
              </div>

              {/* Methods Checkboxes */}
              <div className="pt-2 border-t border-[#252D38]">
                <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px] block mb-2">
                  Métodos de Descubrimiento Habilitados
                </span>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={methods.icmp}
                      onChange={(e) => setMethods({ ...methods, icmp: e.target.checked })}
                      className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4]"
                    />
                    <span className="text-[#F1F5F9]">ICMP Ping</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={methods.arp}
                      onChange={(e) => setMethods({ ...methods, arp: e.target.checked })}
                      className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4]"
                    />
                    <span className="text-[#F1F5F9]">ARP (MAC / Vendor)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={methods.tcp}
                      onChange={(e) => setMethods({ ...methods, tcp: e.target.checked })}
                      className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4]"
                    />
                    <span className="text-[#F1F5F9]">TCP Port Probe</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={methods.dns}
                      onChange={(e) => setMethods({ ...methods, dns: e.target.checked })}
                      className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4]"
                    />
                    <span className="text-[#F1F5F9]">DNS Reverse PTR</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={methods.snmp}
                      onChange={(e) => setMethods({ ...methods, snmp: e.target.checked })}
                      className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4]"
                    />
                    <span className="text-[#F1F5F9]">SNMP (sysDescr / Interfaces)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={methods.ssh}
                      onChange={(e) => setMethods({ ...methods, ssh: e.target.checked })}
                      className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4]"
                    />
                    <span className="text-[#F1F5F9]">SSH Remote (Linux/Unix)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={methods.winrm}
                      onChange={(e) => setMethods({ ...methods, winrm: e.target.checked })}
                      className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4]"
                    />
                    <span className="text-[#F1F5F9]">WinRM / WMI (Windows)</span>
                  </label>
                </div>
              </div>

              {/* SSH / WinRM Credentials if enabled */}
              {(methods.ssh || methods.winrm) && (
                <div className="pt-2 border-t border-[#252D38] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {methods.ssh && (
                    <>
                      <div className="space-y-1">
                        <label className="font-semibold text-[#F1F5F9]">Usuario SSH</label>
                        <Input
                          value={sshUser}
                          onChange={(e) => setSshUser(e.target.value)}
                          placeholder="root / admin"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-[#F1F5F9]">Password SSH</label>
                        <Input
                          type="password"
                          value={sshPassword}
                          onChange={(e) => setSshPassword(e.target.value)}
                          placeholder="••••••••"
                          className="font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  {methods.winrm && (
                    <>
                      <div className="space-y-1">
                        <label className="font-semibold text-[#F1F5F9]">Usuario WinRM</label>
                        <Input
                          value={winrmUser}
                          onChange={(e) => setWinrmUser(e.target.value)}
                          placeholder="Administrator"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-[#F1F5F9]">Password WinRM</label>
                        <Input
                          type="password"
                          value={winrmPassword}
                          onChange={(e) => setWinrmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="font-mono text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Live Progress Card */}
        {activeScan && (
          <div className="mt-5 pt-4 border-t border-[#252D38] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    activeScan.status === 'RUNNING'
                      ? 'bg-[#06B6D4] animate-ping'
                      : activeScan.status === 'COMPLETED'
                      ? 'bg-[#22C55E]'
                      : 'bg-[#EF4444]'
                  }`}
                />
                <span className="font-semibold text-[#F1F5F9]">
                  {activeScan.status === 'RUNNING'
                    ? `Escaneando ${activeScan.networkCidr} (${activeScan.scanType})...`
                    : activeScan.status === 'COMPLETED'
                    ? `Escaneo de ${activeScan.networkCidr} completado`
                    : `Escaneo ${activeScan.status.toLowerCase()}`}
                </span>
                <span className="text-[#64748B] font-mono">
                  ({activeScan.scannedHosts} / {activeScan.totalHosts} hosts sondeados)
                </span>
              </div>
              <div className="flex items-center gap-4 text-[#94A3B8] font-mono text-[11px]">
                <span>Activos: <strong className="text-[#22C55E]">{activeScan.activeHosts}</strong></span>
                <span>Nuevos: <strong className="text-[#06B6D4]">{activeScan.newDevices}</strong></span>
                <span>Offline: <strong className="text-[#EF4444]">{activeScan.missingDevices}</strong></span>
                <span>Cambios: <strong className="text-[#F59E0B]">{activeScan.changedDevices}</strong></span>
                {activeScan.durationMs && (
                  <span>Duración: <strong className="text-[#F1F5F9]">{(activeScan.durationMs / 1000).toFixed(1)}s</strong></span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#0B0F14] h-2.5 rounded-full overflow-hidden border border-[#252D38]">
              <div
                className={`h-full transition-all duration-300 ${
                  activeScan.status === 'RUNNING'
                    ? 'bg-gradient-to-r from-[#3B82F6] to-[#06B6D4]'
                    : activeScan.status === 'COMPLETED'
                    ? 'bg-[#22C55E]'
                    : 'bg-[#EF4444]'
                }`}
                style={{ width: `${activeScan.progress}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Discovery Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#252D38] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('discovered')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'discovered'
              ? 'text-[#06B6D4] border-b-2 border-[#06B6D4] bg-[#151B23]/50'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Dispositivos ({hosts.length})
        </button>

        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'new'
              ? 'text-[#F59E0B] border-b-2 border-[#F59E0B] bg-[#151B23]/50'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-[#F59E0B]" />
          Nuevos ({newDevices.length})
        </button>

        <button
          onClick={() => setActiveTab('changes')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'changes'
              ? 'text-[#3B82F6] border-b-2 border-[#3B82F6] bg-[#151B23]/50'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-[#3B82F6]" />
          Cambios & Diffs ({diffChanges.length})
        </button>

        <button
          onClick={() => setActiveTab('offline')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'offline'
              ? 'text-[#EF4444] border-b-2 border-[#EF4444] bg-[#151B23]/50'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <EyeOff className="w-3.5 h-3.5 text-[#EF4444]" />
          Offline ({offlineChanges.length})
        </button>

        <button
          onClick={() => setActiveTab('networks')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'networks'
              ? 'text-[#10B981] border-b-2 border-[#10B981] bg-[#151B23]/50'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-[#10B981]" />
          Redes & Programación ({networks.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6] bg-[#151B23]/50'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <History className="w-3.5 h-3.5 text-[#8B5CF6]" />
          Historial ({scansHistory.length})
        </button>
      </div>

      {/* Tab 1: Discovered Hosts Table (DEVICE DISCOVERY VIEW) */}
      {activeTab === 'discovered' && (
        <Card className="p-0 overflow-hidden">
          {isLoadingHosts ? (
            <div className="p-6">
              <TableSkeleton rows={6} cols={7} />
            </div>
          ) : hosts.length === 0 ? (
            <div className="text-center py-16 text-[#64748B] text-xs">
              No se han descubierto hosts en este escaneo todavía. Inicia un escaneo para sondear la red.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F14]/80 text-[#64748B] font-semibold border-b border-[#252D38] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Dirección IP</th>
                    <th className="py-3 px-4">Hostname</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Fabricante & OS</th>
                    <th className="py-3 px-4">Puertos & Servicios</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]">
                  {hosts.map((host) => (
                    <tr key={host.id} className="hover:bg-[#151B23]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[#F1F5F9]">
                        {host.ip}
                        {host.macAddress && (
                          <div className="text-[10px] text-[#64748B] font-mono">{host.macAddress}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">
                        <span className="font-semibold text-[#F1F5F9]">{host.hostname || 'Desconocido'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1A212B] text-[#F1F5F9] text-[11px] border border-[#252D38]">
                          {getDeviceIcon(host.deviceType)}
                          {host.deviceType || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">
                        <div>{host.vendor || 'Desconocido'}</div>
                        {host.osGuess && <div className="text-[10px] text-[#64748B]">{host.osGuess}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {host.ports.length === 0 ? (
                            <span className="text-[#64748B] text-[11px]">Sin puertos abiertos</span>
                          ) : (
                            host.ports.map((p) => (
                              <span
                                key={p.id || p.portNumber}
                                title={p.banner || `${p.portNumber}/${p.protocol}`}
                                className="px-2 py-0.5 rounded bg-[#1A212B] text-[#06B6D4] text-[10px] font-mono border border-[#252D38]"
                              >
                                {p.portNumber}/{p.serviceName || p.protocol}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {host.isNew ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                            NEW
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                            ONLINE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {host.isNew ? (
                          <Can permission="DISCOVERY_IMPORT">
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Plus className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenImport(host)}
                            >
                              Añadir
                            </Button>
                          </Can>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#22C55E] text-[11px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Registrado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: New Uninventoried Devices */}
      {activeTab === 'new' && (
        <div className="space-y-4">
          {newDevices.length === 0 ? (
            <Card className="p-8 text-center text-[#64748B] text-xs">
              <ShieldCheck className="w-10 h-10 text-[#22C55E] mx-auto mb-2 opacity-80" />
              <div className="text-sm font-semibold text-[#F1F5F9]">Inventario Sincronizado</div>
              No se detectaron dispositivos desconocidos en la red escaneada.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newDevices.map((host) => (
                <Card key={host.id} className="p-4 border-[#F59E0B]/30 bg-[#0F141B]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#F1F5F9]">{host.ip}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                          NUEVO DISPOSITIVO
                        </span>
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        Hostname: <strong className="text-[#F1F5F9]">{host.hostname || 'No disponible'}</strong>
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        Tipo clasificado: <strong className="text-[#06B6D4]">{host.deviceType || 'Unknown'}</strong>
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        Fabricante: <strong className="text-[#F1F5F9]">{host.vendor || 'Desconocido'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#252D38]">
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Puertos y Servicios Identificados
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {host.ports.map((p) => (
                        <span
                          key={p.portNumber}
                          className="px-2 py-0.5 rounded bg-[#151B23] text-[#06B6D4] text-[11px] font-mono border border-[#252D38]"
                        >
                          {p.portNumber}/{p.serviceName || p.protocol}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#252D38] flex items-center justify-end gap-2.5">
                    <Can permission="DISCOVERY_IMPORT">
                      <Button variant="ghost" size="sm" onClick={() => handleIgnoreChange(host.id)}>
                        Ignorar
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenImport(host)}
                      >
                        Aprobar e Incorporar
                      </Button>
                    </Can>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Changes & Diffs */}
      {activeTab === 'changes' && (
        <Card className="p-0 overflow-hidden">
          {diffChanges.length === 0 ? (
            <div className="text-center py-16 text-[#64748B] text-xs">
              <CheckCircle2 className="w-8 h-8 text-[#22C55E] mx-auto mb-2 opacity-80" />
              No se han detectado cambios de configuración ni hardware en este escaneo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F14]/80 text-[#64748B] font-semibold border-b border-[#252D38] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Dispositivo</th>
                    <th className="py-3 px-4">Tipo de Cambio</th>
                    <th className="py-3 px-4">Valor Anterior &bull; Nuevo</th>
                    <th className="py-3 px-4">Detalle</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]">
                  {diffChanges.map((change) => (
                    <tr key={change.id} className="hover:bg-[#151B23]/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#F1F5F9]">
                        {change.hostname || change.machine?.hostname || 'Host'}
                        <div className="font-mono text-[10px] text-[#64748B]">{change.ip}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1A212B] text-[#F59E0B] border border-[#252D38]">
                          {change.changeType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-[#EF4444]">{change.oldValue || '-'}</span>
                        <span className="text-[#64748B] mx-1.5">&rarr;</span>
                        <span className="text-[#22C55E]">{change.newValue || '-'}</span>
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8] max-w-sm">{change.details}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            change.status === 'APPROVED'
                              ? 'bg-[#22C55E]/10 text-[#22C55E]'
                              : change.status === 'IGNORED'
                              ? 'bg-[#64748B]/10 text-[#64748B]'
                              : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                          }`}
                        >
                          {change.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {change.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleApproveChange(change.id)}
                            >
                              Aprobar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleIgnoreChange(change.id)}
                            >
                              Ignorar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Missing / Offline Devices */}
      {activeTab === 'offline' && (
        <Card className="p-0 overflow-hidden">
          {offlineChanges.length === 0 ? (
            <div className="text-center py-16 text-[#64748B] text-xs">
              <CheckCircle2 className="w-8 h-8 text-[#22C55E] mx-auto mb-2 opacity-80" />
              Todos los hosts registrados en esta red respondieron correctamente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F14]/80 text-[#64748B] font-semibold border-b border-[#252D38] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Máquina</th>
                    <th className="py-3 px-4">Dirección IP</th>
                    <th className="py-3 px-4">Estado Asignado</th>
                    <th className="py-3 px-4">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]">
                  {offlineChanges.map((change) => (
                    <tr key={change.id} className="hover:bg-[#151B23]/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#F1F5F9]">
                        {change.hostname || change.machine?.hostname || 'Host'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#94A3B8]">{change.ip}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                          OFFLINE
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">{change.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 5: Configured Networks & Schedules */}
      {activeTab === 'networks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">
              Subredes configuradas para escaneo continuo y programado
            </span>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setNetworkForm({
                  id: '',
                  name: '',
                  cidr: '',
                  description: '',
                  excludedIps: '',
                  schedule: 'MANUAL',
                  scanType: 'BASIC',
                  snmpCommunity: 'public',
                });
                setIsNetworkModalOpen(true);
              }}
            >
              Configurar Nueva Red
            </Button>
          </div>

          {networks.length === 0 ? (
            <Card className="p-8 text-center text-[#64748B] text-xs">
              No hay redes guardadas para escaneo periódico. Añade una red para programar descubrimientos.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {networks.map((net) => (
                <Card key={net.id} className="p-4 bg-[#0F141B] border-[#252D38] space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-[#F1F5F9] text-sm">{net.name}</h4>
                      <div className="font-mono text-xs text-[#06B6D4] mt-0.5">{net.cidr}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#151B23] text-[#22C55E] border border-[#252D38]">
                      {net.schedule}
                    </span>
                  </div>

                  {net.description && (
                    <p className="text-xs text-[#94A3B8]">{net.description}</p>
                  )}

                  {net.excludedIps && net.excludedIps.length > 0 && (
                    <div className="text-[11px] text-[#64748B]">
                      Exclusiones: {net.excludedIps.join(', ')}
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#252D38] flex items-center justify-between">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Play className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setNetworkCidr(net.cidr);
                        setExcludedIps(net.excludedIps.join(', '));
                        setScanType(net.scanType);
                      }}
                    >
                      Cargar en Launcher
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />}
                      onClick={() => handleDeleteNetwork(net.id)}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Scans History */}
      {activeTab === 'history' && (
        <Card className="p-0 overflow-hidden">
          {isLoadingScans ? (
            <div className="p-6">
              <TableSkeleton rows={6} cols={6} />
            </div>
          ) : scansHistory.length === 0 ? (
            <div className="text-center py-16 text-[#64748B] text-xs">
              No hay escaneos registrados en el historial.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F14]/80 text-[#64748B] font-semibold border-b border-[#252D38] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Red CIDR</th>
                    <th className="py-3 px-4">Modo</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Hosts Activos</th>
                    <th className="py-3 px-4">Nuevos</th>
                    <th className="py-3 px-4">Offline</th>
                    <th className="py-3 px-4">Fecha & Duración</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]">
                  {scansHistory.map((s) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-[#151B23]/40 transition-colors ${
                        activeScan?.id === s.id ? 'bg-[#151B23]/70' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#F1F5F9]">
                        {s.networkCidr}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1A212B] text-[#94A3B8] border border-[#252D38]">
                          {s.scanType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.status === 'COMPLETED'
                              ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20'
                              : s.status === 'RUNNING'
                              ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20'
                              : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#22C55E] font-semibold">{s.activeHosts}</td>
                      <td className="py-3 px-4 font-mono text-[#06B6D4]">{s.newDevices}</td>
                      <td className="py-3 px-4 font-mono text-[#EF4444]">{s.missingDevices}</td>
                      <td className="py-3 px-4 text-[#94A3B8] text-[11px]">
                        <div>{new Date(s.startedAt).toLocaleString()}</div>
                        {s.durationMs && (
                          <div className="text-[#64748B] font-mono">{(s.durationMs / 1000).toFixed(1)}s</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            selectScan(s.id);
                            setActiveTab('discovered');
                          }}
                        >
                          Ver Resultados
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Network Configuration Modal */}
      <Modal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        title="Configurar Red de Descubrimiento"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveNetwork} className="space-y-4">
          <Input
            label="Nombre de la Red *"
            value={networkForm.name}
            onChange={(e) => setNetworkForm({ ...networkForm, name: e.target.value })}
            placeholder="Subred Servidores Datacenter"
            required
          />

          <Input
            label="Red CIDR *"
            value={networkForm.cidr}
            onChange={(e) => setNetworkForm({ ...networkForm, cidr: e.target.value })}
            placeholder="192.168.1.0/24"
            className="font-mono text-xs"
            required
          />

          <Input
            label="IPs / Rangos a Excluir"
            value={networkForm.excludedIps}
            onChange={(e) => setNetworkForm({ ...networkForm, excludedIps: e.target.value })}
            placeholder="192.168.1.1, 192.168.1.254"
            className="font-mono text-xs"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Frecuencia de Escaneo"
              value={networkForm.schedule}
              onChange={(e) => setNetworkForm({ ...networkForm, schedule: e.target.value as any })}
              options={[
                { value: 'MANUAL', label: 'Manual (Bajo Demanda)' },
                { value: 'EVERY_15_MIN', label: 'Cada 15 minutos' },
                { value: 'EVERY_30_MIN', label: 'Cada 30 minutos' },
                { value: 'EVERY_1_HOUR', label: 'Cada 1 hora' },
                { value: 'EVERY_6_HOURS', label: 'Cada 6 horas' },
                { value: 'DAILY', label: 'Diariamente' },
              ]}
            />

            <Select
              label="Modo de Escaneo"
              value={networkForm.scanType}
              onChange={(e) => setNetworkForm({ ...networkForm, scanType: e.target.value as any })}
              options={[
                { value: 'BASIC', label: 'Básico (12 Puertos)' },
                { value: 'FULL', label: 'Completo (30+ Puertos)' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#252D38]">
            <Button type="button" variant="secondary" onClick={() => setIsNetworkModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Configuración
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Discovered Host Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={`Incorporar Host ${selectedHostToImport?.ip} al Inventario`}
        maxWidth="xl"
      >
        {selectedHostToImport && (
          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div className="p-3 bg-[#0B0F14] rounded-lg border border-[#252D38] text-xs flex items-center justify-between">
              <div>
                <span className="text-[#64748B]">IP Detectada:</span>
                <span className="ml-2 font-mono font-bold text-[#06B6D4]">{selectedHostToImport.ip}</span>
                {selectedHostToImport.macAddress && (
                  <span className="ml-2 font-mono text-[#94A3B8]">({selectedHostToImport.macAddress})</span>
                )}
              </div>
              <div>
                <span className="text-[#64748B]">Clasificación:</span>
                <span className="ml-2 font-bold text-[#22C55E]">
                  {selectedHostToImport.deviceType || 'Unknown'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Hostname *"
                value={importForm.hostname}
                onChange={(e) => setImportForm({ ...importForm, hostname: e.target.value })}
                required
              />

              <Select
                label="Tipo de Dispositivo *"
                value={importForm.type}
                onChange={(e) => setImportForm({ ...importForm, type: e.target.value as MachineType })}
                options={[
                  { value: 'PHYSICAL_SERVER', label: 'Servidor Físico' },
                  { value: 'VIRTUAL_SERVER', label: 'Servidor Virtual' },
                  { value: 'PC', label: 'Puesto de Trabajo (PC)' },
                  { value: 'ROUTER', label: 'Router / Gateway' },
                  { value: 'SWITCH', label: 'Switch de Red' },
                  { value: 'FIREWALL', label: 'Firewall' },
                  { value: 'NAS', label: 'Almacenamiento NAS' },
                  { value: 'PRINTER', label: 'Impresora de Red' },
                  { value: 'OTHER', label: 'Otro' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sistema Operativo"
                value={importForm.os}
                onChange={(e) => setImportForm({ ...importForm, os: e.target.value })}
                placeholder="Linux / Windows Server"
              />

              <Input
                label="Fabricante / Vendor"
                value={importForm.manufacturer}
                onChange={(e) => setImportForm({ ...importForm, manufacturer: e.target.value })}
                placeholder="Dell, Cisco, HP, Fortinet..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Ubicación Física"
                value={importForm.locationId}
                onChange={(e) => setImportForm({ ...importForm, locationId: e.target.value })}
                options={[
                  { value: '', label: 'Seleccionar Ubicación...' },
                  ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
                ]}
              />

              <Select
                label="VLAN"
                value={importForm.vlanId}
                onChange={(e) => setImportForm({ ...importForm, vlanId: e.target.value })}
                options={[
                  { value: '', label: 'Seleccionar VLAN...' },
                  ...vlans.map((v) => ({ value: v.id, label: `VLAN ${v.vlanId} - ${v.name}` })),
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#F1F5F9]">Notas / Descripción</label>
              <textarea
                value={importForm.description}
                onChange={(e) => setImportForm({ ...importForm, description: e.target.value })}
                className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4] min-h-[60px]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#252D38]">
              <Button type="button" variant="secondary" onClick={() => setIsImportModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" icon={<Plus className="w-4 h-4" />}>
                Confirmar e Incorporar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default DiscoveryPage;
