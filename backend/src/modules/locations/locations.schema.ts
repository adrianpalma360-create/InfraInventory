import { z } from 'zod';

export const LocationTypeEnum = z.enum([
  'COMPANY',
  'OFFICE',
  'DATACENTER',
  'ROOM',
  'RACK',
  'WAREHOUSE',
  'REMOTE',
  'OTHER',
]);

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').trim(),
  description: z.string().optional().nullable(),
  type: LocationTypeEnum.default('OTHER'),
  parentId: z.string().uuid().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  building: z.string().optional().nullable(),
  floor: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  rack: z.string().optional().nullable(),
});

export const updateLocationSchema = createLocationSchema.partial();

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
