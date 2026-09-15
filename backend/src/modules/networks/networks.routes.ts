import { FastifyPluginAsync } from 'fastify';
import { NetworksService } from './networks.service.js';
import {
  createNetworkSchema,
  updateNetworkSchema,
  createVlanSchema,
  updateVlanSchema,
  createIPSchema,
  updateIPSchema,
  createInterfaceSchema,
  updateInterfaceSchema,
  subnetCalculatorSchema,
  ipamImportSchema,
} from './networks.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { calculateSubnet } from '../../utils/subnetCalculator.js';

export const networkRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new NetworksService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // ----------------------------------------------------
  // IPAM Specialized Endpoints
  // ----------------------------------------------------
  // GET /api/ipam/stats
  fastify.get('/ipam/stats', {
    preHandler: [requirePermission('IPAM_READ')],
    handler: async () => {
      const stats = await service.getIpamStats();
      return { success: true, data: stats };
    },
  });

  // GET /api/ipam/conflicts
  fastify.get('/ipam/conflicts', {
    preHandler: [requirePermission('IPAM_READ')],
    handler: async () => {
      const conflicts = await service.detectConflicts();
      return { success: true, data: conflicts };
    },
  });

  // POST /api/ipam/subnet-calculator
  fastify.post('/ipam/subnet-calculator', {
    preHandler: [requirePermission('IPAM_READ')],
    handler: async (request, reply) => {
      try {
        const { cidr } = subnetCalculatorSchema.parse(request.body);
        const result = calculateSubnet(cidr);
        return { success: true, data: result };
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/ipam/subnet-calculator?cidr=...
  fastify.get('/ipam/subnet-calculator', {
    preHandler: [requirePermission('IPAM_READ')],
    handler: async (request, reply) => {
      try {
        const { cidr } = request.query as { cidr?: string };
        if (!cidr) {
          return reply.status(400).send({ success: false, message: 'CIDR query parameter is required' });
        }
        const result = calculateSubnet(cidr);
        return { success: true, data: result };
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/ipam/export
  fastify.get('/ipam/export', {
    preHandler: [requirePermission('IPAM_EXPORT')],
    handler: async (request, reply) => {
      const csv = await service.exportCsv();
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="infrainventory-ipam-export.csv"');
      return reply.send(csv);
    },
  });

  // POST /api/ipam/import
  fastify.post('/ipam/import', {
    preHandler: [requirePermission('IPAM_IMPORT')],
    handler: async (request, reply) => {
      try {
        const { csvContent } = ipamImportSchema.parse(request.body);
        const result = await service.importCsv(csvContent, request.user.username);
        return { success: true, data: result };
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  // ----------------------------------------------------
  // Networks
  // ----------------------------------------------------
  fastify.get('/networks', {
    preHandler: [requirePermission('NETWORK_READ')],
    handler: async () => {
      const data = await service.listNetworks();
      return { success: true, data };
    },
  });

  fastify.get('/networks/:id', {
    preHandler: [requirePermission('NETWORK_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = await service.getNetworkById(id);
      if (!data) return reply.status(404).send({ success: false, message: 'Network not found' });
      return { success: true, data };
    },
  });

  fastify.post('/networks', {
    preHandler: [requirePermission('NETWORK_CREATE')],
    handler: async (request, reply) => {
      try {
        const body = createNetworkSchema.parse(request.body);
        const data = await service.createNetwork(body, request.user.username);
        return reply.status(201).send({ success: true, data });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  fastify.put('/networks/:id', {
    preHandler: [requirePermission('NETWORK_UPDATE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateNetworkSchema.parse(request.body);
        const data = await service.updateNetwork(id, body, request.user.username);
        return { success: true, data };
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  fastify.delete('/networks/:id', {
    preHandler: [requirePermission('NETWORK_DELETE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await service.deleteNetwork(id, request.user.username);
        return result;
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  // ----------------------------------------------------
  // VLANs
  // ----------------------------------------------------
  fastify.get('/vlans', {
    preHandler: [requirePermission('NETWORK_READ')],
    handler: async () => {
      const data = await service.listVlans();
      return { success: true, data };
    },
  });

  fastify.get('/vlans/:id', {
    preHandler: [requirePermission('NETWORK_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = await service.getVlanById(id);
      if (!data) return reply.status(404).send({ success: false, message: 'VLAN not found' });
      return { success: true, data };
    },
  });

  fastify.post('/vlans', {
    preHandler: [requirePermission('NETWORK_CREATE')],
    handler: async (request, reply) => {
      try {
        const body = createVlanSchema.parse(request.body);
        const data = await service.createVlan(body, request.user.username);
        return reply.status(201).send({ success: true, data });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  fastify.put('/vlans/:id', {
    preHandler: [requirePermission('NETWORK_UPDATE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateVlanSchema.parse(request.body);
        const data = await service.updateVlan(id, body, request.user.username);
        return { success: true, data };
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  fastify.delete('/vlans/:id', {
    preHandler: [requirePermission('NETWORK_DELETE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await service.deleteVlan(id, request.user.username);
        return result;
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  // ----------------------------------------------------
  // IP Addresses (Support both /ips and /ip-addresses)
  // ----------------------------------------------------
  const handleListIps = async (request: any) => {
    const { networkId, status } = request.query as { networkId?: string; status?: any };
    const data = await service.listIPs(networkId, status);
    return { success: true, data };
  };

  const handleGetIp = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const data = await service.getIPById(id);
    if (!data) return reply.status(404).send({ success: false, message: 'IP Address not found' });
    return { success: true, data };
  };

  const handleCreateIp = async (request: any, reply: any) => {
    try {
      const body = createIPSchema.parse(request.body);
      const data = await service.createIP(body, request.user.username);
      return reply.status(201).send({ success: true, data });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  };

  const handleUpdateIp = async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateIPSchema.parse(request.body);
      const data = await service.updateIP(id, body, request.user.username);
      return { success: true, data };
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  };

  const handleDeleteIp = async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };
      const result = await service.deleteIP(id, request.user.username);
      return result;
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  };

  fastify.get('/ips', { preHandler: [requirePermission('NETWORK_READ')], handler: handleListIps });
  fastify.get('/ip-addresses', { preHandler: [requirePermission('NETWORK_READ')], handler: handleListIps });

  fastify.get('/ips/:id', { preHandler: [requirePermission('NETWORK_READ')], handler: handleGetIp });
  fastify.get('/ip-addresses/:id', { preHandler: [requirePermission('NETWORK_READ')], handler: handleGetIp });

  fastify.post('/ips', { preHandler: [requirePermission('NETWORK_CREATE')], handler: handleCreateIp });
  fastify.post('/ip-addresses', { preHandler: [requirePermission('NETWORK_CREATE')], handler: handleCreateIp });

  fastify.put('/ips/:id', { preHandler: [requirePermission('NETWORK_UPDATE')], handler: handleUpdateIp });
  fastify.put('/ip-addresses/:id', { preHandler: [requirePermission('NETWORK_UPDATE')], handler: handleUpdateIp });

  fastify.delete('/ips/:id', { preHandler: [requirePermission('NETWORK_DELETE')], handler: handleDeleteIp });
  fastify.delete('/ip-addresses/:id', { preHandler: [requirePermission('NETWORK_DELETE')], handler: handleDeleteIp });

  // ----------------------------------------------------
  // Interfaces
  // ----------------------------------------------------
  fastify.post('/interfaces', {
    preHandler: [requirePermission('NETWORK_CREATE')],
    handler: async (request, reply) => {
      try {
        const body = createInterfaceSchema.parse(request.body);
        const data = await service.createInterface(body, request.user.username);
        return reply.status(201).send({ success: true, data });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  fastify.put('/interfaces/:id', {
    preHandler: [requirePermission('NETWORK_UPDATE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateInterfaceSchema.parse(request.body);
        const data = await service.updateInterface(id, body, request.user.username);
        return { success: true, data };
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });

  fastify.delete('/interfaces/:id', {
    preHandler: [requirePermission('NETWORK_DELETE')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await service.deleteInterface(id, request.user.username);
        return result;
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    },
  });
};
