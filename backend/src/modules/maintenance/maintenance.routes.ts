import { FastifyPluginAsync } from 'fastify';
import { MaintenanceService } from './maintenance.service.js';
import { createMaintenanceSchema, updateMaintenanceSchema, createMaintenanceWindowSchema, toggleChecklistItemSchema } from './maintenance.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const maintenanceRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new MaintenanceService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  // Maintenances CRUD
  fastify.get('/maintenance', {
    preHandler: [requirePermission('MAINTENANCE_READ')],
    handler: async (request) => {
      const query = request.query as any;
      const data = await service.listMaintenances(query);
      return { success: true, data };
    },
  });

  fastify.get('/maintenance/:id', {
    preHandler: [requirePermission('MAINTENANCE_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const data = await service.getMaintenanceById(id);
        return { success: true, data };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/maintenance', {
    preHandler: [requirePermission('MAINTENANCE_MANAGE')],
    handler: async (request, reply) => {
      const input = createMaintenanceSchema.parse(request.body);
      const actorId = request.user?.id;
      const actorName = request.user?.name || request.user?.username || 'admin';
      try {
        const created = await service.createMaintenance(input, actorId, actorName);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.put('/maintenance/:id', {
    preHandler: [requirePermission('MAINTENANCE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateMaintenanceSchema.parse(request.body);
      const actorName = request.user?.name || request.user?.username || 'admin';
      try {
        const updated = await service.updateMaintenance(id, input, actorName);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.delete('/maintenance/:id', {
    preHandler: [requirePermission('MAINTENANCE_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actorName = request.user?.name || request.user?.username || 'admin';
      try {
        const res = await service.deleteMaintenance(id, actorName);
        return { success: true, data: res };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // Checklist items toggle
  fastify.post('/maintenance/checklist/:itemId/toggle', {
    preHandler: [requirePermission('MAINTENANCE_MANAGE')],
    handler: async (request, reply) => {
      const { itemId } = request.params as { itemId: string };
      const input = toggleChecklistItemSchema.parse(request.body);
      const actorName = request.user?.name || request.user?.username || 'admin';
      try {
        const res = await service.toggleChecklistItem(itemId, input.isCompleted, actorName);
        return { success: true, data: res };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // Windows
  fastify.get('/maintenance-windows', {
    preHandler: [requirePermission('MAINTENANCE_READ')],
    handler: async () => {
      const data = await service.listWindows();
      return { success: true, data };
    },
  });

  fastify.post('/maintenance-windows', {
    preHandler: [requirePermission('MAINTENANCE_MANAGE')],
    handler: async (request, reply) => {
      const input = createMaintenanceWindowSchema.parse(request.body);
      const actorId = request.user?.id;
      const actorName = request.user?.name || request.user?.username || 'admin';
      try {
        const created = await service.createWindow(input, actorId, actorName);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
