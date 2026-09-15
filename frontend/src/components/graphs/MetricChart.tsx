import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card } from '../ui/Card.js';
import { HistoricalPoint } from '../../types/index.js';

interface MetricChartProps {
  title: string;
  data: HistoricalPoint[];
  dataKey: keyof HistoricalPoint;
  maxKey?: keyof HistoricalPoint;
  unit: string;
  color?: string;
  gradientId: string;
  height?: number;
  yDomain?: [number | string, number | string];
  showMaxLine?: boolean;
}

export const MetricChart: React.FC<MetricChartProps> = ({
  title,
  data,
  dataKey,
  unit,
  color = '#06B6D4',
  gradientId,
  height = 240,
  yDomain = [0, 'auto'],
}) => {
  // Extract numerical values to calculate stats
  const values = data
    .map((d) => d[dataKey])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));

  const lastValue = values.length > 0 ? values[values.length - 1] : null;
  const avgValue =
    values.length > 0
      ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
      : null;
  const maxValue = values.length > 0 ? Math.max(...values) : null;

  return (
    <Card className="p-4 space-y-3 bg-[#0F141B]/90 border-[#252D38]">
      {/* Header with Title and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#252D38]/60 pb-2.5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">{title}</h3>
          <span className="text-[10px] text-[#64748B] font-mono">
            {data.length > 0 ? `${data.length} muestras` : 'Esperando datos...'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1">
            <span className="text-[#64748B]">Último:</span>
            <span className="font-bold text-[#F1F5F9]">
              {lastValue !== null ? `${lastValue} ${unit}` : 'N/D'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#64748B]">Media:</span>
            <span className="text-[#94A3B8]">
              {avgValue !== null ? `${avgValue} ${unit}` : 'N/D'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#64748B]">Máx:</span>
            <span className="text-[#F59E0B]">
              {maxValue !== null ? `${maxValue} ${unit}` : 'N/D'}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Area Chart */}
      {data.length === 0 || values.length === 0 ? (
        <div
          className="flex items-center justify-center text-xs text-[#64748B] italic bg-[#0B0F14]/50 rounded-lg border border-[#252D38]/40"
          style={{ height }}
        >
          No hay métricas registradas en este intervalo
        </div>
      ) : (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#252D38" vertical={false} />

              <XAxis
                dataKey="timeLabel"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#252D38' }}
              />

              <YAxis
                domain={yDomain}
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#252D38' }}
                tickFormatter={(v) => `${v}`}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const val = payload[0].value;
                    return (
                      <div className="bg-[#0B0F14] border border-[#252D38] p-2.5 rounded-lg shadow-xl text-xs font-mono">
                        <div className="text-[#94A3B8] text-[10px] mb-1">{label}</div>
                        <div className="font-bold flex items-center gap-1.5" style={{ color }}>
                          <span>{title}:</span>
                          <span>
                            {val} {unit}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey={dataKey as string}
                stroke={color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
