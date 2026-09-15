import { FastifyPluginAsync } from 'fastify';
import { MetricsService } from './metrics.service.js';
import { metricsWsHub } from './metrics.ws.js';
import {
  IngestBatchSchema,
  HistoricalQuerySchema,
  MonitoringConfigUpdateSchema,
} from './metrics.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  const metricsService = new MetricsService(fastify.prisma);

  // 1. WebSocket Endpoints for Real-time metrics streaming
  fastify.get('/ws/metrics', { websocket: true }, (connection, req) => {
    metricsWsHub.handleConnection(connection, req);
  });
  fastify.get('/api/ws/metrics', { websocket: true }, (connection, req) => {
    metricsWsHub.handleConnection(connection, req);
  });

  // 2. Ingestion Endpoint (used by monitoring-worker)
  fastify.post('/api/metrics/ingest', async (request, reply) => {
    try {
      const { samples } = IngestBatchSchema.parse(request.body);
      const result = await metricsService.ingestSamples(samples);
      return reply.status(200).send({ success: true, ...result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message || 'Invalid metric payload' });
    }
  });

  // 3. Realtime summary cards
  fastify.get(
    '/api/metrics/realtime',
    {
      preHandler: [authenticate, requirePermission('METRICS_READ')],
    },
    async (request, reply) => {
      const { machineId, groupId } = request.query as {
        machineId?: string;
        groupId?: string;
      };
      const summary = await metricsService.getRealtimeSummary(machineId, groupId);
      return reply.send({ success: true, data: summary });
    }
  );

  // 4. Historical metrics
  fastify.get(
    '/api/metrics/history',
    {
      preHandler: [authenticate, requirePermission('METRICS_READ')],
    },
    async (request, reply) => {
      try {
        const query = HistoricalQuerySchema.parse(request.query);
        const history = await metricsService.getHistorical(query);
        return reply.send({ success: true, data: history });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message || 'Invalid history query' });
      }
    }
  );

  // 5. Service checks table
  fastify.get(
    '/api/metrics/services',
    {
      preHandler: [authenticate, requirePermission('METRICS_READ')],
    },
    async (request, reply) => {
      const { machineId } = request.query as { machineId?: string };
      const services = await metricsService.getServices(machineId);
      return reply.send({ success: true, data: services });
    }
  );

  // 6. Anomalies & Alerts
  fastify.get(
    '/api/metrics/anomalies',
    {
      preHandler: [authenticate, requirePermission('METRICS_READ')],
    },
    async (request, reply) => {
      const { machineId, isResolved } = request.query as {
        machineId?: string;
        isResolved?: string;
      };
      const anomalies = await metricsService.getAnomalies(
        machineId,
        isResolved === 'true'
      );
      return reply.send({ success: true, data: anomalies });
    }
  );

  fastify.get(
    '/api/alerts',
    {
      preHandler: [authenticate, requirePermission('METRICS_READ')],
    },
    async (request, reply) => {
      const { machineId, isResolved } = request.query as {
        machineId?: string;
        isResolved?: string;
      };
      const anomalies = await metricsService.getAnomalies(
        machineId,
        isResolved === 'true'
      );
      return reply.send({ success: true, data: anomalies });
    }
  );

  fastify.post(
    '/api/metrics/anomalies/:id/resolve',
    {
      preHandler: [authenticate, requirePermission('METRICS_READ')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const resolved = await metricsService.resolveAnomaly(id);
      return reply.send({ success: true, data: resolved });
    }
  );

  fastify.post(
    '/api/alerts/:id/resolve',
    {
      preHandler: [authenticate, requirePermission('METRICS_READ')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const resolved = await metricsService.resolveAnomaly(id);
      return reply.send({ success: true, data: resolved });
    }
  );

  // 7. Groups list & stats
  fastify.get(
    '/api/groups',
    {
      preHandler: [authenticate, requirePermission('METRICS_READ')],
    },
    async (request, reply) => {
      const groups = await metricsService.getGroups();
      return reply.send({ success: true, data: groups });
    }
  );

  // 8. Unified Monitoring Overview
  fastify.get(
    '/api/monitoring/overview',
    {
      preHandler: [authenticate, requirePermission('METRICS_READ')],
    },
    async (request, reply) => {
      const overview = await metricsService.getMonitoringOverview();
      return reply.send({ success: true, data: overview });
    }
  );

  // 9. Monitoring Config
  fastify.get(
    '/api/monitoring/config',
    {
      preHandler: [authenticate, requirePermission('METRICS_READ')],
    },
    async (request, reply) => {
      const config = await metricsService.getMonitoringConfig();
      return reply.send({ success: true, data: config });
    }
  );

  fastify.put(
    '/api/monitoring/config',
    {
      preHandler: [authenticate, requirePermission('MONITORING_UPDATE')],
    },
    async (request, reply) => {
      try {
        const data = MonitoringConfigUpdateSchema.parse(request.body);
        const updated = await metricsService.updateMonitoringConfig(data);
        return reply.send({ success: true, data: updated });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Invalid monitoring config payload',
        });
      }
    }
  );
};
