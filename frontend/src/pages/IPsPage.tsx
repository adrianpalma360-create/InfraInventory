import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { IPAddress, Machine, Network } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import {
  Binary,
  Search,
  Plus,
  Server,
  Network as NetworkIcon,
  Trash2,
  Edit2,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface IPsPageProps {
  onSelectMachine?: (id: string) => void;
}

export const IPsPage: React.FC<IPsPageProps> = ({ onSelectMachine }) => {
  const toast = useToast();
  const [ips, setIps] = useState<IPAddress[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetworkFilter, setSelectedNetworkFilter] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIp, setEditingIp] = useState<IPAddress | null>(null);
  const [ipValue, setIpValue] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedNetworkId, setSelectedNetworkId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [ipToDelete, setIpToDelete] = useState<IPAddress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ipsData, machinesRes, networksData] = await Promise.all([
        api.getIPs(),
        api.getMachines({ limit: 100 }),
        api.getNetworks(),
      ]);
      setIps(ipsData || []);
      setMachines(machinesRes.items || []);
      setNetworks(networksData || []);
    } catch (err: any) {
      toast.error('Error al cargar direccionamiento IP', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingIp(null);
    setIpValue('');
    setSelectedMachineId('');
    setSelectedNetworkId('');
    setIsPrimary(false);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: IPAddress) => {
    setEditingIp(item);
    setIpValue(item.ip);
    setSelectedMachineId(item.machineId || '');
    setSelectedNetworkId(item.networkId || '');
    setIsPrimary(item.isPrimary);
    setDescription(item.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipValue.trim()) {
      toast.warning('Campo requerido', 'Debes ingresar una dirección IPv4 válida.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<IPAddress> = {
        ip: ipValue.trim(),
        machineId: selectedMachineId || undefined,
        networkId: selectedNetworkId || undefined,
        isPrimary,
        description: description.trim() || undefined,
      };

      if (editingIp) {
        await api.updateIP(editingIp.id, payload);
        toast.success('IP actualizada', `La dirección ${payload.ip} ha sido modificada.`);
      } else {
        await api.createIP(payload);
        toast.success('IP registrada', `La dirección ${payload.ip} ha sido creada correctamente.`);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar IP', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!ipToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteIP(ipToDelete.id);
      toast.success('IP eliminada', `La dirección ${ipToDelete.ip} ha sido removida.`);
      setIpToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar IP', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered IP items
  const filteredIps = ips.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      item.ip.toLowerCase().includes(q) ||
      (item.machine?.hostname && item.machine.hostname.toLowerCase().includes(q)) ||
      (item.network?.name && item.network.name.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q));

    const matchesNetwork = !selectedNetworkFilter || item.networkId === selectedNetworkFilter;

    return matchesQuery && matchesNetwork;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <Binary className="w-5 h-5 text-[#06B6D4]" />
            Gestión de Direccionamiento IP (IPAM)
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Control centralizado de direcciones IPv4, mapeo de hosts, asignación de interfaces y subredes
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

          <Can permission="NETWORK_CREATE">
            <Button
              variant="cyan"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAdd}
            >
              + Registrar IP
            </Button>
          </Can>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 border-l-2 border-l-[#06B6D4] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Total IPs Registradas</div>
          <div className="text-2xl font-bold font-mono text-[#F1F5F9] mt-2">{ips.length}</div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#22C55E] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">IPs Principales (Primary)</div>
          <div className="text-2xl font-bold font-mono text-[#22C55E] mt-2">
            {ips.filter((i) => i.isPrimary).length}
          </div>
        </Card>

        <Card className="p-4 border-l-2 border-l-[#3B82F6] bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Asignadas a Máquinas</div>
          <div className="text-2xl font-bold font-mono text-[#3B82F6] mt-2">
            {ips.filter((i) => i.machineId).length}
          </div>
        </Card>

        <Card className="p-4 border-l-2 border-l-purple-500 bg-[#0F141B]">
          <div className="text-xs font-semibold text-[#94A3B8] uppercase">Subredes Activas</div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-2">{networks.length}</div>
        </Card>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="p-4 bg-[#0F141B] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por IP, Hostname, Subred o Descripción..."
            className="w-full bg-[#151B23] border border-[#252D38] rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedNetworkFilter}
            onChange={(e) => setSelectedNetworkFilter(e.target.value)}
            className="bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
          >
            <option value="">Todas las Redes</option>
            {networks.map((net) => (
              <option key={net.id} value={net.id}>
                {net.name} ({net.cidr})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Main IP Addresses Table */}
      <Card className="p-0 overflow-hidden bg-[#0F141B]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151B23] text-[#94A3B8] uppercase font-semibold border-b border-[#252D38]">
              <tr>
                <th className="py-3 px-4">Dirección IP</th>
                <th className="py-3 px-4">Tipo / Rol</th>
                <th className="py-3 px-4">Máquina / Host</th>
                <th className="py-3 px-4">Red & Subred</th>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252D38]/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={6} className="py-3 px-4">
                      <Skeleton className="h-6 w-full rounded" />
                    </td>
                  </tr>
                ))
              ) : filteredIps.length > 0 ? (
                filteredIps.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1A212B]/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-[#06B6D4] text-sm flex items-center gap-1.5">
                        <Binary className="w-3.5 h-3.5 text-[#64748B]" />
                        {item.ip}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.isPrimary ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          PRIMARY IP
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#94A3B8] bg-[#151B23] border border-[#252D38]">
                          SECUNDARIA
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.machine ? (
                        <div className="flex items-center gap-2">
                          <Server className="w-3.5 h-3.5 text-[#3B82F6]" />
                          <button
                            onClick={() => onSelectMachine && onSelectMachine(item.machine!.id)}
                            className="font-semibold text-[#F1F5F9] hover:text-[#06B6D4] hover:underline transition-colors flex items-center gap-1"
                          >
                            {item.machine.hostname}
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#64748B] italic">Sin host asignado</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.network ? (
                        <div className="flex items-center gap-1.5 text-[#94A3B8]">
                          <NetworkIcon className="w-3.5 h-3.5 text-purple-400" />
                          <span>{item.network.name}</span>
                          <span className="font-mono text-[10px] text-[#64748B]">({item.network.cidr})</span>
                        </div>
                      ) : (
                        <span className="text-[#64748B]">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#94A3B8] max-w-xs truncate">
                      {item.description || '-'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Can permission="NETWORK_UPDATE">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Editar IP"
                            className="p-1.5 rounded text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>

                        <Can permission="NETWORK_DELETE">
                          <button
                            onClick={() => setIpToDelete(item)}
                            title="Eliminar IP"
                            className="p-1.5 rounded text-[#EF4444] hover:text-[#EF4444] hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#64748B]">
                    No se encontraron direcciones IP que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit IP Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIp ? 'Editar Dirección IP' : 'Registrar Nueva Dirección IP'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#F1F5F9] mb-1">
              Dirección IPv4 <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="ej. 192.168.1.150"
              value={ipValue}
              onChange={(e) => setIpValue(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium text-[#F1F5F9] mb-1">Máquina / Host Asignado</label>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
            >
              <option value="">-- Sin máquina asignada --</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.hostname} ({m.primaryIp || 'Sin IP'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#F1F5F9] mb-1">Red / VLAN</label>
            <select
              value={selectedNetworkId}
              onChange={(e) => setSelectedNetworkId(e.target.value)}
              className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
            >
              <option value="">-- Sin red asignada --</option>
              {networks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.cidr})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPrimaryCheck"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-[#252D38] bg-[#151B23] text-[#06B6D4] focus:ring-0"
            />
            <label htmlFor="isPrimaryCheck" className="text-[#F1F5F9] font-medium cursor-pointer">
              Establecer como IP Principal del host
            </label>
          </div>

          <div>
            <label className="block font-medium text-[#F1F5F9] mb-1">Descripción / Notas</label>
            <Input
              type="text"
              placeholder="ej. IP dedicada para API gateway / DMZ"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#252D38]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="cyan" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingIp ? 'Guardar Cambios' : 'Registrar IP'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!ipToDelete}
        onClose={() => setIpToDelete(null)}
        title="Confirmar Eliminación de IP"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#94A3B8]">
            ¿Estás seguro de que deseas eliminar la dirección IP{' '}
            <strong className="text-[#F1F5F9] font-mono">{ipToDelete?.ip}</strong>?
            {ipToDelete?.machine && (
              <span className="block mt-1 text-rose-400">
                Esta IP está asignada a la máquina <strong>{ipToDelete.machine.hostname}</strong>.
              </span>
            )}
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#252D38]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIpToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar IP'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
