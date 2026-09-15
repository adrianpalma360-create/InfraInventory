import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres').max(50).trim(),
  name: z.string().min(1, 'El nombre completo es obligatorio').trim(),
  email: z.string().email('Email no válido').optional().nullable(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.nativeEnum(Role).default(Role.VIEWER),
  isActive: z.boolean().default(true),
  mustChangePassword: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'El nombre completo es obligatorio').trim().optional(),
  email: z.string().email('Email no válido').optional().nullable(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
});

export const updateUserPasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  mustChangePassword: z.boolean().default(true),
});

export const userQuerySchema = z.object({
  search: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.enum(['true', 'false', 'all']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserPasswordInput = z.infer<typeof updateUserPasswordSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
