import React, { useState } from 'react';
import { Card } from '../ui/Card.js';
import { NocCriticalAlert } from '../../types/index.js';
import { Bell, AlertTriangle, AlertOctagon, ArrowRight, CheckCircle2 } from 'lucide-react';

interface NocAlertsListProps {
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    items: NocCriticalAlert[];
  };
  onNavigateToMachineDetail: (id: string) => void;
  onNavigateToAlerts?: () => void;
}

export const NocAlertsList: React.FC<NocAlertsListProps> = ({
  alerts,
  onNavigateToMachineDetail,
  onNavigateToAlerts,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');

  const filteredItems = alerts.items.filter((item) => {
    if (filterSeverity === 'ALL') return true;
    return item.severity === filterSeverity;
  });

  return (
    <Card className="p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#252D38] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#EF4444]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
              Alertas & Anomalías Activas
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
              {alerts.total}
            </span>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setFilterSeverity('ALL')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                filterSeverity === 'ALL'
                  ? 'bg-[#151B23] text-[#F1F5F9] border border-[#252D38]'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              Todas ({alerts.total})
            </button>
            <button
              onClick={() => setFilterSeverity('CRITICAL')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                filterSeverity === 'CRITICAL'
                  ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 font-bold'
                  : 'text-[#64748B] hover:text-[#EF4444]'
              }`}
            >
              Críticas ({alerts.critical})
            </button>
            <button
              onClick={() => setFilterSeverity('WARNING')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                filterSeverity === 'WARNING'
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 font-bold'
                  : 'text-[#64748B] hover:text-[#F59E0B]'
              }`}
            >
              Warning ({alerts.warning})
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {filteredItems.length > 0 ? (
            filteredItems.slice(0, 8).map((alert) => {
              const isCrit = alert.severity === 'CRITICAL';

              return (
                <div
                  key={alert.id}
                  onClick={() => onNavigateToMachineDetail(alert.machineId)}
                  className="p-2.5 rounded-lg bg-[#0B0F14] border border-[#252D38] hover:border-[#3B82F6]/50 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {isCrit ? (
                        <AlertOctagon className="w-3.5 h-3.5 text-[#EF4444]" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#F1F5F9] group-hover:text-[#06B6D4] transition-colors truncate">
                          {alert.hostname}
                        </span>
                        <span className="text-[10px] font-mono text-[#64748B] truncate">
                          [{alert.metricType}]
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] truncate leading-tight mt-0.5">
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                        isCrit
                          ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                          : 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <div className="text-[9px] text-[#64748B] font-mono mt-0.5">
                      {new Date(alert.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center flex flex-col items-center justify-center space-y-1.5 text-[#64748B]">
              <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
              <div className="text-xs font-semibold text-[#F1F5F9]">Sin alertas en esta categoría</div>
            </div>
          )}
        </div>
      </div>

      {onNavigateToAlerts && alerts.total > 0 && (
        <div className="pt-2 border-t border-[#252D38] mt-2 text-center">
          <button
            onClick={onNavigateToAlerts}
            className="text-xs text-[#06B6D4] hover:underline font-mono inline-flex items-center gap-1"
          >
            <span>Ver Centro Completo de Alertas & Anomalías ({alerts.total})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </Card>
  );
};
