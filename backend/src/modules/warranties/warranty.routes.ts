import { FastifyPluginAsync } from 'fastify';
import { WarrantyService } from './warranty.service.js';
import { createWarrantySchema, updateWarrantySchema } from './warranty.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const warrantyRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new WarrantyService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/warranties
  fastify.get('/warranties', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async (request) => {
      const { assetId } = request.query as { assetId?: string };
      const list = await service.listWarranties(assetId);
      return { success: true, data: list };
    },
  });

  // GET /api/warranties/:id
  fastify.get('/warranties/:id', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const warranty = await service.getWarrantyById(id);
        return { success: true, data: warranty };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/warranties
  fastify.post('/warranties', {
    preHandler: [requirePermission('WARRANTY_MANAGE')],
    handler: async (request, reply) => {
      const input = createWarrantySchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const created = await service.createWarranty(input, actor);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/warranties/:id
  fastify.put('/warranties/:id', {
    preHandler: [requirePermission('WARRANTY_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateWarrantySchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateWarranty(id, input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/warranties/:id
  fastify.delete('/warranties/:id', {
    preHandler: [requirePermission('WARRANTY_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.deleteWarranty(id, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
