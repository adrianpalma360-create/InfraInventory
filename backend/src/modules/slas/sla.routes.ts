import { FastifyPluginAsync } from 'fastify';
import { SlaService } from './sla.service.js';
import { createSlaSchema, updateSlaSchema } from './sla.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const slaRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new SlaService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  fastify.get('/slas', {
    preHandler: [requirePermission('SLA_READ')],
    handler: async () => {
      const data = await service.listSlas();
      return { success: true, data };
    },
  });

  fastify.get('/slas/:id', {
    preHandler: [requirePermission('SLA_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const data = await service.getSlaById(id);
        return { success: true, data };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/slas', {
    preHandler: [requirePermission('SLA_MANAGE')],
    handler: async (request, reply) => {
      const input = createSlaSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const created = await service.createSla(input, actor);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.put('/slas/:id', {
    preHandler: [requirePermission('SLA_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateSlaSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateSla(id, input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.delete('/slas/:id', {
    preHandler: [requirePermission('SLA_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const res = await service.deleteSla(id, actor);
        return { success: true, data: res };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
