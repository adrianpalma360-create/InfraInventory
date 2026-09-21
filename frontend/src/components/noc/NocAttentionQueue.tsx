import React from 'react';
import { AttentionDevice } from '../../types/index.js';
import { Card } from '../ui/Card.js';
import { ShieldAlert, AlertTriangle, XCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface NocAttentionQueueProps {
  devices: AttentionDevice[];
  onNavigateToMachineDetail: (id: string) => void;
  onNavigateToMachines?: () => void;
}

export const NocAttentionQueue: React.FC<NocAttentionQueueProps> = ({
  devices,
  onNavigateToMachineDetail,
}) => {
  return (
    <Card className="p-0 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-[#252D38] flex items-center justify-between bg-[#0B0F14]/50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
              Requieren Atención Inmediata
            </h3>
            <span className="text-[10px] text-[#94A3B8]">Priorizado por severidad e impacto</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#151B23] border border-[#252D38] text-[#94A3B8]">
          {devices.length} {devices.length === 1 ? 'host' : 'hosts'}
        </span>
      </div>

      <div className="divide-y divide-[#252D38]/60 overflow-y-auto max-h-[380px] flex-1">
        {devices.length > 0 ? (
          devices.map((device) => {
            const isCrit = device.severity === 'CRITICAL';
            const isOff = device.severity === 'OFFLINE';

            return (
              <div
                key={device.machineId}
                onClick={() => onNavigateToMachineDetail(device.machineId)}
                className="p-3.5 hover:bg-[#151B23] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isCrit ? (
                      <div className="p-1.5 rounded-lg bg-[#EF4444]/20 text-[#EF4444]">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : isOff ? (
                      <div className="p-1.5 rounded-lg bg-[#EF4444]/10 text-[#EF4444]">
                        <XCircle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-[#F59E0B]/20 text-[#F59E0B]">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F1F5F9] truncate group-hover:text-[#06B6D4] transition-colors">
                        {device.hostname}
                      </span>
                      {device.primaryIp && (
                        <span className="text-[10px] font-mono text-[#64748B] shrink-0">
                          {device.primaryIp}
                        </span>
                      )}
                      {device.group && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#151B23] text-[#94A3B8] border border-[#252D38] hidden sm:inline">
                          {device.group}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-1 leading-snug">
                      {device.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      isCrit
                        ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                        : isOff
                        ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                        : 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]'
                    }`}
                  >
                    {device.severity}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#F1F5F9] transition-colors" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 text-[#64748B]">
            <CheckCircle2 className="w-6 h-6 text-[#22C55E]" />
            <div className="text-xs font-semibold text-[#F1F5F9]">Todo en Orden</div>
            <p className="text-[11px] text-[#94A3B8] max-w-xs">
              No hay dispositivos con problemas críticos, alertas sin resolver ni servicios caídos en este momento.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
