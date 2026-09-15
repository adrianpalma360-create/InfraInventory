import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50).trim(),
  color: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Color must be a valid HEX color (e.g. #06B6D4)').default('#06B6D4'),
  description: z.string().optional().nullable(),
});

export const updateTagSchema = createTagSchema.partial();

export const assignTagSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
