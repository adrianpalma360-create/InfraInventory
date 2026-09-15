import { z } from 'zod';

export const topologyNodeTypeSchema = z.enum([
  'INTERNET',
  'ROUTER',
  'FIREWALL',
  'SWITCH',
  'ACCESS_POINT',
  'SERVER',
  'WORKSTATION',
  'NAS',
  'VM',
  'CONTAINER',
  'NETWORK',
  'VLAN',
  'PRINTER',
  'STORAGE',
  'UPS',
  'PHONE',
  'OTHER',
]);

export const topologyConnectionTypeSchema = z.enum([
  'ETHERNET',
  'FIBER',
  'WIFI',
  'VPN',
  'VLAN',
  'LOGICAL',
  'OTHER',
]);

export const createTopologySchema = z.object({
  name: z.string().min(1, 'Topology name is required').trim(),
  description: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  tagId: z.string().uuid().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  metadata: z.record(z.any()).optional().nullable(),
});

export const updateTopologySchema = createTopologySchema.partial();

export const createTopologyNodeSchema = z.object({
  topologyId: z.string().uuid().optional(),
  nodeType: topologyNodeTypeSchema.default('SERVER'),
  label: z.string().min(1, 'Node label is required').trim(),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  machineId: z.string().uuid().optional().nullable(),
  networkId: z.string().uuid().optional().nullable(),
  vlanId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  customIcon: z.string().optional().nullable(),
  statusOverride: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const updateTopologyNodeSchema = z.object({
  nodeType: topologyNodeTypeSchema.optional(),
  label: z.string().min(1).trim().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  machineId: z.string().uuid().optional().nullable(),
  networkId: z.string().uuid().optional().nullable(),
  vlanId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  customIcon: z.string().optional().nullable(),
  statusOverride: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const createTopologyEdgeSchema = z.object({
  topologyId: z.string().uuid().optional(),
  sourceNodeId: z.string().uuid('Source node ID is required'),
  targetNodeId: z.string().uuid('Target node ID is required'),
  connectionType: topologyConnectionTypeSchema.default('ETHERNET'),
  label: z.string().optional().nullable(),
  sourceInterfaceId: z.string().uuid().optional().nullable(),
  targetInterfaceId: z.string().uuid().optional().nullable(),
  speed: z.string().optional().nullable(),
  status: z.string().default('ACTIVE').optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const updateTopologyEdgeSchema = z.object({
  connectionType: topologyConnectionTypeSchema.optional(),
  label: z.string().optional().nullable(),
  sourceInterfaceId: z.string().uuid().optional().nullable(),
  targetInterfaceId: z.string().uuid().optional().nullable(),
  speed: z.string().optional().nullable(),
  status: z.string().optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const batchSavePositionsSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string().uuid(),
      positionX: z.number(),
      positionY: z.number(),
    })
  ),
});

export const importTopologySchema = z.object({
  name: z.string().min(1, 'Topology name is required'),
  description: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  tagId: z.string().uuid().optional().nullable(),
  nodes: z.array(
    z.object({
      nodeType: topologyNodeTypeSchema.default('SERVER'),
      label: z.string(),
      positionX: z.number().default(0),
      positionY: z.number().default(0),
      machineHostname: z.string().optional().nullable(),
      machineId: z.string().uuid().optional().nullable(),
      networkCidr: z.string().optional().nullable(),
      networkId: z.string().uuid().optional().nullable(),
      vlanNumber: z.number().optional().nullable(),
      vlanId: z.string().uuid().optional().nullable(),
      locationName: z.string().optional().nullable(),
      locationId: z.string().uuid().optional().nullable(),
      customIcon: z.string().optional().nullable(),
      metadata: z.record(z.any()).optional().nullable(),
      tempId: z.string().optional(),
    })
  ),
  edges: z.array(
    z.object({
      sourceTempId: z.string().optional(),
      targetTempId: z.string().optional(),
      sourceLabel: z.string().optional(),
      targetLabel: z.string().optional(),
      connectionType: topologyConnectionTypeSchema.default('ETHERNET'),
      label: z.string().optional().nullable(),
      speed: z.string().optional().nullable(),
      metadata: z.record(z.any()).optional().nullable(),
    })
  ),
});

export type CreateTopologyInput = z.infer<typeof createTopologySchema>;
export type UpdateTopologyInput = z.infer<typeof updateTopologySchema>;
export type CreateTopologyNodeInput = z.infer<typeof createTopologyNodeSchema>;
export type UpdateTopologyNodeInput = z.infer<typeof updateTopologyNodeSchema>;
export type CreateTopologyEdgeInput = z.infer<typeof createTopologyEdgeSchema>;
export type UpdateTopologyEdgeInput = z.infer<typeof updateTopologyEdgeSchema>;
export type ImportTopologyInput = z.infer<typeof importTopologySchema>;
