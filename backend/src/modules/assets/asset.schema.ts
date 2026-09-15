import { z } from 'zod';

export const assetTypeSchema = z.enum([
  'SERVER',
  'DESKTOP',
  'LAPTOP',
  'NETWORK',
  'FIREWALL',
  'ROUTER',
  'SWITCH',
  'ACCESS_POINT',
  'NAS',
  'STORAGE',
  'PRINTER',
  'UPS',
  'PHONE',
  'TABLET',
  'MONITOR',
  'VM',
  'LICENSE',
  'SOFTWARE',
  'OTHER',
]);

export const assetStatusSchema = z.enum([
  'PLANNED',
  'ORDERED',
  'RECEIVED',
  'ACTIVE',
  'MAINTENANCE',
  'RETIRED',
  'LOST',
  'DISPOSED',
]);

export const hardwareComponentTypeSchema = z.enum([
  'CPU',
  'RAM',
  'DISK',
  'GPU',
  'NIC',
  'RAID',
  'PSU',
  'MOTHERBOARD',
  'OTHER',
]);

export const diskHealthStatusSchema = z.enum([
  'HEALTHY',
  'WARNING',
  'FAILED',
  'UNKNOWN',
]);

export const createAssetSchema = z.object({
  assetTag: z.string().min(1, 'Asset Tag is required').trim(),
  name: z.string().min(1, 'Asset Name is required').trim(),
  description: z.string().optional().nullable(),
  assetType: assetTypeSchema.default('SERVER'),
  status: assetStatusSchema.default('ACTIVE'),
  serialNumber: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  purchaseDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  currency: z.string().default('EUR').optional(),
  invoiceNumber: z.string().optional().nullable(),
  warrantyStart: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  warrantyEnd: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  rackUnit: z.number().int().min(1).max(100).optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  machineId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const listAssetsQuerySchema = z.object({
  search: z.string().optional(),
  assetType: assetTypeSchema.optional(),
  status: assetStatusSchema.optional(),
  locationId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  machineId: z.string().uuid().optional(),
  group: z.string().optional(),
  hasMachine: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const createHardwareComponentSchema = z.object({
  assetId: z.string().uuid().optional(),
  type: hardwareComponentTypeSchema,
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  capacity: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  quantity: z.number().int().positive().default(1),
  diskType: z.string().optional().nullable(),
  diskHealth: diskHealthStatusSchema.default('HEALTHY').optional(),
  description: z.string().optional().nullable(),
});

export const updateHardwareComponentSchema = createHardwareComponentSchema.partial();

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
export type CreateHardwareComponentInput = z.infer<typeof createHardwareComponentSchema>;
export type UpdateHardwareComponentInput = z.infer<typeof updateHardwareComponentSchema>;
