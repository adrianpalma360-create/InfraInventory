import React from 'react';
import { Card } from '../ui/Card.js';
import { HeartPulse, ArrowRight, Activity } from 'lucide-react';
import { Button } from '../ui/Button.js';

interface NocMonitoringWidgetProps {
  monitoring: {
    status: 'ONLINE' | 'OFFLINE';
    lastExecution: string | null;
    monitoredDevices: number;
    totalChecks: number;
    failures: number;
    checkIntervalSec: number;
  };
  onNavigateToMonitoring?: () => void;
  onNavigateToGraphs?: () => void;
}

export const NocMonitoringWidget: React.FC<NocMonitoringWidgetProps> = ({
  monitoring,
  onNavigateToMonitoring,
  onNavigateToGraphs,
}) => {
  const isOnline = monitoring.status === 'ONLINE';

  return (
    <Card className="p-4 flex flex-col justify-between h-full bg-gradient-to-r from-[#0F141B] via-[#111C18] to-[#0F141B] border-[#22C55E]/30">
      <div>
        <div className="flex items-center justify-between border-b border-[#252D38] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-[#22C55E] animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
              Monitoring Worker & Telemetría
            </h3>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border flex items-center gap-1.5 ${
              isOnline
                ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#22C55E] animate-ping' : 'bg-[#EF4444]'}`} />
            {monitoring.status}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-[10px] text-[#64748B] block uppercase font-mono">Intervalo de Chequeo</span>
              <span className="font-bold text-[#F1F5F9] font-mono text-sm">Cada {monitoring.checkIntervalSec}s</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#64748B] block uppercase font-mono">Última Telemetría</span>
              <span className="font-mono text-[11px] text-[#94A3B8]">
                {monitoring.lastExecution
                  ? new Date(monitoring.lastExecution).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'N/D'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-2 rounded-lg bg-[#0B0F14] border border-[#252D38]">
              <div className="text-[9px] uppercase text-[#64748B]">Hosts Activos</div>
              <div className="text-base font-black text-[#22C55E] mt-0.5">{monitoring.monitoredDevices}</div>
            </div>
            <div className="p-2 rounded-lg bg-[#0B0F14] border border-[#252D38]">
              <div className="text-[9px] uppercase text-[#64748B]">Checks / Ciclo</div>
              <div className="text-base font-black text-[#06B6D4] mt-0.5">{monitoring.totalChecks}</div>
            </div>
            <div className="p-2 rounded-lg bg-[#0B0F14] border border-[#252D38]">
              <div className="text-[9px] uppercase text-[#64748B]">Incidentes</div>
              <div className={`text-base font-black mt-0.5 ${monitoring.failures > 0 ? 'text-[#EF4444]' : 'text-[#64748B]'}`}>
                {monitoring.failures}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#252D38] mt-3">
        {onNavigateToGraphs && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onNavigateToGraphs}
            icon={<Activity className="w-3.5 h-3.5 text-[#22C55E]" />}
            className="text-xs"
          >
            Gráficos
          </Button>
        )}
        {onNavigateToMonitoring && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToMonitoring}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            className="text-xs text-[#22C55E]"
          >
            Detalles
          </Button>
        )}
      </div>
    </Card>
  );
};
