import React from 'react';
import { Card } from '../ui/Card.js';
import { MetricAnomaly } from '../../types/index.js';
import { AlertTriangle, Clock } from 'lucide-react';

interface AnomalyAlertBannerProps {
  anomalies: MetricAnomaly[];
}

export const AnomalyAlertBanner: React.FC<AnomalyAlertBannerProps> = ({ anomalies }) => {
  if (!anomalies || anomalies.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {anomalies.map((a) => (
        <Card
          key={a.id}
          className="p-3.5 border-[#F59E0B]/40 bg-gradient-to-r from-[#F59E0B]/10 via-[#0F141B] to-[#0F141B] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-[#F59E0B]/20 text-[#F59E0B] mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">
                  ⚠️ Anomalía Estadística Detectada
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                  {a.metricType}
                </span>
                {a.machine?.hostname && (
                  <span className="text-xs font-bold text-[#F1F5F9] font-mono">
                    [{a.machine.hostname}]
                  </span>
                )}
              </div>
              <p className="text-xs text-[#E2E8F0] mt-1 font-medium">{a.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#94A3B8] whitespace-nowrap self-end sm:self-center">
            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
            <span>{new Date(a.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </Card>
      ))}
    </div>
  );
};
