import { FastifyPluginAsync } from 'fastify';
import { DashboardService } from './dashboard.service.js';
import { authenticate } from '../../middleware/auth.js';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new DashboardService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  fastify.get('/dashboard', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Obtener métricas y resumen general del panel de control',
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
