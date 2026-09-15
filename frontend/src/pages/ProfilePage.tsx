import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import {
  User,
  Key,
  Mail,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Calendar,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, permissions, refreshUser } = useAuth();
  const toast = useToast();

  // Profile info form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nombre obligatorio', 'Debes introducir tu nombre completo.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        email: email.trim() || null,
      });
      toast.success('Perfil actualizado', 'Tus datos se han guardado correctamente.');
      await refreshUser();
    } catch (err: any) {
      toast.error('Error al actualizar perfil', err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Todos los campos son obligatorios');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmación de la nueva contraseña no coincide');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      toast.success('Contraseña actualizada', 'Tu contraseña se ha cambiado correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    } catch (err: any) {
      setPasswordError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador Completo (NOC Admin)';
      case 'TECHNICIAN':
        return 'Técnico de Redes & Operaciones';
      case 'VIEWER':
      default:
        return 'Lector / Auditoría (Solo Lectura)';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
          <User className="w-5 h-5 text-[#06B6D4]" />
          Perfil de Usuario & Seguridad
        </h1>
        <p className="text-xs text-[#94A3B8] mt-0.5">
          Gestión de credenciales personales, información de cuenta y privilegios asignados
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#252D38]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] flex items-center justify-center font-bold text-2xl text-[#0B0F14] font-mono shadow-lg shadow-cyan-500/20">
              {user?.username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-[#F1F5F9]">{user?.name}</h2>
                <span className="font-mono text-xs text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/30 px-2 py-0.5 rounded">
                  @{user?.username}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">{getRoleLabel(user?.role)}</p>
            </div>
          </div>

          <div className="text-xs text-[#64748B] sm:text-right space-y-1 font-mono">
            <div className="flex items-center sm:justify-end gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Último acceso: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('es-ES') : 'Sesión activa'}</span>
            </div>
            <div className="flex items-center sm:justify-end gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Miembro desde: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES') : '—'}</span>
            </div>
          </div>
        </div>

        {/* Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          {/* Form 1: Edit Profile Details */}
          <div>
            <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-[#06B6D4]" />
              Información de la Cuenta
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                  Nombre de Usuario (Identificador)
                </label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg px-3.5 py-2 text-xs text-[#64748B] font-mono cursor-not-allowed"
                />
              </div>

              <Input
                label="Nombre Completo *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Correo Electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.correo@empresa.local"
              />

              <Button type="submit" variant="cyan" size="sm" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Guardando...
                  </>
                ) : (
                  'Actualizar Datos'
                )}
              </Button>
            </form>
          </div>

          {/* Form 2: Change Password */}
          <div>
            <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-[#22C55E]" />
              Cambiar Contraseña
            </h3>

            {passwordError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="Contraseña Actual *"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Input
                label="Nueva Contraseña (mínimo 6 caracteres) *"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Input
                label="Confirmar Nueva Contraseña *"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Button type="submit" variant="secondary" size="sm" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Actualizando...
                  </>
                ) : (
                  'Guardar Nueva Contraseña'
                )}
              </Button>
            </form>
          </div>
        </div>
      </Card>

      {/* Permissions List Card */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-[#06B6D4]" />
          Matriz de Privilegios y Capacidades Asignadas
        </h3>
        <p className="text-xs text-[#94A3B8] mb-4">
          Permisos de acceso determinados según tu rol de seguridad ({user?.role})
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {permissions.map((perm) => (
            <div
              key={perm}
              className="p-2.5 rounded-lg bg-[#0F141B] border border-[#252D38] flex items-center gap-2 text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
              <span className="font-mono text-[#F1F5F9] text-[11px]">{perm}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
