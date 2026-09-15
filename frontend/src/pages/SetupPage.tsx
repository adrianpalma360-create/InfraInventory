import React, { useState } from 'react';
import {
  Shield,
  Server,
  CheckCircle2,
  User,
  Lock,
  Mail,
  Building2,
  Globe,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '../services/api.js';
import { User as UserType, Permission } from '../types/index.js';

interface SetupPageProps {
  onComplete: (user: UserType, permissions: Permission[]) => void;
}

export const SetupPage: React.FC<SetupPageProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [name, setName] = useState('administrador');
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('admin@local.infra');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Optional General Settings
  const [organizationName, setOrganizationName] = useState('InfraInventory NOC');
  const [description, setDescription] = useState('Centro de Control y Gestión de Infraestructura');
  const [timezone, setTimezone] = useState('Europe/Madrid');
  const [language, setLanguage] = useState('es');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateStep2 = () => {
    setError(null);
    if (!name.trim()) {
      setError('Por favor, introduce el nombre del administrador.');
      return false;
    }
    if (!username.trim() || username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Introduce un correo electrónico válido.');
      return false;
    }
    if (!password || password.length < 8) {
      setError('La contraseña debe tener una longitud mínima de 8 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas introducidas no coinciden.');
      return false;
    }
    return true;
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      setStep(3);
    }
  };

  const handleFinalize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api.initializeSetup({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        organizationName: organizationName.trim(),
        description: description.trim(),
        timezone,
        language,
      });

      setStep(4);
      setTimeout(() => {
        onComplete(res.user, res.permissions);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al completar la instalación.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F1F5F9] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] shadow-xl shadow-cyan-500/20 mb-3.5">
            <Server className="w-7 h-7 text-[#0B0F14]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
            InfraInventory
          </h1>
          <p className="text-xs font-mono text-[#06B6D4] mt-0.5 tracking-wider uppercase">
            NOC & Infraestructure managment
          </p>
        </div>

        {/* Setup Card Container */}
        <div className="bg-[#151B23] border border-[#252D38] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm">
          {/* Progress Indicators */}
          <div className="flex items-center justify-between mb-8 px-2 border-b border-[#252D38] pb-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                  step >= 1 ? 'bg-[#06B6D4] text-[#0B0F14]' : 'bg-[#252D38] text-[#94A3B8]'
                }`}
              >
                1
              </span>
              <span className={`text-xs font-medium ${step >= 1 ? 'text-[#F1F5F9]' : 'text-[#64748B]'}`}>
                Bienvenida
              </span>
            </div>

            <div className="w-8 h-[1px] bg-[#252D38]" />

            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                  step >= 2 ? 'bg-[#06B6D4] text-[#0B0F14]' : 'bg-[#252D38] text-[#94A3B8]'
                }`}
              >
                2
              </span>
              <span className={`text-xs font-medium ${step >= 2 ? 'text-[#F1F5F9]' : 'text-[#64748B]'}`}>
                Administrador
              </span>
            </div>

            <div className="w-8 h-[1px] bg-[#252D38]" />

            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                  step >= 3 ? 'bg-[#06B6D4] text-[#0B0F14]' : 'bg-[#252D38] text-[#94A3B8]'
                }`}
              >
                3
              </span>
              <span className={`text-xs font-medium ${step >= 3 ? 'text-[#F1F5F9]' : 'text-[#64748B]'}`}>
                Ajustes
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: BIENVENIDA */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-cyan-500/10 text-[#06B6D4] mb-1">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-[#F1F5F9]">
                  Bienvenido a InfraInventory.
                </h2>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                  Vamos a preparar tu instalación. En los siguientes pasos configuraremos la cuenta principal de administración de forma segura.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3.5 rounded-xl bg-[#0F141B] border border-[#252D38] flex items-start gap-3">
                  <Shield className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#F1F5F9]">Instalación Limpia</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">Base de datos lista sin registros de prueba ni datos ficticios.</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0F141B] border border-[#252D38] flex items-start gap-3">
                  <Lock className="w-4 h-4 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#F1F5F9]">Seguridad Total</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">Tú defines tus propias credenciales y contraseña segura.</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CREAR ADMINISTRADOR */}
          {step === 2 && (
            <form onSubmit={handleNextFromStep2} className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">Cuenta de Administrador</h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Establece los datos de acceso para el usuario administrador del NOC.
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="administrador"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-[#0B0F14] border border-[#252D38] rounded-xl text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
                      Nombre de usuario (Login)
                    </label>
                    <div className="relative">
                      <span className="text-xs font-mono text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                        placeholder="admin"
                        required
                        className="w-full pl-8 pr-3 py-2 bg-[#0B0F14] border border-[#252D38] rounded-xl text-xs text-[#F1F5F9] font-mono focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@example.com"
                        required
                        className="w-full pl-9 pr-3 py-2 bg-[#0B0F14] border border-[#252D38] rounded-xl text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
                    Contraseña (mínimo 8 caracteres)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={8}
                      className="w-full pl-9 pr-10 py-2 bg-[#0B0F14] border border-[#252D38] rounded-xl text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={8}
                      className="w-full pl-9 pr-3 py-2 bg-[#0B0F14] border border-[#252D38] rounded-xl text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl bg-[#0F141B] hover:bg-[#1A212B] border border-[#252D38] text-xs text-[#94A3B8] hover:text-[#F1F5F9] flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: CONFIGURACIÓN GENERAL (OPCIONAL) */}
          {step === 3 && (
            <form onSubmit={handleFinalize} className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">Configuración General (Opcional)</h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Puedes personalizar el nombre del entorno NOC o mantener los valores predeterminados.
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
                    Nombre de la Organización / NOC
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="InfraInventory NOC"
                      className="w-full pl-9 pr-3 py-2 bg-[#0B0F14] border border-[#252D38] rounded-xl text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
                    Descripción del Entorno
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Gestión y monitoreo de infraestructura IT"
                    className="w-full px-3 py-2 bg-[#0B0F14] border border-[#252D38] rounded-xl text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
                      Zona Horaria
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#0B0F14] border border-[#252D38] rounded-xl text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
                      >
                        <option value="Europe/Madrid">Europe/Madrid (UTC+1/+2)</option>
                        <option value="UTC">UTC (Tiempo Universal)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="America/Mexico_City">America/Mexico_City (CST)</option>
                        <option value="America/Bogota">America/Bogota (COT)</option>
                        <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (ART)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
                      Idioma del Sistema
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#0B0F14] border border-[#252D38] rounded-xl text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl bg-[#0F141B] hover:bg-[#1A212B] border border-[#252D38] text-xs text-[#94A3B8] hover:text-[#F1F5F9] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] hover:opacity-90 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Configurando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finalizar Instalación</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: INSTALACIÓN FINALIZADA */}
          {step === 4 && (
            <div className="text-center py-8 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#F1F5F9]">¡Instalación Completada con Éxito!</h2>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Iniciando sesión segura y redirigiendo al Panel Principal...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#06B6D4] pt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cargando entorno NOC...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] font-mono text-[#64748B]">
          PostgreSQL &bull; Docker Environment &bull; InfraInventory Core
        </div>
      </div>
    </div>
  );
};
