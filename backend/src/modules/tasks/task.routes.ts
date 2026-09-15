import { FastifyPluginAsync } from 'fastify';
import { TaskService } from './task.service.js';
import { createTaskSchema, updateTaskSchema } from './task.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new TaskService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  fastify.get('/tasks', {
    preHandler: [requirePermission('TASK_READ')],
    handler: async (request) => {
      const query = request.query as any;
      const data = await service.listTasks(query);
      return { success: true, data };
    },
  });

  fastify.post('/tasks', {
    preHandler: [requirePermission('TASK_MANAGE')],
    handler: async (request, reply) => {
      const input = createTaskSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const created = await service.createTask(input, actor);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.put('/tasks/:id', {
    preHandler: [requirePermission('TASK_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateTaskSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateTask(id, input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.delete('/tasks/:id', {
    preHandler: [requirePermission('TASK_MANAGE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const res = await service.deleteTask(id, actor);
        return { success: true, data: res };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
