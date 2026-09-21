import { PrismaClient, MachineStatus, HealthState } from '@prisma/client';

export interface NocFilterParams {
  tag?: string;
  group?: string;
  locationId?: string;
  status?: MachineStatus;
  period?: string; // '1h' | '6h' | '24h' | '7d' | '30d'
}

export interface HealthScoreBreakdown {
  availabilityScore: number; // 0 - 100 (weight 40%)
  alertsScore: number;       // 0 - 100 (weight 30%)
  servicesScore: number;     // 0 - 100 (weight 20%)
  resourcesScore: number;    // 0 - 100 (weight 10%)
  formula: string;
}

export interface HealthScoreResult {
  score: number | null; // null if 0 machines
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  label: string;
  breakdown: HealthScoreBreakdown | null;
}

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  /**
   * V12 NOC Dashboard Aggregated Overview API
   * Fast, optimized single-trip query providing comprehensive infrastructure intelligence
   */
  async getNocOverview(filter: NocFilterParams = {}) {
    const { tag, group, locationId, status, period = '24h' } = filter;

    // Build Prisma where clause for machines based on active filters
    const machineWhere: any = {};

    if (status) {
      machineWhere.status = status;
    }

    if (group && group !== 'all') {
      machineWhere.group = group;
    }

    if (locationId && locationId !== 'all') {
      machineWhere.locationId = locationId;
    }

    if (tag && tag !== 'all') {
      machineWhere.tags = {
        some: {
          tag: {
            name: { equals: tag, mode: 'insensitive' },
          },
        },
      };
    }

    // Determine timeframe for historical metrics and activity
    let durationMinutes = 1440; // Default 24h
    let bucketSeconds = 600;    // 10 min buckets
    switch (period) {
      case '1h':
        durationMinutes = 60;
        bucketSeconds = 60; // 1 min
        break;
      case '6h':
        durationMinutes = 360;
        bucketSeconds = 180; // 3 min
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

    const sinceDate = new Date(Date.now() - durationMinutes * 60 * 1000);
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Parallel Execution of All Aggregated Queries
    const [
      totalMachines,
      onlineMachines,
      warningMachines,
      offlineMachines,
      uncheckedMachines,
      activeMaintenancesCount,
      allUnresolvedAnomalies,
      allServiceChecks,
      allAvailableTags,
      distinctGroupsRaw,
      allLocations,
      latestScan,
      discoveryNetworksCount,
      recentAuditLogs,
      recentDiscoveryChanges,
      recentSamples,
      monitoringConfig,
    ] = await Promise.all([
      // 1. Device status counts
      this.prisma.machine.count({ where: machineWhere }),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.ONLINE } }),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.WARNING } }),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.OFFLINE } }),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.UNCHECKED } }),
      this.prisma.maintenance.count({
        where: {
          status: 'IN_PROGRESS',
          machine: machineWhere,
        },
      }),

      // 2. Active Anomalies & Alerts
      this.prisma.metricAnomaly.findMany({
        where: {
          isResolved: false,
          machine: machineWhere,
        },
        include: {
          machine: {
            select: { id: true, hostname: true, primaryIp: true, group: true },
          },
        },
        orderBy: { detectedAt: 'desc' },
        take: 50,
      }),

      // 3. Service checks
      this.prisma.serviceCheck.findMany({
        where: {
          machine: machineWhere,
        },
        include: {
          machine: {
            select: { id: true, hostname: true, primaryIp: true, group: true },
          },
        },
        orderBy: { lastChecked: 'desc' },
      }),

      // 4. Tags for filter bar
      this.prisma.tag.findMany({
        include: { _count: { select: { machines: true } } },
        orderBy: { name: 'asc' },
      }),

      // 5. Distinct groups
      this.prisma.machine.findMany({
        where: { group: { not: null } },
        select: { group: true },
        distinct: ['group'],
      }),

      // 6. Locations
      this.prisma.location.findMany({
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' },
      }),

      // 7. Discovery latest scan & network stats
      this.prisma.discoveryScan.findFirst({
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.discoveryNetwork.count(),

      // 8. Recent Audit Logs (Activity Timeline)
      this.prisma.changeLog.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          machine: {
            select: { id: true, hostname: true },
          },
        },
      }),

      // 9. Recent Discovery Changes (Activity Timeline)
      this.prisma.discoveryChange.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          machine: {
            select: { id: true, hostname: true },
          },
        },
      }),

      // 10. Metric Samples for Performance & Resources
      this.prisma.metricSample.findMany({
        where: {
          timestamp: { gte: sinceDate },
          machine: machineWhere,
        },
        orderBy: { timestamp: 'asc' },
        select: {
          machineId: true,
          cpuUsage: true,
          ramUsage: true,
          diskUsage: true,
          networkRxKbps: true,
          networkTxKbps: true,
          networkErrors: true,
          latencyMs: true,
          responseTimeMs: true,
          errorRate: true,
          healthState: true,
          timestamp: true,
          machine: {
            select: { id: true, hostname: true, group: true, status: true },
          },
        },
        take: 5000,
      }),

      // 11. Monitoring Thresholds Configuration
      this.prisma.monitoringConfig.findFirst(),
    ]);

    // -------------------------------------------------------------
    // A. LATEST SAMPLE PER MACHINE (For Real Resource Metrics & Top Consumers)
    // -------------------------------------------------------------
    const latestSampleByMachine = new Map<string, any>();
    for (const sample of recentSamples) {
      // Because samples are ordered by timestamp asc, setting will overwrite with newest
      latestSampleByMachine.set(sample.machineId, sample);
    }

    const latestSamplesList = Array.from(latestSampleByMachine.values());

    // Calculate Global CPU, RAM, Disk (Average and Max strictly from reporting hosts)
    const validCpuSamples = latestSamplesList.map((s) => s.cpuUsage).filter((v): v is number => v !== null && v !== undefined);
    const validRamSamples = latestSamplesList.map((s) => s.ramUsage).filter((v): v is number => v !== null && v !== undefined);
    const validDiskSamples = latestSamplesList.map((s) => s.diskUsage).filter((v): v is number => v !== null && v !== undefined);
    const validLatencySamples = latestSamplesList.map((s) => s.latencyMs).filter((v): v is number => v !== null && v !== undefined);

    const resources = {
      cpuAvg: validCpuSamples.length > 0 ? Number((validCpuSamples.reduce((a, b) => a + b, 0) / validCpuSamples.length).toFixed(1)) : null,
      cpuMax: validCpuSamples.length > 0 ? Math.max(...validCpuSamples) : null,
      ramAvg: validRamSamples.length > 0 ? Number((validRamSamples.reduce((a, b) => a + b, 0) / validRamSamples.length).toFixed(1)) : null,
      ramMax: validRamSamples.length > 0 ? Math.max(...validRamSamples) : null,
      diskAvg: validDiskSamples.length > 0 ? Number((validDiskSamples.reduce((a, b) => a + b, 0) / validDiskSamples.length).toFixed(1)) : null,
      diskMax: validDiskSamples.length > 0 ? Math.max(...validDiskSamples) : null,
      latencyAvg: validLatencySamples.length > 0 ? Number((validLatencySamples.reduce((a, b) => a + b, 0) / validLatencySamples.length).toFixed(1)) : null,
      latencyMax: validLatencySamples.length > 0 ? Math.max(...validLatencySamples) : null,
      reportingHostsCount: latestSamplesList.length,
      totalHosts: totalMachines,
    };

    // Top Consumers (Sorted descending, max 5)
    const topCpu = latestSamplesList
      .filter((s) => s.cpuUsage !== null && s.cpuUsage !== undefined)
      .sort((a, b) => (b.cpuUsage ?? 0) - (a.cpuUsage ?? 0))
      .slice(0, 5)
      .map((s) => ({
        machineId: s.machineId,
        hostname: s.machine?.hostname || 'Unknown',
        group: s.machine?.group || null,
        value: s.cpuUsage as number,
        status: s.machine?.status || 'ONLINE',
      }));

    const topRam = latestSamplesList
      .filter((s) => s.ramUsage !== null && s.ramUsage !== undefined)
      .sort((a, b) => (b.ramUsage ?? 0) - (a.ramUsage ?? 0))
      .slice(0, 5)
      .map((s) => ({
        machineId: s.machineId,
        hostname: s.machine?.hostname || 'Unknown',
        group: s.machine?.group || null,
        value: s.ramUsage as number,
        status: s.machine?.status || 'ONLINE',
      }));

    const topDisk = latestSamplesList
      .filter((s) => s.diskUsage !== null && s.diskUsage !== undefined)
      .sort((a, b) => (b.diskUsage ?? 0) - (a.diskUsage ?? 0))
      .slice(0, 5)
      .map((s) => ({
        machineId: s.machineId,
        hostname: s.machine?.hostname || 'Unknown',
        group: s.machine?.group || null,
        value: s.diskUsage as number,
        status: s.machine?.status || 'ONLINE',
      }));

    // -------------------------------------------------------------
    // B. ALERTS & CRITICAL HIGHLIGHTS
    // -------------------------------------------------------------
    const criticalAlerts = allUnresolvedAnomalies.filter((a) => a.severity === 'CRITICAL');
    const warningAlerts = allUnresolvedAnomalies.filter((a) => a.severity === 'WARNING');
    const infoAlerts = allUnresolvedAnomalies.filter((a) => a.severity === 'INFO');

    // -------------------------------------------------------------
    // C. SERVICES AGGREGATION & PROBLEMATIC SERVICES
    // -------------------------------------------------------------
    let healthyServicesCount = 0;
    let warningServicesCount = 0;
    let downServicesCount = 0;
    const problematicServices: any[] = [];

    for (const sc of allServiceChecks) {
      if (sc.status === HealthState.HEALTHY) {
        healthyServicesCount++;
      } else if (sc.status === HealthState.WARNING) {
        warningServicesCount++;
        problematicServices.push({
          id: sc.id,
          machineId: sc.machineId,
          hostname: sc.machine?.hostname || 'Unknown',
          primaryIp: sc.machine?.primaryIp || null,
          serviceName: sc.serviceName,
          portNumber: sc.portNumber,
          protocol: sc.protocol,
          status: sc.status,
          latencyMs: sc.latencyMs,
          responseTimeMs: sc.responseTimeMs,
          details: sc.details,
          lastChecked: sc.lastChecked,
        });
      } else {
        downServicesCount++;
        problematicServices.push({
          id: sc.id,
          machineId: sc.machineId,
          hostname: sc.machine?.hostname || 'Unknown',
          primaryIp: sc.machine?.primaryIp || null,
          serviceName: sc.serviceName,
          portNumber: sc.portNumber,
          protocol: sc.protocol,
          status: sc.status,
          latencyMs: sc.latencyMs,
          responseTimeMs: sc.responseTimeMs,
          details: sc.details,
          lastChecked: sc.lastChecked,
        });
      }
    }

    // -------------------------------------------------------------
    // D. DEVICES REQUIRING ATTENTION (Smart Prioritized Queue)
    // -------------------------------------------------------------
    // Gathers machines with: Offline, Warning status, unresolved alerts, saturated resources (>85%), or down services
    const machinesNeedingAttentionMap = new Map<string, any>();

    // 1. Unresolved Critical / Warning Alerts
    for (const anom of allUnresolvedAnomalies) {
      if (!machinesNeedingAttentionMap.has(anom.machineId)) {
        machinesNeedingAttentionMap.set(anom.machineId, {
          machineId: anom.machineId,
          hostname: anom.machine?.hostname || 'Unknown',
          primaryIp: anom.machine?.primaryIp || null,
          group: anom.machine?.group || null,
          status: anom.severity === 'CRITICAL' ? MachineStatus.WARNING : MachineStatus.ONLINE,
          severity: anom.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          reason: anom.message,
          openAlertsCount: 1,
          downServicesCount: 0,
          detectedAt: anom.detectedAt,
        });
      } else {
        const item = machinesNeedingAttentionMap.get(anom.machineId);
        item.openAlertsCount++;
        if (anom.severity === 'CRITICAL') item.severity = 'CRITICAL';
      }
    }

    // 2. Offline / Warning Machines without anomalies
    const offlineOrWarningMachines = await this.prisma.machine.findMany({
      where: {
        ...machineWhere,
        status: { in: [MachineStatus.OFFLINE, MachineStatus.WARNING] },
      },
      select: {
        id: true,
        hostname: true,
        primaryIp: true,
        group: true,
        status: true,
        updatedAt: true,
      },
      take: 20,
    });

    for (const m of offlineOrWarningMachines) {
      if (!machinesNeedingAttentionMap.has(m.id)) {
        machinesNeedingAttentionMap.set(m.id, {
          machineId: m.id,
          hostname: m.hostname,
          primaryIp: m.primaryIp,
          group: m.group,
          status: m.status,
          severity: m.status === MachineStatus.OFFLINE ? 'OFFLINE' : 'WARNING',
          reason: m.status === MachineStatus.OFFLINE ? 'Dispositivo no responde a sondeo ICMP/TCP (Offline)' : 'Estado en Warning',
          openAlertsCount: 0,
          downServicesCount: 0,
          detectedAt: m.updatedAt,
        });
      }
    }

    // 3. Problematic Services
    for (const ps of problematicServices) {
      if (machinesNeedingAttentionMap.has(ps.machineId)) {
        const item = machinesNeedingAttentionMap.get(ps.machineId);
        item.downServicesCount++;
      } else {
        machinesNeedingAttentionMap.set(ps.machineId, {
          machineId: ps.machineId,
          hostname: ps.hostname,
          primaryIp: ps.primaryIp,
          group: null,
          status: MachineStatus.ONLINE,
          severity: ps.status === HealthState.CRITICAL || ps.status === HealthState.DEGRADED ? 'CRITICAL' : 'WARNING',
          reason: `Servicio ${ps.serviceName} (${ps.portNumber}/${ps.protocol}) en estado ${ps.status}`,
          openAlertsCount: 0,
          downServicesCount: 1,
          detectedAt: ps.lastChecked,
        });
      }
    }

    // Sort attention devices strictly by priority: CRITICAL (1) > OFFLINE (2) > WARNING (3)
    const devicesRequiringAttention = Array.from(machinesNeedingAttentionMap.values())
      .sort((a, b) => {
        const score = (item: any) => {
          if (item.severity === 'CRITICAL') return 3;
          if (item.severity === 'OFFLINE') return 2;
          return 1;
        };
        return score(b) - score(a);
      })
      .slice(0, 10);

    // -------------------------------------------------------------
    // E. HEALTH SCORE COMPUTATION (Transparent & Documented)
    // -------------------------------------------------------------
    let healthScoreResult: HealthScoreResult;

    if (totalMachines === 0) {
      healthScoreResult = {
        score: null,
        status: 'UNKNOWN',
        label: 'N/D (Sin dispositivos)',
        breakdown: null,
      };
    } else {
      // 1. Availability subscore (Weight: 40%)
      // Online = 100%, Warning = 50%, Unchecked = 50%, Offline = 0%
      const availabilityScore = Math.min(
        100,
        Math.max(
          0,
          ((onlineMachines * 1.0 + warningMachines * 0.5 + uncheckedMachines * 0.5) / totalMachines) * 100
        )
      );

      // 2. Alerts subscore (Weight: 30%)
      // Each critical alert subtracts 15%, each warning alert subtracts 5%
      const alertsScore = Math.max(
        0,
        100 - (criticalAlerts.length * 15 + warningAlerts.length * 5)
      );

      // 3. Services subscore (Weight: 20%)
      let servicesScore = 100;
      if (allServiceChecks.length > 0) {
        servicesScore = Math.min(
          100,
          Math.max(
            0,
            ((healthyServicesCount * 1.0 + warningServicesCount * 0.5) / allServiceChecks.length) * 100
          )
        );
      } else {
        servicesScore = availabilityScore; // Neutral fallback
      }

      // 4. Resources subscore (Weight: 10%)
      // Evaluate percentage of reporting hosts with saturated CPU/RAM/Disk (>90%)
      let resourcesScore = 100;
      if (latestSamplesList.length > 0) {
        let saturatedCount = 0;
        for (const s of latestSamplesList) {
          if (
            (s.cpuUsage && s.cpuUsage > 90) ||
            (s.ramUsage && s.ramUsage > 92) ||
            (s.diskUsage && s.diskUsage > 95)
          ) {
            saturatedCount++;
          }
        }
        resourcesScore = Math.max(0, 100 - (saturatedCount / latestSamplesList.length) * 100);
      }

      // Calculate Weighted Global Score
      const finalScore = Math.round(
        availabilityScore * 0.4 +
        alertsScore * 0.3 +
        servicesScore * 0.2 +
        resourcesScore * 0.1
      );

      const clampedScore = Math.min(100, Math.max(0, finalScore));

      let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
      let healthLabel = 'HEALTHY';

      if (clampedScore >= 90) {
        healthStatus = 'HEALTHY';
        healthLabel = 'ÓPTIMO / SALUDABLE';
      } else if (clampedScore >= 70) {
        healthStatus = 'WARNING';
        healthLabel = 'DEGRADADO / ADVERTENCIA';
      } else {
        healthStatus = 'CRITICAL';
        healthLabel = 'CRÍTICO / ATENCIÓN URGENTE';
      }

      healthScoreResult = {
        score: clampedScore,
        status: healthStatus,
        label: healthLabel,
        breakdown: {
          availabilityScore: Math.round(availabilityScore),
          alertsScore: Math.round(alertsScore),
          servicesScore: Math.round(servicesScore),
          resourcesScore: Math.round(resourcesScore),
          formula: '40% Disponibilidad + 30% Alertas Activas + 20% Salud de Servicios + 10% Saturación Recursos',
        },
      };
    }

    // -------------------------------------------------------------
    // F. UNIFIED ACTIVITY TIMELINE (Real Audit + Discovery + Alerts)
    // -------------------------------------------------------------
    const activityItems: any[] = [];

    // 1. Audit ChangeLogs
    for (const log of recentAuditLogs) {
      activityItems.push({
        id: `change-${log.id}`,
        type: 'CHANGE',
        title: `${log.action} en ${log.entityType}`,
        details: log.details,
        user: log.user || 'system',
        timestamp: log.createdAt.toISOString(),
        severity: log.action === 'DELETE' ? 'WARNING' : 'INFO',
        machineId: log.machineId || null,
        hostname: log.machine?.hostname || null,
      });
    }

    // 2. Discovery Changes
    for (const dc of recentDiscoveryChanges) {
      activityItems.push({
        id: `discovery-${dc.id}`,
        type: 'DISCOVERY',
        title: `Discovery: ${dc.changeType.replace(/_/g, ' ')}`,
        details: `${dc.details} (IP: ${dc.ip})`,
        user: 'discovery-engine',
        timestamp: dc.createdAt.toISOString(),
        severity: dc.changeType === 'DEVICE_OFFLINE' ? 'WARNING' : 'INFO',
        machineId: dc.machineId || null,
        hostname: dc.hostname || dc.machine?.hostname || null,
      });
    }

    // 3. Alerts & Anomalies
    for (const anom of allUnresolvedAnomalies.slice(0, 10)) {
      activityItems.push({
        id: `alert-${anom.id}`,
        type: 'ALERT',
        title: `Alerta ${anom.severity}: ${anom.metricType}`,
        details: anom.message,
        user: 'monitoring-worker',
        timestamp: anom.detectedAt.toISOString(),
        severity: anom.severity,
        machineId: anom.machineId,
        hostname: anom.machine?.hostname || null,
      });
    }

    // Sort united activity timeline desc by timestamp
    const unifiedActivity = activityItems
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    // -------------------------------------------------------------
    // G. HISTORICAL PERFORMANCE BUCKETING (Real Data)
    // -------------------------------------------------------------
    const bucketsMap = new Map<number, any[]>();
    for (const sample of recentSamples) {
      const sampleTimeMs = new Date(sample.timestamp).getTime();
      const bucketKey = Math.floor(sampleTimeMs / (bucketSeconds * 1000)) * (bucketSeconds * 1000);

      if (!bucketsMap.has(bucketKey)) {
        bucketsMap.set(bucketKey, []);
      }
      bucketsMap.get(bucketKey)!.push(sample);
    }

    const aggregatedHistoricalPoints = Array.from(bucketsMap.entries())
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
          timeLabel: new Date(bucketKey).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: durationMinutes <= 60 ? '2-digit' : undefined,
          }),
          cpuUsage: avg((i) => i.cpuUsage),
          cpuMax: max((i) => i.cpuUsage),
          ramUsage: avg((i) => i.ramUsage),
          ramMax: max((i) => i.ramUsage),
          diskUsage: avg((i) => i.diskUsage),
          diskMax: max((i) => i.diskUsage),
          networkRxKbps: avg((i) => i.networkRxKbps),
          networkTxKbps: avg((i) => i.networkTxKbps),
          latencyMs: avg((i) => i.latencyMs),
          samplesCount: items.length,
        };
      });

    // -------------------------------------------------------------
    // H. MONITORING WORKER & DISCOVERY ENGINE STATUS
    // -------------------------------------------------------------
    const latestSampleOverall = await this.prisma.metricSample.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    const isMonitoringActive = latestSampleOverall
      ? new Date(latestSampleOverall.timestamp).getTime() > Date.now() - 10 * 60 * 1000
      : false;

    return {
      health: healthScoreResult,
      devices: {
        total: totalMachines,
        online: onlineMachines,
        warning: warningMachines,
        offline: offlineMachines,
        unchecked: uncheckedMachines,
        maintenance: activeMaintenancesCount,
      },
      criticalAlerts: criticalAlerts.map((a) => ({
        id: a.id,
        machineId: a.machineId,
        hostname: a.machine?.hostname || 'Unknown',
        primaryIp: a.machine?.primaryIp || null,
        metricType: a.metricType,
        currentValue: a.currentValue,
        severity: a.severity,
        message: a.message,
        detectedAt: a.detectedAt.toISOString(),
      })),
      alerts: {
        total: allUnresolvedAnomalies.length,
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
        info: infoAlerts.length,
        items: allUnresolvedAnomalies.map((a) => ({
          id: a.id,
          machineId: a.machineId,
          hostname: a.machine?.hostname || 'Unknown',
          primaryIp: a.machine?.primaryIp || null,
          metricType: a.metricType,
          currentValue: a.currentValue,
          severity: a.severity,
          message: a.message,
          detectedAt: a.detectedAt.toISOString(),
        })),
      },
      resources,
      topResources: {
        cpu: topCpu,
        ram: topRam,
        disk: topDisk,
      },
      services: {
        total: allServiceChecks.length,
        healthy: healthyServicesCount,
        warning: warningServicesCount,
        down: downServicesCount,
        problematic: problematicServices.slice(0, 10),
      },
      devicesRequiringAttention,
      activity: unifiedActivity,
      discovery: {
        lastScan: latestScan,
        totalNetworks: discoveryNetworksCount,
      },
      monitoring: {
        status: isMonitoringActive ? 'ONLINE' : 'OFFLINE',
        lastExecution: latestSampleOverall ? latestSampleOverall.timestamp.toISOString() : null,
        monitoredDevices: latestSamplesList.length,
        totalChecks: allServiceChecks.length,
        failures: downServicesCount + criticalAlerts.length,
        checkIntervalSec: monitoringConfig?.checkIntervalSec || 30,
      },
      historical: {
        period,
        bucketSeconds,
        pointsCount: aggregatedHistoricalPoints.length,
        data: aggregatedHistoricalPoints,
      },
      filters: {
        availableTags: allAvailableTags,
        availableGroups: distinctGroupsRaw.map((g) => g.group).filter((g): g is string => Boolean(g)),
        availableLocations: allLocations,
        activeFilters: {
          tag: tag || null,
          group: group || null,
          locationId: locationId || null,
          status: status || null,
          period,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '12.0.0',
      },
    };
  }

  /**
   * Existing V1-V11 dashboard summary method (strictly preserved for backward-compatibility)
   */
  async getDashboardSummary(tagFilter?: string) {
    const machineWhere: any = {};
    if (tagFilter) {
      machineWhere.tags = {
        some: {
          tag: {
            name: { equals: tagFilter, mode: 'insensitive' },
          },
        },
      };
    }

    const [
      totalMachines,
      totalIPs,
      totalServices,
      totalPorts,
      totalChanges,
      totalNetworks,
      totalVlans,
      totalLocations,
      totalTags,
      onlineMachines,
      warningMachines,
      offlineMachines,
      uncheckedMachines,
      assignedIps,
      freeIps,
      conflictIps,
      criticalIncidents,
      warningIncidents,
      recentMachines,
      recentChanges,
      lastScan,
      allTags,
    ] = await Promise.all([
      this.prisma.machine.count({ where: machineWhere }),
      this.prisma.iPAddress.count(),
      this.prisma.service.count(),
      this.prisma.port.count(),
      this.prisma.changeLog.count(),
      this.prisma.network.count(),
      this.prisma.vLAN.count(),
      this.prisma.location.count(),
      this.prisma.tag.count(),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.ONLINE } }),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.WARNING } }),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.OFFLINE } }),
      this.prisma.machine.count({ where: { ...machineWhere, status: MachineStatus.UNCHECKED } }),
      this.prisma.iPAddress.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.iPAddress.count({ where: { status: 'FREE' } }),
      this.prisma.iPAddress.count({ where: { status: 'CONFLICT' } }),
      this.prisma.metricAnomaly.count({ where: { isResolved: false, severity: 'CRITICAL' } }),
      this.prisma.metricAnomaly.count({ where: { isResolved: false, severity: 'WARNING' } }),
      this.prisma.machine.findMany({
        where: machineWhere,
        take: 6,
        orderBy: { updatedAt: 'desc' },
        include: {
          location: true,
          vlan: true,
          tags: { include: { tag: true } },
          ports: {
            include: { service: true },
          },
          metricAnomalies: { where: { isResolved: false } },
        },
      }),
      this.prisma.changeLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.discoveryScan.findFirst({
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.tag.findMany({
        include: { _count: { select: { machines: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      metrics: {
        totalMachines,
        totalIPs,
        totalServices,
        totalPorts,
        totalChanges,
        totalNetworks,
        totalVlans,
        totalLocations,
        totalTags,
      },
      ipamSummary: {
        totalNetworks,
        totalVlans,
        assignedIps,
        freeIps,
        conflictIps,
      },
      locationsSummary: {
        totalLocations,
        totalMachines,
      },
      incidentsSummary: {
        critical: criticalIncidents,
        warning: warningIncidents,
        total: criticalIncidents + warningIncidents,
      },
      statusDistribution: {
        online: onlineMachines,
        warning: warningMachines,
        offline: offlineMachines,
        unchecked: uncheckedMachines,
      },
      availableTags: allTags,
      activeTagFilter: tagFilter || null,
      lastScan,
      recentMachines,
      recentChanges,
    };
  }
}
