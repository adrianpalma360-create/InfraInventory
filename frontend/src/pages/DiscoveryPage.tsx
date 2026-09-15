import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import {
  DiscoveryScan,
  DiscoveryHost,
  DiscoveryChange,
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
} from 'lucide-react';

export const DiscoveryPage: React.FC = () => {
  const toast = useToast();

  // Scan Launcher State
  const [networkCidr, setNetworkCidr] = useState('192.168.1.0/24');
  const [scanType, setScanType] = useState<ScanType>('BASIC');
  const [isStartingScan, setIsStartingScan] = useState(false);

  // Active / Selected Scan State
  const [activeScan, setActiveScan] = useState<DiscoveryScan | null>(null);
  const [scansHistory, setScansHistory] = useState<DiscoveryScan[]>([]);
  const [hosts, setHosts] = useState<DiscoveryHost[]>([]);
  const [changes, setChanges] = useState<DiscoveryChange[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(true);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);

  // Active Tab within Discovery
  const [activeTab, setActiveTab] = useState<'discovered' | 'new' | 'offline' | 'history'>('discovered');

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

  // 1. Load initial data: scans history & metadata
  const loadInitialData = async () => {
    setIsLoadingScans(true);
    try {
      const [scansList, locList, vlanList] = await Promise.all([
        api.getDiscoveryScans(),
        api.getLocations(),
        api.getVlans(),
      ]);
      setScansHistory(scansList);
      setLocations(locList);
      setVlans(vlanList);

      if (scansList.length > 0) {
        // Default to latest scan
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

  // 2. Select & load a scan
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
            'Descubrimiento de red completado exitosamente.'
          );
          // Reload full scan and list
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

    setIsStartingScan(true);
    try {
      const newScan = await api.startDiscoveryScan({
        networkCidr: networkCidr.trim(),
        scanType,
      });
      toast.success(
        'Escaneo iniciado',
        `Sondeando la red ${newScan.networkCidr} (${scanType === 'FULL' ? 'Completo' : 'Básico'})`
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

  // 6. Open Import Modal
  const handleOpenImport = (host: DiscoveryHost) => {
    setSelectedHostToImport(host);
    setImportForm({
      hostname: host.hostname || `HOST-${host.ip.split('.').pop()}`,
      type: 'PHYSICAL_SERVER',
      os: host.osGuess || '',
      manufacturer: host.vendor || '',
      model: '',
      locationId: locations[0]?.id || '',
      vlanId: vlans[0]?.id || '',
      description: `Importado automáticamente desde Discovery (${host.ip})`,
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

      // Refresh scan data
      if (activeScan) selectScan(activeScan.id);
    } catch (err: any) {
      toast.error('Error al importar dispositivo', err.message);
    }
  };

  // 8. Ignore change
  const handleIgnoreChange = async (changeId: string) => {
    try {
      await api.ignoreDiscoveryChange(changeId);
      toast.info('Cambio ignorado', 'El dispositivo permanecerá sin registrar.');
      if (activeScan) selectScan(activeScan.id);
    } catch (err: any) {
      toast.error('Error al ignorar cambio', err.message);
    }
  };

  // Filtered lists
  const newDevices = hosts.filter((h) => h.isNew);
  const offlineChanges = changes.filter((c) => c.changeType === 'DEVICE_OFFLINE' || c.changeType === 'DEVICE_NOT_DETECTED');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Radar className="w-5 h-5 text-[#06B6D4] animate-pulse" />
            Network Discovery Engine
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Descubrimiento autónomo de hosts, sondeo de puertos TCP, auditoría de servicios y comparativa con el inventario
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

      {/* Discovery Launcher Control Card */}
      <Card className="p-5 border-[#06B6D4]/20 bg-gradient-to-r from-[#0F141B] via-[#151B23] to-[#0F141B]">
        <form onSubmit={handleStartScan} className="flex flex-col md:flex-row items-end gap-4">
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

          <div className="w-full md:w-56 space-y-1.5">
            <label className="text-xs font-semibold text-[#F1F5F9]">Modo de Descubrimiento</label>
            <div className="grid grid-cols-2 gap-2 bg-[#0B0F14] p-1 rounded-lg border border-[#252D38]">
              <button
                type="button"
                onClick={() => setScanType('BASIC')}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  scanType === 'BASIC'
                    ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/40'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                Básico (6 Puertos)
              </button>
              <button
                type="button"
                onClick={() => setScanType('FULL')}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  scanType === 'FULL'
                    ? 'bg-[#151B23] text-[#3B82F6] border border-[#3B82F6]/40'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                Completo (19+ P)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Can
              permission="DISCOVERY_RUN"
              fallback={
                <div className="text-xs text-[#64748B] py-2 px-3 bg-[#0B0F14] border border-[#252D38] rounded-lg">
                  Solo lectura (sin permiso de escaneo)
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
        </form>

        {/* Live Progress Card (if scan active or recently finished) */}
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
                  ({activeScan.scannedHosts} / {activeScan.totalHosts} hosts verificados)
                </span>
              </div>
              <div className="flex items-center gap-4 text-[#94A3B8] font-mono text-[11px]">
                <span>Activos: <strong className="text-[#22C55E]">{activeScan.activeHosts}</strong></span>
                <span>Nuevos: <strong className="text-[#06B6D4]">{activeScan.newDevices}</strong></span>
                <span>No detectados: <strong className="text-[#EF4444]">{activeScan.missingDevices}</strong></span>
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
      <div className="flex items-center gap-2 border-b border-[#252D38] pb-1">
        <button
          onClick={() => setActiveTab('discovered')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 ${
            activeTab === 'discovered'
              ? 'text-[#06B6D4] border-b-2 border-[#06B6D4] bg-[#151B23]/50'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Dispositivos Descubiertos ({hosts.length})
        </button>

        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 ${
            activeTab === 'new'
              ? 'text-[#F59E0B] border-b-2 border-[#F59E0B] bg-[#151B23]/50'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-[#F59E0B]" />
          Nuevos Detectados ({newDevices.length})
        </button>

        <button
          onClick={() => setActiveTab('offline')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 ${
            activeTab === 'offline'
              ? 'text-[#EF4444] border-b-2 border-[#EF4444] bg-[#151B23]/50'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <EyeOff className="w-3.5 h-3.5 text-[#EF4444]" />
          No Detectados ({offlineChanges.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'text-[#3B82F6] border-b-2 border-[#3B82F6] bg-[#151B23]/50'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <History className="w-3.5 h-3.5 text-[#3B82F6]" />
          Historial de Escaneos ({scansHistory.length})
        </button>
      </div>

      {/* Tab 1: Discovered Hosts Table */}
      {activeTab === 'discovered' && (
        <Card className="p-0 overflow-hidden">
          {isLoadingHosts ? (
            <div className="p-6">
              <TableSkeleton rows={6} cols={6} />
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
                    <th className="py-3 px-4">Hostname / DNS</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Puertos Abiertos & Servicios</th>
                    <th className="py-3 px-4">Latencia</th>
                    <th className="py-3 px-4 text-right">Inventario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]">
                  {hosts.map((host) => (
                    <tr key={host.id} className="hover:bg-[#151B23]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[#F1F5F9]">
                        {host.ip}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">
                        {host.hostname || (
                          <span className="text-[#64748B] italic">Sin DNS inverso</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                          ONLINE
                        </span>
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
                      <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">
                        {host.responseTimeMs ? `${host.responseTimeMs} ms` : '-'}
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
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#F1F5F9]">{host.ip}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                          NUEVO DISPOSITIVO
                        </span>
                      </div>
                      <div className="text-xs text-[#94A3B8] mt-1">
                        Hostname: <strong className="text-[#F1F5F9]">{host.hostname || 'No disponible'}</strong>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleIgnoreChange(host.id)}
                      >
                        Ignorar
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenImport(host)}
                      >
                        Añadir al Inventario
                      </Button>
                    </Can>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Missing / Offline Devices */}
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

      {/* Tab 4: Scans History */}
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
                    <th className="py-3 px-4">No Detectados</th>
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
                <span className="text-[#64748B]">Dirección IP Detectada:</span>
                <span className="ml-2 font-mono font-bold text-[#06B6D4]">{selectedHostToImport.ip}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Puertos Abiertos:</span>
                <span className="ml-2 font-mono text-[#22C55E]">
                  {selectedHostToImport.ports.map((p) => p.portNumber).join(', ') || 'Ninguno'}
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
                placeholder="Dell, Cisco, HP..."
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
