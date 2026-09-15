import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Palma Inventory API',
        description: 'REST API for Palma Inventory & NOC Platform',
        version: '1.0.0',
      },
      servers: [
        {
          url: '/api',
          description: 'API Base URL',
        },
      ],
      tags: [
        { name: 'Dashboard', description: 'NOC & Infrastructure Statistics' },
        { name: 'Machines', description: 'Host and Device Management' },
        { name: 'Networks', description: 'CIDRs, VLANs, Interfaces and IPs' },
        { name: 'Ports', description: 'Port and Service Mapping' },
        { name: 'Services', description: 'Service Catalog Management' },
        { name: 'Locations', description: 'Physical Datacenters and Racks' },
        { name: 'Changes', description: 'Audit Logs & Evolution Tracking' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });
};

export default fp(swaggerPlugin);
