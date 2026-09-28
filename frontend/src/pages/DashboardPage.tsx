import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../services/api.js';
import { NocDashboardOverview, MachineStatus } from '../types/index.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { Button } from '../components/ui/Button.js';
import { Can } from '../context/AuthContext.js';
import { useMetricsWs } from '../context/MetricsWsContext.js';
import { NocHealthScoreCard } from '../components/noc/NocHealthScoreCard.js';
import { NocDeviceCounters } from '../components/noc/NocDeviceCounters.js';
import { NocCriticalAlertsBanner } from '../components/noc/NocCriticalAlertsBanner.js';
import { NocAttentionQueue } from '../components/noc/NocAttentionQueue.js';
import { NocResourcesOverview } from '../components/noc/NocResourcesOverview.js';
import { NocTopConsumers } from '../components/noc/NocTopConsumers.js';
import { NocServicesStatus } from '../components/noc/NocServicesStatus.js';
import { NocAlertsList } from '../components/noc/NocAlertsList.js';
import { NocPerformanceChart } from '../components/noc/NocPerformanceChart.js';
import { NocDiscoveryWidget } from '../components/noc/NocDiscoveryWidget.js';
import { NocMonitoringWidget } from '../components/noc/NocMonitoringWidget.js';
import { NocActivityTimeline } from '../components/noc/NocActivityTimeline.js';
import { NocFiltersBar } from '../components/noc/NocFiltersBar.js';
import { Plus, RefreshCw, AlertOctagon, Server, Radar, Bot } from 'lucide-react';
import { Card } from '../components/ui/Card.js';

