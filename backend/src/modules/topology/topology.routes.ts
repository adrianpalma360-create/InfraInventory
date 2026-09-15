import { FastifyPluginAsync } from 'fastify';
import { TopologyService } from './topology.service.js';
import {
  createTopologySchema,
  updateTopologySchema,
  createTopologyNodeSchema,
  updateTopologyNodeSchema,
  createTopologyEdgeSchema,
  updateTopologyEdgeSchema,
  batchSavePositionsSchema,
  importTopologySchema,
} from './topology.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const topologyRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new TopologyService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/topologies
  fastify.get('/topologies', {
    preHandler: [requirePermission('TOPOLOGY_READ')],
    handler: async (request) => {
      const { groupId, locationId, tagId } = request.query as any;
      const list = await service.listTopologies({ groupId, locationId, tagId });
      return { success: true, data: list };
    },
  });

  // POST /api/topologies
  fastify.post('/topologies', {
    preHandler: [requirePermission('TOPOLOGY_CREATE')],
    handler: async (request, reply) => {
      const input = createTopologySchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      const result = await service.createTopology(input, actor);
      return reply.status(201).send({ success: true, data: result });
    },
  });

  // GET /api/topologies/:id
  fastify.get('/topologies/:id', {
    preHandler: [requirePermission('TOPOLOGY_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const result = await service.getTopologyById(id);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/topologies/:id
  fastify.put('/topologies/:id', {
    preHandler: [requirePermission('TOPOLOGY_UPDATE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateTopologySchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.updateTopology(id, input, actor);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/topologies/:id
  fastify.delete('/topologies/:id', {
    preHandler: [requirePermission('TOPOLOGY_DELETE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.deleteTopology(id, actor);
        return result;
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // GET /api/topologies/:id/status
  fastify.get('/topologies/:id/status', {
    preHandler: [requirePermission('TOPOLOGY_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const status = await service.getTopologyStatusSummary(id);
        return { success: true, data: status };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // GET /api/topologies/:id/nodes
  fastify.get('/topologies/:id/nodes', {
    preHandler: [requirePermission('TOPOLOGY_READ')],
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const nodes = await service.getNodes(id);
      return { success: true, data: nodes };
    },
  });

  // POST /api/topologies/:id/nodes
  fastify.post('/topologies/:id/nodes', {
    preHandler: [requirePermission('TOPOLOGY_CREATE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = createTopologyNodeSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const node = await service.addNode(id, input, actor);
        return reply.status(201).send({ success: true, data: node });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/topology-nodes/:id
  fastify.put('/topology-nodes/:id', {
    preHandler: [requirePermission('TOPOLOGY_UPDATE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateTopologyNodeSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateNode(id, input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/topology-nodes/:id
  fastify.delete('/topology-nodes/:id', {
    preHandler: [requirePermission('TOPOLOGY_DELETE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.deleteNode(id, actor);
        return result;
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/topologies/:id/positions
  fastify.post('/topologies/:id/positions', {
    preHandler: [requirePermission('TOPOLOGY_UPDATE')],
    handler: async (request, reply) => {
      const { positions } = batchSavePositionsSchema.parse(request.body);
      try {
        const result = await service.batchUpdatePositions(positions);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // GET /api/topologies/:id/edges
  fastify.get('/topologies/:id/edges', {
    preHandler: [requirePermission('TOPOLOGY_READ')],
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const edges = await service.getEdges(id);
      return { success: true, data: edges };
    },
  });

  // POST /api/topologies/:id/edges
  fastify.post('/topologies/:id/edges', {
    preHandler: [requirePermission('TOPOLOGY_CREATE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = createTopologyEdgeSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const edge = await service.addEdge(id, input, actor);
        return reply.status(201).send({ success: true, data: edge });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/topology-edges/:id
  fastify.put('/topology-edges/:id', {
    preHandler: [requirePermission('TOPOLOGY_UPDATE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateTopologyEdgeSchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const updated = await service.updateEdge(id, input, actor);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/topology-edges/:id
  fastify.delete('/topology-edges/:id', {
    preHandler: [requirePermission('TOPOLOGY_DELETE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.deleteEdge(id, actor);
        return result;
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // GET /api/topologies/:id/export
  fastify.get('/topologies/:id/export', {
    preHandler: [requirePermission('TOPOLOGY_EXPORT')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const exported = await service.exportTopologyJson(id);
        return { success: true, data: exported };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/topologies/import
  fastify.post('/topologies/import', {
    preHandler: [requirePermission('TOPOLOGY_IMPORT')],
    handler: async (request, reply) => {
      const input = importTopologySchema.parse(request.body);
      const actor = request.user?.username || 'admin';
      try {
        const result = await service.importTopologyJson(input, actor);
        return reply.status(201).send({ success: true, data: result });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });
};
