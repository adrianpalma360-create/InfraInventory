import { FastifyPluginAsync } from 'fastify';
import { MachinesService } from './machines.service.js';
import { createMachineSchema, updateMachineSchema, machineQuerySchema } from './machines.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const machineRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new MachinesService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  fastify.get('/machines', {
    preHandler: [requirePermission('MACHINE_READ')],
    handler: async (request, reply) => {
      const query = machineQuerySchema.parse(request.query);
      const result = await service.list(query);
      return reply.send({ success: true, data: result });
    },
  });

  fastify.get('/machines/:id', {
    preHandler: [requirePermission('MACHINE_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const machine = await service.getById(id);
      if (!machine) {
        return reply.status(404).send({ success: false, message: 'Machine not found' });
      }
      return reply.send({ success: true, data: machine });
    },
  });

  fastify.post('/machines', {
    preHandler: [requirePermission('MACHINE_CREATE')],
    handler: async (request, reply) => {
      try {
        const body = createMachineSchema.parse(request.body);
        const created = await service.create(body);
        return reply.status(201).send({ success: true, data: created });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message || 'Invalid machine data' });
      }
    },
  });

  fastify.put('/machines/:id', {
    preHandler: [requirePermission('MACHINE_UPDATE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateMachineSchema.parse(request.body);
        const updated = await service.update(id, body);
        return reply.send({ success: true, data: updated });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message || 'Failed to update machine' });
      }
    },
  });

  fastify.delete('/machines/:id', {
    preHandler: [requirePermission('MACHINE_DELETE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await service.delete(id);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message || 'Failed to delete machine' });
      }
    },
  });

  fastify.get('/machines/:id/interfaces', {
    preHandler: [requirePermission('MACHINE_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const interfaces = await service.getInterfaces(id);
      return reply.send({ success: true, data: interfaces });
    },
  });

  fastify.get('/machines/:id/ports', {
    preHandler: [requirePermission('MACHINE_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const ports = await service.getPorts(id);
      return reply.send({ success: true, data: ports });
    },
  });

  fastify.get('/machines/:id/changes', {
    preHandler: [requirePermission('CHANGE_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const changes = await service.getChanges(id);
      return reply.send({ success: true, data: changes });
    },
  });
};
