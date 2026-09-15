import { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service.js';
import {
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} from './auth.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { logChange } from '../../utils/changelog.js';
import { ChangeAction } from '@prisma/client';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma);

  // POST /api/auth/login
  fastify.post('/auth/login', {
    schema: {
      tags: ['Authentication'],
      summary: 'Iniciar sesión con usuario y contraseña',
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = loginSchema.parse(request.body);
      try {
        const result = await authService.login(input);

        // Generate JWT token
        const token = fastify.jwt.sign(
          {
            id: result.user.id,
            username: result.user.username,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            mustChangePassword: result.user.mustChangePassword,
          },
          { expiresIn: '7d' }
        );

        // Set secure HttpOnly cookie
        reply.setCookie('token', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        reply.setCookie('auth_token', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
        });

        return reply.status(200).send({
          success: true,
          token,
          user: result.user,
          permissions: result.permissions,
          message: 'Inicio de sesión correcto',
        });
      } catch (err: any) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: err.message || 'Error al iniciar sesión',
        });
      }
    },
  });

  // POST /api/auth/logout
  fastify.post('/auth/logout', {
    schema: {
      tags: ['Authentication'],
      summary: 'Cerrar la sesión actual',
    },
    handler: async (request, reply) => {
      const user = (request as any).user;
      if (user) {
        await logChange({
          prisma: fastify.prisma,
          entityType: 'User',
          entityId: user.id,
          action: ChangeAction.UPDATE,
          details: `Cierre de sesión para el usuario ${user.username}`,
          user: user.username,
        });
      }

      reply.clearCookie('token', { path: '/' });
      reply.clearCookie('auth_token', { path: '/' });

      return {
        success: true,
        message: 'Sesión cerrada correctamente',
      };
    },
  });

  // GET /api/auth/me
  fastify.get('/auth/me', {
    preHandler: [authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Obtener datos y permisos del usuario autenticado actual',
    },
    handler: async (request) => {
      const user = await authService.getProfile(request.user.id);
      return { success: true, data: user };
    },
  });

  // GET /api/profile
  fastify.get('/profile', {
    preHandler: [authenticate],
    schema: {
      tags: ['Profile'],
      summary: 'Obtener información del perfil del usuario activo',
    },
    handler: async (request) => {
      const profile = await authService.getProfile(request.user.id);
      return { success: true, data: profile };
    },
  });

  // PUT /api/profile
  fastify.put('/profile', {
    preHandler: [authenticate],
    schema: {
      tags: ['Profile'],
      summary: 'Actualizar información personal del usuario activo',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
    handler: async (request) => {
      const input = updateProfileSchema.parse(request.body);
      const updated = await authService.updateProfile(request.user.id, input);
      return { success: true, data: updated, message: 'Perfil actualizado correctamente' };
    },
  });

  // POST /api/profile/password
  fastify.post('/profile/password', {
    preHandler: [authenticate],
    schema: {
      tags: ['Profile'],
      summary: 'Cambiar la contraseña del usuario activo',
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string' },
        },
      },
    },
    handler: async (request) => {
      const input = changePasswordSchema.parse(request.body);
      const result = await authService.changePassword(request.user.id, input);
      return {
        success: true,
        data: result.user,
        permissions: result.permissions,
        message: 'Contraseña actualizada correctamente',
      };
    },
  });
};
