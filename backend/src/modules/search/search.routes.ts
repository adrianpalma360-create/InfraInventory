import { FastifyPluginAsync } from 'fastify';
import { GlobalSearchService } from './search.service.js';
import { authenticate } from '../../middleware/auth.js';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GlobalSearchService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/search?q=...
  fastify.get('/search', {
    schema: {
      tags: ['Search'],
      summary: 'Búsqueda global multidominio (IP, Host, MAC, VLAN, Red, Ubicación, Tag, Servicio, Puerto, Incidente)',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { q } = request.query as { q?: string };
      const results = await service.search(q || '');
      return reply.send({ success: true, data: results });
    },
  });
};
