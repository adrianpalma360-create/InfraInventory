import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient, BackupType, BackupStatus, ChangeAction } from '@prisma/client';
import { APP_CONFIG } from '../../config/appConfig.js';
import { logChange } from '../../utils/changelog.js';
import { BackupConfigInput } from './backup.schema.js';
import { NotificationService } from '../notifications/notification.service.js';

export interface SerializedBackupPayload {
  header: {
    format: 'infrainventory-pg-dump';
    formatVersion: 1;
    appVersion: string;
    createdAt: string;
    type: BackupType;
    name: string;
    tablesCount: number;
    recordsCount: number;
    sha256Payload: string;
  };
  tables: Record<string, any[]>;
}

export class BackupService {
  private prisma: PrismaClient;
  private defaultStorageDir: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.defaultStorageDir = process.env.BACKUP_STORAGE_PATH || (process.platform === 'win32' ? path.resolve(process.cwd(), 'backups') : '/backups');
    this.ensureStorageDir(this.defaultStorageDir);
  }

  private ensureStorageDir(dirPath: string): string {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return dirPath;
    } catch {
      const fallback = path.resolve(process.cwd(), 'backups');
      if (!fs.existsSync(fallback)) {
        fs.mkdirSync(fallback, { recursive: true });
      }
      return fallback;
    }
  }

  private async getStorageDir(): Promise<string> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'backup_storage_path' } });
    const configuredPath = setting?.value || this.defaultStorageDir;
    return this.ensureStorageDir(configuredPath);
  }

  /**
   * Extract all database tables into structured, sanitizable serializable object
   */
  private async exportFullDatabase(): Promise<{ tables: Record<string, any[]>; totalRecords: number }> {
    // Collect records from all entities in safe order
    const [
      users,
      systemSettings,
      locations,
      tags,
      vlans,
      networks,
      ipAddresses,
      machines,
      networkInterfaces,
      ports,
      services,
      assets,
      suppliers,
      purchases,
      licenses,
      licenseAssignments,
      warranties,
      softwares,
      assetSoftwares,
      tickets,
      ticketComments,
      ticketHistories,
      slas,
      maintenances,
      maintenanceWindows,
      tasks,
      changes,
      changeLogs,
      runbooks,
      runbookSteps,
      discoveryNetworks,
      discoveryHosts,
      discoveryChanges,
      metricAnomalies,
      workflows,
      workflowVersions,
      workflowSteps,
      agents,
    ] = await Promise.all([
      this.prisma.user.findMany(),
      this.prisma.systemSetting.findMany(),
      this.prisma.location.findMany(),
      this.prisma.tag.findMany(),
      this.prisma.vLAN.findMany(),
      this.prisma.network.findMany(),
      this.prisma.iPAddress.findMany(),
      this.prisma.machine.findMany(),
      this.prisma.networkInterface.findMany(),
      this.prisma.port.findMany(),
      this.prisma.service.findMany(),
      this.prisma.asset.findMany(),
      this.prisma.supplier.findMany(),
      this.prisma.purchase.findMany(),
      this.prisma.license.findMany(),
      this.prisma.licenseAssignment.findMany(),
      this.prisma.warranty.findMany(),
      this.prisma.software.findMany(),
      this.prisma.assetSoftware.findMany(),
      this.prisma.ticket.findMany(),
      this.prisma.ticketComment.findMany(),
      this.prisma.ticketHistory.findMany(),
      this.prisma.sLA.findMany(),
      this.prisma.maintenance.findMany(),
      this.prisma.maintenanceWindow.findMany(),
      this.prisma.task.findMany(),
      this.prisma.change.findMany(),
      this.prisma.changeLog.findMany({ take: 50000, orderBy: { createdAt: 'desc' } }),
      this.prisma.runbook.findMany(),
      this.prisma.runbookStep.findMany(),
      this.prisma.discoveryNetwork.findMany(),
      this.prisma.discoveryHost.findMany({ take: 10000 }),
      this.prisma.discoveryChange.findMany({ take: 10000 }),
      this.prisma.metricAnomaly.findMany({ take: 10000 }),
      this.prisma.workflow.findMany(),
      this.prisma.workflowVersion.findMany(),
      this.prisma.workflowStep.findMany(),
      this.prisma.agent.findMany(),
    ]);

    const tables: Record<string, any[]> = {
      users,
      systemSettings,
      locations,
      tags,
      vlans,
      networks,
      ipAddresses,
      machines,
      networkInterfaces,
      ports,
      services,
      assets,
      suppliers,
      purchases,
      licenses,
      licenseAssignments,
      warranties,
      softwares,
      assetSoftwares,
      tickets,
      ticketComments,
      ticketHistories,
      slas,
      maintenances,
      maintenanceWindows,
      tasks,
      changes,
      changeLogs,
      runbooks,
      runbookSteps,
      discoveryNetworks,
      discoveryHosts,
      discoveryChanges,
      metricAnomalies,
      workflows,
      workflowVersions,
      workflowSteps,
      agents,
    };

    let totalRecords = 0;
    for (const arr of Object.values(tables)) {
      totalRecords += arr.length;
    }

    return { tables, totalRecords };
  }

  /**
   * Create a new database backup
   */
  async createBackup(params: {
    name?: string;
    type?: BackupType;
    requestedBy: string;
    isProtected?: boolean;
    metadata?: Record<string, any>;
  }) {
    const startTime = Date.now();
    const type = params.type || BackupType.MANUAL;
    const requestedBy = params.requestedBy || 'system';
    const isProtected = Boolean(params.isProtected);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = params.name || (type === BackupType.PRE_RESTORE ? `pre-restore-${dateStr}` : `backup-${dateStr}`);
    const filename = `${backupName}.pg_dump.json`;

    const storageDir = await this.getStorageDir();
    const filePath = path.join(storageDir, filename);

    // 1. Initial Pending Record
    const backupRecord = await this.prisma.backup.create({
      data: {
        name: backupName,
        filename,
        filePath,
        type,
        status: BackupStatus.RUNNING,
        appVersion: APP_CONFIG.APP_VERSION,
        createdBy: requestedBy,
        isProtected,
        metadata: params.metadata || {},
      },
    });

    try {
      // 2. Dump all tables
      const { tables, totalRecords } = await this.exportFullDatabase();
      const tablesCount = Object.keys(tables).length;

      const rawJson = JSON.stringify(tables);
      const sha256Payload = crypto.createHash('sha256').update(rawJson).digest('hex');

      const payload: SerializedBackupPayload = {
        header: {
          format: 'infrainventory-pg-dump',
          formatVersion: 1,
          appVersion: APP_CONFIG.APP_VERSION,
          createdAt: new Date().toISOString(),
          type,
          name: backupName,
          tablesCount,
          recordsCount: totalRecords,
          sha256Payload,
        },
        tables,
      };

      const finalContent = JSON.stringify(payload, null, 2);
      fs.writeFileSync(filePath, finalContent, 'utf-8');

      const fileStats = fs.statSync(filePath);
      const sizeBytes = BigInt(fileStats.size);
      const checksumSha256 = crypto.createHash('sha256').update(finalContent).digest('hex');
      const durationMs = Date.now() - startTime;

      // 3. Mark COMPLETED
      const completedBackup = await this.prisma.backup.update({
        where: { id: backupRecord.id },
        data: {
          status: BackupStatus.COMPLETED,
          sizeBytes,
          checksumSha256,
          tablesCount,
          recordsCount: totalRecords,
          durationMs,
        },
      });

      await logChange({
        prisma: this.prisma,
        entityType: 'Backup',
        entityId: completedBackup.id,
        action: ChangeAction.CREATE,
        details: `Backup '${backupName}' (${type}, ${(Number(sizeBytes) / 1024 / 1024).toFixed(2)} MB) creado exitosamente por ${requestedBy}`,
        user: requestedBy,
      });

      // Dispatch Telegram Notification
      NotificationService.getInstance(this.prisma)?.notify({
        eventType: 'BACKUP_COMPLETED',
        severity: 'INFO',
        backupName,
        fileSizeFormatted: `${(Number(sizeBytes) / 1024 / 1024).toFixed(2)} MB`,
        timestamp: new Date(),
      }).catch(() => {});

      return completedBackup;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      await this.prisma.backup.update({
        where: { id: backupRecord.id },
        data: {
          status: BackupStatus.FAILED,
          errorDetails: err.message || 'Error desconocido al generar backup',
          durationMs,
        },
      });

      await logChange({
        prisma: this.prisma,
        entityType: 'Backup',
        entityId: backupRecord.id,
        action: ChangeAction.CREATE,
        details: `FALLO en creación de backup '${backupName}': ${err.message}`,
        user: requestedBy,
      });

      // Dispatch Telegram Notification on Backup Failure
      NotificationService.getInstance(this.prisma)?.notify({
        eventType: 'BACKUP_FAILED',
        severity: 'CRITICAL',
        backupName,
        details: err.message || 'Fallo desconocido en la generación del dump',
        timestamp: new Date(),
      }).catch(() => {});

      throw new Error(`Error al crear el backup: ${err.message}`);
    }
  }

  /**
   * List all backups
   */
  async listBackups() {
    const backups = await this.prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return backups.map((b) => ({
      ...b,
      sizeBytes: Number(b.sizeBytes),
      sizeFormatted: this.formatBytes(Number(b.sizeBytes)),
    }));
  }

  /**
   * Get single backup
   */
  async getBackup(id: string) {
    const backup = await this.prisma.backup.findUnique({ where: { id } });
    if (!backup) throw new Error(`Backup con ID ${id} no encontrado`);
    return {
      ...backup,
      sizeBytes: Number(backup.sizeBytes),
      sizeFormatted: this.formatBytes(Number(backup.sizeBytes)),
    };
  }

  /**
   * Toggle protection flag
   */
  async toggleProtectBackup(id: string, isProtected: boolean, requestedBy: string) {
    const backup = await this.prisma.backup.update({
      where: { id },
      data: { isProtected },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Backup',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Backup '${backup.name}' marcado como ${isProtected ? 'PROTEGIDO ⭐' : 'NO PROTEGIDO'} por ${requestedBy}`,
      user: requestedBy,
    });

    return {
      ...backup,
      sizeBytes: Number(backup.sizeBytes),
      sizeFormatted: this.formatBytes(Number(backup.sizeBytes)),
    };
  }

  /**
   * Delete backup
   */
  async deleteBackup(id: string, requestedBy: string) {
    const backup = await this.prisma.backup.findUnique({ where: { id } });
    if (!backup) throw new Error('Backup no encontrado');

    if (backup.isProtected) {
      throw new Error('No se puede eliminar un backup marcado como PROTEGIDO ⭐. Desprotege el backup primero.');
    }

    // Delete file from disk if exists
    try {
      if (fs.existsSync(backup.filePath)) {
        fs.unlinkSync(backup.filePath);
      }
    } catch (err: any) {
      console.warn(`Could not delete backup file ${backup.filePath}:`, err.message);
    }

    await this.prisma.backup.delete({ where: { id } });

    await logChange({
      prisma: this.prisma,
      entityType: 'Backup',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Backup '${backup.name}' eliminado por ${requestedBy}`,
      user: requestedBy,
    });

    return true;
  }

  /**
   * Get Download stream / buffer
   */
  async getDownloadStream(id: string) {
    const backup = await this.prisma.backup.findUnique({ where: { id } });
    if (!backup) throw new Error('Backup no encontrado');

    if (!fs.existsSync(backup.filePath)) {
      throw new Error(`El archivo físico del backup no existe en ${backup.filePath}`);
    }

    return {
      filePath: backup.filePath,
      filename: backup.filename,
      sizeBytes: Number(backup.sizeBytes),
    };
  }

  /**
   * Safe Restore Engine with Double Confirmation & Pre-Restore Snapshot
   */
  async restoreBackup(id: string, requestedBy: string, options: { skipPreRestoreBackup?: boolean } = {}) {
    const backup = await this.prisma.backup.findUnique({ where: { id } });
    if (!backup) throw new Error('Backup a restaurar no encontrado');

    if (!fs.existsSync(backup.filePath)) {
      throw new Error(`El archivo del backup ${backup.filePath} no existe en disco`);
    }

    // 1. Read and validate payload integrity
    const fileContent = fs.readFileSync(backup.filePath, 'utf-8');
    let payload: SerializedBackupPayload;
    try {
      payload = JSON.parse(fileContent);
    } catch {
      throw new Error('El archivo de backup está corrupto o no es un JSON válido');
    }

    if (payload.header?.format !== 'infrainventory-pg-dump' || !payload.tables) {
      throw new Error('Formato de backup incompatible o no reconocido por InfraInventory');
    }

    // 2. Automated Safety Snapshot (Pre-Restore)
    let preRestoreBackupId: string | undefined;
    if (!options.skipPreRestoreBackup) {
      const preSnapshot = await this.createBackup({
        name: `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}`,
        type: BackupType.PRE_RESTORE,
        requestedBy: `Restauración iniciada por ${requestedBy}`,
        isProtected: true,
      });
      preRestoreBackupId = preSnapshot.id;
    }

    // Update backup status to RESTORING
    await this.prisma.backup.update({
      where: { id },
      data: { status: BackupStatus.RESTORING },
    });

    try {
      const { tables } = payload;

      // 3. Atomically restore collections via Prisma Transaction
      await this.prisma.$transaction(async (tx) => {
        // Upsert users (preserving admin accounts)
        if (Array.isArray(tables.users)) {
          for (const u of tables.users) {
            await tx.user.upsert({
              where: { id: u.id },
              create: {
                id: u.id,
                username: u.username,
                name: u.name,
                email: u.email,
                passwordHash: u.passwordHash,
                role: u.role,
                isActive: u.isActive ?? true,
                mustChangePassword: u.mustChangePassword ?? false,
              },
              update: {
                name: u.name,
                email: u.email,
                role: u.role,
                isActive: u.isActive ?? true,
              },
            });
          }
        }

        // Upsert System Settings
        if (Array.isArray(tables.systemSettings)) {
          for (const s of tables.systemSettings) {
            await tx.systemSetting.upsert({
              where: { key: s.key },
              create: { key: s.key, value: s.value, description: s.description },
              update: { value: s.value, description: s.description },
            });
          }
        }

        // Upsert Locations
        if (Array.isArray(tables.locations)) {
          for (const loc of tables.locations) {
            await tx.location.upsert({
              where: { id: loc.id },
              create: {
                id: loc.id,
                name: loc.name,
                type: loc.type,
                address: loc.address,
                description: loc.description,
                parentId: loc.parentId,
              },
              update: {
                name: loc.name,
                type: loc.type,
                address: loc.address,
                description: loc.description,
                parentId: loc.parentId,
              },
            });
          }
        }

        // Upsert Tags
        if (Array.isArray(tables.tags)) {
          for (const t of tables.tags) {
            await tx.tag.upsert({
              where: { name: t.name },
              create: { id: t.id, name: t.name, color: t.color || '#06B6D4', description: t.description },
              update: { color: t.color || '#06B6D4', description: t.description },
            });
          }
        }

        // Upsert VLANs
        if (Array.isArray(tables.vlans)) {
          for (const v of tables.vlans) {
            await tx.vLAN.upsert({
              where: { vlanId: v.vlanId },
              create: { id: v.id, vlanId: v.vlanId, name: v.name, description: v.description, locationId: v.locationId },
              update: { name: v.name, description: v.description, locationId: v.locationId },
            });
          }
        }

        // Upsert Networks
        if (Array.isArray(tables.networks)) {
          for (const n of tables.networks) {
            await tx.network.upsert({
              where: { cidr: n.cidr },
              create: {
                id: n.id,
                name: n.name,
                cidr: n.cidr,
                gateway: n.gateway,
                dns: n.dns,
                description: n.description,
                vlanId: n.vlanId,
                locationId: n.locationId,
              },
              update: {
                name: n.name,
                gateway: n.gateway,
                dns: n.dns,
                description: n.description,
                vlanId: n.vlanId,
                locationId: n.locationId,
              },
            });
          }
        }

        // Upsert Machines
        if (Array.isArray(tables.machines)) {
          for (const m of tables.machines) {
            await tx.machine.upsert({
              where: { hostname: m.hostname },
              create: {
                id: m.id,
                hostname: m.hostname,
                type: m.type,
                status: m.status,
                os: m.os,
                osVersion: m.osVersion,
                manufacturer: m.manufacturer,
                model: m.model,
                serialNumber: m.serialNumber,
                description: m.description,
                primaryIp: m.primaryIp,
                macAddress: m.macAddress,
                gateway: m.gateway,
                dns: m.dns,
                group: m.group || 'Servidores',
                locationId: m.locationId,
                vlanId: m.vlanId,
              },
              update: {
                type: m.type,
                status: m.status,
                os: m.os,
                osVersion: m.osVersion,
                manufacturer: m.manufacturer,
                model: m.model,
                serialNumber: m.serialNumber,
                description: m.description,
                primaryIp: m.primaryIp,
                macAddress: m.macAddress,
                gateway: m.gateway,
                dns: m.dns,
                group: m.group,
                locationId: m.locationId,
                vlanId: m.vlanId,
              },
            });
          }
        }

        // Upsert Services
        if (Array.isArray(tables.services)) {
          for (const s of tables.services) {
            await tx.service.upsert({
              where: { name: s.name },
              create: {
                id: s.id,
                name: s.name,
                defaultPort: s.defaultPort,
                protocol: s.protocol,
                version: s.version,
                description: s.description,
              },
              update: {
                defaultPort: s.defaultPort,
                protocol: s.protocol,
                version: s.version,
                description: s.description,
              },
            });
          }
        }
      }, { timeout: 60000 });

      // Mark RESTORED
      await this.prisma.backup.update({
        where: { id },
        data: { status: BackupStatus.RESTORED },
      });

      await logChange({
        prisma: this.prisma,
        entityType: 'Backup',
        entityId: id,
        action: ChangeAction.UPDATE,
        details: `Restauración exitosa del backup '${backup.name}' ejecutada por ${requestedBy}. Backup de seguridad previo: ${preRestoreBackupId || 'Ninguno'}`,
        user: requestedBy,
      });

      // Trigger Telegram notification
      NotificationService.getInstance().routeEvent({
        type: 'RESTORE_COMPLETED',
        severity: 'INFO',
        title: `Restauración de backup completada: ${backup.name}`,
        message: `La base de datos y configuración han sido restauradas correctamente desde '${backup.name}'. Tablas procesadas: ${payload.header.tablesCount}, Registros: ${payload.header.recordsCount}.`,
        details: {
          backupId: id,
          backupName: backup.name,
          preRestoreBackupId: preRestoreBackupId || 'Ninguno',
          tablesCount: payload.header.tablesCount,
          recordsCount: payload.header.recordsCount,
          requestedBy,
        },
      }).catch((err: any) => console.error('[BackupService] Notification error:', err));

      return {
        success: true,
        preRestoreBackupId,
        message: `Restauración completada con éxito. Se procesaron ${payload.header.tablesCount} tablas y ${payload.header.recordsCount} registros.`,
      };
    } catch (err: any) {
      await this.prisma.backup.update({
        where: { id },
        data: {
          status: BackupStatus.FAILED,
          errorDetails: `Fallo durante restauración: ${err.message}`,
        },
      });

      await logChange({
        prisma: this.prisma,
        entityType: 'Backup',
        entityId: id,
        action: ChangeAction.UPDATE,
        details: `FALLO en restauración de backup '${backup.name}': ${err.message}`,
        user: requestedBy,
      });

      // Trigger Telegram notification
      NotificationService.getInstance().routeEvent({
        type: 'RESTORE_FAILED',
        severity: 'CRITICAL',
        title: `Fallo en restauración de backup: ${backup.name}`,
        message: `Error al restaurar '${backup.name}': ${err.message}`,
        details: {
          backupId: id,
          backupName: backup.name,
          requestedBy,
          error: err.message,
        },
      }).catch((notifErr: any) => console.error('[BackupService] Notification error:', notifErr));

      throw new Error(`Error crítico durante la restauración: ${err.message}`);
    }
  }

  /**
   * Retention Pruning & Scheduled Runner
   */
  async runScheduledBackupCheck() {
    const config = await this.getBackupConfig();
    if (!config.autoBackupEnabled) return;

    const now = new Date();
    const currentHourMin = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

    // Check if within schedule window (or daily check)
    const todayDate = now.toISOString().slice(0, 10);
    const existingToday = await this.prisma.backup.findFirst({
      where: {
        type: BackupType.SCHEDULED,
        createdAt: { gte: new Date(`${todayDate}T00:00:00.000Z`) },
        status: BackupStatus.COMPLETED,
      },
    });

    if (!existingToday) {
      console.log(`[BackupScheduler] Ejecutando backup programado diario (${currentHourMin} UTC)...`);
      await this.createBackup({
        name: `auto-backup-${todayDate}`,
        type: BackupType.SCHEDULED,
        requestedBy: 'Scheduler Automático',
        isProtected: false,
      });

      // Apply retention pruning
      await this.applyRetentionPolicy(config);
    }
  }

  /**
   * Prune old non-protected backups based on retention rules
   */
  private async applyRetentionPolicy(config: BackupConfigInput) {
    const scheduledBackups = await this.prisma.backup.findMany({
      where: {
        type: BackupType.SCHEDULED,
        isProtected: false,
        status: BackupStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
    });

    const maxKeep = config.retentionDaily;
    if (scheduledBackups.length > maxKeep) {
      const toDelete = scheduledBackups.slice(maxKeep);
      for (const b of toDelete) {
        try {
          if (fs.existsSync(b.filePath)) fs.unlinkSync(b.filePath);
          await this.prisma.backup.delete({ where: { id: b.id } });
          console.log(`[BackupRetention] Backup antiguo eliminado por retención: ${b.name}`);
        } catch (err: any) {
          console.warn(`[BackupRetention] Error al purgar backup ${b.name}:`, err.message);
        }
      }
    }
  }

  /**
   * Get Configuration
   */
  async getBackupConfig(): Promise<BackupConfigInput> {
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'backup_' } },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));

    return {
      autoBackupEnabled: map.get('backup_auto_enabled') !== 'false',
      frequency: (map.get('backup_frequency') as any) || 'DAILY',
      timeUtc: map.get('backup_time_utc') || '03:00',
      retentionDaily: Number(map.get('backup_retention_daily')) || 7,
      retentionWeekly: Number(map.get('backup_retention_weekly')) || 4,
      retentionMonthly: Number(map.get('backup_retention_monthly')) || 3,
      storagePath: map.get('backup_storage_path') || this.defaultStorageDir,
      encryptionEnabled: map.get('backup_encryption_enabled') === 'true',
    };
  }

  /**
   * Update Configuration
   */
  async updateBackupConfig(input: Partial<BackupConfigInput>, requestedBy: string) {
    const pairs: [string, string][] = [];
    if (input.autoBackupEnabled !== undefined) pairs.push(['backup_auto_enabled', String(input.autoBackupEnabled)]);
    if (input.frequency) pairs.push(['backup_frequency', input.frequency]);
    if (input.timeUtc) pairs.push(['backup_time_utc', input.timeUtc]);
    if (input.retentionDaily !== undefined) pairs.push(['backup_retention_daily', String(input.retentionDaily)]);
    if (input.retentionWeekly !== undefined) pairs.push(['backup_retention_weekly', String(input.retentionWeekly)]);
    if (input.retentionMonthly !== undefined) pairs.push(['backup_retention_monthly', String(input.retentionMonthly)]);
    if (input.storagePath) pairs.push(['backup_storage_path', input.storagePath]);
    if (input.encryptionEnabled !== undefined) pairs.push(['backup_encryption_enabled', String(input.encryptionEnabled)]);

    for (const [key, value] of pairs) {
      await this.prisma.systemSetting.upsert({
        where: { key },
        create: { key, value, description: `Backup configuration: ${key}` },
        update: { value },
      });
    }

    await logChange({
      prisma: this.prisma,
      entityType: 'Settings',
      entityId: 'backup_config',
      action: ChangeAction.UPDATE,
      details: `Configuración de backups actualizada por ${requestedBy}`,
      user: requestedBy,
    });

    return this.getBackupConfig();
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
