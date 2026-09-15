import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.js';
import { useMetricsWs } from '../context/MetricsWsContext.js';
import {
  Machine,
  ChartPeriod,
  HistoricalPoint,
  MachineGroupSummary,
  MonitoringConfig,
} from '../types/index.js';
import { MetricCard } from '../components/graphs/MetricCard.js';
import { MetricChart } from '../components/graphs/MetricChart.js';
import { ServiceChecksTable } from '../components/graphs/ServiceChecksTable.js';
import { AnomalyAlertBanner } from '../components/graphs/AnomalyAlertBanner.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import {
  Activity,
  Radio,
  Clock,
  Layers,
  Server,
  Cpu,
  HardDrive,
  Network,
  Zap,
  Sliders,
  AlertOctagon,
} from 'lucide-react';

export const GraphsPage: React.FC = () => {
  const toast = useToast();
  const {
    isConnected,
    timeAgoText,
    latestSample,
    liveBuffer,
    liveServices,
    liveAnomalies,
    subscribe,
  } = useMetricsWs();

  // Filters state
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [period, setPeriod] = useState<ChartPeriod>('realtime');

  // Metadata state
  const [machines, setMachines] = useState<Machine[]>([]);
  const [groups, setGroups] = useState<MachineGroupSummary[]>([]);
  const [historicalPoints, setHistoricalPoints] = useState<HistoricalPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Settings modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [monitoringConfig, setMonitoringConfig] = useState<MonitoringConfig | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // 1. Load Machines & Groups list
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [machinesRes, groupsList] = await Promise.all([
          api.getMachines({ limit: 100 }),
          api.getGroups(),
        ]);
        setMachines(machinesRes.items || []);
        setGroups(groupsList || []);
      } catch (err: any) {
        toast.error('Error al cargar metadatos de máquinas', err.message);
      }
    };
    loadMetadata();
  }, []);

  // 2. Handle Machine/Group change -> update subscription and historical queries
  useEffect(() => {
    subscribe(selectedMachineId || undefined, selectedGroup || undefined);
  }, [selectedMachineId, selectedGroup, subscribe]);

  // 3. Load historical data when in non-realtime period or when machine/group changes
  const loadHistoricalData = async () => {
    if (period === 'realtime') return;
    setIsLoadingHistory(true);
    try {
      const res = await api.getHistoricalMetrics({
        machineId: selectedMachineId || undefined,
        groupId: selectedGroup || undefined,
        period,
      });
      setHistoricalPoints(res.data);
    } catch (err: any) {
      toast.error('Error al cargar métricas históricas', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistoricalData();
  }, [selectedMachineId, selectedGroup, period]);

  // 4. Determine which chart data array to feed to charts
  const chartData = useMemo(() => {
    if (period === 'realtime') {
      return liveBuffer;
    }
    return historicalPoints;
  }, [period, liveBuffer, historicalPoints]);

  // 5. Open Monitoring Config Modal
  const handleOpenConfig = async () => {
    try {
      const config = await api.getMonitoringConfig();
      setMonitoringConfig(config);
      setIsConfigModalOpen(true);
    } catch (err: any) {
      toast.error('Error al cargar configuración de monitoreo', err.message);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monitoringConfig) return;
    setIsSavingConfig(true);
    try {
      const updated = await api.updateMonitoringConfig(monitoringConfig);
      setMonitoringConfig(updated);
      toast.success('Configuración guardada', 'Parámetros de monitoreo actualizados.');
      setIsConfigModalOpen(false);
    } catch (err: any) {
      toast.error('Error al guardar configuración', err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-[#06B6D4] animate-pulse" />
            Gráficos & Monitorización en Tiempo Real
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Telemetría de infraestructura en vivo, flujos WebSocket de baja latencia y análisis de series temporales
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live WebSocket Connection Status Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
              isConnected
                ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[#22C55E] animate-ping' : 'bg-[#EF4444]'
              }`}
            />
            <span>{isConnected ? `LIVE ● ${timeAgoText}` : 'DESCONECTADO'}</span>
          </div>

          <Can permission="METRICS_CONFIG">
            <Button
              variant="secondary"
              size="sm"
              icon={<Sliders className="w-3.5 h-3.5" />}
              onClick={handleOpenConfig}
            >
              Configuración
            </Button>
          </Can>
        </div>
      </div>

      {/* Control Bar: Machine Selector, Group Selector, Time Period Buttons */}
      <Card className="p-4 bg-[#0F141B] border-[#252D38] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Machine Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#3B82F6]" />
              Máquina / Host
            </label>
            <select
              value={selectedMachineId}
              onChange={(e) => {
                setSelectedMachineId(e.target.value);
                if (e.target.value) setSelectedGroup('');
              }}
              className="w-full bg-[#0B0F14] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6] cursor-pointer font-mono"
            >
              <option value="">Todas las Máquinas (Global)</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.hostname} {m.primaryIp ? `(${m.primaryIp})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Group Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#A855F7]" />
              Grupo de Infraestructura
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                if (e.target.value) setSelectedMachineId('');
              }}
              className="w-full bg-[#0B0F14] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#A855F7] cursor-pointer"
            >
              <option value="">Todos los Grupos</option>
              {groups.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name} ({g.totalMachines} equipos)
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#06B6D4]" />
              Ventana Temporal & Modo
            </label>
            <div className="flex flex-wrap gap-1.5 bg-[#0B0F14] p-1 rounded-lg border border-[#252D38]">
              <button
                onClick={() => setPeriod('realtime')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1.5 ${
                  period === 'realtime'
                    ? 'bg-[#06B6D4] text-[#0B0F14] shadow-md font-bold'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <Radio className="w-3 h-3" />
                Tiempo Real
              </button>

              {(['5m', '15m', '1h', '6h', '24h', '7d', '30d'] as ChartPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                    period === p
                      ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/40 font-semibold'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Statistical Anomaly Banners */}
      <AnomalyAlertBanner anomalies={liveAnomalies} />

      {/* Real-time Top KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          title="CPU Usage"
          value={latestSample?.cpuUsage}
          unit="%"
          accentColor="#3B82F6"
          icon={<Cpu className="w-3.5 h-3.5 text-[#3B82F6]" />}
          timestamp={latestSample?.timestamp}
          healthState={latestSample?.healthState}
        />

        <MetricCard
          title="RAM Usage"
          value={latestSample?.ramUsage}
          unit="%"
          accentColor="#A855F7"
          icon={<Zap className="w-3.5 h-3.5 text-[#A855F7]" />}
          timestamp={latestSample?.timestamp}
          healthState={latestSample?.healthState}
        />

        <MetricCard
          title="Disk Space"
          value={latestSample?.diskUsage}
          unit="%"
          accentColor="#F59E0B"
          icon={<HardDrive className="w-3.5 h-3.5 text-[#F59E0B]" />}
          timestamp={latestSample?.timestamp}
        />

        <MetricCard
          title="Latency ICMP"
          value={latestSample?.latencyMs}
          unit="ms"
          accentColor="#06B6D4"
          icon={<Radio className="w-3.5 h-3.5 text-[#06B6D4]" />}
          timestamp={latestSample?.timestamp}
          healthState={latestSample?.healthState}
        />

        <MetricCard
          title="Network Traffic"
          value={latestSample?.networkRxKbps}
          unit="Kbps"
          accentColor="#22C55E"
          icon={<Network className="w-3.5 h-3.5 text-[#22C55E]" />}
          timestamp={latestSample?.timestamp}
        />

        <MetricCard
          title="Packet Loss"
          value={latestSample?.errorRate}
          unit="%"
          accentColor="#EF4444"
          icon={<AlertOctagon className="w-3.5 h-3.5 text-[#EF4444]" />}
          timestamp={latestSample?.timestamp}
        />
      </div>

      {/* Main Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Latency & Response Time */}
        <MetricChart
          title="Latencia de Red (ICMP) y Response Time"
          data={chartData}
          dataKey="latencyMs"
          unit="ms"
          color="#06B6D4"
          gradientId="gradLatency"
        />

        {/* Chart 2: Network Throughput RX */}
        <MetricChart
          title="Tráfico de Red Recibido (RX Throughput)"
          data={chartData}
          dataKey="networkRxKbps"
          unit="Kbps"
          color="#22C55E"
          gradientId="gradNetRx"
        />

        {/* Chart 3: CPU Usage */}
        <MetricChart
          title="Utilización de Procesador (CPU)"
          data={chartData}
          dataKey="cpuUsage"
          unit="%"
          color="#3B82F6"
          gradientId="gradCpu"
          yDomain={[0, 100]}
        />

        {/* Chart 4: Active Connections & Response Time */}
        <MetricChart
          title="Tiempo de Respuesta de Servicios (TCP Response Time)"
          data={chartData}
          dataKey="responseTimeMs"
          unit="ms"
          color="#A855F7"
          gradientId="gradRespTime"
        />
      </div>

      {/* Live Service Checks & Port Latency Table */}
      <ServiceChecksTable services={liveServices} isLoading={isLoadingHistory} />

      {/* Monitoring Configuration Modal (ADMIN & TECHNICIAN) */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Configuración de Monitorización & Thresholds"
        maxWidth="lg"
      >
        {monitoringConfig && (
          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                  Frecuencia de Muestreo (Worker) *
                </label>
                <select
                  value={monitoringConfig.checkIntervalSec}
                  onChange={(e) =>
                    setMonitoringConfig({
                      ...monitoringConfig,
                      checkIntervalSec: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg px-3.5 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value={30}>30 segundos (Recomendado)</option>
                  <option value={60}>1 minuto</option>
                  <option value={300}>5 minutos</option>
                </select>
              </div>

              <Input
                label="Retención de Métricas Históricas (Días)"
                type="number"
                value={monitoringConfig.retentionDays}
                onChange={(e) =>
                  setMonitoringConfig({
                    ...monitoringConfig,
                    retentionDays: Number(e.target.value),
                  })
                }
                required
              />
            </div>

            <div className="pt-2 border-t border-[#252D38]">
              <h4 className="font-semibold text-[#F1F5F9] uppercase tracking-wider text-[11px] mb-3">
                Umbrales de Alerta de Latencia & Recursos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Umbral Latencia Warning (ms)"
                  type="number"
                  value={monitoringConfig.thresholdLatencyWarn}
                  onChange={(e) =>
                    setMonitoringConfig({
                      ...monitoringConfig,
                      thresholdLatencyWarn: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="Umbral Latencia Crítica (ms)"
                  type="number"
                  value={monitoringConfig.thresholdLatencyCrit}
                  onChange={(e) =>
                    setMonitoringConfig({
                      ...monitoringConfig,
                      thresholdLatencyCrit: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="Umbral CPU Warning (%)"
                  type="number"
                  value={monitoringConfig.thresholdCpuWarn}
                  onChange={(e) =>
                    setMonitoringConfig({
                      ...monitoringConfig,
                      thresholdCpuWarn: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="Umbral CPU Crítica (%)"
                  type="number"
                  value={monitoringConfig.thresholdCpuCrit}
                  onChange={(e) =>
                    setMonitoringConfig({
                      ...monitoringConfig,
                      thresholdCpuCrit: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#252D38]">
              <Button type="button" variant="ghost" onClick={() => setIsConfigModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isSavingConfig}>
                {isSavingConfig ? 'Guardando...' : 'Guardar Parámetros'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
