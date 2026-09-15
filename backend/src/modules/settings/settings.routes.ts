import { FastifyPluginAsync } from 'fastify';
import { SettingsService } from './settings.service.js';
import { updateSettingsSchema } from './settings.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  const settingsService = new SettingsService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/settings
  fastify.get('/settings', {
    preHandler: [requirePermission('SETTINGS_READ')],
    schema: {
      tags: ['Settings'],
      summary: 'Obtener configuración del sistema',
    },
    handler: async () => {
      const settings = await settingsService.getSettings();
      return { success: true, data: settings };
    },
  });

  // PUT /api/settings
  fastify.put('/settings', {
    preHandler: [requirePermission('SETTINGS_UPDATE')],
    schema: {
      tags: ['Settings'],
      summary: 'Actualizar configuración operativa del sistema (Solo Admin)',
      body: {
        type: 'object',
        properties: {
          organizationName: { type: 'string' },
          primarySubnet: { type: 'string' },
          discoveryTimeoutMs: { type: 'number' },
          discoveryConcurrency: { type: 'number' },
          sessionExpiryDays: { type: 'number' },
          enableAuditLogs: { type: 'boolean' },
          auditRetentionDays: { type: 'number' },
        },
      },
    },
    handler: async (request) => {
      const input = updateSettingsSchema.parse(request.body);
      const updated = await settingsService.updateSettings(input, request.user.username);
      return { success: true, data: updated, message: 'Configuración actualizada correctamente' };
    },
  });
};
