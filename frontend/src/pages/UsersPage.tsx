import React, { useState, useEffect } from 'react';
import { useAuth, Can } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { User, Role } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { TableSkeleton } from '../components/ui/Skeleton.js';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Key,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  ShieldCheck,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<'true' | 'false' | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'VIEWER' as Role,
    isActive: true,
    mustChangePassword: true,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'VIEWER' as Role,
    isActive: true,
    mustChangePassword: false,
  });

  const [passwordForm, setPasswordForm] = useState({
    password: '',
    mustChangePassword: true,
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 15,
      });
      setUsers(res.items);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      toast.error('Error al cargar usuarios', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, statusFilter, page]);

  // Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.name || !createForm.password) {
      toast.error('Campos incompletos', 'Usuario, Nombre y Contraseña son obligatorios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createUser({
        username: createForm.username.trim(),
        name: createForm.name.trim(),
        email: createForm.email.trim() || null,
        password: createForm.password,
        role: createForm.role,
        isActive: createForm.isActive,
        mustChangePassword: createForm.mustChangePassword,
      });

      toast.success('Usuario creado', `El usuario ${created.username} ha sido creado con rol ${created.role}.`);
      setIsCreateModalOpen(false);
      setCreateForm({
        username: '',
        name: '',
        email: '',
        password: '',
        role: 'VIEWER',
        isActive: true,
        mustChangePassword: true,
      });
      loadUsers();
    } catch (err: any) {
      toast.error('Error al crear usuario', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit User
  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email || '',
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const updated = await api.updateUser(selectedUser.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        role: editForm.role,
        isActive: editForm.isActive,
        mustChangePassword: editForm.mustChangePassword,
      });

      toast.success('Usuario actualizado', `Los datos de ${updated.username} se han guardado.`);
      setIsEditModalOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error('Error al actualizar usuario', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Password
  const handleOpenPassword = (user: User) => {
    setSelectedUser(user);
    setPasswordForm({ password: '', mustChangePassword: true });
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !passwordForm.password) return;

    if (passwordForm.password.length < 6) {
      toast.error('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.resetUserPassword(selectedUser.id, passwordForm);
      toast.success('Contraseña restablecida', `Se actualizó la contraseña de ${selectedUser.username}.`);
      setIsPasswordModalOpen(false);
    } catch (err: any) {
      toast.error('Error al restablecer contraseña', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active/Disabled
  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Acción no permitida', 'No puedes desactivar tu propia cuenta activa.');
      return;
    }

    const nextStatus = !user.isActive;
    try {
      await api.updateUser(user.id, { isActive: nextStatus });
      toast.success(
        nextStatus ? 'Usuario activado' : 'Usuario desactivado',
        `El usuario ${user.username} ahora está ${nextStatus ? 'ACTIVO' : 'INACTIVO'}.`
      );
      loadUsers();
    } catch (err: any) {
      toast.error('Error al cambiar estado', err.message);
    }
  };

  // Delete User
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsSubmitting(true);
    try {
      await api.deleteUser(deleteTarget.id);
      toast.success('Usuario eliminado', `El usuario ${deleteTarget.username} ha sido eliminado.`);
      setDeleteTarget(null);
      loadUsers();
    } catch (err: any) {
      toast.error('Error al eliminar usuario', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Administrador
          </span>
        );
      case 'TECHNICIAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
            <Shield className="w-3.5 h-3.5" /> Técnico
          </span>
        );
      case 'VIEWER':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#64748B]/10 text-[#94A3B8] border border-[#64748B]/30">
            Lector
          </span>
        );
    }
  };

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const techCount = users.filter((u) => u.role === 'TECHNICIAN').length;
  const viewerCount = users.filter((u) => u.role === 'VIEWER').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#06B6D4]" />
            Gestión de Usuarios & Control de Accesos
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Administración de cuentas internas, asignación de roles y permisos corporativos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadUsers} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Can permission="USER_CREATE">
            <Button variant="cyan" size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <UserPlus className="w-4 h-4" />
              Nuevo Usuario
            </Button>
          </Can>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#1A212B] border border-[#252D38] flex items-center justify-center text-[#F1F5F9]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#64748B] font-medium">Total de Usuarios</div>
            <div className="text-xl font-bold text-[#F1F5F9] font-mono">{totalCount}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#64748B] font-medium">Administradores</div>
            <div className="text-xl font-bold text-[#06B6D4] font-mono">{adminCount}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#64748B] font-medium">Técnicos de Red</div>
            <div className="text-xl font-bold text-[#22C55E] font-mono">{techCount}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#64748B]/10 border border-[#64748B]/30 flex items-center justify-center text-[#94A3B8]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#64748B] font-medium">Lectores (Solo Consulta)</div>
            <div className="text-xl font-bold text-[#94A3B8] font-mono">{viewerCount}</div>
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por usuario, nombre o email..."
              className="w-full bg-[#0B0F14] border border-[#252D38] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
            />
          </div>

          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as Role | '');
              setPage(1);
            }}
            options={[
              { value: '', label: 'Todos los Roles' },
              { value: 'ADMIN', label: 'Solo Administradores' },
              { value: 'TECHNICIAN', label: 'Solo Técnicos' },
              { value: 'VIEWER', label: 'Solo Lectores' },
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'true' | 'false' | 'all');
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Todos los Estados' },
              { value: 'true', label: 'Solo Usuarios Activos' },
              { value: 'false', label: 'Solo Usuarios Desactivados' },
            ]}
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-[#94A3B8]">
            <Users className="w-10 h-10 mx-auto text-[#64748B] mb-2 opacity-50" />
            <p className="text-sm font-medium">No se encontraron usuarios</p>
            <p className="text-xs text-[#64748B] mt-1">Prueba cambiando los criterios de búsqueda o filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#252D38] bg-[#0B0F14]/60 text-[#64748B] uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4">Rol Asignado</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Último Acceso</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D38]">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-[#151B23]/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#1A212B] border border-[#252D38] flex items-center justify-center font-bold text-[#06B6D4] text-xs font-mono">
                            {u.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-[#F1F5F9] font-mono">{u.username}</span>
                            {isCurrent && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#06B6D4]/10 text-[#06B6D4] font-semibold">
                                Tú
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#F1F5F9]">{u.name}</td>
                      <td className="py-3 px-4 text-[#94A3B8] font-mono text-[11px]">{u.email || '—'}</td>
                      <td className="py-3 px-4">{roleBadge(u.role)}</td>
                      <td className="py-3 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[#22C55E] text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-xs">
                            <XCircle className="w-3.5 h-3.5" /> Desactivado
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] font-mono text-[11px]">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-ES') : 'Nunca'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Active */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              u.isActive
                                ? 'text-amber-400 hover:bg-amber-500/10 border-amber-500/30'
                                : 'text-[#22C55E] hover:bg-[#22C55E]/10 border-[#22C55E]/30'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                            title={u.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                          >
                            {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleOpenPassword(u)}
                            className="p-1.5 rounded-lg text-[#06B6D4] hover:bg-[#06B6D4]/10 border border-[#06B6D4]/30 transition-colors"
                            title="Restablecer contraseña"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit User */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1A212B] border border-[#252D38] transition-colors"
                            title="Editar usuario"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            disabled={isCurrent}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#252D38] flex items-center justify-between text-xs text-[#94A3B8]">
            <span>
              Página <strong className="text-[#F1F5F9]">{page}</strong> de <strong className="text-[#F1F5F9]">{totalPages}</strong> ({totalCount} usuarios)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nuevo Usuario"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Nombre de Usuario *"
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
            placeholder="ej. jrodriguez"
            required
          />

          <Input
            label="Nombre Completo *"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            placeholder="ej. Juan Rodríguez"
            required
          />

          <Input
            label="Correo Electrónico"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            placeholder="juan@empresa.local"
          />

          <Input
            label="Contraseña Inicial *"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            placeholder="••••••••"
            required
          />

          <Select
            label="Rol en la Plataforma *"
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
            options={[
              { value: 'VIEWER', label: 'Lector (Solo Consulta)' },
              { value: 'TECHNICIAN', label: 'Técnico de Red (Operación & Discovery)' },
              { value: 'ADMIN', label: 'Administrador Completo (Acceso Total)' },
            ]}
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="mustChangePasswordCheck"
              checked={createForm.mustChangePassword}
              onChange={(e) => setCreateForm({ ...createForm, mustChangePassword: e.target.checked })}
              className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4] focus:ring-0"
            />
            <label htmlFor="mustChangePasswordCheck" className="text-xs text-[#94A3B8] cursor-pointer">
              Exigir cambio de contraseña en el primer inicio de sesión
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="cyan" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Editar Usuario: ${selectedUser?.username}`}
        maxWidth="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Nombre Completo *"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />

          <Input
            label="Correo Electrónico"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          />

          <Select
            label="Rol en la Plataforma *"
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
            options={[
              { value: 'VIEWER', label: 'Lector (Solo Consulta)' },
              { value: 'TECHNICIAN', label: 'Técnico de Red (Operación & Discovery)' },
              { value: 'ADMIN', label: 'Administrador Completo (Acceso Total)' },
            ]}
          />

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4] focus:ring-0"
              />
              <label htmlFor="editIsActive" className="text-xs text-[#F1F5F9] cursor-pointer font-medium">
                Usuario Activo
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editMustChange"
                checked={editForm.mustChangePassword}
                onChange={(e) => setEditForm({ ...editForm, mustChangePassword: e.target.checked })}
                className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4] focus:ring-0"
              />
              <label htmlFor="editMustChange" className="text-xs text-[#94A3B8] cursor-pointer">
                Exigir cambio de contraseña en próximo login
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="cyan" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Restablecer Contraseña: ${selectedUser?.username}`}
        maxWidth="md"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <p className="text-xs text-[#94A3B8]">
            Introduce la nueva contraseña administrativa para el usuario <strong className="text-[#F1F5F9]">{selectedUser?.username}</strong>.
          </p>

          <Input
            label="Nueva Contraseña *"
            type="password"
            value={passwordForm.password}
            onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
            placeholder="••••••••"
            required
            autoFocus
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="resetMustChange"
              checked={passwordForm.mustChangePassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, mustChangePassword: e.target.checked })}
              className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4] focus:ring-0"
            />
            <label htmlFor="resetMustChange" className="text-xs text-[#94A3B8] cursor-pointer">
              Exigir al usuario cambiarla en su siguiente acceso
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
            <Button type="button" variant="secondary" onClick={() => setIsPasswordModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="cyan" disabled={isSubmitting}>
              {isSubmitting ? 'Restableciendo...' : 'Restablecer Contraseña'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Cuenta de Usuario"
        message={`¿Estás seguro de que deseas eliminar permanentemente al usuario "${deleteTarget?.username}" (${deleteTarget?.name})? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Usuario"
        isDestructive
        isLoading={isSubmitting}
      />
    </div>
  );
};
