import React from 'react';
import { NocCriticalAlert } from '../../types/index.js';
import { AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button.js';

interface NocCriticalAlertsBannerProps {
  criticalAlerts: NocCriticalAlert[];
  onNavigateToMachineDetail?: (id: string) => void;
  onNavigateToAlerts?: () => void;
}

export const NocCriticalAlertsBanner: React.FC<NocCriticalAlertsBannerProps> = ({
  criticalAlerts,
  onNavigateToMachineDetail,
  onNavigateToAlerts,
}) => {
  if (criticalAlerts.length === 0) {
    return (
      <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-between text-xs text-[#22C55E]">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
          <span className="font-semibold">Sin alertas críticas activas en la infraestructura</span>
        </div>
        <span className="text-[11px] font-mono text-[#22C55E]/80 hidden sm:inline">0 Incidentes Críticos</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-[#EF4444]/20 via-[#EF4444]/10 to-[#0F141B] border-2 border-[#EF4444]/50 shadow-lg space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EF4444]/20 pb-2.5">
        <div className="flex items-center gap-2 text-[#EF4444]">
          <AlertOctagon className="w-5 h-5 animate-bounce" />
          <h3 className="text-sm font-black uppercase tracking-wider">
            {criticalAlerts.length} {criticalAlerts.length === 1 ? 'ALERTA CRÍTICA ACTIVA' : 'ALERTAS CRÍTICAS ACTIVAS'}
          </h3>
        </div>
        {onNavigateToAlerts && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToAlerts}
            className="text-[#EF4444] hover:bg-[#EF4444]/20 text-xs p-1"
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Ver Todas las Alertas
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {criticalAlerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            onClick={() => onNavigateToMachineDetail && onNavigateToMachineDetail(alert.machineId)}
            className="p-3 rounded-lg bg-[#0B0F14]/90 border border-[#EF4444]/30 hover:border-[#EF4444] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#F1F5F9]">{alert.hostname}</span>
                <span className="text-[10px] font-mono text-[#EF4444] font-bold uppercase">{alert.metricType}</span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2 leading-tight">
                {alert.message}
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#64748B] font-mono mt-2 pt-1.5 border-t border-[#252D38]">
              <span>{new Date(alert.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-[#06B6D4] hover:underline flex items-center gap-0.5">
                Abrir Host <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
