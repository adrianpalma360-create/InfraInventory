import { PrismaClient, ChangeAction, NotificationDeliveryStatus, NotificationProviderType } from '@prisma/client';
import { TelegramProvider } from './telegram.provider.js';
import {
  NotificationEventPayload,
  NotificationConfigDTO,
  NotificationEventType,
} from './notification.types.js';
import { UpdateNotificationConfigInput } from './notification.schema.js';
import { encryptSecret, decryptSecret, maskSecret, maskChatId } from '../../utils/encryption.js';
import { logChange } from '../../utils/changelog.js';

export class NotificationService {
  private static instance: NotificationService | null = null;

  // In-memory Cooldown / Deduplication Map: key -> lastSentTimestamp (ms)
  private cooldownMap: Map<string, number> = new Map();

  // Rate Limiter: track timestamps of sent messages within the last 60 seconds
  private recentSendTimestamps: number[] = [];

  // Cached Config
  private cachedConfig: any | null = null;
  private lastConfigFetch: number = 0;
  private readonly CONFIG_CACHE_TTL_MS = 10000; // 10 seconds

  constructor(private prisma: PrismaClient) {
    NotificationService.instance = this;
  }

  public static getInstance(prisma?: PrismaClient): NotificationService {
    if (NotificationService.instance) return NotificationService.instance;
    NotificationService.instance = new NotificationService(prisma || new PrismaClient());
    return NotificationService.instance;
  }

  public async routeEvent(event: any): Promise<boolean> {
    const payload: NotificationEventPayload = {
      eventType: event.type || event.eventType || 'WARNING_ALERT',
      severity: event.severity || 'INFO',
      hostname: event.hostHostname || event.hostname,
      ip: event.hostIp || event.ip,
      details: event.message || event.details,
      backupName: event.details?.backupName || event.backupName,
      fileSizeFormatted: event.details?.sizeFormatted || event.fileSizeFormatted,
      durationMinutes: event.downtimeSeconds ? Math.ceil(event.downtimeSeconds / 60) : event.durationMinutes,
      timestamp: event.timestamp || new Date(),
    };
    return this.notify(payload);
  }

  /**
   * Fetch raw database config or generate default
   */
  private async getRawConfig(): Promise<any> {
    const now = Date.now();
    if (this.cachedConfig && now - this.lastConfigFetch < this.CONFIG_CACHE_TTL_MS) {
      return this.cachedConfig;
    }

    let config = await this.prisma.notificationConfig.findFirst();

    if (!config) {
      // Check environment variables as initial seed
      const envEnabled = process.env.TELEGRAM_ENABLED === 'true';
      const envToken = process.env.TELEGRAM_BOT_TOKEN ? encryptSecret(process.env.TELEGRAM_BOT_TOKEN) : null;
      const envChatId = process.env.TELEGRAM_CHAT_ID || null;

      config = await this.prisma.notificationConfig.create({
        data: {
          telegramEnabled: envEnabled,
          telegramBotToken: envToken,
          telegramChatId: envChatId,
          cooldownMinutes: 15,
          rateLimitPerMin: 20,
          notifyCritical: true,
          notifyWarning: true,
          notifyInfo: false,
          notifyHostOffline: true,
          notifyHostRecovered: true,
          notifyServiceDown: true,
          notifyServiceRecovered: true,
          notifyHighCpu: true,
          notifyHighRam: true,
          notifyHighDisk: true,
          notifyDiscoveryNew: true,
          notifyDiscoveryChange: true,
          notifyBackupFailed: true,
          notifyBackupCompleted: false,
          notifyRestoreFailed: true,
          notifyRestoreCompleted: true,
          notifyImportFailed: true,
        },
      });
    }

    this.cachedConfig = config;
    this.lastConfigFetch = now;
    return config;
  }

