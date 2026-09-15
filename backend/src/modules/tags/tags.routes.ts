import { FastifyPluginAsync } from 'fastify';
import { TagsService } from './tags.service.js';
import { createTagSchema, updateTagSchema, assignTagSchema } from './tags.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const tagsRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new TagsService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/tags
  fastify.get('/tags', {
    preHandler: [requirePermission('TAG_READ')],
    handler: async () => {
      const data = await service.list();
      return { success: true, data };
    },
  });

  // GET /api/tags/:id
  fastify.get('/tags/:id', {
    preHandler: [requirePermission('TAG_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = await service.getById(id);
      if (!data) return reply.status(404).send({ success: false, message: 'Tag not found' });
      return { success: true, data };
    },
  });

  // POST /api/tags
  fastify.post('/tags', {
    preHandler: [requirePermission('TAG_CREATE')],
    handler: async (request, reply) => {
      try {
        const body = createTagSchema.parse(request.body);
        const data = await service.create(body, request.user.username);
        return reply.status(201).send({ success: true, data });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  // PUT /api/tags/:id
  fastify.put('/tags/:id', {
    preHandler: [requirePermission('TAG_UPDATE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateTagSchema.parse(request.body);
        const data = await service.update(id, body, request.user.username);
        return { success: true, data };
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  // DELETE /api/tags/:id
  fastify.delete('/tags/:id', {
    preHandler: [requirePermission('TAG_DELETE')],
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

  // POST /api/tags/assign/:machineId
  fastify.post('/tags/assign/:machineId', {
    preHandler: [requirePermission('TAG_UPDATE')],
    handler: async (request, reply) => {
      try {
        const { machineId } = request.params as { machineId: string };
        const { tagIds } = assignTagSchema.parse(request.body);
        const data = await service.assignTagsToMachine(machineId, tagIds, request.user.username);
        return { success: true, data };
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });
};
