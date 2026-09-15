import { z } from 'zod';
import { ticketPrioritySchema } from '../tickets/ticket.schema.js';

export const createSlaSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().optional().nullable(),
  responseTimeMinutes: z.number().int().positive().default(60),
  resolutionTimeMinutes: z.number().int().positive().default(480),
  priority: ticketPrioritySchema.default('NORMAL'),
  enabled: z.boolean().default(true),
  businessHoursOnly: z.boolean().default(false),
  businessHoursStart: z.string().default('08:00').optional(),
  businessHoursEnd: z.string().default('18:00').optional(),
});

export const updateSlaSchema = createSlaSchema.partial();
export type CreateSlaInput = z.infer<typeof createSlaSchema>;
export type UpdateSlaInput = z.infer<typeof updateSlaSchema>;
