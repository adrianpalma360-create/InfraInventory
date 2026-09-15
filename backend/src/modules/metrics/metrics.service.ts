import { PrismaClient, HealthState, MachineStatus } from '@prisma/client';
import {
  IngestMetricInput,
  HistoricalQueryParams,
  MonitoringConfigUpdateInput,
} from './metrics.schema.js';
import { metricsWsHub } from './metrics.ws.js';

export class MetricsService {
  constructor(private prisma: PrismaClient) {}

  // 1. Ingest metric samples from monitoring-worker
  async ingestSamples(samples: IngestMetricInput[]) {
    const results = [];
    const config = await this.getMonitoringConfig();

    for (const s of samples) {
      // Fetch machine to get group and current state
      const machine = await this.prisma.machine.findUnique({
        where: { id: s.machineId },
        select: { id: true, hostname: true, group: true, status: true },
      });

      if (!machine) continue;

      // Determine health state based on thresholds
      let health: HealthState = s.healthState || HealthState.HEALTHY;
      if (s.cpuUsage && s.cpuUsage >= config.thresholdCpuCrit) health = HealthState.CRITICAL;
      else if (s.ramUsage && s.ramUsage >= config.thresholdRamCrit) health = HealthState.CRITICAL;
      else if (s.latencyMs && s.latencyMs >= config.thresholdLatencyCrit) health = HealthState.DEGRADED;
      else if (s.cpuUsage && s.cpuUsage >= config.thresholdCpuWarn) health = HealthState.WARNING;
      else if (s.ramUsage && s.ramUsage >= config.thresholdRamWarn) health = HealthState.WARNING;
      else if (s.latencyMs && s.latencyMs >= config.thresholdLatencyWarn) health = HealthState.WARNING;

      const sampleTime = s.timestamp ? new Date(s.timestamp) : new Date();

      // Create metric sample record
      const created = await this.prisma.metricSample.create({
        data: {
          machineId: s.machineId,
          cpuUsage: s.cpuUsage ?? null,
          ramUsage: s.ramUsage ?? null,
          diskUsage: s.diskUsage ?? null,
          networkRxKbps: s.networkRxKbps ?? null,
          networkTxKbps: s.networkTxKbps ?? null,
          networkErrors: s.networkErrors ?? 0,
          latencyMs: s.latencyMs ?? null,
          responseTimeMs: s.responseTimeMs ?? null,
          errorRate: s.errorRate ?? 0,
          activeConnections: s.activeConnections ?? 0,
          healthState: health,
          timestamp: sampleTime,
        },
      });

      // Update machine status
      const newMachineStatus =
        health === HealthState.CRITICAL
          ? MachineStatus.WARNING
          : s.latencyMs !== null
          ? MachineStatus.ONLINE
          : MachineStatus.OFFLINE;

      if (machine.status !== newMachineStatus) {
        await this.prisma.machine.update({
          where: { id: machine.id },
          data: { status: newMachineStatus },
        });

        metricsWsHub.broadcast({
          type: 'status',
          machineId: machine.id,
          groupId: machine.group || undefined,
          data: {
            machineId: machine.id,
            hostname: machine.hostname,
            status: newMachineStatus,
            healthState: health,
          },
        });
      }

      // Upsert service checks
      if (s.services && s.services.length > 0) {
        for (const srv of s.services) {
          const serviceCheck = await this.prisma.serviceCheck.upsert({
            where: {
              machineId_portNumber_protocol: {
                machineId: s.machineId,
                portNumber: srv.portNumber,
                protocol: srv.protocol,
              },
            },
            update: {
              serviceName: srv.serviceName,
              status: srv.status as HealthState,
              latencyMs: srv.latencyMs ?? null,
              responseTimeMs: srv.responseTimeMs ?? null,
              errorRate: srv.errorRate ?? 0,
              details: srv.details ?? null,
              lastChecked: sampleTime,
            },
            create: {
              machineId: s.machineId,
              serviceName: srv.serviceName,
              portNumber: srv.portNumber,
              protocol: srv.protocol,
              status: srv.status as HealthState,
              latencyMs: srv.latencyMs ?? null,
              responseTimeMs: srv.responseTimeMs ?? null,
              errorRate: srv.errorRate ?? 0,
              details: srv.details ?? null,
              lastChecked: sampleTime,
            },
          });

          metricsWsHub.broadcast({
            type: 'service_change',
            machineId: s.machineId,
            groupId: machine.group || undefined,
            data: {
              ...serviceCheck,
              hostname: machine.hostname,
            },
          });
        }
      }

      // Statistical Anomaly Detection (sliding window calculation)
      if (config.enableAnomalies) {
        await this.detectAnomalies(machine.id, machine.hostname, s, config);
      }

      // Broadcast realtime metric to connected WebSockets
      metricsWsHub.broadcast({
        type: 'metric',
        machineId: s.machineId,
        groupId: machine.group || undefined,
        data: {
          ...created,
          hostname: machine.hostname,
          group: machine.group,
        },
      });

      results.push(created);
    }

    return { ingestedCount: results.length };
  }

