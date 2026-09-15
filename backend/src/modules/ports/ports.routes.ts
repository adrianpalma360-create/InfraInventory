import { FastifyPluginAsync } from 'fastify';
import { PortsService } from './ports.service.js';
import { createPortSchema, updatePortSchema } from './ports.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const portRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new PortsService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  fastify.get('/ports', {
    preHandler: [requirePermission('PORT_READ')],
    handler: async (request, reply) => {
      const { machineId } = request.query as { machineId?: string };
      const data = await service.list(machineId);
      return reply.send({ success: true, data });
    },
  });

  fastify.post('/ports', {
    preHandler: [requirePermission('PORT_CREATE')],
    handler: async (request, reply) => {
      try {
        const body = createPortSchema.parse(request.body);
        const data = await service.create(body);
        return reply.status(201).send({ success: true, data });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  fastify.put('/ports/:id', {
    preHandler: [requirePermission('PORT_UPDATE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updatePortSchema.parse(request.body);
        const data = await service.update(id, body);
        return reply.send({ success: true, data });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  fastify.delete('/ports/:id', {
    preHandler: [requirePermission('PORT_DELETE')],
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
