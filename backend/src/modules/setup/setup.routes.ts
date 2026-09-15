import { FastifyPluginAsync } from 'fastify';
import { SetupService } from './setup.service.js';
import { initializeSetupSchema } from './setup.schema.js';

export const setupRoutes: FastifyPluginAsync = async (fastify) => {
  const setupService = new SetupService(fastify.prisma);

  // GET /api/setup/status
  fastify.get('/setup/status', {
    schema: {
      tags: ['Setup'],
      summary: 'Verificar el estado de instalación inicial de InfraInventory',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            isConfigured: { type: 'boolean' },
            status: { type: 'string' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const statusResult = await setupService.getSetupStatus();
      return reply.status(200).send({
        success: true,
        isConfigured: statusResult.isConfigured,
        status: statusResult.status,
      });
    },
  });

  // POST /api/setup/initialize
  fastify.post('/setup/initialize', {
    schema: {
      tags: ['Setup'],
      summary: 'Completar la instalación inicial y crear el primer usuario administrador',
      body: {
        type: 'object',
        required: ['name', 'username', 'email', 'password'],
        properties: {
          name: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
          organizationName: { type: 'string' },
          description: { type: 'string' },
          timezone: { type: 'string' },
          language: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const input = initializeSetupSchema.parse(request.body);
        const result = await setupService.initialize(input);

        // Generate JWT token for immediate authenticated session
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

        // Set secure HttpOnly cookies
        reply.setCookie('token', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
        });

        reply.setCookie('auth_token', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
        });

        return reply.status(201).send({
          success: true,
          token,
          user: result.user,
          permissions: result.permissions,
          message: 'Instalación de InfraInventory completada correctamente',
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: 'SetupFailed',
          message: err.message || 'Error al completar la instalación inicial',
        });
      }
    },
  });
};
