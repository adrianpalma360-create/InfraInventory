import { z } from 'zod';
import { PortProtocol, PortState } from '@prisma/client';

export const createPortSchema = z.object({
  machineId: z.string().uuid('Machine ID is required'),
  portNumber: z.coerce.number().int().min(1).max(65535, 'Port must be between 1 and 65535'),
  protocol: z.nativeEnum(PortProtocol).default(PortProtocol.TCP),
  state: z.nativeEnum(PortState).default(PortState.OPEN),
  serviceId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const updatePortSchema = createPortSchema.partial();

export type CreatePortInput = z.infer<typeof createPortSchema>;
export type UpdatePortInput = z.infer<typeof updatePortSchema>;
