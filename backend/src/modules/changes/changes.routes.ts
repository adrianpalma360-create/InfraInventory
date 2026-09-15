import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middleware/auth.js';

const changesQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
});

export const changeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/changes', {
    preHandler: [requirePermission('CHANGE_READ')],
    handler: async (request, reply) => {
      const query = changesQuerySchema.parse(request.query);
      const skip = (query.page - 1) * query.limit;

      const where: any = {};
      if (query.entityType) where.entityType = query.entityType;
      if (query.entityId) where.entityId = query.entityId;

      const [items, total] = await Promise.all([
        fastify.prisma.changeLog.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            machine: {
              select: { id: true, hostname: true, primaryIp: true },
            },
          },
        }),
        fastify.prisma.changeLog.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: {
          items,
          pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit) || 1,
          },
        },
      });
    },
  });
};
