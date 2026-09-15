import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useMetricsWs } from '../context/MetricsWsContext.js';
import { MonitoringOverviewData, MonitoringProblem, HealthState } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import {
  Activity,
  Radio,
  Layers,
  AlertTriangle,
  HeartPulse,
  Server,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  Zap,
} from 'lucide-react';

export type MonitoringSubTab = 'status' | 'ports' | 'services' | 'problems';

interface MonitoringPageProps {
  initialSubTab?: MonitoringSubTab;
  onSelectMachine?: (id: string) => void;
  onNavigateToGraphs?: () => void;
  onNavigateToAlerts?: () => void;
}

export const MonitoringPage: React.FC<MonitoringPageProps> = ({
  initialSubTab = 'status',
  onSelectMachine,
  onNavigateToGraphs,
  onNavigateToAlerts,
}) => {
  const toast = useToast();
  const { isConnected, timeAgoText } = useMetricsWs();
  const [activeSubTab, setActiveSubTab] = useState<MonitoringSubTab>(initialSubTab);
  const [data, setData] = useState<MonitoringOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadOverview = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    try {
      const result = await api.getMonitoringOverview();
      setData(result);
    } catch (err: any) {
      toast.error('Error al cargar datos de monitorización', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const handleResolveProblem = async (problem: MonitoringProblem) => {
    if (!problem.anomalyId) return;
    setResolvingId(problem.id);
    try {
      await api.resolveAlert(problem.anomalyId);
      toast.success('Problema resuelto', `La anomalía ha sido marcada como resuelta.`);
      loadOverview();
    } catch (err: any) {
      toast.error('Error al resolver problema', err.message);
    } finally {
      setResolvingId(null);
    }
  };

  const overview = data?.overview || {
    totalMachines: 0,
    healthyCount: 0,
    warningCount: 0,
    degradedCount: 0,
    criticalCount: 0,
    offlineCount: 0,
    totalServices: 0,
    servicesUp: 0,
    servicesWarning: 0,
    servicesDegraded: 0,
    servicesDown: 0,
    totalPorts: 0,
    portsOpen: 0,
    portsClosed: 0,
    portsFiltered: 0,
    activeProblemsCount: 0,
  };

  const getHealthBadge = (health: HealthState) => {
    switch (health) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 animate-pulse">CRITICAL</span>;
      case 'DEGRADED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/40">DEGRADED</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">WARNING</span>;
      case 'HEALTHY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">HEALTHY</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#64748B]/20 text-[#94A3B8] border border-[#64748B]/30">UNKNOWN</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-[#22C55E]" />
            Centro de Monitorización & Salud Operativa
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Estado de salud de hosts, matriz de puertos en vivo, servicios de red y centro de problemas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0F141B] border border-[#252D38] text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[#22C55E] animate-pulse' : 'bg-[#EF4444]'
              }`}
            />
            <span className="text-[#94A3B8]">{isConnected ? `LIVE ● ${timeAgoText}` : 'Desconectado'}</span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={() => loadOverview(true)}
          >
            Actualizar
          </Button>

          {onNavigateToAlerts && (
            <Button
              variant="secondary"
              size="sm"
              icon={<AlertTriangle className="w-4 h-4 text-[#F59E0B]" />}
              onClick={onNavigateToAlerts}
            >
              Alertas & Incidentes &rarr;
            </Button>
          )}

          {onNavigateToGraphs && (
            <Button
              variant="cyan"
              size="sm"
              icon={<Zap className="w-4 h-4" />}
              onClick={onNavigateToGraphs}
            >
              Gráficos en Tiempo Real &rarr;
            </Button>
          )}
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 border-l-2 border-l-[#22C55E] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Hosts Saludables</div>
          <div className="text-2xl font-bold font-mono text-[#22C55E] mt-1.5 flex items-baseline gap-2">
            <span>{overview.healthyCount}</span>
            <span className="text-xs font-normal text-[#64748B]">/ {overview.totalMachines} hosts</span>
          </div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#06B6D4] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Servicios Operativos</div>
          <div className="text-2xl font-bold font-mono text-[#06B6D4] mt-1.5 flex items-baseline gap-2">
            <span>{overview.servicesUp}</span>
            <span className="text-xs font-normal text-[#64748B]">/ {overview.totalServices} total</span>
          </div>
        </Card>

        <Card className="p-4 border-l-2 border-l-purple-500 bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Puertos Abiertos</div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1.5">
            {overview.portsOpen}
          </div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#EF4444] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Problemas Detectados</div>
          <div className="text-2xl font-bold font-mono text-[#EF4444] mt-1.5 flex items-center justify-between">
            <span>{overview.activeProblemsCount}</span>
            {overview.activeProblemsCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-ping" />
            )}
          </div>
        </Card>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#252D38] pb-2">
        <button
          onClick={() => setActiveSubTab('status')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'status'
              ? 'bg-[#151B23] text-[#22C55E] border border-[#22C55E]/40 shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Estado de Hosts</span>
          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-[#22C55E]/10 text-[#22C55E] font-mono">
            {data?.hostStatuses.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ports')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'ports'
              ? 'bg-[#151B23] text-[#22C55E] border border-[#22C55E]/40 shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Puertos en Vivo</span>
          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-purple-500/10 text-purple-400 font-mono">
            {data?.ports.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('services')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'services'
              ? 'bg-[#151B23] text-[#22C55E] border border-[#22C55E]/40 shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Servicios de Red</span>
          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-[#06B6D4]/10 text-[#06B6D4] font-mono">
            {data?.serviceChecks.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('problems')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'problems'
              ? 'bg-[#151B23] text-[#EF4444] border border-[#EF4444]/40 shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          <span>Problemas & Degradaciones</span>
          {overview.activeProblemsCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-[#EF4444]/20 text-[#EF4444] font-mono font-bold animate-pulse">
              {overview.activeProblemsCount}
            </span>
          )}
        </button>
      </div>

      {/* Sub-tab 1: Estado de Hosts */}
      {activeSubTab === 'status' && (
        <Card className="p-0 overflow-hidden bg-[#0F141B]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#151B23] text-[#94A3B8] uppercase font-semibold border-b border-[#252D38]">
                <tr>
                  <th className="py-3 px-4">Salud Operativa</th>
                  <th className="py-3 px-4">Hostname</th>
                  <th className="py-3 px-4">IP Principal</th>
                  <th className="py-3 px-4">Grupo</th>
                  <th className="py-3 px-4">CPU</th>
                  <th className="py-3 px-4">RAM</th>
                  <th className="py-3 px-4">Latencia</th>
                  <th className="py-3 px-4 text-right">Última Telemetría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D38]/60">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="py-3 px-4">
                        <Skeleton className="h-6 w-full rounded" />
                      </td>
                    </tr>
                  ))
                ) : data?.hostStatuses && data.hostStatuses.length > 0 ? (
                  data.hostStatuses.map((host) => (
                    <tr key={host.id} className="hover:bg-[#1A212B]/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getHealthBadge(host.healthState)}
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#F1F5F9] whitespace-nowrap">
                        <button
                          onClick={() => onSelectMachine && onSelectMachine(host.id)}
                          className="hover:text-[#06B6D4] hover:underline transition-colors flex items-center gap-1.5"
                        >
                          <Server className="w-3.5 h-3.5 text-[#3B82F6]" />
                          {host.hostname}
                        </button>
                      </td>

                      <td className="py-3 px-4 font-mono text-[#06B6D4] whitespace-nowrap">
                        {host.primaryIp || '-'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#151B23] text-purple-300 border border-[#252D38]">
                          {host.group}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {host.cpuUsage !== null ? (
                          <span className={host.cpuUsage >= 80 ? 'text-[#EF4444] font-bold' : 'text-[#F1F5F9]'}>
                            {host.cpuUsage}%
                          </span>
                        ) : (
                          <span className="text-[#64748B] italic">N/D</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {host.ramUsage !== null ? (
                          <span className={host.ramUsage >= 85 ? 'text-[#F59E0B] font-bold' : 'text-[#F1F5F9]'}>
                            {host.ramUsage}%
                          </span>
                        ) : (
                          <span className="text-[#64748B] italic">N/D</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {host.latencyMs !== null ? (
                          <span className={host.latencyMs >= 100 ? 'text-[#F59E0B] font-bold' : 'text-[#22C55E]'}>
                            {host.latencyMs} ms
                          </span>
                        ) : (
                          <span className="text-[#64748B] italic">N/D</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        {new Date(host.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-[#64748B]">
                      No hay máquinas registradas en la monitorización.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Sub-tab 2: Puertos en Vivo */}
      {activeSubTab === 'ports' && (
        <Card className="p-0 overflow-hidden bg-[#0F141B]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#151B23] text-[#94A3B8] uppercase font-semibold border-b border-[#252D38]">
                <tr>
                  <th className="py-3 px-4">Puerto</th>
                  <th className="py-3 px-4">Protocolo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Servicio Asociado</th>
                  <th className="py-3 px-4">Host / Máquina</th>
                  <th className="py-3 px-4">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D38]/60">
                {data?.ports && data.ports.length > 0 ? (
                  data.ports.map((p) => (
                    <tr key={p.id} className="hover:bg-[#1A212B]/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#06B6D4] whitespace-nowrap">
                        :{p.portNumber}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#151B23] text-[#94A3B8] border border-[#252D38]">
                          {p.protocol}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.state === 'OPEN'
                              ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                              : p.state === 'FILTERED'
                              ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                              : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                          }`}
                        >
                          {p.state}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#F1F5F9] whitespace-nowrap">
                        {p.service?.name || 'Personalizado'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.machine ? (
                          <button
                            onClick={() => onSelectMachine && onSelectMachine(p.machine!.id)}
                            className="text-[#94A3B8] hover:text-[#06B6D4] hover:underline transition-colors flex items-center gap-1"
                          >
                            <Server className="w-3 h-3 text-[#3B82F6]" />
                            {p.machine.hostname}
                          </button>
                        ) : (
                          <span className="text-[#64748B]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[#94A3B8] max-w-xs truncate">
                        {p.description || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#64748B]">
                      No hay puertos registrados. Realiza un escaneo en Discovery para poblar la matriz de puertos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Sub-tab 3: Servicios de Red */}
      {activeSubTab === 'services' && (
        <Card className="p-0 overflow-hidden bg-[#0F141B]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#151B23] text-[#94A3B8] uppercase font-semibold border-b border-[#252D38]">
                <tr>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Servicio</th>
                  <th className="py-3 px-4">Puerto / Protocolo</th>
                  <th className="py-3 px-4">Host / Máquina</th>
                  <th className="py-3 px-4">Latencia</th>
                  <th className="py-3 px-4">Tiempo Respuesta</th>
                  <th className="py-3 px-4 text-right">Última Comprobación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D38]/60">
                {data?.serviceChecks && data.serviceChecks.length > 0 ? (
                  data.serviceChecks.map((srv) => (
                    <tr key={srv.id} className="hover:bg-[#1A212B]/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getHealthBadge(srv.status)}
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#F1F5F9] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-purple-400" />
                          <span>{srv.serviceName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <span className="text-[#06B6D4]">:{srv.portNumber}</span>
                        <span className="text-[#64748B] ml-1">({srv.protocol})</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {srv.machine ? (
                          <button
                            onClick={() => onSelectMachine && onSelectMachine(srv.machine!.id)}
                            className="text-[#94A3B8] hover:text-[#06B6D4] hover:underline transition-colors flex items-center gap-1"
                          >
                            <Server className="w-3 h-3 text-[#3B82F6]" />
                            {srv.machine.hostname}
                          </button>
                        ) : (
                          <span className="text-[#64748B]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {srv.latencyMs !== null ? (
                          <span className="text-[#22C55E]">{srv.latencyMs} ms</span>
                        ) : (
                          <span className="text-[#64748B] italic">N/D</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {srv.responseTimeMs !== null ? (
                          <span className="text-[#06B6D4]">{srv.responseTimeMs} ms</span>
                        ) : (
                          <span className="text-[#64748B] italic">N/D</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        {new Date(srv.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#64748B]">
                      No hay comprobaciones de servicios registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Sub-tab 4: Problemas & Degradaciones */}
      {activeSubTab === 'problems' && (
        <div className="space-y-3">
          {data?.problems && data.problems.length > 0 ? (
            data.problems.map((problem) => (
              <Card
                key={problem.id}
                className={`p-4 border-l-4 transition-all ${
                  problem.severity === 'CRITICAL'
                    ? 'border-l-[#EF4444] bg-[#161214] border-[#EF4444]/30'
                    : 'border-l-[#F59E0B] bg-[#171512] border-[#F59E0B]/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg mt-0.5 ${
                        problem.severity === 'CRITICAL'
                          ? 'bg-[#EF4444]/20 text-[#EF4444]'
                          : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                            problem.severity === 'CRITICAL'
                              ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                              : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                          }`}
                        >
                          {problem.severity}
                        </span>
                        <h4 className="font-bold text-sm text-[#F1F5F9]">{problem.title}</h4>
                      </div>

                      <p className="text-xs text-[#94A3B8] mt-1">{problem.message}</p>

                      <div className="flex items-center gap-4 mt-2 text-[11px] text-[#64748B] font-mono">
                        <span className="flex items-center gap-1">
                          <Server className="w-3 h-3 text-[#3B82F6]" />
                          Host: <strong className="text-[#F1F5F9]">{problem.hostname}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Detectado: {new Date(problem.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {problem.anomalyId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResolveProblem(problem)}
                        disabled={resolvingId === problem.id}
                        className="text-xs"
                      >
                        {resolvingId === problem.id ? 'Resolviendo...' : 'Resolver Alerta'}
                      </Button>
                    )}

                    {problem.machineId && onSelectMachine && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectMachine(problem.machineId!)}
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Ver Host
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-10 text-center bg-[#0F141B]">
              <div className="w-12 h-12 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#F1F5F9]">Sin problemas activos</h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto mt-1">
                Toda la infraestructura monitorizada se encuentra en estado saludable. No hay alertas críticas ni degradaciones de servicios detectadas.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
