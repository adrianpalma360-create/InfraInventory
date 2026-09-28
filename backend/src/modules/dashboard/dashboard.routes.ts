import { FastifyPluginAsync } from 'fastify';
import { DashboardService, NocFilterParams } from './dashboard.service.js';
import { authenticate } from '../../middleware/auth.js';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new DashboardService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // 1. V12 NOC Dashboard Aggregated Overview API
  fastify.get('/api/dashboard/overview', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Obtener información consolidada del panel NOC de IMP',
      querystring: {
        type: 'object',
        properties: {
          tag: { type: 'string' },
          group: { type: 'string' },
          locationId: { type: 'string' },
          status: { type: 'string' },
          period: { type: 'string', enum: ['1h', '6h', '24h', '7d', '30d'] },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const query = request.query as NocFilterParams;
        const overview = await service.getNocOverview(query);
        return reply.send({ success: true, data: overview });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ success: false, message: 'Failed to load NOC dashboard overview' });
      }
    },
  });

  // Also support alias /dashboard/overview for flexibility
  fastify.get('/dashboard/overview', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Alias para obtener información consolidada del panel NOC de IMP',
    },
    handler: async (request, reply) => {
      try {
        const query = request.query as NocFilterParams;
        const overview = await service.getNocOverview(query);
        return reply.send({ success: true, data: overview });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ success: false, message: 'Failed to load NOC dashboard overview' });
      }
    },
  });

  // 2. Existing Legacy Dashboard Summary (Backward-Compatible)
  fastify.get('/dashboard', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Obtener métricas y resumen general del panel de control legacy',
    },
    handler: async (request, reply) => {
      try {
        const { tag } = request.query as { tag?: string };
        const summary = await service.getDashboardSummary(tag);
        return reply.send({ success: true, data: summary });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ success: false, message: 'Failed to load dashboard metrics' });
      }
    },
  });
};
