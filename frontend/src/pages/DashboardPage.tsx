import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { DashboardSummary } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { StatusBadge } from '../components/ui/Badge.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { Button } from '../components/ui/Button.js';
import { Can } from '../context/AuthContext.js';
import {
  Server,
  Network,
  Layers,
  Cpu,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  Radar,
  Activity,
  Boxes,
  FolderTree,
  HeartPulse,
  Bell,
  Binary,
  Tag as TagIcon,
  MapPin,
  Calculator,
  GitFork,
  Laptop,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateToMachines: () => void;
  onNavigateToMachineDetail: (id: string) => void;
  onNavigateToChanges: () => void;
  onNavigateToDiscovery: () => void;
  onNavigateToGraphs?: () => void;
  onNavigateToGroups?: () => void;
  onNavigateToMonitoring?: () => void;
  onNavigateToAlerts?: () => void;
  onNavigateToIPs?: () => void;
  onNavigateToIpam?: () => void;
  onNavigateToTags?: () => void;
  onNavigateToLocations?: () => void;
  onNavigateToTopology?: () => void;
  onNavigateToAssets?: () => void;
  onOpenAddMachine: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToMachines,
  onNavigateToMachineDetail,
  onNavigateToChanges,
  onNavigateToDiscovery,
  onNavigateToGraphs,
  onNavigateToGroups,
  onNavigateToMonitoring,
  onNavigateToAlerts,
  onNavigateToIPs,
  onNavigateToIpam,
  onNavigateToTags,
  onNavigateToLocations,
  onNavigateToTopology,
  onNavigateToAssets,
  onOpenAddMachine,
}) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  const fetchDashboard = async (showRefreshSpinner = false, tag?: string) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    try {
      const result = await api.getDashboard(tag);
      setData(result);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(false, selectedTagFilter || undefined);
  }, [selectedTagFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalMachines: 0,
    totalIPs: 0,
    totalServices: 0,
    totalPorts: 0,
    totalChanges: 0,
    totalNetworks: 0,
    totalVlans: 0,
    totalLocations: 0,
    totalTags: 0,
  };

  const status = data?.statusDistribution || {
    online: 0,
    warning: 0,
    offline: 0,
    unchecked: 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9]">
            InfraInventory - Panel Principal
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Monitoreo en tiempo real de infraestructura IT, direccionamiento IP y servicios
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={() => fetchDashboard(true)}
          >
            Actualizar
          </Button>
          <Can permission="MACHINE_CREATE">
            <Button
              variant="cyan"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={onOpenAddMachine}
            >
              + Añadir Máquina
            </Button>
          </Can>
        </div>
      </div>

      {/* Primary KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="flex flex-col justify-between border-l-2 border-l-[#3B82F6]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Máquinas
            </span>
            <Server className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9] font-mono mt-3">
            {metrics.totalMachines}
          </div>
        </Card>

        <Card className="flex flex-col justify-between border-l-2 border-l-[#06B6D4]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              IPs
            </span>
            <Network className="w-4 h-4 text-[#06B6D4]" />
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9] font-mono mt-3">
            {metrics.totalIPs}
          </div>
        </Card>

        <Card className="flex flex-col justify-between border-l-2 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Servicios
            </span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9] font-mono mt-3">
            {metrics.totalServices}
          </div>
        </Card>

        <Card className="flex flex-col justify-between border-l-2 border-l-[#22C55E]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Puertos
            </span>
            <Cpu className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9] font-mono mt-3">
            {metrics.totalPorts}
          </div>
        </Card>

        <Card className="flex flex-col justify-between border-l-2 border-l-[#F59E0B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Cambios
            </span>
            <History className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9] font-mono mt-3">
            {metrics.totalChanges}
          </div>
        </Card>
      </div>

      {/* Infrastructure Status Row */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94A3B8] mb-4">
          Estado de Infraestructura
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20">
            <div className="p-2.5 rounded-lg bg-[#22C55E]/20 text-[#22C55E]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#22C55E] uppercase tracking-wider">
                ONLINE
              </div>
              <div className="text-2xl font-bold text-[#F1F5F9] font-mono">{status.online}</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20">
            <div className="p-2.5 rounded-lg bg-[#F59E0B]/20 text-[#F59E0B]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#F59E0B] uppercase tracking-wider">
                WARNING
              </div>
              <div className="text-2xl font-bold text-[#F1F5F9] font-mono">{status.warning}</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20">
            <div className="p-2.5 rounded-lg bg-[#EF4444]/20 text-[#EF4444]">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#EF4444] uppercase tracking-wider">
                OFFLINE
              </div>
              <div className="text-2xl font-bold text-[#F1F5F9] font-mono">{status.offline}</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#252D38]/40 border border-[#252D38]">
            <div className="p-2.5 rounded-lg bg-[#252D38] text-[#94A3B8]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                SIN COMPROBAR
              </div>
              <div className="text-2xl font-bold text-[#F1F5F9] font-mono">{status.unchecked}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Fresh Clean Installation Empty State Guidance */}
      {metrics.totalMachines === 0 && (
        <Card className="p-8 border-dashed border-[#252D38] bg-[#0F141B]/90 text-center flex flex-col items-center justify-center space-y-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
            <Server className="w-6 h-6" />
          </div>
          <div className="max-w-md">
            <h3 className="text-sm font-bold text-[#F1F5F9]">Sin máquinas monitorizadas</h3>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
              Bienvenido a InfraInventory. Tu entorno se encuentra listo. Comienza añadiendo tu primera máquina al inventario o realizando un escaneo de red.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onOpenAddMachine}
            >
              Añadir Primera Máquina
            </Button>
            {onNavigateToDiscovery && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Radar className="w-3.5 h-3.5" />}
                onClick={onNavigateToDiscovery}
              >
                Descubrimiento de Red
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Tags Quick Filter Bar */}
      {data?.availableTags && data.availableTags.length > 0 && (
        <Card className="p-3.5 bg-[#0F141B] border-[#252D38] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <TagIcon className="w-4 h-4 text-pink-400" />
            <span className="font-semibold text-[#F1F5F9]">Filtrar Dashboard por Tag:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedTagFilter(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                !selectedTagFilter
                  ? 'bg-[#06B6D4] text-[#0B0F14] font-bold shadow'
                  : 'bg-[#151B23] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#252D38]'
              }`}
            >
              Todos los hosts
            </button>

            {data.availableTags.map((t) => {
              const isSelected = selectedTagFilter === t.name;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTagFilter(isSelected ? null : t.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'ring-1 ring-white text-[#F1F5F9] font-bold'
                      : 'hover:opacity-100 opacity-80'
                  }`}
                  style={{
                    backgroundColor: `${t.color}25`,
                    color: t.color,
                    borderColor: `${t.color}50`,
                    borderWidth: 1,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                  <span>{t.name}</span>
                  <span className="text-[10px] opacity-75">({t._count?.machines || 0})</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* IPAM & Locations Operational Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* IPAM & Subnets Overview Tile */}
        <Card className="p-4 bg-[#0F141B] border-[#252D38] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-xs font-bold text-[#F1F5F9]">Espacio de Direccionamiento (IPAM)</span>
            </div>
            {onNavigateToIpam && (
              <button
                onClick={onNavigateToIpam}
                className="text-xs text-[#06B6D4] hover:underline flex items-center gap-1"
              >
                <span>Explorar IPAM</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded bg-[#151B23] border border-[#252D38]">
              <div className="text-[10px] text-[#64748B]">Redes</div>
              <div className="text-base font-bold text-[#06B6D4]">{data?.ipamSummary?.totalNetworks || metrics.totalNetworks || 0}</div>
            </div>
            <div className="p-2 rounded bg-[#151B23] border border-[#252D38]">
              <div className="text-[10px] text-[#64748B]">IPs en Uso</div>
              <div className="text-base font-bold text-[#22C55E]">{data?.ipamSummary?.assignedIps || 0}</div>
            </div>
            <div className="p-2 rounded bg-[#151B23] border border-[#252D38]">
              <div className="text-[10px] text-[#64748B]">Conflictos</div>
              <div className={`text-base font-bold ${(data?.ipamSummary?.conflictIps || 0) > 0 ? 'text-[#EF4444]' : 'text-[#64748B]'}`}>
                {data?.ipamSummary?.conflictIps || 0}
              </div>
            </div>
          </div>
        </Card>

        {/* Locations & Racks Overview Tile */}
        <Card className="p-4 bg-[#0F141B] border-[#252D38] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-[#F1F5F9]">Ubicaciones & Topología Física</span>
            </div>
            {onNavigateToLocations && (
              <button
                onClick={onNavigateToLocations}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Ver Árbol</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded bg-[#151B23] border border-[#252D38]">
              <div className="text-[10px] text-[#64748B]">Ubicaciones</div>
              <div className="text-base font-bold text-emerald-400">{data?.locationsSummary?.totalLocations || metrics.totalLocations || 0}</div>
            </div>
            <div className="p-2 rounded bg-[#151B23] border border-[#252D38]">
              <div className="text-[10px] text-[#64748B]">Hosts Ubicados</div>
              <div className="text-base font-bold text-[#F1F5F9]">{data?.locationsSummary?.totalMachines || metrics.totalMachines || 0}</div>
            </div>
            <div className="p-2 rounded bg-[#151B23] border border-[#252D38]">
              <div className="text-[10px] text-[#64748B]">Incidentes</div>
              <div className={`text-base font-bold ${(data?.incidentsSummary?.critical || 0) > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                {data?.incidentsSummary?.total || 0}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Operations Quick Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <button
          onClick={onNavigateToMachines}
          className="p-3 rounded-xl bg-[#0F141B] border border-[#252D38] hover:border-[#3B82F6]/60 hover:bg-[#151B23] transition-all text-left group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <Boxes className="w-4 h-4 text-[#3B82F6] group-hover:scale-110 transition-transform" />
            <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
          </div>
          <div className="mt-2">
            <div className="text-xs font-bold text-[#F1F5F9]">Máquinas</div>
            <div className="text-[10px] text-[#64748B] font-mono">{metrics.totalMachines} Hosts</div>
          </div>
        </button>

        {onNavigateToIpam && (
          <button
            onClick={onNavigateToIpam}
            className="p-3 rounded-xl bg-[#0F141B] border border-[#252D38] hover:border-[#06B6D4]/60 hover:bg-[#151B23] transition-all text-left group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <Calculator className="w-4 h-4 text-[#06B6D4] group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-[#F1F5F9]">Módulo IPAM</div>
              <div className="text-[10px] text-[#64748B] font-mono">Calculadora & Subredes</div>
            </div>
          </button>
        )}

        {onNavigateToIPs && (
          <button
            onClick={onNavigateToIPs}
            className="p-3 rounded-xl bg-[#0F141B] border border-[#252D38] hover:border-[#06B6D4]/60 hover:bg-[#151B23] transition-all text-left group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <Binary className="w-4 h-4 text-[#06B6D4] group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-[#F1F5F9]">IPs & Conflictos</div>
              <div className="text-[10px] text-[#64748B] font-mono">{metrics.totalIPs} Direcciones</div>
            </div>
          </button>
        )}

        {onNavigateToTags && (
          <button
            onClick={onNavigateToTags}
            className="p-3 rounded-xl bg-[#0F141B] border border-[#252D38] hover:border-pink-500/60 hover:bg-[#151B23] transition-all text-left group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <TagIcon className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-[#F1F5F9]">Tags</div>
              <div className="text-[10px] text-[#64748B] font-mono">{data?.availableTags?.length || 0} Etiquetas</div>
            </div>
          </button>
        )}

        {onNavigateToLocations && (
          <button
            onClick={onNavigateToLocations}
            className="p-3 rounded-xl bg-[#0F141B] border border-[#252D38] hover:border-emerald-500/60 hover:bg-[#151B23] transition-all text-left group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <MapPin className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-[#F1F5F9]">Ubicaciones</div>
              <div className="text-[10px] text-[#64748B] font-mono">Árbol & Racks</div>
            </div>
          </button>
        )}

        {onNavigateToGroups && (
          <button
            onClick={onNavigateToGroups}
            className="p-3 rounded-xl bg-[#0F141B] border border-[#252D38] hover:border-purple-500/60 hover:bg-[#151B23] transition-all text-left group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <FolderTree className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-[#F1F5F9]">Grupos</div>
              <div className="text-[10px] text-[#64748B]">Dominios</div>
            </div>
          </button>
        )}

        {onNavigateToMonitoring && (
          <button
            onClick={onNavigateToMonitoring}
            className="p-3 rounded-xl bg-[#0F141B] border border-[#252D38] hover:border-[#22C55E]/60 hover:bg-[#151B23] transition-all text-left group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <HeartPulse className="w-4 h-4 text-[#22C55E] group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-[#F1F5F9]">Monitorización</div>
              <div className="text-[10px] text-[#64748B] font-mono">{status.online} Online</div>
            </div>
          </button>
        )}

        {onNavigateToAlerts && (
          <button
            onClick={onNavigateToAlerts}
            className="p-3 rounded-xl bg-[#0F141B] border border-[#252D38] hover:border-[#EF4444]/60 hover:bg-[#151B23] transition-all text-left group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <Bell className="w-4 h-4 text-[#EF4444] group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-[#F1F5F9]">Alertas</div>
              <div className="text-[10px] text-[#64748B]">Z-Score</div>
            </div>
          </button>
        )}

        {onNavigateToTopology && (
          <button
            onClick={onNavigateToTopology}
            className="p-3 rounded-xl bg-[#0F141B] border border-[#252D38] hover:border-[#06B6D4]/60 hover:bg-[#151B23] transition-all text-left group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <GitFork className="w-4 h-4 text-[#06B6D4] group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-[#06B6D4]">Topología</div>
              <div className="text-[10px] text-[#64748B]">Mapa & Enlaces</div>
            </div>
          </button>
        )}

        {onNavigateToAssets && (
          <button
            onClick={onNavigateToAssets}
            className="p-3 rounded-xl bg-[#0F141B] border border-[#252D38] hover:border-[#06B6D4]/60 hover:bg-[#151B23] transition-all text-left group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <Laptop className="w-4 h-4 text-[#06B6D4] group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-[#06B6D4]">Activos IT</div>
              <div className="text-[10px] text-[#64748B]">Hardware & Licencias</div>
            </div>
          </button>
        )}
      </div>

      {/* Real-Time Monitoring Banner Widget */}
      <Card className="p-5 border-[#22C55E]/30 bg-gradient-to-r from-[#0F141B] via-[#111C18] to-[#0F141B]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] mt-0.5 shadow-sm">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#F1F5F9]">Telemetría en Tiempo Real & Gráficos</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" />
                  MOTOR ACTIVO
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">
                Recopilación continua de métricas (CPU, RAM, Latencia ICMP, Pérdida de paquetes, Servicios TCP/HTTP) con detección de anomalías estadísticas y streaming WebSocket.
              </p>
            </div>
          </div>

          {onNavigateToGraphs && (
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowRight className="w-4 h-4 text-[#22C55E]" />}
              onClick={onNavigateToGraphs}
              className="border-[#22C55E]/40 hover:border-[#22C55E] text-[#F1F5F9] whitespace-nowrap"
            >
              Abrir Gráficos
            </Button>
          )}
        </div>
      </Card>

      {/* Discovery Module Summary Widget */}
      <Card className="p-5 border-[#06B6D4]/20 bg-gradient-to-r from-[#0F141B] via-[#151B23] to-[#0F141B]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4] mt-0.5">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#F1F5F9]">Último Escaneo de Red (Discovery)</h3>
                {data?.lastScan && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                      data.lastScan.status === 'COMPLETED'
                        ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                        : data.lastScan.status === 'RUNNING'
                        ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30'
                        : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                    }`}
                  >
                    {data.lastScan.status}
                  </span>
                )}
              </div>
              {data?.lastScan ? (
                <p className="text-xs text-[#94A3B8] mt-1">
                  Red: <strong className="text-[#F1F5F9] font-mono">{data.lastScan.networkCidr}</strong> ({data.lastScan.scanType}) • Fecha: {new Date(data.lastScan.startedAt).toLocaleString()}
                  {data.lastScan.durationMs && ` • Duración: ${(data.lastScan.durationMs / 1000).toFixed(1)}s`}
                </p>
              ) : (
                <p className="text-xs text-[#94A3B8] mt-1">
                  No se ha ejecutado ningún escaneo de red todavía. Ejecuta un descubrimiento para sincronizar el inventario.
                </p>
              )}
            </div>
          </div>

          <Button
            variant="cyan"
            size="sm"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={onNavigateToDiscovery}
          >
            Abrir Discovery
          </Button>
        </div>

        {data?.lastScan && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#252D38]">
            <div className="p-2.5 rounded-lg bg-[#0B0F14] border border-[#252D38]">
              <div className="text-[10px] font-semibold uppercase text-[#64748B]">Dispositivos Activos</div>
              <div className="text-lg font-bold text-[#22C55E] font-mono mt-0.5">{data.lastScan.activeHosts}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0B0F14] border border-[#252D38]">
              <div className="text-[10px] font-semibold uppercase text-[#64748B]">Nuevos Detectados</div>
              <div className="text-lg font-bold text-[#06B6D4] font-mono mt-0.5">{data.lastScan.newDevices}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0B0F14] border border-[#252D38]">
              <div className="text-[10px] font-semibold uppercase text-[#64748B]">Cambios Detectados</div>
              <div className="text-lg font-bold text-[#F59E0B] font-mono mt-0.5">{data.lastScan.changedDevices}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0B0F14] border border-[#252D38]">
              <div className="text-[10px] font-semibold uppercase text-[#64748B]">No Detectados</div>
              <div className="text-lg font-bold text-[#EF4444] font-mono mt-0.5">{data.lastScan.missingDevices}</div>
            </div>
          </div>
        )}
      </Card>

      {/* Main Grid: Recent Machines Table + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b border-[#252D38] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#F1F5F9]">Máquinas Recientes</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Últimos equipos actualizados</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateToMachines}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Ver todas
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F141B] text-[#94A3B8] border-b border-[#252D38] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Hostname</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">IP Principal</th>
                    <th className="py-3 px-4">Sistema</th>
                    <th className="py-3 px-4">Ubicación</th>
                    <th className="py-3 px-4 text-right">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {data?.recentMachines && data.recentMachines.length > 0 ? (
                    data.recentMachines.map((m) => (
                      <tr
                        key={m.id}
                        onClick={() => onNavigateToMachineDetail(m.id)}
                        className="hover:bg-[#1A212B]/70 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#F1F5F9] whitespace-nowrap">
                          {m.hostname}
                        </td>
                        <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap">
                          {m.type.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#06B6D4] whitespace-nowrap">
                          {m.primaryIp || '-'}
                        </td>
                        <td className="py-3 px-4 text-[#94A3B8] truncate max-w-[140px]">
                          {m.os || '-'}
                        </td>
                        <td className="py-3 px-4 text-[#94A3B8] truncate max-w-[120px]">
                          {m.location?.name || '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-[#64748B] whitespace-nowrap font-mono text-[11px]">
                          {new Date(m.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[#64748B]">
                        No hay máquinas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-0 overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-[#252D38] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#F1F5F9]">Actividad Reciente</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Registro de auditoría</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateToChanges}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Historial
              </Button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {data?.recentChanges && data.recentChanges.length > 0 ? (
                data.recentChanges.map((change) => (
                  <div key={change.id} className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-2 h-2 rounded-full mt-1 ${
                          change.action === 'CREATE'
                            ? 'bg-[#22C55E]'
                            : change.action === 'DELETE'
                            ? 'bg-[#EF4444]'
                            : 'bg-[#3B82F6]'
                        }`}
                      />
                      <span className="w-px flex-1 bg-[#252D38] my-1" />
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#F1F5F9]">{change.entityType}</span>
                        <span className="text-[10px] text-[#64748B] font-mono">
                          {new Date(change.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[#94A3B8] mt-0.5 line-clamp-2">{change.details}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[#64748B]">Sin cambios recientes.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
