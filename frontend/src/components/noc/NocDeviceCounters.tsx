import React from 'react';
import { Card } from '../ui/Card.js';
import { Server, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { MachineStatus } from '../../types/index.js';

interface NocDeviceCountersProps {
  devices: {
    total: number;
    online: number;
    warning: number;
    offline: number;
    unchecked: number;
    maintenance: number;
  };
  activeStatusFilter?: MachineStatus | null;
  onSelectStatusFilter?: (status: MachineStatus | null) => void;
  onNavigateToMachines?: (status?: MachineStatus) => void;
}

export const NocDeviceCounters: React.FC<NocDeviceCountersProps> = ({
  devices,
  activeStatusFilter,
  onSelectStatusFilter,
  onNavigateToMachines,
}) => {
  const handleCardClick = (status: MachineStatus | null) => {
    if (onSelectStatusFilter) {
      onSelectStatusFilter(activeStatusFilter === status ? null : status);
    } else if (onNavigateToMachines && status) {
      onNavigateToMachines(status);
    }
  };

  const total = devices.total || 1;
  const pctOnline = Math.round((devices.online / total) * 100);
  const pctWarning = Math.round((devices.warning / total) * 100);
  const pctOffline = Math.round((devices.offline / total) * 100);
  const pctUnchecked = Math.max(0, 100 - pctOnline - pctWarning - pctOffline);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* TOTAL */}
        <Card
          onClick={() => handleCardClick(null)}
          className={`p-3.5 cursor-pointer transition-all border-l-4 border-l-[#3B82F6] hover:bg-[#151B23] ${
            activeStatusFilter === null ? 'ring-1 ring-[#3B82F6]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Total Hosts</span>
            <Server className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl font-black text-[#F1F5F9] font-mono mt-2">{devices.total}</div>
        </Card>

        {/* ONLINE */}
        <Card
          onClick={() => handleCardClick('ONLINE')}
          className={`p-3.5 cursor-pointer transition-all border-l-4 border-l-[#22C55E] hover:bg-[#151B23] ${
            activeStatusFilter === 'ONLINE' ? 'ring-1 ring-[#22C55E]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#22C55E]">Online</span>
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-2xl font-black text-[#22C55E] font-mono">{devices.online}</div>
            <span className="text-[10px] text-[#94A3B8] font-mono">{devices.total > 0 ? `${pctOnline}%` : ''}</span>
          </div>
        </Card>

        {/* WARNING */}
        <Card
          onClick={() => handleCardClick('WARNING')}
          className={`p-3.5 cursor-pointer transition-all border-l-4 border-l-[#F59E0B] hover:bg-[#151B23] ${
            activeStatusFilter === 'WARNING' ? 'ring-1 ring-[#F59E0B]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#F59E0B]">Warning</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-2xl font-black text-[#F59E0B] font-mono">{devices.warning}</div>
            <span className="text-[10px] text-[#94A3B8] font-mono">{devices.total > 0 ? `${pctWarning}%` : ''}</span>
          </div>
        </Card>

        {/* OFFLINE */}
        <Card
          onClick={() => handleCardClick('OFFLINE')}
          className={`p-3.5 cursor-pointer transition-all border-l-4 border-l-[#EF4444] hover:bg-[#151B23] ${
            activeStatusFilter === 'OFFLINE' ? 'ring-1 ring-[#EF4444]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#EF4444]">Offline</span>
            <XCircle className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-2xl font-black text-[#EF4444] font-mono">{devices.offline}</div>
            <span className="text-[10px] text-[#94A3B8] font-mono">{devices.total > 0 ? `${pctOffline}%` : ''}</span>
          </div>
        </Card>

        {/* UNCHECKED / SIN COMPROBAR */}
        <Card
          onClick={() => handleCardClick('UNCHECKED')}
          className={`p-3.5 cursor-pointer transition-all border-l-4 border-l-[#64748B] hover:bg-[#151B23] ${
            activeStatusFilter === 'UNCHECKED' ? 'ring-1 ring-[#64748B]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Sin Comprobar</span>
            <HelpCircle className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-2xl font-black text-[#94A3B8] font-mono">{devices.unchecked}</div>
            <span className="text-[10px] text-[#64748B] font-mono">{devices.total > 0 ? `${pctUnchecked}%` : ''}</span>
          </div>
        </Card>
      </div>

      {/* Segmented Distribution Bar */}
      {devices.total > 0 && (
        <div className="h-1.5 w-full bg-[#151B23] rounded-full overflow-hidden flex gap-0.5">
          {devices.online > 0 && <div style={{ width: `${pctOnline}%` }} className="bg-[#22C55E] h-full" title={`Online: ${devices.online}`} />}
          {devices.warning > 0 && <div style={{ width: `${pctWarning}%` }} className="bg-[#F59E0B] h-full" title={`Warning: ${devices.warning}`} />}
          {devices.offline > 0 && <div style={{ width: `${pctOffline}%` }} className="bg-[#EF4444] h-full" title={`Offline: ${devices.offline}`} />}
          {devices.unchecked > 0 && <div style={{ width: `${pctUnchecked}%` }} className="bg-[#64748B] h-full" title={`Unchecked: ${devices.unchecked}`} />}
        </div>
      )}
    </div>
  );
};
