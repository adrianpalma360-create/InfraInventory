import React from 'react';
import { Card } from '../ui/Card.js';
import { NocActivityItem } from '../../types/index.js';
import { History, ArrowRight, Radar, Bell } from 'lucide-react';

interface NocActivityTimelineProps {
  activity: NocActivityItem[];
  onNavigateToChanges?: () => void;
  onNavigateToMachineDetail?: (id: string) => void;
}

export const NocActivityTimeline: React.FC<NocActivityTimelineProps> = ({
  activity,
  onNavigateToChanges,
  onNavigateToMachineDetail,
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ALERT':
        return <Bell className="w-3.5 h-3.5 text-[#EF4444]" />;
      case 'DISCOVERY':
        return <Radar className="w-3.5 h-3.5 text-[#06B6D4]" />;
      case 'CHANGE':
      default:
        return <History className="w-3.5 h-3.5 text-[#3B82F6]" />;
    }
  };

  const getBulletColor = (type: string, severity?: string) => {
    if (severity === 'CRITICAL') return 'bg-[#EF4444]';
    if (severity === 'WARNING') return 'bg-[#F59E0B]';
    if (type === 'DISCOVERY') return 'bg-[#06B6D4]';
    if (type === 'ALERT') return 'bg-[#EF4444]';
    return 'bg-[#3B82F6]';
  };

  return (
    <Card className="p-0 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-[#252D38] flex items-center justify-between bg-[#0B0F14]/50">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#F59E0B]" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
              Línea de Tiempo & Actividad Reciente
            </h3>
            <span className="text-[10px] text-[#94A3B8]">Auditoría, Discovery y Alertas en tiempo real</span>
          </div>
        </div>
        {onNavigateToChanges && (
          <button
            onClick={onNavigateToChanges}
            className="text-xs text-[#F59E0B] hover:underline flex items-center gap-1 font-mono"
          >
            <span>Ver Historial</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="p-4 flex-1 overflow-y-auto max-h-[380px] space-y-3.5">
        {activity.length > 0 ? (
          activity.map((item) => (
            <div
              key={item.id}
              onClick={() => item.machineId && onNavigateToMachineDetail && onNavigateToMachineDetail(item.machineId)}
              className={`flex gap-3 text-xs ${item.machineId ? 'cursor-pointer group' : ''}`}
            >
              <div className="flex flex-col items-center">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getBulletColor(item.type, item.severity)}`} />
                <span className="w-px flex-1 bg-[#252D38] my-1" />
              </div>

              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {getActivityIcon(item.type)}
                    <span className="font-bold text-[#F1F5F9] group-hover:text-[#06B6D4] transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-[11px] text-[#94A3B8] mt-1 leading-snug line-clamp-2">
                  {item.details}
                </p>

                <div className="flex items-center gap-2 mt-1 text-[10px] text-[#64748B] font-mono">
                  <span>👤 {item.user}</span>
                  {item.hostname && (
                    <>
                      <span>•</span>
                      <span className="text-[#06B6D4]">Host: {item.hostname}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-[#64748B] text-xs">
            Sin eventos de actividad recientes.
          </div>
        )}
      </div>
    </Card>
  );
};
