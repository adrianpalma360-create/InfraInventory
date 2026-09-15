import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useMetricsWs } from '../context/MetricsWsContext.js';
import { MetricAnomaly } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface AlertsPageProps {
  onSelectMachine?: (id: string) => void;
  onNavigateToGraphs?: () => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  onSelectMachine,
  onNavigateToGraphs,
}) => {
  const toast = useToast();
  const { isConnected, timeAgoText } = useMetricsWs();
  const [anomalies, setAnomalies] = useState<MetricAnomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadAlerts = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    try {
      const data = await api.getAlerts();
      setAnomalies(data || []);
    } catch (err: any) {
      toast.error('Error al cargar alertas', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await api.resolveAlert(id);
      toast.success('Alerta resuelta', 'La alerta ha sido marcada como resuelta.');
      loadAlerts();
    } catch (err: any) {
      toast.error('Error al resolver alerta', err.message);
    } finally {
      setResolvingId(null);
    }
  };

  // Filtered alerts
  const filteredAlerts = anomalies.filter((item) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && !item.isResolved) ||
      (statusFilter === 'RESOLVED' && item.isResolved);

    const matchesSeverity =
      severityFilter === 'ALL' || item.severity === severityFilter;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.metricType.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q) ||
      (item.machine?.hostname && item.machine.hostname.toLowerCase().includes(q));

    return matchesStatus && matchesSeverity && matchesSearch;
  });

  const activeCount = anomalies.filter((a) => !a.isResolved).length;
  const criticalCount = anomalies.filter((a) => !a.isResolved && a.severity === 'CRITICAL').length;
  const warningCount = anomalies.filter((a) => !a.isResolved && a.severity === 'WARNING').length;
  const resolvedCount = anomalies.filter((a) => a.isResolved).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#EF4444]" />
            Centro Unificado de Alertas & Notificaciones
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Detección de anomalías estadísticas ($Z \ge 2.5$), saturación de umbrales y registro de incidencias
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
            onClick={() => loadAlerts(true)}
          >
            Actualizar
          </Button>

          {onNavigateToGraphs && (
            <Button
              variant="cyan"
              size="sm"
              icon={<Zap className="w-4 h-4" />}
              onClick={onNavigateToGraphs}
            >
              Gráficos & Telemetría &rarr;
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 border-l-2 border-l-[#EF4444] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Alertas Críticas</div>
          <div className="text-2xl font-bold font-mono text-[#EF4444] mt-1.5 flex items-center justify-between">
            <span>{criticalCount}</span>
            {criticalCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-ping" />}
          </div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#F59E0B] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Advertencias (Warning)</div>
          <div className="text-2xl font-bold font-mono text-[#F59E0B] mt-1.5">{warningCount}</div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#06B6D4] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Total Activas</div>
          <div className="text-2xl font-bold font-mono text-[#06B6D4] mt-1.5">{activeCount}</div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#22C55E] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Resueltas</div>
          <div className="text-2xl font-bold font-mono text-[#22C55E] mt-1.5">{resolvedCount}</div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <Card className="p-4 bg-[#0F141B] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por tipo de métrica, host o diagnóstico..."
            className="w-full bg-[#151B23] border border-[#252D38] rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
          >
            <option value="ACTIVE">Alertas Activas</option>
            <option value="RESOLVED">Resueltas</option>
            <option value="ALL">Todas las Alertas</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
          >
            <option value="ALL">Todas las Severidades</option>
            <option value="CRITICAL">Solo Críticas</option>
            <option value="WARNING">Solo Advertencias</option>
          </select>
        </div>
      </Card>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-xl" />
          ))
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`p-4 border-l-4 transition-all ${
                alert.isResolved
                  ? 'border-l-[#22C55E] bg-[#0F141B] opacity-75'
                  : alert.severity === 'CRITICAL'
                  ? 'border-l-[#EF4444] bg-[#161214] border-[#EF4444]/30 shadow-lg shadow-rose-950/10'
                  : 'border-l-[#F59E0B] bg-[#171512] border-[#F59E0B]/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      alert.isResolved
                        ? 'bg-[#22C55E]/10 text-[#22C55E]'
                        : alert.severity === 'CRITICAL'
                        ? 'bg-[#EF4444]/20 text-[#EF4444]'
                        : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                    }`}
                  >
                    {alert.isResolved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                          alert.isResolved
                            ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                            : alert.severity === 'CRITICAL'
                            ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                            : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                        }`}
                      >
                        {alert.isResolved ? 'RESUELTO' : alert.severity}
                      </span>
                      <h4 className="font-bold text-sm text-[#F1F5F9]">
                        Anomalía en {alert.metricType} &bull; {alert.machine?.hostname || 'Host'}
                      </h4>
                    </div>

                    <p className="text-xs text-[#94A3B8] mt-1">{alert.message}</p>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-[#64748B] font-mono">
                      <span>
                        Valor Actual: <strong className="text-[#F1F5F9]">{alert.currentValue.toFixed(1)}</strong>
                      </span>
                      <span>
                        Media Habitual ($\mu$): <strong className="text-[#94A3B8]">{alert.expectedMean.toFixed(1)}</strong>
                      </span>
                      <span>
                        Desv. Estándar ($\sigma$): <strong className="text-[#94A3B8]">{alert.standardDeviation.toFixed(1)}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.detectedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!alert.isResolved && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="text-xs border-[#22C55E]/40 text-[#22C55E] hover:bg-[#22C55E]/10"
                    >
                      {resolvingId === alert.id ? 'Resolviendo...' : 'Resolver Alerta'}
                    </Button>
                  )}

                  {alert.machineId && onSelectMachine && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectMachine(alert.machineId)}
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
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#F1F5F9]">Bandeja de Alertas Limpia</h3>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto mt-1">
              No hay alertas pendientes que coincidan con los filtros seleccionados.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