  /**
   * Return safe, masked configuration DTO for frontend
   */
  public async getConfig(): Promise<NotificationConfigDTO> {
    const raw = await this.getRawConfig();
    const hasToken = Boolean(raw.telegramBotToken && raw.telegramBotToken.trim().length > 0);
    const hasChatId = Boolean(raw.telegramChatId && raw.telegramChatId.trim().length > 0);

    const [totalSent, totalFailed, lastSent, lastTest] = await Promise.all([
      this.prisma.notificationDeliveryLog.count({ where: { status: 'SENT' } }).catch(() => 0),
      this.prisma.notificationDeliveryLog.count({ where: { status: 'FAILED' } }).catch(() => 0),
      this.prisma.notificationDeliveryLog.findFirst({
        where: { status: 'SENT', eventType: { not: 'TEST_MESSAGE' } },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null),
      this.prisma.notificationDeliveryLog.findFirst({
        where: { eventType: 'TEST_MESSAGE' },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null),
    ]);

    return {
      telegramEnabled: raw.telegramEnabled,
      telegramConfigured: hasToken && hasChatId,
      telegramBotTokenMasked: hasToken ? maskSecret(raw.telegramBotToken) : '',
      telegramChatId: raw.telegramChatId || '',
      telegramChatIdMasked: hasChatId ? maskChatId(raw.telegramChatId) : '',
      cooldownMinutes: raw.cooldownMinutes,
      rateLimitPerMin: raw.rateLimitPerMin,
      notifyCritical: raw.notifyCritical,
      notifyWarning: raw.notifyWarning,
      notifyInfo: raw.notifyInfo,
      notifyHostOffline: raw.notifyHostOffline,
      notifyHostRecovered: raw.notifyHostRecovered,
      notifyServiceDown: raw.notifyServiceDown,
      notifyServiceRecovered: raw.notifyServiceRecovered,
      notifyHighCpu: raw.notifyHighCpu,
      notifyHighRam: raw.notifyHighRam,
      notifyHighDisk: raw.notifyHighDisk,
      notifyDiscoveryNew: raw.notifyDiscoveryNew,
      notifyDiscoveryChange: raw.notifyDiscoveryChange,
      notifyBackupFailed: raw.notifyBackupFailed,
      notifyBackupCompleted: raw.notifyBackupCompleted,
      notifyRestoreFailed: raw.notifyRestoreFailed,
      notifyRestoreCompleted: raw.notifyRestoreCompleted,
      notifyImportFailed: raw.notifyImportFailed,
      lastSentAt: lastSent ? lastSent.createdAt.toISOString() : null,
      lastTestAt: lastTest ? lastTest.createdAt.toISOString() : null,
      totalSentCount: totalSent,
      totalFailedCount: totalFailed,
    };
  }

  /**
   * Update configuration securely (encrypts bot token)
   */
  public async updateConfig(
    input: UpdateNotificationConfigInput,
    requestedBy: string
  ): Promise<NotificationConfigDTO> {
    const raw = await this.getRawConfig();

    const dataToUpdate: any = {};

    if (typeof input.telegramEnabled === 'boolean') {
      dataToUpdate.telegramEnabled = input.telegramEnabled;
    }

    if (input.telegramBotToken !== undefined) {
      const trimmed = input.telegramBotToken.trim();
      // If user provided a new cleartext token (not the masked placeholder)
      if (trimmed && !trimmed.startsWith('********')) {
        dataToUpdate.telegramBotToken = encryptSecret(trimmed);
      } else if (trimmed === '') {
        dataToUpdate.telegramBotToken = null;
      }
    }

    if (input.telegramChatId !== undefined) {
      dataToUpdate.telegramChatId = input.telegramChatId.trim() || null;
    }

    if (input.cooldownMinutes !== undefined) dataToUpdate.cooldownMinutes = input.cooldownMinutes;
    if (input.rateLimitPerMin !== undefined) dataToUpdate.rateLimitPerMin = input.rateLimitPerMin;
    if (input.notifyCritical !== undefined) dataToUpdate.notifyCritical = input.notifyCritical;
    if (input.notifyWarning !== undefined) dataToUpdate.notifyWarning = input.notifyWarning;
    if (input.notifyInfo !== undefined) dataToUpdate.notifyInfo = input.notifyInfo;
    if (input.notifyHostOffline !== undefined) dataToUpdate.notifyHostOffline = input.notifyHostOffline;
    if (input.notifyHostRecovered !== undefined) dataToUpdate.notifyHostRecovered = input.notifyHostRecovered;
    if (input.notifyServiceDown !== undefined) dataToUpdate.notifyServiceDown = input.notifyServiceDown;
    if (input.notifyServiceRecovered !== undefined) dataToUpdate.notifyServiceRecovered = input.notifyServiceRecovered;
    if (input.notifyHighCpu !== undefined) dataToUpdate.notifyHighCpu = input.notifyHighCpu;
    if (input.notifyHighRam !== undefined) dataToUpdate.notifyHighRam = input.notifyHighRam;
    if (input.notifyHighDisk !== undefined) dataToUpdate.notifyHighDisk = input.notifyHighDisk;
    if (input.notifyDiscoveryNew !== undefined) dataToUpdate.notifyDiscoveryNew = input.notifyDiscoveryNew;
    if (input.notifyDiscoveryChange !== undefined) dataToUpdate.notifyDiscoveryChange = input.notifyDiscoveryChange;
    if (input.notifyBackupFailed !== undefined) dataToUpdate.notifyBackupFailed = input.notifyBackupFailed;
    if (input.notifyBackupCompleted !== undefined) dataToUpdate.notifyBackupCompleted = input.notifyBackupCompleted;
    if (input.notifyRestoreFailed !== undefined) dataToUpdate.notifyRestoreFailed = input.notifyRestoreFailed;
    if (input.notifyRestoreCompleted !== undefined) dataToUpdate.notifyRestoreCompleted = input.notifyRestoreCompleted;
    if (input.notifyImportFailed !== undefined) dataToUpdate.notifyImportFailed = input.notifyImportFailed;

    await this.prisma.notificationConfig.update({
      where: { id: raw.id },
      data: dataToUpdate,
    });

    this.cachedConfig = null; // Invalidate cache

    await logChange({
      prisma: this.prisma,
      entityType: 'NotificationConfig',
      entityId: raw.id,
      action: ChangeAction.UPDATE,
      details: `Configuración de notificaciones Telegram actualizada por ${requestedBy}`,
      user: requestedBy,
    });

    return this.getConfig();
  }

  /**
   * Determine if an event type and severity should be sent based on current configuration rules
   */
  private isEventEnabled(config: any, event: NotificationEventPayload): boolean {
    if (!config.telegramEnabled) return false;

    // 1. Severity filter check
    const severity = event.severity || 'WARNING';
    if (severity === 'CRITICAL' && !config.notifyCritical) return false;
    if (severity === 'WARNING' && !config.notifyWarning) return false;
    if (severity === 'INFO' && !config.notifyInfo) return false;

    // 2. Specific event rule checks
    switch (event.eventType) {
      case 'HOST_OFFLINE':
        return config.notifyHostOffline;
      case 'HOST_RECOVERED':
        return config.notifyHostRecovered;
      case 'SERVICE_DOWN':
        return config.notifyServiceDown;
      case 'SERVICE_RECOVERED':
        return config.notifyServiceRecovered;
      case 'HIGH_CPU':
        return config.notifyHighCpu;
      case 'HIGH_RAM':
        return config.notifyHighRam;
      case 'HIGH_DISK':
        return config.notifyHighDisk;
      case 'CRITICAL_ALERT':
        return config.notifyCritical;
      case 'WARNING_ALERT':
        return config.notifyWarning;
      case 'DISCOVERY_NEW_DEVICE':
        return config.notifyDiscoveryNew;
      case 'DISCOVERY_DEVICE_REMOVED':
        return config.notifyDiscoveryChange;
      case 'DISCOVERY_CHANGE':
        return config.notifyDiscoveryChange;
      case 'BACKUP_FAILED':
        return config.notifyBackupFailed;
      case 'BACKUP_COMPLETED':
        return config.notifyBackupCompleted;
      case 'RESTORE_FAILED':
        return config.notifyRestoreFailed;
      case 'RESTORE_COMPLETED':
        return config.notifyRestoreCompleted;
      case 'IMPORT_FAILED':
        return config.notifyImportFailed;
      case 'TEST_MESSAGE':
        return true;
      default:
        return true;
    }
  }

  /**
   * Generate deduplication key for cooldown tracking
   */
  private getCooldownKey(event: NotificationEventPayload): string {
    const entity = event.entityId || event.hostname || event.ip || 'global';
    const subType = event.metricType || event.serviceName || '';
    return `${event.eventType}:${entity}:${subType}`.toLowerCase();
  }

  /**
   * Main dispatch method to process and send alerts to Telegram
   */
  public async notify(event: NotificationEventPayload): Promise<boolean> {
    try {
      const config = await this.getRawConfig();

      // Check if notifications are enabled for this event
      if (!this.isEventEnabled(config, event)) {
        return false;
      }

      if (!config.telegramBotToken || !config.telegramChatId) {
        return false;
      }

      const now = Date.now();
      const cooldownKey = this.getCooldownKey(event);
      const cooldownDurationMs = (config.cooldownMinutes || 15) * 60 * 1000;

      // Handle Recovery events: clear active problem cooldown
      if (event.eventType === 'HOST_RECOVERED') {
        const problemKey = `host_offline:${(event.entityId || event.hostname || event.ip || 'global').toLowerCase()}:`;
        this.cooldownMap.delete(problemKey);
      } else if (event.eventType === 'SERVICE_RECOVERED') {
        const problemKey = `service_down:${(event.entityId || event.hostname || event.ip || 'global').toLowerCase()}:${(event.serviceName || '').toLowerCase()}`;
        this.cooldownMap.delete(problemKey);
      }

      // Check Cooldown for recurring alerts (unless it is a recovery or test message)
      if (event.eventType !== 'TEST_MESSAGE' && !event.eventType.includes('RECOVERED')) {
        const lastSent = this.cooldownMap.get(cooldownKey);
        if (lastSent && now - lastSent < cooldownDurationMs) {
          // Suppressed by cooldown
          return false;
        }
      }

      // Check Rate Limit (sliding 60s window)
      const oneMinuteAgo = now - 60000;
      this.recentSendTimestamps = this.recentSendTimestamps.filter((t) => t > oneMinuteAgo);
      if (this.recentSendTimestamps.length >= (config.rateLimitPerMin || 20)) {
        // Record throttled attempt
        await this.prisma.notificationDeliveryLog.create({
          data: {
            provider: 'TELEGRAM',
            eventType: event.eventType,
            severity: event.severity || 'WARNING',
            recipient: maskChatId(config.telegramChatId),
            title: `Alerta: ${event.eventType}`,
            summary: event.details || event.hostname || 'Throttled by rate limiter',
            status: 'THROTTLED',
            errorMessage: 'Rate limit por minuto superado',
          },
        }).catch(() => {});
        return false;
      }

      // Decrypt bot token
      const botToken = decryptSecret(config.telegramBotToken);
      if (!botToken || botToken.startsWith('********')) {
        console.error('⚠️ Decryption error for Telegram Bot Token');
        return false;
      }

      // Format clean message (zero version strings)
      const formattedMessage = TelegramProvider.formatMessage(event);

      // Send to Telegram
      const result = await TelegramProvider.sendMessage(botToken, config.telegramChatId, formattedMessage);

      // Track rate limiter & cooldown
      this.recentSendTimestamps.push(now);
      if (result.success) {
        this.cooldownMap.set(cooldownKey, now);
      }

      // Record in delivery log
      await this.prisma.notificationDeliveryLog.create({
        data: {
          provider: 'TELEGRAM',
          eventType: event.eventType,
          severity: event.severity || 'WARNING',
          recipient: maskChatId(config.telegramChatId),
          title: `Alerta: ${event.eventType}`,
          summary: event.details || event.hostname || event.ip || 'Alerta enviada',
          status: result.success ? 'SENT' : 'FAILED',
          attempts: result.success ? 1 : 3,
          errorMessage: result.errorMessage || null,
          durationMs: result.durationMs,
        },
      }).catch((err) => {
        console.error('Failed to log notification delivery:', err.message);
      });

      return result.success;
    } catch (err: any) {
      console.error('NotificationService unexpected error:', err.message);
      return false;
    }
  }

  /**
   * Send test message to verify Telegram Bot & Chat ID connection
   */
  public async sendTestMessage(
    requestedBy: string
  ): Promise<{ success: boolean; message: string; durationMs: number }> {
    const config = await this.getRawConfig();

    if (!config.telegramBotToken || !config.telegramChatId) {
      return {
        success: false,
        message: 'No se puede enviar la prueba: El Bot Token o el Chat ID no están configurados.',
        durationMs: 0,
      };
    }

    const botToken = decryptSecret(config.telegramBotToken);
    if (!botToken || botToken.startsWith('********')) {
      return {
        success: false,
        message: 'Error al descifrar el Bot Token.',
        durationMs: 0,
      };
    }

    const testEvent: NotificationEventPayload = {
      eventType: 'TEST_MESSAGE',
      severity: 'INFO',
      hostname: 'SRV-INFRA',
      details: 'Mensaje de prueba de conectividad de IMP',
      timestamp: new Date(),
    };

    const formattedMessage = TelegramProvider.formatMessage(testEvent);
    const result = await TelegramProvider.sendMessage(botToken, config.telegramChatId, formattedMessage);

    // Record delivery
    await this.prisma.notificationDeliveryLog.create({
      data: {
        provider: 'TELEGRAM',
        eventType: 'TEST_MESSAGE',
        severity: 'INFO',
        recipient: maskChatId(config.telegramChatId),
        title: 'Mensaje de prueba',
        summary: `Prueba solicitada por ${requestedBy}`,
        status: result.success ? 'SENT' : 'FAILED',
        attempts: result.success ? 1 : 3,
        errorMessage: result.errorMessage || null,
        durationMs: result.durationMs,
      },
    }).catch(() => {});

    if (result.success) {
      return {
        success: true,
        message: 'Mensaje de prueba enviado con éxito a Telegram.',
        durationMs: result.durationMs,
      };
    } else {
      return {
        success: false,
        message: `Fallo al enviar mensaje de prueba: ${result.errorMessage}`,
        durationMs: result.durationMs,
      };
    }
  }

  /**
   * Get notification delivery history
   */
  public async getHistory(limit: number = 50) {
    return this.prisma.notificationDeliveryLog.findMany({
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
    });
  }
}
