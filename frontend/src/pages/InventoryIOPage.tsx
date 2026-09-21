import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext.js';
import { inventoryIOApi, api } from '../services/api.js';
import {
  ExportFormat,
  ImportMode,
  ConflictResolution,
  InventoryExportFilter,
  ImportPreviewResult,
  ImportConflictItem,
  InventoryExportLogItem,
  InventoryImportLogItem,
  Location,
  Tag,
} from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Input } from '../components/ui/Input.js';
import {
  FileSpreadsheet,
  Download,
  Upload,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCode2,
  FileText,
  Filter,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export const InventoryIOPage: React.FC = () => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // Export State
  const [exportFilter, setExportFilter] = useState<InventoryExportFilter>({
    format: 'CSV',
    group: '',
    type: '',
    status: '',
    locationId: '',
    tag: '',
    os: '',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<InventoryExportLogItem[]>([]);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRawContent, setImportRawContent] = useState<string>('');
  const [importFormat, setImportFormat] = useState<ExportFormat>('CSV');
  const [importMode, setImportMode] = useState<ImportMode>('UPDATE_EXISTING');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, ConflictResolution>>({});
  const [isExecutingImport, setIsExecutingImport] = useState(false);
  const [importHistory, setImportHistory] = useState<InventoryImportLogItem[]>([]);

  // Metadata
  const [locations, setLocations] = useState<Location[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const loadHistories = async () => {
    try {
      const [expLogs, impLogs, locs, tagList] = await Promise.all([
        inventoryIOApi.getExportHistory(),
        inventoryIOApi.getImportHistory(),
        api.getLocations().catch(() => []),
        api.getTags().catch(() => []),
      ]);
      setExportHistory(expLogs);
      setImportHistory(impLogs);
      setLocations(locs);
      setTags(tagList);
    } catch (err: any) {
      console.warn('Error loading histories:', err.message);
    }
  };

  useEffect(() => {
    loadHistories();
  }, []);

  // Export Handler
  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    try {
      const cleanFilter = { ...exportFilter };
      if (!cleanFilter.group) delete cleanFilter.group;
      if (!cleanFilter.type) delete cleanFilter.type;
      if (!cleanFilter.status) delete cleanFilter.status;
      if (!cleanFilter.locationId) delete cleanFilter.locationId;
      if (!cleanFilter.tag) delete cleanFilter.tag;
      if (!cleanFilter.os) delete cleanFilter.os;

      const res = await inventoryIOApi.exportInventory(cleanFilter);
      toast.success('Exportación completada', `Archivo '${res.filename}' descargado con éxito.`);
      loadHistories();
    } catch (err: any) {
      toast.error('Error al exportar inventario', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // File Upload for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setPreviewResult(null);

    // Auto detect format from extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'json') {
      setImportFormat(file.name.includes('migration') ? 'MIGRATION_JSON' : 'JSON');
    } else {
      setImportFormat('CSV');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportRawContent(content || '');
    };
    reader.readAsText(file);
  };

  // Preview Import
  const handleAnalyzePreview = async () => {
    if (!importRawContent.trim()) {
      toast.warning('Archivo vacío', 'Por favor selecciona un archivo válido con datos a importar.');
      return;
    }

    setIsPreviewing(true);
    try {
      const preview = await inventoryIOApi.previewImport({
        rawContent: importRawContent,
        format: importFormat,
        filename: importFile?.name || 'import_file',
      });
      setPreviewResult(preview);

      // Default conflict resolutions to OVERWRITE
      const initialResolutions: Record<string, ConflictResolution> = {};
      preview.conflicts.forEach((c: ImportConflictItem) => {
        initialResolutions[c.fileHostname] = 'OVERWRITE';
      });
      setConflictResolutions(initialResolutions);

      if (preview.errorCount > 0 && preview.newCount === 0 && preview.updateCount === 0) {
        toast.error('Validación con errores', `Se encontraron ${preview.errorCount} errores. Corrige el archivo antes de importar.`);
      } else {
        toast.info('Previsualización generada', `${preview.totalRecords} registros analizados.`);
      }
    } catch (err: any) {
      toast.error('Error al analizar archivo', err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!previewResult) return;
    setIsExecutingImport(true);
    try {
      const result = await inventoryIOApi.executeImport({
        rawContent: importRawContent,
        format: importFormat,
        mode: importMode,
        filename: importFile?.name || 'import_file',
        conflictResolutions,
      });

      toast.success('Importación completada', result.summary);
      setPreviewResult(null);
      setImportFile(null);
      setImportRawContent('');
      loadHistories();
    } catch (err: any) {
      toast.error('Error en la importación', err.message);
    } finally {
      setIsExecutingImport(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#06B6D4]" />
            Importación & Exportación de Inventario
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Migración de datos, exportaciones para auditoría (CSV, JSON, Excel, Migration JSON) e importaciones controladas con previsualización
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center p-1 rounded-xl bg-[#0F141B] border border-[#252D38]">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'export'
                ? 'bg-[#151B23] text-[#06B6D4] shadow-sm border border-[#06B6D4]/30'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'import'
                ? 'bg-[#151B23] text-[#06B6D4] shadow-sm border border-[#06B6D4]/30'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Importar
          </button>
        </div>
      </div>

      {/* TAB 1: EXPORT */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="border-b border-[#252D38] pb-4 mb-6">
              <h2 className="text-base font-bold text-[#F1F5F9] flex items-center gap-2">
                <Download className="w-4 h-4 text-[#06B6D4]" />
                Exportar Activos e Inventario
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Genera archivos con los dispositivos actuales y sus interfaces, tags, puertos y servicios
              </p>
            </div>

            <form onSubmit={handleExport} className="space-y-6">
              {/* Format Selection Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#F1F5F9]">Formato de Exportación</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'CSV', label: 'CSV Estándar', desc: 'Valores separados por comas compatible con cualquier hoja de cálculo', icon: FileText },
                    { id: 'XLSX', label: 'Excel (XLSX)', desc: 'Libro de cálculo estructurado con formato de tabla', icon: FileSpreadsheet },
                    { id: 'JSON', label: 'JSON Completo', desc: 'Estructura jerárquica con interfaces, tags y puertos anidados', icon: FileCode2 },
                    { id: 'MIGRATION_JSON', label: 'Migration JSON', desc: 'Paquete completo para migrar a otra instancia de InfraInventory', icon: ShieldCheck },
                  ].map((fmt) => {
                    const Icon = fmt.icon;
                    const isSelected = exportFilter.format === fmt.id;
                    return (
                      <div
                        key={fmt.id}
                        onClick={() => setExportFilter({ ...exportFilter, format: fmt.id as any })}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#151B23] border-[#06B6D4] shadow-md shadow-[#06B6D4]/10'
                            : 'bg-[#0F141B] border-[#252D38] hover:border-[#252D38]/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-[#06B6D4]' : 'text-[#64748B]'}`} />
                            {fmt.label}
                          </span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />}
                        </div>
                        <p className="text-[11px] text-[#94A3B8] leading-tight">{fmt.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filters */}
              <div className="pt-4 border-t border-[#252D38]/60 space-y-4">
                <h3 className="text-xs font-semibold text-[#F1F5F9] flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#06B6D4]" />
                  Filtros de Exportación (Opcionales - Dejar en blanco para exportar todo)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#94A3B8]">Grupo de Hosts</label>
                    <Input
                      type="text"
                      placeholder="ej. Servidores"
                      value={exportFilter.group || ''}
                      onChange={(e) => setExportFilter({ ...exportFilter, group: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#94A3B8]">Estado</label>
                    <select
                      value={exportFilter.status || ''}
                      onChange={(e) => setExportFilter({ ...exportFilter, status: e.target.value })}
                      className="w-full bg-[#0B0F14] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                    >
                      <option value="">Todos los Estados</option>
                      <option value="ONLINE">ONLINE</option>
                      <option value="WARNING">WARNING</option>
                      <option value="OFFLINE">OFFLINE</option>
                      <option value="UNCHECKED">UNCHECKED</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#94A3B8]">Tipo de Dispositivo</label>
                    <select
                      value={exportFilter.type || ''}
                      onChange={(e) => setExportFilter({ ...exportFilter, type: e.target.value })}
                      className="w-full bg-[#0B0F14] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                    >
                      <option value="">Todos los Tipos</option>
                      <option value="PHYSICAL_SERVER">Servidor Físico</option>
                      <option value="VIRTUAL_SERVER">Servidor Virtual</option>
                      <option value="ROUTER">Router</option>
                      <option value="SWITCH">Switch</option>
                      <option value="FIREWALL">Firewall</option>
                      <option value="NAS">NAS</option>
                      <option value="PRINTER">Impresora</option>
                      <option value="PC">PC / Workstation</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#94A3B8]">Ubicación</label>
                    <select
                      value={exportFilter.locationId || ''}
                      onChange={(e) => setExportFilter({ ...exportFilter, locationId: e.target.value })}
                      className="w-full bg-[#0B0F14] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                    >
                      <option value="">Todas las Ubicaciones</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#94A3B8]">Tag / Etiqueta</label>
                    <select
                      value={exportFilter.tag || ''}
                      onChange={(e) => setExportFilter({ ...exportFilter, tag: e.target.value })}
                      className="w-full bg-[#0B0F14] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                    >
                      <option value="">Todos los Tags</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#94A3B8]">Sistema Operativo</label>
                    <Input
                      type="text"
                      placeholder="ej. Linux, Windows"
                      value={exportFilter.os || ''}
                      onChange={(e) => setExportFilter({ ...exportFilter, os: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#252D38]">
                <Button type="submit" variant="cyan" size="sm" disabled={isExporting} icon={<Download className="w-3.5 h-3.5" />}>
                  {isExporting ? 'Generando archivo...' : `Exportar Inventario (${exportFilter.format})`}
                </Button>
              </div>
            </form>
          </Card>

          {/* Export History */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[#252D38] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#F1F5F9] flex items-center gap-2">
                <History className="w-4 h-4 text-[#06B6D4]" />
                Historial de Exportaciones
              </h3>
              <span className="text-xs text-[#64748B] font-mono">{exportHistory.length} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#252D38] bg-[#0B0F14]/50 text-[#64748B] font-mono text-[11px] uppercase">
                    <th className="py-2.5 px-4">Fecha</th>
                    <th className="py-2.5 px-4">Formato</th>
                    <th className="py-2.5 px-4">Registros</th>
                    <th className="py-2.5 px-4">Solicitado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {exportHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#64748B]">
                        No hay exportaciones registradas todavía.
                      </td>
                    </tr>
                  ) : (
                    exportHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-[#151B23]/40">
                        <td className="py-2.5 px-4 font-mono text-[#94A3B8]">{new Date(log.createdAt).toLocaleString('es-ES')}</td>
                        <td className="py-2.5 px-4"><Badge variant="cyan" size="sm">{log.format}</Badge></td>
                        <td className="py-2.5 px-4 font-mono font-medium text-[#F1F5F9]">{log.recordsCount} activos</td>
                        <td className="py-2.5 px-4 text-[#94A3B8]">{log.requestedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: IMPORT */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="border-b border-[#252D38] pb-4 mb-6">
              <h2 className="text-base font-bold text-[#F1F5F9] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#06B6D4]" />
                Importar Dispositivos y Migración de Inventario
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Carga archivos CSV, JSON o Migration JSON con previsualización obligatoria antes de aplicar cambios
              </p>
            </div>

            <div className="space-y-6">
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-[#252D38] hover:border-[#06B6D4]/50 rounded-2xl p-6 text-center bg-[#0B0F14]/60 transition-colors">
                <input
                  type="file"
                  id="importFileInput"
                  accept=".csv,.json,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="importFileInput" className="cursor-pointer block space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-[#151B23] border border-[#252D38] flex items-center justify-center mx-auto text-[#06B6D4]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-[#F1F5F9]">
                    {importFile ? importFile.name : 'Haz clic para seleccionar o arrastra un archivo CSV / JSON'}
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Formatos soportados: CSV con cabeceras, JSON y Migration JSON'}
                  </p>
                </label>
              </div>

              {/* Mode & Format options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#F1F5F9]">Modo de Importación</label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="w-full bg-[#0B0F14] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="UPDATE_EXISTING">Actualizar Existentes + Crear Nuevos (Recomendado)</option>
                    <option value="ADD_ONLY">Solo Añadir Nuevos (Omitir existentes)</option>
                    <option value="SYNC">Sincronizar</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#F1F5F9]">Formato del Archivo</label>
                  <select
                    value={importFormat}
                    onChange={(e) => setImportFormat(e.target.value as any)}
                    className="w-full bg-[#0B0F14] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="CSV">CSV (Valores separados por comas o tabulador)</option>
                    <option value="JSON">JSON Array</option>
                    <option value="MIGRATION_JSON">InfraInventory Migration Package</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-4 border-t border-[#252D38]">
                <Button
                  variant="cyan"
                  size="sm"
                  disabled={!importRawContent || isPreviewing}
                  onClick={handleAnalyzePreview}
                  icon={isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                >
                  {isPreviewing ? 'Analizando estructura...' : 'Analizar Archivo & Ver Preview'}
                </Button>
              </div>
            </div>
          </Card>

          {/* PREVIEW CARD */}
          {previewResult && (
            <Card className="p-6 border-[#06B6D4]/40 animate-in fade-in duration-150 space-y-6">
              <div className="flex items-center justify-between border-b border-[#252D38] pb-3">
                <h3 className="text-base font-bold text-[#F1F5F9] flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#06B6D4]" />
                  Previsualización de Importación: {previewResult.filename}
                </h3>
                <span className="text-xs font-mono text-[#94A3B8]">{previewResult.totalRecords} registros detectados</span>
              </div>

              {/* Summary Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex flex-col items-center">
                  <span className="text-xl font-bold font-mono text-[#22C55E]">{previewResult.newCount}</span>
                  <span className="text-[11px] text-[#94A3B8]">Nuevos a Crear</span>
                </div>
                <div className="p-3 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex flex-col items-center">
                  <span className="text-xl font-bold font-mono text-[#3B82F6]">{previewResult.updateCount}</span>
                  <span className="text-[11px] text-[#94A3B8]">Actualizaciones</span>
                </div>
                <div className="p-3 rounded-xl bg-[#EAB308]/10 border border-[#EAB308]/30 flex flex-col items-center">
                  <span className="text-xl font-bold font-mono text-[#EAB308]">{previewResult.conflictCount}</span>
                  <span className="text-[11px] text-[#94A3B8]">Conflictos Detectados</span>
                </div>
                <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex flex-col items-center">
                  <span className="text-xl font-bold font-mono text-[#EF4444]">{previewResult.errorCount}</span>
                  <span className="text-[11px] text-[#94A3B8]">Errores de Validación</span>
                </div>
              </div>

              {/* Validation Errors Box */}
              {previewResult.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 space-y-2">
                  <h4 className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                    Errores Detectados ({previewResult.errors.length})
                  </h4>
                  <ul className="text-xs text-[#94A3B8] space-y-1 list-disc list-inside">
                    {previewResult.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx}>
                        Fila {err.rowNumber}: Campo <strong className="text-[#F1F5F9] font-mono">{err.field}</strong> - {err.message}
                      </li>
                    ))}
                    {previewResult.errors.length > 10 && (
                      <li className="text-[11px] text-[#64748B]">... y {previewResult.errors.length - 10} errores más</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Conflicts Resolution Box */}
              {previewResult.conflicts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#EAB308] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#EAB308]" />
                    Resolución de Conflictos ({previewResult.conflicts.length})
                  </h4>
                  <div className="overflow-x-auto border border-[#252D38] rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0B0F14] text-[#64748B] font-mono text-[11px] border-b border-[#252D38]">
                          <th className="py-2 px-3">Dispositivo</th>
                          <th className="py-2 px-3">Diferencias Detectadas</th>
                          <th className="py-2 px-3">Acción a Tomar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#252D38]">
                        {previewResult.conflicts.map((c) => (
                          <tr key={c.id} className="hover:bg-[#151B23]/50">
                            <td className="py-2.5 px-3 font-semibold text-[#F1F5F9]">
                              {c.fileHostname}
                              <span className="block text-[10px] text-[#64748B] font-mono">{c.fileIp || 'Sin IP'}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              {c.differences.map((diff, dIdx) => (
                                <div key={dIdx} className="text-[11px]">
                                  <strong className="text-[#06B6D4]">{diff.field}:</strong>{' '}
                                  <span className="text-[#EF4444] line-through">{diff.dbValue}</span> &rarr;{' '}
                                  <span className="text-[#22C55E]">{diff.fileValue}</span>
                                </div>
                              ))}
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={conflictResolutions[c.fileHostname] || 'OVERWRITE'}
                                onChange={(e) =>
                                  setConflictResolutions({
                                    ...conflictResolutions,
                                    [c.fileHostname]: e.target.value as any,
                                  })
                                }
                                className="bg-[#0B0F14] border border-[#252D38] rounded px-2 py-1 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                              >
                                <option value="OVERWRITE">Sobrescribir con datos del archivo</option>
                                <option value="KEEP_EXISTING">Mantener datos actuales de la BD</option>
                                <option value="SKIP">Omitir este dispositivo</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Confirm Execution Button */}
              <div className="flex items-center justify-between pt-4 border-t border-[#252D38]">
                <Button variant="secondary" size="sm" onClick={() => setPreviewResult(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="cyan"
                  size="sm"
                  disabled={isExecutingImport || (previewResult.newCount === 0 && previewResult.updateCount === 0)}
                  onClick={handleExecuteImport}
                  icon={isExecutingImport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {isExecutingImport ? 'Importando registros...' : 'Confirmar e Importar Inventario'}
                </Button>
              </div>
            </Card>
          )}

          {/* Import History */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[#252D38] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#F1F5F9] flex items-center gap-2">
                <History className="w-4 h-4 text-[#06B6D4]" />
                Historial de Importaciones
              </h3>
              <span className="text-xs text-[#64748B] font-mono">{importHistory.length} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#252D38] bg-[#0B0F14]/50 text-[#64748B] font-mono text-[11px] uppercase">
                    <th className="py-2.5 px-4">Fecha</th>
                    <th className="py-2.5 px-4">Archivo</th>
                    <th className="py-2.5 px-4">Modo</th>
                    <th className="py-2.5 px-4">Resultado</th>
                    <th className="py-2.5 px-4">Estado</th>
                    <th className="py-2.5 px-4">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {importHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#64748B]">
                        No hay importaciones registradas todavía.
                      </td>
                    </tr>
                  ) : (
                    importHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-[#151B23]/40">
                        <td className="py-2.5 px-4 font-mono text-[#94A3B8]">{new Date(log.createdAt).toLocaleString('es-ES')}</td>
                        <td className="py-2.5 px-4 font-semibold text-[#F1F5F9]">{log.filename}</td>
                        <td className="py-2.5 px-4"><span className="text-[10px] font-mono text-[#94A3B8]">{log.mode}</span></td>
                        <td className="py-2.5 px-4 text-[#94A3B8]">
                          <span className="text-[#22C55E]">+{log.createdCount}</span> /{' '}
                          <span className="text-[#3B82F6]">~{log.updatedCount}</span> /{' '}
                          <span className="text-[#64748B]">∅{log.skippedCount}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded ${log.status === 'COMPLETED' ? 'text-[#22C55E] bg-[#22C55E]/10' : 'text-[#EF4444] bg-[#EF4444]/10'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[#94A3B8]">{log.requestedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InventoryIOPage;
