import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Service } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { TableSkeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import { Layers, Plus, Trash2, Edit2, RefreshCw } from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Service Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    defaultPort: 80,
    protocol: 'TCP',
    version: '',
    description: '',
  });

  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await api.getServices();
      setServices(list);
    } catch (err: any) {
      toast.error('Error al cargar servicios', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre del servicio es obligatorio');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        defaultPort: formData.defaultPort ? Number(formData.defaultPort) : null,
        protocol: formData.protocol,
        version: formData.version || null,
        description: formData.description || null,
      };

      if (editingService) {
        await api.updateService(editingService.id, payload);
        toast.success('Servicio actualizado', `Se modificó ${payload.name}`);
      } else {
        await api.createService(payload);
        toast.success('Servicio registrado', `Se añadió ${payload.name} al catálogo`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar servicio', err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteService(deleteTarget.id);
      toast.success('Servicio eliminado');
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-purple-400" />
            Catálogo de Servicios
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Definición y estandarización de servicios de red, bases de datos y protocolos
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadData}>
            Refrescar
          </Button>
          <Can permission="SERVICE_CREATE">
            <Button
              variant="cyan"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingService(null);
                setFormData({
                  name: '',
                  defaultPort: 80,
                  protocol: 'TCP',
                  version: '',
                  description: '',
                });
                setIsModalOpen(true);
              }}
            >
              + Añadir Servicio
            </Button>
          </Can>
        </div>
      </div>

      {/* Services Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F141B] text-[#94A3B8] border-b border-[#252D38] uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Nombre del Servicio</th>
                  <th className="py-3 px-4">Puerto por Defecto</th>
                  <th className="py-3 px-4">Protocolo Base</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4">Instancias Activas</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D38]/60">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-[#1A212B]/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#F1F5F9]">{s.name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#06B6D4]">
                      {s.defaultPort || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#3B82F6]">{s.protocol || 'TCP'}</td>
                    <td className="py-3 px-4 text-[#94A3B8] truncate max-w-xs">
                      {s.description || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-purple-400">
                      {s.ports?.length || 0} máquinas
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Can permission="SERVICE_UPDATE">
                          <button
                            onClick={() => {
                              setEditingService(s);
                              setFormData({
                                name: s.name,
                                defaultPort: s.defaultPort || 80,
                                protocol: s.protocol || 'TCP',
                                version: s.version || '',
                                description: s.description || '',
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#3B82F6]"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                        <Can permission="SERVICE_DELETE">
                          <button
                            onClick={() => setDeleteTarget(s)}
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

      {/* Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? `Editar Servicio: ${editingService.name}` : 'Añadir Entrada al Catálogo'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <Input
            label="Nombre del Servicio (ej. HTTPS, PostgreSQL)"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Redis / Elasticsearch"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Puerto Estándar (opcional)"
              type="number"
              min={1}
              max={65535}
              value={formData.defaultPort}
              onChange={(e) => setFormData({ ...formData, defaultPort: Number(e.target.value) })}
            />
            <Input
              label="Protocolo de Red"
              value={formData.protocol}
              onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
              placeholder="TCP / UDP"
            />
          </div>

          <Input
            label="Descripción del Servicio"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Base de datos relacional / Broker de colas"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[#252D38]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Servicio
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Servicio"
        message={`¿Estás seguro de eliminar el servicio "${deleteTarget?.name}"?`}
        isDestructive
      />
    </div>
  );
};
