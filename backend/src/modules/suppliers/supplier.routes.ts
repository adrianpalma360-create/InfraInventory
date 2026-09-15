import { FastifyPluginAsync } from 'fastify';
import { SupplierService } from './supplier.service.js';
import { createSupplierSchema, updateSupplierSchema } from './supplier.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const supplierRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new SupplierService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/suppliers
  fastify.get('/suppliers', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async () => {
      const list = await service.listSuppliers();
      return { success: true, data: list };
    },
  });

  // GET /api/suppliers/:id
  fastify.get('/suppliers/:id', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const supplier = await service.getSupplierById(id);
        return { success: true, data: supplier };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/suppliers
  fastify.post('/suppliers', {
    preHandler: [requirePermission('SUPPLIER_MANAGE')],
    handler: async (request, reply) => {
      const input = createSupplierSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const created = await service.createSupplier(input, actor);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/suppliers/:id
  fastify.put('/suppliers/:id', {
    preHandler: [requirePermission('SUPPLIER_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateSupplierSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateSupplier(id, input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/suppliers/:id
  fastify.delete('/suppliers/:id', {
    preHandler: [requirePermission('SUPPLIER_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.deleteSupplier(id, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
