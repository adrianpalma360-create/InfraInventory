import React, { useState } from 'react';
import { Card } from '../ui/Card.js';
import { Cpu, HardDrive, Activity, Radio } from 'lucide-react';

interface NocResourcesOverviewProps {
  resources: {
    cpuAvg: number | null;
    cpuMax: number | null;
    ramAvg: number | null;
    ramMax: number | null;
    diskAvg: number | null;
    diskMax: number | null;
    latencyAvg: number | null;
    latencyMax: number | null;
    reportingHostsCount: number;
    totalHosts: number;
  };
}

export const NocResourcesOverview: React.FC<NocResourcesOverviewProps> = ({ resources }) => {
  const [metricMode, setMetricMode] = useState<'avg' | 'max'>('avg');

  const getMetricValue = (avg: number | null, max: number | null) => {
    if (metricMode === 'avg') return avg;
    return max;
  };

  const cpuVal = getMetricValue(resources.cpuAvg, resources.cpuMax);
  const ramVal = getMetricValue(resources.ramAvg, resources.ramMax);
  const diskVal = getMetricValue(resources.diskAvg, resources.diskMax);
  const latencyVal = getMetricValue(resources.latencyAvg, resources.latencyMax);

  const getUsageColor = (val: number | null) => {
    if (val === null || val === undefined) return '#64748B';
    if (val >= 90) return '#EF4444';
    if (val >= 80) return '#F59E0B';
    return '#22C55E';
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#252D38] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#06B6D4]" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
              Recursos Globales de Infraestructura
            </h3>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              {resources.reportingHostsCount} de {resources.totalHosts} hosts reportando telemetría
            </span>
          </div>
        </div>

        {/* Average vs Peak (Max) Toggle */}
        <div className="flex items-center p-0.5 rounded-lg bg-[#0B0F14] border border-[#252D38] self-start sm:self-auto">
          <button
            onClick={() => setMetricMode('avg')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
              metricMode === 'avg'
                ? 'bg-[#06B6D4] text-[#0B0F14] font-bold shadow'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Media (Avg)
          </button>
          <button
            onClick={() => setMetricMode('max')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
              metricMode === 'max'
                ? 'bg-[#06B6D4] text-[#0B0F14] font-bold shadow'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Pico (Max)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        {/* CPU */}
        <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#252D38] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase text-[#94A3B8]">
              CPU Global {metricMode === 'avg' ? '(Media)' : '(Pico)'}
            </span>
            <Cpu className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black" style={{ color: getUsageColor(cpuVal) }}>
              {cpuVal !== null ? `${cpuVal}%` : 'N/D'}
            </span>
          </div>
          {cpuVal !== null && (
            <div className="w-full bg-[#151B23] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, cpuVal)}%`, backgroundColor: getUsageColor(cpuVal) }}
              />
            </div>
          )}
        </div>

        {/* RAM */}
        <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#252D38] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase text-[#94A3B8]">
              RAM Global {metricMode === 'avg' ? '(Media)' : '(Pico)'}
            </span>
            <Activity className="w-4 h-4 text-[#06B6D4]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black" style={{ color: getUsageColor(ramVal) }}>
              {ramVal !== null ? `${ramVal}%` : 'N/D'}
            </span>
          </div>
          {ramVal !== null && (
            <div className="w-full bg-[#151B23] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, ramVal)}%`, backgroundColor: getUsageColor(ramVal) }}
              />
            </div>
          )}
        </div>

        {/* DISK */}
        <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#252D38] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase text-[#94A3B8]">
              Disco Global {metricMode === 'avg' ? '(Media)' : '(Pico)'}
            </span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black" style={{ color: getUsageColor(diskVal) }}>
              {diskVal !== null ? `${diskVal}%` : 'N/D'}
            </span>
          </div>
          {diskVal !== null && (
            <div className="w-full bg-[#151B23] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, diskVal)}%`, backgroundColor: getUsageColor(diskVal) }}
              />
            </div>
          )}
        </div>

        {/* LATENCY */}
        <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#252D38] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase text-[#94A3B8]">
              Latencia ICMP {metricMode === 'avg' ? '(Media)' : '(Pico)'}
            </span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">
              {latencyVal !== null ? `${latencyVal}ms` : 'N/D'}
            </span>
          </div>
          <div className="text-[10px] text-[#64748B] mt-1 truncate">
            {latencyVal !== null && latencyVal < 50 ? '● Respuesta rápida' : '● Tiempo normal'}
          </div>
        </div>
      </div>
    </Card>
  );
};
