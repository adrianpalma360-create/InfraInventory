import { FastifyPluginAsync } from 'fastify';
import { InventoryExportService } from './inventory-export.service.js';
import { InventoryImportService } from './inventory-import.service.js';
import { ExportInventorySchema, ImportPreviewSchema, ImportExecuteSchema } from './inventory-io.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const inventoryIORoutes: FastifyPluginAsync = async (fastify) => {
  const exportService = new InventoryExportService(fastify.prisma);
  const importService = new InventoryImportService(fastify.prisma);

  // Export inventory
  fastify.post('/inventory/export', { preHandler: [authenticate] }, async (request, reply) => {
    const filter = ExportInventorySchema.parse(request.body || {});
    const user = (request as any).user;
    const { buffer, filename, mimeType, recordsCount } = await exportService.exportInventory(
      filter,
      user?.username || 'operator'
    );

    reply.header('Content-Type', mimeType);
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('X-Exported-Count', String(recordsCount));

    return reply.send(buffer);
  });

  // Export history
  fastify.get('/inventory/export/history', { preHandler: [authenticate] }, async () => {
    const data = await exportService.getExportHistory();
    return { success: true, data };
  });

  // Preview import file (ADMIN)
  fastify.post('/inventory/import/preview', { preHandler: [authenticate, requirePermission('SETTINGS_UPDATE')] }, async (request) => {
    const body = ImportPreviewSchema.parse(request.body);
    const data = await importService.previewImport({
      rawContent: body.rawContent,
      format: body.format,
      filename: body.filename,
    });
    return { success: true, data };
  });

  // Execute import (ADMIN)
  fastify.post('/inventory/import/execute', { preHandler: [authenticate, requirePermission('SETTINGS_UPDATE')] }, async (request) => {
    const body = ImportExecuteSchema.parse(request.body);
    const user = (request as any).user;
    const data = await importService.executeImport({
      rawContent: body.rawContent,
      format: body.format,
      mode: body.mode,
      filename: body.filename,
      conflictResolutions: body.conflictResolutions as any,
      requestedBy: user?.username || 'admin',
    });
    return { success: true, data };
  });

  // Import history
  fastify.get('/inventory/import/history', { preHandler: [authenticate] }, async () => {
    const data = await importService.getImportHistory();
    return { success: true, data };
  });
};
