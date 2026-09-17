import { z } from 'zod';
import { ScanType, MachineType } from '@prisma/client';

export const createScanSchema = z.object({
  networkCidr: z.string().min(1, 'CIDR is required').trim(),
  scanType: z.enum(['BASIC', 'FULL', 'CUSTOM']).default('BASIC'),
  customPorts: z.array(z.number().int().min(1).max(65535)).optional(),
  excludedIps: z.array(z.string()).optional(),
  methods: z
    .object({
      icmp: z.boolean().optional(),
      arp: z.boolean().optional(),
      tcp: z.boolean().optional(),
      dns: z.boolean().optional(),
      snmp: z.boolean().optional(),
      ssh: z.boolean().optional(),
      winrm: z.boolean().optional(),
    })
    .optional(),
  snmpCommunity: z.string().optional(),
  snmpVersion: z.enum(['v2c', 'v3']).optional(),
  credentials: z
    .object({
      ssh: z
        .object({
          username: z.string(),
          password: z.string().optional(),
          privateKey: z.string().optional(),
          port: z.number().int().optional(),
        })
        .optional(),
      winrm: z
        .object({
          username: z.string(),
          password: z.string().optional(),
          port: z.number().int().optional(),
          useHttps: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
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

export const saveDiscoveryNetworkSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nombre de red requerido'),
  cidr: z.string().min(1, 'CIDR requerido'),
  description: z.string().optional().nullable(),
  excludedIps: z.array(z.string()).optional().default([]),
  schedule: z
    .enum(['MANUAL', 'EVERY_15_MIN', 'EVERY_30_MIN', 'EVERY_1_HOUR', 'EVERY_6_HOURS', 'DAILY'])
    .default('MANUAL'),
  scanType: z.enum(['BASIC', 'FULL', 'CUSTOM']).default('BASIC'),
  customPorts: z.array(z.number().int()).optional().default([]),
  enabledMethods: z
    .object({
      icmp: z.boolean().optional(),
      arp: z.boolean().optional(),
      tcp: z.boolean().optional(),
      dns: z.boolean().optional(),
      snmp: z.boolean().optional(),
      ssh: z.boolean().optional(),
      winrm: z.boolean().optional(),
    })
    .optional(),
  snmpCommunity: z.string().optional().nullable(),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;
export type ImportDiscoveredHostInput = z.infer<typeof importDiscoveredHostSchema>;
export type DiscoveryChangeQueryInput = z.infer<typeof discoveryChangeQuerySchema>;
export type SaveDiscoveryNetworkInput = z.infer<typeof saveDiscoveryNetworkSchema>;
