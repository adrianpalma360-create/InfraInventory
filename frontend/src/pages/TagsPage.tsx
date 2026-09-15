import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Tag } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import {
  Tag as TagIcon,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
} from 'lucide-react';

const PRESET_COLORS = [
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate
];

interface TagsPageProps {
  onSelectMachine?: (id: string) => void;
}

export const TagsPage: React.FC<TagsPageProps> = ({ onSelectMachine }) => {
  const toast = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [selectedTagDetail, setSelectedTagDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#06B6D4');
  const [tagDescription, setTagDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const list = await api.getTags();
      setTags(list || []);
      if (!selectedTag && list && list.length > 0) {
        setSelectedTag(list[0]);
      }
    } catch (err: any) {
      toast.error('Error al cargar tags', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTagDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await api.getTag(id);
      setSelectedTagDetail(detail);
    } catch (err: any) {
      toast.error('Error al cargar detalle del tag', err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    if (selectedTag) {
      loadTagDetail(selectedTag.id);
    }
  }, [selectedTag]);

  const handleOpenAdd = () => {
    setEditingTag(null);
    setTagName('');
    setTagColor('#06B6D4');
    setTagDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || '#06B6D4');
    setTagDescription(tag.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) {
      toast.warning('Campo requerido', 'El nombre del tag es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTag) {
        await api.updateTag(editingTag.id, {
          name: tagName.trim(),
          color: tagColor,
          description: tagDescription.trim() || null,
        });
        toast.success('Tag actualizado', `Se modificó la etiqueta ${tagName}`);
      } else {
        const created = await api.createTag({
          name: tagName.trim(),
          color: tagColor,
          description: tagDescription.trim() || null,
        });
        toast.success('Tag creado', `Se añadió la etiqueta ${tagName}`);
        setSelectedTag(created);
      }
      setIsModalOpen(false);
      loadTags();
    } catch (err: any) {
      toast.error('Error al guardar tag', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!tagToDelete) return;
    try {
      await api.deleteTag(tagToDelete.id);
      toast.success('Tag eliminado', `Se eliminó la etiqueta ${tagToDelete.name}`);
      setTagToDelete(null);
      if (selectedTag?.id === tagToDelete.id) {
        setSelectedTag(null);
      }
      loadTags();
    } catch (err: any) {
      toast.error('Error al eliminar tag', err.message);
    }
  };

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <TagIcon className="w-5 h-5 text-pink-400" />
            Gestión de Tags & Etiquetas Transversales
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Etiquetado flexible y multidimensional de hosts, servidores, servicios e infraestructura
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Can permission="TAG_CREATE">
            <Button
              variant="cyan"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenAdd}
            >
              Nuevo Tag
            </Button>
          </Can>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadTags}
          />
        </div>
      </div>

      {/* 2-Column Layout: Left (Tags Directory) | Right (Tagged Hosts & Usage) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tags List */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="p-4 bg-[#0F141B] border-[#252D38] space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tag..."
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
              />
            </div>

            <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
              ) : filteredTags.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748B]">
                  No hay tags creados. Crea el primero (ej: production, critical, database).
                </div>
              ) : (
                filteredTags.map((t) => {
                  const isSelected = selectedTag?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTag(t)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#151B23] border-[#06B6D4] shadow-sm'
                          : 'bg-[#0B0F14] border-[#252D38] hover:border-[#252D38] hover:bg-[#151B23]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: t.color || '#06B6D4' }}
                        />
                        <div>
                          <div className="text-xs font-bold text-[#F1F5F9]">{t.name}</div>
                          {t.description && (
                            <div className="text-[10px] text-[#64748B] truncate max-w-[150px]">
                              {t.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151B23] text-[#94A3B8] border border-[#252D38]">
                          {t._count?.machines || 0}
                        </span>
                        <Can permission="TAG_UPDATE">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(t);
                            }}
                            className="p-1 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#F1F5F9]"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </Can>
                        <Can permission="TAG_DELETE">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTagToDelete(t);
                            }}
                            className="p-1 rounded hover:bg-rose-500/20 text-[#64748B] hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Can>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right: Tagged Hosts */}
        <div className="lg:col-span-8 space-y-4">
          {isLoadingDetail || !selectedTag ? (
            <Card className="p-8 text-center bg-[#0F141B] border-[#252D38]">
              <div className="text-xs text-[#94A3B8]">Selecciona un tag para ver las máquinas asociadas.</div>
            </Card>
          ) : (
            <Card className="p-5 bg-[#0F141B] border-[#252D38] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#252D38]">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedTag.color || '#06B6D4' }}
                  />
                  <div>
                    <h2 className="text-base font-bold text-[#F1F5F9]">{selectedTag.name}</h2>
                    <p className="text-xs text-[#94A3B8]">{selectedTag.description || 'Sin descripción'}</p>
                  </div>
                </div>

                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#151B23] border border-[#252D38] text-[#06B6D4]">
                  {selectedTagDetail?.machines?.length || 0} hosts etiquetados
                </span>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#252D38] text-[#94A3B8] font-mono text-[11px]">
                      <th className="pb-2.5 font-semibold">HOSTNAME</th>
                      <th className="pb-2.5 font-semibold">ESTADO</th>
                      <th className="pb-2.5 font-semibold">TIPO</th>
                      <th className="pb-2.5 font-semibold">IP</th>
                      <th className="pb-2.5 font-semibold">UBICACIÓN</th>
                      <th className="pb-2.5 font-semibold text-right">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252D38]/60">
                    {!selectedTagDetail?.machines || selectedTagDetail.machines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#64748B]">
                          No hay máquinas asociadas a la etiqueta "{selectedTag.name}".
                        </td>
                      </tr>
                    ) : (
                      selectedTagDetail.machines.map((rel: any) => {
                        const m = rel.machine;
                        return (
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
                            <td className="py-3 text-[#94A3B8]">{m.type}</td>
                            <td className="py-3 font-mono text-[#94A3B8]">{m.primaryIp || 'Sin IP'}</td>
                            <td className="py-3 text-[#94A3B8]">{m.location ? m.location.name : 'N/A'}</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => onSelectMachine && onSelectMachine(m.id)}
                                className="text-[11px] text-[#06B6D4] hover:underline"
                              >
                                Ficha Técnica &rarr;
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Add / Edit Tag */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTag ? 'Editar Tag' : 'Crear Nuevo Tag'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nombre del Tag *"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="ej: production, critical, database, linux"
            required
          />

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Color del Tag</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={tagColor}
                onChange={(e) => setTagColor(e.target.value)}
                className="w-8 h-8 rounded border border-[#252D38] bg-transparent cursor-pointer"
              />
              <span className="font-mono text-xs text-[#F1F5F9]">{tagColor}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setTagColor(c)}
                  className={`w-6 h-6 rounded-full border transition-all ${
                    tagColor === c ? 'border-white scale-110 shadow' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Input
            label="Descripción"
            value={tagDescription}
            onChange={(e) => setTagDescription(e.target.value)}
            placeholder="Finalidad o alcance de la etiqueta"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="cyan" isLoading={isSubmitting}>
              {editingTag ? 'Actualizar Tag' : 'Crear Tag'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {tagToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setTagToDelete(null)}
          title="Confirmar Eliminación de Tag"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#F1F5F9]">
              ¿Estás seguro de que deseas eliminar el tag <strong>{tagToDelete.name}</strong>? Las máquinas perderán esta etiqueta pero no serán eliminadas.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setTagToDelete(null)}>
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

export default TagsPage;