interface DashboardPageProps {
  onNavigateToMachines: (status?: MachineStatus) => void;
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
  onNavigateToAi?: () => void;
  onOpenAddMachine: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToMachines,
  onNavigateToMachineDetail,
  onNavigateToChanges,
  onNavigateToDiscovery,
  onNavigateToGraphs,
  onNavigateToMonitoring,
  onNavigateToAlerts,
  onNavigateToAi,
  onOpenAddMachine,
}) => {
  const [data, setData] = useState<NocDashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Filters State
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<MachineStatus | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(60); // Default 1 min

  // Metrics WebSocket Context for Realtime Stream Status
  const { isConnected: isWsConnected } = useMetricsWs();
  const autoRefreshTimerRef = useRef<any>(null);

  const fetchNocOverview = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) setIsRefreshing(true);
      setError(null);

      try {
        const result = await api.getNocOverview({
          tag: selectedTag || undefined,
          group: selectedGroup || undefined,
          locationId: selectedLocation || undefined,
          status: selectedStatus || undefined,
          period: selectedPeriod,
        });
        setData(result);
        setLastSyncTime(new Date());
      } catch (err: any) {
        console.error('Failed to load NOC dashboard overview', err);
        setError(err.message || 'Error al conectar con el servidor backend');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedTag, selectedGroup, selectedLocation, selectedStatus, selectedPeriod]
  );

  // Initial Load and on filter change
  useEffect(() => {
    fetchNocOverview(false);
  }, [fetchNocOverview]);

  // Centralized Auto-Refresh Scheduler
  useEffect(() => {
    if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);

    if (autoRefreshSec > 0) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchNocOverview(false);
      }, autoRefreshSec * 1000);
    }

    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefreshSec, fetchNocOverview]);

  const handleResetFilters = () => {
    setSelectedTag(null);
    setSelectedGroup(null);
    setSelectedLocation(null);
    setSelectedStatus(null);
    setSelectedPeriod('24h');
  };

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 md:col-span-2 rounded-xl" />
        </div>
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error State with Retry
  if (error && !data) {
    return (
      <div className="p-8 rounded-2xl bg-[#0F141B] border border-[#EF4444]/30 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div className="max-w-md">
          <h2 className="text-base font-bold text-[#F1F5F9]">Dashboard data unavailable</h2>
          <p className="text-xs text-[#94A3B8] mt-1">{error}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={() => fetchNocOverview(true)}
        >
          Reintentar Conexión
        </Button>
      </div>
    );
  }

  const isCleanInstall = data?.devices.total === 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* NOC Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-[#F1F5F9] font-mono">
              IMP NOC
            </h1>
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Centro de Operaciones de Red y Supervisión Unificada de Infraestructura IT
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigateToAi && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Bot className="w-4 h-4 text-[#06B6D4]" />}
              onClick={onNavigateToAi}
              className="border-[#06B6D4]/30 hover:border-[#06B6D4] text-[#06B6D4]"
            >
              🤖 Analizar con IMP AI
            </Button>
          )}
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

      {/* Global Interactive Filters & Auto-Refresh Bar */}
      {data && (
        <NocFiltersBar
          availableTags={data.filters.availableTags}
          availableGroups={data.filters.availableGroups}
          availableLocations={data.filters.availableLocations}
          selectedTag={selectedTag}
          selectedGroup={selectedGroup}
          selectedLocation={selectedLocation}
          selectedStatus={selectedStatus}
          selectedPeriod={selectedPeriod}
          autoRefreshSec={autoRefreshSec}
          isWsConnected={isWsConnected}
          isRefreshing={isRefreshing}
          lastSyncTime={lastSyncTime}
          onSelectTag={setSelectedTag}
          onSelectGroup={setSelectedGroup}
          onSelectLocation={setSelectedLocation}
          onSelectStatus={setSelectedStatus}
          onSelectPeriod={setSelectedPeriod}
          onSelectAutoRefresh={setAutoRefreshSec}
          onRefresh={() => fetchNocOverview(true)}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* 1. Critical Alerts Highlight Banner (Top Visual Priority) */}
      {data && (
        <NocCriticalAlertsBanner
          criticalAlerts={data.criticalAlerts}
          onNavigateToMachineDetail={onNavigateToMachineDetail}
          onNavigateToAlerts={onNavigateToAlerts}
        />
      )}

      {/* 2. Primary KPI Row: Health Score + Status Distribution Counters */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <NocHealthScoreCard health={data.health} />
          </div>
          <div className="lg:col-span-2 flex flex-col justify-between">
            <NocDeviceCounters
              devices={data.devices}
              activeStatusFilter={selectedStatus}
              onSelectStatusFilter={setSelectedStatus}
              onNavigateToMachines={onNavigateToMachines}
            />
          </div>
        </div>
      )}

      {/* Empty State for Clean/Fresh Installations */}
      {isCleanInstall && (
        <Card className="p-8 border-dashed border-[#252D38] bg-[#0F141B]/90 text-center flex flex-col items-center justify-center space-y-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
            <Server className="w-6 h-6" />
          </div>
          <div className="max-w-md">
            <h3 className="text-sm font-bold text-[#F1F5F9]">Sin infraestructura monitorizada</h3>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
              IMP está listo. Comienza añadiendo tu primera máquina al inventario o ejecutando un escaneo de red en el módulo Discovery.
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
            <Button
              variant="secondary"
              size="sm"
              icon={<Radar className="w-3.5 h-3.5" />}
              onClick={onNavigateToDiscovery}
            >
              Descubrimiento de Red
            </Button>
          </div>
        </Card>
      )}

      {/* 3. Global Infrastructure Resources (CPU, RAM, DISK, Latency) */}
      {data && <NocResourcesOverview resources={data.resources} />}

      {/* 4. Top Resource Consumers (Top CPU, Top RAM, Top Disk) */}
      {data && (
        <NocTopConsumers
          topResources={data.topResources}
          onNavigateToMachineDetail={onNavigateToMachineDetail}
        />
      )}

      {/* 5. Central Operational Grid: Requieren Atención + Estado de Servicios + Feed de Alertas */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <NocAttentionQueue
              devices={data.devicesRequiringAttention}
              onNavigateToMachineDetail={onNavigateToMachineDetail}
              onNavigateToMachines={onNavigateToMachines}
            />
          </div>
          <div className="lg:col-span-1">
            <NocServicesStatus
              services={data.services}
              onNavigateToMachineDetail={onNavigateToMachineDetail}
              onNavigateToServices={onNavigateToMonitoring}
            />
          </div>
          <div className="lg:col-span-1">
            <NocAlertsList
              alerts={data.alerts}
              onNavigateToMachineDetail={onNavigateToMachineDetail}
              onNavigateToAlerts={onNavigateToAlerts}
            />
          </div>
        </div>
      )}

      {/* 6. Performance Trends Chart */}
      {data && (
        <NocPerformanceChart
          historical={data.historical}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
          onNavigateToGraphs={onNavigateToGraphs}
        />
      )}

      {/* 7. Bottom Operational Section: Discovery + Monitoring Worker + Recent Activity */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <NocDiscoveryWidget
              discovery={data.discovery}
              onNavigateToDiscovery={onNavigateToDiscovery}
            />
          </div>
          <div className="lg:col-span-1">
            <NocMonitoringWidget
              monitoring={data.monitoring}
              onNavigateToMonitoring={onNavigateToMonitoring}
              onNavigateToGraphs={onNavigateToGraphs}
            />
          </div>
          <div className="lg:col-span-1">
            <NocActivityTimeline
              activity={data.activity}
              onNavigateToChanges={onNavigateToChanges}
              onNavigateToMachineDetail={onNavigateToMachineDetail}
            />
          </div>
        </div>
      )}
    </div>
  );
};
