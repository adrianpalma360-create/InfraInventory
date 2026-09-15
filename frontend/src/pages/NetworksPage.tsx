import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Network, VLAN } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { TableSkeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import { Network as NetworkIcon, Plus, Trash2, Edit2, Shield, Layers, RefreshCw } from 'lucide-react';

export const NetworksPage: React.FC = () => {
  const toast = useToast();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [vlans, setVlans] = useState<VLAN[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Network Modal
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  const [networkForm, setNetworkForm] = useState({
    name: '',
    cidr: '',
    gateway: '',
    dns: '',
    description: '',
  });

  // VLAN Modal
  const [isVlanModalOpen, setIsVlanModalOpen] = useState(false);
  const [editingVlan, setEditingVlan] = useState<VLAN | null>(null);
  const [vlanForm, setVlanForm] = useState({
    vlanId: 10,
    name: '',
    description: '',
    networkId: '',
  });

  // Delete targets
  const [deleteNetworkTarget, setDeleteNetworkTarget] = useState<Network | null>(null);
  const [deleteVlanTarget, setDeleteVlanTarget] = useState<VLAN | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [netList, vlanList] = await Promise.all([
        api.getNetworks(),
        api.getVlans(),
      ]);
      setNetworks(netList);
      setVlans(vlanList);
    } catch (err: any) {
      toast.error('Error al cargar datos de red', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!networkForm.name || !networkForm.cidr) {
      toast.error('Nombre y CIDR son obligatorios');
      return;
    }

    try {
      if (editingNetwork) {
        await api.updateNetwork(editingNetwork.id, networkForm);
        toast.success('Red actualizada', `Se guardó ${networkForm.name}`);
      } else {
        await api.createNetwork(networkForm);
        toast.success('Red creada', `Se añadió la red ${networkForm.cidr}`);
      }
      setIsNetworkModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar red', err.message);
    }
  };

  const handleSaveVlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vlanForm.name || vlanForm.vlanId < 1) {
      toast.error('Nombre y VLAN ID válido son obligatorios');
      return;
    }

    try {
      const payload = {
        ...vlanForm,
        vlanId: Number(vlanForm.vlanId),
        networkId: vlanForm.networkId || null,
      };

      if (editingVlan) {
        await api.updateVlan(editingVlan.id, payload);
        toast.success('VLAN actualizada', `Se modificó la VLAN ${payload.vlanId}`);
      } else {
        await api.createVlan(payload);
        toast.success('VLAN creada', `Se registró la VLAN ${payload.vlanId}`);
      }
      setIsVlanModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar VLAN', err.message);
    }
  };

  const handleDeleteNetwork = async () => {
    if (!deleteNetworkTarget) return;
    try {
      await api.deleteNetwork(deleteNetworkTarget.id);
      toast.success('Red eliminada');
      setDeleteNetworkTarget(null);
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar', err.message);
    }
  };

  const handleDeleteVlan = async () => {
    if (!deleteVlanTarget) return;
    try {
      await api.deleteVlan(deleteVlanTarget.id);
      toast.success('VLAN eliminada');
      setDeleteVlanTarget(null);
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar', err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <NetworkIcon className="w-5 h-5 text-[#06B6D4]" />
            Segmentación de Redes & VLANs
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Gestión de rangos CIDR, puertas de enlace, pools de IPs y segmentación L2/L3
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadData}>
            Refrescar
          </Button>
          <Can permission="NETWORK_CREATE">
            <Button
              variant="cyan"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingNetwork(null);
                setNetworkForm({ name: '', cidr: '', gateway: '', dns: '', description: '' });
                setIsNetworkModalOpen(true);
              }}
            >
              + Nueva Red (CIDR)
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingVlan(null);
                setVlanForm({ vlanId: 10, name: '', description: '', networkId: networks[0]?.id || '' });
                setIsVlanModalOpen(true);
              }}
            >
              + Nueva VLAN
            </Button>
          </Can>
        </div>
      </div>

      {/* Networks Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#3B82F6]" />
          Rangos de Red Principales
        </h2>
        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={3} cols={6} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F141B] text-[#94A3B8] border-b border-[#252D38] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Nombre de Red</th>
                    <th className="py-3 px-4">Rango CIDR</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4">DNS</th>
                    <th className="py-3 px-4">VLANs</th>
                    <th className="py-3 px-4">IPs Registradas</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {networks.map((net) => (
                    <tr key={net.id} className="hover:bg-[#1A212B]/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#F1F5F9]">
                        {net.name}
                        {net.description && (
                          <span className="block text-[11px] text-[#64748B] font-normal">
                            {net.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#06B6D4]">{net.cidr}</td>
                      <td className="py-3 px-4 font-mono text-[#94A3B8]">{net.gateway || '-'}</td>
                      <td className="py-3 px-4 font-mono text-[#94A3B8]">{net.dns || '-'}</td>
                      <td className="py-3 px-4 text-[#94A3B8] font-mono">
                        {net.vlans?.length || 0}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#3B82F6]">
                        {net.ipAddresses?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Can permission="NETWORK_UPDATE">
                            <button
                              onClick={() => {
                                setEditingNetwork(net);
                                setNetworkForm({
                                  name: net.name,
                                  cidr: net.cidr,
                                  gateway: net.gateway || '',
                                  dns: net.dns || '',
                                  description: net.description || '',
                                });
                                setIsNetworkModalOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#3B82F6]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </Can>
                          <Can permission="NETWORK_DELETE">
                            <button
                              onClick={() => setDeleteNetworkTarget(net)}
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
      </div>

      {/* VLANs Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          Segmentación VLAN (IEEE 802.1Q)
        </h2>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F141B] text-[#94A3B8] border-b border-[#252D38] uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">VLAN ID</th>
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Red Asociada</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4">Máquinas Conectadas</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D38]/60">
                {vlans.map((v) => (
                  <tr key={v.id} className="hover:bg-[#1A212B]/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-400 text-sm">
                      {v.vlanId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#F1F5F9]">{v.name}</td>
                    <td className="py-3 px-4 font-mono text-[#06B6D4]">
                      {v.network ? `${v.network.name} (${v.network.cidr})` : '-'}
                    </td>
                    <td className="py-3 px-4 text-[#94A3B8]">{v.description || '-'}</td>
                    <td className="py-3 px-4 font-mono text-[#3B82F6]">
                      {v.machines?.length || 0} máquinas
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingVlan(v);
                            setVlanForm({
                              vlanId: v.vlanId,
                              name: v.name,
                              description: v.description || '',
                              networkId: v.networkId || '',
                            });
                            setIsVlanModalOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#3B82F6]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteVlanTarget(v)}
                          className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#EF4444]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Network Modal */}
      <Modal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        title={editingNetwork ? `Editar Red: ${editingNetwork.name}` : 'Añadir Nueva Red CIDR'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveNetwork} className="space-y-4">
          <Input
            label="Nombre Descriptivo"
            required
            value={networkForm.name}
            onChange={(e) => setNetworkForm({ ...networkForm, name: e.target.value })}
            placeholder="LAN CPD / DMZ Servidores"
          />
          <Input
            label="Rango CIDR"
            required
            value={networkForm.cidr}
            onChange={(e) => setNetworkForm({ ...networkForm, cidr: e.target.value })}
            placeholder="192.168.1.0/24"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Gateway Predeterminado"
              value={networkForm.gateway}
              onChange={(e) => setNetworkForm({ ...networkForm, gateway: e.target.value })}
              placeholder="192.168.1.1"
            />
            <Input
              label="DNS"
              value={networkForm.dns}
              onChange={(e) => setNetworkForm({ ...networkForm, dns: e.target.value })}
              placeholder="1.1.1.1, 8.8.8.8"
            />
          </div>
          <Input
            label="Descripción"
            value={networkForm.description}
            onChange={(e) => setNetworkForm({ ...networkForm, description: e.target.value })}
            placeholder="Red corporativa principal"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-[#252D38]">
            <Button type="button" variant="ghost" onClick={() => setIsNetworkModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Red
            </Button>
          </div>
        </form>
      </Modal>

      {/* VLAN Modal */}
      <Modal
        isOpen={isVlanModalOpen}
        onClose={() => setIsVlanModalOpen(false)}
        title={editingVlan ? `Editar VLAN: ${editingVlan.vlanId}` : 'Añadir Nueva VLAN'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveVlan} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="VLAN ID (1-4094)"
              type="number"
              required
              min={1}
              max={4094}
              value={vlanForm.vlanId}
              onChange={(e) => setVlanForm({ ...vlanForm, vlanId: Number(e.target.value) })}
            />
            <Input
              label="Nombre de VLAN"
              required
              value={vlanForm.name}
              onChange={(e) => setVlanForm({ ...vlanForm, name: e.target.value })}
              placeholder="VLAN-DMZ"
            />
          </div>
          <Select
            label="Red CIDR Asociada"
            value={vlanForm.networkId}
            onChange={(e) => setVlanForm({ ...vlanForm, networkId: e.target.value })}
            options={[
              { value: '', label: 'Sin red asociada' },
              ...networks.map((n) => ({ value: n.id, label: `${n.name} (${n.cidr})` })),
            ]}
          />
          <Input
            label="Descripción"
            value={vlanForm.description}
            onChange={(e) => setVlanForm({ ...vlanForm, description: e.target.value })}
            placeholder="Zona desmilitarizada para servidores públicos"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-[#252D38]">
            <Button type="button" variant="ghost" onClick={() => setIsVlanModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar VLAN
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteNetworkTarget}
        onClose={() => setDeleteNetworkTarget(null)}
        onConfirm={handleDeleteNetwork}
        title="Eliminar Red"
        message={`¿Estás seguro de eliminar la red ${deleteNetworkTarget?.name} (${deleteNetworkTarget?.cidr})?`}
        isDestructive
      />

      <ConfirmDialog
        isOpen={!!deleteVlanTarget}
        onClose={() => setDeleteVlanTarget(null)}
        onConfirm={handleDeleteVlan}
        title="Eliminar VLAN"
        message={`¿Estás seguro de eliminar la VLAN ${deleteVlanTarget?.vlanId} (${deleteVlanTarget?.name})?`}
        isDestructive
      />
    </div>
  );
};
