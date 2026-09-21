import React from 'react';
import { Card } from '../ui/Card.js';
import { Tag, Location, MachineStatus } from '../../types/index.js';
import { Tag as TagIcon, Filter, RotateCcw, Clock, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button.js';

interface NocFiltersBarProps {
  availableTags: Tag[];
  availableGroups: string[];
  availableLocations: Location[];
  selectedTag: string | null;
  selectedGroup: string | null;
  selectedLocation: string | null;
  selectedStatus: MachineStatus | null;
  selectedPeriod: '1h' | '6h' | '24h' | '7d' | '30d';
  autoRefreshSec: number; // 0 = OFF, 30, 60, 300
  isWsConnected: boolean;
  isRefreshing: boolean;
  lastSyncTime: Date | null;
  onSelectTag: (tag: string | null) => void;
  onSelectGroup: (group: string | null) => void;
  onSelectLocation: (locId: string | null) => void;
  onSelectStatus: (status: MachineStatus | null) => void;
  onSelectPeriod: (period: '1h' | '6h' | '24h' | '7d' | '30d') => void;
  onSelectAutoRefresh: (sec: number) => void;
  onRefresh: () => void;
  onResetFilters: () => void;
}

export const NocFiltersBar: React.FC<NocFiltersBarProps> = ({
  availableTags,
  availableGroups,
  availableLocations,
  selectedTag,
  selectedGroup,
  selectedLocation,
  selectedStatus,
  autoRefreshSec,
  isWsConnected,
  isRefreshing,
  lastSyncTime,
  onSelectTag,
  onSelectGroup,
  onSelectLocation,
  onSelectStatus,
  onSelectAutoRefresh,
  onRefresh,
  onResetFilters,
}) => {
  const hasActiveFilters = Boolean(
    selectedTag || selectedGroup || selectedLocation || selectedStatus
  );

  return (
    <Card className="p-3.5 bg-[#0F141B] border-[#252D38] space-y-3">
      {/* Top row: Status / Realtime indicator + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252D38] pb-2.5">
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          {/* WebSocket Realtime indicator */}
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
              isWsConnected
                ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                : 'bg-[#64748B]/10 border-[#64748B]/30 text-[#64748B]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isWsConnected ? 'bg-[#22C55E] animate-ping' : 'bg-[#64748B]'
              }`}
            />
            {isWsConnected ? 'LIVE STREAM' : 'OFFLINE'}
          </span>

          {/* Last sync time */}
          <span className="text-[#94A3B8] hidden sm:inline">
            Última actualización:{' '}
            <strong className="text-[#F1F5F9]">
              {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'N/D'}
            </strong>
          </span>
        </div>

        {/* Refresh & Auto Refresh selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#94A3B8]">
            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden md:inline">Auto Refresh:</span>
            <select
              value={autoRefreshSec}
              onChange={(e) => onSelectAutoRefresh(Number(e.target.value))}
              className="bg-[#151B23] text-[#F1F5F9] border border-[#252D38] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#06B6D4]"
            >
              <option value={0}>Desactivado</option>
              <option value={30}>30 segundos</option>
              <option value={60}>1 minuto</option>
              <option value={300}>5 minutos</option>
            </select>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Bottom row: Filter selectors */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mr-1">
            <Filter className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span className="font-semibold text-[#F1F5F9]">Filtros:</span>
          </div>

          {/* Group Filter */}
          <div className="flex items-center">
            <select
              value={selectedGroup || 'all'}
              onChange={(e) => onSelectGroup(e.target.value === 'all' ? null : e.target.value)}
              className="bg-[#151B23] text-[#F1F5F9] border border-[#252D38] rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="all">📁 Todos los Grupos</option>
              {availableGroups.map((grp) => (
                <option key={grp} value={grp}>
                  📁 {grp}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center">
            <select
              value={selectedLocation || 'all'}
              onChange={(e) => onSelectLocation(e.target.value === 'all' ? null : e.target.value)}
              className="bg-[#151B23] text-[#F1F5F9] border border-[#252D38] rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="all">📍 Todas las Ubicaciones</option>
              {availableLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  📍 {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center">
            <select
              value={selectedStatus || 'all'}
              onChange={(e) => onSelectStatus(e.target.value === 'all' ? null : (e.target.value as MachineStatus))}
              className="bg-[#151B23] text-[#F1F5F9] border border-[#252D38] rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="all">⚡ Todos los Estados</option>
              <option value="ONLINE">🟢 Online</option>
              <option value="WARNING">🟠 Warning</option>
              <option value="OFFLINE">🔴 Offline</option>
              <option value="UNCHECKED">⚪ Sin comprobar</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="text-xs text-[#06B6D4] hover:underline flex items-center gap-1 font-mono"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar Filtros</span>
          </button>
        )}
      </div>

      {/* Tags Chips Bar */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#252D38]/60">
          <div className="flex items-center gap-1 text-[11px] text-[#64748B] mr-1">
            <TagIcon className="w-3 h-3 text-pink-400" />
            <span>Tags:</span>
          </div>

          <button
            onClick={() => onSelectTag(null)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
              !selectedTag
                ? 'bg-[#06B6D4] text-[#0B0F14] font-bold shadow'
                : 'bg-[#151B23] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#252D38]'
            }`}
          >
            Todos
          </button>

          {availableTags.map((t) => {
            const isSelected = selectedTag === t.name;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTag(isSelected ? null : t.name)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'ring-1 ring-white text-[#F1F5F9] font-bold shadow-sm'
                    : 'opacity-75 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: `${t.color}20`,
                  color: t.color,
                  borderColor: `${t.color}40`,
                  borderWidth: 1,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span>{t.name}</span>
                {t._count && <span className="text-[9px] opacity-70">({t._count.machines})</span>}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};
