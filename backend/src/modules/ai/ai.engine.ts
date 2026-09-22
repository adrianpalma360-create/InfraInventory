import { AIToolRegistry } from './ai.tools.js';
import { buildProtectedPrompt } from './ai.sanitizer.js';

export interface GroundedAIResponse {
  content: string;
  findings: Array<{ label: string; value: string; severity?: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'INFO' }>;
  evidence: Array<{ source: string; detail: string; link?: string }>;
  recommendations: string[];
  relatedEntities: Array<{ type: 'machine' | 'metric' | 'incident' | 'asset' | 'ticket' | 'maintenance' | 'change'; id: string; label: string }>;
  toolsUsed: string[];
  durationMs: number;
}

export class AIEngine {
  constructor(private toolRegistry: AIToolRegistry) {}

  async processPrompt(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    config: { provider: string; baseUrl: string; model: string; isEnabled: boolean; apiKey?: string | null },
    userRole: any,
    userId?: string
  ): Promise<GroundedAIResponse> {
    const startTime = Date.now();

    // If AI is disabled in settings, return clear message
    if (!config.isEnabled) {
      return {
        content: '⚠️ **InfraAI está actualmente desactivado.** Un administrador puede habilitarlo desde `Configuración > Inteligencia Artificial`.',
        findings: [],
        evidence: [],
        recommendations: ['Contactar al administrador para habilitar el servicio de IA.'],
        relatedEntities: [],
        toolsUsed: [],
        durationMs: Date.now() - startTime,
      };
    }

    // 1. Determine and execute tools based on intent and RBAC
    const { toolsUsed, retrievedData, defaultReasoning } = await this.executeGroundedReasoning(userMessage, userRole, userId);

    // 2. If an LLM provider (Ollama / OpenAI) is configured, synthesize via LLM with strict grounding
    let finalContent = defaultReasoning.content;

    if (config.provider === 'ollama' || config.provider === 'openai') {
      try {
        const systemPrompt = `Eres InfraAI, el Asistente Inteligente de Operaciones IT de InfraInventory.
REGLAS ABSOLUTAS:
1. Eres un asistente estrictamente READ-ONLY. No puedes modificar ni ejecutar acciones sobre la infraestructura.
2. Responde ÚNICAMENTE utilizando los datos reales proporcionados en la sección <DATOS_INFRAESTRUCTURA>.
3. Si la información solicitada NO está presente en los datos, responde taxativamente: "No dispongo de ese dato en InfraInventory."
4. NO inventes ni asumas causalidades sin evidencia. Distingue entre datos observados e interpretación técnica.
5. NO incluyas ninguna versión de la aplicación en tus respuestas.
6. Presenta la información en tablas o listas Markdown limpias y estructuradas cuando corresponda.
7. Cita al final las fuentes consultadas (ej. "Fuentes consultadas: Monitoring, Alerts, Inventory").`;

        const promptWithData = buildProtectedPrompt(systemPrompt, retrievedData, userMessage);
        const llmAnswer = await this.callLLMProvider(promptWithData, conversationHistory, config);

        if (llmAnswer && llmAnswer.trim().length > 0) {
          finalContent = llmAnswer.trim();
        }
      } catch (err) {
        // Fallback transparently to deterministic grounded result
        console.warn('[InfraAI] LLM provider call fallback:', err);
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      content: finalContent,
      findings: defaultReasoning.findings,
      evidence: defaultReasoning.evidence,
      recommendations: defaultReasoning.recommendations,
      relatedEntities: defaultReasoning.relatedEntities,
      toolsUsed,
      durationMs,
    };
  }

  private async callLLMProvider(
    prompt: string,
    history: Array<{ role: string; content: string }>,
    config: { provider: string; baseUrl: string; model: string; apiKey?: string | null }
  ): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      if (config.provider === 'ollama') {
        const url = `${config.baseUrl.replace(/\/+$/, '')}/api/generate`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.model || 'llama3:8b',
            prompt,
            stream: false,
          }),
          signal: controller.signal,
        });
        if (!res.ok) return null;
        const data: any = await res.json();
        return data.response || null;
      } else if (config.provider === 'openai') {
        const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: config.model || 'gpt-4o-mini',
            messages: [
              ...history.slice(-4).map((h) => ({ role: h.role, content: h.content })),
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
          }),
          signal: controller.signal,
        });
        if (!res.ok) return null;
        const data: any = await res.json();
        return data.choices?.[0]?.message?.content || null;
      }
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
    return null;
  }

  private async executeGroundedReasoning(
    prompt: string,
    userRole: any,
    userId?: string
  ): Promise<{
    toolsUsed: string[];
    retrievedData: any;
    defaultReasoning: Omit<GroundedAIResponse, 'durationMs' | 'toolsUsed'>;
  }> {
    const q = prompt.toLowerCase().trim();
    const toolsUsed: string[] = [];
    const findings: GroundedAIResponse['findings'] = [];
    const evidence: GroundedAIResponse['evidence'] = [];
    const recommendations: string[] = [];
    const relatedEntities: GroundedAIResponse['relatedEntities'] = [];
    let retrievedData: any = {};
    let content = '';

    // 1. Offline Hosts ("¿Qué servidores están offline / caídos?")
    if (q.includes('offline') || q.includes('caid') || q.includes('caíd') || q.includes('inaccesible') || q.includes('apagad')) {
      toolsUsed.push('get_offline_devices', 'get_active_alerts');
      const offlineRes = await this.toolRegistry.executeTool('get_offline_devices', {}, userRole, userId);
      const alertsRes = await this.toolRegistry.executeTool('get_active_alerts', { severity: 'CRITICAL', limit: 5 }, userRole, userId);

      const offlineHosts = offlineRes.data || [];
      const criticalAlerts = alertsRes.data || [];
      retrievedData = { offlineHosts, criticalAlerts };

      if (offlineHosts.length === 0) {
        content = `### 🟢 Estado de Disponibilidad de Servidores\n\nActualmente **todos los servidores e infraestructura monitorizada se encuentran ONLINE** y respondiendo con normalidad.\n\n*Fuentes consultadas: Monitoring, Inventory*`;
        findings.push({ label: 'Servidores Offline', value: '0', severity: 'HEALTHY' });
      } else {
        content = `### 🔴 Dispositivos Offline Detectados (${offlineHosts.length})\n\n`;
        content += `| Dispositivo | IP Principal | Grupo | Ubicación |\n`;
        content += `| :--- | :--- | :--- | :--- |\n`;
        for (const host of offlineHosts) {
          content += `| **${host.hostname}** | \`${host.primaryIp || 'N/A'}\` | ${host.group || 'Sin grupo'} | ${host.location || 'N/A'} |\n`;
          relatedEntities.push({ type: 'machine', id: host.id, label: host.hostname });
        }
        content += `\n*Fuentes consultadas: Monitoring, Inventory*\n`;

        findings.push({ label: 'Servidores Caídos', value: `${offlineHosts.length}`, severity: 'CRITICAL' });
        recommendations.push(`Verificar conectividad de red y alimentación eléctrica en los ${offlineHosts.length} hosts caídos.`);
      }

      evidence.push({ source: 'InfraInventory Monitoring', detail: 'Estado en tiempo real de hosts', link: '/monitoring' });
      return { toolsUsed, retrievedData, defaultReasoning: { content, findings, evidence, recommendations, relatedEntities } };
    }

    // 2. Critical & Active Alerts ("¿Qué alertas críticas hay?")
    if (q.includes('alerta') || q.includes('anomalia') || q.includes('anomalía') || q.includes('incidente') || q.includes('incidentes')) {
      toolsUsed.push('get_active_alerts', 'get_inventory_summary');
      const alertsRes = await this.toolRegistry.executeTool('get_active_alerts', { onlyUnresolved: true, limit: 15 }, userRole, userId);
      const summaryRes = await this.toolRegistry.executeTool('get_inventory_summary', {}, userRole, userId);

      const alerts = alertsRes.data || [];
      const summary = summaryRes.data || {};
      retrievedData = { alerts, summary };

      if (alerts.length === 0) {
        content = `### 🟢 Alertas e Incidencias del NOC\n\nNo existen anomalías ni alertas críticas activas en este momento. La infraestructura opera dentro de los umbrales normales.\n\n*Fuentes consultadas: Alerts, NOC Telemetry*`;
        findings.push({ label: 'Alertas Activas', value: '0', severity: 'HEALTHY' });
      } else {
        const criticalCount = alerts.filter((a: any) => a.severity === 'CRITICAL').length;
        content = `### 🚨 Alertas Activas en el NOC (${alerts.length})\n\n`;
        content += `| Criticidad | Host | IP | Tipo Métrica | Mensaje / Detalle |\n`;
        content += `| :--- | :--- | :--- | :--- | :--- |\n`;
        for (const a of alerts) {
          const badge = a.severity === 'CRITICAL' ? '🔴 CRITICAL' : '🟠 WARNING';
          content += `| ${badge} | **${a.machine || 'General'}** | \`${a.ip || '-'}\` | \`${a.metricType}\` | ${a.message} |\n`;
          if (a.machine) relatedEntities.push({ type: 'incident', id: a.id, label: `${a.machine} - ${a.metricType}` });
        }
        content += `\n*Fuentes consultadas: Alerts, NOC Telemetry*\n`;

        findings.push({ label: 'Alertas Críticas', value: `${criticalCount}`, severity: criticalCount > 0 ? 'CRITICAL' : 'WARNING' });
        recommendations.push(`Priorizar la resolución de las ${criticalCount} alertas de nivel CRITICAL.`);
      }

      evidence.push({ source: 'InfraInventory Alerts Engine', detail: 'Registro activo de incidencias NOC', link: '/alerts' });
      return { toolsUsed, retrievedData, defaultReasoning: { content, findings, evidence, recommendations, relatedEntities } };
    }

    // 3. Backups Status ("¿Qué backups han fallado / cómo están los backups?")
    if (q.includes('backup') || q.includes('copia de seguridad') || q.includes('restauraci')) {
      toolsUsed.push('get_backup_status');
      const backupsRes = await this.toolRegistry.executeTool('get_backup_status', { limit: 10 }, userRole, userId);
      const backups = backupsRes.data || [];
      retrievedData = { backups };

      if (backups.length === 0) {
        content = `### 💾 Copias de Seguridad\n\nNo se han encontrado copias de seguridad registradas en el sistema.\n\n*Fuentes consultadas: Backups Engine*`;
      } else {
        const failed = backups.filter((b: any) => b.status === 'FAILED');
        content = `### 💾 Estado de Copias de Seguridad (Últimos ${backups.length})\n\n`;
        content += `| Backup | Tipo | Estado | Tamaño | Registros | Fecha |\n`;
        content += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
        for (const b of backups) {
          const statusBadge = b.status === 'COMPLETED' ? '🟢 OK' : b.status === 'FAILED' ? '🔴 FALLIDO' : '🟡 ' + b.status;
          content += `| **${b.name}** | \`${b.type}\` | ${statusBadge} | ${b.sizeFormatted || '-'} | ${b.recordsCount} regs | ${new Date(b.createdAt).toLocaleString()} |\n`;
        }
        if (failed.length > 0) {
          content += `\n⚠️ **Atención:** Se detectaron ${failed.length} copias con fallo.\n`;
          recommendations.push(`Revisar los detalles de error de los backups fallidos en la sección de Copias de Seguridad.`);
        }
        content += `\n*Fuentes consultadas: Backups Engine*\n`;
      }

      evidence.push({ source: 'InfraInventory Backup Engine', detail: 'Catálogo de backups e integridad', link: '/backups' });
      return { toolsUsed, retrievedData, defaultReasoning: { content, findings, evidence, recommendations, relatedEntities } };
    }

    // 4. Discovery & Network Changes ("¿Qué cambió en la red / nuevos dispositivos?")
    if (q.includes('discovery') || q.includes('descubri') || q.includes('cambio en la red') || q.includes('nuevo dispositivo')) {
      toolsUsed.push('get_discovery_results');
      const discoveryRes = await this.toolRegistry.executeTool('get_discovery_results', { limit: 5 }, userRole, userId);
      const scans = discoveryRes.data || [];
      retrievedData = { scans };

      content = `### 🔍 Resultados de Descubrimiento de Red (Discovery)\n\n`;
      if (scans.length === 0) {
        content += `No hay registros de escaneos de red recientes.\n`;
      } else {
        const latest = scans[0];
        content += `Último escaneo ejecutado sobre subred **${latest.networkCidr}** (${new Date(latest.startedAt).toLocaleString()}):\n\n`;
        content += `- 📡 **Hosts Activos Detectados**: ${latest.activeHosts}\n`;
        content += `- 🆕 **Nuevos Dispositivos**: ${latest.newDevicesCount}\n`;
        content += `- 🔄 **Cambios de Topología / Puertos**: ${latest.changedDevicesCount}\n`;
        content += `- ⚠️ **Equipos Desconectados**: ${latest.missingDevicesCount}\n\n`;

        if (latest.recentChanges?.length > 0) {
          content += `#### Cambios Detectados Recientes:\n`;
          for (const c of latest.recentChanges.slice(0, 5)) {
            content += `- \`${c.type}\` en **${c.hostname || c.ip}**: ${c.details}\n`;
          }
        }
      }
      content += `\n*Fuentes consultadas: Discovery Engine*\n`;

      evidence.push({ source: 'InfraInventory Discovery', detail: 'Escaneos y detección de diffs de red', link: '/discovery' });
      return { toolsUsed, retrievedData, defaultReasoning: { content, findings, evidence, recommendations, relatedEntities } };
    }

    // 5. Recent Activity / Audit ("¿Qué cambió en las últimas 24 horas?")
    if (q.includes('24 hora') || q.includes('hoy') || q.includes('actividad') || q.includes('auditor') || q.includes('cambi')) {
      toolsUsed.push('get_recent_activity');
      const activityRes = await this.toolRegistry.executeTool('get_recent_activity', { limit: 15 }, userRole, userId);
      const activities = activityRes.data || [];
      retrievedData = { activities };

      content = `### 📜 Actividad y Cambios Recientes en Infraestructura\n\n`;
      if (activities.length === 0) {
        content += `No se registran eventos de cambio recientes en el registro de auditoría.\n`;
      } else {
        content += `| Fecha & Hora | Acción | Entidad | Usuario | Detalle |\n`;
        content += `| :--- | :--- | :--- | :--- | :--- |\n`;
        for (const act of activities) {
          content += `| ${new Date(act.timestamp).toLocaleTimeString()} | \`${act.action}\` | **${act.entityType}** | ${act.user || 'system'} | ${act.details} |\n`;
        }
      }
      content += `\n*Fuentes consultadas: ChangeLog Audit Trail*\n`;

      evidence.push({ source: 'InfraInventory Audit Logs', detail: 'Registro inmutable de cambios', link: '/changes' });
      return { toolsUsed, retrievedData, defaultReasoning: { content, findings, evidence, recommendations, relatedEntities } };
    }

    // 6. Default Global Overview / General Status ("¿Cómo está la infraestructura?")
    toolsUsed.push('get_inventory_summary', 'get_active_alerts', 'get_offline_devices');
    const [summaryRes, activeAlertsRes, offlineRes] = await Promise.all([
      this.toolRegistry.executeTool('get_inventory_summary', {}, userRole, userId),
      this.toolRegistry.executeTool('get_active_alerts', { limit: 5 }, userRole, userId),
      this.toolRegistry.executeTool('get_offline_devices', {}, userRole, userId),
    ]);

    const summary = summaryRes.data || {};
    const alerts = activeAlertsRes.data || [];
    const offline = offlineRes.data || [];
    retrievedData = { summary, alerts, offline };

    const total = summary.infrastructure?.totalHosts || 0;
    const online = summary.infrastructure?.online || 0;
    const warn = summary.infrastructure?.warning || 0;
    const off = summary.infrastructure?.offline || 0;
    const critAlerts = summary.alerts?.criticalAlerts || 0;

    findings.push(
      { label: 'Total Servidores', value: `${total}`, severity: 'INFO' },
      { label: 'Disponibilidad', value: `${summary.infrastructure?.healthRate || '100%'}`, severity: 'HEALTHY' },
      { label: 'Alertas Críticas', value: `${critAlerts}`, severity: critAlerts > 0 ? 'CRITICAL' : 'HEALTHY' }
    );

    content = `### 📋 Resumen Operativo de Infraestructura\n\n`;
    content += `InfraInventory está supervisando un total de **${total} dispositivos** con una disponibilidad global de **${summary.infrastructure?.healthRate || '100%'}**.\n\n`;
    content += `- 🟢 **Hosts Operativos (Online)**: ${online}\n`;
    content += `- 🟡 **Hosts en Advertencia (Warning)**: ${warn}\n`;
    content += `- 🔴 **Hosts Fuera de Línea (Offline)**: ${off}\n`;
    content += `- 🚨 **Alertas Críticas del NOC**: ${critAlerts}\n\n`;

    if (alerts.length > 0) {
      content += `#### ⚠️ Incidencias Destacadas:\n`;
      for (const a of alerts.slice(0, 3)) {
        content += `- **${a.machine || 'General'}** (\`${a.metricType}\`): ${a.message}\n`;
      }
      content += `\n`;
    }

    content += `*Fuentes consultadas: Monitoring, Alerts, Inventory*\n`;
    evidence.push({ source: 'InfraInventory NOC Core', detail: 'Supervisión en tiempo real', link: '/dashboard' });

    return { toolsUsed, retrievedData, defaultReasoning: { content, findings, evidence, recommendations, relatedEntities } };
  }
}
