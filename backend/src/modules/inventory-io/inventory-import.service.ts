import { PrismaClient, MachineType, MachineStatus, ChangeAction } from '@prisma/client';
import { logChange } from '../../utils/changelog.js';
import { ImportModeEnum } from './inventory-io.schema.js';

export interface ParsedImportRow {
  hostname: string;
  type?: string;
  status?: string;
  primaryIp?: string;
  macAddress?: string;
  group?: string;
  location?: string;
  vlan?: string;
  os?: string;
  osVersion?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  tags?: string[];
  rawRowIndex: number;
}

export interface ImportConflictItem {
  id: string;
  rowNumber: number;
  fileHostname: string;
  fileIp?: string;
  dbHostname: string;
  dbIp?: string;
  dbId: string;
  differences: { field: string; fileValue: string; dbValue: string }[];
}

export interface ImportValidationError {
  rowNumber: number;
  field: string;
  message: string;
  rawValue?: string;
}

export interface ImportPreviewResult {
  filename: string;
  format: string;
  totalRecords: number;
  newCount: number;
  updateCount: number;
  conflictCount: number;
  errorCount: number;
  sampleRows: ParsedImportRow[];
  conflicts: ImportConflictItem[];
  errors: ImportValidationError[];
}

export interface ImportExecutionResult {
  importLogId: string;
  status: 'COMPLETED' | 'FAILED';
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  durationMs: number;
  summary: string;
}

export class InventoryImportService {
  constructor(private prisma: PrismaClient) {}

