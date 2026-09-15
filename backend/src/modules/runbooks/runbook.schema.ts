import { z } from 'zod';

export const runbookStepSchema = z.object({
  stepOrder: z.number().int().default(1),
  title: z.string().min(1, 'Step title is required').trim(),
  description: z.string().optional().nullable(),
  isRequired: z.boolean().default(true),
});

export const createRunbookSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().optional().nullable(),
  category: z.string().default('General').optional(),
  version: z.string().default('1.0').optional(),
  content: z.string().optional().nullable(),
  steps: z.array(runbookStepSchema).optional().default([]),
});

export const updateRunbookSchema = createRunbookSchema.partial();
export type CreateRunbookInput = z.infer<typeof createRunbookSchema>;
export type UpdateRunbookInput = z.infer<typeof updateRunbookSchema>;
