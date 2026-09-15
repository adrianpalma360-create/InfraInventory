import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { api } from '../../services/api.js';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { ShieldAlert, AlertCircle, Loader2 } from 'lucide-react';

interface MustChangePasswordModalProps {
  isOpen: boolean;
}

export const MustChangePasswordModal: React.FC<MustChangePasswordModalProps> = ({ isOpen }) => {
  const { refreshUser } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success('Contraseña actualizada', 'Tu contraseña ha sido establecida correctamente.');
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Non-dismissible
      title="Cambio de Contraseña Obligatorio"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-300">Primer inicio de sesión detectado</div>
            <p className="mt-0.5 text-amber-200/80">
              Por motivos de seguridad, debes cambiar tu contraseña inicial antes de continuar utilizando la plataforma.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Contraseña Actual *"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Introduce tu contraseña actual"
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

          <div className="pt-2">
            <Button
              type="submit"
              variant="cyan"
              disabled={isLoading}
              className="w-full justify-center py-2.5 font-semibold text-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Actualizando Contraseña...
                </>
              ) : (
                'Guardar Nueva Contraseña y Acceder'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
