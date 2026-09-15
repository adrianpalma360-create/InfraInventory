import { FastifyPluginAsync } from 'fastify';
import { OperationsService } from './operations.service.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const operationsRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new OperationsService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  // GET /api/operations/stats
  fastify.get('/operations/stats', {
    preHandler: [requirePermission('OPERATIONS_READ')],
    handler: async () => {
      const stats = await service.getOperationsStats();
      return { success: true, data: stats };
    },
  });

  // GET /api/operations/calendar
  fastify.get('/operations/calendar', {
    preHandler: [requirePermission('OPERATIONS_READ')],
    handler: async (request) => {
      const { start, end } = request.query as { start?: string; end?: string };
      const now = new Date();
      const startStr = start || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endStr = end || new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
      const events = await service.getCalendarEvents(startStr, endStr);
      return { success: true, data: events };
    },
  });
};
