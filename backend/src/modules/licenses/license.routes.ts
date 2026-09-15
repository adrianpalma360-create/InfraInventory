import { FastifyPluginAsync } from 'fastify';
import { LicenseService } from './license.service.js';
import { createLicenseSchema, updateLicenseSchema, assignLicenseSchema } from './license.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const licenseRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new LicenseService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/licenses
  fastify.get('/licenses', {
    preHandler: [requirePermission('LICENSE_READ')],
    handler: async () => {
      const list = await service.listLicenses();
      return { success: true, data: list };
    },
  });

  // GET /api/licenses/:id
  fastify.get('/licenses/:id', {
    preHandler: [requirePermission('LICENSE_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const license = await service.getLicenseById(id);
        return { success: true, data: license };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/licenses
  fastify.post('/licenses', {
    preHandler: [requirePermission('LICENSE_MANAGE')],
    handler: async (request, reply) => {
      const input = createLicenseSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const created = await service.createLicense(input, actor);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/licenses/:id
  fastify.put('/licenses/:id', {
    preHandler: [requirePermission('LICENSE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateLicenseSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateLicense(id, input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/licenses/:id
  fastify.delete('/licenses/:id', {
    preHandler: [requirePermission('LICENSE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.deleteLicense(id, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/licenses/:id/reveal (Privileged decrypted key reveal)
  fastify.post('/licenses/:id/reveal', {
    preHandler: [requirePermission('LICENSE_REVEAL')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.revealLicenseKey(id, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/licenses/:id/assign
  fastify.post('/licenses/:id/assign', {
    preHandler: [requirePermission('LICENSE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = assignLicenseSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const assignment = await service.assignLicense(id, input, actor);
        return reply.status(201).send({ success: true, data: assignment });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/licenses/assignments/:assignmentId
  fastify.delete('/licenses/assignments/:assignmentId', {
    preHandler: [requirePermission('LICENSE_MANAGE')],
    handler: async (request, reply) => {
      const { assignmentId } = request.params as { assignmentId: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.removeAssignment(assignmentId, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
