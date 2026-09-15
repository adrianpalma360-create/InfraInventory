import { PrismaClient, ChangeAction } from '@prisma/client';
import { UpdateSettingsInput } from './settings.schema.js';
import { logChange } from '../../utils/changelog.js';

const DEFAULT_SETTINGS: UpdateSettingsInput = {
  organizationName: 'Palma NOC Enterprise',
  primarySubnet: '192.168.1.0/24',
  discoveryTimeoutMs: 600,
  discoveryConcurrency: 32,
  sessionExpiryDays: 7,
  enableAuditLogs: true,
  auditRetentionDays: 90,
};

export class SettingsService {
  constructor(private prisma: PrismaClient) {}

  async getSettings(): Promise<UpdateSettingsInput> {
    const records = await this.prisma.systemSetting.findMany();
    const map = new Map(records.map((r) => [r.key, r.value]));

    return {
      organizationName: map.get('organizationName') || DEFAULT_SETTINGS.organizationName,
      primarySubnet: map.get('primarySubnet') || DEFAULT_SETTINGS.primarySubnet,
      discoveryTimeoutMs: Number(map.get('discoveryTimeoutMs')) || DEFAULT_SETTINGS.discoveryTimeoutMs,
      discoveryConcurrency: Number(map.get('discoveryConcurrency')) || DEFAULT_SETTINGS.discoveryConcurrency,
      sessionExpiryDays: Number(map.get('sessionExpiryDays')) || DEFAULT_SETTINGS.sessionExpiryDays,
      enableAuditLogs: map.has('enableAuditLogs') ? map.get('enableAuditLogs') === 'true' : DEFAULT_SETTINGS.enableAuditLogs,
      auditRetentionDays: Number(map.get('auditRetentionDays')) || DEFAULT_SETTINGS.auditRetentionDays,
    };
  }

  async updateSettings(input: UpdateSettingsInput, requestedBy: string): Promise<UpdateSettingsInput> {
    for (const [key, val] of Object.entries(input)) {
      await this.prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(val) },
        create: { key, value: String(val), description: `System setting: ${key}` },
      });
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Settings',
      entityId: 'global',
      action: ChangeAction.UPDATE,
      details: `Configuración del sistema actualizada por ${requestedBy}`,
      user: requestedBy,
    });

    return this.getSettings();
  }
}
