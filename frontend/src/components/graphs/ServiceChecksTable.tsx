import React from 'react';
import { Card } from '../ui/Card.js';
import { ServiceCheck, HealthState } from '../../types/index.js';
import { Activity } from 'lucide-react';

interface ServiceChecksTableProps {
  services: ServiceCheck[];
  isLoading?: boolean;
}

export const ServiceChecksTable: React.FC<ServiceChecksTableProps> = ({ services, isLoading }) => {
  const getStatusBadge = (status: HealthState) => {
    switch (status) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />
            CRITICAL
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
            DEGRADED
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            WARNING
          </span>
        );
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            HEALTHY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#64748B]/20 text-[#94A3B8] border border-[#64748B]/30">
            UNKNOWN
          </span>
        );
    }
  };

  return (
    <Card className="p-0 overflow-hidden bg-[#0F141B]">
      <div className="p-4 border-b border-[#252D38] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#06B6D4]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
            Monitorización de Servicios & Puertos
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#64748B]">
          {services.length} servicios auditados
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B0F14] text-[#94A3B8] border-b border-[#252D38] uppercase font-semibold text-[10px]">
            <tr>
              <th className="py-2.5 px-4">Máquina / Host</th>
              <th className="py-2.5 px-4">Servicio</th>
              <th className="py-2.5 px-4">Puerto</th>
              <th className="py-2.5 px-4">Estado</th>
              <th className="py-2.5 px-4">Latencia</th>
              <th className="py-2.5 px-4">Response Time</th>
              <th className="py-2.5 px-4">Errores</th>
              <th className="py-2.5 px-4 text-right">Última Comprobación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252D38]/50">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#64748B]">
                  Cargando estado de servicios...
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#64748B]">
                  No hay servicios monitorizados registrados.
                </td>
              </tr>
            ) : (
              services.map((srv) => (
                <tr key={srv.id || `${srv.machineId}-${srv.portNumber}`} className="hover:bg-[#151B23]/60 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-[#F1F5F9] whitespace-nowrap">
                    {srv.machine?.hostname || 'Host'}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-[#06B6D4]">{srv.serviceName}</td>
                  <td className="py-2.5 px-4 font-mono text-[#94A3B8]">
                    {srv.portNumber}/{srv.protocol}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">{getStatusBadge(srv.status)}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-[#94A3B8]">
                    {srv.latencyMs !== null && srv.latencyMs !== undefined ? `${srv.latencyMs.toFixed(0)} ms` : 'N/D'}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-[#F1F5F9]">
                    {srv.responseTimeMs !== null && srv.responseTimeMs !== undefined ? `${srv.responseTimeMs.toFixed(0)} ms` : 'N/D'}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px]">
                    <span className={srv.errorRate && srv.errorRate > 0 ? 'text-[#EF4444] font-bold' : 'text-[#22C55E]'}>
                      {srv.errorRate !== undefined ? `${srv.errorRate}%` : '0%'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-[10px] text-[#64748B] whitespace-nowrap">
                    {new Date(srv.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
