import { FastifyPluginAsync } from 'fastify';
import { DiscoveryService } from './discovery.service.js';
import {
  createScanSchema,
  importDiscoveredHostSchema,
  discoveryChangeQuerySchema,
} from './discovery.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const discoveryRoutes: FastifyPluginAsync = async (fastify) => {
  const discoveryService = new DiscoveryService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // POST /api/discovery/scans - Trigger scan
  fastify.post('/discovery/scans', {
    preHandler: [requirePermission('DISCOVERY_RUN')],
    schema: {
      tags: ['Discovery'],
      summary: 'Iniciar un nuevo escaneo de descubrimiento en una red CIDR',
      body: {
        type: 'object',
        required: ['networkCidr'],
        properties: {
          networkCidr: { type: 'string' },
          scanType: { type: 'string', enum: ['BASIC', 'FULL'], default: 'BASIC' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = createScanSchema.parse(request.body);
      const scan = await discoveryService.startScan(input);
      return reply.status(202).send({ success: true, data: scan });
    },
  });

  // GET /api/discovery/scans - List all scans
  fastify.get('/discovery/scans', {
    preHandler: [requirePermission('DISCOVERY_READ')],
    schema: {
      tags: ['Discovery'],
      summary: 'Listar historial de escaneos de descubrimiento',
    },
    handler: async () => {
      const scans = await discoveryService.listScans();
      return { success: true, data: scans };
    },
  });

  // GET /api/discovery/scans/:id - Scan details
  fastify.get('/discovery/scans/:id', {
    preHandler: [requirePermission('DISCOVERY_READ')],
    schema: {
      tags: ['Discovery'],
      summary: 'Detalle de un escaneo con hosts y cambios detectados',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const scan = await discoveryService.getScan(id);
      return { success: true, data: scan };
    },
  });

  // GET /api/discovery/scans/:id/hosts - Scan discovered hosts
  fastify.get('/discovery/scans/:id/hosts', {
    preHandler: [requirePermission('DISCOVERY_READ')],
    schema: {
      tags: ['Discovery'],
      summary: 'Lista de hosts descubiertos durante un escaneo específico',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const hosts = await discoveryService.getScanHosts(id);
      return { success: true, data: hosts };
    },
  });

  // GET /api/discovery/scans/:id/progress - Real-time progress
  fastify.get('/discovery/scans/:id/progress', {
    preHandler: [requirePermission('DISCOVERY_READ')],
    schema: {
      tags: ['Discovery'],
      summary: 'Progreso en tiempo real de un escaneo en ejecución',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const progress = await discoveryService.getScanProgress(id);
      return { success: true, data: progress };
    },
  });

  // POST /api/discovery/scans/:id/cancel - Cancel scan
  fastify.post('/discovery/scans/:id/cancel', {
    preHandler: [requirePermission('DISCOVERY_RUN')],
    schema: {
      tags: ['Discovery'],
      summary: 'Cancelar un escaneo en curso',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const scan = await discoveryService.cancelScan(id);
      return { success: true, data: scan, message: 'Escaneo cancelado correctamente' };
    },
  });

  // GET /api/discovery/changes - List changes/diffs
  fastify.get('/discovery/changes', {
    preHandler: [requirePermission('DISCOVERY_READ')],
    schema: {
      tags: ['Discovery'],
      summary: 'Listado de cambios y discrepancias detectadas por Discovery',
    },
    handler: async (request) => {
      const query = discoveryChangeQuerySchema.parse(request.query);
      const changes = await discoveryService.listChanges(query);
      return { success: true, data: changes };
    },
  });

  // POST /api/discovery/changes/:id/approve - Approve change
  fastify.post('/discovery/changes/:id/approve', {
    preHandler: [requirePermission('DISCOVERY_RUN')],
    schema: {
      tags: ['Discovery'],
      summary: 'Aprobar un cambio detectado por el motor de descubrimiento',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const updated = await discoveryService.approveChange(id);
      return { success: true, data: updated, message: 'Cambio aprobado correctamente' };
    },
  });

  // POST /api/discovery/changes/:id/ignore - Ignore change
  fastify.post('/discovery/changes/:id/ignore', {
    preHandler: [requirePermission('DISCOVERY_RUN')],
    schema: {
      tags: ['Discovery'],
      summary: 'Ignorar un cambio detectado por el motor de descubrimiento',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const updated = await discoveryService.ignoreChange(id);
      return { success: true, data: updated, message: 'Cambio marcado como ignorado' };
    },
  });

  // POST /api/discovery/hosts/:id/import - Import discovered host into Machine inventory
  fastify.post('/discovery/hosts/:id/import', {
    preHandler: [requirePermission('DISCOVERY_IMPORT')],
    schema: {
      tags: ['Discovery'],
      summary: 'Incorporar un dispositivo descubierto al inventario oficial de máquinas',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['hostname', 'type'],
        properties: {
          hostname: { type: 'string' },
          type: { type: 'string' },
          os: { type: 'string' },
          manufacturer: { type: 'string' },
          model: { type: 'string' },
          locationId: { type: 'string', format: 'uuid' },
          vlanId: { type: 'string', format: 'uuid' },
          description: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = importDiscoveredHostSchema.parse(request.body);
      const machine = await discoveryService.importHost(id, input);
      return reply.status(201).send({
        success: true,
        data: machine,
        message: `Dispositivo ${machine.hostname} incorporado con éxito al inventario`,
      });
    },
  });
};
