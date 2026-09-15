import { z } from 'zod';

export const licenseTypeSchema = z.enum([
  'PERPETUAL',
  'SUBSCRIPTION',
  'OEM',
  'OPEN_SOURCE',
  'TRIAL',
  'OTHER',
]);

export const createLicenseSchema = z.object({
  name: z.string().min(1, 'License name is required').trim(),
  vendor: z.string().min(1, 'Vendor is required').trim(),
  product: z.string().min(1, 'Product name is required').trim(),
  version: z.string().optional().nullable(),
  licenseType: licenseTypeSchema.default('PERPETUAL'),
  licenseKey: z.string().optional().nullable(),
  seats: z.number().int().positive().default(1),
  purchaseDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  expirationDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  renewalCost: z.number().nonnegative().optional().nullable(),
  currency: z.string().default('EUR').optional(),
  notes: z.string().optional().nullable(),
});

export const updateLicenseSchema = createLicenseSchema.partial();

export const assignLicenseSchema = z.object({
  licenseId: z.string().uuid().optional(),
  machineId: z.string().uuid().optional().nullable(),
  assetId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;
export type UpdateLicenseInput = z.infer<typeof updateLicenseSchema>;
export type AssignLicenseInput = z.infer<typeof assignLicenseSchema>;
