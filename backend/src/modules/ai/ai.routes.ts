import { FastifyPluginAsync } from 'fastify';
import { AIService } from './ai.service.js';
import {
  chatMessageSchema,
  directQuerySchema,
  analyzeRequestSchema,
  reportRequestSchema,
  aiConfigSchema,
  testConnectionSchema,
} from './ai.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AIService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  // 1. Interactive Chat
  fastify.post('/ai/chat', {
    preHandler: [requirePermission('AI_CHAT')],
    handler: async (request, reply) => {
      const input = chatMessageSchema.parse(request.body);
      const user = {
        id: request.user?.id || 'anonymous',
        role: request.user?.role || 'VIEWER',
        username: request.user?.username || 'user',
      };
      try {
        const result = await service.chat(input, user);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  // 2. Direct NL Query
  fastify.post('/ai/query', {
    preHandler: [requirePermission('AI_CHAT')],
    handler: async (request, reply) => {
      const input = directQuerySchema.parse(request.body);
      const user = {
        id: request.user?.id || 'anonymous',
        role: request.user?.role || 'VIEWER',
      };
      try {
        const result = await service.query(input, user);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  // 3. 360 Diagnostic Analysis
  fastify.post('/ai/analyze', {
    preHandler: [requirePermission('AI_ANALYZE')],
    handler: async (request, reply) => {
      const input = analyzeRequestSchema.parse(request.body);
      const user = {
        id: request.user?.id || 'anonymous',
        role: request.user?.role || 'VIEWER',
      };
      try {
        const result = await service.analyze(input, user);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  // 4. Report Generation
  fastify.post('/ai/report', {
    preHandler: [requirePermission('AI_ANALYZE')],
    handler: async (request, reply) => {
      const input = reportRequestSchema.parse(request.body);
      const user = {
        id: request.user?.id || 'anonymous',
        role: request.user?.role || 'VIEWER',
      };
      try {
        const result = await service.generateReport(input, user);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  // 5. Conversation History
  fastify.get('/ai/history', {
    preHandler: [requirePermission('AI_CHAT')],
    handler: async (request) => {
      const userId = request.user?.id || '';
      const data = await service.getHistory(userId);
      return { success: true, data };
    },
  });

  fastify.get('/ai/history/:id', {
    preHandler: [requirePermission('AI_CHAT')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user?.id || '';
      try {
        const data = await service.getConversation(id, userId);
        return { success: true, data };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  fastify.delete('/ai/history/:id', {
    preHandler: [requirePermission('AI_CHAT')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user?.id || '';
      try {
        const data = await service.deleteConversation(id, userId);
        return { success: true, data };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // 6. Tools Catalog & Status
  fastify.get('/ai/tools', {
    preHandler: [requirePermission('AI_CHAT')],
    handler: async (request) => {
      const role = request.user?.role || 'VIEWER';
      const tools = service.getToolsList(role);
      return { success: true, data: tools };
    },
  });

  fastify.get('/ai/status', {
    preHandler: [requirePermission('AI_CHAT')],
    handler: async () => {
      const config = await service.getConfig();
      return {
        success: true,
        data: {
          isEnabled: config.isEnabled,
          provider: config.provider,
          model: config.model,
          baseUrl: config.baseUrl,
        },
      };
    },
  });

  fastify.get('/ai/dashboard', {
    preHandler: [requirePermission('AI_CHAT')],
    handler: async () => {
      const data = await service.getDashboardStats();
      return { success: true, data };
    },
  });

  // 7. Admin AI Configuration
  fastify.get('/ai/config', {
    preHandler: [requirePermission('AI_CONFIG')],
    handler: async () => {
      const config = await service.getConfig();
      return {
        success: true,
        data: {
          ...config,
          apiKeyEncrypted: config.apiKeyEncrypted ? '••••••••••••••••' : null,
        },
      };
    },
  });

  fastify.post('/ai/config', {
    preHandler: [requirePermission('AI_CONFIG')],
    handler: async (request, reply) => {
      const input = aiConfigSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateConfig(input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/ai/test-connection', {
    preHandler: [requirePermission('AI_CONFIG')],
    handler: async (request) => {
      const input = testConnectionSchema.parse(request.body);
      const result = await service.testConnection(input);
      return { success: true, data: result };
    },
  });
};
