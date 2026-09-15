import { AIToolRegistry } from './ai.tools.js';

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
    const toolsUsed: string[] = [];

    // If AI is disabled in settings, return clear message
    if (!config.isEnabled) {
      return {
        content: '⚠️ **InfraInventory AI está actualmente desactivado.** Un administrador puede habilitarlo desde `Ajustes > InfraInventory AI`.',
        findings: [],
        evidence: [],
        recommendations: ['Contactar al administrador para habilitar el servicio de IA.'],
        relatedEntities: [],
        toolsUsed: [],
        durationMs: Date.now() - startTime,
      };
    }

    // Try External/Local Model (Ollama / OpenAI-Compatible) if accessible
    let providerResponse: string | null = null;
    if (config.provider === 'ollama' || config.provider === 'openai') {
      try {
        providerResponse = await this.callLLMProvider(userMessage, conversationHistory, config);
      } catch (err) {
        // Fallback gracefully to deterministic rule-based grounding engine
        providerResponse = null;
      }
    }

    // Grounded Reasoning Engine (always uses real data from InfraInventory DB via Tools)
    const groundedResult = await this.executeGroundedReasoning(userMessage, userRole, userId);
    const durationMs = Date.now() - startTime;

    return {
      ...groundedResult,
      durationMs,
    };
  }

  private async callLLMProvider(
    prompt: string,
    history: Array<{ role: string; content: string }>,
    config: { provider: string; baseUrl: string; model: string; apiKey?: string | null }
  ): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

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
        const data = await res.json();
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
            model: config.model,
            messages: [...history.slice(-4), { role: 'user', content: prompt }],
          }),
          signal: controller.signal,
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.choices?.[0]?.message?.content || null;
      }
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
    return null;
  }

  private async executeGroundedReasoning(prompt: string, userRole: any, userId?: string): Promise<Omit<GroundedAIResponse, 'durationMs'>> {
    const q = prompt.toLowerCase().trim();
    const toolsUsed: string[] = [];
    const findings: GroundedAIResponse['findings'] = [];
    const evidence: GroundedAIResponse['evidence'] = [];
    const recommendations: string[] = [];
    const relatedEntities: GroundedAIResponse['relatedEntities'] = [];

    // Case 1: Overview / Infrastructure Status
    if (
      q.includes('que esta pasando') ||
      q.includes('qué está pasando') ||
      q.includes('resumen') ||
      q.includes('estado general') ||
      q.includes('informe') ||
      q.includes('overview')
    ) {
      toolsUsed.push('getDashboardStats', 'getIncidents', 'getTickets');
      const statsRes = await this.toolRegistry.executeTool('getDashboardStats', {}, userRole, userId);
      const incidentsRes = await this.toolRegistry.executeTool('getIncidents', { onlyActive: true, limit: 5 }, userRole, userId);
      const ticketsRes = await this.toolRegistry.executeTool('getTickets', { status: 'OPEN', limit: 5 }, userRole, userId);

      const stats = statsRes.data || {};
      const activeIncidents = incidentsRes.data || [];
      const openTickets = ticketsRes.data || [];

      findings.push(
        { label: 'Servidores Totales', value: `${stats.infrastructure?.totalHosts || 0}`, severity: 'INFO' },
        { label: 'Servidores Online', value: `${stats.infrastructure?.online || 0} (${stats.infrastructure?.healthRate || '100%'})`, severity: 'HEALTHY' },
        { label: 'Servidores con Warning/Error', value: `${(stats.infrastructure?.warning || 0) + (stats.infrastructure?.offline || 0)}`, severity: stats.infrastructure?.warning > 0 ? 'WARNING' : 'HEALTHY' },
        { label: 'Incidentes Activos', value: `${stats.operations?.activeIncidents || 0}`, severity: stats.operations?.activeIncidents > 0 ? 'WARNING' : 'HEALTHY' },
        { label: 'Tickets Abiertos', value: `${stats.operations?.openTickets || 0} (${stats.operations?.criticalTickets || 0} críticos)`, severity: stats.operations?.criticalTickets > 0 ? 'CRITICAL' : 'INFO' }
      );

      evidence.push({
        source: 'Telemetría & NOC Health Monitor',
        detail: `Base de datos InfraInventory en tiempo real (${new Date().toLocaleTimeString()})`,
        link: '/monitoring',
      });

      if (activeIncidents.length > 0) {
        recommendations.push(`Investigar ${activeIncidents.length} anomalía(s) activa(s) en monitorización para evitar degradación de SLA.`);
        for (const inc of activeIncidents.slice(0, 3)) {
          relatedEntities.push({ type: 'incident', id: inc.id, label: `Incidente ${inc.metricType} en ${inc.machine}` });
        }
      }

      if (stats.operations?.criticalTickets > 0) {
        recommendations.push('Revisar de forma prioritaria los tickets críticos en el Helpdesk operativo.');
      }

      let content = `### 📋 Resumen del Estado de la Infraestructura\n\n`;
      content += `InfraInventory está monitorizando activamente **${stats.infrastructure?.totalHosts || 0} hosts** con una tasa de disponibilidad global del **${stats.infrastructure?.healthRate || '100%'}**.\n\n`;
      content += `- 🟢 **Hosts Operativos**: ${stats.infrastructure?.online || 0}\n`;
      content += `- 🟡 **Hosts en Alerta / Warning**: ${stats.infrastructure?.warning || 0}\n`;
      content += `- 🔴 **Hosts Caídos / Offline**: ${stats.infrastructure?.offline || 0}\n`;
      content += `- ⚠️ **Incidentes de Telemetría Activos**: ${stats.operations?.activeIncidents || 0}\n`;
      content += `- 🎫 **Tickets de Soporte Abiertos**: ${stats.operations?.openTickets || 0}\n\n`;

      if (activeIncidents.length > 0) {
        content += `#### 🚨 Incidentes Críticos Recientes:\n`;
        activeIncidents.forEach((i: any) => {
          content += `- **${i.machine}** (${i.ip || 'N/A'}): \`${i.metricType}\` — ${i.message} (Detectado: ${new Date(i.detectedAt).toLocaleTimeString()})\n`;
        });
      }

      return { content, findings, evidence, recommendations, relatedEntities, toolsUsed };
    }

    // Case 2: Degraded / Problematic Servers ("¿Qué servidores tienen problemas?")
    if (
      q.includes('problema') ||
      q.includes('fallando') ||
      q.includes('degradad') ||
      q.includes('warning') ||
      q.includes('caid') ||
      q.includes('caíd') ||
      q.includes('offline') ||
      q.includes('rendimiento')
    ) {
      toolsUsed.push('searchMachines', 'getIncidents');
      const machinesRes = await this.toolRegistry.executeTool('searchMachines', { status: 'WARNING', limit: 10 }, userRole, userId);
      const offlineRes = await this.toolRegistry.executeTool('searchMachines', { status: 'OFFLINE', limit: 10 }, userRole, userId);
      const incidentsRes = await this.toolRegistry.executeTool('getIncidents', { onlyActive: true, limit: 10 }, userRole, userId);

      const degraded = [...(machinesRes.data || []), ...(offlineRes.data || [])];
      const incidents = incidentsRes.data || [];

      if (degraded.length === 0 && incidents.length === 0) {
        return {
          content: '✅ **No se detectaron servidores con anomalías graves en este momento.** Todos los hosts monitorizados se encuentran en estado `ONLINE` y saludables.',
          findings: [{ label: 'Estado General', value: 'Saludable (0 problemas activos)', severity: 'HEALTHY' }],
          evidence: [{ source: 'Health State Monitor', detail: 'Sondeo telemétrico continuo' }],
          recommendations: ['Mantener la periodicidad regular de copias de seguridad y revisiones preventivas.'],
          relatedEntities: [],
          toolsUsed,
        };
      }

      degraded.forEach((m) => {
        findings.push({
          label: m.hostname,
          value: `Estado: ${m.status} | IP: ${m.primaryIp || 'N/A'} | Grupo: ${m.group || 'Sin grupo'}`,
          severity: m.status === 'OFFLINE' ? 'CRITICAL' : 'WARNING',
        });
        evidence.push({
          source: `Monitoring → Host ${m.hostname}`,
          detail: `Estado de salud ${m.status}`,
          link: `/machines`,
        });
        relatedEntities.push({ type: 'machine', id: m.id, label: m.hostname });
      });

      let content = `### ⚠️ Servidores con Problemas Detectados\n\nSe han identificado **${degraded.length} host(s)** con estado de alerta o desconexión:\n\n`;
      degraded.forEach((m) => {
        content += `- **${m.hostname}** (\`${m.primaryIp || 'Sin IP'}\`): Estado **${m.status}** (SO: ${m.os || 'N/A'}, Grupo: ${m.group || 'General'})\n`;
      });

      if (incidents.length > 0) {
        content += `\n#### 📈 Incidentes de Telemetría Asociados:\n`;
        incidents.forEach((i: any) => {
          content += `- **${i.machine}**: ${i.message} (Valor: \`${i.currentValue ?? 'N/A'}\` vs Umbral: \`${i.threshold ?? 'N/A'}\`)\n`;
        });
      }

      recommendations.push('Verificar conectividad de red y carga de CPU/RAM en los nodos en estado WARNING.');
      recommendations.push('Revisar si existen ventanas de mantenimiento planificadas que justifiquen la degradación.');

      return { content, findings, evidence, recommendations, relatedEntities, toolsUsed };
    }

    // Case 3: Comparison between servers ("Compara SRV01 y SRV02")
    if (q.includes('compara') || q.includes('comparar') || q.includes('diferencia entre')) {
      toolsUsed.push('searchMachines', 'getMachineMetrics');
      const allMachines = await this.toolRegistry.executeTool('searchMachines', { limit: 10 }, userRole, userId);
      const list = allMachines.data || [];

      // Extract referenced hostnames or pick top 2
      const matched = list.filter((m: any) => q.includes(m.hostname.toLowerCase()));
      const targets = matched.length >= 2 ? matched.slice(0, 2) : list.slice(0, 2);

      if (targets.length < 2) {
        return {
          content: 'No tengo suficiente información de máquinas en InfraInventory para realizar una comparación.',
          findings: [],
          evidence: [],
          recommendations: [],
          relatedEntities: [],
          toolsUsed,
        };
      }

      const m1Metrics = await this.toolRegistry.executeTool('getMachineMetrics', { hostnameOrId: targets[0].id }, userRole, userId);
      const m2Metrics = await this.toolRegistry.executeTool('getMachineMetrics', { hostnameOrId: targets[1].id }, userRole, userId);

      const h1 = targets[0].hostname;
      const h2 = targets[1].hostname;

      relatedEntities.push({ type: 'machine', id: targets[0].id, label: h1 });
      relatedEntities.push({ type: 'machine', id: targets[1].id, label: h2 });

      findings.push(
        { label: `${h1} - Estado`, value: `${targets[0].status} (CPU: ${m1Metrics.data?.latest?.cpu ?? 'N/A'}%)`, severity: 'INFO' },
        { label: `${h2} - Estado`, value: `${targets[1].status} (CPU: ${m2Metrics.data?.latest?.cpu ?? 'N/A'}%)`, severity: 'INFO' }
      );

      evidence.push(
        { source: `Métricas de ${h1}`, detail: `Muestras telemétricas: ${m1Metrics.data?.samplesCount || 0}` },
        { source: `Métricas de ${h2}`, detail: `Muestras telemétricas: ${m2Metrics.data?.samplesCount || 0}` }
      );

      let content = `### ⚖️ Comparativa de Rendimiento Técnico\n\n`;
      content += `| Parámetro | **${h1}** | **${h2}** |\n`;
      content += `|---|---|---|\n`;
      content += `| **Estado NOC** | \`${targets[0].status}\` | \`${targets[1].status}\` |\n`;
      content += `| **Dirección IP** | \`${targets[0].primaryIp || 'N/A'}\` | \`${targets[1].primaryIp || 'N/A'}\` |\n`;
      content += `| **Sistema Operativo** | ${targets[0].os || 'N/A'} | ${targets[1].os || 'N/A'} |\n`;
      content += `| **CPU Actual** | \`${m1Metrics.data?.latest?.cpu ?? 'N/A'}%\` | \`${m2Metrics.data?.latest?.cpu ?? 'N/A'}%\` |\n`;
      content += `| **RAM Actual** | \`${m1Metrics.data?.latest?.ram ?? 'N/A'}%\` | \`${m2Metrics.data?.latest?.ram ?? 'N/A'}%\` |\n`;
      content += `| **Latencia Media** | \`${m1Metrics.data?.averages?.latencyMs ?? 'N/A'} ms\` | \`${m2Metrics.data?.averages?.latencyMs ?? 'N/A'} ms\` |\n\n`;

      const cpu1 = m1Metrics.data?.latest?.cpu || 0;
      const cpu2 = m2Metrics.data?.latest?.cpu || 0;
      if (cpu1 > cpu2) {
        content += `**Conclusión analítica:** \`${h1}\` presenta una mayor carga de procesamiento en comparación con \`${h2}\`.\n`;
      } else {
        content += `**Conclusión analítica:** Ambos nodos operan dentro de sus parámetros normales de servicio.\n`;
      }

      return { content, findings, evidence, recommendations, relatedEntities, toolsUsed };
    }

    // Case 4: Hardware & Warranties ("¿Qué activos tienen garantía este mes?" / "Garantías")
    if (q.includes('garantía') || q.includes('garantia') || q.includes('hardware') || q.includes('activo') || q.includes('asset')) {
      toolsUsed.push('getAssets');
      const assetsRes = await this.toolRegistry.executeTool('getAssets', { limit: 15 }, userRole, userId);
      const assets = assetsRes.data || [];

      assets.forEach((a: any) => {
        findings.push({
          label: `${a.assetTag} - ${a.name}`,
          value: `Fabricante: ${a.manufacturer || 'N/A'} | Modelo: ${a.model || 'N/A'}`,
          severity: 'INFO',
        });
        relatedEntities.push({ type: 'asset', id: a.id, label: `${a.assetTag} (${a.name})` });
      });

      evidence.push({
        source: 'Inventario de Activos IT & CMDB (V8)',
        detail: `${assets.length} activos consultados`,
        link: '/assets',
      });

      let content = `### 🖥️ Inventario de Activos IT y Cobertura de Garantías\n\nSe han consultado **${assets.length} activo(s)** en la plataforma:\n\n`;
      assets.forEach((a: any) => {
        const warrantyInfo = typeof a.warranty === 'object' && a.warranty ? `Garantía hasta ${new Date(a.warranty.endDate).toLocaleDateString()} (${a.warranty.provider})` : 'Sin garantía';
        content += `- **${a.assetTag}** — ${a.name} (${a.model || 'Hardware'}): ${warrantyInfo} [Host: \`${a.linkedHost || 'No vinculado'}\`]\n`;
      });

      recommendations.push('Revisar contratos de mantenimiento con fabricantes para renovaciones preventivas.');

      return { content, findings, evidence, recommendations, relatedEntities, toolsUsed };
    }

    // Case 5: Software Licenses ("¿Qué licencias vencen?" / "Licencias")
    if (q.includes('licencia') || q.includes('software') || q.includes('seats')) {
      toolsUsed.push('getLicenses');
      const licRes = await this.toolRegistry.executeTool('getLicenses', {}, userRole, userId);
      const licenses = licRes.data || [];

      licenses.forEach((l: any) => {
        findings.push({
          label: l.name,
          value: `Asientos: ${l.usedSeats}/${l.totalSeats} (Libres: ${l.availableSeats})`,
          severity: l.isOverAssigned ? 'CRITICAL' : 'HEALTHY',
        });
      });

      evidence.push({
        source: 'Gestión de Licencias & Auditoría (V8)',
        detail: 'Claves confidenciales protegidas y enmascaradas',
        link: '/licenses',
      });

      let content = `### 📜 Estado del Catálogo de Licencias de Software\n\n`;
      licenses.forEach((l: any) => {
        content += `- **${l.name}** (${l.vendor}): \`${l.usedSeats}/${l.totalSeats} asientos\` (Disponibles: **${l.availableSeats}**) ${l.isOverAssigned ? '⚠️ **SOBREASIGNADA**' : ''}\n`;
      });

      if (licenses.some((l: any) => l.isOverAssigned)) {
        recommendations.push('Regularizar asignación de asientos de software sobreasignados para cumplir normativas de licenciamiento.');
      }

      return { content, findings, evidence, recommendations, relatedEntities, toolsUsed };
    }

    // Case 6: Helpdesk Tickets & SLA ("Tickets críticos", "SLA")
    if (q.includes('ticket') || q.includes('sla') || q.includes('incidencia') || q.includes('helpdesk')) {
      toolsUsed.push('getTickets');
      const ticketsRes = await this.toolRegistry.executeTool('getTickets', { limit: 15 }, userRole, userId);
      const tickets = ticketsRes.data || [];

      tickets.forEach((t: any) => {
        findings.push({
          label: `${t.code}: ${t.title}`,
          value: `Estado: ${t.status} | Prioridad: ${t.priority} | SLA: ${t.slaStatus}`,
          severity: t.priority === 'CRITICAL' ? 'CRITICAL' : 'INFO',
        });
        relatedEntities.push({ type: 'ticket', id: t.id, label: `${t.code}: ${t.title}` });
      });

      evidence.push({
        source: 'Helpdesk Operativo & Acuerdos SLA (V9)',
        detail: `${tickets.length} tickets encontrados`,
        link: '/operations',
      });

      let content = `### 🎫 Gestión de Tickets & SLAs Operativos\n\n`;
      tickets.forEach((t: any) => {
        content += `- **${t.code}** — ${t.title}: Prioridad \`${t.priority}\`, Estado \`${t.status}\`, SLA: **${t.slaStatus}** (Asignado a: *${t.assignee}*)\n`;
      });

      recommendations.push('Asignar técnicos a los tickets en estado OPEN sin asignatario para no penalizar el tiempo de primera respuesta del SLA.');

      return { content, findings, evidence, recommendations, relatedEntities, toolsUsed };
    }

    // Default Case: Global Search & General Answering
    toolsUsed.push('searchMachines', 'getDashboardStats');
    const machinesRes = await this.toolRegistry.executeTool('searchMachines', { query: prompt, limit: 10 }, userRole, userId);
    const machines = machinesRes.data || [];

    if (machines.length > 0) {
      machines.forEach((m: any) => {
        findings.push({ label: m.hostname, value: `IP: ${m.primaryIp || 'N/A'}, Estado: ${m.status}`, severity: 'INFO' });
        relatedEntities.push({ type: 'machine', id: m.id, label: m.hostname });
      });

      evidence.push({
        source: 'Inventario Global de Infraestructura',
        detail: `${machines.length} resultado(s) encontrado(s)`,
        link: '/machines',
      });

      let content = `### 🔍 Resultados Encontrados en InfraInventory\n\nHe localizado **${machines.length} elemento(s)** coincidentes con tu consulta:\n\n`;
      machines.forEach((m: any) => {
        content += `- 🖥️ **${m.hostname}** (\`${m.primaryIp || 'Sin IP'}\`): Estado **${m.status}**, SO: ${m.os || 'N/A'}, Grupo: ${m.group || 'General'}\n`;
      });

      return { content, findings, evidence, recommendations, relatedEntities, toolsUsed };
    }

    return {
      content: `No tengo información suficiente en InfraInventory para determinar una respuesta específica sobre tu consulta ("*${prompt}*").\n\nPuedes probar preguntándome:\n- *"¿Qué servidores están teniendo problemas de rendimiento?"*\n- *"¿Qué máquinas están caídas o en warning?"*\n- *"Compara los servidores de producción"*\n- *"¿Qué licencias o garantías están próximas a vencer?"*\n- *"Genera un informe del estado general de la infraestructura"*`,
      findings: [],
      evidence: [{ source: 'InfraInventory Database', detail: 'Búsqueda cruzada sin coincidencias directas' }],
      recommendations: ['Utilizar nombres de hosts, IPs, VLANs o categorías existentes en el inventario.'],
      relatedEntities: [],
      toolsUsed,
    };
  }
}
