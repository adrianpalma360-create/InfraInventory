import { z } from 'zod';

export const createSoftwareSchema = z.object({
  name: z.string().min(1, 'Software name is required').trim(),
  vendor: z.string().optional().nullable(),
  version: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const updateSoftwareSchema = createSoftwareSchema.partial();

export const installSoftwareSchema = z.object({
  softwareId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional().nullable(),
  machineId: z.string().uuid().optional().nullable(),
  installedVersion: z.string().optional().nullable(),
});

export type CreateSoftwareInput = z.infer<typeof createSoftwareSchema>;
export type UpdateSoftwareInput = z.infer<typeof updateSoftwareSchema>;
export type InstallSoftwareInput = z.infer<typeof installSoftwareSchema>;
