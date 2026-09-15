import { FastifyPluginAsync } from 'fastify';
import { InfraChangeService } from './infra-change.service.js';
import { createInfraChangeSchema, updateInfraChangeSchema, changeApprovalDecisionSchema } from './infra-change.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const infraChangeRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new InfraChangeService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  // GET /api/infra-changes
  fastify.get('/infra-changes', {
    preHandler: [requirePermission('CHANGE_MANAGE')],
    handler: async (request) => {
      const query = request.query as any;
      const data = await service.listChanges(query);
      return { success: true, data };
    },
  });

  // GET /api/infra-changes/:id
  fastify.get('/infra-changes/:id', {
    preHandler: [requirePermission('CHANGE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const data = await service.getChangeById(id);
        return { success: true, data };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/infra-changes
  fastify.post('/infra-changes', {
    preHandler: [requirePermission('CHANGE_MANAGE')],
    handler: async (request, reply) => {
      const input = createInfraChangeSchema.parse(request.body);
      const requesterId = request.user?.id;
      const actorName = request.user?.name || request.user?.username || 'admin';
      try {
        const created = await service.createChange(input, requesterId, actorName);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/infra-changes/:id
  fastify.put('/infra-changes/:id', {
    preHandler: [requirePermission('CHANGE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateInfraChangeSchema.parse(request.body);
      const actorName = request.user?.name || request.user?.username || 'admin';
      try {
        const updated = await service.updateChange(id, input, actorName);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/infra-changes/:id/approve
  fastify.post('/infra-changes/:id/approve', {
    preHandler: [requirePermission('CHANGE_APPROVE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = changeApprovalDecisionSchema.parse({
        decision: 'APPROVED',
        comments: (request.body as any)?.comments || 'Approved by authorized user',
      });
      const userId = request.user?.id;
      const userName = request.user?.name || request.user?.username || 'Admin';
      try {
        const result = await service.decideApproval(id, input, userId, userName);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/infra-changes/:id/reject
  fastify.post('/infra-changes/:id/reject', {
    preHandler: [requirePermission('CHANGE_APPROVE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = changeApprovalDecisionSchema.parse({
        decision: 'REJECTED',
        comments: (request.body as any)?.comments || 'Rejected',
      });
      const userId = request.user?.id;
      const userName = request.user?.name || request.user?.username || 'Admin';
      try {
        const result = await service.decideApproval(id, input, userId, userName);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
