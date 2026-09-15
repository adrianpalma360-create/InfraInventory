import { FastifyPluginAsync } from 'fastify';
import { AutomationService } from './automation.service.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  executeWorkflowSchema,
  createApprovalRequestSchema,
  decideApprovalSchema,
  createPolicySchema,
  updatePolicySchema,
  registerAgentSchema,
  agentHeartbeatSchema,
  createAIProposalSchema,
  decideAIProposalSchema,
} from './automation.schema.js';

export const automationRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AutomationService(fastify.prisma);

  // 1. STATS & DASHBOARD
  fastify.get('/automation/stats', {
    preHandler: [authenticate, requirePermission('AUTOMATION_READ')],
    handler: async (request, reply) => {
      try {
        const stats = await service.getAutomationStats();
        return { success: true, data: stats };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  // 2. ACTIONS CATALOGUE
  fastify.get('/automation/actions', {
    preHandler: [authenticate, requirePermission('AUTOMATION_READ')],
    handler: async (request, reply) => {
      try {
        const catalogue = await service.getActionsCatalogue();
        return { success: true, data: catalogue };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  // 3. WORKFLOWS CRUD
  fastify.get('/automation/workflows', {
    preHandler: [authenticate, requirePermission('AUTOMATION_READ')],
    handler: async (request, reply) => {
      try {
        const { category, enabled, isTemplate } = request.query as any;
        const workflows = await service.listWorkflows({
          category: category as string,
          enabled: enabled !== undefined ? enabled === 'true' || enabled === true : undefined,
          isTemplate: isTemplate !== undefined ? isTemplate === 'true' || isTemplate === true : undefined,
        });
        return { success: true, data: workflows };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  fastify.get('/automation/workflows/:id', {
    preHandler: [authenticate, requirePermission('AUTOMATION_READ')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const workflow = await service.getWorkflowById(id);
        if (!workflow) return reply.status(404).send({ success: false, message: 'Workflow no encontrado' });
        return { success: true, data: workflow };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/automation/workflows', {
    preHandler: [authenticate, requirePermission('AUTOMATION_MANAGE')],
    handler: async (request, reply) => {
      try {
        const data = createWorkflowSchema.parse(request.body);
        const workflow = await service.createWorkflow(data, request.user?.id);
        return reply.status(201).send({ success: true, data: workflow });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.put('/automation/workflows/:id', {
    preHandler: [authenticate, requirePermission('AUTOMATION_MANAGE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateWorkflowSchema.parse(request.body);
        const workflow = await service.updateWorkflow(id, data, request.user?.id);
        return { success: true, data: workflow };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.delete('/automation/workflows/:id', {
    preHandler: [authenticate, requirePermission('AUTOMATION_MANAGE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        await service.deleteWorkflow(id);
        return reply.status(204).send();
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  // Execute or Dry-Run workflow
  fastify.post('/automation/workflows/:id/execute', {
    preHandler: [authenticate, requirePermission('AUTOMATION_EXECUTE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const options = executeWorkflowSchema.parse(request.body);
        const result = await service.executeWorkflow(id, options, request.user?.id, request.user?.role);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // 4. WORKFLOW RUNS & LOGS
  fastify.get('/automation/runs', {
    preHandler: [authenticate, requirePermission('AUTOMATION_READ')],
    handler: async (request, reply) => {
      try {
        const { workflowId, limit } = request.query as any;
        const runs = await service.listRuns(workflowId as string, limit ? Number(limit) : 50);
        return { success: true, data: runs };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  fastify.get('/automation/runs/:id', {
    preHandler: [authenticate, requirePermission('AUTOMATION_READ')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const run = await service.getRunById(id);
        if (!run) return reply.status(404).send({ success: false, message: 'Ejecución no encontrada' });
        return { success: true, data: run };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  // 5. APPROVALS (FOUR-EYES PRINCIPLE)
  fastify.get('/automation/approvals', {
    preHandler: [authenticate, requirePermission('AUTOMATION_READ')],
    handler: async (request, reply) => {
      try {
        const { status } = request.query as any;
        const approvals = await service.listApprovals(status);
        return { success: true, data: approvals };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/automation/approvals', {
    preHandler: [authenticate, requirePermission('AUTOMATION_EXECUTE')],
    handler: async (request, reply) => {
      try {
        const data = createApprovalRequestSchema.parse(request.body);
        const approval = await service.createApprovalRequest(data, request.user!.id);
        return reply.status(201).send({ success: true, data: approval });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/automation/approvals/:id/decide', {
    preHandler: [authenticate, requirePermission('AUTOMATION_APPROVE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { decision, rejectionReason } = decideApprovalSchema.parse(request.body);
        const updated = await service.decideApproval(id, decision, request.user!.id, rejectionReason);
        return { success: true, data: updated };
      } catch (err: any) {
        if (err.message && err.message.includes('Principio de Cuatro Ojos')) {
          return reply.status(403).send({ success: false, message: err.message });
        }
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // 6. POLICIES
  fastify.get('/automation/policies', {
    preHandler: [authenticate, requirePermission('AUTOMATION_READ')],
    handler: async (request, reply) => {
      try {
        const policies = await service.listPolicies();
        return { success: true, data: policies };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/automation/policies', {
    preHandler: [authenticate, requirePermission('AUTOMATION_MANAGE')],
    handler: async (request, reply) => {
      try {
        const data = createPolicySchema.parse(request.body);
        const policy = await service.createPolicy(data);
        return reply.status(201).send({ success: true, data: policy });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.put('/automation/policies/:id', {
    preHandler: [authenticate, requirePermission('AUTOMATION_MANAGE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updatePolicySchema.parse(request.body);
        const policy = await service.updatePolicy(id, data);
        return { success: true, data: policy };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // 7. AI ACTION PROPOSALS
  fastify.get('/automation/ai-proposals', {
    preHandler: [authenticate, requirePermission('AUTOMATION_READ')],
    handler: async (request, reply) => {
      try {
        const { status } = request.query as any;
        const proposals = await service.listAIProposals(status);
        return { success: true, data: proposals };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/automation/ai-proposals', {
    preHandler: [authenticate, requirePermission('AUTOMATION_EXECUTE')],
    handler: async (request, reply) => {
      try {
        const data = createAIProposalSchema.parse(request.body);
        const proposal = await service.createAIProposal(data);
        return reply.status(201).send({ success: true, data: proposal });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/automation/ai-proposals/:id/decide', {
    preHandler: [authenticate, requirePermission('AUTOMATION_EXECUTE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { action } = decideAIProposalSchema.parse(request.body);
        const updated = await service.decideAIProposal(id, action, request.user?.id);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // 8. AGENTS MANAGEMENT
  fastify.get('/agents', {
    preHandler: [authenticate, requirePermission('AGENT_READ')],
    handler: async (request, reply) => {
      try {
        const agents = await service.listAgents();
        return { success: true, data: agents };
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/agents/register', {
    preHandler: [authenticate, requirePermission('AGENT_MANAGE')],
    handler: async (request, reply) => {
      try {
        const data = registerAgentSchema.parse(request.body);
        const registered = await service.registerAgent(data);
        return reply.status(201).send({ success: true, data: registered });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // Public Agent Heartbeat Endpoint
  fastify.post('/agents/heartbeat', {
    handler: async (request, reply) => {
      try {
        const data = agentHeartbeatSchema.parse(request.body);
        const result = await service.processAgentHeartbeat(data);
        return { success: true, data: result };
      } catch (err: any) {
        if (err.message && (err.message.includes('Token') || err.message.includes('revocado'))) {
          return reply.status(401).send({ success: false, message: err.message });
        }
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  fastify.post('/agents/:id/revoke', {
    preHandler: [authenticate, requirePermission('AGENT_MANAGE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const revoked = await service.revokeAgent(id);
        return { success: true, data: revoked };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
