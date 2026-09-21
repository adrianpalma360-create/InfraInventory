import { z } from 'zod';

export const ExportFormatEnum = z.enum(['CSV', 'JSON', 'XLSX', 'MIGRATION_JSON']);
export const ImportModeEnum = z.enum(['ADD_ONLY', 'UPDATE_EXISTING', 'SYNC']);
export const ConflictResolutionEnum = z.enum(['KEEP_EXISTING', 'OVERWRITE', 'SKIP']);

export const ExportInventorySchema = z.object({
  format: ExportFormatEnum.default('CSV'),
  group: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  locationId: z.string().optional(),
  tag: z.string().optional(),
  os: z.string().optional(),
});

export type ExportInventoryInput = z.infer<typeof ExportInventorySchema>;

export const ImportExecuteSchema = z.object({
  mode: ImportModeEnum.default('UPDATE_EXISTING'),
  format: ExportFormatEnum.default('CSV'),
  rawContent: z.string().min(1, 'Contenido a importar requerido'),
  filename: z.string().default('import_data'),
  conflictResolutions: z.record(ConflictResolutionEnum).optional().default({}),
});

export type ImportExecuteInput = z.infer<typeof ImportExecuteSchema>;

export const ImportPreviewSchema = z.object({
  format: ExportFormatEnum.default('CSV'),
  rawContent: z.string().min(1, 'Contenido a previsualizar requerido'),
  filename: z.string().default('preview_data'),
});

export type ImportPreviewInput = z.infer<typeof ImportPreviewSchema>;
