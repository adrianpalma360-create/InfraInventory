import { PrismaClient } from '@prisma/client';
import { AIToolRegistry } from './ai.tools.js';
import { AIEngine, GroundedAIResponse } from './ai.engine.js';
import {
  ChatMessageInput,
  DirectQueryInput,
  AnalyzeRequestInput,
  ReportRequestInput,
  AIConfigInput,
  TestConnectionInput,
} from './ai.schema.js';
import { logChange } from '../../utils/changelog.js';
import { encryptSecret, maskSecret } from '../../utils/encryption.js';

export class AIService {
  private toolRegistry: AIToolRegistry;
  private engine: AIEngine;

  constructor(private prisma: PrismaClient) {
    this.toolRegistry = new AIToolRegistry(prisma);
    this.engine = new AIEngine(this.toolRegistry);
  }

  // Retrieve or initialize AI Configuration
  async getConfig() {
    let config = await this.prisma.aIConfiguration.findFirst();
    if (!config) {
      config = await this.prisma.aIConfiguration.create({
        data: {
          isEnabled: process.env.AI_ENABLED === 'true',
          provider: process.env.AI_PROVIDER || 'ollama',
          baseUrl: process.env.AI_BASE_URL || 'http://ollama:11434',
          model: process.env.AI_MODEL || 'llama3:8b',
          timeoutMs: 30000,
          maxTokens: 2048,
          temperature: 0.1,
          rateLimitPerMinute: 60,
          maxHistoryMessages: 10,
        },
      });
    }

    return {
      ...config,
      apiKeyEncrypted: config.apiKeyEncrypted ? maskSecret(config.apiKeyEncrypted) : null,
      apiKeyConfigured: !!config.apiKeyEncrypted,
    };
  }

  async updateConfig(input: AIConfigInput, actor = 'admin') {
    let config = await this.prisma.aIConfiguration.findFirst();
    if (!config) {
      config = await this.prisma.aIConfiguration.create({
        data: {
          isEnabled: input.isEnabled ?? false,
          provider: input.provider || 'ollama',
          baseUrl: input.baseUrl || 'http://ollama:11434',
          model: input.model || 'llama3:8b',
          timeoutMs: input.timeoutMs || 30000,
          maxTokens: input.maxTokens || 2048,
          temperature: input.temperature || 0.1,
          rateLimitPerMinute: input.rateLimitPerMinute || 60,
          maxHistoryMessages: input.maxHistoryMessages || 10,
        },
      });
    }

    const dataToUpdate: any = {};
    if (typeof input.isEnabled === 'boolean') dataToUpdate.isEnabled = input.isEnabled;
    if (input.provider) dataToUpdate.provider = input.provider;
    if (input.baseUrl) dataToUpdate.baseUrl = input.baseUrl;
    if (input.model) dataToUpdate.model = input.model;
    if (input.timeoutMs !== undefined) dataToUpdate.timeoutMs = input.timeoutMs;
    if (input.maxTokens !== undefined) dataToUpdate.maxTokens = input.maxTokens;
    if (input.temperature !== undefined) dataToUpdate.temperature = input.temperature;
    if (input.rateLimitPerMinute !== undefined) dataToUpdate.rateLimitPerMinute = input.rateLimitPerMinute;
    if (input.maxHistoryMessages !== undefined) dataToUpdate.maxHistoryMessages = input.maxHistoryMessages;

    if (input.apiKey !== undefined) {
      const trimmed = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
      if (trimmed && !trimmed.startsWith('********')) {
        dataToUpdate.apiKeyEncrypted = encryptSecret(trimmed);
      } else if (trimmed === '' || input.apiKey === null) {
        dataToUpdate.apiKeyEncrypted = null;
      }
    }

    const updated = await this.prisma.aIConfiguration.update({
      where: { id: config.id },
      data: dataToUpdate,
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Settings',
      entityId: updated.id,
      action: 'UPDATE' as any,
      details: `Configuración de InfraAI actualizada por ${actor} (Proveedor: ${updated.provider}, Modelo: ${updated.model}, Habilitado: ${updated.isEnabled})`,
      user: actor,
    });

    return {
      ...updated,
      apiKeyEncrypted: updated.apiKeyEncrypted ? maskSecret(updated.apiKeyEncrypted) : null,
      apiKeyConfigured: !!updated.apiKeyEncrypted,
    };
  }

