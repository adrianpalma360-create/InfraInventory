import React, { useState, useEffect } from 'react';
import { useAuth, Can } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api, notificationApi } from '../services/api.js';
import {
  SystemSettings,
  NotificationConfigDTO,
  NotificationDeliveryLogItem,
} from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Badge } from '../components/ui/Badge.js';
import {
  Settings,
  Database,
  Radio,
  ShieldCheck,
  Zap,
  Sliders,
  Save,
  RefreshCw,
  Loader2,
  FileText,
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Key,
  MessageSquare,
  History,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'general' | 'telegram'>('general');

  // General Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    organizationName: 'Palma NOC Enterprise',
    primarySubnet: '192.168.1.0/24',
    discoveryTimeoutMs: 600,
    discoveryConcurrency: 32,
    sessionExpiryDays: 7,
    enableAuditLogs: true,
    auditRetentionDays: 90,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Telegram Notifications State
  const [telegramConfig, setTelegramConfig] = useState<NotificationConfigDTO>({
    provider: 'TELEGRAM',
    name: 'Telegram Default Bot',
    enabled: false,
    botTokenMasked: null,
    botTokenConfigured: false,
    chatId: '',
    minSeverity: 'INFO',
    cooldownMinutes: 15,
    rateLimitPerMin: 20,
    events: {
      HOST_OFFLINE: true,
      HOST_RECOVERED: true,
      SERVICE_DOWN: true,
      SERVICE_RECOVERED: true,
      HIGH_CPU: true,
      HIGH_RAM: true,
      HIGH_DISK: true,
      CRITICAL_ALERT: true,
      WARNING_ALERT: true,
      DISCOVERY_NEW_DEVICE: true,
      DISCOVERY_CHANGE: true,
      BACKUP_COMPLETED: true,
      BACKUP_FAILED: true,
      RESTORE_COMPLETED: true,
      RESTORE_FAILED: true,
      IMPORT_FAILED: true,
    },
  });

  const [newBotToken, setNewBotToken] = useState('');
  const [customTopicId, setCustomTopicId] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationDeliveryLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const canEdit = hasPermission('SETTINGS_UPDATE');

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err: any) {
      toast.error('Error al cargar configuración', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTelegramConfig = async () => {
    try {
      const config = await notificationApi.getTelegramConfig();
      if (config) {
        setTelegramConfig(config);
        if (config.customTopicId) setCustomTopicId(config.customTopicId);
      }
    } catch (err: any) {
      console.warn('Could not load Telegram configuration:', err.message);
    }
  };

  const loadDeliveryHistory = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await notificationApi.getHistory(50);
      setDeliveryLogs(logs);
    } catch (err: any) {
      console.warn('Could not load delivery history:', err.message);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadTelegramConfig();
    loadDeliveryHistory();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('Permiso denegado', 'No tienes permisos para modificar la configuración.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      toast.success('Configuración guardada', 'Los parámetros operativos se han actualizado.');
    } catch (err: any) {
      toast.error('Error al guardar configuración', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('Permiso denegado', 'No tienes permisos para modificar las notificaciones.');
      return;
    }

    setIsSavingTelegram(true);
    try {
      const payload: any = {
        enabled: telegramConfig.enabled,
        chatId: telegramConfig.chatId,
        customTopicId: customTopicId.trim() || null,
        minSeverity: telegramConfig.minSeverity,
        cooldownMinutes: telegramConfig.cooldownMinutes,
        rateLimitPerMin: telegramConfig.rateLimitPerMin,
        events: telegramConfig.events,
      };

      if (newBotToken.trim()) {
        payload.botToken = newBotToken.trim();
      }

      const updated = await notificationApi.updateTelegramConfig(payload);
      setTelegramConfig(updated);
      setNewBotToken('');
      toast.success('Telegram configurado', 'La configuración del bot de alertas ha sido guardada con éxito.');
      loadDeliveryHistory();
    } catch (err: any) {
      toast.error('Error al guardar Telegram', err.message);
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleSendTestMessage = async () => {
    setIsTestingTelegram(true);
    setTestResult(null);
    try {
      const payload: any = {};
      if (newBotToken.trim()) payload.botToken = newBotToken.trim();
      if (telegramConfig.chatId) payload.chatId = telegramConfig.chatId;

      const res = await notificationApi.sendTestMessage(payload);
      setTestResult(res);
      if (res.success) {
        toast.success('Mensaje de prueba enviado', 'Revisa tu chat o canal de Telegram.');
      } else {
        toast.error('Error en prueba', res.message);
      }
      loadDeliveryHistory();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      toast.error('Fallo al enviar mensaje', err.message);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const toggleEvent = (key: string) => {
    setTelegramConfig((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [key]: !prev.events?.[key],
      },
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#06B6D4]" />
            Configuración del Sistema
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Ajustes globales de red, motor de notificaciones por Telegram, auditoría y parámetros del NOC
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'general' ? (
            <Button variant="secondary" size="sm" onClick={loadSettings} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => { loadTelegramConfig(); loadDeliveryHistory(); }} disabled={isLoadingLogs}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              Actualizar Estado
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#252D38] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
            activeTab === 'general'
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/10'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          General & Parámetros
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('telegram')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
            activeTab === 'telegram'
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/10'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]'
          }`}
        >
          <Bell className="w-4 h-4" />
          Alertas & Telegram
          {telegramConfig.enabled && telegramConfig.botTokenConfigured ? (
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" title="Telegram Activo" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#64748B]" />
          )}
        </button>
      </div>

      {/* Tab 1: General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveGeneral}>
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#252D38] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#06B6D4]" />
                  <h2 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider">
                    Parámetros Generales de la Plataforma
                  </h2>
                </div>
                {!canEdit && (
                  <Badge variant="yellow" size="sm">
                    Modo Solo Lectura
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nombre de la Organización / NOC *"
                  value={settings.organizationName}
                  onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
                  disabled={!canEdit || isLoading}
                  required
                />

                <Input
                  label="Subred Principal por Defecto (CIDR) *"
                  value={settings.primarySubnet}
                  onChange={(e) => setSettings({ ...settings, primarySubnet: e.target.value })}
                  disabled={!canEdit || isLoading}
                  placeholder="192.168.1.0/24"
                  required
                />

                <Input
                  label="Timeout de Sondeo TCP (ms)"
                  type="number"
                  value={settings.discoveryTimeoutMs}
                  onChange={(e) => setSettings({ ...settings, discoveryTimeoutMs: Number(e.target.value) })}
                  disabled={!canEdit || isLoading}
                  helperText="Tiempo máximo de espera por cada puerto TCP escaneado (recomendado: 400-800 ms)"
                />

                <Input
                  label="Concurrencia de Escaneo (Hosts simultáneos)"
                  type="number"
                  value={settings.discoveryConcurrency}
                  onChange={(e) => setSettings({ ...settings, discoveryConcurrency: Number(e.target.value) })}
                  disabled={!canEdit || isLoading}
                  helperText="Número de hosts sonteados concurrentemente (recomendado: 16-64)"
                />

                <Input
                  label="Expiración de Sesión de Usuario (Días)"
                  type="number"
                  value={settings.sessionExpiryDays}
                  onChange={(e) => setSettings({ ...settings, sessionExpiryDays: Number(e.target.value) })}
                  disabled={!canEdit || isLoading}
                  helperText="Duración máxima de cookies de sesión activa"
                />

                <Input
                  label="Retención de Registros de Auditoría (Días)"
                  type="number"
                  value={settings.auditRetentionDays}
                  onChange={(e) => setSettings({ ...settings, auditRetentionDays: Number(e.target.value) })}
                  disabled={!canEdit || isLoading}
                  helperText="Historial conservado en tabla ChangeLogs"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#252D38]">
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <FileText className="w-4 h-4 text-[#22C55E]" />
                  <span>Auditoría de cambios activada globalmente</span>
                </div>

                <Can permission="SETTINGS_UPDATE">
                  <Button type="submit" variant="cyan" disabled={isSaving || isLoading}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        Guardando Ajustes...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1.5" />
                        Guardar Configuración
                      </>
                    )}
                  </Button>
                </Can>
              </div>
            </Card>
          </form>

          {/* Infrastructure Core Status */}
          <Card className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-4 pb-2 border-b border-[#252D38]">
              Núcleo de Infraestructura Activo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-[#0F141B] border border-[#252D38]">
                <span className="text-[#64748B] block font-medium">Motor de Base de Datos</span>
                <span className="text-[#F1F5F9] font-bold mt-1 flex items-center gap-1.5 font-mono">
                  <Database className="w-3.5 h-3.5 text-[#3B82F6]" /> PostgreSQL 16
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0F141B] border border-[#252D38]">
                <span className="text-[#64748B] block font-medium">Capa ORM</span>
                <span className="text-[#F1F5F9] font-bold mt-1 flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Prisma ORM Client
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0F141B] border border-[#252D38]">
                <span className="text-[#64748B] block font-medium">Servidor REST Backend</span>
                <span className="text-[#F1F5F9] font-bold mt-1 flex items-center gap-1.5 font-mono">
                  <Zap className="w-3.5 h-3.5 text-[#06B6D4]" /> Fastify & JWT
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0F141B] border border-[#252D38]">
                <span className="text-[#64748B] block font-medium">Motor de Descubrimiento</span>
                <span className="text-[#F1F5F9] font-bold mt-1 flex items-center gap-1.5 font-mono">
                  <Radio className="w-3.5 h-3.5 text-purple-400" /> Discovery Microservice
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Telegram Notifications */}
      {activeTab === 'telegram' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveTelegram}>
            <Card className="p-6 space-y-6">
              {/* Header & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252D38] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4]">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#F1F5F9] flex items-center gap-2">
                      Bot de Alertas & Notificaciones Telegram
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                      Envío automático y seguro de alertas operativas, caídas de hosts, recursos y backups
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#94A3B8]">Habilitar Alertas:</span>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setTelegramConfig({ ...telegramConfig, enabled: !telegramConfig.enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        telegramConfig.enabled ? 'bg-[#06B6D4]' : 'bg-[#252D38]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          telegramConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                      telegramConfig.enabled && telegramConfig.botTokenConfigured
                        ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                        : 'bg-[#64748B]/10 text-[#94A3B8] border border-[#64748B]/30'
                    }`}
                  >
                    {telegramConfig.enabled && telegramConfig.botTokenConfigured
                      ? '✓ Activo'
                      : telegramConfig.botTokenConfigured
                      ? '⏸ Deshabilitado'
                      : '⚠ No configurado'}
                  </span>
                </div>
              </div>

              {/* Bot Credentials & Connection Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-[#F1F5F9] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#06B6D4]" />
                      Telegram Bot Token *
                    </span>
                    {telegramConfig.botTokenConfigured && (
                      <span className="text-[10px] text-[#22C55E] font-mono">
                        Guardado cifrado ({telegramConfig.botTokenMasked})
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={newBotToken}
                    onChange={(e) => setNewBotToken(e.target.value)}
                    placeholder={
                      telegramConfig.botTokenConfigured
                        ? '•••••••••••••••••••••••••••••••• (Dejar vacío para no cambiar)'
                        : '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ'
                    }
                    disabled={!canEdit}
                    className="w-full rounded-lg bg-[#0B0F14] border border-[#252D38] px-3.5 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  />
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Crea un bot con <strong>@BotFather</strong> en Telegram y copia el token generado. El token se guarda con cifrado seguro AES-256.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#F1F5F9] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#06B6D4]" />
                      Telegram Chat ID o Canal *
                    </span>
                    {telegramConfig.chatIdMasked && (
                      <span className="text-[10px] text-[#94A3B8] font-mono">
                        Actual: {telegramConfig.chatIdMasked}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={telegramConfig.chatId || ''}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                    placeholder="Ej. 123456789 o -1001234567890"
                    disabled={!canEdit}
                    className="w-full rounded-lg bg-[#0B0F14] border border-[#252D38] px-3.5 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                    required
                  />
                  <p className="text-[11px] text-[#64748B] mt-1">
                    ID del usuario o grupo. Para obtener tu ID personal, envía un mensaje al bot <strong>@userinfobot</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#F1F5F9] mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#06B6D4]" />
                    Anti-Spam / Cooldown de Notificaciones
                  </label>
                  <select
                    value={telegramConfig.cooldownMinutes ?? 15}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, cooldownMinutes: Number(e.target.value) })}
                    disabled={!canEdit}
                    className="w-full rounded-lg bg-[#0B0F14] border border-[#252D38] px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value={0}>Sin cooldown (Enviar siempre)</option>
                    <option value={5}>5 minutos (Moderado)</option>
                    <option value={15}>15 minutos (Recomendado)</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora (Estricto)</option>
                  </select>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Evita saturación deduplicando alertas repetidas para un mismo host o servicio dentro de la ventana.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#F1F5F9] mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-[#06B6D4]" />
                    Severidad Mínima de Envío
                  </label>
                  <select
                    value={telegramConfig.minSeverity || 'INFO'}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, minSeverity: e.target.value as any })}
                    disabled={!canEdit}
                    className="w-full rounded-lg bg-[#0B0F14] border border-[#252D38] px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="INFO">INFO (Todas las alertas e informaciones)</option>
                    <option value="WARNING">WARNING (Solo advertencias y críticas)</option>
                    <option value="CRITICAL">CRITICAL (Exclusivamente incidentes críticos)</option>
                  </select>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Filtro global por nivel de criticidad.
                  </p>
                </div>
              </div>

              {/* Event Filtering Checkboxes */}
              <div className="space-y-3 pt-2 border-t border-[#252D38]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-[#06B6D4]" />
                    Filtro Granular de Eventos Notificables
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        Object.keys(telegramConfig.events || {}).forEach((k) => (all[k] = true));
                        setTelegramConfig({ ...telegramConfig, events: all });
                      }}
                      className="text-[11px] text-[#06B6D4] hover:underline"
                    >
                      Activar todos
                    </button>
                    <span className="text-[#64748B]">&bull;</span>
                    <button
                      type="button"
                      onClick={() => {
                        const none: Record<string, boolean> = {};
                        Object.keys(telegramConfig.events || {}).forEach((k) => (none[k] = false));
                        setTelegramConfig({ ...telegramConfig, events: none });
                      }}
                      className="text-[11px] text-[#64748B] hover:underline"
                    >
                      Desactivar todos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category 1: Infra & Hosts */}
                  <div className="p-3.5 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-2.5">
                    <span className="text-xs font-bold text-[#F1F5F9] block border-b border-[#252D38] pb-1.5">
                      🖥️ Infraestructura & Hosts
                    </span>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.HOST_OFFLINE ?? true}
                        onChange={() => toggleEvent('HOST_OFFLINE')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Host caído / Inaccesible (🔴 Offline)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.HOST_RECOVERED ?? true}
                        onChange={() => toggleEvent('HOST_RECOVERED')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Host recuperado (🟢 Online con tiempo caído)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.SERVICE_DOWN ?? true}
                        onChange={() => toggleEvent('SERVICE_DOWN')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Servicio / Proceso detenido</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.SERVICE_RECOVERED ?? true}
                        onChange={() => toggleEvent('SERVICE_RECOVERED')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Servicio restablecido</span>
                    </label>
                  </div>

                  {/* Category 2: Telemetry & Thresholds */}
                  <div className="p-3.5 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-2.5">
                    <span className="text-xs font-bold text-[#F1F5F9] block border-b border-[#252D38] pb-1.5">
                      📈 Telemetría & Umbrales NOC
                    </span>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.HIGH_CPU ?? true}
                        onChange={() => toggleEvent('HIGH_CPU')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Uso crítico de CPU</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.HIGH_RAM ?? true}
                        onChange={() => toggleEvent('HIGH_RAM')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Memoria RAM saturada</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.HIGH_DISK ?? true}
                        onChange={() => toggleEvent('HIGH_DISK')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Espacio en disco agotándose</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.CRITICAL_ALERT ?? true}
                        onChange={() => toggleEvent('CRITICAL_ALERT')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Alertas críticas del NOC</span>
                    </label>
                  </div>

                  {/* Category 3: Discovery & Backups */}
                  <div className="p-3.5 rounded-xl bg-[#0F141B] border border-[#252D38] space-y-2.5">
                    <span className="text-xs font-bold text-[#F1F5F9] block border-b border-[#252D38] pb-1.5">
                      🔍 Discovery & Backups
                    </span>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.DISCOVERY_NEW_DEVICE ?? true}
                        onChange={() => toggleEvent('DISCOVERY_NEW_DEVICE')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Nuevos dispositivos en Discovery</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.DISCOVERY_CHANGE ?? true}
                        onChange={() => toggleEvent('DISCOVERY_CHANGE')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Cambios de red / IP / MAC</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.BACKUP_COMPLETED ?? true}
                        onChange={() => toggleEvent('BACKUP_COMPLETED')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Backup completado</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.events?.BACKUP_FAILED ?? true}
                        onChange={() => toggleEvent('BACKUP_FAILED')}
                        className="rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                      />
                      <span>Fallo en Backup / Restauración</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Test Runner */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#252D38]">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isTestingTelegram || (!telegramConfig.botTokenConfigured && !newBotToken.trim())}
                    onClick={handleSendTestMessage}
                  >
                    {isTestingTelegram ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Probando Conexión...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5 text-[#06B6D4]" />
                        Enviar Mensaje de Prueba
                      </>
                    )}
                  </Button>

                  {testResult && (
                    <span
                      className={`text-xs flex items-center gap-1 font-medium ${
                        testResult.success ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {testResult.success ? 'Prueba enviada' : 'Error en prueba'}
                    </span>
                  )}
                </div>

                <Can permission="SETTINGS_UPDATE">
                  <Button type="submit" variant="cyan" disabled={isSavingTelegram}>
                    {isSavingTelegram ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        Guardando Telegram...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1.5" />
                        Guardar Configuración Telegram
                      </>
                    )}
                  </Button>
                </Can>
              </div>
            </Card>
          </form>

          {/* Delivery Log Table */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#252D38] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#06B6D4]" />
                <h3 className="text-sm font-bold text-[#F1F5F9] uppercase tracking-wider">
                  Historial de Envíos y Notificaciones
                </h3>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadDeliveryHistory}
                disabled={isLoadingLogs}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#252D38]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0F14]/70 border-b border-[#252D38] font-mono text-[11px] uppercase tracking-wider text-[#64748B]">
                  <tr>
                    <th className="py-2.5 px-3">Fecha & Hora</th>
                    <th className="py-2.5 px-3">Evento</th>
                    <th className="py-2.5 px-3">Severidad</th>
                    <th className="py-2.5 px-3">Título / Mensaje</th>
                    <th className="py-2.5 px-3">Destinatario</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Intentos / Latencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {isLoadingLogs ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#64748B]">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-[#06B6D4]" />
                        Cargando historial de notificaciones...
                      </td>
                    </tr>
                  ) : deliveryLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#64748B]">
                        No hay registros de notificaciones emitidas recientemente.
                      </td>
                    </tr>
                  ) : (
                    deliveryLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#151B23]/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[#94A3B8] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#F1F5F9]">
                          {log.eventType}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              log.severity === 'CRITICAL'
                                ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                                : log.severity === 'WARNING'
                                ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                                : 'bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <span className="font-semibold text-[#F1F5F9] block truncate">
                            {log.title}
                          </span>
                          <span className="text-[11px] text-[#64748B] block truncate">
                            {log.message}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#94A3B8]">
                          {log.recipientMasked || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                              log.status === 'SUCCESS'
                                ? 'bg-[#22C55E]/15 text-[#22C55E]'
                                : log.status === 'SKIPPED'
                                ? 'bg-[#64748B]/15 text-[#94A3B8]'
                                : 'bg-[#EF4444]/15 text-[#EF4444]'
                            }`}
                          >
                            {log.status === 'SUCCESS'
                              ? '✓ Enviado'
                              : log.status === 'SKIPPED'
                              ? '⏸ Omitido'
                              : '✕ Error'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#94A3B8]">
                          {log.attempts} intento(s) &bull; {log.durationMs}ms
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
