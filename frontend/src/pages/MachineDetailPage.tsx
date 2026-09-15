import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  Machine,
  NetworkInterface,
  Port,
  Service,
  VLAN,
  PortProtocol,
  PortState,
} from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { StatusBadge, PortStateBadge, Badge } from '../components/ui/Badge.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import {
  ArrowLeft,
  Network,
  Cpu,
  History,
  Plus,
  Trash2,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface MachineDetailPageProps {
  machineId: string;
  onBack: () => void;
}

export const MachineDetailPage: React.FC<MachineDetailPageProps> = ({ machineId, onBack }) => {
  const toast = useToast();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [vlans, setVlans] = useState<VLAN[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'interfaces' | 'ports' | 'history'>('interfaces');

  // Interface Modal State
  const [isInterfaceModalOpen, setIsInterfaceModalOpen] = useState(false);
  const [interfaceFormData, setInterfaceFormData] = useState({
    name: '',
    macAddress: '',
    speed: '1 Gbps',
    status: 'UP',
    vlanId: '',
    description: '',
    ipAddress: '',
  });
  const [isSubmittingInterface, setIsSubmittingInterface] = useState(false);
  const [deleteInterfaceTarget, setDeleteInterfaceTarget] = useState<NetworkInterface | null>(null);

  // Port Modal State
  const [isPortModalOpen, setIsPortModalOpen] = useState(false);
  const [portFormData, setPortFormData] = useState({
    portNumber: 80,
    protocol: 'TCP' as PortProtocol,
    state: 'OPEN' as PortState,
    serviceId: '',
    description: '',
  });
  const [isSubmittingPort, setIsSubmittingPort] = useState(false);
  const [deletePortTarget, setDeletePortTarget] = useState<Port | null>(null);

  const loadMachineDetails = async () => {
    setIsLoading(true);
    try {
      const [m, sList, vList] = await Promise.all([
        api.getMachine(machineId),
        api.getServices(),
        api.getVlans(),
      ]);
      setMachine(m);
      setServices(sList);
      setVlans(vList);
    } catch (err: any) {
      toast.error('Error al cargar detalles de la máquina', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMachineDetails();
  }, [machineId]);

  // Handle Add Interface
  const handleAddInterface = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interfaceFormData.name.trim()) {
      toast.error('El nombre de la interfaz es obligatorio');
      return;
    }

    setIsSubmittingInterface(true);
    try {
      await api.createInterface({
        machineId,
        name: interfaceFormData.name,
        macAddress: interfaceFormData.macAddress || null,
        speed: interfaceFormData.speed,
        status: interfaceFormData.status,
        vlanId: interfaceFormData.vlanId || null,
        description: interfaceFormData.description || null,
        ipAddress: interfaceFormData.ipAddress || undefined,
      });

      toast.success('Interfaz añadida', `Se creó la interfaz ${interfaceFormData.name}`);
      setIsInterfaceModalOpen(false);
      setInterfaceFormData({
        name: '',
        macAddress: '',
        speed: '1 Gbps',
        status: 'UP',
        vlanId: '',
        description: '',
        ipAddress: '',
      });
      loadMachineDetails();
    } catch (err: any) {
      toast.error('Error al crear interfaz', err.message);
    } finally {
      setIsSubmittingInterface(false);
    }
  };

  const handleDeleteInterface = async () => {
    if (!deleteInterfaceTarget) return;
    try {
      await api.deleteInterface(deleteInterfaceTarget.id);
      toast.success('Interfaz eliminada', `Se eliminó ${deleteInterfaceTarget.name}`);
      setDeleteInterfaceTarget(null);
      loadMachineDetails();
    } catch (err: any) {
      toast.error('Error al eliminar interfaz', err.message);
    }
  };

  // Handle Add Port
  const handleAddPort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (portFormData.portNumber < 1 || portFormData.portNumber > 65535) {
      toast.error('Número de puerto inválido (1-65535)');
      return;
    }

    setIsSubmittingPort(true);
    try {
      await api.createPort({
        machineId,
        portNumber: Number(portFormData.portNumber),
        protocol: portFormData.protocol,
        state: portFormData.state,
        serviceId: portFormData.serviceId || null,
        description: portFormData.description || null,
      });

      toast.success('Puerto registrado', `Puerto ${portFormData.portNumber}/${portFormData.protocol} añadido`);
      setIsPortModalOpen(false);
      setPortFormData({
        portNumber: 80,
        protocol: 'TCP',
        state: 'OPEN',
        serviceId: '',
        description: '',
      });
      loadMachineDetails();
    } catch (err: any) {
      toast.error('Error al registrar puerto', err.message);
    } finally {
      setIsSubmittingPort(false);
    }
  };

  const handleDeletePort = async () => {
    if (!deletePortTarget) return;
    try {
      await api.deletePort(deletePortTarget.id);
      toast.success('Puerto eliminado', `Se eliminó el puerto ${deletePortTarget.portNumber}`);
      setDeletePortTarget(null);
      loadMachineDetails();
    } catch (err: any) {
      toast.error('Error al eliminar puerto', err.message);
    }
  };

  if (isLoading || !machine) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] font-mono">
                {machine.hostname}
              </h1>
              <StatusBadge status={machine.status} />
              <Badge variant="blue">{machine.type.replace('_', ' ')}</Badge>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {machine.description || 'Sin descripción adicional asignada'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => loadMachineDetails()}
          >
            Refrescar
          </Button>
        </div>
      </div>

      {/* Main Specs Grid Card */}
      <Card className="p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-4 pb-2 border-b border-[#252D38]">
          Ficha Técnica & Parámetros del Host
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 text-xs">
          <div>
            <span className="text-[#64748B] block font-medium">IP Principal</span>
            <span className="text-[#06B6D4] font-mono font-semibold text-sm mt-0.5 block">
              {machine.primaryIp || '-'}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block font-medium">Dirección MAC</span>
            <span className="text-[#F1F5F9] font-mono mt-0.5 block">
              {machine.macAddress || '-'}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block font-medium">Sistema Operativo</span>
            <span className="text-[#F1F5F9] font-semibold mt-0.5 block truncate">
              {machine.os || '-'} {machine.osVersion && `(${machine.osVersion})`}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block font-medium">Fabricante & Modelo</span>
            <span className="text-[#F1F5F9] mt-0.5 block truncate">
              {machine.manufacturer || '-'} {machine.model || ''}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block font-medium">Número de Serie</span>
            <span className="text-[#94A3B8] font-mono mt-0.5 block">
              {machine.serialNumber || '-'}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block font-medium">Ubicación / Sala</span>
            <span className="text-[#F1F5F9] font-semibold mt-0.5 block flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-[#3B82F6] flex-shrink-0" />
              {machine.location?.name || '-'}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block font-medium">VLAN Predeterminada</span>
            <span className="text-[#F1F5F9] font-mono mt-0.5 block">
              {machine.vlan ? `VLAN ${machine.vlan.vlanId} (${machine.vlan.name})` : '-'}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block font-medium">Gateway</span>
            <span className="text-[#F1F5F9] font-mono mt-0.5 block">
              {machine.gateway || '-'}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block font-medium">Servidores DNS</span>
            <span className="text-[#F1F5F9] font-mono mt-0.5 block truncate">
              {machine.dns || '-'}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block font-medium">Fecha de Alta</span>
            <span className="text-[#94A3B8] font-mono mt-0.5 block">
              {new Date(machine.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="text-[#64748B] block font-medium">Última Modificación</span>
            <span className="text-[#94A3B8] font-mono mt-0.5 block">
              {new Date(machine.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Tabs Container */}
      <div>
        <div className="flex border-b border-[#252D38] gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('interfaces')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'interfaces'
                ? 'border-[#06B6D4] text-[#06B6D4]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <Network className="w-4 h-4" />
            Interfaces de Red
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1A212B] font-mono">
              {machine.interfaces?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ports')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'ports'
                ? 'border-[#06B6D4] text-[#06B6D4]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Puertos & Servicios
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1A212B] font-mono">
              {machine.ports?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-[#06B6D4] text-[#06B6D4]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <History className="w-4 h-4" />
            Historial de Cambios
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1A212B] font-mono">
              {machine.changeLogs?.length || 0}
            </span>
          </button>
        </div>

        {/* Tab 1: Network Interfaces */}
        {activeTab === 'interfaces' && (
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#94A3B8]">
                Interfaces físicas y virtuales asignadas al equipo
              </span>
              <Button
                variant="cyan"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsInterfaceModalOpen(true)}
              >
                + Añadir Interfaz
              </Button>
            </div>

            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0F141B] text-[#94A3B8] border-b border-[#252D38] uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Interfaz</th>
                      <th className="py-3 px-4">Dirección IP</th>
                      <th className="py-3 px-4">MAC Address</th>
                      <th className="py-3 px-4">Velocidad</th>
                      <th className="py-3 px-4">VLAN</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252D38]/60">
                    {machine.interfaces && machine.interfaces.length > 0 ? (
                      machine.interfaces.map((iface) => (
                        <tr key={iface.id} className="hover:bg-[#1A212B]/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#F1F5F9] whitespace-nowrap">
                            {iface.name}
                            {iface.description && (
                              <span className="block text-[11px] text-[#64748B] font-normal">
                                {iface.description}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#06B6D4] whitespace-nowrap">
                            {iface.ipAddresses && iface.ipAddresses.length > 0
                              ? iface.ipAddresses.map((ip) => ip.ip).join(', ')
                              : '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#94A3B8] whitespace-nowrap">
                            {iface.macAddress || '-'}
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap font-mono">
                            {iface.speed || '-'}
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap font-mono">
                            {iface.vlan ? `VLAN ${iface.vlan.vlanId}` : '-'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge variant={iface.status === 'UP' ? 'green' : 'red'} size="sm" dot>
                              {iface.status || 'UP'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              title="Eliminar interfaz"
                              onClick={() => setDeleteInterfaceTarget(iface)}
                              className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-[#64748B]">
                          No hay interfaces configuradas para esta máquina.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Ports & Services */}
        {activeTab === 'ports' && (
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#94A3B8]">
                Puertos abiertos/escuchando y servicios de red asociados
              </span>
              <Button
                variant="cyan"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsPortModalOpen(true)}
              >
                + Añadir Puerto
              </Button>
            </div>

            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0F141B] text-[#94A3B8] border-b border-[#252D38] uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Puerto</th>
                      <th className="py-3 px-4">Protocolo</th>
                      <th className="py-3 px-4">Servicio Asignado</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Descripción</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252D38]/60">
                    {machine.ports && machine.ports.length > 0 ? (
                      machine.ports.map((p) => (
                        <tr key={p.id} className="hover:bg-[#1A212B]/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#F1F5F9] whitespace-nowrap text-sm">
                            {p.portNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#3B82F6] whitespace-nowrap">
                            {p.protocol}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#06B6D4] whitespace-nowrap">
                            {p.service?.name || 'Servicio Desconocido'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <PortStateBadge state={p.state} />
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8]">
                            {p.description || p.service?.description || '-'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              title="Eliminar puerto"
                              onClick={() => setDeletePortTarget(p)}
                              className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-[#64748B]">
                          No se han registrado puertos para esta máquina.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 3: History Timeline */}
        {activeTab === 'history' && (
          <div className="mt-4">
            <Card className="p-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-4">
                Línea Temporal de Eventos & Auditoría
              </h4>
              <div className="space-y-4">
                {machine.changeLogs && machine.changeLogs.length > 0 ? (
                  machine.changeLogs.map((log) => (
                    <div key={log.id} className="flex gap-4 text-xs">
                      <div className="flex flex-col items-center">
                        <span
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                            log.action === 'CREATE'
                              ? 'bg-[#22C55E]'
                              : log.action === 'DELETE'
                              ? 'bg-[#EF4444]'
                              : 'bg-[#3B82F6]'
                          }`}
                        />
                        <span className="w-px flex-1 bg-[#252D38] my-1" />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#F1F5F9]">{log.action}</span>
                          <span className="font-mono text-[#64748B] text-[11px]">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[#94A3B8] mt-1 bg-[#0F141B] p-2.5 rounded-lg border border-[#252D38] font-mono text-[11px]">
                          {log.details}
                        </p>
                        <span className="text-[10px] text-[#64748B] mt-1 block">
                          Actor: {log.user}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#64748B]">
                    No hay registros de cambios para esta máquina.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add Interface Modal */}
      <Modal
        isOpen={isInterfaceModalOpen}
        onClose={() => setIsInterfaceModalOpen(false)}
        title="Añadir Interfaz de Red"
        subtitle={`Asignar tarjeta de red a ${machine.hostname}`}
        maxWidth="md"
      >
        <form onSubmit={handleAddInterface} className="space-y-4">
          <Input
            label="Nombre de Interfaz (ej. eth0, ens18, vlan10)"
            required
            value={interfaceFormData.name}
            onChange={(e) => setInterfaceFormData({ ...interfaceFormData, name: e.target.value })}
            placeholder="eth1"
          />

          <Input
            label="Dirección IP Asignada"
            value={interfaceFormData.ipAddress}
            onChange={(e) => setInterfaceFormData({ ...interfaceFormData, ipAddress: e.target.value })}
            placeholder="192.168.1.55"
          />

          <Input
            label="Dirección MAC"
            value={interfaceFormData.macAddress}
            onChange={(e) => setInterfaceFormData({ ...interfaceFormData, macAddress: e.target.value })}
            placeholder="00:1A:2B:3C:4D:99"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Velocidad"
              value={interfaceFormData.speed}
              onChange={(e) => setInterfaceFormData({ ...interfaceFormData, speed: e.target.value })}
              options={[
                { value: '1 Gbps', label: '1 Gbps' },
                { value: '10 Gbps', label: '10 Gbps' },
                { value: '25 Gbps', label: '25 Gbps' },
                { value: '40 Gbps', label: '40 Gbps' },
                { value: '100 Gbps', label: '100 Gbps' },
                { value: 'Virtual', label: 'Virtual / Loopback' },
              ]}
            />
            <Select
              label="VLAN"
              value={interfaceFormData.vlanId}
              onChange={(e) => setInterfaceFormData({ ...interfaceFormData, vlanId: e.target.value })}
              options={[
                { value: '', label: 'Sin VLAN' },
                ...vlans.map((v) => ({ value: v.id, label: `VLAN ${v.vlanId} - ${v.name}` })),
              ]}
            />
          </div>

          <Input
            label="Descripción"
            value={interfaceFormData.description}
            onChange={(e) => setInterfaceFormData({ ...interfaceFormData, description: e.target.value })}
            placeholder="Enlace LACP redundante"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#252D38]">
            <Button type="button" variant="ghost" onClick={() => setIsInterfaceModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingInterface}>
              Guardar Interfaz
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Port Modal */}
      <Modal
        isOpen={isPortModalOpen}
        onClose={() => setIsPortModalOpen(false)}
        title="Registrar Puerto & Servicio"
        subtitle={`Vincular puerto a ${machine.hostname}`}
        maxWidth="md"
      >
        <form onSubmit={handleAddPort} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número de Puerto (1-65535)"
              type="number"
              required
              min={1}
              max={65535}
              value={portFormData.portNumber}
              onChange={(e) => setPortFormData({ ...portFormData, portNumber: Number(e.target.value) })}
            />
            <Select
              label="Protocolo"
              value={portFormData.protocol}
              onChange={(e) => setPortFormData({ ...portFormData, protocol: e.target.value as PortProtocol })}
              options={[
                { value: 'TCP', label: 'TCP' },
                { value: 'UDP', label: 'UDP' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Servicio de Red"
              value={portFormData.serviceId}
              onChange={(e) => setPortFormData({ ...portFormData, serviceId: e.target.value })}
              options={[
                { value: '', label: 'Seleccionar servicio...' },
                ...services.map((s) => ({ value: s.id, label: `${s.name} (${s.protocol})` })),
              ]}
            />
            <Select
              label="Estado del Puerto"
              value={portFormData.state}
              onChange={(e) => setPortFormData({ ...portFormData, state: e.target.value as PortState })}
              options={[
                { value: 'OPEN', label: 'OPEN (Abierto)' },
                { value: 'CLOSED', label: 'CLOSED (Cerrado)' },
                { value: 'FILTERED', label: 'FILTERED (Filtrado)' },
              ]}
            />
          </div>

          <Input
            label="Descripción / Observaciones"
            value={portFormData.description}
            onChange={(e) => setPortFormData({ ...portFormData, description: e.target.value })}
            placeholder="Acceso consola remota o base de datos"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#252D38]">
            <Button type="button" variant="ghost" onClick={() => setIsPortModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingPort}>
              Guardar Puerto
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Interface Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteInterfaceTarget}
        onClose={() => setDeleteInterfaceTarget(null)}
        onConfirm={handleDeleteInterface}
        title="Eliminar Interfaz"
        message={`¿Estás seguro de eliminar la interfaz "${deleteInterfaceTarget?.name}"?`}
        isDestructive
      />

      {/* Delete Port Confirmation */}
      <ConfirmDialog
        isOpen={!!deletePortTarget}
        onClose={() => setDeletePortTarget(null)}
        onConfirm={handleDeletePort}
        title="Eliminar Puerto"
        message={`¿Estás seguro de desvincular el puerto ${deletePortTarget?.portNumber}/${deletePortTarget?.protocol}?`}
        isDestructive
      />
    </div>
  );
};
