import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sliders,
  BarChart3,
  FileText,
  Clock,
  Shield,
  Activity,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  AIConversation,
  AIMessage,
  AIDashboardStats,
  Machine,
} from '../types/index.js';

export interface AiAssistantPageProps {
  initialTab?: string;
  onNavigateToMachine?: (machineId: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onNavigateToAlerts?: () => void;
  onNavigateToMonitoring?: () => void;
  onNavigateToTickets?: () => void;
}

export const AiAssistantPage: React.FC<AiAssistantPageProps> = ({
  initialTab = 'chat',
  onNavigateToMachine,
  onNavigateToTab,
  onNavigateToAlerts,
  onNavigateToMonitoring,
  onNavigateToTickets,
}) => {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Conversations & Chat
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Diagnostic / Analyze tab
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Reports tab
  const [reportType, setReportType] = useState('INFRASTRUCTURE_SUMMARY');
  const [reportPeriod, setReportPeriod] = useState('7d');
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Dashboard tab
  const [dashboardStats, setDashboardStats] = useState<AIDashboardStats | null>(null);

  // Settings tab
  const [configForm, setConfigForm] = useState({
    isEnabled: true,
    provider: 'ollama',
    baseUrl: 'http://ollama:11434',
    model: 'llama3:8b',
    apiKey: '',
    timeoutMs: 30000,
    maxTokens: 2048,
    temperature: 0.1,
    rateLimitPerMinute: 60,
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Initial Data Load
  useEffect(() => {
    fetchConversations();
    fetchMachines();
    if (hasPermission('AI_CONFIG')) {
      fetchConfig();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    }
  }, [activeTab]);

  const fetchConversations = async () => {
    try {
      const res = await api.getAIHistory();
      setConversations(res);
    } catch {
      // Graceful fallback
    }
  };

  const fetchMachines = async () => {
    try {
      const res = await api.getMachines({ limit: 100 });
      setMachines(res.items || []);
      if (res.items?.length > 0) {
        setSelectedMachineId(res.items[0].id);
      }
    } catch {
      // Fallback
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.getAIDashboard();
      setDashboardStats(res);
    } catch {
      // Fallback
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.getAIConfig();
      setConfigForm({
        isEnabled: res.isEnabled,
        provider: res.provider || 'ollama',
        baseUrl: res.baseUrl || 'http://ollama:11434',
        model: res.model || 'llama3:8b',
        apiKey: '',
        timeoutMs: res.timeoutMs || 30000,
        maxTokens: res.maxTokens || 2048,
        temperature: res.temperature || 0.1,
        rateLimitPerMinute: res.rateLimitPerMinute || 60,
      });
    } catch {
      // Fallback
    }
  };

  const selectConversation = async (convId: string) => {
    setCurrentConversationId(convId);
    try {
      const res = await api.getAIConversation(convId);
      setMessages(res.messages || []);
    } catch (err: any) {
      toast.error('Error al cargar conversación', err.message);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setInputPrompt('');
  };

  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await api.deleteAIConversation(convId);
      toast.success('Conversación eliminada');
      if (currentConversationId === convId) {
        startNewConversation();
      }
      fetchConversations();
    } catch (err: any) {
      toast.error('Error al eliminar conversación', err.message);
    }
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isSending) return;

    setInputPrompt('');
    setIsSending(true);

    // Optimistically append user message to list
    const tempUserMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversationId || '',
      role: 'USER',
      content: text,
      toolsUsed: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.sendAIChat({
        message: text,
        conversationId: currentConversationId || undefined,
      });

      if (!currentConversationId) {
        setCurrentConversationId(res.conversationId);
        fetchConversations();
      }

      const assistantMsg: AIMessage = {
        id: res.messageId,
        conversationId: res.conversationId,
        role: 'ASSISTANT',
        content: res.response.content,
        findings: res.response.findings,
        evidence: res.response.evidence,
        recommendations: res.response.recommendations,
        relatedEntities: res.response.relatedEntities,
        toolsUsed: res.response.toolsUsed,
        durationMs: res.response.durationMs,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error('Error en consulta IA', err.message);
      const errorMsg: AIMessage = {
        id: `err-${Date.now()}`,
        conversationId: currentConversationId || '',
        role: 'ASSISTANT',
        content: `⚠️ No se pudo procesar la solicitud: ${err.message}`,
        toolsUsed: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedMachineId) return;
    setIsAnalyzing(true);
    try {
      const res = await api.sendAIAnalyze({
        targetType: 'MACHINE',
        targetId: selectedMachineId,
      });
      setAnalysisResult(res);
      toast.success('Diagnóstico completado');
    } catch (err: any) {
      toast.error('Error en diagnóstico', err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const res = await api.generateAIReport({
        reportType,
        period: reportPeriod,
        format: 'MARKDOWN',
      });
      setGeneratedReport(res);
      toast.success('Informe generado correctamente');
    } catch (err: any) {
      toast.error('Error al generar informe', err.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.testAIConnection(configForm);
      setTestResult(res);
      if (res.success) {
        toast.success('Conexión con IA exitosa', res.message);
      } else {
        toast.error('Fallo de conexión', res.message);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      toast.error('Error de conexión', err.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAIConfig(configForm);
      toast.success('Configuración guardada', 'Los ajustes del motor de IA han sido actualizados');
      fetchConfig();
    } catch (err: any) {
      toast.error('Error al guardar configuración', err.message);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.info('Copiado al portapapeles');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const samplePrompts = [
    '¿Qué servidores están teniendo problemas de rendimiento?',
    '¿Qué máquinas están caídas o en warning?',
    'Compara los servidores principales de producción',
    '¿Qué licencias o garantías están próximas a vencer?',
    '¿Qué tickets críticos están abiertos?',
    '¿Qué mantenimientos tenemos programados?',
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-[#F1F5F9]">
      {/* Header & Subtitle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#252D38] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
              <Bot className="w-7 h-7 text-[#06B6D4]" />
              InfraInventory AI — Asistente Inteligente
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30">
              LOCAL-FIRST • READ ONLY
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            Análisis contextual, detección de anomalías telemétricas, correlación de incidentes y consultas seguras fundamentadas en datos reales.
          </p>
        </div>

        {/* Global Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-[#0F141B] p-1 rounded-xl border border-[#252D38]">
          {[
            { id: 'chat', label: 'Chat Asistente', icon: Bot },
            { id: 'analyze', label: 'Diagnóstico 360°', icon: Activity },
            { id: 'reports', label: 'Informes IA', icon: FileText },
            { id: 'dashboard', label: 'Panel de Control', icon: BarChart3 },
            ...(hasPermission('AI_CONFIG') ? [{ id: 'settings', label: 'Ajustes IA', icon: Sliders }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
      </div>

      {/* 1. CHAT ASISTENTE TAB */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[680px]">
          {/* Left Sidebar: Conversations History */}
          <div className="lg:col-span-1 p-4 rounded-xl bg-[#0F141B] border border-[#252D38] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <button
                onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#06B6D4] text-[#0B0F14] font-semibold text-xs hover:bg-[#06B6D4]/90 shadow-md shadow-cyan-500/10 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Consulta</span>
              </button>

              <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider px-1 pt-2">
                Historial de Sesiones
              </div>

              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {conversations.length === 0 ? (
                  <p className="text-xs text-[#64748B] italic p-2">Sin conversaciones previas</p>
                ) : (
                  conversations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => selectConversation(c.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition-all ${
                        currentConversationId === c.id
                          ? 'bg-[#151B23] border border-[#06B6D4]/40 text-[#06B6D4] font-semibold'
                          : 'text-[#94A3B8] hover:bg-[#151B23] hover:text-[#F1F5F9]'
                      }`}
                    >
                      <span className="truncate pr-2">{c.title}</span>
                      <button
                        onClick={(e) => deleteConversation(e, c.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#64748B] hover:text-[#EF4444] transition-opacity p-1"
                        title="Eliminar conversación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Safety & Grounding Footer Notice */}
            <div className="p-3 rounded-lg bg-[#151B23] border border-[#252D38] text-[11px] text-[#94A3B8] space-y-1">
              <div className="flex items-center gap-1.5 text-[#06B6D4] font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Garantía de Seguridad</span>
              </div>
              <p className="text-[10px] text-[#64748B] leading-tight">
                Respuestas fundamentadas exclusivamente en datos reales de InfraInventory con permisos de solo lectura.
              </p>
            </div>
          </div>

          {/* Right Main Chat Window */}
          <div className="lg:col-span-3 rounded-xl bg-[#0F141B] border border-[#252D38] flex flex-col justify-between overflow-hidden shadow-xl">
            {/* Messages Stream */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 max-h-[580px]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4] shadow-lg shadow-cyan-500/10">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="max-w-md space-y-1.5">
                    <h3 className="text-base font-bold text-[#F1F5F9]">¿En qué puedo ayudarte hoy?</h3>
                    <p className="text-xs text-[#94A3B8]">
                      Puedo diagnosticar incidencias, comparar hosts, verificar contratos de garantía o analizar el cumplimiento de SLAs.
                    </p>
                  </div>

                  {/* Sample prompt pills */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-xl w-full pt-4">
                    {samplePrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left p-3 rounded-lg bg-[#151B23] border border-[#252D38] hover:border-[#06B6D4]/40 hover:bg-[#1C2430] text-xs text-[#F1F5F9] transition-all flex items-start gap-2"
                      >
                        <Zap className="w-3.5 h-3.5 text-[#06B6D4] flex-shrink-0 mt-0.5" />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`flex gap-3.5 ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role !== 'USER' && (
                      <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4] flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-3xl rounded-xl p-4.5 text-xs space-y-3 shadow-md ${
                        msg.role === 'USER'
                          ? 'bg-[#06B6D4] text-[#0B0F14] font-medium ml-12 rounded-tr-none'
                          : 'bg-[#151B23] text-[#F1F5F9] border border-[#252D38] mr-12 rounded-tl-none'
                      }`}
                    >
                      {/* Message Content (Markdown Format) */}
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      {/* Structured Findings Pills */}
                      {msg.findings && msg.findings.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[#252D38]/60">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                            Hallazgos Clave:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.findings.map((f, fIdx) => (
                              <span
                                key={fIdx}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                                  f.severity === 'CRITICAL'
                                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                    : f.severity === 'WARNING'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : f.severity === 'HEALTHY'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                }`}
                              >
                                {f.label}: {f.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evidence & Sources Box */}
                      {msg.evidence && msg.evidence.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-[#0F141B]/80 border border-[#252D38] text-[11px] space-y-1">
                          <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Fuentes de Evidencia:
                          </span>
                          {msg.evidence.map((ev, evIdx) => (
                            <div key={evIdx} className="text-[#94A3B8] flex items-center justify-between gap-2">
                              <span>• {ev.source}: {ev.detail}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Clickable Related Entities & Action Links */}
                      {msg.relatedEntities && msg.relatedEntities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.relatedEntities.map((ent, entIdx) => (
                            <button
                              key={entIdx}
                              onClick={() => {
                                if (ent.type === 'machine' && onNavigateToMachine) {
                                  onNavigateToMachine(ent.id);
                                } else if (ent.type === 'ticket' && onNavigateToTickets) {
                                  onNavigateToTickets();
                                } else if (ent.type === 'incident' && onNavigateToAlerts) {
                                  onNavigateToAlerts();
                                } else if (onNavigateToTab) {
                                  onNavigateToTab(ent.type === 'ticket' ? 'operations' : ent.type === 'asset' ? 'assets' : 'monitoring');
                                } else if (onNavigateToMonitoring) {
                                  onNavigateToMonitoring();
                                }
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-[#252D38] text-[11px] text-[#06B6D4] hover:bg-[#06B6D4] hover:text-[#0B0F14] transition-all font-semibold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>{ent.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Tool and Latency Metadata Footer */}
                      {msg.role === 'ASSISTANT' && msg.durationMs && (
                        <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1 border-t border-[#252D38]/40">
                          <span>
                            {msg.toolsUsed && msg.toolsUsed.length > 0 ? `Herramientas: ${msg.toolsUsed.join(', ')}` : 'Motor Local'}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {msg.durationMs} ms
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isSending && (
                <div className="flex gap-3.5 items-center text-xs text-[#06B6D4]">
                  <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#06B6D4]" />
                  </div>
                  <span className="animate-pulse">Consultando telemetría y cruzando evidencias de infraestructura...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt Input Form */}
            <div className="p-4 bg-[#151B23] border-t border-[#252D38]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Pregunta a InfraInventory AI (ej. '¿Qué servidores tienen problemas de rendimiento?')..."
                  className="flex-1 bg-[#0F141B] border border-[#252D38] rounded-xl px-4 py-3 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4] transition-all placeholder-[#64748B]"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isSending}
                  className="px-5 py-3 rounded-xl bg-[#06B6D4] text-[#0B0F14] font-bold text-xs hover:bg-[#06B6D4]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Preguntar</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2. DIAGNÓSTICO 360° TAB */}
      {activeTab === 'analyze' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-4">
            <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#06B6D4]" />
              Análisis Diagnóstico 360° de Servidores & Servicios
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Selecciona un servidor del inventario para correlacionar en tiempo real sus métricas de telemetría, puertos abiertos, incidentes registrados, cambios recientes y contratos de garantía.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="w-full sm:w-80 bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.hostname} ({m.primaryIp || 'Sin IP'}) - {m.status}
                  </option>
                ))}
              </select>

              <button
                onClick={handleRunAnalysis}
                disabled={!selectedMachineId || isAnalyzing}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-[#06B6D4] text-[#0B0F14] font-bold text-xs hover:bg-[#06B6D4]/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Activity className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzing ? 'Analizando...' : 'Ejecutar Diagnóstico'}</span>
              </button>
            </div>
          </div>

          {analysisResult && (
            <div className="p-6 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-5">
              <div className="flex items-center justify-between border-b border-[#252D38] pb-4">
                <div>
                  <h4 className="text-sm font-bold text-[#F1F5F9]">{analysisResult.summary}</h4>
                  <span className="text-[11px] font-mono text-[#06B6D4]">Nodo: {analysisResult.target}</span>
                </div>
                <button
                  onClick={() => onNavigateToMachine && onNavigateToMachine(selectedMachineId)}
                  className="px-3 py-1.5 rounded bg-[#151B23] border border-[#252D38] hover:border-[#06B6D4] text-xs text-[#06B6D4] flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver Ficha Técnica</span>
                </button>
              </div>

              {/* Findings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysisResult.findings?.map((f: any, i: number) => (
                  <div key={i} className="p-4 rounded-lg bg-[#151B23] border border-[#252D38] space-y-1">
                    <span className="text-[11px] text-[#94A3B8] font-semibold">{f.label}</span>
                    <p className="text-sm font-bold text-[#F1F5F9]">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="p-4 rounded-lg bg-[#151B23] border border-[#252D38] space-y-2">
                <span className="text-xs font-bold text-[#22C55E] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Recomendaciones Técnicas Sugeridas:
                </span>
                <ul className="list-disc list-inside text-xs text-[#94A3B8] space-y-1">
                  {analysisResult.recommendations?.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. INFORMES IA TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-4">
            <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#06B6D4]" />
              Generación de Informes de Infraestructura & Auditoría
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-[#94A3B8] text-xs mb-1">Tipo de Informe</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9]"
                >
                  <option value="INFRASTRUCTURE_SUMMARY">Resumen General de Infraestructura</option>
                  <option value="AVAILABILITY">Disponibilidad & Salud de Servicios</option>
                  <option value="CAPACITY_PLANNING">Planificación de Capacidad & Hardware</option>
                  <option value="SLA_COMPLIANCE">Cumplimiento de SLAs & Incidencias</option>
                  <option value="HARDWARE_WARRANTY">Garantías & Amortización de Activos</option>
                </select>
              </div>

              <div>
                <label className="block text-[#94A3B8] text-xs mb-1">Periodo</label>
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9]"
                >
                  <option value="today">Hoy (Últimas 24 horas)</option>
                  <option value="7d">Últimos 7 días</option>
                  <option value="30d">Último mes (30 días)</option>
                  <option value="year">Histórico anual</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  className="w-full px-5 py-2 rounded-lg bg-[#06B6D4] text-[#0B0F14] font-bold text-xs hover:bg-[#06B6D4]/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <FileText className={`w-4 h-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingReport ? 'Generando Informe...' : 'Generar Informe'}</span>
                </button>
              </div>
            </div>
          </div>

          {generatedReport && (
            <div className="p-6 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-4">
              <div className="flex items-center justify-between border-b border-[#252D38] pb-4">
                <div>
                  <h4 className="text-base font-bold text-[#F1F5F9]">{generatedReport.title}</h4>
                  <span className="text-[11px] text-[#94A3B8]">Generado: {new Date(generatedReport.generatedAt).toLocaleString()}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedReport.content, 999)}
                  className="px-3 py-1.5 rounded bg-[#151B23] border border-[#252D38] text-xs text-[#06B6D4] hover:bg-[#252D38] flex items-center gap-1.5"
                >
                  {copiedIndex === 999 ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Markdown</span>
                </button>
              </div>

              <div className="p-5 rounded-lg bg-[#151B23] border border-[#252D38] text-xs font-mono whitespace-pre-wrap text-[#F1F5F9] leading-relaxed max-h-[500px] overflow-y-auto">
                {generatedReport.content}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. PANEL DE CONTROL IA TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-1">
              <span className="text-xs text-[#94A3B8]">Estado del Motor</span>
              <p className="text-xl font-bold text-[#22C55E] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                {dashboardStats?.status || 'OPERATIONAL'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-1">
              <span className="text-xs text-[#94A3B8]">Consultas Hoy</span>
              <p className="text-xl font-bold text-[#06B6D4]">{dashboardStats?.queriesToday || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-1">
              <span className="text-xs text-[#94A3B8]">Latencia Media</span>
              <p className="text-xl font-bold text-[#F59E0B]">{dashboardStats?.avgLatencyMs || 0} ms</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-1">
              <span className="text-xs text-[#94A3B8]">Tasa de Éxito</span>
              <p className="text-xl font-bold text-[#A855F7]">{dashboardStats?.successRate || '100%'}</p>
            </div>
          </div>

          {/* Query Logs Table */}
          <div className="p-5 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#06B6D4]" />
              Registro Reciente de Consultas al Asistente
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#151B23] text-[#94A3B8]">
                  <tr>
                    <th className="p-3">Fecha / Hora</th>
                    <th className="p-3">Usuario (Rol)</th>
                    <th className="p-3">Consulta</th>
                    <th className="p-3">Herramientas</th>
                    <th className="p-3">Duración</th>
                    <th className="p-3">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {(dashboardStats?.recentLogs || []).map((log) => (
                    <tr key={log.id} className="hover:bg-[#151B23]/50">
                      <td className="p-3 text-[#94A3B8] font-mono">{new Date(log.createdAt).toLocaleTimeString()}</td>
                      <td className="p-3 font-semibold text-[#F1F5F9]">{log.user} ({log.role})</td>
                      <td className="p-3 max-w-xs truncate text-[#F1F5F9]">{log.query}</td>
                      <td className="p-3 text-[11px] font-mono text-[#06B6D4]">{log.toolsCalled?.join(', ') || 'NLP'}</td>
                      <td className="p-3 font-mono text-[#94A3B8]">{log.durationMs} ms</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                          {log.success ? 'OK' : 'ERROR'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. AJUSTES IA TAB (ADMIN ONLY) */}
      {activeTab === 'settings' && hasPermission('AI_CONFIG') && (
        <div className="max-w-3xl space-y-6">
          <form onSubmit={handleSaveConfig} className="p-6 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-5 text-xs">
            <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#06B6D4]" />
              Configuración del Proveedor y Modelo de IA
            </h3>

            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="aiEnabled"
                checked={configForm.isEnabled}
                onChange={(e) => setConfigForm({ ...configForm, isEnabled: e.target.checked })}
                className="rounded bg-[#151B23] border-[#252D38] text-[#06B6D4] w-4 h-4"
              />
              <label htmlFor="aiEnabled" className="text-xs font-semibold text-[#F1F5F9]">
                Habilitar InfraInventory AI en la plataforma
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#94A3B8] mb-1">Proveedor de IA</label>
                <select
                  value={configForm.provider}
                  onChange={(e) => setConfigForm({ ...configForm, provider: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                >
                  <option value="ollama">Ollama (Local-First)</option>
                  <option value="openai">OpenAI Compatible API</option>
                  <option value="custom">Custom Endpoint</option>
                </select>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">Nombre del Modelo</label>
                <input
                  type="text"
                  value={configForm.model}
                  onChange={(e) => setConfigForm({ ...configForm, model: e.target.value })}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                  placeholder="llama3:8b, mistral, gpt-4o-mini..."
                />
              </div>
            </div>

            <div>
              <label className="block text-[#94A3B8] mb-1">URL Base del Endpoint</label>
              <input
                type="text"
                value={configForm.baseUrl}
                onChange={(e) => setConfigForm({ ...configForm, baseUrl: e.target.value })}
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                placeholder="http://ollama:11434"
              />
            </div>

            <div>
              <label className="block text-[#94A3B8] mb-1">Clave API (Opcional para proveedores externos)</label>
              <input
                type="password"
                value={configForm.apiKey}
                onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-[#F1F5F9]"
                placeholder="sk-••••••••••••••••"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[#252D38]">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-4 py-2 rounded-lg bg-[#151B23] border border-[#252D38] hover:border-[#06B6D4] text-xs text-[#06B6D4] font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>Probar Conexión</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#06B6D4] text-[#0B0F14] font-bold text-xs hover:bg-[#06B6D4]/90 shadow-md shadow-cyan-500/20"
              >
                Guardar Ajustes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
