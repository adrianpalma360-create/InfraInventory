import fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import corsPlugin from './plugins/cors.js';
import prismaPlugin from './plugins/prisma.js';
import swaggerPlugin from './plugins/swagger.js';

import { getEnv } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { machineRoutes } from './modules/machines/machines.routes.js';
import { networkRoutes } from './modules/networks/networks.routes.js';
import { portRoutes } from './modules/ports/ports.routes.js';
import { serviceRoutes } from './modules/services/services.routes.js';
import { changeRoutes } from './modules/changes/changes.routes.js';
import { discoveryRoutes } from './modules/discovery/discovery.routes.js';
import { metricsRoutes } from './modules/metrics/metrics.routes.js';
import { tagsRoutes } from './modules/tags/tags.routes.js';
import { locationRoutes } from './modules/locations/locations.routes.js';
import { topologyRoutes } from './modules/topology/topology.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { assetRoutes } from './modules/assets/asset.routes.js';
import { supplierRoutes } from './modules/suppliers/supplier.routes.js';
import { purchaseRoutes } from './modules/purchases/purchase.routes.js';
import { licenseRoutes } from './modules/licenses/license.routes.js';
import { warrantyRoutes } from './modules/warranties/warranty.routes.js';
import { softwareRoutes } from './modules/software/software.routes.js';
import { ticketRoutes } from './modules/tickets/ticket.routes.js';
import { slaRoutes } from './modules/slas/sla.routes.js';
import { maintenanceRoutes } from './modules/maintenance/maintenance.routes.js';
import { taskRoutes } from './modules/tasks/task.routes.js';
import { infraChangeRoutes } from './modules/changes/infra-change.routes.js';
import { runbookRoutes } from './modules/runbooks/runbook.routes.js';
import { operationsRoutes } from './modules/operations/operations.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { automationRoutes } from './modules/automation/automation.routes.js';
import { setupRoutes } from './modules/setup/setup.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const env = getEnv();

  const app = fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
              },
            }
          : undefined,
    },
    disableRequestLogging: false,
  });

  // Core Security & Utility Plugins
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
  await app.register(sensible);
  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: 'onRequest',
  });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });
  await app.register(websocket);
  await app.register(corsPlugin);
  await app.register(prismaPlugin);
  await app.register(swaggerPlugin);

  // Healthcheck endpoints
  app.get('/health', async (request, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', database: 'connected', timestamp: new Date().toISOString() };
    } catch (e) {
      return reply.status(503).send({ status: 'unhealthy', database: 'disconnected', error: (e as Error).message });
    }
  });
  app.get('/healthz', async () => ({ status: 'healthy', timestamp: new Date().toISOString() }));
  app.get('/livez', async () => ({ status: 'live', timestamp: new Date().toISOString() }));
  app.get('/readyz', async (request, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'connected', timestamp: new Date().toISOString() };
    } catch (e) {
      return reply.status(503).send({ status: 'unready', database: 'disconnected' });
    }
  });

  // App Public Info / About Endpoint
  app.get('/api/about', async () => {
    const { APP_CONFIG } = await import('./config/appConfig.js');
    return {
      success: true,
      data: {
        name: APP_CONFIG.APP_NAME,
        version: APP_CONFIG.APP_VERSION,
        versionInfo: APP_CONFIG.APP_VERSION_INFO,
        author: APP_CONFIG.APP_AUTHOR,
        copyright: APP_CONFIG.APP_COPYRIGHT,
        copyrightLegal: APP_CONFIG.APP_COPYRIGHT_LEGAL,
        description: APP_CONFIG.APP_DESCRIPTION,
      },
    };
  });

  // Metrics & WebSocket routes
  await app.register(metricsRoutes);

  // API Routes
  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(userRoutes);
      await api.register(settingsRoutes);
      await api.register(dashboardRoutes);
      await api.register(machineRoutes);
      await api.register(networkRoutes);
      await api.register(portRoutes);
      await api.register(serviceRoutes);
      await api.register(locationRoutes);
      await api.register(tagsRoutes);
      await api.register(topologyRoutes);
      await api.register(searchRoutes);
      await api.register(changeRoutes);
      await api.register(discoveryRoutes);
      await api.register(assetRoutes);
      await api.register(supplierRoutes);
      await api.register(purchaseRoutes);
      await api.register(licenseRoutes);
      await api.register(warrantyRoutes);
      await api.register(softwareRoutes);
      await api.register(ticketRoutes);
      await api.register(slaRoutes);
      await api.register(maintenanceRoutes);
      await api.register(taskRoutes);
      await api.register(infraChangeRoutes);
      await api.register(runbookRoutes);
      await api.register(operationsRoutes);
      await api.register(aiRoutes);
      await api.register(automationRoutes);
      await api.register(setupRoutes);
    },
    { prefix: '/api' }
  );

  return app;
}
