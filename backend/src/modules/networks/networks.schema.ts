import { z } from 'zod';

export const IPStatusEnum = z.enum(['FREE', 'ASSIGNED', 'RESERVED', 'DHCP', 'CONFLICT', 'UNKNOWN']);

export const createNetworkSchema = z.object({
  name: z.string().min(1, 'Network name is required').trim(),
  cidr: z.string().min(1, 'CIDR is required').trim(),
  gateway: z.string().optional().nullable(),
  dns: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  vlanId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  dhcpEnabled: z.boolean().optional().default(false),
  dhcpStart: z.string().optional().nullable(),
  dhcpEnd: z.string().optional().nullable(),
});

export const updateNetworkSchema = createNetworkSchema.partial();

export const createVlanSchema = z.object({
  vlanId: z.coerce.number().min(1).max(4094, 'VLAN ID must be between 1 and 4094'),
  name: z.string().min(1, 'VLAN name is required').trim(),
  description: z.string().optional().nullable(),
  networkId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
});

export const updateVlanSchema = createVlanSchema.partial();

export const createIPSchema = z.object({
  address: z.string().optional(),
  ip: z.string().min(1, 'IP is required').trim(),
  version: z.string().optional().default('IPv4'),
  status: IPStatusEnum.optional().default('FREE'),
  hostname: z.string().optional().nullable(),
  macAddress: z.string().optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  subnet: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  machineId: z.string().uuid().optional().nullable(),
  interfaceId: z.string().uuid().optional().nullable(),
  networkId: z.string().uuid().optional().nullable(),
});

export const updateIPSchema = createIPSchema.partial();

export const createInterfaceSchema = z.object({
  machineId: z.string().uuid('Machine ID is required'),
  name: z.string().min(1, 'Interface name is required').trim(),
  macAddress: z.string().optional().nullable(),
  speed: z.string().optional().nullable(),
  status: z.string().default('UP'),
  vlanId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
});

export const updateInterfaceSchema = createInterfaceSchema.partial();

export const subnetCalculatorSchema = z.object({
  cidr: z.string().min(1, 'CIDR is required').trim(),
});

export const ipamImportSchema = z.object({
  csvContent: z.string().min(1, 'CSV content is required'),
});

export type CreateNetworkInput = z.infer<typeof createNetworkSchema>;
export type UpdateNetworkInput = z.infer<typeof updateNetworkSchema>;
export type CreateVlanInput = z.infer<typeof createVlanSchema>;
export type UpdateVlanInput = z.infer<typeof updateVlanSchema>;
export type CreateIPInput = z.input<typeof createIPSchema>;
export type UpdateIPInput = z.infer<typeof updateIPSchema>;
export type CreateInterfaceInput = z.infer<typeof createInterfaceSchema>;
export type UpdateInterfaceInput = z.infer<typeof updateInterfaceSchema>;
