import React, { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldAlert,
  Server,
  Terminal,
  FileCode,
  Activity,
  Plus,
  RefreshCw,
  Eye,
  Lock,
  Check,
  Ban,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { automationApi, agentApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  AutomationStats,
  AutomationActionItem,
  WorkflowItem,
  WorkflowRunItem,
  ApprovalRequestItem,
  AutomationPolicyItem,
  AgentItem,
  AIActionProposalItem,
  ActionRiskLevel,
} from '../types/index.js';

export interface AutomationPageProps {
  initialTab?: 'dashboard' | 'workflows' | 'runs' | 'actions' | 'approvals' | 'agents' | 'policies' | 'ai-proposals';
  onNavigateToMachine?: (machineId: string) => void;
}

export const AutomationPage: React.FC<AutomationPageProps> = ({
  initialTab = 'dashboard',
}) => {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [runs, setRuns] = useState<WorkflowRunItem[]>([]);
  const [actions, setActions] = useState<{ builtIns: AutomationActionItem[]; dbActions: AutomationActionItem[] }>({ builtIns: [], dbActions: [] });
  const [approvals, setApprovals] = useState<ApprovalRequestItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [policies, setPolicies] = useState<AutomationPolicyItem[]>([]);
  const [proposals, setProposals] = useState<AIActionProposalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals & Selected
  const [selectedRun, setSelectedRun] = useState<WorkflowRunItem | null>(null);
  const [executeModalWorkflow, setExecuteModalWorkflow] = useState<WorkflowItem | null>(null);
  const [executeTarget, setExecuteTarget] = useState('');
  const [executeDryRun, setExecuteDryRun] = useState(false);
  const [executeReason, setExecuteReason] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Create Workflow Modal
  const [isCreateWfOpen, setIsCreateWfOpen] = useState(false);
  const [wfName, setWfName] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [wfCategory, setWfCategory] = useState('DIAGNOSTIC');
  const [wfTargetType, setWfTargetType] = useState('MACHINE');
  const [wfSteps, setWfSteps] = useState<Array<{ order: number; actionName: string; label: string; condition: 'ALWAYS' | 'ON_SUCCESS' | 'ON_FAILURE'; continueOnError: boolean; timeoutSec: number; retryCount: number; retryIntervalSec: number }>>([
    { order: 1, actionName: 'ping_check', label: 'Verificación ICMP Ping', condition: 'ALWAYS', continueOnError: false, timeoutSec: 10, retryCount: 1, retryIntervalSec: 5 },
  ]);

  // Register Agent Modal
  const [isRegisterAgentOpen, setIsRegisterAgentOpen] = useState(false);
  const [agentHostname, setAgentHostname] = useState('');
  const [agentOs, setAgentOs] = useState<'LINUX' | 'WINDOWS'>('LINUX');
  const [agentIp, setAgentIp] = useState('');
  const [newAgentToken, setNewAgentToken] = useState<string | null>(null);

  // Safety Test / Command Check
  const [testCmd, setTestCmd] = useState('');
  const [testCmdResult, setTestCmdResult] = useState<{ safe: boolean; reason?: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, wfRes, runsRes, actionsRes, appRes, agentsRes, polRes, propRes] = await Promise.all([
        automationApi.getStats().catch(() => null),
        automationApi.getWorkflows().catch(() => []),
        automationApi.getRuns().catch(() => []),
        automationApi.getActions().catch(() => ({ builtIns: [], dbActions: [] })),
        automationApi.getApprovals().catch(() => []),
        agentApi.getAgents().catch(() => []),
        automationApi.getPolicies().catch(() => []),
        automationApi.getAIProposals().catch(() => []),
      ]);

      if (statsRes) setStats(statsRes);
      setWorkflows(wfRes);
      setRuns(runsRes);
      setActions(actionsRes);
      setApprovals(appRes);
      setAgents(agentsRes);
      setPolicies(polRes);
      setProposals(propRes);
    } catch (err: any) {
      toast.error('Error al cargar datos de automatización', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExecuteWorkflow = async () => {
    if (!executeModalWorkflow || !executeTarget.trim()) {
      toast.error('Especifica un objetivo para ejecutar');
      return;
    }

    setIsExecuting(true);
    try {
      const res = await automationApi.executeWorkflow(executeModalWorkflow.id, {
        targetType: executeModalWorkflow.targetType,
        targetIdentifier: executeTarget.trim(),
        isDryRun: executeDryRun,
        reason: executeReason.trim() || undefined,
      });

      if (res.status === 'WAITING_APPROVAL') {
        toast.warning('Aprobación Requerida', res.message);
      } else if (res.isDryRun) {
        toast.info('Simulación Dry-Run Completada', res.message);
      } else {
        toast.success('Ejecución Iniciada', res.message);
      }

      setExecuteModalWorkflow(null);
      setExecuteTarget('');
      setExecuteReason('');
      setExecuteDryRun(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al ejecutar workflow', err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDecideApproval = async (id: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      await automationApi.decideApproval(id, decision);
      toast.success(decision === 'APPROVE' ? 'Solicitud Aprobada' : 'Solicitud Rechazada');
      loadData();
    } catch (err: any) {
      toast.error('Error al procesar aprobación', err.message);
    }
  };

  const handleDecideProposal = async (id: string, action: 'ACCEPT' | 'REJECT' | 'EXECUTE') => {
    try {
      await automationApi.decideAIProposal(id, action);
      toast.success(`Propuesta ${action === 'EXECUTE' ? 'ejecutada con éxito' : action === 'ACCEPT' ? 'aceptada' : 'rechazada'}`);
      loadData();
    } catch (err: any) {
      toast.error('Error con propuesta de IA', err.message);
    }
  };

  const handleCreateWorkflowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfName.trim() || wfSteps.length === 0) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    try {
      await automationApi.createWorkflow({
        name: wfName.trim(),
        description: wfDesc.trim() || undefined,
        category: wfCategory,
        targetType: wfTargetType as any,
        enabled: true,
        concurrencyLimit: 5,
        timeoutTotalSec: 300,
        circuitBreakerThreshold: 5,
        steps: wfSteps as any,
      });
      toast.success('Workflow Creado con Éxito');
      setIsCreateWfOpen(false);
      setWfName('');
      setWfDesc('');
      loadData();
    } catch (err: any) {
      toast.error('Error al crear workflow', err.message);
    }
  };

  const handleRegisterAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentHostname.trim()) {
      toast.error('Especifica el hostname');
      return;
    }

    try {
      const res = await agentApi.registerAgent({
        hostname: agentHostname.trim(),
        osType: agentOs,
        ipAddress: agentIp.trim() || undefined,
        capabilities: ['TELEMETRY', 'HEALTH_CHECK'],
      });
      setNewAgentToken(res.token);
      toast.success('Agente Registrado con Éxito');
      loadData();
    } catch (err: any) {
      toast.error('Error al registrar agente', err.message);
    }
  };

  const checkCommandSafetyLocal = (cmd: string) => {
    const dangerous = [
      /\brm\s+-[rf]+/i,
      /\bformat\b/i,
      /\bdiskpart\b/i,
      /\bshutdown\b/i,
      /\breboot\b/i,
      /\bnet\s+user\b/i,
      /\bdrop\s+table\b/i,
      /\bdelete\s+from\b/i,
    ];
    for (const p of dangerous) {
      if (p.test(cmd)) {
        return { safe: false, reason: `Patrón denegado por seguridad: ${p.toString()}` };
      }
    }
    return { safe: true };
  };

  const getRiskBadge = (risk: ActionRiskLevel) => {
    switch (risk) {
      case 'READ_ONLY':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">READ-ONLY</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LOW RISK</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM RISK</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse">HIGH RISK</span>;
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">CRITICAL (4-EYES)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161B22] p-6 rounded-xl border border-[#30363D] shadow-lg">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg border border-amber-500/30">
              <Zap className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#F0F6FC]">
                Automatización & Workflows Controlados
              </h1>
              <p className="text-xs text-[#8B949E]">
                Orquestación de operaciones de infraestructura con seguridad estricta, Dry-Run, principio de 4 ojos y agentes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] text-xs font-semibold border border-[#30363D] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          {hasPermission('AUTOMATION_MANAGE') && (
            <button
              onClick={() => setIsCreateWfOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md hover:shadow-amber-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Workflow</span>
            </button>
          )}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-[#30363D] pb-1 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Panel NOC', icon: Activity },
          { id: 'workflows', label: `Workflows (${workflows.length})`, icon: Sliders },
          { id: 'runs', label: `Ejecuciones (${runs.length})`, icon: Terminal },
          { id: 'actions', label: `Catálogo & Allowlist (${actions.builtIns.length + actions.dbActions.length})`, icon: FileCode },
          { id: 'approvals', label: `Aprobaciones (${approvals.filter(a => a.status === 'PENDING').length})`, icon: ShieldAlert, badge: approvals.filter(a => a.status === 'PENDING').length },
          { id: 'agents', label: `Agentes (${agents.length})`, icon: Server },
          { id: 'policies', label: 'Políticas & Seguridad', icon: Shield },
          { id: 'ai-proposals', label: `Propuestas IA (${proposals.filter(p => p.status === 'PROPOSED').length})`, icon: Sparkles, badge: proposals.filter(p => p.status === 'PROPOSED').length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-amber-500 text-amber-400 bg-[#161B22]'
                  : 'border-transparent text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-[#8B949E]'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363D] shadow-sm">
              <div className="flex items-center justify-between text-[#8B949E] text-xs mb-2">
                <span>Workflows Activos</span>
                <Sliders className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-[#F0F6FC]">
                {stats?.activeWorkflows ?? 0} <span className="text-xs text-[#8B949E] font-normal">/ {stats?.totalWorkflows ?? 0} totales</span>
              </div>
              <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Orquestación habilitada</span>
              </div>
            </div>

            <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363D] shadow-sm">
              <div className="flex items-center justify-between text-[#8B949E] text-xs mb-2">
                <span>Tasa de Éxito</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {stats?.successRate ?? 100}%
              </div>
              <div className="mt-2 text-[11px] text-[#8B949E]">
                {stats?.successRuns ?? 0} exitosas, {stats?.failedRuns ?? 0} fallidas
              </div>
            </div>

            <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363D] shadow-sm">
              <div className="flex items-center justify-between text-[#8B949E] text-xs mb-2">
                <span>Aprobaciones Pendientes</span>
                <ShieldAlert className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-2xl font-bold text-orange-400">
                {stats?.pendingApprovals ?? 0}
              </div>
              <div className="mt-2 text-[11px] text-[#8B949E]">
                Principio de Cuatro Ojos obligatorio
              </div>
            </div>

            <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363D] shadow-sm">
              <div className="flex items-center justify-between text-[#8B949E] text-xs mb-2">
                <span>Agentes Conectados</span>
                <Server className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-400">
                {stats?.onlineAgents ?? 0} <span className="text-xs text-[#8B949E] font-normal">/ {stats?.totalAgents ?? 0}</span>
              </div>
              <div className="mt-2 text-[11px] text-cyan-300">
                Telemetría segura y read-only
              </div>
            </div>
          </div>

          {/* ACTIVE LOCKS & CIRCUIT BREAKERS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363D]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#F0F6FC] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Bloqueos de Concurrencia por Host (Target Locks)
                </h3>
                <span className="text-xs text-[#8B949E]">{stats?.activeLocks?.length ?? 0} activos</span>
              </div>
              {(!stats?.activeLocks || stats.activeLocks.length === 0) ? (
                <div className="py-8 text-center text-xs text-[#8B949E]">
                  No hay hosts bloqueados actualmente. Las operaciones no colisionan.
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.activeLocks.map((lock, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs">
                      <div className="flex items-center gap-2 text-[#F0F6FC]">
                        <Server className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-mono">{lock.target}</span>
                      </div>
                      <div className="text-[#8B949E]">
                        Run ID: <span className="font-mono">{lock.runId.slice(0, 8)}...</span> ({lock.ageSeconds}s)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363D]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#F0F6FC] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-400" />
                  Estado de Circuit Breakers por Workflow
                </h3>
              </div>
              {(!stats?.circuitBreakers || stats.circuitBreakers.length === 0) ? (
                <div className="py-8 text-center text-xs text-[#8B949E]">
                  Todos los Circuit Breakers en estado CERRADO (Operación Nominal).
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.circuitBreakers.map((cb, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs">
                      <div className="flex items-center gap-2 text-[#F0F6FC]">
                        <span className={`w-2 h-2 rounded-full ${cb.isOpen ? 'bg-red-400 animate-ping' : 'bg-emerald-400'}`} />
                        <span>Workflow ID: <span className="font-mono">{cb.workflowId.slice(0, 8)}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#8B949E]">Fallos: {cb.consecutiveFailures}</span>
                        {cb.isOpen ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            ABIERTO (PROTEGIDO)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            OK
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SAFETY ALLOWLIST TESTER */}
          <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363D]">
            <h3 className="text-sm font-bold text-[#F0F6FC] flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Verificador en Tiempo Real de Comandos Peligrosos (Denylist Checker)
            </h3>
            <p className="text-xs text-[#8B949E] mb-4">
              Prueba un comando para verificar que la política de seguridad rechaza de forma determinista instrucciones destructivas (<code className="text-red-400">rm -rf</code>, <code className="text-red-400">format</code>, <code className="text-red-400">shutdown</code>, <code className="text-red-400">drop table</code>).
            </p>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Ejemplo: ping -c 4 192.168.1.1 o rm -rf /var/log"
                value={testCmd}
                onChange={(e) => {
                  setTestCmd(e.target.value);
                  setTestCmdResult(checkCommandSafetyLocal(e.target.value));
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {testCmd && testCmdResult && (
              <div className={`mt-3 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                testCmdResult.safe
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {testCmdResult.safe ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Comando Permitido. No contiene patrones de la lista negra.</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span><strong>BLOQUEADO:</strong> {testCmdResult.reason}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WORKFLOWS */}
      {activeTab === 'workflows' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf) => {
              const activeVersion = wf.versions?.[0];
              return (
                <div key={wf.id} className="bg-[#161B22] p-5 rounded-xl border border-[#30363D] flex flex-col justify-between hover:border-[#8B949E] transition-colors">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-[#F0F6FC]">{wf.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#21262D] text-[#8B949E] border border-[#30363D]">
                        v{activeVersion?.version || 1}
                      </span>
                    </div>
                    <p className="text-xs text-[#8B949E] mb-4 line-clamp-2">{wf.description || 'Sin descripción'}</p>

                    <div className="space-y-2 mb-4">
                      <div className="text-[11px] text-[#8B949E] flex items-center justify-between">
                        <span>Categoría:</span>
                        <span className="text-[#F0F6FC] font-semibold">{wf.category}</span>
                      </div>
                      <div className="text-[11px] text-[#8B949E] flex items-center justify-between">
                        <span>Tipo Objetivo:</span>
                        <span className="text-cyan-400 font-semibold">{wf.targetType}</span>
                      </div>
                      <div className="text-[11px] text-[#8B949E] flex items-center justify-between">
                        <span>Pasos Configurados:</span>
                        <span className="text-amber-400 font-semibold">{activeVersion?.steps?.length || 0} pasos</span>
                      </div>
                      <div className="text-[11px] text-[#8B949E] flex items-center justify-between">
                        <span>Límite Concurrencia:</span>
                        <span className="text-[#F0F6FC]">{wf.concurrencyLimit} hosts</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#30363D] flex items-center justify-between">
                    <button
                      onClick={() => {
                        setExecuteModalWorkflow(wf);
                        setExecuteDryRun(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-cyan-400 text-xs font-semibold border border-cyan-500/30 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Dry-Run</span>
                    </button>

                    <button
                      onClick={() => {
                        setExecuteModalWorkflow(wf);
                        setExecuteDryRun(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Ejecutar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RUNS */}
      {activeTab === 'runs' && (
        <div className="bg-[#161B22] rounded-xl border border-[#30363D] overflow-hidden">
          <div className="p-4 border-b border-[#30363D] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F0F6FC]">Historial de Ejecuciones & Telemetría</h3>
            <span className="text-xs text-[#8B949E]">{runs.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#C9D1D9]">
              <thead className="bg-[#0D1117] text-[#8B949E] uppercase font-semibold text-[10px] border-b border-[#30363D]">
                <tr>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Workflow</th>
                  <th className="p-3">Modo</th>
                  <th className="p-3">Objetivo</th>
                  <th className="p-3">Iniciado Por</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-[#21262D]/50 transition-colors">
                    <td className="p-3">
                      {r.status === 'SUCCESS' && (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> SUCCESS
                        </span>
                      )}
                      {r.status === 'FAILED' && (
                        <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                          <XCircle className="w-4 h-4" /> FAILED
                        </span>
                      )}
                      {r.status === 'RUNNING' && (
                        <span className="flex items-center gap-1.5 text-amber-400 font-semibold animate-pulse">
                          <Activity className="w-4 h-4" /> RUNNING
                        </span>
                      )}
                      {r.status === 'WAITING_APPROVAL' && (
                        <span className="flex items-center gap-1.5 text-orange-400 font-semibold">
                          <ShieldAlert className="w-4 h-4" /> WAITING APPROVAL
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-[#F0F6FC]">{r.workflow?.name || 'Workflow'}</td>
                    <td className="p-3">
                      {r.isDryRun ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          DRY RUN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          REAL EXEC
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-cyan-400">{r.targetIdentifier}</td>
                    <td className="p-3">{r.user?.name || 'System Worker'}</td>
                    <td className="p-3 text-[#8B949E]">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedRun(r)}
                        className="px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-semibold border border-[#30363D]"
                      >
                        Ver Logs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ACTIONS CATALOGUE */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <div className="bg-[#161B22] p-4 rounded-xl border border-[#30363D]">
            <h3 className="text-sm font-bold text-[#F0F6FC] mb-1">Catálogo de Acciones Estructuradas & Niveles de Riesgo</h3>
            <p className="text-xs text-[#8B949E]">
              Todas las operaciones permitidas están estrictamente parametrizadas. Ningún comando arbitrario sin validar puede ser ejecutado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actions.builtIns.map((act) => (
              <div key={act.name} className="bg-[#161B22] p-5 rounded-xl border border-[#30363D] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-bold text-[#F0F6FC]">{act.label}</h4>
                    {getRiskBadge(act.riskLevel)}
                  </div>
                  <p className="text-xs text-[#8B949E] mb-3">{act.description}</p>
                  <div className="space-y-1.5 text-[11px] text-[#8B949E]">
                    <div>Identificador: <span className="font-mono text-cyan-400">{act.name}</span></div>
                    <div>Categoría: <span className="text-[#F0F6FC]">{act.category}</span></div>
                    <div>Requiere Agente: <span className={act.requiresAgent ? 'text-amber-400 font-semibold' : 'text-[#8B949E]'}>{act.requiresAgent ? 'SÍ' : 'NO'}</span></div>
                    <div>Timeout Defecto: <span className="text-[#F0F6FC]">{act.defaultTimeoutSec}s</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: APPROVALS (FOUR-EYES) */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="bg-[#161B22] p-4 rounded-xl border border-[#30363D]">
            <h3 className="text-sm font-bold text-[#F0F6FC] mb-1">Bandeja de Aprobaciones (Principio de Cuatro Ojos)</h3>
            <p className="text-xs text-[#8B949E]">
              Las acciones con riesgo HIGH o CRITICAL requieren autorización explícita de un segundo operador con privilegios de aprobación.
            </p>
          </div>

          <div className="space-y-3">
            {approvals.length === 0 ? (
              <div className="bg-[#161B22] p-8 rounded-xl border border-[#30363D] text-center text-xs text-[#8B949E]">
                No hay solicitudes de aprobación registradas.
              </div>
            ) : (
              approvals.map((app) => (
                <div key={app.id} className="bg-[#161B22] p-5 rounded-xl border border-[#30363D] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#F0F6FC]">{app.actionName}</span>
                      {getRiskBadge(app.riskLevel)}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        app.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                        app.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#8B949E]">
                      Objetivo: <span className="text-cyan-400 font-mono font-semibold">{app.targetIdentifier}</span> | Solicitado por: <span className="text-[#F0F6FC] font-semibold">{app.requestedBy?.name || app.requestedById}</span> ({new Date(app.createdAt).toLocaleString()})
                    </div>
                    <div className="text-xs text-[#C9D1D9] bg-[#0D1117] p-2 rounded border border-[#30363D] mt-2">
                      <strong>Motivo:</strong> {app.reason}
                    </div>
                  </div>

                  {app.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDecideApproval(app.id, 'REJECT')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>

                      <button
                        onClick={() => handleDecideApproval(app.id, 'APPROVE')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprobar (4-Eyes)</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: AGENTS */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#161B22] p-4 rounded-xl border border-[#30363D]">
            <div>
              <h3 className="text-sm font-bold text-[#F0F6FC] mb-1">Agentes de Infraestructura (InfraInventory Agent)</h3>
              <p className="text-xs text-[#8B949E]">
                Agentes ligeros en Windows/Linux para telemetría continua y ejecución no intrusiva.
              </p>
            </div>

            {hasPermission('AGENT_MANAGE') && (
              <button
                onClick={() => setIsRegisterAgentOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Agente</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((ag) => {
              const hb = ag.heartbeats?.[0];
              return (
                <div key={ag.id} className="bg-[#161B22] p-5 rounded-xl border border-[#30363D] flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-sm font-bold text-[#F0F6FC]">{ag.hostname}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ag.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        ag.status === 'REVOKED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                        'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                      }`}>
                        {ag.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-[#8B949E] mb-4">
                      <div>SO: <span className="text-[#F0F6FC]">{ag.osType} {ag.osVersion || ''}</span></div>
                      <div>IP: <span className="text-cyan-400 font-mono">{ag.ipAddress || 'Auto'}</span></div>
                      <div>Versión Agente: <span className="text-[#F0F6FC]">{ag.agentVersion}</span></div>
                      <div>Último Latido: <span className="text-[#F0F6FC]">{new Date(ag.lastSeenAt).toLocaleTimeString()}</span></div>
                    </div>

                    {hb && (
                      <div className="bg-[#0D1117] p-3 rounded-lg border border-[#30363D] space-y-2 mb-4">
                        <div className="text-[10px] font-bold text-[#8B949E] uppercase">Telemetría Reciente</div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-[#161B22] p-1.5 rounded">
                            <div className="text-[10px] text-[#8B949E]">CPU</div>
                            <div className="text-xs font-bold text-amber-400">{hb.cpuUsage ?? '-'}%</div>
                          </div>
                          <div className="bg-[#161B22] p-1.5 rounded">
                            <div className="text-[10px] text-[#8B949E]">RAM</div>
                            <div className="text-xs font-bold text-cyan-400">{hb.ramUsage ?? '-'}%</div>
                          </div>
                          <div className="bg-[#161B22] p-1.5 rounded">
                            <div className="text-[10px] text-[#8B949E]">DISCO</div>
                            <div className="text-xs font-bold text-purple-400">{hb.diskUsage ?? '-'}%</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 7: POLICIES */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="bg-[#161B22] p-4 rounded-xl border border-[#30363D]">
            <h3 className="text-sm font-bold text-[#F0F6FC] mb-1">Políticas de Ejecución & Reglas de Automatización</h3>
            <p className="text-xs text-[#8B949E]">
              Definición de umbrales máximos de riesgo permitido, obligatoriedad de aprobaciones y ventanas de mantenimiento.
            </p>
          </div>

          <div className="space-y-3">
            {policies.map((pol) => (
              <div key={pol.id} className="bg-[#161B22] p-5 rounded-xl border border-[#30363D]">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#F0F6FC]">{pol.name}</h4>
                    <p className="text-xs text-[#8B949E]">{pol.description}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    pol.enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {pol.enabled ? 'ACTIVA' : 'INACTIVA'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-[#30363D]">
                  <div>
                    <span className="text-[#8B949E]">Riesgo Máximo:</span>
                    <div className="font-semibold text-amber-400">{pol.maxRiskLevelAllowed}</div>
                  </div>
                  <div>
                    <span className="text-[#8B949E]">Aprobación Exigida Desde:</span>
                    <div className="font-semibold text-orange-400">{pol.requireApprovalForRisk}</div>
                  </div>
                  <div>
                    <span className="text-[#8B949E]">Principio 4 Ojos:</span>
                    <div className="font-semibold text-emerald-400">{pol.enforceFourEyes ? 'ESTRICTO (ACTIVO)' : 'DESACTIVADO'}</div>
                  </div>
                  <div>
                    <span className="text-[#8B949E]">Auto-Remediación:</span>
                    <div className="font-semibold text-cyan-400">{pol.allowAutoRemediation ? 'PERMITIDA' : 'DESACTIVADA'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: AI PROPOSALS */}
      {activeTab === 'ai-proposals' && (
        <div className="space-y-4">
          <div className="bg-[#161B22] p-4 rounded-xl border border-[#30363D]">
            <h3 className="text-sm font-bold text-[#F0F6FC] mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Propuestas de Acción Sugeridas por IA (Controladas)
            </h3>
            <p className="text-xs text-[#8B949E]">
              La IA genera propuestas estructuradas basadas en diagnósticos. Ninguna acción de IA se ejecuta sin validación explícita humana.
            </p>
          </div>

          <div className="space-y-3">
            {proposals.length === 0 ? (
              <div className="bg-[#161B22] p-8 rounded-xl border border-[#30363D] text-center text-xs text-[#8B949E]">
                No hay propuestas de IA pendientes en este momento.
              </div>
            ) : (
              proposals.map((prop) => (
                <div key={prop.id} className="bg-[#161B22] p-5 rounded-xl border border-[#30363D] space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-[#F0F6FC]">{prop.problemDescription}</span>
                        {getRiskBadge(prop.riskLevel)}
                      </div>
                      <div className="text-xs text-[#8B949E]">
                        Acción Propuesta: <span className="font-mono text-cyan-400 font-bold">{prop.proposedAction}</span> sobre <span className="text-[#F0F6FC] font-semibold">{prop.targetId}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {prop.status}
                    </span>
                  </div>

                  <div className="text-xs text-[#C9D1D9] bg-[#0D1117] p-3 rounded-lg border border-[#30363D]">
                    <strong>Razonamiento IA:</strong> {prop.reason}
                  </div>

                  {prop.status === 'PROPOSED' && (
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => handleDecideProposal(prop.id, 'REJECT')}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleDecideProposal(prop.id, 'ACCEPT')}
                        className="px-3 py-1.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-bold border border-[#30363D]"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => handleDecideProposal(prop.id, 'EXECUTE')}
                        className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white text-xs font-bold shadow-md"
                      >
                        Ejecutar Acción
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: EXECUTE WORKFLOW */}
      {executeModalWorkflow && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h3 className="text-base font-bold text-[#F0F6FC] flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-400" />
                Lanzar Workflow: {executeModalWorkflow.name}
              </h3>
              <button onClick={() => setExecuteModalWorkflow(null)} className="text-[#8B949E] hover:text-[#F0F6FC]">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#8B949E] mb-1">Identificador Objetivo (IP, Hostname o ID):</label>
                <input
                  type="text"
                  placeholder="Ej: srv-db-01 o 192.168.1.50"
                  value={executeTarget}
                  onChange={(e) => setExecuteTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1">Motivo / Justificación:</label>
                <input
                  type="text"
                  placeholder="Ej: Diagnóstico preventivo tras alerta de latencia"
                  value={executeReason}
                  onChange={(e) => setExecuteReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-[#0D1117] rounded-lg border border-[#30363D]">
                <input
                  type="checkbox"
                  id="dryRunCheck"
                  checked={executeDryRun}
                  onChange={(e) => setExecuteDryRun(e.target.checked)}
                  className="w-4 h-4 text-cyan-500 rounded bg-[#161B22] border-[#30363D]"
                />
                <label htmlFor="dryRunCheck" className="text-xs text-[#C9D1D9] cursor-pointer">
                  <strong>Modo Simulación Segura (Dry-Run)</strong>: Ejecuta diagnósticos pero simula y no altera configuraciones de escritura.
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#30363D]">
              <button
                onClick={() => setExecuteModalWorkflow(null)}
                className="px-4 py-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteWorkflow}
                disabled={isExecuting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md"
              >
                {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>{executeDryRun ? 'Iniciar Dry-Run' : 'Ejecutar Ahora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RUN LOGS DETAIL */}
      {selectedRun && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h3 className="text-base font-bold text-[#F0F6FC] flex items-center gap-2">
                <Terminal className="w-5 h-5 text-amber-400" />
                Detalle de Ejecución: {selectedRun.workflow?.name}
              </h3>
              <button onClick={() => setSelectedRun(null)} className="text-[#8B949E] hover:text-[#F0F6FC]">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#0D1117] p-3 rounded-lg border border-[#30363D]">
                <div>Estado: <strong>{selectedRun.status}</strong></div>
                <div>Modo: <strong>{selectedRun.isDryRun ? 'DRY-RUN' : 'REAL'}</strong></div>
                <div>Target: <strong className="font-mono text-cyan-400">{selectedRun.targetIdentifier}</strong></div>
                <div>Fecha: <strong>{new Date(selectedRun.createdAt).toLocaleTimeString()}</strong></div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#8B949E] uppercase mb-2">Pasos Ejecutados ({selectedRun.runSteps?.length || 0})</h4>
                <div className="space-y-2">
                  {selectedRun.runSteps?.map((step) => (
                    <div key={step.id} className="bg-[#0D1117] p-3 rounded-lg border border-[#30363D] text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#F0F6FC]">{step.workflowStep?.label || step.workflowStepId}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          step.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-500/10' :
                          step.status === 'FAILED' ? 'text-red-400 bg-red-500/10' :
                          'text-gray-400 bg-gray-500/10'
                        }`}>
                          {step.status} ({step.durationMs}ms)
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-[#8B949E] bg-[#161B22] p-2 rounded mt-2 overflow-x-auto">
                        {step.output || step.errorMessage || 'Sin salida'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#8B949E] uppercase mb-2">Logs Completos del Runner</h4>
                <pre className="bg-[#0D1117] p-4 rounded-lg border border-[#30363D] text-[11px] font-mono text-amber-300/90 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedRun.logs || 'Sin logs disponibles'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#30363D]">
              <button
                onClick={() => setSelectedRun(null)}
                className="px-4 py-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE WORKFLOW */}
      {isCreateWfOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateWorkflowSubmit} className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h3 className="text-base font-bold text-[#F0F6FC] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                Crear Nuevo Workflow de Automatización
              </h3>
              <button type="button" onClick={() => setIsCreateWfOpen(false)} className="text-[#8B949E] hover:text-[#F0F6FC]">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 text-xs flex-1 pr-2">
              <div>
                <label className="block text-[#8B949E] mb-1">Nombre del Workflow *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Verificación y Limpieza Nocturna"
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-[#F0F6FC]"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Describe la secuencia operativa..."
                  value={wfDesc}
                  onChange={(e) => setWfDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-[#F0F6FC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8B949E] mb-1">Categoría</label>
                  <select
                    value={wfCategory}
                    onChange={(e) => setWfCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-[#F0F6FC]"
                  >
                    <option value="DIAGNOSTIC">DIAGNOSTIC</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="REMEDIATION">REMEDIATION</option>
                    <option value="SECURITY">SECURITY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#8B949E] mb-1">Tipo de Objetivo</label>
                  <select
                    value={wfTargetType}
                    onChange={(e) => setWfTargetType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-[#F0F6FC]"
                  >
                    <option value="MACHINE">MACHINE</option>
                    <option value="NETWORK">NETWORK</option>
                    <option value="GROUP">GROUP</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#F0F6FC]">Pasos del Workflow</span>
                  <button
                    type="button"
                    onClick={() => {
                      setWfSteps([
                        ...wfSteps,
                        {
                          order: wfSteps.length + 1,
                          actionName: 'system_info',
                          label: 'Diagnóstico de Recursos',
                          condition: 'ALWAYS',
                          continueOnError: false,
                          timeoutSec: 30,
                          retryCount: 0,
                          retryIntervalSec: 5,
                        },
                      ]);
                    }}
                    className="px-2 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-amber-400 font-semibold text-[11px]"
                  >
                    + Añadir Paso
                  </button>
                </div>

                <div className="space-y-2">
                  {wfSteps.map((step, idx) => (
                    <div key={idx} className="bg-[#0D1117] p-3 rounded-lg border border-[#30363D] flex items-center gap-3">
                      <span className="text-amber-400 font-bold font-mono">#{step.order}</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <select
                          value={step.actionName}
                          onChange={(e) => {
                            const newSteps = [...wfSteps];
                            newSteps[idx].actionName = e.target.value;
                            newSteps[idx].label = actions.builtIns.find(a => a.name === e.target.value)?.label || e.target.value;
                            setWfSteps(newSteps);
                          }}
                          className="px-2 py-1.5 rounded bg-[#161B22] border border-[#30363D] text-[#F0F6FC]"
                        >
                          {actions.builtIns.map(a => (
                            <option key={a.name} value={a.name}>{a.label} ({a.riskLevel})</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={step.label}
                          onChange={(e) => {
                            const newSteps = [...wfSteps];
                            newSteps[idx].label = e.target.value;
                            setWfSteps(newSteps);
                          }}
                          className="px-2 py-1.5 rounded bg-[#161B22] border border-[#30363D] text-[#F0F6FC]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (wfSteps.length > 1) {
                            setWfSteps(wfSteps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
                          }
                        }}
                        className="text-red-400 hover:text-red-300 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#30363D]">
              <button
                type="button"
                onClick={() => setIsCreateWfOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md"
              >
                Guardar Workflow
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: REGISTER AGENT */}
      {isRegisterAgentOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h3 className="text-base font-bold text-[#F0F6FC] flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                Registrar InfraInventory Agent
              </h3>
              <button onClick={() => { setIsRegisterAgentOpen(false); setNewAgentToken(null); }} className="text-[#8B949E] hover:text-[#F0F6FC]">
                ✕
              </button>
            </div>

            {newAgentToken ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-semibold">
                  Agente registrado correctamente. Guarda el token seguro de autenticación (sólo se muestra una vez):
                </div>
                <div className="p-3 bg-[#0D1117] rounded-lg border border-[#30363D] font-mono text-cyan-400 select-all break-all">
                  {newAgentToken}
                </div>
                <button
                  onClick={() => { setIsRegisterAgentOpen(false); setNewAgentToken(null); }}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs"
                >
                  Entendido y Guardado
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterAgentSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#8B949E] mb-1">Hostname del Servidor / Host *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: srv-prod-linux-01"
                    value={agentHostname}
                    onChange={(e) => setAgentHostname(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-[#F0F6FC]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#8B949E] mb-1">Sistema Operativo</label>
                    <select
                      value={agentOs}
                      onChange={(e) => setAgentOs(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-[#F0F6FC]"
                    >
                      <option value="LINUX">Linux (systemd)</option>
                      <option value="WINDOWS">Windows (Service)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8B949E] mb-1">IP Primaria</label>
                    <input
                      type="text"
                      placeholder="192.168.1.100"
                      value={agentIp}
                      onChange={(e) => setAgentIp(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-[#F0F6FC]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#30363D]">
                  <button
                    type="button"
                    onClick={() => setIsRegisterAgentOpen(false)}
                    className="px-4 py-2 rounded-lg bg-[#21262D] text-[#8B949E] font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                  >
                    Generar Token & Registrar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};