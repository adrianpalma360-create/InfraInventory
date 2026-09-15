import { z } from 'zod';

export const updateSettingsSchema = z.object({
  organizationName: z.string().min(1).default('Palma NOC Enterprise'),
  primarySubnet: z.string().default('192.168.1.0/24'),
  discoveryTimeoutMs: z.coerce.number().min(100).max(5000).default(600),
  discoveryConcurrency: z.coerce.number().min(1).max(100).default(32),
  sessionExpiryDays: z.coerce.number().min(1).max(30).default(7),
  enableAuditLogs: z.boolean().default(true),
  auditRetentionDays: z.coerce.number().min(7).max(365).default(90),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
