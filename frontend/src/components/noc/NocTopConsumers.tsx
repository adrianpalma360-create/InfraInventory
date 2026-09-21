import React from 'react';
import { Card } from '../ui/Card.js';
import { TopResourceConsumer } from '../../types/index.js';
import { Cpu, Activity, HardDrive } from 'lucide-react';

interface NocTopConsumersProps {
  topResources: {
    cpu: TopResourceConsumer[];
    ram: TopResourceConsumer[];
    disk: TopResourceConsumer[];
  };
  onNavigateToMachineDetail: (id: string) => void;
}

export const NocTopConsumers: React.FC<NocTopConsumersProps> = ({
  topResources,
  onNavigateToMachineDetail,
}) => {
  const getProgressColor = (val: number) => {
    if (val >= 90) return 'bg-[#EF4444] text-[#EF4444]';
    if (val >= 80) return 'bg-[#F59E0B] text-[#F59E0B]';
    return 'bg-[#22C55E] text-[#22C55E]';
  };

  const renderConsumerColumn = (
    title: string,
    icon: React.ReactNode,
    items: TopResourceConsumer[]
  ) => {
    return (
      <Card className="p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-[#252D38] pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">{title}</span>
            </div>
            <span className="text-[10px] font-mono text-[#64748B]">Top 5</span>
          </div>

          <div className="space-y-2.5">
            {items.length > 0 ? (
              items.map((item, idx) => {
                const colors = getProgressColor(item.value);
                const bg = colors.split(' ')[0];
                const text = colors.split(' ')[1];

                return (
                  <div
                    key={item.machineId}
                    onClick={() => onNavigateToMachineDetail(item.machineId)}
                    className="p-2 rounded-lg bg-[#0B0F14] hover:bg-[#151B23] border border-[#252D38] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] text-[#64748B] w-4 font-bold">{idx + 1}.</span>
                        <span className="font-semibold text-[#F1F5F9] group-hover:text-[#06B6D4] truncate">
                          {item.hostname}
                        </span>
                      </div>
                      <span className={`font-bold ml-2 ${text}`}>{item.value}%</span>
                    </div>

                    <div className="w-full bg-[#151B23] h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${bg}`}
                        style={{ width: `${Math.min(100, item.value)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-[11px] text-[#64748B]">
                Sin telemetría reportada para esta métrica.
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      {renderConsumerColumn(
        'Top Consumo CPU',
        <Cpu className="w-4 h-4 text-[#3B82F6]" />,
        topResources.cpu
      )}
      {renderConsumerColumn(
        'Top Consumo RAM',
        <Activity className="w-4 h-4 text-[#06B6D4]" />,
        topResources.ram
      )}
      {renderConsumerColumn(
        'Top Consumo Disco',
        <HardDrive className="w-4 h-4 text-purple-400" />,
        topResources.disk
      )}
    </div>
  );
};
