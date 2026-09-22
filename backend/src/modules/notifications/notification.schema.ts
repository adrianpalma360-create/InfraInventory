import { z } from 'zod';

export const UpdateNotificationConfigSchema = z.object({
  telegramEnabled: z.boolean().optional(),
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  cooldownMinutes: z.number().int().min(1).max(1440).optional(),
  rateLimitPerMin: z.number().int().min(1).max(60).optional(),

  // Severity Filters
  notifyCritical: z.boolean().optional(),
  notifyWarning: z.boolean().optional(),
  notifyInfo: z.boolean().optional(),

  // Event Toggles
  notifyHostOffline: z.boolean().optional(),
  notifyHostRecovered: z.boolean().optional(),
  notifyServiceDown: z.boolean().optional(),
  notifyServiceRecovered: z.boolean().optional(),
  notifyHighCpu: z.boolean().optional(),
  notifyHighRam: z.boolean().optional(),
  notifyHighDisk: z.boolean().optional(),
  notifyDiscoveryNew: z.boolean().optional(),
  notifyDiscoveryChange: z.boolean().optional(),
  notifyBackupFailed: z.boolean().optional(),
  notifyBackupCompleted: z.boolean().optional(),
  notifyRestoreFailed: z.boolean().optional(),
  notifyRestoreCompleted: z.boolean().optional(),
  notifyImportFailed: z.boolean().optional(),
});

export type UpdateNotificationConfigInput = z.infer<typeof UpdateNotificationConfigSchema>;
