import { z } from 'zod';

export const changeRiskSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const changeImpactSchema = z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const changeStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'ROLLED_BACK',
  'CANCELLED',
]);

export const createInfraChangeSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().min(1, 'Description is required').trim(),
  reason: z.string().optional().nullable(),
  risk: changeRiskSchema.default('LOW'),
  impact: changeImpactSchema.default('LOW'),
  status: changeStatusSchema.default('DRAFT'),
  plannedStart: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  plannedEnd: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  requesterId: z.string().uuid().optional().nullable(),
  approverId: z.string().uuid().optional().nullable(),
  executorId: z.string().uuid().optional().nullable(),
  machineId: z.string().uuid().optional().nullable(),
  assetId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  rollbackPlan: z.string().optional().nullable(),
  validationPlan: z.string().optional().nullable(),
  affectedItems: z.string().optional().nullable(),
  runbookId: z.string().uuid().optional().nullable(),
});

export const updateInfraChangeSchema = createInfraChangeSchema.partial();

export const changeApprovalDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comments: z.string().optional().nullable(),
});

export type CreateInfraChangeInput = z.infer<typeof createInfraChangeSchema>;
export type UpdateInfraChangeInput = z.infer<typeof updateInfraChangeSchema>;
export type ChangeApprovalDecisionInput = z.infer<typeof changeApprovalDecisionSchema>;
