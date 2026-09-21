import React, { useState } from 'react';
import { Card } from '../ui/Card.js';
import { NocHistoricalPoint } from '../../types/index.js';
import { LineChart as LineChartIcon, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface NocPerformanceChartProps {
  historical: {
    period: string;
    bucketSeconds: number;
    pointsCount: number;
    data: NocHistoricalPoint[];
  };
  selectedPeriod: string;
  onSelectPeriod: (p: '1h' | '6h' | '24h' | '7d' | '30d') => void;
  onNavigateToGraphs?: () => void;
}

export const NocPerformanceChart: React.FC<NocPerformanceChartProps> = ({
  historical,
  selectedPeriod,
  onSelectPeriod,
}) => {
  const [activeMetric, setActiveMetric] = useState<'cpu_ram' | 'disk_latency'>('cpu_ram');

  const hasData = historical.data && historical.data.length > 0;

  const periods: Array<{ label: string; value: '1h' | '6h' | '24h' | '7d' | '30d' }> = [
    { label: '1 Hora', value: '1h' },
    { label: '6 Horas', value: '6h' },
    { label: '24 Horas', value: '24h' },
    { label: '7 Días', value: '7d' },
    { label: '30 Días', value: '30d' },
  ];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252D38] pb-3">
        <div className="flex items-center gap-2">
          <LineChartIcon className="w-4 h-4 text-[#22C55E]" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
              Rendimiento Global de Infraestructura
            </h3>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              {hasData ? `${historical.pointsCount} puntos de agregación` : 'Sin datos históricos en este periodo'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#0B0F14] border border-[#252D38]">
            <button
              onClick={() => setActiveMetric('cpu_ram')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                activeMetric === 'cpu_ram'
                  ? 'bg-[#22C55E] text-[#0B0F14] font-bold'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              CPU & RAM (%)
            </button>
            <button
              onClick={() => setActiveMetric('disk_latency')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                activeMetric === 'disk_latency'
                  ? 'bg-[#22C55E] text-[#0B0F14] font-bold'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              Disco & Latencia
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0B0F14] border border-[#252D38]">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => onSelectPeriod(p.value)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                  selectedPeriod === p.value
                    ? 'bg-[#06B6D4] text-[#0B0F14] font-bold'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="h-64 w-full font-mono text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historical.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0} />
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
                stroke="#64748B"
                fontSize={10}
                domain={[0, activeMetric === 'cpu_ram' ? 100 : 'auto']}
                tickLine={false}
                axisLine={{ stroke: '#252D38' }}
                unit={activeMetric === 'cpu_ram' ? '%' : ''}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F141B',
                  borderColor: '#252D38',
                  borderRadius: '0.5rem',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              {activeMetric === 'cpu_ram' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="cpuUsage"
                    name="CPU Media (%)"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCpu)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ramUsage"
                    name="RAM Media (%)"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRam)"
                  />
                </>
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="diskUsage"
                    name="Disco (%)"
                    stroke="#A855F7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDisk)"
                  />
                  <Area
                    type="monotone"
                    dataKey="latencyMs"
                    name="Latencia (ms)"
                    stroke="#22C55E"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLatency)"
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-44 w-full flex flex-col items-center justify-center border border-dashed border-[#252D38] rounded-xl bg-[#0B0F14]/50 text-center p-6 space-y-1">
          <Activity className="w-6 h-6 text-[#64748B]" />
          <div className="text-xs font-semibold text-[#F1F5F9]">No hay suficientes datos históricos</div>
          <p className="text-[11px] text-[#94A3B8] max-w-sm">
            Las muestras de métricas se registrarán automáticamente a medida que el monitoring-worker ejecute los sondeos.
          </p>
        </div>
      )}
    </Card>
  );
};
