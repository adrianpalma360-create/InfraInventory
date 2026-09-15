import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { MachineGroupSummary, Machine } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { StatusBadge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import {
  FolderTree,
  Server,
  LineChart,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Edit,
} from 'lucide-react';

interface GroupsPageProps {
  onSelectMachine: (id: string) => void;
  onNavigateToGraphs: () => void;
}

export const GroupsPage: React.FC<GroupsPageProps> = ({
  onSelectMachine,
  onNavigateToGraphs,
}) => {
  const toast = useToast();
  const [groups, setGroups] = useState<MachineGroupSummary[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Reassign Modal
  const [machineToReassign, setMachineToReassign] = useState<Machine | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [groupsData, machinesRes] = await Promise.all([
        api.getGroups(),
        api.getMachines({ limit: 100 }),
      ]);
      setGroups(groupsData || []);
      setMachines(machinesRes.items || []);
      if (!selectedGroup && groupsData && groupsData.length > 0) {
        setSelectedGroup(groupsData[0].name);
      }
    } catch (err: any) {
      toast.error('Error al cargar grupos de infraestructura', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenReassign = (m: Machine) => {
    setMachineToReassign(m);
    setNewGroupName(m.group || 'Servidores');
  };

  const handleSaveReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineToReassign || !newGroupName.trim()) return;

    setIsSubmitting(true);
    try {
      await api.updateMachine(machineToReassign.id, {
        group: newGroupName.trim(),
      });
      toast.success(
        'Grupo actualizado',
        `La máquina ${machineToReassign.hostname} ha sido asignada al grupo "${newGroupName.trim()}".`
      );
      setMachineToReassign(null);
      loadData();
    } catch (err: any) {
      toast.error('Error al reasignar grupo', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMachines = machines.filter((m) => {
    const matchesGroup = !selectedGroup || (m.group || 'Sin Grupo') === selectedGroup;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      m.hostname.toLowerCase().includes(q) ||
      (m.primaryIp && m.primaryIp.toLowerCase().includes(q)) ||
      (m.os && m.os.toLowerCase().includes(q));

    return matchesGroup && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-purple-400" />
            Gestión de Grupos de Hosts
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Organización de servidores por rol, ubicación lógica, dominios y métricas agregadas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={loadData}
          >
            Actualizar
          </Button>

          <Button
            variant="cyan"
            size="sm"
            icon={<LineChart className="w-4 h-4" />}
            onClick={onNavigateToGraphs}
          >
            Ver en Gráficos &rarr;
          </Button>
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : groups.length > 0 ? (
          groups.map((grp) => {
            const isSelected = selectedGroup === grp.name;
            return (
              <div
                key={grp.name}
                onClick={() => setSelectedGroup(grp.name)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#151B23] border-[#06B6D4] ring-1 ring-[#06B6D4]/30 shadow-lg shadow-cyan-500/5'
                    : 'bg-[#0F141B] border-[#252D38] hover:border-[#3B82F6]/50 hover:bg-[#151B23]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className={`w-4 h-4 ${isSelected ? 'text-[#06B6D4]' : 'text-purple-400'}`} />
                    <span className="font-bold text-sm text-[#F1F5F9]">{grp.name}</span>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1A212B] text-[#94A3B8] border border-[#252D38]">
                    {grp.totalMachines} {grp.totalMachines === 1 ? 'host' : 'hosts'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#252D38]/60 text-[11px] font-mono">
                  <div>
                    <div className="text-[#64748B] text-[10px] uppercase">Online</div>
                    <div className="text-[#22C55E] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {grp.onlineCount}
                    </div>
                  </div>

                  <div>
                    <div className="text-[#64748B] text-[10px] uppercase">Offline</div>
                    <div className="text-[#EF4444] font-bold flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      {grp.offlineCount}
                    </div>
                  </div>

                  <div>
                    <div className="text-[#64748B] text-[10px] uppercase">Avg CPU</div>
                    <div className="text-[#06B6D4] font-bold">
                      {grp.avgCpu !== null ? `${grp.avgCpu}%` : 'N/D'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-4 p-8 text-center bg-[#0F141B] border border-[#252D38] rounded-xl text-[#64748B]">
            No hay grupos configurados aún. Las máquinas registradas recibirán el grupo "Servidores" por defecto.
          </div>
        )}
      </div>

      {/* Selected Group Machines List */}
      <Card className="p-0 overflow-hidden bg-[#0F141B]">
        <div className="p-4 border-b border-[#252D38] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#151B23]/40">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#06B6D4]" />
            <h3 className="text-sm font-bold text-[#F1F5F9]">
              Máquinas en el Grupo: <span className="text-[#06B6D4] font-mono">{selectedGroup || 'Todos'}</span>
            </h3>
            <span className="text-xs text-[#64748B] font-mono">({filteredMachines.length} hosts)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por hostname o IP..."
              className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg pl-8 pr-3 py-1 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151B23] text-[#94A3B8] uppercase font-semibold border-b border-[#252D38]">
              <tr>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Hostname</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">IP Principal</th>
                <th className="py-3 px-4">Sistema Operativo</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252D38]/60">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-3 px-4">
                      <Skeleton className="h-6 w-full rounded" />
                    </td>
                  </tr>
                ))
              ) : filteredMachines.length > 0 ? (
                filteredMachines.map((m) => (
                  <tr key={m.id} className="hover:bg-[#1A212B]/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={m.status} />
                    </td>

                    <td className="py-3 px-4 font-semibold text-[#F1F5F9] whitespace-nowrap">
                      <button
                        onClick={() => onSelectMachine(m.id)}
                        className="hover:text-[#06B6D4] hover:underline transition-colors text-left flex items-center gap-1.5"
                      >
                        {m.hostname}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap">
                      {m.type.replace('_', ' ')}
                    </td>

                    <td className="py-3 px-4 font-mono text-[#06B6D4] whitespace-nowrap">
                      {m.primaryIp || '-'}
                    </td>

                    <td className="py-3 px-4 text-[#94A3B8] max-w-[150px] truncate">
                      {m.os || '-'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Can permission="MACHINE_UPDATE">
                          <button
                            onClick={() => handleOpenReassign(m)}
                            className="px-2 py-1 rounded text-[11px] font-medium bg-[#151B23] hover:bg-[#252D38] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#252D38] transition-colors flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Cambiar Grupo
                          </button>
                        </Can>

                        <button
                          onClick={() => onSelectMachine(m.id)}
                          className="px-2 py-1 rounded text-[11px] font-medium bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30 transition-colors flex items-center gap-1"
                        >
                          Ver Host &rarr;
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#64748B]">
                    No hay máquinas asignadas a este grupo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reassign Group Modal */}
      <Modal
        isOpen={!!machineToReassign}
        onClose={() => setMachineToReassign(null)}
        title="Reasignar Grupo de Host"
      >
        <form onSubmit={handleSaveReassign} className="space-y-4 text-xs">
          <p className="text-[#94A3B8]">
            Selecciona o escribe el nuevo grupo para{' '}
            <strong className="text-[#F1F5F9]">{machineToReassign?.hostname}</strong>:
          </p>

          <div>
            <label className="block font-medium text-[#F1F5F9] mb-1">Nombre del Grupo</label>
            <Input
              type="text"
              placeholder="ej. Servidores, Domótica, DMZ, Base de Datos..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {['Servidores', 'Domótica', 'Switches', 'Firewalls', 'Bases de Datos', 'Workstations'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setNewGroupName(preset)}
                className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                  newGroupName === preset
                    ? 'bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/40'
                    : 'bg-[#151B23] text-[#94A3B8] border-[#252D38] hover:text-[#F1F5F9]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#252D38]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMachineToReassign(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="cyan" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Asignar Grupo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
