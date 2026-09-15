import { z } from 'zod';
import { ticketPrioritySchema } from '../tickets/ticket.schema.js';

export const taskStatusSchema = z.enum([
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
]);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().optional().nullable(),
  status: taskStatusSchema.default('TODO'),
  priority: ticketPrioritySchema.default('NORMAL'),
  assignedToId: z.string().uuid().optional().nullable(),
  ticketId: z.string().uuid().optional().nullable(),
  maintenanceId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
