import { z } from 'zod';
import { ScanType, MachineType } from '@prisma/client';

export const createScanSchema = z.object({
  networkCidr: z.string().min(1, 'CIDR is required').trim(),
  scanType: z.nativeEnum(ScanType).default(ScanType.BASIC),
});

export const importDiscoveredHostSchema = z.object({
  hostname: z.string().min(1, 'Hostname is required').trim(),
  type: z.nativeEnum(MachineType).default(MachineType.PHYSICAL_SERVER),
  os: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  vlanId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const discoveryChangeQuerySchema = z.object({
  scanId: z.string().uuid().optional(),
  changeType: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;
export type ImportDiscoveredHostInput = z.infer<typeof importDiscoveredHostSchema>;
export type DiscoveryChangeQueryInput = z.infer<typeof discoveryChangeQuerySchema>;
