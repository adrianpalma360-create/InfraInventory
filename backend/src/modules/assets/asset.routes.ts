import { FastifyPluginAsync } from 'fastify';
import { AssetService } from './asset.service.js';
import {
  createAssetSchema,
  updateAssetSchema,
  listAssetsQuerySchema,
  createHardwareComponentSchema,
  updateHardwareComponentSchema,
} from './asset.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const assetRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AssetService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/assets
  fastify.get('/assets', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async (request) => {
      const query = listAssetsQuerySchema.parse(request.query);
      const result = await service.listAssets(query);
      return { success: true, data: result };
    },
  });

  // GET /api/assets/stats
  fastify.get('/assets/stats', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async () => {
      const stats = await service.getAssetStats();
      return { success: true, data: stats };
    },
  });

  // GET /api/assets/racks/:locationId
  fastify.get('/assets/racks/:locationId', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async (request, reply) => {
      const { locationId } = request.params as { locationId: string };
      try {
        const rackView = await service.getRackView(locationId);
        return { success: true, data: rackView };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // GET /api/assets/export
  fastify.get('/assets/export', {
    preHandler: [requirePermission('ASSET_EXPORT')],
    handler: async (request, reply) => {
      const csv = await service.exportAssetsCsv();
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="infrainventory_assets_v8.csv"');
      return reply.send(csv);
    },
  });

  // POST /api/assets/import
  fastify.post('/assets/import', {
    preHandler: [requirePermission('ASSET_IMPORT')],
    handler: async (request) => {
      const { csvContent } = request.body as { csvContent: string };
      const actor = request.user?.username || 'admin';
      const result = await service.importAssetsCsv(csvContent, actor);
      return { success: true, data: result };
    },
  });

  // POST /api/assets
  fastify.post('/assets', {
    preHandler: [requirePermission('ASSET_CREATE')],
    handler: async (request, reply) => {
      const input = createAssetSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const created = await service.createAsset(input, actor);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // GET /api/assets/:id
  fastify.get('/assets/:id', {
    preHandler: [requirePermission('ASSET_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const asset = await service.getAssetById(id);
        return { success: true, data: asset };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/assets/:id
  fastify.put('/assets/:id', {
    preHandler: [requirePermission('ASSET_UPDATE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateAssetSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateAsset(id, input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/assets/:id (Non-destructive on Machine)
  fastify.delete('/assets/:id', {
    preHandler: [requirePermission('ASSET_DELETE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.deleteAsset(id, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/assets/:id/hardware
  fastify.post('/assets/:id/hardware', {
    preHandler: [requirePermission('ASSET_UPDATE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = createHardwareComponentSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const comp = await service.addHardwareComponent(id, input, actor);
        return reply.status(201).send({ success: true, data: comp });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/assets/hardware/:hardwareId
  fastify.put('/assets/hardware/:hardwareId', {
    preHandler: [requirePermission('ASSET_UPDATE')],
    handler: async (request, reply) => {
      const { hardwareId } = request.params as { hardwareId: string };
      const input = updateHardwareComponentSchema.parse(request.body);
      try {
        const updated = await service.updateHardwareComponent(hardwareId, input);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/assets/hardware/:hardwareId
  fastify.delete('/assets/hardware/:hardwareId', {
    preHandler: [requirePermission('ASSET_UPDATE')],
    handler: async (request, reply) => {
      const { hardwareId } = request.params as { hardwareId: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.deleteHardwareComponent(hardwareId, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
