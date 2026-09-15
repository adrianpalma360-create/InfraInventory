import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Port, Service, Machine, PortProtocol, PortState } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { PortStateBadge } from '../components/ui/Badge.js';
import { TableSkeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import { Cpu, Plus, Trash2, Edit2, Search, RefreshCw } from 'lucide-react';

export const PortsPage: React.FC = () => {
  const toast = useToast();
  const [ports, setPorts] = useState<Port[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // Port Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<Port | null>(null);
  const [formData, setFormData] = useState({
    machineId: '',
    portNumber: 80,
    protocol: 'TCP' as PortProtocol,
    state: 'OPEN' as PortState,
    serviceId: '',
    description: '',
  });

  const [deleteTarget, setDeleteTarget] = useState<Port | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [portList, serviceList, machineResult] = await Promise.all([
        api.getPorts(),
        api.getServices(),
        api.getMachines({ limit: 100 }),
      ]);
      setPorts(portList);
      setServices(serviceList);
      setMachines(machineResult.items);
    } catch (err: any) {
      toast.error('Error al cargar puertos', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.machineId || formData.portNumber < 1 || formData.portNumber > 65535) {
      toast.error('Selecciona una máquina y un puerto válido (1-65535)');
      return;
    }

    try {
      const payload = {
        machineId: formData.machineId,
        portNumber: Number(formData.portNumber),
        protocol: formData.protocol,
        state: formData.state,
        serviceId: formData.serviceId || null,
        description: formData.description || null,
      };

      if (editingPort) {
        await api.updatePort(editingPort.id, payload);
        toast.success('Puerto actualizado', `Puerto ${payload.portNumber}/${payload.protocol} modificado`);
      } else {
        await api.createPort(payload);
        toast.success('Puerto registrado', `Puerto ${payload.portNumber}/${payload.protocol} añadido`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar puerto', err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deletePort(deleteTarget.id);
      toast.success('Puerto eliminado');
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar', err.message);
    }
  };

  const filteredPorts = ports.filter((p) => {
    const matchesSearch =
      !search ||
      p.portNumber.toString().includes(search) ||
      p.machine?.hostname.toLowerCase().includes(search.toLowerCase()) ||
      p.service?.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

    const matchesProtocol = !protocolFilter || p.protocol === protocolFilter;
    const matchesState = !stateFilter || p.state === stateFilter;

    return matchesSearch && matchesProtocol && matchesState;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-[#22C55E]" />
            Matriz de Puertos & Firewall
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Mapeo global de puertos de escucha, protocolos y servicios en todas las máquinas
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadData}>
            Refrescar
          </Button>
          <Can permission="PORT_CREATE">
            <Button
              variant="cyan"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingPort(null);
                setFormData({
                  machineId: machines[0]?.id || '',
                  portNumber: 80,
                  protocol: 'TCP',
                  state: 'OPEN',
                  serviceId: '',
                  description: '',
                });
                setIsModalOpen(true);
              }}
            >
              + Registrar Puerto
            </Button>
          </Can>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por puerto, máquina o servicio..."
              className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22C55E]"
            />
          </div>

          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22C55E] cursor-pointer"
          >
            <option value="">Todos los Protocolos (TCP/UDP)</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22C55E] cursor-pointer"
          >
            <option value="">Todos los Estados</option>
            <option value="OPEN">OPEN (Abierto)</option>
            <option value="FILTERED">FILTERED (Filtrado)</option>
            <option value="CLOSED">CLOSED (Cerrado)</option>
          </select>
        </div>
      </Card>

      {/* Ports Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : filteredPorts.length === 0 ? (
          <div className="text-center py-16 text-[#64748B] text-xs">
            No se encontraron registros de puertos con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F141B] text-[#94A3B8] border-b border-[#252D38] uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Puerto</th>
                  <th className="py-3 px-4">Protocolo</th>
                  <th className="py-3 px-4">Máquina Asociada</th>
                  <th className="py-3 px-4">IP Máquina</th>
                  <th className="py-3 px-4">Servicio Asignado</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D38]/60">
                {filteredPorts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1A212B]/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#F1F5F9] text-sm">
                      {p.portNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#3B82F6]">{p.protocol}</td>
                    <td className="py-3 px-4 font-semibold text-[#F1F5F9]">
                      {p.machine?.hostname || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#06B6D4]">
                      {p.machine?.primaryIp || '-'}
                    </td>
                    <td className="py-3 px-4 text-[#06B6D4] font-medium">
                      {p.service?.name || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <PortStateBadge state={p.state} />
                    </td>
                    <td className="py-3 px-4 text-[#94A3B8] truncate max-w-[200px]">
                      {p.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Can permission="PORT_UPDATE">
                          <button
                            onClick={() => {
                              setEditingPort(p);
                              setFormData({
                                machineId: p.machineId,
                                portNumber: p.portNumber,
                                protocol: p.protocol,
                                state: p.state,
                                serviceId: p.serviceId || '',
                                description: p.description || '',
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#3B82F6]"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                        <Can permission="PORT_DELETE">
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#EF4444]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Port Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPort ? `Editar Puerto: ${editingPort.portNumber}` : 'Registrar Nuevo Puerto'}
        maxWidth="md"
      >
        <form onSubmit={handleSavePort} className="space-y-4">
          <Select
            label="Máquina Destino"
            required
            value={formData.machineId}
            onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
            options={machines.map((m) => ({
              value: m.id,
              label: `${m.hostname} (${m.primaryIp || 'Sin IP'})`,
            }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número de Puerto"
              type="number"
              required
              min={1}
              max={65535}
              value={formData.portNumber}
              onChange={(e) => setFormData({ ...formData, portNumber: Number(e.target.value) })}
            />
            <Select
              label="Protocolo"
              value={formData.protocol}
              onChange={(e) => setFormData({ ...formData, protocol: e.target.value as PortProtocol })}
              options={[
                { value: 'TCP', label: 'TCP' },
                { value: 'UDP', label: 'UDP' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Servicio Asignado"
              value={formData.serviceId}
              onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
              options={[
                { value: '', label: 'Ninguno / Personalizado' },
                ...services.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <Select
              label="Estado"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value as PortState })}
              options={[
                { value: 'OPEN', label: 'OPEN' },
                { value: 'CLOSED', label: 'CLOSED' },
                { value: 'FILTERED', label: 'FILTERED' },
              ]}
            />
          </div>

          <Input
            label="Descripción / Observaciones"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Comentario técnico"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[#252D38]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Puerto
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Puerto"
        message={`¿Estás seguro de eliminar el puerto ${deleteTarget?.portNumber}/${deleteTarget?.protocol}?`}
        isDestructive
      />
    </div>
  );
};
