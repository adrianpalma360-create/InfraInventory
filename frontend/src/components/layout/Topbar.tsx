import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, LogOut, User, ShieldCheck, Settings, ChevronDown, CheckCircle2, Shield, Info } from 'lucide-react';
import { NavigationTab } from './Sidebar.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface TopbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  breadcrumbs?: string[];
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  breadcrumbs,
}) => {
  const { user, logout, hasPermission } = useAuth();
  const toast = useToast();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const tabTitles: Record<NavigationTab, string> = {
    dashboard: 'Panel de Control Principal',
    automation: 'Automatización & Workflows / Panel NOC',
    'automation-dashboard': 'Automatización / Panel NOC & Telemetría',
    'automation-workflows': 'Automatización / Workflows & Visual Runner',
    'automation-runs': 'Automatización / Historial de Ejecuciones & Logs',
    'automation-actions': 'Automatización / Catálogo de Acciones & Allowlist',
    'automation-approvals': 'Automatización / Aprobaciones (Principio de 4 Ojos)',
    'automation-agents': 'Automatización / Agentes de Infraestructura',
    'automation-policies': 'Automatización / Políticas & Reglas de Seguridad',
    ai: 'InfraInventory AI / Asistente Inteligente',
    'ai-assistant': 'InfraInventory AI / Chat Inteligente Asistente',
    'ai-diagnostics': 'InfraInventory AI / Diagnóstico 360° de Infraestructura',
    'ai-reports': 'InfraInventory AI / Generador de Informes Técnicos',
    'ai-dashboard': 'InfraInventory AI / Panel de Control & Auditoría de Consultas',
    'ai-settings': 'InfraInventory AI / Ajustes de Proveedor & Modelo LLM',
    machines: 'Inventario / Máquinas & Equipos',
    networks: 'Inventario / Redes & Subredes',
    ips: 'IPAM / Direccionamiento IP & Conflictos',
    ipam: 'Módulo IPAM / Subredes & Calculadora CIDR',
    'ipam-vlans': 'IPAM / Gestión Integral de VLANs',
    ports: 'Inventario / Matriz de Puertos & Firewall',
    services: 'Inventario / Catálogo de Servicios',
    locations: 'Gestión de Ubicaciones Físicas & Racks',
    groups: 'Gestión de Grupos de Hosts',
    tags: 'Gestión de Tags & Etiquetas',
    topology: 'Topología & Mapa de Infraestructura',
    assets: 'Gestión de Activos IT & Hardware',
    'assets-dashboard': 'Activos IT / Dashboard & Resumen Económico',
    'assets-inventory': 'Activos IT / Inventario de Hardware',
    'assets-warranties': 'Activos IT / Garantías & Mantenimiento',
    'assets-licenses': 'Activos IT / Licencias de Software',
    'assets-suppliers': 'Activos IT / Directorio de Proveedores',
    'assets-purchases': 'Activos IT / Compras & Facturas',
    'assets-racks': 'Activos IT / Elevación de Racks 42U',
    operations: 'Gestión Operativa & Service Desk',
    'operations-dashboard': 'Gestión Operativa / Dashboard & SLAs',
    tickets: 'Gestión Operativa / Tickets & Helpdesk',
    maintenance: 'Gestión Operativa / Mantenimiento & Ventanas',
    'infra-changes': 'Gestión Operativa / Gestión de Cambios (RFC)',
    tasks: 'Gestión Operativa / Tareas & Checklists',
    slas: 'Gestión Operativa / Catálogo de SLAs & Horarios',
    runbooks: 'Gestión Operativa / Runbooks & Procedimientos',
    calendar: 'Gestión Operativa / Calendario Unificado',
    discovery: 'Descubrimiento de Red (Discovery)',
    'monitoring-status': 'Monitorización / Estado de Infraestructura',
    'monitoring-ports': 'Monitorización / Estado de Puertos en Vivo',
    'monitoring-services': 'Monitorización / Servicios en Tiempo Real',
    'monitoring-problems': 'Monitorización / Problemas & Degradaciones',
    graphs: 'Métricas & Gráficos en Tiempo Real',
    changes: 'Historial de Auditoría & Cambios',
    alerts: 'Centro de Alertas & Notificaciones',
    users: 'Gestión de Usuarios, Roles & Permisos',
    profile: 'Mi Perfil & Seguridad de Sesión',
    settings: 'Configuración del Sistema',
    about: 'Acerca de InfraInventory & Licencia',
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    try {
      await logout();
      toast.info('Sesión finalizada', 'Has cerrado sesión correctamente.');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#06B6D4]/10 text-[#06B6D4] font-semibold border border-[#06B6D4]/30">ADMIN</span>;
      case 'TECHNICIAN':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#22C55E]/10 text-[#22C55E] font-semibold border border-[#22C55E]/30">TECH</span>;
      case 'VIEWER':
      default:
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#64748B]/10 text-[#94A3B8] font-semibold border border-[#64748B]/30">VIEWER</span>;
    }
  };

  return (
    <header className="h-16 bg-[#0F141B]/90 backdrop-blur-md border-b border-[#252D38] px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[#64748B] font-medium">InfraInventory</span>
        <span className="text-[#252D38]">/</span>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              <span className={idx === breadcrumbs.length - 1 ? 'text-[#F1F5F9] font-semibold' : 'text-[#94A3B8]'}>
                {b}
              </span>
              {idx < breadcrumbs.length - 1 && <span className="text-[#252D38]">/</span>}
            </React.Fragment>
          ))
        ) : (
          <span className="text-[#F1F5F9] font-semibold">{tabTitles[currentTab] || currentTab}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar máquina, IP, puerto o servicio..."
            className="w-full bg-[#151B23] border border-[#252D38] rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#94A3B8] hover:text-[#F1F5F9] bg-[#1A212B] px-1.5 py-0.5 rounded"
            >
              ESC
            </button>
          )}
        </div>

        {/* NOC Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            title="Notificaciones del NOC"
            className="relative p-2 rounded-lg text-[#94A3B8] hover:bg-[#151B23] hover:text-[#F1F5F9] transition-colors border border-transparent hover:border-[#252D38]"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0F141B] border border-[#252D38] rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#252D38] text-xs font-semibold text-[#F1F5F9]">
                <span>Notificaciones del NOC</span>
                <span className="text-[10px] text-[#06B6D4] bg-[#06B6D4]/10 px-1.5 py-0.5 rounded">En tiempo real</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-[#151B23] border border-[#252D38] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-[#F1F5F9]">Plataforma Activa</div>
                    <div className="text-[11px] text-[#94A3B8]">Motor de autenticación y control de acceso inicializado.</div>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#151B23] border border-[#252D38] flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#06B6D4] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-[#F1F5F9]">Discovery Microservice</div>
                    <div className="text-[11px] text-[#94A3B8]">Escáner de puertos TCP y reverse DNS operativo.</div>
                  </div>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-[#252D38] text-center">
                <button
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    onSelectTab('changes');
                  }}
                  className="text-[11px] text-[#06B6D4] hover:underline"
                >
                  Ver Historial de Auditoría & Cambios &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 pl-3 border-l border-[#252D38] text-left hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1A212B] border border-[#252D38] flex items-center justify-center text-[#06B6D4] font-semibold text-xs font-mono shadow-sm">
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'PI'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium text-[#F1F5F9] leading-tight flex items-center gap-1.5">
                <span>{user?.name || 'Admin NOC'}</span>
                {getRoleBadge(user?.role)}
              </div>
              <div className="text-[10px] font-mono text-[#64748B]">{user?.email || `@${user?.username}`}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#0F141B] border border-[#252D38] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2 border-b border-[#252D38] text-xs">
                <div className="font-semibold text-[#F1F5F9]">{user?.name}</div>
                <div className="text-[10px] font-mono text-[#64748B]">@{user?.username} ({user?.role})</div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSelectTab('profile');
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] transition-colors text-left"
                >
                  <User className="w-3.5 h-3.5 text-[#06B6D4]" />
                  Mi Perfil & Seguridad
                </button>

                {hasPermission('USER_READ') && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSelectTab('users');
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] transition-colors text-left"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                    Gestión de Usuarios
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSelectTab('settings');
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23] transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-[#94A3B8]" />
                  Configuración
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSelectTab('about');
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#94A3B8] hover:text-[#06B6D4] hover:bg-[#151B23] transition-colors text-left"
                >
                  <Info className="w-3.5 h-3.5 text-[#06B6D4]" />
                  Acerca de InfraInventory
                </button>
              </div>

              <div className="border-t border-[#252D38] pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