  private isValidIp(ip?: string): boolean {
    if (!ip) return true;
    const parts = ip.trim().split('.');
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      const n = Number(p);
      return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
    });
  }

  private normalizeMac(mac?: string): string | null {
    if (!mac) return null;
    const cleaned = mac.trim().toUpperCase().replace(/[^A-F0-9]/g, '');
    if (cleaned.length !== 12) return mac.trim();
    return cleaned.match(/.{1,2}/g)?.join(':') || mac.trim();
  }

  /**
   * Parse CSV, JSON, or Migration JSON into normalized rows
   */
  private parseContent(rawContent: string, format: string): { rows: ParsedImportRow[]; parseErrors: ImportValidationError[] } {
    const rows: ParsedImportRow[] = [];
    const parseErrors: ImportValidationError[] = [];

    const trimmed = rawContent.trim();

    if (format === 'JSON' || format === 'MIGRATION_JSON' || (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : (parsed.data?.machines || parsed.machines || []);

        list.forEach((item: any, idx: number) => {
          const rowNum = idx + 1;
          if (!item.hostname || typeof item.hostname !== 'string' || !item.hostname.trim()) {
            parseErrors.push({ rowNumber: rowNum, field: 'hostname', message: 'Hostname requerido y no puede estar vacío' });
            return;
          }

          rows.push({
            hostname: item.hostname.trim(),
            type: item.type,
            status: item.status,
            primaryIp: item.primaryIp || item.ip || item.address,
            macAddress: item.macAddress || item.mac,
            group: item.group || item.groupName,
            location: item.location?.name || item.location,
            vlan: item.vlan?.name || item.vlan,
            os: item.os,
            osVersion: item.osVersion,
            manufacturer: item.manufacturer || item.vendor,
            model: item.model,
            serialNumber: item.serialNumber || item.serial,
            description: item.description,
            tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? item.tags.split(';').map((t: string) => t.trim()) : []),
            rawRowIndex: rowNum,
          });
        });
      } catch (err: any) {
        parseErrors.push({ rowNumber: 0, field: 'file', message: `Error al parsear JSON: ${err.message}` });
      }
      return { rows, parseErrors };
    }

    // Parse CSV / TSV
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      parseErrors.push({ rowNumber: 0, field: 'file', message: 'El archivo CSV debe contener al menos una fila de cabecera y una fila de datos' });
      return { rows, parseErrors };
    }

    // Parse Header
    const separator = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
    const headerCols = this.parseCsvLine(lines[0], separator).map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const rowNum = i + 1;
      const cols = this.parseCsvLine(line, separator);

      const getCol = (possibleNames: string[]): string | undefined => {
        for (const name of possibleNames) {
          const idx = headerCols.indexOf(name);
          if (idx !== -1 && cols[idx] !== undefined) {
            return cols[idx].trim();
          }
        }
        return undefined;
      };

      const hostname = getCol(['hostname', 'nombre', 'host', 'name', 'equipos']);
      if (!hostname) {
        parseErrors.push({ rowNumber: rowNum, field: 'hostname', message: 'Fila sin hostname o nombre de equipo' });
        continue;
      }

      const rawTags = getCol(['tags', 'etiquetas', 'tag']);
      const tags = rawTags ? rawTags.split(/[;,]/).map((t) => t.trim()).filter(Boolean) : [];

      rows.push({
        hostname,
        type: getCol(['type', 'tipo']),
        status: getCol(['status', 'estado']),
        primaryIp: getCol(['primaryip', 'ip', 'ipprincipal', 'direccionip', 'address']),
        macAddress: getCol(['macaddress', 'mac', 'direccionmac']),
        group: getCol(['group', 'grupo']),
        location: getCol(['location', 'ubicacion', 'datacenter', 'site']),
        vlan: getCol(['vlan', 'red']),
        os: getCol(['os', 'sistemaoperativo', 'so']),
        osVersion: getCol(['osversion', 'versionso', 'version']),
        manufacturer: getCol(['manufacturer', 'fabricante', 'vendor', 'marca']),
        model: getCol(['model', 'modelo']),
        serialNumber: getCol(['serialnumber', 'serial', 'numeroserie', 'sn']),
        description: getCol(['description', 'descripcion', 'notas', 'notes']),
        tags,
        rawRowIndex: rowNum,
      });
    }

    return { rows, parseErrors };
  }

  private parseCsvLine(line: string, separator: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * Preview import file (validates + detects diffs and conflicts)
   */
  async previewImport(input: { rawContent: string; format: string; filename?: string }): Promise<ImportPreviewResult> {
    const { rows, parseErrors } = this.parseContent(input.rawContent, input.format);
    const errors: ImportValidationError[] = [...parseErrors];

    const existingMachines = await this.prisma.machine.findMany({
      include: { location: true, vlan: true, tags: { include: { tag: true } } },
    });

    const dbByHostname = new Map(existingMachines.map((m) => [m.hostname.toLowerCase(), m]));
    const dbByIp = new Map(existingMachines.filter((m) => m.primaryIp).map((m) => [m.primaryIp!.toLowerCase(), m]));
    const dbByMac = new Map(existingMachines.filter((m) => m.macAddress).map((m) => [this.normalizeMac(m.macAddress!)!, m]));

    const conflicts: ImportConflictItem[] = [];
    let newCount = 0;
    let updateCount = 0;

    for (const r of rows) {
      // Validate IP
      if (r.primaryIp && !this.isValidIp(r.primaryIp)) {
        errors.push({
          rowNumber: r.rawRowIndex,
          field: 'primaryIp',
          message: `Dirección IP inválida '${r.primaryIp}'`,
          rawValue: r.primaryIp,
        });
      }

      // Check match in DB
      const match = dbByHostname.get(r.hostname.toLowerCase()) ||
        (r.primaryIp ? dbByIp.get(r.primaryIp.toLowerCase()) : undefined) ||
        (r.macAddress ? dbByMac.get(this.normalizeMac(r.macAddress)!) : undefined);

      if (!match) {
        newCount++;
      } else {
        updateCount++;
        // Check for field differences
        const differences: { field: string; fileValue: string; dbValue: string }[] = [];

        if (r.primaryIp && match.primaryIp && r.primaryIp !== match.primaryIp) {
          differences.push({ field: 'IP Principal', fileValue: r.primaryIp, dbValue: match.primaryIp });
        }
        if (r.macAddress && match.macAddress && this.normalizeMac(r.macAddress) !== this.normalizeMac(match.macAddress)) {
          differences.push({ field: 'MAC', fileValue: r.macAddress, dbValue: match.macAddress });
        }
        if (r.group && match.group && r.group !== match.group) {
          differences.push({ field: 'Grupo', fileValue: r.group, dbValue: match.group });
        }
        if (r.os && match.os && r.os !== match.os) {
          differences.push({ field: 'Sistema Operativo', fileValue: r.os, dbValue: match.os });
        }

        if (differences.length > 0) {
          conflicts.push({
            id: match.id,
            rowNumber: r.rawRowIndex,
            fileHostname: r.hostname,
            fileIp: r.primaryIp,
            dbHostname: match.hostname,
            dbIp: match.primaryIp || undefined,
            dbId: match.id,
            differences,
          });
        }
      }
    }

    return {
      filename: input.filename || 'preview',
      format: input.format,
      totalRecords: rows.length,
      newCount,
      updateCount,
      conflictCount: conflicts.length,
      errorCount: errors.length,
      sampleRows: rows.slice(0, 10),
      conflicts,
      errors,
    };
  }

  /**
   * Execute import with transactional safety and user conflict resolutions
   */
  async executeImport(input: {
    rawContent: string;
    format: string;
    mode?: string;
    filename?: string;
    conflictResolutions?: Record<string, 'KEEP_EXISTING' | 'OVERWRITE' | 'SKIP'>;
    requestedBy: string;
  }): Promise<ImportExecutionResult> {
    const startTime = Date.now();
    const mode = input.mode || 'UPDATE_EXISTING';
    const filename = input.filename || 'import_file';
    const resolutions = input.conflictResolutions || {};
    const requestedBy = input.requestedBy || 'system';

    const { rows, parseErrors } = this.parseContent(input.rawContent, input.format);
    if (parseErrors.length > 0 && rows.length === 0) {
      throw new Error(`Fallo al procesar el archivo: ${parseErrors.map((e) => e.message).join(', ')}`);
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Execute in transactional batch
    await this.prisma.$transaction(async (tx) => {
      for (const r of rows) {
        try {
          if (r.primaryIp && !this.isValidIp(r.primaryIp)) {
            errorCount++;
            continue;
          }

          const existing = await tx.machine.findUnique({
            where: { hostname: r.hostname },
          });

          // Check conflict resolution
          const resolution = resolutions[r.hostname] || (r.primaryIp ? resolutions[r.primaryIp] : undefined);
          if (resolution === 'SKIP') {
            skippedCount++;
            continue;
          }

          // Resolve or create Location
          let locationId: string | undefined;
          if (r.location) {
            const loc = await tx.location.findFirst({ where: { name: r.location } });
            if (loc) {
              locationId = loc.id;
            } else {
              const newLoc = await tx.location.create({
                data: { name: r.location, type: 'OTHER', description: 'Creada automáticamente por importación' },
              });
              locationId = newLoc.id;
            }
          }

          // Map MachineType
          let machineType: MachineType = MachineType.PHYSICAL_SERVER;
          if (r.type) {
            const ut = r.type.toUpperCase().replace(/\s+/g, '_');
            if (Object.values(MachineType).includes(ut as any)) {
              machineType = ut as MachineType;
            }
          }

          // Map MachineStatus
          let machineStatus: MachineStatus = MachineStatus.UNCHECKED;
          if (r.status) {
            const us = r.status.toUpperCase();
            if (Object.values(MachineStatus).includes(us as any)) {
              machineStatus = us as MachineStatus;
            }
          }

          if (!existing) {
            // Create new device
            const newMachine = await tx.machine.create({
              data: {
                hostname: r.hostname,
                type: machineType,
                status: machineStatus,
                primaryIp: r.primaryIp,
                macAddress: this.normalizeMac(r.macAddress),
                group: r.group || 'Servidores',
                locationId,
                os: r.os,
                osVersion: r.osVersion,
                manufacturer: r.manufacturer,
                model: r.model,
                serialNumber: r.serialNumber,
                description: r.description,
              },
            });

            // Associate Tags
            if (r.tags && r.tags.length > 0) {
              for (const tagName of r.tags) {
                const tag = await tx.tag.upsert({
                  where: { name: tagName },
                  create: { name: tagName, color: '#06B6D4' },
                  update: {},
                });
                await tx.machineTag.upsert({
                  where: { machineId_tagId: { machineId: newMachine.id, tagId: tag.id } },
                  create: { machineId: newMachine.id, tagId: tag.id },
                  update: {},
                });
              }
            }

            createdCount++;
          } else {
            // Existing device
            if (mode === 'ADD_ONLY' || resolution === 'KEEP_EXISTING') {
              skippedCount++;
              continue;
            }

            // Update device
            await tx.machine.update({
              where: { id: existing.id },
              data: {
                type: r.type ? machineType : undefined,
                status: r.status ? machineStatus : undefined,
                primaryIp: r.primaryIp || existing.primaryIp,
                macAddress: this.normalizeMac(r.macAddress) || existing.macAddress,
                group: r.group || existing.group,
                locationId: locationId || existing.locationId,
                os: r.os || existing.os,
                osVersion: r.osVersion || existing.osVersion,
                manufacturer: r.manufacturer || existing.manufacturer,
                model: r.model || existing.model,
                serialNumber: r.serialNumber || existing.serialNumber,
                description: r.description || existing.description,
              },
            });

            // Update Tags if provided
            if (r.tags && r.tags.length > 0) {
              for (const tagName of r.tags) {
                const tag = await tx.tag.upsert({
                  where: { name: tagName },
                  create: { name: tagName, color: '#06B6D4' },
                  update: {},
                });
                await tx.machineTag.upsert({
                  where: { machineId_tagId: { machineId: existing.id, tagId: tag.id } },
                  create: { machineId: existing.id, tagId: tag.id },
                  update: {},
                });
              }
            }

            updatedCount++;
          }
        } catch {
          errorCount++;
        }
      }
    }, { timeout: 60000 });

    const durationMs = Date.now() - startTime;
    const summary = `Importación ${filename}: ${createdCount} creados, ${updatedCount} actualizados, ${skippedCount} omitidos, ${errorCount} errores.`;

    // Save Log
    const logRecord = await this.prisma.inventoryImportLog.create({
      data: {
        filename,
        format: input.format as any,
        mode: mode as any,
        status: errorCount > 0 && createdCount === 0 && updatedCount === 0 ? 'FAILED' : 'COMPLETED',
        totalRecords: rows.length,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount,
        conflictCount: Object.keys(resolutions).length,
        summary,
        requestedBy,
        durationMs,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'InventoryImport',
      entityId: logRecord.id,
      action: ChangeAction.CREATE,
      details: summary,
      user: requestedBy,
    });

    return {
      importLogId: logRecord.id,
      status: 'COMPLETED',
      totalProcessed: rows.length,
      createdCount,
      updatedCount,
      skippedCount,
      errorCount,
      durationMs,
      summary,
    };
  }

  async getImportHistory() {
    return await this.prisma.inventoryImportLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
