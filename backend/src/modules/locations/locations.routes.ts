import { FastifyPluginAsync } from 'fastify';
import { LocationsService } from './locations.service.js';
import { createLocationSchema, updateLocationSchema } from './locations.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const locationRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new LocationsService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/locations
  fastify.get('/locations', {
    preHandler: [requirePermission('LOCATION_READ')],
    handler: async () => {
      const data = await service.list();
      return { success: true, data };
    },
  });

  // GET /api/locations/tree
  fastify.get('/locations/tree', {
    preHandler: [requirePermission('LOCATION_READ')],
    handler: async () => {
      const data = await service.getTree();
      return { success: true, data };
    },
  });

  // GET /api/locations/:id
  fastify.get('/locations/:id', {
    preHandler: [requirePermission('LOCATION_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = await service.getById(id);
      if (!data) return reply.status(404).send({ success: false, message: 'Location not found' });
      return { success: true, data };
    },
  });

  // POST /api/locations
  fastify.post('/locations', {
    preHandler: [requirePermission('LOCATION_CREATE')],
    handler: async (request, reply) => {
      try {
        const body = createLocationSchema.parse(request.body);
        const data = await service.create(body, request.user.username);
        return reply.status(201).send({ success: true, data });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  // PUT /api/locations/:id
  fastify.put('/locations/:id', {
    preHandler: [requirePermission('LOCATION_UPDATE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateLocationSchema.parse(request.body);
        const data = await service.update(id, body, request.user.username);
        return { success: true, data };
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  // DELETE /api/locations/:id
  fastify.delete('/locations/:id', {
    preHandler: [requirePermission('LOCATION_DELETE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await service.delete(id, request.user.username);
        return data;
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });
};
