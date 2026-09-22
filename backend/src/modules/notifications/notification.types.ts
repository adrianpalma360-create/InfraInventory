export type NotificationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type NotificationEventType =
  | 'HOST_OFFLINE'
  | 'HOST_RECOVERED'
  | 'SERVICE_DOWN'
  | 'SERVICE_RECOVERED'
  | 'HIGH_CPU'
  | 'HIGH_RAM'
  | 'HIGH_DISK'
  | 'CRITICAL_ALERT'
  | 'WARNING_ALERT'
  | 'DISCOVERY_NEW_DEVICE'
  | 'DISCOVERY_DEVICE_REMOVED'
  | 'DISCOVERY_CHANGE'
  | 'BACKUP_FAILED'
  | 'BACKUP_COMPLETED'
  | 'RESTORE_FAILED'
  | 'RESTORE_COMPLETED'
  | 'IMPORT_FAILED'
  | 'TEST_MESSAGE';

export interface NotificationEventPayload {
  eventType: NotificationEventType;
  severity?: NotificationSeverity;
  entityId?: string; // host ID, machine hostname, backup ID, etc.
  hostname?: string;
  ip?: string;
  macAddress?: string;
  serviceName?: string;
  port?: number;
  metricType?: string; // CPU, RAM, DISK, LATENCY
  currentValue?: number | string;
  thresholdValue?: number | string;
  details?: string;
  durationMinutes?: number;
  backupName?: string;
  fileSizeFormatted?: string;
  changeDetails?: string;
  timestamp?: Date;
}

export interface NotificationConfigDTO {
  telegramEnabled: boolean;
  telegramConfigured: boolean;
  telegramBotTokenMasked: string;
  telegramChatId: string;
  telegramChatIdMasked: string;
  cooldownMinutes: number;
  rateLimitPerMin: number;
  
  // Severity Filters
  notifyCritical: boolean;
  notifyWarning: boolean;
  notifyInfo: boolean;

  // Specific Event Toggles
  notifyHostOffline: boolean;
  notifyHostRecovered: boolean;
  notifyServiceDown: boolean;
  notifyServiceRecovered: boolean;
  notifyHighCpu: boolean;
  notifyHighRam: boolean;
  notifyHighDisk: boolean;
  notifyDiscoveryNew: boolean;
  notifyDiscoveryChange: boolean;
  notifyBackupFailed: boolean;
  notifyBackupCompleted: boolean;
  notifyRestoreFailed: boolean;
  notifyRestoreCompleted: boolean;
  notifyImportFailed: boolean;

  lastTestAt?: string | null;
  lastSentAt?: string | null;
  totalSentCount?: number;
  totalFailedCount?: number;
}

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  errorMessage?: string;
  durationMs: number;
}
