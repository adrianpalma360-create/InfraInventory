import React from 'react';
import { Card } from '../ui/Card.js';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { HealthState } from '../../types/index.js';

interface MetricCardProps {
  title: string;
  value: number | null | undefined;
  unit: string;
  trend?: 'RISING' | 'FALLING' | 'STEADY';
  healthState?: HealthState;
  timestamp?: string;
  icon?: React.ReactNode;
  accentColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  trend,
  healthState = 'HEALTHY',
  timestamp,
  icon,
  accentColor = '#06B6D4',
}) => {
  const isAvailable = value !== null && value !== undefined;

  const getStatusBadge = () => {
    switch (healthState) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 animate-pulse">CRITICAL</span>;
      case 'DEGRADED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/40">DEGRADED</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">WARNING</span>;
      case 'HEALTHY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">HEALTHY</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#64748B]/20 text-[#94A3B8] border border-[#64748B]/30">UNKNOWN</span>;
    }
  };

  return (
    <Card className={`p-4 flex flex-col justify-between border-l-2 bg-[#0F141B] transition-all duration-200 hover:border-[#3B82F6]/50 ${
      accentColor === '#3B82F6' ? 'border-l-[#3B82F6]' :
      accentColor === '#8B5CF6' ? 'border-l-[#8B5CF6]' :
      accentColor === '#22C55E' ? 'border-l-[#22C55E]' :
      accentColor === '#F59E0B' ? 'border-l-[#F59E0B]' :
      accentColor === '#EC4899' ? 'border-l-[#EC4899]' :
      accentColor === '#10B981' ? 'border-l-[#10B981]' :
      'border-l-[#06B6D4]'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
          {icon || <Activity className="w-3.5 h-3.5 text-[#06B6D4]" />}
          {title}
        </span>
        {getStatusBadge()}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          {isAvailable ? (
            <>
              <span className="text-2xl font-bold font-mono text-[#F1F5F9] tracking-tight">
                {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
              </span>
              <span className="text-xs font-medium text-[#64748B] uppercase">{unit}</span>
            </>
          ) : (
            <span className="text-sm font-semibold text-[#64748B] italic">No disponible</span>
          )}
        </div>

        {isAvailable && trend && (
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {trend === 'RISING' && (
              <span className="text-[#EF4444] flex items-center gap-0.5" title="Tendencia creciente">
                <TrendingUp className="w-3.5 h-3.5" /> Alza
              </span>
            )}
            {trend === 'FALLING' && (
              <span className="text-[#22C55E] flex items-center gap-0.5" title="Tendencia decreciente">
                <TrendingDown className="w-3.5 h-3.5" /> Baja
              </span>
            )}
            {trend === 'STEADY' && (
              <span className="text-[#64748B] flex items-center gap-0.5" title="Estable">
                <Minus className="w-3.5 h-3.5" /> Estable
              </span>
            )}
          </div>
        )}
      </div>

      {timestamp && (
        <div className="mt-2 pt-2 border-t border-[#252D38]/60 text-[10px] text-[#64748B] font-mono flex items-center justify-between">
          <span>Última muestra</span>
          <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      )}
    </Card>
  );
};
