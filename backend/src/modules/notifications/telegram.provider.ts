import { NotificationEventPayload, TelegramSendResult } from './notification.types.js';

export class TelegramProvider {
  /**
   * Format NotificationEventPayload into clean Telegram HTML/Markdown message
   * RULE: Absolutely NO version numbers in Telegram messages.
   */
  public static formatMessage(event: NotificationEventPayload): string {
    const now = event.timestamp || new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const dateTimeFormatted = `${dateStr} ${timeStr}`;

    switch (event.eventType) {
      case 'TEST_MESSAGE': {
        return (
          `🔔 <b>InfraInventory</b>\n\n` +
          `Mensaje de prueba correctamente enviado.\n\n` +
          `<b>Servidor:</b> ${event.hostname || 'SRV-INFRA'}\n` +
          `<b>Fecha:</b> ${dateTimeFormatted}\n` +
          `<b>Estado:</b> 🟢 CONECTADO`
        );
      }

      case 'HOST_OFFLINE': {
        return (
          `🔴 <b>HOST OFFLINE</b>\n\n` +
          `<b>Host:</b> <code>${event.hostname || 'Desconocido'}</code>\n` +
          (event.ip ? `<b>IP:</b> <code>${event.ip}</code>\n` : '') +
          `<b>Último estado:</b> ONLINE\n` +
          `<b>Detectado:</b> ${timeStr}\n` +
          (event.durationMinutes ? `<b>Duración:</b> ${event.durationMinutes} min\n` : '') +
          (event.details ? `<b>Detalle:</b> ${event.details}\n` : '')
        );
      }

      case 'HOST_RECOVERED': {
        return (
          `🟢 <b>HOST RECOVERED</b>\n\n` +
          `<b>Host:</b> <code>${event.hostname || 'Desconocido'}</code>\n` +
          (event.ip ? `<b>IP:</b> <code>${event.ip}</code>\n` : '') +
          (event.durationMinutes ? `<b>Tiempo caído:</b> ${event.durationMinutes} min\n` : '') +
          `<b>Estado:</b> 🟢 ONLINE\n` +
          `<b>Hora:</b> ${timeStr}`
        );
      }

      case 'SERVICE_DOWN': {
        return (
          `🔴 <b>SERVICE DOWN</b>\n\n` +
          `<b>Host:</b> <code>${event.hostname || 'Desconocido'}</code>\n` +
          (event.ip ? `<b>IP:</b> <code>${event.ip}</code>\n` : '') +
          `<b>Servicio:</b> ${event.serviceName || 'Desconocido'}` + (event.port ? ` (Puerto ${event.port})` : '') + `\n` +
          `<b>Estado:</b> DOWN\n` +
          `<b>Detectado:</b> ${timeStr}\n` +
          (event.details ? `<b>Error:</b> ${event.details}\n` : '')
        );
      }

      case 'SERVICE_RECOVERED': {
        return (
          `🟢 <b>SERVICE RECOVERED</b>\n\n` +
          `<b>Host:</b> <code>${event.hostname || 'Desconocido'}</code>\n` +
          `<b>Servicio:</b> ${event.serviceName || 'Desconocido'}` + (event.port ? ` (Puerto ${event.port})` : '') + `\n` +
          (event.durationMinutes ? `<b>Duración corte:</b> ${event.durationMinutes} min\n` : '') +
          `<b>Estado:</b> 🟢 OPERATIVO\n` +
          `<b>Hora:</b> ${timeStr}`
        );
      }

      case 'HIGH_CPU':
      case 'HIGH_RAM':
      case 'HIGH_DISK': {
        const icon = event.severity === 'CRITICAL' ? '🔴' : '🟠';
        const metricName = event.eventType === 'HIGH_CPU' ? 'CPU' : event.eventType === 'HIGH_RAM' ? 'Memoria RAM' : 'Disco';
        return (
          `🚨 <b>INFRAALERT - ${metricName.toUpperCase()}</b>\n\n` +
          `${icon} <b>Severidad:</b> ${event.severity || 'WARNING'}\n` +
          `<b>Host:</b> <code>${event.hostname || 'Desconocido'}</code>\n` +
          (event.ip ? `<b>IP:</b> <code>${event.ip}</code>\n` : '') +
          `<b>Problema:</b> Uso de ${metricName} elevado\n` +
          (event.currentValue ? `<b>Valor:</b> ${event.currentValue}%\n` : '') +
          (event.thresholdValue ? `<b>Umbral:</b> ${event.thresholdValue}%\n` : '') +
          `<b>Detectado:</b> ${dateTimeFormatted}\n` +
          `<b>Estado:</b> ACTIVE`
        );
      }

      case 'CRITICAL_ALERT':
      case 'WARNING_ALERT': {
        const icon = event.eventType === 'CRITICAL_ALERT' ? '🔴' : '🟠';
        const title = event.eventType === 'CRITICAL_ALERT' ? 'CRITICAL ALERT' : 'WARNING ALERT';
        return (
          `🚨 <b>INFRAALERT</b>\n\n` +
          `${icon} <b>${title}</b>\n` +
          `<b>Host:</b> <code>${event.hostname || 'Infraestructura'}</code>\n` +
          (event.ip ? `<b>IP:</b> <code>${event.ip}</code>\n` : '') +
          (event.details ? `<b>Problema:</b> ${event.details}\n` : '') +
          (event.currentValue ? `<b>Valor:</b> ${event.currentValue}\n` : '') +
          `<b>Detectado:</b> ${dateTimeFormatted}\n` +
          `<b>Estado:</b> ACTIVE`
        );
      }

      case 'DISCOVERY_NEW_DEVICE': {
        return (
          `🆕 <b>NEW DEVICE DISCOVERED</b>\n\n` +
          `<b>IP:</b> <code>${event.ip || 'Desconocida'}</code>\n` +
          `<b>Hostname:</b> ${event.hostname || 'UNKNOWN'}\n` +
          (event.macAddress ? `<b>MAC:</b> <code>${event.macAddress}</code>\n` : '') +
          (event.details ? `<b>Tipo:</b> ${event.details}\n` : '') +
          `<b>Detectado:</b> ${timeStr}`
        );
      }

      case 'DISCOVERY_DEVICE_REMOVED': {
        return (
          `⚠️ <b>DEVICE REMOVED FROM NETWORK</b>\n\n` +
          `<b>IP:</b> <code>${event.ip || 'Desconocida'}</code>\n` +
          `<b>Hostname:</b> ${event.hostname || 'UNKNOWN'}\n` +
          `<b>Hora:</b> ${timeStr}`
        );
      }

      case 'DISCOVERY_CHANGE': {
        return (
          `🔄 <b>DEVICE CHANGE DETECTED</b>\n\n` +
          `<b>Host:</b> <code>${event.hostname || event.ip || 'Desconocido'}</code>\n` +
          (event.ip ? `<b>IP:</b> <code>${event.ip}</code>\n` : '') +
          `<b>Cambio:</b> ${event.changeDetails || event.details || 'Cambio en topología o puertos'}\n` +
          `<b>Detectado:</b> ${timeStr}`
        );
      }

      case 'BACKUP_FAILED': {
        return (
          `🔴 <b>BACKUP FAILED</b>\n\n` +
          `<b>Backup:</b> <code>${event.backupName || 'Backup automático'}</code>\n` +
          `<b>Motivo:</b> ${event.details || 'Fallo en la generación del dump'}\n` +
          `<b>Fecha:</b> ${dateTimeFormatted}`
        );
      }

      case 'BACKUP_COMPLETED': {
        return (
          `🟢 <b>BACKUP COMPLETED</b>\n\n` +
          `<b>Backup:</b> <code>${event.backupName || 'Copia de seguridad'}</code>\n` +
          (event.fileSizeFormatted ? `<b>Tamaño:</b> ${event.fileSizeFormatted}\n` : '') +
          `<b>Fecha:</b> ${dateTimeFormatted}`
        );
      }

      case 'RESTORE_FAILED': {
        return (
          `🔴 <b>RESTORE FAILED</b>\n\n` +
          `<b>Backup:</b> <code>${event.backupName || 'Restauración'}</code>\n` +
          `<b>Motivo:</b> ${event.details || 'Error en transacción de restauración'}\n` +
          `<b>Fecha:</b> ${dateTimeFormatted}`
        );
      }

      case 'RESTORE_COMPLETED': {
        return (
          `🟢 <b>RESTORE COMPLETED</b>\n\n` +
          `<b>Backup:</b> <code>${event.backupName || 'Restauración'}</code>\n` +
          (event.details ? `<b>Resumen:</b> ${event.details}\n` : '') +
          `<b>Fecha:</b> ${dateTimeFormatted}`
        );
      }

      case 'IMPORT_FAILED': {
        return (
          `🔴 <b>INVENTORY IMPORT FAILED</b>\n\n` +
          `<b>Detalle:</b> ${event.details || 'Error en la importación de inventario'}\n` +
          `<b>Fecha:</b> ${dateTimeFormatted}`
        );
      }

      default: {
        return (
          `ℹ️ <b>INFRAINVENTORY NOTIFICACIÓN</b>\n\n` +
          (event.hostname ? `<b>Host:</b> <code>${event.hostname}</code>\n` : '') +
          (event.details ? `<b>Mensaje:</b> ${event.details}\n` : '') +
          `<b>Fecha:</b> ${dateTimeFormatted}`
        );
      }
    }
  }

