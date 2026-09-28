import { z } from 'zod';

export const BackupTypeEnum = z.enum(['MANUAL', 'SCHEDULED', 'PRE_RESTORE']);
export const BackupStatusEnum = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RESTORING', 'RESTORED', 'CORRUPTED']);

export const CreateBackupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isProtected: z.boolean().optional().default(false),
  description: z.string().max(255).optional(),
});

export type CreateBackupInput = z.infer<typeof CreateBackupSchema>;

export const RestoreBackupSchema = z.object({
  skipPreRestoreBackup: z.boolean().optional().default(false),
  force: z.boolean().optional().default(false),
});

export type RestoreBackupInput = z.infer<typeof RestoreBackupSchema>;

export const ProtectBackupSchema = z.object({
  isProtected: z.boolean(),
});

export type ProtectBackupInput = z.infer<typeof ProtectBackupSchema>;

export const BackupConfigSchema = z.object({
  autoBackupEnabled: z.boolean().default(true),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
  timeUtc: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default('03:00'),
  retentionDaily: z.number().int().min(1).max(365).default(7),
  retentionWeekly: z.number().int().min(1).max(52).default(4),
  retentionMonthly: z.number().int().min(1).max(24).default(3),
  storagePath: z.string().default('/backups'),
  encryptionEnabled: z.boolean().default(false),
});

export type BackupConfigInput = z.infer<typeof BackupConfigSchema>;
