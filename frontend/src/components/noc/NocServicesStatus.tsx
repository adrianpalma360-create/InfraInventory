import React from 'react';
import { Card } from '../ui/Card.js';
import { ProblematicService } from '../../types/index.js';
import { Layers, CheckCircle2, ArrowRight } from 'lucide-react';

interface NocServicesStatusProps {
  services: {
    total: number;
    healthy: number;
    warning: number;
    down: number;
    problematic: ProblematicService[];
  };
  onNavigateToMachineDetail: (id: string) => void;
  onNavigateToServices?: () => void;
}

export const NocServicesStatus: React.FC<NocServicesStatusProps> = ({
  services,
  onNavigateToMachineDetail,
  onNavigateToServices,
}) => {
  return (
    <Card className="p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between border-b border-[#252D38] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
              Estado de Servicios Monitorizados
            </h3>
          </div>
          {onNavigateToServices && (
            <button
              onClick={onNavigateToServices}
              className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-mono"
            >
              <span>Ver Todos</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Counter Pills */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono mb-3">
          <div className="p-2 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]">
            <div className="text-[10px] uppercase font-bold">Healthy</div>
            <div className="text-base font-black mt-0.5">{services.healthy}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
            <div className="text-[10px] uppercase font-bold">Warning</div>
            <div className="text-base font-black mt-0.5">{services.warning}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]">
            <div className="text-[10px] uppercase font-bold">Down</div>
            <div className="text-base font-black mt-0.5">{services.down}</div>
          </div>
        </div>

        {/* Problematic Services List */}
        <div className="space-y-2">
          {services.problematic.length > 0 ? (
            services.problematic.slice(0, 5).map((srv) => (
              <div
                key={srv.id}
                onClick={() => onNavigateToMachineDetail(srv.machineId)}
                className="p-2.5 rounded-lg bg-[#0B0F14] border border-[#252D38] hover:border-purple-500/50 transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      srv.status === 'CRITICAL' || srv.status === 'DEGRADED' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'
                    }`}
                  />
                  <div className="truncate">
                    <span className="text-xs font-semibold text-[#F1F5F9] truncate block">
                      {srv.serviceName} ({srv.portNumber}/{srv.protocol})
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono">Host: {srv.hostname}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                      srv.status === 'CRITICAL' || srv.status === 'DEGRADED'
                        ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                        : 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]'
                    }`}
                  >
                    {srv.status}
                  </span>
                  {srv.responseTimeMs && (
                    <div className="text-[9px] text-[#64748B] font-mono">{srv.responseTimeMs}ms</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-lg bg-[#22C55E]/5 border border-[#22C55E]/20 text-center flex items-center justify-center gap-2 text-xs text-[#22C55E]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Todos los servicios monitorizados responden con normalidad</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
