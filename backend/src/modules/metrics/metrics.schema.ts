import { z } from 'zod';

export const MetricSampleSchema = z.object({
  machineId: z.string().uuid(),
  cpuUsage: z.number().min(0).max(100).nullable().optional(),
  ramUsage: z.number().min(0).max(100).nullable().optional(),
  diskUsage: z.number().min(0).max(100).nullable().optional(),
  networkRxKbps: z.number().min(0).nullable().optional(),
  networkTxKbps: z.number().min(0).nullable().optional(),
  networkErrors: z.number().int().min(0).nullable().optional(),
  latencyMs: z.number().min(0).nullable().optional(),
  responseTimeMs: z.number().min(0).nullable().optional(),
  errorRate: z.number().min(0).max(100).nullable().optional(),
  activeConnections: z.number().int().min(0).nullable().optional(),
  healthState: z.enum(['HEALTHY', 'WARNING', 'DEGRADED', 'CRITICAL', 'UNKNOWN']).optional(),
  timestamp: z.string().datetime().optional(),
  services: z.array(
    z.object({
      serviceName: z.string(),
      portNumber: z.number().int().min(1).max(65535),
      protocol: z.enum(['TCP', 'UDP']).default('TCP'),
      status: z.enum(['HEALTHY', 'WARNING', 'DEGRADED', 'CRITICAL', 'UNKNOWN']).default('HEALTHY'),
      latencyMs: z.number().nullable().optional(),
      responseTimeMs: z.number().nullable().optional(),
      errorRate: z.number().nullable().optional(),
      details: z.string().nullable().optional(),
    })
  ).optional(),
});

export const IngestBatchSchema = z.object({
  samples: z.array(MetricSampleSchema),
});

export const HistoricalQuerySchema = z.object({
  machineId: z.string().uuid().optional(),
  groupId: z.string().optional(),
  period: z.enum(['realtime', '5m', '15m', '1h', '6h', '24h', '7d', '30d']).default('1h'),
  metric: z.string().optional(),
});

export const MonitoringConfigUpdateSchema = z.object({
  checkIntervalSec: z.number().int().min(10).max(600).optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
  enableAnomalies: z.boolean().optional(),
  thresholdCpuWarn: z.number().min(1).max(100).optional(),
  thresholdCpuCrit: z.number().min(1).max(100).optional(),
  thresholdRamWarn: z.number().min(1).max(100).optional(),
  thresholdRamCrit: z.number().min(1).max(100).optional(),
  thresholdDiskWarn: z.number().min(1).max(100).optional(),
  thresholdDiskCrit: z.number().min(1).max(100).optional(),
  thresholdLatencyWarn: z.number().min(1).max(10000).optional(),
  thresholdLatencyCrit: z.number().min(1).max(10000).optional(),
});

export type IngestMetricInput = z.infer<typeof MetricSampleSchema>;
export type IngestBatchInput = z.infer<typeof IngestBatchSchema>;
export type HistoricalQueryParams = z.infer<typeof HistoricalQuerySchema>;
export type MonitoringConfigUpdateInput = z.infer<typeof MonitoringConfigUpdateSchema>;