  /**
   * Send notification to Telegram Bot API with 3-attempt retry & backoff
   * @param botToken Decrypted Bot Token
   * @param chatId Telegram chat ID (group, channel, or direct user)
   * @param message Text message (HTML formatted)
   */
  public static async sendMessage(
    botToken: string,
    chatId: string,
    message: string
  ): Promise<TelegramSendResult> {
    const startTime = Date.now();
    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();

    if (!cleanToken || !cleanChatId) {
      return {
        success: false,
        errorMessage: 'Bot Token o Chat ID no configurados',
        durationMs: Date.now() - startTime,
      };
    }

    const endpoint = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const maxAttempts = 3;
    const backoffMs = [500, 1500, 3000];

    let lastError: string | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleanChatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data: any = await response.json().catch(() => ({}));

        if (response.ok && data.ok) {
          return {
            success: true,
            messageId: data.result?.message_id,
            durationMs: Date.now() - startTime,
          };
        }

        // Telegram returned an API error (e.g. 400 bad request, 401 unauthorized, 403 forbidden)
        const errorDesc = data.description || `HTTP ${response.status} ${response.statusText}`;
        lastError = `Telegram API Error: ${errorDesc}`;

        // If it's a permanent 401 / 400 / 403 (unauthorized token or invalid chat_id), don't retry pointlessly
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          break;
        }
      } catch (err: any) {
        // Strip out bot token if present in error message string for security
        let safeError = err.message || 'Network timeout';
        if (safeError.includes(cleanToken)) {
          safeError = safeError.replace(cleanToken, '********');
        }
        lastError = `Fallo de conexión con Telegram: ${safeError}`;
      }

      // Wait backoff if not last attempt
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt - 1] || 1000));
      }
    }

    return {
      success: false,
      errorMessage: lastError || 'Error desconocido al enviar mensaje a Telegram',
      durationMs: Date.now() - startTime,
    };
  }
}
