import { FastifyPluginAsync } from 'fastify';
import { NotificationService } from './notification.service.js';
import { UpdateNotificationConfigSchema } from './notification.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new NotificationService(fastify.prisma);

  // 1. Get Telegram Notification Config (Masked)
  fastify.get('/notifications/telegram', { preHandler: [authenticate] }, async () => {
    const config = await service.getConfig();
    return { success: true, data: config };
  });

  // 2. Update Telegram Notification Config (ADMIN)
  fastify.put(
    '/notifications/telegram',
    { preHandler: [authenticate, requirePermission('SETTINGS_UPDATE')] },
    async (request) => {
      const input = UpdateNotificationConfigSchema.parse(request.body || {});
      const user = (request as any).user;
      const updated = await service.updateConfig(input, user?.username || 'admin');
      return { success: true, data: updated };
    }
  );

  // 3. Send Test Message (ADMIN)
  fastify.post(
    '/notifications/telegram/test',
    { preHandler: [authenticate, requirePermission('SETTINGS_UPDATE')] },
    async (request) => {
      const user = (request as any).user;
      const result = await service.sendTestMessage(user?.username || 'admin');
      return {
        success: result.success,
        message: result.message,
        durationMs: result.durationMs,
      };
    }
  );

  // 4. Get Notification Delivery History
  fastify.get('/notifications/history', { preHandler: [authenticate] }, async (request) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const history = await service.getHistory(limit);
    return { success: true, data: history };
  });
};
