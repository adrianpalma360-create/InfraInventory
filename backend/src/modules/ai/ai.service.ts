import { PrismaClient } from '@prisma/client';
import { AIToolRegistry } from './ai.tools.js';
import { AIEngine, GroundedAIResponse } from './ai.engine.js';
import { SafeSqlValidator } from './ai.sql-validator.js';
import {
  ChatMessageInput,
  DirectQueryInput,
  AnalyzeRequestInput,
  ReportRequestInput,
  AIConfigInput,
  TestConnectionInput,
} from './ai.schema.js';
import { logChange } from '../../utils/changelog.js';

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
          isEnabled: process.env.AI_ENABLED !== 'false',
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
    return config;
  }

  async updateConfig(input: AIConfigInput, actor = 'admin') {
    const existing = await this.getConfig();
    const updated = await this.prisma.aIConfiguration.update({
      where: { id: existing.id },
      data: {
        isEnabled: input.isEnabled,
        provider: input.provider,
        baseUrl: input.baseUrl,
        model: input.model,
        apiKeyEncrypted: input.apiKey || existing.apiKeyEncrypted,
        timeoutMs: input.timeoutMs,
        maxTokens: input.maxTokens,
        temperature: input.temperature,
        rateLimitPerMinute: input.rateLimitPerMinute,
        maxHistoryMessages: input.maxHistoryMessages,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'AIConfiguration',
      entityId: updated.id,
      action: 'UPDATE' as any,
      details: `Updated AI configuration (Provider: ${updated.provider}, Model: ${updated.model}, Enabled: ${updated.isEnabled})`,
      user: actor,
    });

    return updated;
  }

  async testConnection(input: TestConnectionInput) {
    const startTime = Date.now();
    try {
      if (input.provider === 'ollama') {
        const url = `${input.baseUrl.replace(/\/+$/, '')}/api/tags`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await res.json().catch(() => ({}));
        const durationMs = Date.now() - startTime;

        if (res.ok) {
          const models = Array.isArray(data.models) ? data.models.map((m: any) => m.name) : [];
          return {
            success: true,
            message: `Conexión exitosa con Ollama (${durationMs}ms). Modelos disponibles: ${models.join(', ') || 'ninguno descargado aún'}`,
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
          message: res.ok ? `Conexión exitosa (${durationMs}ms)` : `Error de conexión (HTTP ${res.status})`,
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
    const config = await this.getConfig();

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
        content: `Ocurrió un error al procesar la consulta con InfraInventory AI: ${err.message}`,
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
    const config = await this.getConfig();
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
      const machineDetails = await this.toolRegistry.executeTool('getMachine', { hostnameOrId: input.targetId }, user.role, user.id);
      const metrics = await this.toolRegistry.executeTool('getMachineMetrics', { hostnameOrId: input.targetId, limit: 50 }, user.role, user.id);
      const incidents = await this.toolRegistry.executeTool('getIncidents', { hostname: machineDetails.data?.hostname, limit: 10 }, user.role, user.id);
      const tickets = await this.toolRegistry.executeTool('getTickets', { limit: 10 }, user.role, user.id);

      const m = machineDetails.data;
      if (!m || m.error) {
        throw new Error(m?.error || 'Máquina no encontrada');
      }

      const findings = [
        { label: 'Estado del Host', value: m.status, severity: m.status === 'ONLINE' ? 'HEALTHY' : 'WARNING' },
        { label: 'Carga de CPU Media', value: `${metrics.data?.averages?.cpuPercent ?? 'N/A'}% (Pico: ${metrics.data?.averages?.maxCpuPercent ?? 'N/A'}%)`, severity: (metrics.data?.averages?.cpuPercent || 0) > 80 ? 'CRITICAL' : 'HEALTHY' },
        { label: 'Uso de Memoria RAM', value: `${metrics.data?.averages?.ramPercent ?? 'N/A'}%`, severity: (metrics.data?.averages?.ramPercent || 0) > 85 ? 'WARNING' : 'HEALTHY' },
        { label: 'Latencia Media de Red', value: `${metrics.data?.averages?.latencyMs ?? 'N/A'} ms`, severity: 'INFO' },
        { label: 'Incidentes Activos', value: `${incidents.data?.length || 0}`, severity: incidents.data?.length > 0 ? 'WARNING' : 'HEALTHY' },
      ];

      const recommendations: string[] = [];
      if ((metrics.data?.averages?.cpuPercent || 0) > 80) {
        recommendations.push('Revisar procesos en segundo plano o balancear carga de trabajo con un nodo réplica.');
      }
      if (incidents.data?.length > 0) {
        recommendations.push('Atender los incidentes de servicio no resueltos para restaurar la salud telemétrica.');
      }
      if (!m.asset?.warrantyEnd) {
        recommendations.push('Registrar la fecha de garantía del activo en el módulo de Hardware para trazabilidad.');
      }

      return {
        target: m.hostname,
        targetType: 'MACHINE',
        summary: `Diagnóstico 360° completado para ${m.hostname}. El equipo opera en estado ${m.status} con ${m.ports.length} puertos activos y ${incidents.data?.length || 0} incidentes registrados.`,
        findings,
        evidence: [
          { source: `Métricas de ${m.hostname}`, detail: `Histórico de ${metrics.data?.samplesCount || 0} muestras` },
          { source: `Inventario de Puertos`, detail: `${m.ports.length} puertos TCP/UDP analizados` },
        ],
        recommendations: recommendations.length > 0 ? recommendations : ['El servidor opera dentro de los rangos óptimos esperados.'],
        relatedEntities: [
          { type: 'machine', id: m.id, label: m.hostname },
          ...(incidents.data || []).map((i: any) => ({ type: 'incident', id: i.id, label: `Incidente: ${i.metricType}` })),
        ],
      };
    }

    // Default general analysis
    const overview = await this.toolRegistry.executeTool('getDashboardStats', {}, user.role, user.id);
    return {
      targetType: input.targetType,
      summary: 'Análisis global de salud de infraestructura completado.',
      findings: [
        { label: 'Disponibilidad Global', value: overview.data?.infrastructure?.healthRate || '100%', severity: 'HEALTHY' },
        { label: 'Hosts Totales', value: `${overview.data?.infrastructure?.totalHosts || 0}`, severity: 'INFO' },
        { label: 'Incidentes Activos', value: `${overview.data?.operations?.activeIncidents || 0}`, severity: 'INFO' },
      ],
      evidence: [{ source: 'NOC Aggregator', detail: 'Consolidación de métricas de todos los nodos' }],
      recommendations: ['Mantener la supervisión de alertas en tiempo real.'],
      relatedEntities: [],
    };
  }

  // Infrastructure Technical & Executive Reports
  async generateReport(input: ReportRequestInput, user: { id: string; role: any }) {
    const stats = await this.toolRegistry.executeTool('getDashboardStats', {}, user.role, user.id);
    const machines = await this.toolRegistry.executeTool('searchMachines', { limit: 100 }, user.role, user.id);
    const incidents = await this.toolRegistry.executeTool('getIncidents', { limit: 50 }, user.role, user.id);
    const tickets = await this.toolRegistry.executeTool('getTickets', { limit: 50 }, user.role, user.id);
    const assets = await this.toolRegistry.executeTool('getAssets', { limit: 50 }, user.role, user.id);

    const generatedAt = new Date().toISOString();
    const title = `Informe de Infraestructura TI - ${input.reportType} (${input.period})`;

    let markdown = `# 📊 ${title}\n`;
    markdown += `**Generado por**: InfraInventory AI (Usuario: \`${user.role}\`)  \n`;
    markdown += `**Fecha de Emisión**: ${new Date().toLocaleString()}  \n`;
    markdown += `**Plataforma**: InfraInventory V10 © 2026 Adrian Palma\n\n`;

    markdown += `## 1. Resumen Ejecutivo de Disponibilidad\n`;
    markdown += `- **Hosts Totales**: ${stats.data?.infrastructure?.totalHosts || 0}\n`;
    markdown += `- **Disponibilidad Global**: ${stats.data?.infrastructure?.healthRate || '100%'}\n`;
    markdown += `- **Hosts en Estado Óptimo (ONLINE)**: ${stats.data?.infrastructure?.online || 0}\n`;
    markdown += `- **Hosts en Estado Warning / Degradado**: ${stats.data?.infrastructure?.warning || 0}\n`;
    markdown += `- **Hosts Offline**: ${stats.data?.infrastructure?.offline || 0}\n\n`;

    markdown += `## 2. Operaciones & Helpdesk NOC\n`;
    markdown += `- **Incidentes de Monitorización Activos**: ${stats.data?.operations?.activeIncidents || 0}\n`;
    markdown += `- **Tickets de Soporte Abiertos**: ${stats.data?.operations?.openTickets || 0}\n`;
    markdown += `- **Tickets Críticos con SLA Activo**: ${stats.data?.operations?.criticalTickets || 0}\n`;
    markdown += `- **Cambios RFC Pendientes**: ${stats.data?.operations?.pendingChanges || 0}\n\n`;

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
