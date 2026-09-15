import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Activity, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, Loader2, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button.js';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Por favor introduce el usuario y la contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login({ username: username.trim(), password });
    } catch (err: any) {
      setErrorMessage(err.message || 'Credenciales incorrectas o error en el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] flex flex-col justify-center items-center p-4 selection:bg-[#06B6D4] selection:text-[#0B0F14]">
      {/* Background Decorative Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#06B6D4]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[#3B82F6]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] shadow-xl shadow-cyan-500/20 mb-4">
            <Activity className="w-8 h-8 text-[#0B0F14]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
            InfraInventory
          </h1>
          <p className="text-xs uppercase font-mono tracking-widest text-[#06B6D4] font-semibold mt-1">
            NOC & Infrastructure Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0F141B] border border-[#252D38] rounded-2xl p-7 shadow-2xl shadow-black/60 backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-[#F1F5F9] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#06B6D4]" />
              Iniciar Sesión
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Introduce tus credenciales para acceder a la consola del NOC
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Usuario o Correo Electrónico
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoFocus
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F1F5F9] transition-colors p-1"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              variant="cyan"
              className="w-full py-2.5 mt-2 justify-center font-semibold text-xs shadow-lg shadow-cyan-500/10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Autenticando...
                </>
              ) : (
                'Acceder a la Plataforma'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-[#64748B]">
          InfraInventory &copy; 2026 — Plataforma Segura de Operaciones de Red
        </div>
      </div>
    </div>
  );
};
