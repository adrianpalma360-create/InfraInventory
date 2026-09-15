import { FastifyPluginAsync } from 'fastify';
import { SoftwareService } from './software.service.js';
import { createSoftwareSchema, updateSoftwareSchema, installSoftwareSchema } from './software.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const softwareRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new SoftwareService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/software
  fastify.get('/software', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async () => {
      const list = await service.listSoftware();
      return { success: true, data: list };
    },
  });

  // GET /api/software/:id
  fastify.get('/software/:id', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const software = await service.getSoftwareById(id);
        return { success: true, data: software };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/software
  fastify.post('/software', {
    preHandler: [requirePermission('SOFTWARE_MANAGE')],
    handler: async (request, reply) => {
      const input = createSoftwareSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const created = await service.createSoftware(input, actor);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/software/:id
  fastify.put('/software/:id', {
    preHandler: [requirePermission('SOFTWARE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateSoftwareSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateSoftware(id, input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/software/:id
  fastify.delete('/software/:id', {
    preHandler: [requirePermission('SOFTWARE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.deleteSoftware(id, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/software/:id/install
  fastify.post('/software/:id/install', {
    preHandler: [requirePermission('SOFTWARE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = installSoftwareSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const installation = await service.installSoftware(id, input, actor);
        return reply.status(201).send({ success: true, data: installation });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/software/installations/:installationId
  fastify.delete('/software/installations/:installationId', {
    preHandler: [requirePermission('SOFTWARE_MANAGE')],
    handler: async (request, reply) => {
      const { installationId } = request.params as { installationId: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.uninstallSoftware(installationId, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
