import { FastifyPluginAsync } from 'fastify';
import { UsersService } from './users.service.js';
import {
  createUserSchema,
  updateUserSchema,
  updateUserPasswordSchema,
  userQuerySchema,
} from './users.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  const usersService = new UsersService(fastify.prisma);

  // All user management routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /api/users - List users
  fastify.get('/users', {
    preHandler: [requirePermission('USER_READ')],
    schema: {
      tags: ['Users'],
      summary: 'Listar usuarios con filtros y paginación (Solo Admin)',
    },
    handler: async (request) => {
      const query = userQuerySchema.parse(request.query);
      const result = await usersService.listUsers(query);
      return { success: true, data: result };
    },
  });

  // GET /api/users/:id - Get user by ID
  fastify.get('/users/:id', {
    preHandler: [requirePermission('USER_READ')],
    schema: {
      tags: ['Users'],
      summary: 'Obtener detalle de un usuario por ID',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const user = await usersService.getUser(id);
      return { success: true, data: user };
    },
  });

  // POST /api/users - Create user
  fastify.post('/users', {
    preHandler: [requirePermission('USER_CREATE')],
    schema: {
      tags: ['Users'],
      summary: 'Crear un nuevo usuario con rol y contraseña (Solo Admin)',
      body: {
        type: 'object',
        required: ['username', 'name', 'password'],
        properties: {
          username: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'TECHNICIAN', 'VIEWER'] },
          isActive: { type: 'boolean' },
          mustChangePassword: { type: 'boolean' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = createUserSchema.parse(request.body);
      const user = await usersService.createUser(input, request.user.username);
      return reply.status(201).send({
        success: true,
        data: user,
        message: `Usuario ${user.username} creado correctamente`,
      });
    },
  });

  // PUT /api/users/:id - Update user
  fastify.put('/users/:id', {
    preHandler: [requirePermission('USER_UPDATE')],
    schema: {
      tags: ['Users'],
      summary: 'Actualizar datos, rol o estado de un usuario (Solo Admin)',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'TECHNICIAN', 'VIEWER'] },
          isActive: { type: 'boolean' },
          mustChangePassword: { type: 'boolean' },
        },
      },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const input = updateUserSchema.parse(request.body);
      const updated = await usersService.updateUser(
        id,
        input,
        request.user.username,
        request.user.id
      );
      return { success: true, data: updated, message: 'Usuario actualizado correctamente' };
    },
  });

  // PATCH /api/users/:id/password - Reset password
  fastify.patch('/users/:id/password', {
    preHandler: [requirePermission('USER_UPDATE')],
    schema: {
      tags: ['Users'],
      summary: 'Restablecer administrativamente la contraseña de un usuario',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string' },
          mustChangePassword: { type: 'boolean' },
        },
      },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const input = updateUserPasswordSchema.parse(request.body);
      const updated = await usersService.setPassword(id, input, request.user.username);
      return { success: true, data: updated, message: 'Contraseña restablecida correctamente' };
    },
  });

  // DELETE /api/users/:id - Delete user
  fastify.delete('/users/:id', {
    preHandler: [requirePermission('USER_DELETE')],
    schema: {
      tags: ['Users'],
      summary: 'Eliminar un usuario del sistema (Solo Admin)',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const result = await usersService.deleteUser(id, request.user.username, request.user.id);
      return result;
    },
  });
};
