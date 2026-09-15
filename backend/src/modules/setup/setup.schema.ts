import { z } from 'zod';

export const setupStatusSchema = z.object({
  isConfigured: z.boolean(),
  status: z.enum(['CONFIGURED', 'NOT_CONFIGURED']),
  appName: z.string().optional(),
});

export const initializeSetupSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  username: z
    .string()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'El usuario solo puede contener letras, números, puntos y guiones'),
  email: z.string().email('Introduce un correo electrónico válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100),
  organizationName: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
});

export type InitializeSetupInput = z.infer<typeof initializeSetupSchema>;
