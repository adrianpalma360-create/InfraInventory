import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Location, LocationType } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import {
  MapPin,
  FolderTree,
  Building,
  Server,
  Layers,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
} from 'lucide-react';

interface LocationsPageProps {
  onSelectMachine?: (id: string) => void;
}

export const LocationsPage: React.FC<LocationsPageProps> = ({ onSelectMachine }) => {
  const toast = useToast();
  const [locationsTree, setLocationsTree] = useState<Location[]>([]);
  const [allLocationsList, setAllLocationsList] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationDetail, setSelectedLocationDetail] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<LocationType>('OFFICE');
  const [parentId, setParentId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [rack, setRack] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  const loadTreeAndList = async () => {
    setIsLoading(true);
    try {
      const [tree, list] = await Promise.all([
        api.getLocationTree(),
        api.getLocations(),
      ]);
      setLocationsTree(tree || []);
      setAllLocationsList(list || []);

      if (!selectedLocationId && list && list.length > 0) {
        setSelectedLocationId(list[0].id);
      }
    } catch (err: any) {
      toast.error('Error al cargar ubicaciones', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocationDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await api.getLocation(id);
      setSelectedLocationDetail(detail);
    } catch (err: any) {
      toast.error('Error al cargar detalle de ubicación', err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadTreeAndList();
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      loadLocationDetail(selectedLocationId);
    }
  }, [selectedLocationId]);

  const handleOpenAdd = (defaultParentId?: string) => {
    setEditingLocation(null);
    setName('');
    setType('OFFICE');
    setParentId(defaultParentId || '');
    setAddress('');
    setCity('');
    setCountry('');
    setBuilding('');
    setRoom('');
    setRack('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation(loc);
    setName(loc.name);
    setType(loc.type || 'OTHER');
    setParentId(loc.parentId || '');
    setAddress(loc.address || '');
    setCity(loc.city || '');
    setCountry(loc.country || '');
    setBuilding(loc.building || '');
    setRoom(loc.room || '');
    setRack(loc.rack || '');
    setDescription(loc.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Campo requerido', 'Debes ingresar un nombre para la ubicación.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        parentId: parentId || null,
        address: address.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        building: building.trim() || null,
        room: room.trim() || null,
        rack: rack.trim() || null,
        description: description.trim() || null,
      };

      if (editingLocation) {
        await api.updateLocation(editingLocation.id, payload);
        toast.success('Ubicación actualizada', `Se modificó ${payload.name}`);
      } else {
        const created = await api.createLocation(payload);
        toast.success('Ubicación creada', `Se añadió ${payload.name}`);
        setSelectedLocationId(created.id);
      }
      setIsModalOpen(false);
      loadTreeAndList();
    } catch (err: any) {
      toast.error('Error al guardar ubicación', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;
    try {
      await api.deleteLocation(locationToDelete.id);
      toast.success('Ubicación eliminada', `Se eliminó ${locationToDelete.name}`);
      setLocationToDelete(null);
      if (selectedLocationId === locationToDelete.id) {
        setSelectedLocationId(null);
      }
      loadTreeAndList();
    } catch (err: any) {
      toast.error('Error al eliminar ubicación', err.message);
    }
  };

  const getTypeIcon = (locType?: LocationType) => {
    switch (locType) {
      case 'DATACENTER':
        return <Server className="w-3.5 h-3.5 text-[#06B6D4]" />;
      case 'RACK':
        return <Layers className="w-3.5 h-3.5 text-purple-400" />;
      case 'COMPANY':
      case 'OFFICE':
        return <Building className="w-3.5 h-3.5 text-[#22C55E]" />;
      case 'ROOM':
        return <FolderTree className="w-3.5 h-3.5 text-[#F59E0B]" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />;
    }
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: Location, depth = 0) => {
    const isSelected = selectedLocationId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => setSelectedLocationId(node.id)}
          style={{ paddingLeft: `${depth * 16 + 10}px` }}
          className={`flex items-center justify-between py-2 pr-2.5 rounded-lg text-xs cursor-pointer transition-all ${
            isSelected
              ? 'bg-[#151B23] text-[#06B6D4] font-bold border border-[#06B6D4]/40 shadow-sm'
              : 'text-[#94A3B8] hover:bg-[#151B23]/60 hover:text-[#F1F5F9] border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {getTypeIcon(node.type)}
            <span className="truncate">{node.name}</span>
            <span className="text-[10px] font-mono font-normal text-[#64748B] uppercase">
              ({node.type || 'LOC'})
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0B0F14] text-[#64748B] border border-[#252D38]">
              {node._count?.machines || node.machines?.length || 0} hosts
            </span>
            <Can permission="LOCATION_CREATE">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAdd(node.id);
                }}
                className="p-1 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#06B6D4]"
                title="Añadir sub-ubicación"
              >
                <Plus className="w-3 h-3" />
              </button>
            </Can>
          </div>
        </div>

        {hasChildren && (
          <div className="border-l border-[#252D38]/60 ml-3 pl-1 space-y-0.5 mt-0.5">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const detailStats = selectedLocationDetail?.stats || {
    totalMachines: 0,
    onlineCount: 0,
    warningCount: 0,
    offlineCount: 0,
    uncheckedCount: 0,
    totalServices: 0,
    openIncidentsCount: 0,
    availability: 100,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-[#22C55E]" />
            Estructura Jerárquica de Ubicaciones Físicas
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Árbol de sedes, centros de datos, salas técnicas, armarios rack y mapas de infraestructura
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Can permission="LOCATION_CREATE">
            <Button
              variant="cyan"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenAdd()}
            >
              Nueva Ubicación Raíz
            </Button>
          </Can>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadTreeAndList}
          />
        </div>
      </div>

      {/* 2-Column Hierarchy View: Left (Tree View) | Right (Location NOC Dashboard & Inventario) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Tree */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="p-4 bg-[#0F141B] border-[#252D38] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#252D38]">
              <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-[#06B6D4]" />
                Árbol de Ubicaciones ({allLocationsList.length})
              </span>
            </div>

            <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)
              ) : locationsTree.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748B]">
                  No hay ubicaciones registradas. Crea la primera sede o datacenter.
                </div>
              ) : (
                locationsTree.map((node) => renderTreeNode(node))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Location NOC Dashboard & Equipment */}
        <div className="lg:col-span-8 space-y-4">
          {isLoadingDetail || !selectedLocationDetail ? (
            <Card className="p-8 text-center bg-[#0F141B] border-[#252D38]">
              <div className="text-xs text-[#94A3B8]">Selecciona una ubicación del árbol para inspeccionar su salud e inventario.</div>
            </Card>
          ) : (
            <>
              {/* Location Header Banner */}
              <Card className="p-5 bg-gradient-to-br from-[#0F141B] via-[#151B23] to-[#0F141B] border-[#252D38]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-[#F1F5F9]">{selectedLocationDetail.name}</h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 font-semibold">
                        {selectedLocationDetail.type}
                      </span>
                      {selectedLocationDetail.parent && (
                        <span className="text-xs text-[#94A3B8]">
                          &larr; Parte de <strong className="text-[#F1F5F9]">{selectedLocationDetail.parent.name}</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      {selectedLocationDetail.description || 'Ubicación física mapeada en la topología de red.'}
                    </p>
                    <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B] font-mono">
                      {selectedLocationDetail.city && <span>Ciudad: {selectedLocationDetail.city}</span>}
                      {selectedLocationDetail.building && <span>Edificio: {selectedLocationDetail.building}</span>}
                      {selectedLocationDetail.room && <span>Sala: {selectedLocationDetail.room}</span>}
                      {selectedLocationDetail.rack && <span>Rack: {selectedLocationDetail.rack}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Can permission="LOCATION_UPDATE">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenEdit(selectedLocationDetail)}
                      >
                        Editar
                      </Button>
                    </Can>
                    <Can permission="LOCATION_DELETE">
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => setLocationToDelete(selectedLocationDetail)}
                      >
                        Eliminar
                      </Button>
                    </Can>
                  </div>
                </div>

                {/* Location Operational KPIs */}
                <div className="mt-5 pt-4 border-t border-[#252D38] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#252D38]/60">
                    <div className="text-[10px] uppercase font-semibold text-[#94A3B8]">Máquinas & Hosts</div>
                    <div className="text-xl font-bold font-mono text-[#06B6D4] mt-1">
                      {detailStats.totalMachines}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#252D38]/60">
                    <div className="text-[10px] uppercase font-semibold text-[#94A3B8]">Salud Operativa</div>
                    <div className="text-xl font-bold font-mono text-[#22C55E] mt-1">
                      {detailStats.onlineCount} <span className="text-xs text-[#64748B]">/ {detailStats.totalMachines} Online</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#252D38]/60">
                    <div className="text-[10px] uppercase font-semibold text-[#94A3B8]">Incidentes Abiertos</div>
                    <div className={`text-xl font-bold font-mono mt-1 ${detailStats.openIncidentsCount > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                      {detailStats.openIncidentsCount}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#252D38]/60">
                    <div className="text-[10px] uppercase font-semibold text-[#94A3B8]">Disponibilidad</div>
                    <div className="text-xl font-bold font-mono text-[#22C55E] mt-1">
                      {detailStats.availability}%
                    </div>
                  </div>
                </div>
              </Card>

              {/* Incidents in this location */}
              {selectedLocationDetail.incidents && selectedLocationDetail.incidents.length > 0 && (
                <Card className="p-4 bg-[#EF4444]/10 border-[#EF4444]/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#EF4444]">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Incidentes activos detectados en esta ubicación</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {selectedLocationDetail.incidents.map((inc: any) => (
                      <div key={inc.id} className="p-2 rounded bg-[#0B0F14] border border-[#EF4444]/20 flex items-center justify-between">
                        <span className="text-[#F1F5F9]">{inc.message}</span>
                        <span className="font-mono text-[10px] text-[#EF4444] font-bold">{inc.severity}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Hosts & Machines installed at this location */}
              <Card className="p-5 bg-[#0F141B] border-[#252D38] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#06B6D4]" />
                    Equipos Instalados en esta Ubicación ({selectedLocationDetail.machines?.length || 0})
                  </h3>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#252D38] text-[#94A3B8] font-mono text-[11px]">
                        <th className="pb-2.5 font-semibold">HOSTNAME</th>
                        <th className="pb-2.5 font-semibold">ESTADO</th>
                        <th className="pb-2.5 font-semibold">IP PRINCIPAL</th>
                        <th className="pb-2.5 font-semibold">VLAN</th>
                        <th className="pb-2.5 font-semibold">TAGS</th>
                        <th className="pb-2.5 font-semibold text-right">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252D38]/60">
                      {!selectedLocationDetail.machines || selectedLocationDetail.machines.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#64748B]">
                            No hay máquinas asignadas a esta ubicación.
                          </td>
                        </tr>
                      ) : (
                        selectedLocationDetail.machines.map((m) => (
                          <tr key={m.id} className="hover:bg-[#151B23]/50 transition-colors">
                            <td className="py-3 font-semibold text-[#F1F5F9]">
                              <button
                                onClick={() => onSelectMachine && onSelectMachine(m.id)}
                                className="text-[#06B6D4] hover:underline flex items-center gap-1.5"
                              >
                                <span>{m.hostname}</span>
                              </button>
                            </td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  m.status === 'ONLINE'
                                    ? 'bg-[#22C55E]/15 text-[#22C55E]'
                                    : m.status === 'WARNING'
                                    ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                                    : 'bg-[#EF4444]/15 text-[#EF4444]'
                                }`}
                              >
                                {m.status}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-[#94A3B8]">{m.primaryIp || 'Sin IP'}</td>
                            <td className="py-3 font-mono text-[#94A3B8]">
                              {m.vlan ? `VLAN ${m.vlan.vlanId}` : 'N/A'}
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1">
                                {m.tags && m.tags.length > 0 ? (
                                  m.tags.map((t) => (
                                    <span
                                      key={t.tagId}
                                      className="text-[9px] font-mono px-1.5 py-0.2 rounded"
                                      style={{ backgroundColor: `${t.tag.color}20`, color: t.tag.color, borderColor: `${t.tag.color}40`, borderWidth: 1 }}
                                    >
                                      {t.tag.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-[#64748B]">-</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => onSelectMachine && onSelectMachine(m.id)}
                                className="text-[11px] text-[#06B6D4] hover:underline"
                              >
                                Ficha Técnica &rarr;
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ======================================================= */}
      {/* 🏢 MODAL: CREAR / EDITAR UBICACIÓN                     */}
      {/* ======================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLocation ? 'Editar Ubicación' : 'Crear Nueva Ubicación'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nombre de la Ubicación *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej: Datacenter Principal, Rack 01, Sede Central"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Tipo de Ubicación</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LocationType)}
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="COMPANY">Empresa / Sede General</option>
                <option value="OFFICE">Oficina / Sucursal</option>
                <option value="DATACENTER">Datacenter / CPD</option>
                <option value="ROOM">Sala Técnica / Servidores</option>
                <option value="RACK">Armario Rack</option>
                <option value="WAREHOUSE">Almacén / Depósito</option>
                <option value="REMOTE">Remota / Sucursal Externa</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Ubicación Padre (Jerarquía)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="">(Ubicación Raíz / Ninguna)</option>
                {allLocationsList
                  .filter((loc) => !editingLocation || loc.id !== editingLocation.id)
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Input label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Madrid" />
            <Input label="Edificio" value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="Edificio A" />
            <Input label="Sala" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Sala 02" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Armario / Rack" value={rack} onChange={(e) => setRack(e.target.value)} placeholder="Rack 03" />
            <Input label="Dirección / País" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle Principal 100" />
          </div>

          <Input
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles sobre climatización, acceso o propósito"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="cyan" isLoading={isSubmitting}>
              {editingLocation ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {locationToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setLocationToDelete(null)}
          title="Confirmar Eliminación de Ubicación"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#F1F5F9]">
              ¿Estás seguro de que deseas eliminar la ubicación <strong>{locationToDelete.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setLocationToDelete(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LocationsPage;
