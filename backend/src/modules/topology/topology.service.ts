import { PrismaClient, ChangeAction } from '@prisma/client';
import { logChange } from '../../utils/changelog.js';
import {
  CreateTopologyInput,
  UpdateTopologyInput,
  CreateTopologyNodeInput,
  UpdateTopologyNodeInput,
  CreateTopologyEdgeInput,
  UpdateTopologyEdgeInput,
  ImportTopologyInput,
} from './topology.schema.js';

export class TopologyService {
  constructor(private prisma: PrismaClient) {}

  // List all topologies with node/edge counts
  async listTopologies(params?: { groupId?: string; locationId?: string; tagId?: string }) {
    const where: any = {};
    if (params?.groupId) where.groupId = params.groupId;
    if (params?.locationId) where.locationId = params.locationId;
    if (params?.tagId) where.tagId = params.tagId;

    return this.prisma.topology.findMany({
      where,
      include: {
        _count: {
          select: {
            nodes: true,
            edges: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  // Get full topology with enriched nodes, live health, and edges
  async getTopologyById(id: string) {
    const topology = await this.prisma.topology.findUnique({
      where: { id },
      include: {
        nodes: {
          include: {
            machine: {
              include: {
                interfaces: {
                  include: {
                    ipAddresses: true,
                    vlan: true,
                  },
                },
                ipAddresses: true,
                ports: {
                  where: { state: 'OPEN' },
                },
                location: true,
                vlan: true,
                tags: {
                  include: {
                    tag: true,
                  },
                },
                metricAnomalies: {
                  where: { isResolved: false },
                  orderBy: { detectedAt: 'desc' },
                  take: 5,
                },
                metricSamples: {
                  orderBy: { timestamp: 'desc' },
                  take: 1,
                },
              },
            },
            network: {
              include: {
                vlan: true,
                location: true,
                _count: {
                  select: { ipAddresses: true },
                },
              },
            },
            vlan: {
              include: {
                location: true,
                _count: {
                  select: { machines: true, interfaces: true },
                },
              },
            },
            location: {
              include: {
                _count: {
                  select: { machines: true },
                },
              },
            },
          },
        },
        edges: {
          include: {
            sourceInterface: true,
            targetInterface: true,
          },
        },
      },
    });

    if (!topology) throw new Error('Topology not found');

    // Enrich nodes with computed live status and active incident count
    const enrichedNodes = topology.nodes.map((node) => {
      let liveStatus = node.statusOverride || 'UNKNOWN';
      let activeIncidentsCount = 0;
      let lastMetrics = null;

      if (node.machine) {
        liveStatus = node.machine.status;
        activeIncidentsCount = node.machine.metricAnomalies?.length || 0;
        if (node.machine.metricSamples && node.machine.metricSamples.length > 0) {
          lastMetrics = node.machine.metricSamples[0];
        }
      } else if (node.nodeType === 'INTERNET') {
        liveStatus = 'ONLINE';
      }

      return {
        ...node,
        computedStatus: liveStatus,
        activeIncidentsCount,
        lastMetrics,
      };
    });

    return {
      ...topology,
      nodes: enrichedNodes,
    };
  }

  // Create topology
  async createTopology(data: CreateTopologyInput, actor = 'admin') {
    const topology = await this.prisma.topology.create({
      data: {
        name: data.name,
        description: data.description,
        groupId: data.groupId,
        locationId: data.locationId,
        tagId: data.tagId,
        isDefault: data.isDefault || false,
        metadata: data.metadata || {},
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Topology',
      entityId: topology.id,
      action: ChangeAction.CREATE,
      details: `Created topology "${topology.name}"`,
      user: actor,
    });

    return topology;
  }

  // Update topology
  async updateTopology(id: string, data: UpdateTopologyInput, actor = 'admin') {
    const existing = await this.prisma.topology.findUnique({ where: { id } });
    if (!existing) throw new Error('Topology not found');

    const updated = await this.prisma.topology.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.groupId !== undefined && { groupId: data.groupId }),
        ...(data.locationId !== undefined && { locationId: data.locationId }),
        ...(data.tagId !== undefined && { tagId: data.tagId }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.metadata !== undefined && { metadata: data.metadata || {} }),
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Topology',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated topology "${updated.name}"`,
      user: actor,
    });

    return updated;
  }

  // Delete topology (non-destructive: only removes topology, nodes, edges)
  async deleteTopology(id: string, actor = 'admin') {
    const existing = await this.prisma.topology.findUnique({ where: { id } });
    if (!existing) throw new Error('Topology not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Topology',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted topology "${existing.name}"`,
      user: actor,
    });

    await this.prisma.topology.delete({ where: { id } });
    return { success: true, message: 'Topology deleted successfully' };
  }

  // ----------------------------------------------------
  // NODES MANAGEMENT
  // ----------------------------------------------------
  async getNodes(topologyId: string) {
    return this.prisma.topologyNode.findMany({
      where: { topologyId },
      include: {
        machine: true,
        network: true,
        vlan: true,
        location: true,
      },
    });
  }

  async addNode(topologyId: string, data: CreateTopologyNodeInput, actor = 'admin') {
    const topology = await this.prisma.topology.findUnique({ where: { id: topologyId } });
    if (!topology) throw new Error('Topology not found');

    // If machineId provided, check it exists
    if (data.machineId) {
      const machine = await this.prisma.machine.findUnique({ where: { id: data.machineId } });
      if (!machine) throw new Error(`Machine ID ${data.machineId} not found`);
    }

    const node = await this.prisma.topologyNode.create({
      data: {
        topologyId,
        nodeType: data.nodeType,
        label: data.label,
        positionX: data.positionX,
        positionY: data.positionY,
        machineId: data.machineId,
        networkId: data.networkId,
        vlanId: data.vlanId,
        locationId: data.locationId,
        customIcon: data.customIcon,
        statusOverride: data.statusOverride,
        metadata: data.metadata || {},
      },
      include: {
        machine: true,
        network: true,
        vlan: true,
        location: true,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'TopologyNode',
      entityId: node.id,
      action: ChangeAction.CREATE,
      details: `Added node "${node.label}" (${node.nodeType}) to topology ${topology.name}`,
      user: actor,
    });

    return node;
  }

  async updateNode(id: string, data: UpdateTopologyNodeInput, actor = 'admin') {
    const existing = await this.prisma.topologyNode.findUnique({ where: { id } });
    if (!existing) throw new Error('Topology node not found');

    const updated = await this.prisma.topologyNode.update({
      where: { id },
      data: {
        ...(data.nodeType !== undefined && { nodeType: data.nodeType }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.positionX !== undefined && { positionX: data.positionX }),
        ...(data.positionY !== undefined && { positionY: data.positionY }),
        ...(data.machineId !== undefined && { machineId: data.machineId }),
        ...(data.networkId !== undefined && { networkId: data.networkId }),
        ...(data.vlanId !== undefined && { vlanId: data.vlanId }),
        ...(data.locationId !== undefined && { locationId: data.locationId }),
        ...(data.customIcon !== undefined && { customIcon: data.customIcon }),
        ...(data.statusOverride !== undefined && { statusOverride: data.statusOverride }),
        ...(data.metadata !== undefined && { metadata: data.metadata || {} }),
      },
      include: {
        machine: true,
        network: true,
        vlan: true,
        location: true,
      },
    });

    return updated;
  }

  async deleteNode(id: string, actor = 'admin') {
    const existing = await this.prisma.topologyNode.findUnique({ where: { id } });
    if (!existing) throw new Error('Topology node not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'TopologyNode',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Removed node "${existing.label}" from topology`,
      user: actor,
    });

    await this.prisma.topologyNode.delete({ where: { id } });
    return { success: true, message: 'Node deleted successfully' };
  }

  async batchUpdatePositions(positions: { id: string; positionX: number; positionY: number }[]) {
    await this.prisma.$transaction(
      positions.map((p) =>
        this.prisma.topologyNode.update({
          where: { id: p.id },
          data: {
            positionX: p.positionX,
            positionY: p.positionY,
          },
        })
      )
    );
    return { success: true, updatedCount: positions.length };
  }

  // ----------------------------------------------------
  // EDGES MANAGEMENT
  // ----------------------------------------------------
  async getEdges(topologyId: string) {
    return this.prisma.topologyEdge.findMany({
      where: { topologyId },
      include: {
        sourceNode: true,
        targetNode: true,
        sourceInterface: true,
        targetInterface: true,
      },
    });
  }

  async addEdge(topologyId: string, data: CreateTopologyEdgeInput, actor = 'admin') {
    const topology = await this.prisma.topology.findUnique({ where: { id: topologyId } });
    if (!topology) throw new Error('Topology not found');

    const sourceNode = await this.prisma.topologyNode.findUnique({ where: { id: data.sourceNodeId } });
    const targetNode = await this.prisma.topologyNode.findUnique({ where: { id: data.targetNodeId } });
    if (!sourceNode || !targetNode) throw new Error('Source or target node not found');

    const edge = await this.prisma.topologyEdge.create({
      data: {
        topologyId,
        sourceNodeId: data.sourceNodeId,
        targetNodeId: data.targetNodeId,
        connectionType: data.connectionType,
        label: data.label,
        sourceInterfaceId: data.sourceInterfaceId,
        targetInterfaceId: data.targetInterfaceId,
        speed: data.speed,
        status: data.status || 'ACTIVE',
        metadata: data.metadata || {},
      },
      include: {
        sourceNode: true,
        targetNode: true,
        sourceInterface: true,
        targetInterface: true,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'TopologyEdge',
      entityId: edge.id,
      action: ChangeAction.CREATE,
      details: `Connected "${sourceNode.label}" -> "${targetNode.label}" (${edge.connectionType})`,
      user: actor,
    });

    return edge;
  }

  async updateEdge(id: string, data: UpdateTopologyEdgeInput, actor = 'admin') {
    const existing = await this.prisma.topologyEdge.findUnique({ where: { id } });
    if (!existing) throw new Error('Topology edge not found');

    const updated = await this.prisma.topologyEdge.update({
      where: { id },
      data: {
        ...(data.connectionType !== undefined && { connectionType: data.connectionType }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.sourceInterfaceId !== undefined && { sourceInterfaceId: data.sourceInterfaceId }),
        ...(data.targetInterfaceId !== undefined && { targetInterfaceId: data.targetInterfaceId }),
        ...(data.speed !== undefined && { speed: data.speed }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.metadata !== undefined && { metadata: data.metadata || {} }),
      },
      include: {
        sourceNode: true,
        targetNode: true,
        sourceInterface: true,
        targetInterface: true,
      },
    });

    return updated;
  }

  async deleteEdge(id: string, actor = 'admin') {
    const existing = await this.prisma.topologyEdge.findUnique({ where: { id } });
    if (!existing) throw new Error('Topology edge not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'TopologyEdge',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Deleted edge ${id}`,
      user: actor,
    });

    await this.prisma.topologyEdge.delete({ where: { id } });
    return { success: true, message: 'Edge deleted successfully' };
  }

  // ----------------------------------------------------
  // REAL-TIME TOPOLOGY STATUS & SUMMARY
  // ----------------------------------------------------
  async getTopologyStatusSummary(topologyId: string) {
    const topology = await this.getTopologyById(topologyId);
    let online = 0;
    let warning = 0;
    let critical = 0;
    let down = 0;
    let unknown = 0;
    let totalIncidents = 0;

    for (const node of topology.nodes) {
      const st = node.computedStatus;
      if (st === 'ONLINE' || st === 'HEALTHY') online++;
      else if (st === 'WARNING' || st === 'DEGRADED') warning++;
      else if (st === 'CRITICAL') critical++;
      else if (st === 'OFFLINE' || st === 'DOWN') down++;
      else unknown++;

      totalIncidents += node.activeIncidentsCount || 0;
    }

    return {
      topologyId,
      name: topology.name,
      totalNodes: topology.nodes.length,
      totalEdges: topology.edges.length,
      online,
      warning,
      critical,
      down,
      unknown,
      totalIncidents,
    };
  }

  // ----------------------------------------------------
  // IMPORT & EXPORT
  // ----------------------------------------------------
  async exportTopologyJson(id: string) {
    const topology = await this.getTopologyById(id);
    return {
      version: '7.0.0',
      exportedAt: new Date().toISOString(),
      topology: {
        name: topology.name,
        description: topology.description,
        groupId: topology.groupId,
        metadata: topology.metadata,
      },
      nodes: topology.nodes.map((n) => ({
        tempId: n.id,
        nodeType: n.nodeType,
        label: n.label,
        positionX: n.positionX,
        positionY: n.positionY,
        machineHostname: n.machine?.hostname || null,
        networkCidr: n.network?.cidr || null,
        vlanNumber: n.vlan?.vlanId || null,
        locationName: n.location?.name || null,
        customIcon: n.customIcon,
        metadata: n.metadata,
      })),
      edges: topology.edges.map((e) => ({
        sourceTempId: e.sourceNodeId,
        targetTempId: e.targetNodeId,
        connectionType: e.connectionType,
        label: e.label,
        speed: e.speed,
        metadata: e.metadata,
      })),
    };
  }

  async importTopologyJson(data: ImportTopologyInput, actor = 'admin') {
    // 1. Create topology
    const topology = await this.createTopology(
      {
        name: data.name,
        description: data.description,
        groupId: data.groupId,
        locationId: data.locationId,
        tagId: data.tagId,
        isDefault: false,
      },
      actor
    );

    const tempIdToDbId = new Map<string, string>();
    const labelToDbId = new Map<string, string>();

    // 2. Resolve and create nodes
    for (const n of data.nodes) {
      let resolvedMachineId = n.machineId || null;
      let resolvedNetworkId = n.networkId || null;
      let resolvedVlanId = n.vlanId || null;
      let resolvedLocationId = n.locationId || null;

      if (!resolvedMachineId && n.machineHostname) {
        const m = await this.prisma.machine.findUnique({ where: { hostname: n.machineHostname } });
        if (m) resolvedMachineId = m.id;
      }
      if (!resolvedNetworkId && n.networkCidr) {
        const net = await this.prisma.network.findUnique({ where: { cidr: n.networkCidr } });
        if (net) resolvedNetworkId = net.id;
      }
      if (!resolvedVlanId && n.vlanNumber !== undefined && n.vlanNumber !== null) {
        const v = await this.prisma.vLAN.findUnique({ where: { vlanId: n.vlanNumber } });
        if (v) resolvedVlanId = v.id;
      }
      if (!resolvedLocationId && n.locationName) {
        const loc = await this.prisma.location.findUnique({ where: { name: n.locationName } });
        if (loc) resolvedLocationId = loc.id;
      }

      const createdNode = await this.prisma.topologyNode.create({
        data: {
          topologyId: topology.id,
          nodeType: n.nodeType,
          label: n.label,
          positionX: n.positionX,
          positionY: n.positionY,
          machineId: resolvedMachineId,
          networkId: resolvedNetworkId,
          vlanId: resolvedVlanId,
          locationId: resolvedLocationId,
          customIcon: n.customIcon,
          metadata: n.metadata || {},
        },
      });

      if (n.tempId) tempIdToDbId.set(n.tempId, createdNode.id);
      labelToDbId.set(n.label, createdNode.id);
    }

    // 3. Create edges
    let createdEdgesCount = 0;
    for (const e of data.edges) {
      const srcId =
        (e.sourceTempId && tempIdToDbId.get(e.sourceTempId)) ||
        (e.sourceLabel && labelToDbId.get(e.sourceLabel));
      const tgtId =
        (e.targetTempId && tempIdToDbId.get(e.targetTempId)) ||
        (e.targetLabel && labelToDbId.get(e.targetLabel));

      if (srcId && tgtId) {
        await this.prisma.topologyEdge.create({
          data: {
            topologyId: topology.id,
            sourceNodeId: srcId,
            targetNodeId: tgtId,
            connectionType: e.connectionType,
            label: e.label,
            speed: e.speed,
            metadata: e.metadata || {},
          },
        });
        createdEdgesCount++;
      }
    }

    return {
      success: true,
      topologyId: topology.id,
      name: topology.name,
      nodesCount: data.nodes.length,
      edgesCount: createdEdgesCount,
    };
  }
}
