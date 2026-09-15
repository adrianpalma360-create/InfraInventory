import React, { useState, useEffect } from 'react';
import {
  Ticket as TicketIcon,
  Clock,
  Wrench,
  GitPullRequest,
  CheckSquare,
  BookOpen,
  Calendar as CalendarIcon,
  Plus,
  Search,
  TrendingUp,
  RefreshCw,
  Send,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  Ticket,
  SLA,
  Maintenance,
  OperationalTask,
  InfraChange,
  Runbook,
  OperationsStats,
  CalendarEvent,
  Machine,
  Asset,
} from '../types/index.js';

interface OperationsPageProps {
  initialTab?: string;
  onNavigateToMachine?: (machineId: string) => void;
}

export const OperationsPage: React.FC<OperationsPageProps> = ({
  initialTab = 'operations-dashboard',
}) => {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [stats, setStats] = useState<OperationsStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Entities Data
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [slas, setSlas] = useState<SLA[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [tasks, setTasks] = useState<OperationalTask[]>([]);
  const [changes, setChanges] = useState<InfraChange[]>([]);
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Selection & Details
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [selectedChange, setSelectedChange] = useState<InfraChange | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Modals
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isRunbookModalOpen, setIsRunbookModalOpen] = useState(false);

  // Form states
  const [ticketForm, setTicketForm] = useState<any>({
    title: '',
    description: '',
    type: 'INCIDENT',
    priority: 'NORMAL',
    machineId: '',
    assetId: '',
    dueDate: '',
  });

  const [maintForm, setMaintForm] = useState<any>({
    title: '',
    description: '',
    type: 'PREVENTIVE',
    scheduledStart: new Date().toISOString().slice(0, 16),
    scheduledEnd: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
    machineId: '',
    assetId: '',
    runbookId: '',
    suppressAlerts: true,
  });

  const [changeForm, setChangeForm] = useState<any>({
    title: '',
    description: '',
    reason: '',
    risk: 'LOW',
    impact: 'LOW',
    plannedStart: new Date().toISOString().slice(0, 16),
    plannedEnd: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
    rollbackPlan: '',
    validationPlan: '',
    machineId: '',
  });

  const [runbookForm, setRunbookForm] = useState<any>({
    name: '',
    description: '',
    category: 'Sistemas',
    content: '',
    steps: [{ title: 'Paso 1: Verificación inicial', isRequired: true }],
  });

  // Supporting Data
  const [machines, setMachines] = useState<Machine[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        ticketsRes,
        slasRes,
        maintRes,
        tasksRes,
        changesRes,
        runbooksRes,
        calRes,
        machinesRes,
        assetsRes,
      ] = await Promise.all([
        api.getOperationsStats().catch(() => null),
        api.getTickets().catch(() => []),
        api.getSlas().catch(() => []),
        api.getMaintenances().catch(() => []),
        api.getTasks().catch(() => []),
        api.getInfraChanges().catch(() => []),
        api.getRunbooks().catch(() => []),
        api.getOperationsCalendar().catch(() => []),
        api.getMachines({ limit: 100 }).catch(() => ({ items: [] } as any)),
        api.getAssets({ limit: 100 }).catch(() => ({ items: [] } as any)),
      ]);

      if (statsRes) setStats(statsRes);
      if (ticketsRes) setTickets(ticketsRes);
      if (slasRes) setSlas(slasRes);
      if (maintRes) setMaintenances(maintRes);
      if (tasksRes) setTasks(tasksRes);
      if (changesRes) setChanges(changesRes);
      if (runbooksRes) setRunbooks(runbooksRes);
      if (calRes) setCalendarEvents(calRes);
      if (machinesRes) setMachines(machinesRes.items || []);
      if (assetsRes) setAssets(assetsRes.items || []);
    } catch (err: any) {
      toast.error('Error al cargar datos operativos', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handlers for Tickets
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createTicket({
        title: ticketForm.title,
        description: ticketForm.description,
        type: ticketForm.type,
        priority: ticketForm.priority,
        machineId: ticketForm.machineId || null,
        assetId: ticketForm.assetId || null,
        dueDate: ticketForm.dueDate || null,
      });
      toast.success('Ticket Creado', `Ticket ${res.ticketNumber || res.id} creado correctamente`);
      setIsTicketModalOpen(false);
      setTicketForm({ title: '', description: '', type: 'INCIDENT', priority: 'NORMAL', machineId: '', assetId: '', dueDate: '' });
      fetchAllData();
    } catch (err: any) {
      toast.error('Error al crear ticket', err.message);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.addTicketComment(selectedTicket.id, { content: commentText.trim() });
      toast.success('Comentario añadido');
      setCommentText('');
      const updated = await api.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
      fetchAllData();
    } catch (err: any) {
      toast.error('Error al añadir comentario', err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: any) => {
    try {
      await api.updateTicket(ticketId, { status: newStatus });
      toast.success('Estado actualizado', `Estado actualizado a ${newStatus}`);
      if (selectedTicket?.id === ticketId) {
        const updated = await api.getTicket(ticketId);
        setSelectedTicket(updated);
      }
      fetchAllData();
    } catch (err: any) {
      toast.error('Error al actualizar ticket', err.message);
    }
  };

  // Handlers for Maintenance
  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMaintenance({
        title: maintForm.title,
        description: maintForm.description,
        type: maintForm.type,
        scheduledStart: new Date(maintForm.scheduledStart).toISOString(),
        scheduledEnd: new Date(maintForm.scheduledEnd).toISOString(),
        machineId: maintForm.machineId || null,
        assetId: maintForm.assetId || null,
        runbookId: maintForm.runbookId || null,
        suppressAlerts: maintForm.suppressAlerts,
      });
      toast.success('Mantenimiento programado', 'Mantenimiento programado correctamente');
      setIsMaintenanceModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast.error('Error al programar mantenimiento', err.message);
    }
  };

  const handleToggleChecklist = async (itemId: string, currentState: boolean) => {
    try {
      await api.toggleChecklistItem(itemId, !currentState);
      if (selectedMaintenance) {
        const updated = await api.getMaintenance(selectedMaintenance.id);
        setSelectedMaintenance(updated);
      }
      fetchAllData();
    } catch (err: any) {
      toast.error('Error al actualizar checklist', err.message);
    }
  };

  // Handlers for Changes
  const handleCreateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createInfraChange({
        title: changeForm.title,
        description: changeForm.description,
        reason: changeForm.reason,
        risk: changeForm.risk,
        impact: changeForm.impact,
        plannedStart: new Date(changeForm.plannedStart).toISOString(),
        plannedEnd: new Date(changeForm.plannedEnd).toISOString(),
        rollbackPlan: changeForm.rollbackPlan,
        validationPlan: changeForm.validationPlan,
        machineId: changeForm.machineId || null,
      });
      toast.success('Cambio Registrado', `Solicitud de cambio ${res.changeNumber || res.id} creada`);
      setIsChangeModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast.error('Error al registrar cambio', err.message);
    }
  };

  const handleApproveChange = async (changeId: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      if (decision === 'APPROVE') {
        await api.approveInfraChange(changeId, 'Aprobado por el Administrador NOC');
        toast.success('Cambio APROBADO', 'La solicitud ha sido aprobada');
      } else {
        await api.rejectInfraChange(changeId, 'Rechazado por el Administrador');
        toast.info('Cambio RECHAZADO', 'La solicitud ha sido rechazada');
      }
      if (selectedChange?.id === changeId) {
        const updated = await api.getInfraChange(changeId);
        setSelectedChange(updated);
      }
      fetchAllData();
    } catch (err: any) {
      toast.error('Error en la decisión', err.message);
    }
  };

  // Handlers for Runbooks
  const handleCreateRunbook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRunbook({
        name: runbookForm.name,
        description: runbookForm.description,
        category: runbookForm.category,
        content: runbookForm.content,
        steps: runbookForm.steps,
      });
      toast.success('Runbook Creado', 'Runbook creado correctamente');
      setIsRunbookModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast.error('Error al crear runbook', err.message);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'PLANNED':
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">ABIERTO / PLANIFICADO</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">EN CURSO</span>;
      case 'RESOLVED':
      case 'COMPLETED':
      case 'APPROVED':
      case 'DONE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">RESUELTO / COMPLETADO</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">CERRADO</span>;
      case 'CRITICAL':
      case 'FAILED':
      case 'BREACHED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">CRÍTICO / INCUMPLIDO</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-500/20 text-gray-400">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">CRÍTICA</span>;
      case 'URGENT':
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">ALTA</span>;
      case 'NORMAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">NORMAL</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-500/20 text-slate-400">BAJA</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-[#F1F5F9]">
      {/* Top Header & Operations Navigation Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#252D38] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-[#06B6D4]" />
              Gestión Operativa & Service Desk
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30">
              NOC • TICKETS & SLA
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            Gestión humana de incidencias, control estricto de SLAs, ventanas de mantenimiento preventivo, gestión de cambios y runbooks operativos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAllData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151B23] border border-[#252D38] text-xs text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#252D38] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#06B6D4]' : ''}`} />
            <span>Actualizar</span>
          </button>

          {hasPermission('TICKET_CREATE') && (
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06B6D4] text-[#0B0F14] font-semibold text-xs hover:bg-[#06B6D4]/90 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Ticket</span>
            </button>
          )}

          {hasPermission('MAINTENANCE_MANAGE') && (
            <button
              onClick={() => setIsMaintenanceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C55E] text-[#0B0F14] font-semibold text-xs hover:bg-[#22C55E]/90 shadow-lg shadow-green-500/20 transition-all"
            >
              <Wrench className="w-4 h-4" />
              <span>Programar Mantenimiento</span>
            </button>
          )}

          {hasPermission('CHANGE_MANAGE') && (
            <button
              onClick={() => setIsChangeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#0B0F14] font-semibold text-xs hover:bg-[#F59E0B]/90 shadow-lg shadow-amber-500/20 transition-all"
            >
              <GitPullRequest className="w-4 h-4" />
              <span>Registrar Cambio</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-[#252D38]/80 pb-2">
        {[
          { id: 'operations-dashboard', label: 'Dashboard Operativo', icon: TrendingUp },
          { id: 'tickets', label: `Tickets (${tickets.length})`, icon: TicketIcon },
          { id: 'maintenance', label: `Mantenimientos (${maintenances.length})`, icon: Wrench },
          { id: 'changes', label: `Cambios / RFC (${changes.length})`, icon: GitPullRequest },
          { id: 'tasks', label: `Tareas (${tasks.length})`, icon: CheckSquare },
          { id: 'slas', label: `SLAs (${slas.length})`, icon: Clock },
          { id: 'runbooks', label: `Runbooks (${runbooks.length})`, icon: BookOpen },
          { id: 'calendar', label: 'Calendario Unificado', icon: CalendarIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedTicket(null);
                setSelectedMaintenance(null);
                setSelectedChange(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#151B23] text-[#06B6D4] border border-[#06B6D4]/30 shadow-sm'
                  : 'text-[#94A3B8] hover:bg-[#151B23]/50 hover:text-[#F1F5F9]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#06B6D4]' : 'text-[#64748B]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OPERATIONS DASHBOARD */}
      {activeTab === 'operations-dashboard' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0F141B] border border-[#252D38] flex items-center justify-between">
              <div>
                <p className="text-xs text-[#94A3B8] font-medium">Tickets Abiertos</p>
                <h3 className="text-2xl font-bold font-mono text-[#F1F5F9] mt-1">{stats?.tickets.open ?? 0}</h3>
                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <span>{stats?.tickets.critical ?? 0} críticos</span> &bull; <span>{stats?.tickets.unassigned ?? 0} sin asignar</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <TicketIcon className="w-5 h-5 text-[#3B82F6]" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0F141B] border border-[#252D38] flex items-center justify-between">
              <div>
                <p className="text-xs text-[#94A3B8] font-medium">Cumplimiento SLA</p>
                <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {stats?.tickets.slaBreached === 0 ? '100%' : `${Math.max(0, 100 - (stats?.tickets.slaBreached || 0) * 10)}%`}
                </h3>
                <p className="text-[11px] text-[#94A3B8] mt-1 flex items-center gap-1">
                  <span className="text-amber-400">{stats?.tickets.slaWarning ?? 0} en riesgo</span> &bull; <span className="text-red-400">{stats?.tickets.slaBreached ?? 0} vencidos</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0F141B] border border-[#252D38] flex items-center justify-between">
              <div>
                <p className="text-xs text-[#94A3B8] font-medium">Mantenimientos Próximos</p>
                <h3 className="text-2xl font-bold font-mono text-cyan-400 mt-1">{stats?.maintenances.upcoming ?? 0}</h3>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  <span>{stats?.maintenances.today ?? 0} programados para hoy</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-cyan-400" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0F141B] border border-[#252D38] flex items-center justify-between">
              <div>
                <p className="text-xs text-[#94A3B8] font-medium">Cambios Pendientes (RFC)</p>
                <h3 className="text-2xl font-bold font-mono text-amber-400 mt-1">{stats?.changes.pendingApproval ?? 0}</h3>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  <span>{stats?.changes.scheduled ?? 0} cambios aprobados</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <GitPullRequest className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>

          {/* Quick Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Tickets */}
            <div className="p-5 rounded-xl bg-[#0F141B] border border-[#252D38]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
                  <TicketIcon className="w-4 h-4 text-[#06B6D4]" />
                  Últimos Tickets Operativos
                </h3>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className="text-xs text-[#06B6D4] hover:underline flex items-center gap-1"
                >
                  Ver todos <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2.5">
                {tickets.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      setActiveTab('tickets');
                    }}
                    className="p-3 rounded-lg bg-[#151B23]/70 hover:bg-[#151B23] border border-[#252D38] flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#06B6D4]">{t.ticketNumber}</span>
                      <div>
                        <p className="text-xs font-semibold text-[#F1F5F9] line-clamp-1">{t.title}</p>
                        <p className="text-[11px] text-[#94A3B8] flex items-center gap-2 mt-0.5">
                          <span>{t.machine?.hostname || t.asset?.assetTag || 'Infraestructura General'}</span>
                          &bull; <span>{t.assignee?.name || 'Sin Asignar'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(t.priority)}
                      {getStatusBadge(t.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Maintenances & RFCs */}
            <div className="p-5 rounded-xl bg-[#0F141B] border border-[#252D38]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#22C55E]" />
                  Mantenimientos y Cambios Programados
                </h3>
                <button
                  onClick={() => setActiveTab('maintenance')}
                  className="text-xs text-[#22C55E] hover:underline flex items-center gap-1"
                >
                  Ver todos <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2.5">
                {maintenances.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMaintenance(m);
                      setActiveTab('maintenance');
                    }}
                    className="p-3 rounded-lg bg-[#151B23]/70 hover:bg-[#151B23] border border-[#252D38] flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#F1F5F9]">{m.title}</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
                        {new Date(m.scheduledStart).toLocaleDateString()} &bull; {m.type} &bull; {m.machine?.hostname || m.asset?.assetTag || 'General'}
                      </p>
                    </div>
                    {getStatusBadge(m.status)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TICKETS LIST & DETAIL */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {selectedTicket ? (
            /* Ticket Detailed View */
            <div className="p-6 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#252D38] pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="px-2.5 py-1 rounded bg-[#151B23] text-xs text-[#94A3B8] hover:text-[#F1F5F9]"
                  >
                    &larr; Volver
                  </button>
                  <span className="font-mono text-sm font-bold text-[#06B6D4]">{selectedTicket.ticketNumber}</span>
                  <h2 className="text-lg font-bold text-[#F1F5F9]">{selectedTicket.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(selectedTicket.priority)}
                  {getStatusBadge(selectedTicket.status)}
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                    className="bg-[#151B23] border border-[#252D38] text-xs rounded px-2 py-1 text-[#F1F5F9]"
                  >
                    <option value="OPEN">ABIERTO</option>
                    <option value="IN_PROGRESS">EN CURSO</option>
                    <option value="PENDING">PENDIENTE</option>
                    <option value="RESOLVED">RESUELTO</option>
                    <option value="CLOSED">CERRADO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Description & Activity Feed */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Descripción</h4>
                    <div className="p-4 rounded-lg bg-[#151B23] border border-[#252D38] text-xs text-[#F1F5F9] whitespace-pre-wrap">
                      {selectedTicket.description}
                    </div>
                  </div>

                  {/* Comments & Conversation */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Historial de Comentarios & Actividad</h4>
                    <div className="space-y-3">
                      {selectedTicket.comments?.map((c) => (
                        <div key={c.id} className="p-3.5 rounded-lg bg-[#151B23] border border-[#252D38]">
                          <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-1.5">
                            <span className="font-semibold text-[#06B6D4]">{c.authorName || c.user?.name || 'Operador'}</span>
                            <span>{new Date(c.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-[#F1F5F9] whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ))}
                    </div>

                    {/* New Comment Box */}
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Escribe una respuesta o actualización de estado..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !commentText.trim()}
                        className="px-4 py-2 rounded-lg bg-[#06B6D4] text-[#0B0F14] font-semibold text-xs hover:bg-[#06B6D4]/90 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Metadata & Linked Infrastructure */}
                <div className="space-y-4 p-4 rounded-lg bg-[#151B23] border border-[#252D38] text-xs">
                  <h4 className="font-semibold text-[#F1F5F9] border-b border-[#252D38] pb-2">Información Contextual</h4>
                  <div>
                    <span className="text-[#94A3B8]">Asignado a:</span>
                    <p className="font-medium text-[#F1F5F9] mt-0.5">{selectedTicket.assignee?.name || 'Sin Asignar'}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Máquina Host:</span>
                    <p className="font-mono text-[#06B6D4] mt-0.5">{selectedTicket.machine?.hostname || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Activo IT:</span>
                    <p className="font-mono text-cyan-300 mt-0.5">{selectedTicket.asset?.assetTag || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">SLA de Respuesta:</span>
                    <p className="font-mono text-emerald-400 mt-0.5">{selectedTicket.sla?.name || 'SLA Estándar (1h/8h)'}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Fecha Creación:</span>
                    <p className="text-[#94A3B8] mt-0.5">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tickets Table */
            <div className="p-5 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar ticket, título, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-[#151B23] border border-[#252D38] text-xs rounded-lg px-2.5 py-1.5 text-[#F1F5F9]"
                  >
                    <option value="ALL">Todas las Prioridades</option>
                    <option value="CRITICAL">Crítica</option>
                    <option value="URGENT">Urgente</option>
                    <option value="HIGH">Alta</option>
                    <option value="NORMAL">Normal</option>
                    <option value="LOW">Baja</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#94A3B8]">
                  <thead className="bg-[#151B23] text-[#F1F5F9] font-semibold border-b border-[#252D38]">
                    <tr>
                      <th className="p-3">Ticket ID</th>
                      <th className="p-3">Título</th>
                      <th className="p-3">Prioridad</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Asignado</th>
                      <th className="p-3">Equipo / Host</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252D38]/60">
                    {tickets
                      .filter((t) => {
                        const matchSearch =
                          t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.title.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchPri = priorityFilter === 'ALL' || t.priority === priorityFilter;
                        return matchSearch && matchPri;
                      })
                      .map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-[#151B23]/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedTicket(t)}
                        >
                          <td className="p-3 font-mono font-bold text-[#06B6D4]">{t.ticketNumber}</td>
                          <td className="p-3 font-medium text-[#F1F5F9] max-w-xs truncate">{t.title}</td>
                          <td className="p-3">{getPriorityBadge(t.priority)}</td>
                          <td className="p-3">{getStatusBadge(t.status)}</td>
                          <td className="p-3">{t.assignee?.name || <span className="text-gray-500">Sin Asignar</span>}</td>
                          <td className="p-3 font-mono text-cyan-300">{t.machine?.hostname || t.asset?.assetTag || '-'}</td>
                          <td className="p-3">{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicket(t);
                              }}
                              className="px-2.5 py-1 rounded bg-[#151B23] hover:bg-[#252D38] text-[#06B6D4] border border-[#252D38]"
                            >
                              Ver Detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MAINTENANCE MODULE */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#22C55E]" />
                Calendario & Tareas de Mantenimiento Preventivo / Correctivo
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {maintenances.map((m) => (
                <div key={m.id} className="p-4 rounded-lg bg-[#151B23] border border-[#252D38] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#22C55E]">{m.type}</span>
                    {getStatusBadge(m.status)}
                  </div>
                  <h4 className="text-sm font-bold text-[#F1F5F9]">{m.title}</h4>
                  <p className="text-xs text-[#94A3B8] line-clamp-2">{m.description || 'Sin descripción adicional'}</p>
                  <div className="text-[11px] text-[#64748B] space-y-1 pt-2 border-t border-[#252D38]">
                    <p>📅 Inicio: {new Date(m.scheduledStart).toLocaleString()}</p>
                    <p>🖥️ Host: {m.machine?.hostname || m.asset?.assetTag || 'Infraestructura General'}</p>
                    <p>👤 Asignado: {m.assignee?.name || 'Técnico de Guardia'}</p>
                  </div>

                  {m.checklists && m.checklists.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[#252D38]">
                      <p className="text-[11px] font-semibold text-[#94A3B8]">Checklist Operativo:</p>
                      {m.checklists.map((chk) => (
                        <label key={chk.id} className="flex items-center gap-2 text-xs text-[#F1F5F9] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={chk.isCompleted}
                            onChange={() => handleToggleChecklist(chk.id, chk.isCompleted)}
                            className="rounded bg-[#0B0F14] border-[#252D38] text-[#22C55E]"
                          />
                          <span className={chk.isCompleted ? 'line-through text-[#64748B]' : ''}>{chk.description}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. CHANGE MANAGEMENT (RFC) */}
      {activeTab === 'changes' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-[#F59E0B]" />
              Gestión de Cambios de Infraestructura (Change Management / RFC)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#94A3B8]">
                <thead className="bg-[#151B23] text-[#F1F5F9] font-semibold border-b border-[#252D38]">
                  <tr>
                    <th className="p-3">RFC ID</th>
                    <th className="p-3">Título</th>
                    <th className="p-3">Riesgo / Impacto</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Solicitante</th>
                    <th className="p-3">Ventana Planificada</th>
                    <th className="p-3 text-right">Aprobación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {changes.map((c) => (
                    <tr key={c.id} className="hover:bg-[#151B23]/50">
                      <td className="p-3 font-mono font-bold text-amber-400">{c.changeNumber}</td>
                      <td className="p-3 font-medium text-[#F1F5F9]">{c.title}</td>
                      <td className="p-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold mr-1">{c.risk} RIESGO</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">{c.impact} IMPACTO</span>
                      </td>
                      <td className="p-3">{getStatusBadge(c.status)}</td>
                      <td className="p-3">{c.requester?.name || 'Admin'}</td>
                      <td className="p-3">{new Date(c.plannedStart).toLocaleString()}</td>
                      <td className="p-3 text-right space-x-1.5">
                        {c.status === 'PENDING_APPROVAL' && hasPermission('CHANGE_APPROVE') && (
                          <>
                            <button
                              onClick={() => handleApproveChange(c.id, 'APPROVE')}
                              className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleApproveChange(c.id, 'REJECT')}
                              className="px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. RUNBOOKS */}
      {activeTab === 'runbooks' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Catálogo de Runbooks y Procedimientos Operativos
              </h3>
              {hasPermission('RUNBOOK_MANAGE') && (
                <button
                  onClick={() => setIsRunbookModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-purple-500 text-[#0B0F14] font-semibold text-xs hover:bg-purple-400"
                >
                  + Nuevo Runbook
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {runbooks.map((rb) => (
                <div key={rb.id} className="p-4 rounded-lg bg-[#151B23] border border-[#252D38] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-purple-400 font-bold">{rb.category}</span>
                    <span className="text-[10px] text-[#94A3B8]">v{rb.version}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F1F5F9]">{rb.name}</h4>
                  <p className="text-xs text-[#94A3B8]">{rb.description}</p>
                  <div className="space-y-1.5 pt-2 border-t border-[#252D38]">
                    <p className="text-[11px] font-semibold text-[#94A3B8]">Pasos ({rb.steps?.length || 0}):</p>
                    {rb.steps?.map((s) => (
                      <div key={s.id} className="text-xs text-[#F1F5F9] flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] flex items-center justify-center font-bold font-mono">
                          {s.stepOrder}
                        </span>
                        <span>{s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. UNIFIED CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#06B6D4]" />
              Eventos, Mantenimientos y Vencimientos
            </h3>

            <div className="space-y-3">
              {calendarEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-lg bg-[#151B23] border border-[#252D38] flex items-center justify-between"
                  style={{ borderLeftColor: ev.color, borderLeftWidth: '4px' }}
                >
                  <div>
                    <h4 className="text-xs font-bold text-[#F1F5F9]">{ev.title}</h4>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">{ev.details}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-[#06B6D4]">{new Date(ev.start).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TICKET */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0F141B] border border-[#252D38] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#F1F5F9]">Crear Nuevo Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#94A3B8] mb-1">Título del Problema / Solicitud *</label>
                <input
                  type="text"
                  required
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  placeholder="Ej: Servicio MySQL degradado en SQL01"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1">Tipo</label>
                  <select
                    value={ticketForm.type}
                    onChange={(e) => setTicketForm({ ...ticketForm, type: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  >
                    <option value="INCIDENT">INCIDENTE</option>
                    <option value="REQUEST">SOLICITUD</option>
                    <option value="MAINTENANCE">MANTENIMIENTO</option>
                    <option value="CHANGE">CAMBIO</option>
                    <option value="TASK">TAREA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1">Prioridad</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  >
                    <option value="LOW">BAJA</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">ALTA</option>
                    <option value="URGENT">URGENTE</option>
                    <option value="CRITICAL">CRÍTICA (SLA Inmediato)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1">Máquina Vinculada (Opcional)</label>
                  <select
                    value={ticketForm.machineId}
                    onChange={(e) => setTicketForm({ ...ticketForm, machineId: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  >
                    <option value="">Sin vincular a Host</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.hostname} ({m.primaryIp || 'Sin IP'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1">Activo IT / Hardware (Opcional)</label>
                  <select
                    value={ticketForm.assetId}
                    onChange={(e) => setTicketForm({ ...ticketForm, assetId: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  >
                    <option value="">Sin vincular a Activo</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.assetTag} - {a.name} ({a.serialNumber || 'S/N'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">Descripción Detallada *</label>
                <textarea
                  rows={4}
                  required
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  placeholder="Detalles del problema, síntomas detectados, impacto operativo..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#151B23] text-[#94A3B8] hover:text-[#F1F5F9]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#06B6D4] text-[#0B0F14] font-semibold hover:bg-[#06B6D4]/90"
                >
                  Crear Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE MAINTENANCE */}
      {isMaintenanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0F141B] border border-[#252D38] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#F1F5F9]">Programar Mantenimiento</h3>
            <form onSubmit={handleCreateMaintenance} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#94A3B8] mb-1">Título del Mantenimiento *</label>
                <input
                  type="text"
                  required
                  value={maintForm.title}
                  onChange={(e) => setMaintForm({ ...maintForm, title: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  placeholder="Ej: Mantenimiento preventivo SAI / UPS Rack 01"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1">Inicio Programado *</label>
                  <input
                    type="datetime-local"
                    required
                    value={maintForm.scheduledStart}
                    onChange={(e) => setMaintForm({ ...maintForm, scheduledStart: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  />
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1">Fin Programado *</label>
                  <input
                    type="datetime-local"
                    required
                    value={maintForm.scheduledEnd}
                    onChange={(e) => setMaintForm({ ...maintForm, scheduledEnd: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">Equipo / Host Afectado</label>
                <select
                  value={maintForm.machineId}
                  onChange={(e) => setMaintForm({ ...maintForm, machineId: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                >
                  <option value="">Seleccionar equipo...</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.hostname}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="suppressAlerts"
                  checked={maintForm.suppressAlerts}
                  onChange={(e) => setMaintForm({ ...maintForm, suppressAlerts: e.target.checked })}
                  className="rounded bg-[#151B23] border-[#252D38] text-[#22C55E]"
                />
                <label htmlFor="suppressAlerts" className="text-xs text-[#F1F5F9]">
                  Suprimir alertas automáticas durante la ventana (Estado SUPPRESSED_BY_MAINTENANCE)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
                <button
                  type="button"
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#151B23] text-[#94A3B8]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#22C55E] text-[#0B0F14] font-semibold"
                >
                  Programar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CHANGE */}
      {isChangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0F141B] border border-[#252D38] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#F1F5F9]">Registrar Solicitud de Cambio (RFC)</h3>
            <form onSubmit={handleCreateChange} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#94A3B8] mb-1">Título del Cambio *</label>
                <input
                  type="text"
                  required
                  value={changeForm.title}
                  onChange={(e) => setChangeForm({ ...changeForm, title: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  placeholder="Ej: Actualización de Firmware en SWITCH-CORE-01"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1">Nivel de Riesgo</label>
                  <select
                    value={changeForm.risk}
                    onChange={(e) => setChangeForm({ ...changeForm, risk: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  >
                    <option value="LOW">BAJO</option>
                    <option value="MEDIUM">MEDIO</option>
                    <option value="HIGH">ALTO</option>
                    <option value="CRITICAL">CRÍTICO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1">Impacto Potencial</label>
                  <select
                    value={changeForm.impact}
                    onChange={(e) => setChangeForm({ ...changeForm, impact: e.target.value })}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  >
                    <option value="NONE">NINGUNO</option>
                    <option value="LOW">BAJO</option>
                    <option value="MEDIUM">MEDIO</option>
                    <option value="HIGH">ALTO</option>
                    <option value="CRITICAL">CRÍTICO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">Plan de Rollback / Reversión</label>
                <textarea
                  rows={2}
                  value={changeForm.rollbackPlan}
                  onChange={(e) => setChangeForm({ ...changeForm, rollbackPlan: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  placeholder="Procedimiento para revertir si el cambio falla..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
                <button
                  type="button"
                  onClick={() => setIsChangeModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#151B23] text-[#94A3B8]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#F59E0B] text-[#0B0F14] font-semibold"
                >
                  Registrar Cambio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE RUNBOOK */}
      {isRunbookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0F141B] border border-[#252D38] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#F1F5F9]">Crear Nuevo Runbook</h3>
            <form onSubmit={handleCreateRunbook} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#94A3B8] mb-1">Nombre del Runbook / Procedimiento *</label>
                <input
                  type="text"
                  required
                  value={runbookForm.name}
                  onChange={(e) => setRunbookForm({ ...runbookForm, name: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  placeholder="Ej: Procedimiento ante Alerta de Disco Lleno"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">Categoría</label>
                <input
                  type="text"
                  value={runbookForm.category}
                  onChange={(e) => setRunbookForm({ ...runbookForm, category: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  placeholder="DATABASE, NETWORK, SECURITY, SYSTEM..."
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">Descripción Breve</label>
                <textarea
                  rows={2}
                  value={runbookForm.description}
                  onChange={(e) => setRunbookForm({ ...runbookForm, description: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  placeholder="Objetivo y consideraciones previas..."
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">Guía Detallada / Markdown</label>
                <textarea
                  rows={4}
                  value={runbookForm.content}
                  onChange={(e) => setRunbookForm({ ...runbookForm, content: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9] font-mono text-xs"
                  placeholder="1. Revisar df -h&#10;2. Purgar logs en /var/log&#10;3. Reiniciar daemon..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
                <button
                  type="button"
                  onClick={() => setIsRunbookModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#151B23] text-[#94A3B8]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-500 text-[#0B0F14] font-semibold"
                >
                  Guardar Runbook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