  // 2. Statistical Anomaly Detection Algorithm
  private async detectAnomalies(
    machineId: string,
    hostname: string,
    sample: IngestMetricInput,
    config: any
  ) {
    // Fetch last 20 samples for statistical baseline
    const pastSamples = await this.prisma.metricSample.findMany({
      where: { machineId },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    if (pastSamples.length < 5) return; // Need minimum samples for baseline

    // Check Latency anomaly
    if (sample.latencyMs !== undefined && sample.latencyMs !== null) {
      const latencies = pastSamples
        .map((p) => p.latencyMs)
        .filter((l): l is number => l !== null && l !== undefined);
      if (latencies.length >= 5) {
        const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const variance =
          latencies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / latencies.length;
        const stdDev = Math.sqrt(variance);

        // Z-score threshold 2.5
        if (stdDev > 5 && sample.latencyMs > mean + 2.5 * stdDev && sample.latencyMs > 80) {
          const message = `La latencia actual (${sample.latencyMs.toFixed(
            0
          )}ms) en ${hostname} está significativamente por encima del comportamiento habitual (${mean.toFixed(
            0
          )}ms ±${stdDev.toFixed(0)}ms).`;

          await this.recordAnomaly(
            machineId,
            hostname,
            'LATENCY',
            sample.latencyMs,
            mean,
            stdDev,
            'WARNING',
            message
          );
        }
      }
    }

    // Check CPU Anomaly
    if (sample.cpuUsage !== undefined && sample.cpuUsage !== null) {
      const cpus = pastSamples
        .map((p) => p.cpuUsage)
        .filter((c): c is number => c !== null && c !== undefined);
      if (cpus.length >= 5) {
        const mean = cpus.reduce((a, b) => a + b, 0) / cpus.length;
        const variance = cpus.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / cpus.length;
        const stdDev = Math.sqrt(variance);

        if (sample.cpuUsage > mean + 2.5 * stdDev && sample.cpuUsage > 85) {
          const message = `Pico anómalo de CPU (${sample.cpuUsage.toFixed(
            0
          )}%) en ${hostname} sobre la media reciente (${mean.toFixed(0)}%).`;

          await this.recordAnomaly(
            machineId,
            hostname,
            'CPU',
            sample.cpuUsage,
            mean,
            stdDev,
            'WARNING',
            message
          );
        }
      }
    }
  }

  private async recordAnomaly(
    machineId: string,
    hostname: string,
    metricType: string,
    currentValue: number,
    expectedMean: number,
    standardDeviation: number,
    severity: string,
    message: string
  ) {
    // Check if duplicate unresolved anomaly was recorded in last 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existing = await this.prisma.metricAnomaly.findFirst({
      where: {
        machineId,
        metricType,
        isResolved: false,
        detectedAt: { gte: fiveMinAgo },
      },
    });

    if (existing) return;

    const anomaly = await this.prisma.metricAnomaly.create({
      data: {
        machineId,
        metricType,
        currentValue,
        expectedMean,
        standardDeviation,
        severity,
        message,
      },
    });

    metricsWsHub.broadcast({
      type: 'alert',
      machineId,
      data: {
        ...anomaly,
        hostname,
      },
    });
  }

