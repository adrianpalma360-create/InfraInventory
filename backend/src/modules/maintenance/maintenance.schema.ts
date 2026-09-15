import { z } from 'zod';

export const maintenanceTypeSchema = z.enum([
  'PREVENTIVE',
  'CORRECTIVE',
  'SCHEDULED',
  'EMERGENCY',
]);

export const maintenanceStatusSchema = z.enum([
  'PLANNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const createMaintenanceSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().optional().nullable(),
  type: maintenanceTypeSchema.default('PREVENTIVE'),
  status: maintenanceStatusSchema.default('PLANNED'),
  assetId: z.string().uuid().optional().nullable(),
  machineId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  windowId: z.string().uuid().optional().nullable(),
  runbookId: z.string().uuid().optional().nullable(),
  scheduledStart: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  scheduledEnd: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional().nullable(), // DAILY, WEEKLY, MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL
  suppressAlerts: z.boolean().default(true),
  notes: z.string().optional().nullable(),
  checklistItems: z.array(z.string()).optional(),
});

export const updateMaintenanceSchema = createMaintenanceSchema.partial();

export const createMaintenanceWindowSchema = z.object({
  name: z.string().min(1, 'Window name is required').trim(),
  description: z.string().optional().nullable(),
  startTime: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endTime: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  machineId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  group: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
});

export const updateMaintenanceWindowSchema = createMaintenanceWindowSchema.partial();

export const toggleChecklistItemSchema = z.object({
  isCompleted: z.boolean(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
export type CreateMaintenanceWindowInput = z.infer<typeof createMaintenanceWindowSchema>;
export type UpdateMaintenanceWindowInput = z.infer<typeof updateMaintenanceWindowSchema>;