  async testConnection(input: TestConnectionInput) {
    const startTime = Date.now();
    try {
      if (input.provider === 'ollama') {
        const url = `${input.baseUrl.replace(/\/+$/, '')}/api/tags`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data: any = await res.json().catch(() => ({}));
        const durationMs = Date.now() - startTime;

        if (res.ok) {
          const models = Array.isArray(data.models) ? data.models.map((m: any) => m.name) : [];
          return {
            success: true,
            message: `Conexión exitosa con Ollama (${durationMs}ms). Modelos disponibles: ${models.join(', ') || 'ninguno detectado'}`,
            models,
            latencyMs: durationMs,
          };
        } else {
          return {
            success: false,
            message: `Ollama respondió con código HTTP ${res.status}`,
            latencyMs: durationMs,
          };
        }
      } else {
        // OpenAI-Compatible test
        const url = `${input.baseUrl.replace(/\/+$/, '')}/models`;
        const res = await fetch(url, {
          headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {},
          signal: AbortSignal.timeout(5000),
        });
        const durationMs = Date.now() - startTime;
        return {
          success: res.ok,
          message: res.ok ? `Conexión exitosa con API compatible (${durationMs}ms)` : `Error de conexión (HTTP ${res.status})`,
          latencyMs: durationMs,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `No se pudo conectar con ${input.provider} en ${input.baseUrl}: ${err.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // Conversation and Chat
  async chat(input: ChatMessageInput, user: { id: string; role: any; username: string }) {
    const config = await this.prisma.aIConfiguration.findFirst() || {
      isEnabled: false,
      provider: 'ollama',
      baseUrl: 'http://ollama:11434',
      model: 'llama3:8b',
      apiKeyEncrypted: null,
      maxHistoryMessages: 10,
    };

    // 1. Load or create conversation
    let conversationId = input.conversationId;
    if (!conversationId) {
      const conv = await this.prisma.aIConversation.create({
        data: {
          title: input.message.length > 50 ? `${input.message.slice(0, 47)}...` : input.message,
          userId: user.id,
        },
      });
      conversationId = conv.id;
    }

    // 2. Fetch recent conversation history for context
    const recentMessages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      take: config.maxHistoryMessages || 10,
      orderBy: { createdAt: 'asc' },
    });

    const history = recentMessages.map((m) => ({
      role: m.role.toLowerCase(),
      content: m.content,
    }));

    // 3. Save User Message
    await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: input.message,
      },
    });

    // 4. Process with AI Engine
    const startTime = Date.now();
    let aiResponse: GroundedAIResponse;
    let querySuccess = true;
    let queryError: string | undefined;

    try {
      aiResponse = await this.engine.processPrompt(
        input.message,
        history,
        {
          provider: config.provider,
          baseUrl: config.baseUrl,
          model: config.model,
          isEnabled: config.isEnabled,
          apiKey: config.apiKeyEncrypted,
        },
        user.role,
        user.id
      );
    } catch (err: any) {
      querySuccess = false;
      queryError = err.message;
      aiResponse = {
        content: `Ocurrió un error al procesar la consulta con InfraAI: ${err.message}`,
        findings: [],
        evidence: [],
        recommendations: ['Intente reformular la pregunta o verificar el estado de los servicios de IA.'],
        relatedEntities: [],
        toolsUsed: [],
        durationMs: Date.now() - startTime,
      };
    }

    // 5. Save Assistant Message with structured evidence
    const savedAssistantMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: aiResponse.content,
        findings: aiResponse.findings as any,
        evidence: aiResponse.evidence as any,
        recommendations: aiResponse.recommendations as any,
        relatedEntities: aiResponse.relatedEntities as any,
        toolsUsed: aiResponse.toolsUsed,
        durationMs: aiResponse.durationMs,
      },
    });

    // 6. Log AI Query
    await this.prisma.aIQueryLog.create({
      data: {
        userId: user.id,
        query: input.message,
        toolsCalled: aiResponse.toolsUsed,
        durationMs: aiResponse.durationMs,
        success: querySuccess,
        errorMessage: queryError,
      },
    });

    return {
      conversationId,
      messageId: savedAssistantMessage.id,
      response: aiResponse,
    };
  }

  // Direct safe query (Natural Language -> Tool execution)
  async query(input: DirectQueryInput, user: { id: string; role: any }) {
    const config = await this.prisma.aIConfiguration.findFirst() || {
      isEnabled: false,
      provider: 'ollama',
      baseUrl: 'http://ollama:11434',
      model: 'llama3:8b',
      apiKeyEncrypted: null,
    };

    return this.engine.processPrompt(
      input.query,
      [],
      {
        provider: config.provider,
        baseUrl: config.baseUrl,
        model: config.model,
        isEnabled: config.isEnabled,
        apiKey: config.apiKeyEncrypted,
      },
      user.role,
      user.id
    );
  }

  // Deep Diagnostic & Root Cause Analysis
  async analyze(input: AnalyzeRequestInput, user: { id: string; role: any }) {
    if (input.targetType === 'MACHINE' && input.targetId) {
      const machineDetails = await this.toolRegistry.executeTool('get_device', { hostnameOrId: input.targetId }, user.role, user.id);
      const metrics = await this.toolRegistry.executeTool('get_device_metrics', { hostnameOrId: input.targetId, limit: 50 }, user.role, user.id);
      const incidents = await this.toolRegistry.executeTool('get_active_alerts', { limit: 10 }, user.role, user.id);

      const m = machineDetails.data;
      if (!m || m.error) {
        throw new Error(m?.error || 'Máquina no encontrada');
      }

      const hostIncidents = (incidents.data || []).filter((i: any) => i.machine === m.hostname || i.ip === m.primaryIp);

      const findings = [
        { label: 'Estado del Host', value: m.status, severity: m.status === 'ONLINE' ? 'HEALTHY' : 'WARNING' },
        { label: 'Carga de CPU Media', value: `${metrics.data?.stats?.cpuAvg ?? 'N/A'}% (Pico: ${metrics.data?.stats?.cpuMax ?? 'N/A'}%)`, severity: (metrics.data?.stats?.cpuAvg || 0) > 80 ? 'CRITICAL' : 'HEALTHY' },
        { label: 'Uso de Memoria RAM', value: `${metrics.data?.stats?.ramAvg ?? 'N/A'}%`, severity: (metrics.data?.stats?.ramAvg || 0) > 85 ? 'WARNING' : 'HEALTHY' },
        { label: 'Latencia Media de Red', value: `${metrics.data?.stats?.latencyAvg ?? 'N/A'} ms`, severity: 'INFO' },
        { label: 'Alertas Activas', value: `${hostIncidents.length}`, severity: hostIncidents.length > 0 ? 'WARNING' : 'HEALTHY' },
      ];

      const recommendations: string[] = [];
      if ((metrics.data?.stats?.cpuAvg || 0) > 80) {
        recommendations.push('Revisar procesos en segundo plano o balancear carga de trabajo con un nodo réplica.');
      }
      if (hostIncidents.length > 0) {
        recommendations.push('Atender las alertas activas de este host para evitar degradación de servicio.');
      }

      return {
        target: m.hostname,
        targetType: 'MACHINE',
        summary: `Diagnóstico 360° completado para ${m.hostname}. El equipo opera en estado ${m.status} con ${m.ports.length} puertos activos y ${hostIncidents.length} incidencias registradas.`,
        findings,
        evidence: [
          { source: `Métricas de ${m.hostname}`, detail: `Histórico de ${metrics.data?.samplesCount || 0} muestras` },
          { source: `Inventario de Puertos`, detail: `${m.ports.length} puertos TCP/UDP analizados` },
        ],
        recommendations: recommendations.length > 0 ? recommendations : ['El servidor opera dentro de los rangos óptimos esperados.'],
        relatedEntities: [
          { type: 'machine', id: m.id, label: m.hostname },
          ...hostIncidents.map((i: any) => ({ type: 'incident', id: i.id, label: `Alerta: ${i.metricType}` })),
        ],
      };
    }

    if (input.targetType === 'ALERT' && input.targetId) {
      const alerts = await this.toolRegistry.executeTool('get_active_alerts', { limit: 50 }, user.role, user.id);
      const targetAlert = (alerts.data || []).find((a: any) => a.id === input.targetId);

      if (!targetAlert) {
        throw new Error('Alerta no encontrada o ya resuelta');
      }

      return {
        target: targetAlert.machine || 'General',
        targetType: 'ALERT',
        summary: `Análisis de alerta [${targetAlert.severity}] en ${targetAlert.machine}: ${targetAlert.message}`,
        findings: [
          { label: 'Severidad', value: targetAlert.severity, severity: targetAlert.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING' },
          { label: 'Tipo de Métrica', value: targetAlert.metricType, severity: 'INFO' },
          { label: 'Valor Actual', value: `${targetAlert.currentValue || 'N/A'}`, severity: 'WARNING' },
        ],
        evidence: [{ source: 'NOC Alerts', detail: `Incidencia detectada a las ${new Date(targetAlert.detectedAt).toLocaleTimeString()}` }],
        recommendations: ['Verificar la telemetría del host y revisar procesos asociados.'],
        relatedEntities: [{ type: 'incident', id: targetAlert.id, label: `${targetAlert.machine} - ${targetAlert.metricType}` }],
      };
    }

    // Default general analysis
    const overview = await this.toolRegistry.executeTool('get_inventory_summary', {}, user.role, user.id);
    return {
      targetType: input.targetType,
      summary: 'Análisis global de salud de infraestructura completado.',
      findings: [
        { label: 'Disponibilidad Global', value: overview.data?.infrastructure?.healthRate || '100%', severity: 'HEALTHY' },
        { label: 'Hosts Totales', value: `${overview.data?.infrastructure?.totalHosts || 0}`, severity: 'INFO' },
        { label: 'Incidentes Activos', value: `${overview.data?.alerts?.activeIncidents || 0}`, severity: 'INFO' },
      ],
      evidence: [{ source: 'NOC Aggregator', detail: 'Consolidación de métricas de todos los nodos' }],
      recommendations: ['Mantener la supervisión de alertas en tiempo real.'],
      relatedEntities: [],
    };
  }

  // Infrastructure Technical & Executive Reports
  async generateReport(input: ReportRequestInput, user: { id: string; role: any }) {
    const stats = await this.toolRegistry.executeTool('get_inventory_summary', {}, user.role, user.id);
    const machines = await this.toolRegistry.executeTool('get_devices', { limit: 50 }, user.role, user.id);
    const alerts = await this.toolRegistry.executeTool('get_active_alerts', { limit: 20 }, user.role, user.id);

    const generatedAt = new Date().toISOString();
    const title = `Informe de Infraestructura TI - ${input.reportType} (${input.period})`;

    let markdown = `# 📊 ${title}\n`;
    markdown += `**Generado por**: InfraInventory AI (Usuario: \`${user.role}\`)  \n`;
    markdown += `**Fecha de Emisión**: ${new Date().toLocaleString()}  \n`;
    markdown += `**Plataforma**: InfraInventory\n\n`;

    markdown += `## 1. Resumen Ejecutivo de Disponibilidad\n`;
    markdown += `- **Hosts Totales**: ${stats.data?.infrastructure?.totalHosts || 0}\n`;
    markdown += `- **Disponibilidad Global**: ${stats.data?.infrastructure?.healthRate || '100%'}\n`;
    markdown += `- **Hosts en Estado Óptimo (ONLINE)**: ${stats.data?.infrastructure?.online || 0}\n`;
    markdown += `- **Hosts en Estado Warning / Degradado**: ${stats.data?.infrastructure?.warning || 0}\n`;
    markdown += `- **Hosts Offline**: ${stats.data?.infrastructure?.offline || 0}\n\n`;

    markdown += `## 2. Operaciones & Alertas NOC\n`;
    markdown += `- **Incidentes de Monitorización Activos**: ${stats.data?.alerts?.activeIncidents || 0}\n`;
    markdown += `- **Alertas Críticas**: ${stats.data?.alerts?.criticalAlerts || 0}\n\n`;

    markdown += `## 3. Inventario de Servidores Principales\n`;
    markdown += `| Hostname | IP Primaria | Estado | Sistema Operativo | Grupo |\n`;
    markdown += `|---|---|---|---|---|\n`;
    (machines.data || []).slice(0, 15).forEach((m: any) => {
      markdown += `| **${m.hostname}** | \`${m.primaryIp || 'N/A'}\` | ${m.status} | ${m.os || 'N/A'} | ${m.group || 'General'} |\n`;
    });

    return {
      title,
      generatedAt,
      reportType: input.reportType,
      period: input.period,
      format: input.format,
      content: markdown,
      metrics: stats.data,
    };
  }

  // Conversation History Management
  async getHistory(userId: string, limit = 20) {
    return this.prisma.aIConversation.findMany({
      where: { userId },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async getConversation(id: string, userId: string) {
    const conv = await this.prisma.aIConversation.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw new Error('Conversación no encontrada');
    return conv;
  }

  async deleteConversation(id: string, userId: string) {
    const conv = await this.prisma.aIConversation.findFirst({
      where: { id, userId },
    });
    if (!conv) throw new Error('Conversación no encontrada');

    await this.prisma.aIConversation.delete({ where: { id } });
    return { success: true, message: 'Conversación eliminada correctamente' };
  }

  // AI Dashboard Metrics
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalQueriesToday,
      totalQueriesAllTime,
      recentLogs,
      config,
    ] = await Promise.all([
      this.prisma.aIQueryLog.count({ where: { createdAt: { gte: today } } }),
      this.prisma.aIQueryLog.count(),
      this.prisma.aIQueryLog.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, username: true, role: true } } },
      }),
      this.getConfig(),
    ]);

    const avgDurationMs = recentLogs.length > 0
      ? Math.round(recentLogs.reduce((acc, l) => acc + l.durationMs, 0) / recentLogs.length)
      : 0;

    const successfulQueries = recentLogs.filter((l) => l.success).length;
    const successRate = recentLogs.length > 0 ? Math.round((successfulQueries / recentLogs.length) * 100) : 100;

    return {
      status: config.isEnabled ? 'OPERATIONAL' : 'DISABLED',
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      queriesToday: totalQueriesToday,
      totalQueries: totalQueriesAllTime,
      avgLatencyMs: avgDurationMs,
      successRate: `${successRate}%`,
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        query: l.query,
        user: l.user?.name || l.user?.username || 'Anónimo',
        role: l.user?.role || 'VIEWER',
        durationMs: l.durationMs,
        toolsCalled: l.toolsCalled,
        success: l.success,
        createdAt: l.createdAt,
      })),
    };
  }

  getToolsList(userRole: any) {
    return this.toolRegistry.getAvailableTools(userRole).map((t) => ({
      name: t.name,
      description: t.description,
      requiredPermission: t.requiredPermission,
      parameters: t.parameters,
    }));
  }
}
