import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'El usuario es obligatorio').trim(),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').trim().optional(),
  email: z.string().email('Email no válido').optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
