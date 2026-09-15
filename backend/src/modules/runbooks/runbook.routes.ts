import { FastifyPluginAsync } from 'fastify';
import { RunbookService } from './runbook.service.js';
import { createRunbookSchema, updateRunbookSchema } from './runbook.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const runbookRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new RunbookService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  fastify.get('/runbooks', {
    preHandler: [requirePermission('RUNBOOK_READ')],
    handler: async (request) => {
      const query = request.query as any;
      const data = await service.listRunbooks(query.category);
      return { success: true, data };
    },
  });

  fastify.get('/runbooks/:id', {
    preHandler: [requirePermission('RUNBOOK_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const data = await service.getRunbookById(id);
        return { success: true, data };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/runbooks', {
    preHandler: [requirePermission('RUNBOOK_MANAGE')],
    handler: async (request, reply) => {
      const input = createRunbookSchema.parse(request.body);
      const actorId = request.user?.id;
      const actor = request.user?.username || 'admin';
      try {
        const created = await service.createRunbook(input, actorId, actor);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.put('/runbooks/:id', {
    preHandler: [requirePermission('RUNBOOK_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateRunbookSchema.parse(request.body);
      const actorId = request.user?.id;
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateRunbook(id, input, actorId, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.delete('/runbooks/:id', {
    preHandler: [requirePermission('RUNBOOK_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const res = await service.deleteRunbook(id, actor);
        return { success: true, data: res };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
