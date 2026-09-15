import React from 'react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { APP_CONFIG } from '../config/appConfig.js';
import {
  Activity,
  Layers,
  Shield,
  Code2,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface AboutPageProps {
  onNavigateToDashboard?: () => void;
  onNavigateToSettings?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onNavigateToDashboard,
  onNavigateToSettings,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200 max-w-5xl mx-auto pb-10">
      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F141B] via-[#151B23] to-[#0F141B] border border-[#252D38] p-6 sm:p-8 shadow-2xl">
        {/* Glow effect background */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Main Application Logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] flex items-center justify-center shadow-xl shadow-cyan-500/20 border border-white/10 flex-shrink-0">
              <Activity className="w-9 h-9 sm:w-11 sm:h-11 text-[#0B0F14]" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F1F5F9]">
                  {APP_CONFIG.APP_NAME}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
                  Versión {APP_CONFIG.APP_VERSION}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30">
                  {APP_CONFIG.APP_VERSION_INFO.tag || 'Stable'}
                </span>
              </div>

              <p className="text-sm text-[#94A3B8] max-w-2xl leading-relaxed">
                {APP_CONFIG.APP_DESCRIPTION}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#06B6D4]" />
                  Build: <span className="font-mono text-[#94A3B8]">{APP_CONFIG.APP_VERSION_INFO.releaseCommit}</span>
                </span>
                <span>&bull;</span>
                <span>Fecha de Compilación: <span className="font-mono text-[#94A3B8]">{APP_CONFIG.APP_VERSION_INFO.buildDate}</span></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2.5 flex-shrink-0">
            {onNavigateToDashboard && (
              <Button variant="cyan" size="sm" onClick={onNavigateToDashboard} icon={<Activity className="w-4 h-4" />}>
                Ir al Dashboard
              </Button>
            )}
            {onNavigateToSettings && (
              <Button variant="secondary" size="sm" onClick={onNavigateToSettings} icon={<Lock className="w-4 h-4" />}>
                Configuración
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Author & Copyright Formal Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Author Card */}
        <Card className="p-6 bg-[#0F141B] border-[#252D38] relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#06B6D4] font-mono">
                Créditos & Autoría
              </span>
              <h2 className="text-xl font-bold text-[#F1F5F9] pt-1">
                Desarrollado por
              </h2>
              <div className="text-lg font-semibold text-[#06B6D4] font-sans">
                {APP_CONFIG.APP_AUTHOR}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#151B23] border border-[#252D38] flex items-center justify-center text-[#06B6D4]">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#252D38]/60 text-xs text-[#94A3B8] leading-relaxed">
            Diseñado y desarrollado como solución integral de monitorización y gestión de infraestructura de red para entornos corporativos y operaciones NOC.
          </div>
        </Card>

        {/* Legal & Copyright Card */}
        <Card className="p-6 bg-[#0F141B] border-[#252D38] relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#22C55E] font-mono">
                Propiedad Intelectual
              </span>
              <h2 className="text-xl font-bold text-[#F1F5F9] pt-1">
                Copyright & Licencia
              </h2>
              <div className="text-base font-semibold text-[#F1F5F9] font-mono">
                {APP_CONFIG.APP_COPYRIGHT}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#151B23] border border-[#252D38] flex items-center justify-center text-[#22C55E]">
              <Shield className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#252D38]/60 flex flex-col gap-1 text-xs text-[#94A3B8]">
            <span className="font-medium text-[#F1F5F9]">{APP_CONFIG.APP_COPYRIGHT_LEGAL}</span>
            <span className="text-[#64748B]">Queda prohibida la reproducción o distribución no autorizada de esta plataforma o parte de ella.</span>
          </div>
        </Card>
      </div>

      {/* Technology Stack Grid */}
      <Card className="p-6 bg-[#0F141B] border-[#252D38]">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[#252D38]">
          <Code2 className="w-5 h-5 text-[#06B6D4]" />
          <div>
            <h3 className="text-base font-bold text-[#F1F5F9]">Arquitectura & Tecnologías Utilizadas</h3>
            <p className="text-xs text-[#94A3B8]">Stack de ingeniería de software implementado en la plataforma</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {APP_CONFIG.TECH_STACK.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-[#151B23] border border-[#252D38] flex flex-col justify-between space-y-2 hover:border-[#06B6D4]/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                  {item.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#0B0F14] text-[#64748B] border border-[#252D38]">
                  Core
                </span>
              </div>
              <p className="text-xs font-mono text-[#94A3B8] leading-tight">
                {item.tech}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Modules Overview */}
      <Card className="p-6 bg-[#0F141B] border-[#252D38]">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[#252D38]">
          <Layers className="w-5 h-5 text-[#8B5CF6]" />
          <div>
            <h3 className="text-base font-bold text-[#F1F5F9]">Módulos y Capacidades del Sistema</h3>
            <p className="text-xs text-[#94A3B8]">Estructura de subsistemas integrados en InfraInventory</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {APP_CONFIG.MODULES.map((mod, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-[#151B23]/70 border border-[#252D38] flex items-start gap-3 hover:bg-[#151B23] transition-colors"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#F1F5F9]">{mod.title}</h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{mod.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bottom Security & Privacy Statement */}
      <div className="p-4 rounded-xl bg-[#151B23]/50 border border-[#252D38] flex items-center justify-between gap-4 text-xs text-[#64748B]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
          <span>
            Instancia configurada en modo seguro de producción. Todos los datos sensibles, credenciales y topología están protegidos.
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#94A3B8] flex-shrink-0">
          InfraInventory Versión {APP_CONFIG.APP_VERSION}
        </span>
      </div>
    </div>
  );
};

export default AboutPage;
