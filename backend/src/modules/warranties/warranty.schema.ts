import { z } from 'zod';

export const warrantyTypeSchema = z.enum([
  'STANDARD',
  'EXTENDED',
  'SUPPORT',
  'ONSITE',
  'OTHER',
]);

export const createWarrantySchema = z.object({
  assetId: z.string().uuid('Asset ID is required'),
  supplierId: z.string().uuid().optional().nullable(),
  provider: z.string().min(1, 'Provider name is required').trim(),
  contractNumber: z.string().optional().nullable(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  type: warrantyTypeSchema.default('STANDARD'),
  notes: z.string().optional().nullable(),
});

export const updateWarrantySchema = createWarrantySchema.partial();

export type CreateWarrantyInput = z.infer<typeof createWarrantySchema>;
export type UpdateWarrantyInput = z.infer<typeof updateWarrantySchema>;
