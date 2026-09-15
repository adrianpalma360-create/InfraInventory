import { z } from 'zod';
import { MachineType, MachineStatus } from '@prisma/client';

export const createMachineSchema = z.object({
  hostname: z.string().min(1, 'Hostname is required').trim(),
  type: z.nativeEnum(MachineType).default(MachineType.PHYSICAL_SERVER),
  status: z.nativeEnum(MachineStatus).default(MachineStatus.UNCHECKED),
  os: z.string().optional().nullable(),
  osVersion: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  primaryIp: z.string().optional().nullable(),
  macAddress: z.string().optional().nullable(),
  gateway: z.string().optional().nullable(),
  dns: z.string().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  vlanId: z.string().uuid().optional().nullable(),
  group: z.string().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateMachineSchema = createMachineSchema.partial();

export const machineQuerySchema = z.object({
  search: z.string().optional(),
  type: z.nativeEnum(MachineType).optional(),
  status: z.nativeEnum(MachineStatus).optional(),
  group: z.string().optional(),
  locationId: z.string().uuid().optional(),
  vlanId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  tag: z.string().optional(),
  os: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sortBy: z.enum(['hostname', 'status', 'type', 'primaryIp', 'createdAt', 'updatedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateMachineInput = z.infer<typeof createMachineSchema>;
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;
export type MachineQueryInput = z.infer<typeof machineQuerySchema>;