  // 3. Historical aggregated metrics query with intelligent time bucketing
  async getHistorical(params: HistoricalQueryParams) {
    const { machineId, groupId, period = '1h' } = params;

    let durationMinutes = 60;
    let bucketSeconds = 30;

    switch (period) {
      case 'realtime':
      case '5m':
        durationMinutes = 5;
        bucketSeconds = 5;
        break;
      case '15m':
        durationMinutes = 15;
        bucketSeconds = 15;
        break;
      case '1h':
        durationMinutes = 60;
        bucketSeconds = 30;
        break;
      case '6h':
        durationMinutes = 360;
        bucketSeconds = 120; // 2 min
        break;
      case '24h':
        durationMinutes = 1440;
        bucketSeconds = 600; // 10 min
        break;
      case '7d':
        durationMinutes = 10080;
        bucketSeconds = 3600; // 1 hour
        break;
      case '30d':
        durationMinutes = 43200;
        bucketSeconds = 14400; // 4 hours
        break;
    }

    const since = new Date(Date.now() - durationMinutes * 60 * 1000);

    // Build where clause
    const whereClause: any = {
      timestamp: { gte: since },
    };

    if (machineId) {
      whereClause.machineId = machineId;
    } else if (groupId) {
      const machinesInGroup = await this.prisma.machine.findMany({
        where: { group: groupId },
        select: { id: true },
      });
      whereClause.machineId = { in: machinesInGroup.map((m) => m.id) };
    }

    const rawSamples = await this.prisma.metricSample.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
      select: {
        timestamp: true,
        cpuUsage: true,
        ramUsage: true,
        diskUsage: true,
        networkRxKbps: true,
        networkTxKbps: true,
        networkErrors: true,
        latencyMs: true,
        responseTimeMs: true,
        errorRate: true,
        activeConnections: true,
        healthState: true,
      },
      take: 2000,
    });

    if (rawSamples.length === 0) {
      return {
        period,
        pointsCount: 0,
        data: [],
      };
    }

    // Time-bucket aggregation
    const bucketsMap = new Map<number, any[]>();
    for (const sample of rawSamples) {
      const sampleTimeMs = new Date(sample.timestamp).getTime();
      const bucketKey = Math.floor(sampleTimeMs / (bucketSeconds * 1000)) * (bucketSeconds * 1000);

      if (!bucketsMap.has(bucketKey)) {
        bucketsMap.set(bucketKey, []);
      }
      bucketsMap.get(bucketKey)!.push(sample);
    }

    const aggregatedPoints = Array.from(bucketsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([bucketKey, items]) => {
        const avg = (fn: (item: any) => number | null) => {
          const vals = items.map(fn).filter((v): v is number => v !== null && v !== undefined);
          if (vals.length === 0) return null;
          return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
        };

        const max = (fn: (item: any) => number | null) => {
          const vals = items.map(fn).filter((v): v is number => v !== null && v !== undefined);
          if (vals.length === 0) return null;
          return Math.max(...vals);
        };

        return {
          timestamp: new Date(bucketKey).toISOString(),
          timeLabel: new Date(bucketKey).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: durationMinutes <= 15 ? '2-digit' : undefined }),
          cpuUsage: avg((i) => i.cpuUsage),
          cpuMax: max((i) => i.cpuUsage),
          ramUsage: avg((i) => i.ramUsage),
          diskUsage: avg((i) => i.diskUsage),
          networkRxKbps: avg((i) => i.networkRxKbps),
          networkTxKbps: avg((i) => i.networkTxKbps),
          networkErrors: max((i) => i.networkErrors) || 0,
          latencyMs: avg((i) => i.latencyMs),
          responseTimeMs: avg((i) => i.responseTimeMs),
          errorRate: avg((i) => i.errorRate) || 0,
          activeConnections: avg((i) => i.activeConnections) || 0,
          samplesCount: items.length,
        };
      });

    return {
      period,
      bucketSeconds,
      pointsCount: aggregatedPoints.length,
      data: aggregatedPoints,
    };
  }

  // 4. Real-time Summary Cards
  async getRealtimeSummary(machineId?: string, groupId?: string) {
    const whereClause: any = {};
    if (machineId) {
      whereClause.machineId = machineId;
    } else if (groupId) {
      const machines = await this.prisma.machine.findMany({
        where: { group: groupId },
        select: { id: true },
      });
      whereClause.machineId = { in: machines.map((m) => m.id) };
    }

    const latestSample = await this.prisma.metricSample.findFirst({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      include: {
        machine: {
          select: { id: true, hostname: true, group: true },
        },
      },
    });

    if (!latestSample) {
      return null;
    }

    // Compare with average from 10 minutes ago to calculate trend
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const avgRecent = await this.prisma.metricSample.aggregate({
      where: {
        ...whereClause,
        timestamp: { gte: tenMinAgo },
      },
      _avg: {
        cpuUsage: true,
        ramUsage: true,
        diskUsage: true,
        latencyMs: true,
        networkRxKbps: true,
      },
    });

    const calcTrend = (current: number | null | undefined, avg: number | null | undefined) => {
      if (current === null || current === undefined || avg === null || avg === undefined) return 'STEADY';
      const diff = current - avg;
      if (diff > 2) return 'RISING';
      if (diff < -2) return 'FALLING';
      return 'STEADY';
    };

    return {
      machineId: latestSample.machineId,
      hostname: latestSample.machine.hostname,
      group: latestSample.machine.group,
      timestamp: latestSample.timestamp,
      healthState: latestSample.healthState,
      cpu: {
        value: latestSample.cpuUsage,
        unit: '%',
        trend: calcTrend(latestSample.cpuUsage, avgRecent._avg.cpuUsage),
      },
      ram: {
        value: latestSample.ramUsage,
        unit: '%',
        trend: calcTrend(latestSample.ramUsage, avgRecent._avg.ramUsage),
      },
      disk: {
        value: latestSample.diskUsage,
        unit: '%',
        trend: calcTrend(latestSample.diskUsage, avgRecent._avg.diskUsage),
      },
      latency: {
        value: latestSample.latencyMs,
        unit: 'ms',
        trend: calcTrend(latestSample.latencyMs, avgRecent._avg.latencyMs),
      },
      responseTime: {
        value: latestSample.responseTimeMs,
        unit: 'ms',
      },
      networkRx: {
        value: latestSample.networkRxKbps,
        unit: 'Kbps',
        trend: calcTrend(latestSample.networkRxKbps, avgRecent._avg.networkRxKbps),
      },
      networkTx: {
        value: latestSample.networkTxKbps,
        unit: 'Kbps',
      },
      networkErrors: {
        value: latestSample.networkErrors || 0,
        unit: 'err',
      },
      errorRate: {
        value: latestSample.errorRate || 0,
        unit: '%',
      },
      connections: {
        value: latestSample.activeConnections || 0,
        unit: 'conn',
      },
    };
  }

  // 5. Service checks table
  async getServices(machineId?: string) {
    const where: any = {};
    if (machineId) where.machineId = machineId;

    return this.prisma.serviceCheck.findMany({
      where,
      include: {
        machine: {
          select: { id: true, hostname: true, primaryIp: true, group: true },
        },
      },
      orderBy: [{ status: 'desc' }, { lastChecked: 'desc' }],
    });
  }

  // 6. Anomalies list
  async getAnomalies(machineId?: string, isResolved = false) {
    const where: any = { isResolved };
    if (machineId) where.machineId = machineId;

    return this.prisma.metricAnomaly.findMany({
      where,
      include: {
        machine: {
          select: { id: true, hostname: true, group: true },
        },
      },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    });
  }

  // 7. Groups list & aggregated stats
  async getGroups() {
    const machines = await this.prisma.machine.findMany({
      select: {
        id: true,
        hostname: true,
        group: true,
        status: true,
      },
    });

    // Group machines
    const groupsMap = new Map<string, typeof machines>();
    machines.forEach((m) => {
      const grp = m.group || 'Sin Grupo';
      if (!groupsMap.has(grp)) groupsMap.set(grp, []);
      groupsMap.get(grp)!.push(m);
    });

    const result = [];
    for (const [groupName, groupMachines] of groupsMap.entries()) {
      const machineIds = groupMachines.map((m) => m.id);

      // Latest metrics aggregated
      const latestMetrics = await this.prisma.metricSample.findMany({
        where: { machineId: { in: machineIds } },
        orderBy: { timestamp: 'desc' },
        distinct: ['machineId'],
      });

      const onlineCount = groupMachines.filter((m) => m.status === MachineStatus.ONLINE).length;
      const offlineCount = groupMachines.length - onlineCount;

      const avg = (fn: (m: any) => number | null | undefined) => {
        const vals = latestMetrics.map(fn).filter((v): v is number => v !== null && v !== undefined);
        if (vals.length === 0) return null;
        return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
      };

      result.push({
        name: groupName,
        totalMachines: groupMachines.length,
        onlineCount,
        offlineCount,
        avgCpu: avg((m) => m.cpuUsage),
        avgRam: avg((m) => m.ramUsage),
        avgLatency: avg((m) => m.latencyMs),
      });
    }

    return result;
  }

  // 8. Monitoring Config
  async getMonitoringConfig() {
    let config = await this.prisma.monitoringConfig.findFirst();
    if (!config) {
      config = await this.prisma.monitoringConfig.create({
        data: {
          checkIntervalSec: 30,
          retentionDays: 30,
          enableAnomalies: true,
          thresholdCpuWarn: 80,
          thresholdCpuCrit: 90,
          thresholdRamWarn: 85,
          thresholdRamCrit: 95,
          thresholdDiskWarn: 85,
          thresholdDiskCrit: 95,
          thresholdLatencyWarn: 100,
          thresholdLatencyCrit: 300,
        },
      });
    }
    return config;
  }

  async updateMonitoringConfig(data: MonitoringConfigUpdateInput) {
    const existing = await this.getMonitoringConfig();
    return this.prisma.monitoringConfig.update({
      where: { id: existing.id },
      data,
    });
  }

  // 9. Resolve Anomaly / Alert
  async resolveAnomaly(id: string) {
    const anomaly = await this.prisma.metricAnomaly.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
      include: {
        machine: {
          select: { id: true, hostname: true, group: true },
        },
      },
    });

    metricsWsHub.broadcast({
      type: 'alert',
      machineId: anomaly.machineId,
      groupId: anomaly.machine.group || undefined,
      data: {
        type: 'RESOLVED',
        anomaly,
      },
    });

    return anomaly;
  }

  // 10. Unified Monitoring Overview
  async getMonitoringOverview() {
    const [machines, serviceChecks, anomalies, ports] = await Promise.all([
      this.prisma.machine.findMany({
        select: {
          id: true,
          hostname: true,
          status: true,
          group: true,
          primaryIp: true,
          updatedAt: true,
          metricSamples: {
            take: 1,
            orderBy: { timestamp: 'desc' },
            select: {
              healthState: true,
              cpuUsage: true,
              ramUsage: true,
              diskUsage: true,
              latencyMs: true,
              timestamp: true,
            },
          },
        },
        orderBy: { hostname: 'asc' },
      }),
      this.prisma.serviceCheck.findMany({
        include: {
          machine: {
            select: { id: true, hostname: true, primaryIp: true, group: true },
          },
        },
        orderBy: { lastChecked: 'desc' },
      }),
      this.prisma.metricAnomaly.findMany({
        include: {
          machine: {
            select: { id: true, hostname: true, group: true },
          },
        },
        orderBy: { detectedAt: 'desc' },
        take: 100,
      }),
      this.prisma.port.findMany({
        include: {
          machine: {
            select: { id: true, hostname: true },
          },
          service: true,
        },
        orderBy: { portNumber: 'asc' },
      }),
    ]);

    // Machine health counts
    const totalMachines = machines.length;
    let healthyCount = 0;
    let warningCount = 0;
    let degradedCount = 0;
    let criticalCount = 0;
    let offlineCount = 0;

    const hostStatuses = machines.map((m) => {
      const latestMetric = m.metricSamples[0];
      const health: HealthState =
        latestMetric?.healthState ||
        (m.status === MachineStatus.ONLINE ? HealthState.HEALTHY : HealthState.UNKNOWN);

      if (m.status === MachineStatus.OFFLINE) offlineCount++;
      else if (health === HealthState.CRITICAL) criticalCount++;
      else if (health === HealthState.DEGRADED) degradedCount++;
      else if (health === HealthState.WARNING) warningCount++;
      else healthyCount++;

      return {
        id: m.id,
        hostname: m.hostname,
        primaryIp: m.primaryIp,
        group: m.group || 'Servidores',
        status: m.status,
        healthState: health,
        cpuUsage: latestMetric?.cpuUsage ?? null,
        ramUsage: latestMetric?.ramUsage ?? null,
        diskUsage: latestMetric?.diskUsage ?? null,
        latencyMs: latestMetric?.latencyMs ?? null,
        lastSeen: latestMetric?.timestamp || m.updatedAt,
      };
    });

    // Services breakdown
    const totalServices = serviceChecks.length;
    const servicesUp = serviceChecks.filter((s) => s.status === HealthState.HEALTHY).length;
    const servicesWarning = serviceChecks.filter((s) => s.status === HealthState.WARNING).length;
    const servicesDegraded = serviceChecks.filter((s) => s.status === HealthState.DEGRADED).length;
    const servicesDown = serviceChecks.filter((s) => s.status === HealthState.CRITICAL).length;

    // Ports breakdown
    const totalPorts = ports.length;
    const portsOpen = ports.filter((p) => p.state === 'OPEN').length;
    const portsClosed = ports.filter((p) => p.state === 'CLOSED').length;
    const portsFiltered = ports.filter((p) => p.state === 'FILTERED').length;

    // Problem items (Unhealthy hosts + degraded/down services + anomalies)
    const problems: any[] = [];

    // Add unresolved anomalies as problems
    anomalies
      .filter((a) => !a.isResolved)
      .forEach((a) => {
        problems.push({
          id: `anomaly-${a.id}`,
          type: 'ANOMALY',
          severity: a.severity,
          title: `Anomalía en ${a.metricType}`,
          message: a.message,
          hostname: a.machine?.hostname || 'Host Desconocido',
          machineId: a.machineId,
          timestamp: a.detectedAt,
          anomalyId: a.id,
          isResolved: false,
        });
      });

    // Add degraded or critical services
    serviceChecks
      .filter((s) => s.status === HealthState.CRITICAL || s.status === HealthState.DEGRADED)
      .forEach((s) => {
        problems.push({
          id: `service-${s.id}`,
          type: 'SERVICE_OUTAGE',
          severity: s.status === HealthState.CRITICAL ? 'CRITICAL' : 'WARNING',
          title: `Servicio ${s.serviceName} (${s.portNumber}/${s.protocol}) no saludable`,
          message:
            s.details ||
            `Estado actual: ${s.status}. Latencia: ${
              s.latencyMs ? `${s.latencyMs}ms` : 'Sin respuesta'
            }`,
          hostname: s.machine?.hostname || 'Host Desconocido',
          machineId: s.machineId,
          timestamp: s.lastChecked,
          isResolved: false,
        });
      });

    // Add offline hosts
    machines
      .filter((m) => m.status === MachineStatus.OFFLINE)
      .forEach((m) => {
        problems.push({
          id: `host-offline-${m.id}`,
          type: 'HOST_OFFLINE',
          severity: 'CRITICAL',
          title: `Host Offline: ${m.hostname}`,
          message: `El host ${m.hostname} (${
            m.primaryIp || 'Sin IP'
          }) no responde a las sondas de red.`,
          hostname: m.hostname,
          machineId: m.id,
          timestamp: m.updatedAt,
          isResolved: false,
        });
      });

    return {
      overview: {
        totalMachines,
        healthyCount,
        warningCount,
        degradedCount,
        criticalCount,
        offlineCount,
        totalServices,
        servicesUp,
        servicesWarning,
        servicesDegraded,
        servicesDown,
        totalPorts,
        portsOpen,
        portsClosed,
        portsFiltered,
        activeProblemsCount: problems.length,
      },
      hostStatuses,
      serviceChecks,
      ports,
      problems: problems.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
      anomalies,
    };
  }
}
