import React, { useState } from 'react';
import {
  LayoutDashboard,
  Boxes,
  Server,
  Network,
  Binary,
  Cpu,
  Layers,
  FolderTree,
  Radar,
  Activity,
  HeartPulse,
  Radio,
  AlertTriangle,
  LineChart,
  History,
  Users,
  Settings,
  Info,
  Tag as TagIcon,
  MapPin,
  Calculator,
  ChevronDown,
  ChevronRight,
  Bell,
  GitFork,
  Laptop,
  ShieldCheck,
  Key,
  Building2,
  ShoppingCart,
  Sparkles,
  Ticket as TicketIcon,
  Wrench,
  GitPullRequest,
  CheckSquare,
  BookOpen,
  Calendar as CalendarIcon,
  Clock,
  Bot,
  BrainCircuit,
  FileText,
  Sliders,
  Zap,
  Terminal,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export type NavigationTab =
  | 'dashboard'
  | 'automation'
  | 'automation-dashboard'
  | 'automation-workflows'
  | 'automation-runs'
  | 'automation-actions'
  | 'automation-approvals'
  | 'automation-agents'
  | 'automation-policies'
  | 'ai'
  | 'ai-assistant'
  | 'ai-dashboard'
  | 'ai-diagnostics'
  | 'ai-reports'
  | 'ai-settings'
  | 'machines'
  | 'networks'
  | 'ips'
  | 'ipam'
  | 'ipam-vlans'
  | 'ports'
  | 'services'
  | 'locations'
  | 'groups'
  | 'tags'
  | 'topology'
  | 'assets'
  | 'assets-dashboard'
  | 'assets-inventory'
  | 'assets-warranties'
  | 'assets-licenses'
  | 'assets-suppliers'
  | 'assets-purchases'
  | 'assets-racks'
  | 'operations'
  | 'operations-dashboard'
  | 'tickets'
  | 'maintenance'
  | 'infra-changes'
  | 'tasks'
  | 'slas'
  | 'runbooks'
  | 'calendar'
  | 'discovery'
  | 'monitoring-status'
  | 'monitoring-ports'
  | 'monitoring-services'
  | 'monitoring-problems'
  | 'graphs'
  | 'changes'
  | 'alerts'
  | 'users'
  | 'profile'
  | 'settings'
  | 'about';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  activeAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeAlertsCount = 0,
}) => {
  const { user, hasPermission } = useAuth();

  // Collapsible state for hierarchical sections (collapsed by default)
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);

  const isAutomationActive = [
    'automation',
    'automation-dashboard',
    'automation-workflows',
    'automation-runs',
    'automation-actions',
    'automation-approvals',
    'automation-agents',
    'automation-policies',
  ].includes(currentTab);
  const isAIActive = [
    'ai',
    'ai-assistant',
    'ai-dashboard',
    'ai-diagnostics',
    'ai-reports',
    'ai-settings',
  ].includes(currentTab);
  const isInventoryActive = ['machines', 'networks', 'ips', 'ipam', 'ipam-vlans', 'ports', 'services'].includes(currentTab);
  const isAssetsActive = [
    'assets',
    'assets-dashboard',
    'assets-inventory',
    'assets-warranties',
    'assets-licenses',
    'assets-suppliers',
    'assets-purchases',
    'assets-racks',
  ].includes(currentTab);
  const isOperationsActive = [
    'operations',
    'operations-dashboard',
    'tickets',
    'maintenance',
    'infra-changes',
    'tasks',
    'slas',
    'runbooks',
    'calendar',
  ].includes(currentTab);
  const isMonitoringActive = ['monitoring-status', 'monitoring-ports', 'monitoring-services', 'monitoring-problems'].includes(currentTab);

  return (
    <aside className="w-64 bg-[#0F141B] border-r border-[#252D38] flex flex-col flex-shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-[#252D38]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#8B5CF6] via-[#3B82F6] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Bot className="w-5 h-5 text-[#0B0F14]" />
        </div>
        <div>
          <div className="font-bold tracking-tight text-[#F1F5F9] text-base leading-tight flex items-center gap-1.5">
            InfraInventory
          </div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#06B6D4] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
            NOC &bull; GESTIÓN INTEGRAL
          </div>
        </div>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {/* 1. Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
            currentTab === 'dashboard'
              ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
              : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-[#06B6D4]' : 'text-[#64748B]'}`} />
          <span>Dashboard</span>
        </button>

        {/* ⚡ Automatización & Workflows */}
        <div className="pt-2">
          <button
            onClick={() => setIsAutomationOpen(!isAutomationOpen)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              isAutomationActive ? 'text-amber-400' : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Automatización</span>
            </span>
            {isAutomationOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {isAutomationOpen && (
            <div className="pl-3.5 mt-1 space-y-0.5 border-l border-amber-500/30 ml-3.5">
              <button
                onClick={() => onSelectTab('automation-dashboard')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'automation' || currentTab === 'automation-dashboard'
                    ? 'bg-[#151B23] text-amber-400 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Panel NOC & Métricas</span>
              </button>

              <button
                onClick={() => onSelectTab('automation-workflows')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'automation-workflows'
                    ? 'bg-[#151B23] text-amber-400 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
                <span>Workflows & Runner</span>
              </button>

              <button
                onClick={() => onSelectTab('automation-runs')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'automation-runs'
                    ? 'bg-[#151B23] text-amber-400 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Historial Ejecuciones</span>
              </button>

              <button
                onClick={() => onSelectTab('automation-actions')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'automation-actions'
                    ? 'bg-[#151B23] text-amber-400 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Catálogo & Allowlist</span>
              </button>

              <button
                onClick={() => onSelectTab('automation-approvals')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'automation-approvals'
                    ? 'bg-[#151B23] text-amber-400 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                <span>Aprobaciones (4-Ojos)</span>
              </button>

              <button
                onClick={() => onSelectTab('automation-agents')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'automation-agents'
                    ? 'bg-[#151B23] text-amber-400 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>Agentes Conectados</span>
              </button>

              <button
                onClick={() => onSelectTab('automation-policies')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'automation-policies'
                    ? 'bg-[#151B23] text-amber-400 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Políticas de Seguridad</span>
              </button>
            </div>
          )}
        </div>

        {/* 🤖 InfraInventory AI (Asistente Inteligente) */}
        <div className="pt-2">
          <button
            onClick={() => setIsAIOpen(!isAIOpen)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              isAIActive ? 'text-[#C084FC]' : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C084FC] animate-pulse" />
              <span>Asistente IA</span>
            </span>
            {isAIOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {isAIOpen && (
            <div className="pl-3.5 mt-1 space-y-0.5 border-l border-purple-500/30 ml-3.5">
              <button
                onClick={() => onSelectTab('ai-assistant')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'ai' || currentTab === 'ai-assistant'
                    ? 'bg-[#151B23] text-[#C084FC] font-semibold border border-[#C084FC]/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>Chat Asistente</span>
              </button>

              <button
                onClick={() => onSelectTab('ai-diagnostics')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'ai-diagnostics'
                    ? 'bg-[#151B23] text-[#C084FC] font-semibold border border-[#C084FC]/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
                <span>Diagnóstico 360°</span>
              </button>

              <button
                onClick={() => onSelectTab('ai-reports')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'ai-reports'
                    ? 'bg-[#151B23] text-[#C084FC] font-semibold border border-[#C084FC]/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Informes Técnicos</span>
              </button>

              <button
                onClick={() => onSelectTab('ai-dashboard')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'ai-dashboard'
                    ? 'bg-[#151B23] text-[#C084FC] font-semibold border border-[#C084FC]/30 shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Panel & Auditoría</span>
              </button>

              {hasPermission('AI_CONFIG') && (
                <button
                  onClick={() => onSelectTab('ai-settings')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                    currentTab === 'ai-settings'
                      ? 'bg-[#151B23] text-[#C084FC] font-semibold border border-[#C084FC]/30 shadow-sm'
                      : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ajustes Modelo IA</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. 📦 Inventario & IPAM (Hierarchical Parent) */}
        <div className="pt-2">
          <button
            onClick={() => setIsInventoryOpen(!isInventoryOpen)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              isInventoryActive ? 'text-[#06B6D4]' : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Boxes className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Inventario & IPAM</span>
            </span>
            {isInventoryOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {isInventoryOpen && (
            <div className="pl-3.5 mt-1 space-y-0.5 border-l border-[#252D38]/80 ml-3.5">
              <button
                onClick={() => onSelectTab('machines')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'machines'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Máquinas</span>
              </button>

              <button
                onClick={() => onSelectTab('ipam')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'ipam'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>Módulo IPAM & Redes</span>
              </button>

              <button
                onClick={() => onSelectTab('ipam-vlans')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'ipam-vlans'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Network className="w-3.5 h-3.5 text-[#64748B]" />
                <span>VLANs</span>
              </button>

              <button
                onClick={() => onSelectTab('ips')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'ips'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Binary className="w-3.5 h-3.5 text-[#64748B]" />
                <span>IPs & Conflictos</span>
              </button>

              <button
                onClick={() => onSelectTab('ports')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'ports'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Puertos</span>
              </button>

              <button
                onClick={() => onSelectTab('services')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'services'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Servicios</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. 🗂️ Grupos & 🏷️ Tags */}
        <div className="pt-2 space-y-1">
          <button
            onClick={() => onSelectTab('groups')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
              currentTab === 'groups'
                ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
                : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
            }`}
          >
            <FolderTree className={`w-4 h-4 ${currentTab === 'groups' ? 'text-[#06B6D4]' : 'text-purple-400'}`} />
            <span>Grupos</span>
          </button>

          <button
            onClick={() => onSelectTab('tags')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
              currentTab === 'tags'
                ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
                : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
            }`}
          >
            <TagIcon className={`w-4 h-4 ${currentTab === 'tags' ? 'text-[#06B6D4]' : 'text-pink-400'}`} />
            <span>Tags / Etiquetas</span>
          </button>

          <button
            onClick={() => onSelectTab('locations')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
              currentTab === 'locations'
                ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
                : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
            }`}
          >
            <MapPin className={`w-4 h-4 ${currentTab === 'locations' ? 'text-[#06B6D4]' : 'text-emerald-400'}`} />
            <span>Ubicaciones (Locations)</span>
          </button>

          <button
            onClick={() => onSelectTab('topology')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
              currentTab === 'topology'
                ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
                : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
            }`}
          >
            <GitFork className={`w-4 h-4 ${currentTab === 'topology' ? 'text-[#06B6D4]' : 'text-cyan-400'}`} />
            <span>Topología de Red</span>
          </button>
        </div>

        {/* 4. 🏢 Activos IT */}
        <div className="pt-2">
          <button
            onClick={() => setIsAssetsOpen(!isAssetsOpen)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              isAssetsActive ? 'text-[#06B6D4]' : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Laptop className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>Activos IT</span>
            </span>
            {isAssetsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {isAssetsOpen && (
            <div className="pl-3.5 mt-1 space-y-0.5 border-l border-[#252D38]/80 ml-3.5">
              <button
                onClick={() => onSelectTab('assets-dashboard')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'assets-dashboard' || currentTab === 'assets'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>Dashboard & Métricas</span>
              </button>

              <button
                onClick={() => onSelectTab('assets-inventory')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'assets-inventory'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-blue-400" />
                <span>Inventario de Activos</span>
              </button>

              <button
                onClick={() => onSelectTab('assets-warranties')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'assets-warranties'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Garantías & SLAs</span>
              </button>

              <button
                onClick={() => onSelectTab('assets-licenses')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'assets-licenses'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-purple-400" />
                <span>Licencias de Software</span>
              </button>

              <button
                onClick={() => onSelectTab('assets-suppliers')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'assets-suppliers'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-orange-400" />
                <span>Proveedores</span>
              </button>

              <button
                onClick={() => onSelectTab('assets-purchases')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'assets-purchases'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-teal-400" />
                <span>Compras & Facturas</span>
              </button>

              <button
                onClick={() => onSelectTab('assets-racks')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'assets-racks'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-yellow-400" />
                <span>Vista de Racks (42U)</span>
              </button>
            </div>
          )}
        </div>

        {/* 4.5. 🛠️ GESTIÓN OPERATIVA & SERVICE DESK */}
        <div className="pt-2">
          <button
            onClick={() => setIsOperationsOpen(!isOperationsOpen)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              isOperationsActive ? 'text-[#06B6D4]' : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>Operaciones</span>
            </span>
            {isOperationsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {isOperationsOpen && (
            <div className="pl-3.5 mt-1 space-y-0.5 border-l border-[#252D38]/80 ml-3.5">
              <button
                onClick={() => onSelectTab('operations-dashboard')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'operations-dashboard' || currentTab === 'operations'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>Dashboard Operativo</span>
              </button>

              <button
                onClick={() => onSelectTab('tickets')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'tickets'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <TicketIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Tickets & Incidencias</span>
              </button>

              <button
                onClick={() => onSelectTab('maintenance')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'maintenance'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mantenimiento Preventivo</span>
              </button>

              <button
                onClick={() => onSelectTab('infra-changes')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'infra-changes'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <GitPullRequest className="w-3.5 h-3.5 text-amber-400" />
                <span>Gestión de Cambios (RFC)</span>
              </button>

              <button
                onClick={() => onSelectTab('tasks')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'tasks'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tareas Operativas</span>
              </button>

              <button
                onClick={() => onSelectTab('slas')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'slas'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-pink-400" />
                <span>Gestión de SLAs</span>
              </button>

              <button
                onClick={() => onSelectTab('runbooks')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'runbooks'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                <span>Catálogo de Runbooks</span>
              </button>

              <button
                onClick={() => onSelectTab('calendar')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'calendar'
                    ? 'bg-[#151B23] text-[#06B6D4] font-medium border border-[#06B6D4]/30 font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-teal-400" />
                <span>Calendario Unificado</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. 📡 Discovery */}
        <button
          onClick={() => onSelectTab('discovery')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
            currentTab === 'discovery'
              ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
              : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
          }`}
        >
          <Radar className={`w-4 h-4 ${currentTab === 'discovery' ? 'text-[#06B6D4]' : 'text-[#06B6D4]'}`} />
          <span>Discovery</span>
        </button>

        {/* 5. 📊 Monitorización (Hierarchical Parent) */}
        <div className="pt-2">
          <button
            onClick={() => setIsMonitoringOpen(!isMonitoringOpen)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              isMonitoringActive ? 'text-[#22C55E]' : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <span className="flex items-center gap-2">
              <HeartPulse className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Monitorización</span>
            </span>
            {isMonitoringOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {isMonitoringOpen && (
            <div className="pl-3.5 mt-1 space-y-0.5 border-l border-[#252D38]/80 ml-3.5">
              <button
                onClick={() => onSelectTab('monitoring-status')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'monitoring-status'
                    ? 'bg-[#151B23] text-[#22C55E] font-medium border border-[#22C55E]/30'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>Estado</span>
              </button>

              <button
                onClick={() => onSelectTab('monitoring-ports')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'monitoring-ports'
                    ? 'bg-[#151B23] text-[#22C55E] font-medium border border-[#22C55E]/30'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Puertos</span>
              </button>

              <button
                onClick={() => onSelectTab('monitoring-services')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'monitoring-services'
                    ? 'bg-[#151B23] text-[#22C55E] font-medium border border-[#22C55E]/30'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Servicios</span>
              </button>

              <button
                onClick={() => onSelectTab('monitoring-problems')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all text-left ${
                  currentTab === 'monitoring-problems'
                    ? 'bg-[#151B23] text-[#EF4444] font-medium border border-[#EF4444]/30'
                    : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Problemas</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. 📈 Gráficos */}
        <div className="pt-2">
          <button
            onClick={() => onSelectTab('graphs')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
              currentTab === 'graphs'
                ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
                : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
            }`}
          >
            <LineChart className={`w-4 h-4 ${currentTab === 'graphs' ? 'text-[#06B6D4]' : 'text-[#06B6D4]'}`} />
            <span>Gráficos</span>
          </button>
        </div>

        {/* 7. 🔄 Cambios */}
        <button
          onClick={() => onSelectTab('changes')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
            currentTab === 'changes'
              ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
              : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
          }`}
        >
          <History className={`w-4 h-4 ${currentTab === 'changes' ? 'text-[#06B6D4]' : 'text-[#F59E0B]'}`} />
          <span>Cambios</span>
        </button>

        {/* 8. 🔔 Alertas */}
        <button
          onClick={() => onSelectTab('alerts')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
            currentTab === 'alerts'
              ? 'bg-[#151B23] text-[#EF4444] border border-[#EF4444]/30 shadow-sm font-semibold'
              : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Bell className={`w-4 h-4 ${currentTab === 'alerts' ? 'text-[#EF4444]' : 'text-[#EF4444]'}`} />
            <span>Alertas</span>
          </span>
          {activeAlertsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 animate-pulse font-mono">
              {activeAlertsCount}
            </span>
          )}
        </button>

        {/* 9. 👥 Usuarios */}
        {hasPermission('USER_READ') && (
          <button
            onClick={() => onSelectTab('users')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
              currentTab === 'users'
                ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
                : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
            }`}
          >
            <Users className={`w-4 h-4 ${currentTab === 'users' ? 'text-[#06B6D4]' : 'text-[#64748B]'}`} />
            <span>Usuarios</span>
          </button>
        )}

        {/* 10. ⚙️ Configuración */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
            currentTab === 'settings'
              ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
              : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
          }`}
        >
          <Settings className={`w-4 h-4 ${currentTab === 'settings' ? 'text-[#06B6D4]' : 'text-[#64748B]'}`} />
          <span>Configuración</span>
        </button>

        {/* 11. ℹ️ Acerca de */}
        <button
          onClick={() => onSelectTab('about')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
            currentTab === 'about'
              ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm font-semibold'
              : 'text-[#94A3B8] hover:bg-[#151B23]/70 hover:text-[#F1F5F9] border border-transparent'
          }`}
        >
          <Info className={`w-4 h-4 ${currentTab === 'about' ? 'text-[#06B6D4]' : 'text-[#64748B]'}`} />
          <span>Acerca de</span>
        </button>
      </div>

      {/* User Session Footer */}
      <div className="p-3.5 border-t border-[#252D38] bg-[#0B0F14]/60">
        <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-1">
          <button
            onClick={() => onSelectTab('profile')}
            className="flex items-center gap-1.5 font-medium text-[#F1F5F9] hover:text-[#06B6D4] transition-colors truncate text-left"
          >
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse flex-shrink-0" />
            <span className="truncate">{user?.name || 'NOC Operator'}</span>
          </button>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#151B23] border border-[#252D38] text-[#06B6D4] font-semibold flex-shrink-0">
            {user?.role || 'OPERATOR'}
          </span>
        </div>
        <div className="text-[10px] text-[#64748B] truncate font-mono flex items-center justify-between">
          <span>@{user?.username || 'system'}</span>
          <span>PostgreSQL &bull; WS</span>
        </div>
      </div>
    </aside>
  );
};
