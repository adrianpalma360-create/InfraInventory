import { FastifyPluginAsync } from 'fastify';
import { ServicesService } from './services.service.js';
import { createServiceSchema, updateServiceSchema } from './services.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const serviceRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ServicesService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  fastify.get('/services', {
    preHandler: [requirePermission('SERVICE_READ')],
    handler: async (request, reply) => {
      const data = await service.list();
      return reply.send({ success: true, data });
    },
  });

  fastify.post('/services', {
    preHandler: [requirePermission('SERVICE_CREATE')],
    handler: async (request, reply) => {
      try {
        const body = createServiceSchema.parse(request.body);
        const data = await service.create(body);
        return reply.status(201).send({ success: true, data });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  fastify.put('/services/:id', {
    preHandler: [requirePermission('SERVICE_UPDATE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateServiceSchema.parse(request.body);
        const data = await service.update(id, body);
        return reply.send({ success: true, data });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  fastify.delete('/services/:id', {
    preHandler: [requirePermission('SERVICE_DELETE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await service.delete(id);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });
};
