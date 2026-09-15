import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Machine, MachineType, MachineStatus, Location, VLAN } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { StatusBadge } from '../components/ui/Badge.js';
import { TableSkeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import {
  Server,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from 'lucide-react';

interface MachinesPageProps {
  onSelectMachine: (id: string) => void;
  isAddModalOpenInitially?: boolean;
  onCloseAddModal?: () => void;
}

const MACHINE_TYPES: { value: MachineType; label: string }[] = [
  { value: 'PHYSICAL_SERVER', label: 'Servidor Físico' },
  { value: 'VIRTUAL_SERVER', label: 'Servidor Virtual' },
  { value: 'PC', label: 'PC de Escritorio' },
  { value: 'LAPTOP', label: 'Portátil' },
  { value: 'ROUTER', label: 'Router' },
  { value: 'SWITCH', label: 'Switch' },
  { value: 'FIREWALL', label: 'Firewall' },
  { value: 'NAS', label: 'NAS / Almacenamiento' },
  { value: 'PRINTER', label: 'Impresora' },
  { value: 'VM', label: 'Máquina Virtual' },
  { value: 'OTHER', label: 'Otro' },
];

const MACHINE_STATUSES: { value: MachineStatus; label: string }[] = [
  { value: 'ONLINE', label: 'ONLINE' },
  { value: 'WARNING', label: 'WARNING' },
  { value: 'OFFLINE', label: 'OFFLINE' },
  { value: 'UNCHECKED', label: 'SIN COMPROBAR' },
];

export const MachinesPage: React.FC<MachinesPageProps> = ({
  onSelectMachine,
  isAddModalOpenInitially = false,
  onCloseAddModal,
}) => {
  const toast = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vlans, setVlans] = useState<VLAN[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(isAddModalOpenInitially);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    hostname: '',
    type: 'PHYSICAL_SERVER' as MachineType,
    status: 'ONLINE' as MachineStatus,
    primaryIp: '',
    macAddress: '',
    os: '',
    osVersion: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    locationId: '',
    vlanId: '',
    gateway: '',
    dns: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resMachines, resLocations, resVlans] = await Promise.all([
        api.getMachines({
          search: search || undefined,
          type: typeFilter || undefined,
          status: statusFilter || undefined,
          locationId: locationFilter || undefined,
          page,
          limit: 15,
        }),
        api.getLocations(),
        api.getVlans(),
      ]);

      setMachines(resMachines.items);
      setTotalPages(resMachines.pagination.totalPages);
      setTotalCount(resMachines.pagination.total);
      setLocations(resLocations);
      setVlans(resVlans);
    } catch (err: any) {
      toast.error('Error al cargar máquinas', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, typeFilter, statusFilter, locationFilter, page]);

  useEffect(() => {
    if (isAddModalOpenInitially) {
      handleOpenCreate();
    }
  }, [isAddModalOpenInitially]);

  const handleOpenCreate = () => {
    setEditingMachine(null);
    setFormData({
      hostname: '',
      type: 'PHYSICAL_SERVER',
      status: 'ONLINE',
      primaryIp: '',
      macAddress: '',
      os: '',
      osVersion: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      locationId: locations[0]?.id || '',
      vlanId: '',
      gateway: '',
      dns: '',
      description: '',
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (m: Machine, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMachine(m);
    setFormData({
      hostname: m.hostname,
      type: m.type,
      status: m.status,
      primaryIp: m.primaryIp || '',
      macAddress: m.macAddress || '',
      os: m.os || '',
      osVersion: m.osVersion || '',
      manufacturer: m.manufacturer || '',
      model: m.model || '',
      serialNumber: m.serialNumber || '',
      locationId: m.locationId || '',
      vlanId: m.vlanId || '',
      gateway: m.gateway || '',
      dns: m.dns || '',
      description: m.description || '',
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.hostname.trim()) {
      errors.hostname = 'El Hostname es obligatorio';
    }
    if (formData.primaryIp.trim()) {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipv4Regex.test(formData.primaryIp.trim())) {
        errors.primaryIp = 'Formato de IP inválido (ej. 192.168.1.50)';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        locationId: formData.locationId || null,
        vlanId: formData.vlanId || null,
      };

      if (editingMachine) {
        await api.updateMachine(editingMachine.id, payload);
        toast.success('Máquina actualizada', `Se guardaron los cambios para ${formData.hostname}`);
      } else {
        await api.createMachine(payload);
        toast.success('Máquina creada', `Se ha registrado ${formData.hostname} en el inventario`);
      }

      setIsFormModalOpen(false);
      if (onCloseAddModal) onCloseAddModal();
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar máquina', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteMachine(deleteTarget.id);
      toast.success('Máquina eliminada', `Se eliminó ${deleteTarget.hostname}`);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Server className="w-5 h-5 text-[#3B82F6]" />
            Inventario de Máquinas
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1A212B] text-[#94A3B8] font-mono border border-[#252D38]">
              {totalCount}
            </span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Servidores físicos, virtuales, PCs, routers, switches y firewalls
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => loadData()}
          >
            Refrescar
          </Button>
          <Can permission="MACHINE_CREATE">
            <Button
              variant="cyan"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreate}
            >
              + Añadir Máquina
            </Button>
          </Can>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por hostname, IP, OS..."
              className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          >
            <option value="">Todos los Tipos</option>
            {MACHINE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          >
            <option value="">Todos los Estados</option>
            {MACHINE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          >
            <option value="">Todas las Ubicaciones</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={8} />
          </div>
        ) : machines.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Server className="w-12 h-12 text-[#64748B] mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-[#F1F5F9]">No se encontraron máquinas</h3>
            <p className="text-xs text-[#94A3B8] mt-1 max-w-sm mx-auto">
              Intenta cambiar los filtros de búsqueda o agrega una nueva máquina al inventario.
            </p>
            <Button variant="primary" size="sm" className="mt-4" onClick={handleOpenCreate}>
              Añadir primera máquina
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F141B] text-[#94A3B8] border-b border-[#252D38] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Hostname</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">IP Principal</th>
                    <th className="py-3 px-4">Sistema Operativo</th>
                    <th className="py-3 px-4">Ubicación</th>
                    <th className="py-3 px-4">Servicios</th>
                    <th className="py-3 px-4">Actualizado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {machines.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => onSelectMachine(m.id)}
                      className="hover:bg-[#1A212B]/70 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#F1F5F9] whitespace-nowrap">
                        {m.hostname}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap">
                        {m.type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#06B6D4] whitespace-nowrap">
                        {m.primaryIp || '-'}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8] truncate max-w-[150px]">
                        {m.os ? `${m.os}${m.osVersion ? ` (${m.osVersion})` : ''}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8] truncate max-w-[130px]">
                        {m.location?.name || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {m.ports && m.ports.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#1A212B] border border-[#252D38] text-[#3B82F6]">
                            <Cpu className="w-3 h-3" /> {m.ports.length} puertos
                          </span>
                        ) : (
                          <span className="text-[#64748B]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] whitespace-nowrap font-mono text-[11px]">
                        {new Date(m.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            title="Ver Ficha Técnica"
                            onClick={() => onSelectMachine(m.id)}
                            className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#06B6D4] transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <Can permission="MACHINE_UPDATE">
                            <button
                              title="Editar Máquina"
                              onClick={(e) => handleOpenEdit(m, e)}
                              className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#3B82F6] transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </Can>
                          <Can permission="MACHINE_DELETE">
                            <button
                              title="Eliminar Máquina"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(m);
                              }}
                              className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#EF4444] transition-colors"
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

            <div className="p-4 border-t border-[#252D38] flex items-center justify-between text-xs text-[#94A3B8]">
              <div>
                Página <span className="font-semibold text-[#F1F5F9]">{page}</span> de{' '}
                <span className="font-semibold text-[#F1F5F9]">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                >
                  Siguiente
                  <ChevronRight className="w-3.5 h-3.5 ml-1 inline" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Add / Edit Machine Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          if (onCloseAddModal) onCloseAddModal();
        }}
        title={editingMachine ? `Editar Máquina: ${editingMachine.hostname}` : 'Registrar Nueva Máquina'}
        subtitle="Configura los parámetros del nodo en la red"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hostname"
              required
              value={formData.hostname}
              onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
              error={formErrors.hostname}
              placeholder="srv-prod-01"
            />
            <Select
              label="Tipo de Dispositivo"
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as MachineType })}
              options={MACHINE_TYPES}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Estado Inicial"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as MachineStatus })}
              options={MACHINE_STATUSES}
            />
            <Input
              label="IP Principal"
              value={formData.primaryIp}
              onChange={(e) => setFormData({ ...formData, primaryIp: e.target.value })}
              error={formErrors.primaryIp}
              placeholder="192.168.1.10"
            />
            <Input
              label="Dirección MAC"
              value={formData.macAddress}
              onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
              placeholder="00:1A:2B:3C:4D:5E"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Sistema Operativo"
              value={formData.os}
              onChange={(e) => setFormData({ ...formData, os: e.target.value })}
              placeholder="Ubuntu Server / Windows Server"
            />
            <Input
              label="Versión del SO"
              value={formData.osVersion}
              onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
              placeholder="22.04 LTS / 2022"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Fabricante"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              placeholder="Dell / HP / Cisco"
            />
            <Input
              label="Modelo"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="PowerEdge R750"
            />
            <Input
              label="Número de Serie"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              placeholder="SN-998242"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Ubicación Física / CPD"
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              options={[
                { value: '', label: 'Sin ubicación asignada' },
                ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
              ]}
            />
            <Select
              label="VLAN Asociada"
              value={formData.vlanId}
              onChange={(e) => setFormData({ ...formData, vlanId: e.target.value })}
              options={[
                { value: '', label: 'Sin VLAN' },
                ...vlans.map((v) => ({ value: v.id, label: `VLAN ${v.vlanId} - ${v.name}` })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Gateway Predeterminado"
              value={formData.gateway}
              onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
              placeholder="192.168.1.1"
            />
            <Input
              label="Servidores DNS"
              value={formData.dns}
              onChange={(e) => setFormData({ ...formData, dns: e.target.value })}
              placeholder="1.1.1.1, 8.8.8.8"
            />
          </div>

          <Input
            label="Descripción / Notas Técnicas"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Rol del servidor, notas de mantenimiento, etc."
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#252D38]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsFormModalOpen(false);
                if (onCloseAddModal) onCloseAddModal();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingMachine ? 'Guardar Cambios' : 'Registrar Máquina'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Máquina"
        message={`¿Estás seguro de que deseas eliminar la máquina "${deleteTarget?.hostname}" (${deleteTarget?.primaryIp || 'Sin IP'})? Esta acción eliminará también sus interfaces y puertos asociados.`}
        confirmText="Sí, eliminar"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
};
