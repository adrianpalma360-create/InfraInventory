import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required').trim(),
  defaultPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  protocol: z.string().default('TCP'),
  version: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
