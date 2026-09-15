import { z } from 'zod';

export const createPurchaseItemSchema = z.object({
  assetId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Item description is required').trim(),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative().default(0),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  invoiceNumber: z.string().min(1, 'Invoice number is required').trim(),
  purchaseDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  currency: z.string().default('EUR').optional(),
  notes: z.string().optional().nullable(),
  items: z.array(createPurchaseItemSchema).optional().default([]),
});

export const updatePurchaseSchema = createPurchaseSchema.partial();

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
