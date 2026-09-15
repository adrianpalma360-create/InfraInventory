import { z } from 'zod';

export const ticketTypeSchema = z.enum([
  'INCIDENT',
  'REQUEST',
  'TASK',
  'MAINTENANCE',
  'CHANGE',
  'QUESTION',
  'OTHER',
]);

export const ticketPrioritySchema = z.enum([
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
  'CRITICAL',
]);

export const ticketStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'PENDING',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
]);

export const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().min(1, 'Description is required').trim(),
  type: ticketTypeSchema.default('INCIDENT'),
  priority: ticketPrioritySchema.default('NORMAL'),
  assignedToId: z.string().uuid().optional().nullable(),
  requesterId: z.string().uuid().optional().nullable(),
  requesterEmail: z.string().email().optional().nullable().or(z.literal('')),
  assetId: z.string().uuid().optional().nullable(),
  machineId: z.string().uuid().optional().nullable(),
  incidentId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  group: z.string().optional().nullable(),
  serviceName: z.string().optional().nullable(),
  portNumber: z.number().int().optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
});

export const updateTicketSchema = z.object({
  title: z.string().min(1).trim().optional(),
  description: z.string().min(1).trim().optional(),
  type: ticketTypeSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  status: ticketStatusSchema.optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  requesterId: z.string().uuid().optional().nullable(),
  requesterEmail: z.string().email().optional().nullable().or(z.literal('')),
  assetId: z.string().uuid().optional().nullable(),
  machineId: z.string().uuid().optional().nullable(),
  incidentId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  group: z.string().optional().nullable(),
  serviceName: z.string().optional().nullable(),
  portNumber: z.number().int().optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
});

export const createTicketCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').trim(),
  isInternal: z.boolean().default(false).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateTicketCommentInput = z.infer<typeof createTicketCommentSchema>;
