import fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import { z } from 'zod';
import { discoveryEngine } from './scanner/engine.js';

const startScanSchema = z.object({
  scanId: z.string().uuid(),
  cidr: z.string().min(1),
  scanType: z.enum(['BASIC', 'FULL']).default('BASIC'),
  concurrency: z.number().int().min(1).max(64).optional(),
  timeoutMs: z.number().int().min(100).max(3000).optional(),
});

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  await app.register(helmet);
  await app.register(sensible);
  await app.register(cors, { origin: true });

  // Healthcheck
  app.get('/health', async () => ({
    status: 'healthy',
    service: 'palma-inventory-discovery',
    timestamp: new Date().toISOString(),
  }));

  // Start new scan
  app.post('/scan', async (request, reply) => {
    const parseResult = startScanSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.format(),
      });
    }

    try {
      const scan = await discoveryEngine.startScan(parseResult.data);
      return reply.status(202).send({ success: true, data: scan });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  // Get scan details & results
  app.get('/scan/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const scan = discoveryEngine.getScan(id);
    if (!scan) {
      return reply.status(404).send({ success: false, error: 'Scan not found' });
    }
    return reply.send({ success: true, data: scan });
  });

  // Get scan progress
  app.get('/scan/:id/progress', async (request, reply) => {
    const { id } = request.params as { id: string };
    const scan = discoveryEngine.getScan(id);
    if (!scan) {
      return reply.status(404).send({ success: false, error: 'Scan not found' });
    }
    return reply.send({
      success: true,
      data: {
        scanId: scan.scanId,
        status: scan.status,
        progress: scan.progress,
        scannedHosts: scan.scannedHosts,
        totalHosts: scan.totalHosts,
        activeHosts: scan.activeHosts,
        durationMs: scan.durationMs,
      },
    });
  });

  // Cancel scan
  app.post('/scan/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const cancelled = discoveryEngine.cancelScan(id);
    if (!cancelled) {
      return reply.status(400).send({ success: false, message: 'Scan cannot be cancelled or was not found' });
    }
    return reply.send({ success: true, message: 'Scan cancelled successfully' });
  });

  return app;
}
