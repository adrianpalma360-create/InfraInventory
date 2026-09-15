import { FastifyPluginAsync } from 'fastify';
import { PurchaseService } from './purchase.service.js';
import { createPurchaseSchema, updatePurchaseSchema } from './purchase.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const purchaseRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new PurchaseService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/purchases
  fastify.get('/purchases', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async () => {
      const list = await service.listPurchases();
      return { success: true, data: list };
    },
  });

  // GET /api/purchases/:id
  fastify.get('/purchases/:id', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const purchase = await service.getPurchaseById(id);
        return { success: true, data: purchase };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/purchases
  fastify.post('/purchases', {
    preHandler: [requirePermission('PURCHASE_MANAGE')],
    handler: async (request, reply) => {
      const input = createPurchaseSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const created = await service.createPurchase(input, actor);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/purchases/:id
  fastify.put('/purchases/:id', {
    preHandler: [requirePermission('PURCHASE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updatePurchaseSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updatePurchase(id, input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/purchases/:id
  fastify.delete('/purchases/:id', {
    preHandler: [requirePermission('PURCHASE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.deletePurchase(id, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
