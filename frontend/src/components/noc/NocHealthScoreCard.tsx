import React, { useState } from 'react';
import { HealthScoreData } from '../../types/index.js';
import { Card } from '../ui/Card.js';
import { HeartPulse, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface NocHealthScoreCardProps {
  health: HealthScoreData;
}

export const NocHealthScoreCard: React.FC<NocHealthScoreCardProps> = ({ health }) => {
  const [showFormula, setShowFormula] = useState(false);

  const score = health.score;
  const isAvailable = score !== null && score !== undefined;

  const getScoreColor = () => {
    if (!isAvailable) return '#64748B';
    if (score >= 90) return '#22C55E';
    if (score >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const color = getScoreColor();

  return (
    <Card className="p-5 border-l-4 relative overflow-hidden flex flex-col justify-between" style={{ borderLeftColor: color }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4" style={{ color }} />
            <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              Infrastructure Health Score
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-black font-mono tracking-tight" style={{ color }}>
              {isAvailable ? `${score}%` : 'N/D'}
            </span>
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border font-mono"
              style={{
                backgroundColor: `${color}15`,
                borderColor: `${color}40`,
                color,
              }}
            >
              {health.label || (isAvailable ? 'CALCULADO' : 'NO DISPONIBLE')}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowFormula(!showFormula)}
          title="Ver desglose del cálculo"
          className="p-1.5 rounded-lg bg-[#151B23] border border-[#252D38] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors flex items-center gap-1 text-[11px]"
        >
          <Info className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Desglose</span>
          {showFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Breakdown Accordion / Drawer */}
      {showFormula && health.breakdown && (
        <div className="mt-4 pt-3 border-t border-[#252D38] space-y-2.5 text-xs animate-in fade-in duration-150">
          <div className="text-[11px] text-[#94A3B8] font-mono leading-relaxed bg-[#0B0F14] p-2 rounded-lg border border-[#252D38]">
            <strong className="text-[#F1F5F9]">Fórmula Ponderada:</strong> {health.breakdown.formula}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-mono">
            <div className="p-2 rounded bg-[#151B23] border border-[#252D38]">
              <div className="text-[10px] text-[#64748B]">Disponibilidad (40%)</div>
              <div className="text-sm font-bold text-[#22C55E] mt-0.5">{health.breakdown.availabilityScore}%</div>
            </div>
            <div className="p-2 rounded bg-[#151B23] border border-[#252D38]">
              <div className="text-[10px] text-[#64748B]">Alertas (30%)</div>
              <div className="text-sm font-bold text-[#06B6D4] mt-0.5">{health.breakdown.alertsScore}%</div>
            </div>
            <div className="p-2 rounded bg-[#151B23] border border-[#252D38]">
              <div className="text-[10px] text-[#64748B]">Servicios (20%)</div>
              <div className="text-sm font-bold text-purple-400 mt-0.5">{health.breakdown.servicesScore}%</div>
            </div>
            <div className="p-2 rounded bg-[#151B23] border border-[#252D38]">
              <div className="text-[10px] text-[#64748B]">Recursos (10%)</div>
              <div className="text-sm font-bold text-[#F59E0B] mt-0.5">{health.breakdown.resourcesScore}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Background Subtle Accent Glow */}
      <div
        className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ backgroundColor: color }}
      />
    </Card>
  );
};
