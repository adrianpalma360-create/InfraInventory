import React from 'react';
import { Card } from '../ui/Card.js';
import { DiscoveryScan } from '../../types/index.js';
import { Radar, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button.js';

interface NocDiscoveryWidgetProps {
  discovery: {
    lastScan: DiscoveryScan | null;
    totalNetworks: number;
  };
  onNavigateToDiscovery: () => void;
}

export const NocDiscoveryWidget: React.FC<NocDiscoveryWidgetProps> = ({
  discovery,
  onNavigateToDiscovery,
}) => {
  const scan = discovery.lastScan;

  return (
    <Card className="p-4 flex flex-col justify-between h-full bg-gradient-to-r from-[#0F141B] via-[#151B23] to-[#0F141B] border-[#06B6D4]/30">
      <div>
        <div className="flex items-center justify-between border-b border-[#252D38] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-[#06B6D4] animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
              Descubrimiento de Red (Discovery Engine)
            </h3>
          </div>
          <Button
            variant="cyan"
            size="sm"
            onClick={onNavigateToDiscovery}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Ver Discovery
          </Button>
        </div>

        {scan ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[10px] text-[#64748B] block uppercase font-mono">Última Red Escaneada</span>
                <span className="font-bold text-[#F1F5F9] font-mono text-sm">{scan.networkCidr}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#64748B] block uppercase font-mono">Fecha & Hora</span>
                <span className="font-mono text-[11px] text-[#94A3B8]">
                  {new Date(scan.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(scan.startedAt).toLocaleDateString()})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2 rounded-lg bg-[#0B0F14] border border-[#252D38]">
                <div className="text-[9px] uppercase text-[#64748B]">Activos</div>
                <div className="text-base font-black text-[#22C55E] mt-0.5">{scan.activeHosts}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#0B0F14] border border-[#252D38]">
                <div className="text-[9px] uppercase text-[#64748B]">Nuevos</div>
                <div className="text-base font-black text-[#06B6D4] mt-0.5">{scan.newDevices}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#0B0F14] border border-[#252D38]">
                <div className="text-[9px] uppercase text-[#64748B]">Cambios</div>
                <div className="text-base font-black text-[#F59E0B] mt-0.5">{scan.changedDevices}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#0B0F14] border border-[#252D38]">
                <div className="text-[9px] uppercase text-[#64748B]">Faltantes</div>
                <div className="text-base font-black text-[#EF4444] mt-0.5">{scan.missingDevices}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[#94A3B8] space-y-2">
            <p>No se ha registrado ningún escaneo de red todavía.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToDiscovery}
              icon={<Radar className="w-3.5 h-3.5" />}
            >
              Configurar Primer Escaneo
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
