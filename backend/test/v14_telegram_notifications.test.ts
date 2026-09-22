import { describe, it } from 'node:test';
import assert from 'node:assert';
import { encryptSecret, decryptSecret, maskSecret, maskChatId } from '../src/utils/encryption.js';
import { TelegramProvider } from '../src/modules/notifications/telegram.provider.js';
import { NotificationEventPayload } from '../src/modules/notifications/notification.types.js';

describe('Version 14: Encryption & Masking Utilities', () => {
  it('should encrypt and decrypt a bot token accurately', () => {
    const originalToken = '7123456789:AAFlkjhsdf897sdf_kjhsdf876234_sdf';
    const encrypted = encryptSecret(originalToken);

    assert.ok(encrypted, 'Encrypted token should exist');
    assert.notStrictEqual(encrypted, originalToken);
    assert.strictEqual(encrypted.split(':').length, 3); // iv:tag:ciphertext

    const decrypted = decryptSecret(encrypted);
    assert.strictEqual(decrypted, originalToken);
  });

  it('should safely mask secrets without revealing the core token', () => {
    const originalToken = '7123456789:AAFlkjhsdf897sdf_kjhsdf876234_sdf';
    const masked = maskSecret(originalToken);

    assert.ok(masked, 'Masked secret should exist');
    assert.ok(masked.startsWith('********'), 'Masked secret should start with stars');
    assert.ok(masked.endsWith('_sdf'), 'Masked secret should preserve ending suffix');
    assert.ok(!masked.includes('7123456789'), 'Masked secret must not leak prefix');
  });

  it('should safely mask chat IDs (both user and group format)', () => {
    const userChatId = '123456789';
    const maskedUser = maskChatId(userChatId);
    assert.strictEqual(maskedUser, '12****89');

    const groupChatId = '-1001234567890';
    const maskedGroup = maskChatId(groupChatId);
    assert.strictEqual(maskedGroup, '-100****7890');
  });
});

describe('Version 14: Telegram Message Formatting & Strict Visual Versioning Policy', () => {
  it('should format HOST_OFFLINE message correctly and NEVER contain any version string', () => {
    const payload: NotificationEventPayload = {
      eventType: 'HOST_OFFLINE',
      severity: 'CRITICAL',
      hostname: 'srv-db-master',
      ip: '192.168.1.50',
      details: 'Sin respuesta tras 3 intentos',
      timestamp: new Date('2026-09-22T10:00:00.000Z'),
    };

    const formatted = TelegramProvider.formatMessage(payload);

    // Verify basic HTML format
    assert.ok(formatted.includes('<b>HOST OFFLINE</b>'), 'Should contain bold header');
    assert.ok(formatted.includes('srv-db-master'), 'Should contain hostname');
    assert.ok(formatted.includes('192.168.1.50'), 'Should contain IP');

    // CRITICAL: Ensure NO version string is present anywhere in the message!
    assert.ok(!formatted.toLowerCase().includes('14.0.0'), 'Must not contain 14.0.0');
    assert.ok(!formatted.toLowerCase().includes('v14'), 'Must not contain v14');
    assert.ok(!formatted.toLowerCase().includes('13.0'), 'Must not contain 13.0');
    assert.ok(!formatted.toLowerCase().includes('12.0'), 'Must not contain 12.0');
    assert.ok(!formatted.toLowerCase().includes('11.0'), 'Must not contain 11.0');
    assert.ok(!formatted.toLowerCase().includes('version'), 'Must not contain version keyword');
    assert.ok(!formatted.toLowerCase().includes('versión'), 'Must not contain versión keyword');
  });

  it('should format HOST_RECOVERED message with calculated downtime duration and zero version strings', () => {
    const payload: NotificationEventPayload = {
      eventType: 'HOST_RECOVERED',
      severity: 'INFO',
      hostname: 'srv-db-master',
      ip: '192.168.1.50',
      durationMinutes: 12,
      timestamp: new Date('2026-09-22T10:12:30.000Z'),
    };

    const formatted = TelegramProvider.formatMessage(payload);

    assert.ok(formatted.includes('<b>HOST RECOVERED</b>'));
    assert.ok(formatted.includes('12 min'));
    assert.ok(formatted.includes('srv-db-master'));

    // Zero version strings
    assert.ok(!formatted.toLowerCase().includes('14.0.0'));
    assert.ok(!formatted.toLowerCase().includes('v14'));
    assert.ok(!formatted.toLowerCase().includes('version'));
  });

  it('should format BACKUP_COMPLETED and BACKUP_FAILED messages without version references', () => {
    const payloadSuccess: NotificationEventPayload = {
      eventType: 'BACKUP_COMPLETED',
      severity: 'INFO',
      backupName: 'backup-auto-2026-09-22',
      fileSizeFormatted: '14.5 MB',
    };

    const formattedSuccess = TelegramProvider.formatMessage(payloadSuccess);
    assert.ok(formattedSuccess.includes('backup-auto-2026-09-22'));
    assert.ok(formattedSuccess.includes('14.5 MB'));
    assert.ok(!formattedSuccess.toLowerCase().includes('14.0.0'));
    assert.ok(!formattedSuccess.toLowerCase().includes('v14'));
    assert.ok(!formattedSuccess.toLowerCase().includes('version'));

    const payloadFail: NotificationEventPayload = {
      eventType: 'BACKUP_FAILED',
      severity: 'CRITICAL',
      backupName: 'backup-auto-2026-09-22',
      details: 'Disk full',
    };

    const formattedFail = TelegramProvider.formatMessage(payloadFail);
    assert.ok(formattedFail.includes('Disk full'));
    assert.ok(!formattedFail.toLowerCase().includes('14.0.0'));
  });

  it('should format DISCOVERY and ANOMALY messages cleanly', () => {
    const payloadDiscovery: NotificationEventPayload = {
      eventType: 'DISCOVERY_NEW_DEVICE',
      severity: 'INFO',
      ip: '192.168.1.105',
      hostname: 'switch-core-01',
      details: 'Cisco Catalyst Switch (4 puertos abiertos)',
    };

    const formattedDiscovery = TelegramProvider.formatMessage(payloadDiscovery);
    assert.ok(formattedDiscovery.includes('192.168.1.105'));
    assert.ok(formattedDiscovery.includes('switch-core-01'));
    assert.ok(!formattedDiscovery.toLowerCase().includes('14.0.0'));
  });
});
