import { FastifyPluginAsync } from 'fastify';
import fs from 'fs';
import { BackupService } from './backup.service.js';
import { CreateBackupSchema, BackupConfigSchema, ProtectBackupSchema, RestoreBackupSchema } from './backup.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const backupRoutes: FastifyPluginAsync = async (fastify) => {
  const backupService = new BackupService(fastify.prisma);

  // List backups
  fastify.get('/backups', { preHandler: [authenticate] }, async () => {
    const data = await backupService.listBackups();
    return { success: true, data };
  });

  // Get backup config
  fastify.get('/backups/config', { preHandler: [authenticate] }, async () => {
    const data = await backupService.getBackupConfig();
    return { success: true, data };
  });

  // Update backup config (ADMIN)
  fastify.put('/backups/config', { preHandler: [authenticate, requirePermission('SETTINGS_UPDATE')] }, async (request) => {
    const body = BackupConfigSchema.partial().parse(request.body);
    const user = (request as any).user;
    const data = await backupService.updateBackupConfig(body, user?.username || 'admin');
    return { success: true, data };
  });

  // Trigger scheduled check from monitoring worker or internal cron
  fastify.get('/backups/worker-check', async () => {
    await backupService.runScheduledBackupCheck();
    return { success: true, message: 'Scheduled backup check evaluated' };
  });

  // Create manual backup (ADMIN)
  fastify.post('/backups', { preHandler: [authenticate, requirePermission('SETTINGS_UPDATE')] }, async (request, reply) => {
    const body = CreateBackupSchema.parse(request.body || {});
    const user = (request as any).user;
    const backup = await backupService.createBackup({
      name: body.name,
      requestedBy: user?.username || 'admin',
      isProtected: body.isProtected,
    });
    return reply.status(201).send({ success: true, data: backup });
  });

  // Get single backup
  fastify.get('/backups/:id', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const data = await backupService.getBackup(id);
    return { success: true, data };
  });

  // Download backup (ADMIN)
  fastify.get('/backups/:id/download', { preHandler: [authenticate, requirePermission('SETTINGS_UPDATE')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { filePath, filename, sizeBytes } = await backupService.getDownloadStream(id);

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Length', sizeBytes);

    const stream = fs.createReadStream(filePath);
    return reply.send(stream);
  });

  // Toggle protect (ADMIN)
  fastify.post('/backups/:id/protect', { preHandler: [authenticate, requirePermission('SETTINGS_UPDATE')] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = ProtectBackupSchema.parse(request.body);
    const user = (request as any).user;
    const data = await backupService.toggleProtectBackup(id, body.isProtected, user?.username || 'admin');
    return { success: true, data };
  });

  // Restore backup (ADMIN)
  fastify.post('/backups/:id/restore', { preHandler: [authenticate, requirePermission('SETTINGS_UPDATE')] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = RestoreBackupSchema.parse(request.body || {});
    const user = (request as any).user;
    const data = await backupService.restoreBackup(id, user?.username || 'admin', {
      skipPreRestoreBackup: body.skipPreRestoreBackup,
    });
    return { success: true, data };
  });

  // Delete backup (ADMIN)
  fastify.delete('/backups/:id', { preHandler: [authenticate, requirePermission('SETTINGS_UPDATE')] }, async (request) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    await backupService.deleteBackup(id, user?.username || 'admin');
    return { success: true, message: 'Backup eliminado correctamente' };
  });
};
