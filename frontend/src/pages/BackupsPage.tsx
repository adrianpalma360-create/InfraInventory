import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { backupApi } from '../services/api.js';
import { BackupItem, BackupConfig } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Input } from '../components/ui/Input.js';
import {
  Database,
  Download,
  RotateCcw,
  Shield,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  HardDrive,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
} from 'lucide-react';

export const BackupsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [config, setConfig] = useState<BackupConfig>({
    autoBackupEnabled: true,
    frequency: 'DAILY',
    timeUtc: '03:00',
    retentionDaily: 7,
    retentionWeekly: 4,
    retentionMonthly: 3,
    storagePath: '/backups',
    encryptionEnabled: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupProtected, setNewBackupProtected] = useState(false);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupItem | null>(null);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [skipPreRestore, setSkipPreRestore] = useState(false);

  const canAdmin = hasPermission('SETTINGS_UPDATE');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [listData, configData] = await Promise.all([
        backupApi.getBackups(),
        backupApi.getBackupConfig(),
      ]);
      setBackups(listData);
      setConfig(configData);
    } catch (err: any) {
      toast.error('Error al cargar backups', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingBackup(true);
    try {
      await backupApi.createBackup({
        name: newBackupName.trim() || undefined,
        isProtected: newBackupProtected,
      });
      toast.success('Backup generado', 'La copia de seguridad se ha creado correctamente.');
      setCreateModalOpen(false);
      setNewBackupName('');
      setNewBackupProtected(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al crear backup', err.message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleToggleProtect = async (backup: BackupItem) => {
    try {
      const updated = await backupApi.toggleProtect(backup.id, !backup.isProtected);
      setBackups((prev) => prev.map((b) => (b.id === backup.id ? updated : b)));
      toast.success(
        updated.isProtected ? 'Backup protegido' : 'Protección retirada',
        `El backup '${backup.name}' ${updated.isProtected ? 'no será eliminado por retención.' : 'ahora sigue la política de retención estándar.'}`
      );
    } catch (err: any) {
      toast.error('Error al modificar protección', err.message);
    }
  };

  const handleDelete = async (backup: BackupItem) => {
    if (backup.isProtected) {
      toast.warning('Backup protegido', 'Desprotege el backup antes de intentar eliminarlo.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el backup '${backup.name}'?`)) {
      return;
    }

    try {
      await backupApi.deleteBackup(backup.id);
      setBackups((prev) => prev.filter((b) => b.id !== backup.id));
      toast.success('Backup eliminado', `El archivo '${backup.name}' ha sido eliminado.`);
    } catch (err: any) {
      toast.error('Error al eliminar backup', err.message);
    }
  };

  const handleDownload = async (backup: BackupItem) => {
    try {
      toast.info('Iniciando descarga', `Descargando ${backup.filename}...`);
      await backupApi.downloadBackup(backup.id, backup.filename);
    } catch (err: any) {
      toast.error('Error en descarga', err.message);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const updated = await backupApi.updateBackupConfig(config);
      setConfig(updated);
      toast.success('Configuración guardada', 'Política de backups y retención actualizada.');
    } catch (err: any) {
      toast.error('Error al guardar configuración', err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore) return;
    setIsRestoring(true);
    try {
      const result = await backupApi.restoreBackup(selectedBackupForRestore.id, {
        skipPreRestoreBackup: skipPreRestore,
      });
      toast.success('Restauración completada', result.message);
      setRestoreModalOpen(false);
      setSelectedBackupForRestore(null);
      setConfirmStep(1);
      setConfirmText('');
      loadData();
    } catch (err: any) {
      toast.error('Error durante la restauración', err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PRE_RESTORE':
        return <Badge variant="yellow" size="sm">Pre-Restore</Badge>;
      case 'SCHEDULED':
        return <Badge variant="purple" size="sm">Automático</Badge>;
      case 'MANUAL':
      default:
        return <Badge variant="cyan" size="sm">Manual</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded border border-[#22C55E]/30"><CheckCircle2 className="w-3 h-3" /> COMPLETADO</span>;
      case 'RESTORED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded border border-[#06B6D4]/30"><RotateCcw className="w-3 h-3" /> RESTAURADO</span>;
      case 'RUNNING':
      case 'RESTORING':
        return <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#EAB308] bg-[#EAB308]/10 px-2 py-0.5 rounded border border-[#EAB308]/30"><Loader2 className="w-3 h-3 animate-spin" /> EN PROCESO</span>;
      case 'FAILED':
      case 'CORRUPTED':
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded border border-[#EF4444]/30"><XCircle className="w-3 h-3" /> FALLIDO</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#06B6D4]" />
            Sistema de Backups & Copias de Seguridad
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Protección de datos PostgreSQL, histórico de snapshots, restauración segura con punto de rollback y retención
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          {canAdmin && (
            <Button variant="cyan" size="sm" onClick={() => setCreateModalOpen(true)} icon={<Plus className="w-3.5 h-3.5" />}>
              Crear Backup Manual
            </Button>
          )}
        </div>
      </div>

      {/* Auto Backup Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#0F141B] via-[#151B23] to-[#0F141B] border border-[#252D38] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${config.autoBackupEnabled ? 'bg-[#22C55E] animate-pulse' : 'bg-[#EF4444]'}`} />
          <div>
            <div className="text-xs font-bold text-[#F1F5F9] flex items-center gap-2">
              <span>Estado: {config.autoBackupEnabled ? 'Backups Automáticos Activos' : 'Backups Automáticos Pausados'}</span>
              <span className="text-[10px] font-mono text-[#94A3B8]">({config.frequency} a las {config.timeUtc} UTC)</span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Retención: {config.retentionDaily} diarios, {config.retentionWeekly} semanales, {config.retentionMonthly} mensuales &bull; Directorio: <span className="font-mono text-[#94A3B8]">{config.storagePath}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-[#94A3B8]">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-[#06B6D4]" />
            Total: <strong className="text-[#F1F5F9]">{backups.length}</strong> backups
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#EAB308]" />
            Protegidos: <strong className="text-[#F1F5F9]">{backups.filter((b) => b.isProtected).length}</strong>
          </span>
        </div>
      </div>

      {/* Backups Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-[#252D38] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#06B6D4]" />
            Historial de Copias de Seguridad
          </h2>
          <span className="text-xs text-[#64748B] font-mono">{backups.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#252D38] bg-[#0B0F14]/50 text-[#64748B] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Backup / Nombre</th>
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">Tamaño</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Registros</th>
                <th className="py-3 px-4">Creado por</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252D38]/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#64748B]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#06B6D4]" />
                    Cargando historial de backups...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#64748B]">
                    No hay copias de seguridad registradas. Pulsa "Crear Backup Manual" para generar la primera copia.
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-[#151B23]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#F1F5F9] flex items-center gap-2">
                        {backup.isProtected && (
                          <span title="Backup Protegido (No se borrará por retención)">⭐</span>
                        )}
                        <span>{backup.name}</span>
                      </div>
                      <span className="text-[10px] text-[#64748B] font-mono block truncate max-w-xs">{backup.filename}</span>
                    </td>
                    <td className="py-3 px-4 text-[#94A3B8] font-mono text-xs">
                      {new Date(backup.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#F1F5F9]">
                      {backup.sizeFormatted}
                    </td>
                    <td className="py-3 px-4">
                      {getTypeBadge(backup.type)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(backup.status)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#94A3B8] text-xs">
                      {backup.recordsCount} regs / {backup.tablesCount} tablas
                    </td>
                    <td className="py-3 px-4 text-[#94A3B8]">
                      {backup.createdBy}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canAdmin && (
                          <>
                            <button
                              onClick={() => handleDownload(backup)}
                              className="p-1.5 rounded-lg bg-[#151B23] hover:bg-[#252D38] text-[#94A3B8] hover:text-[#06B6D4] transition-colors"
                              title="Descargar archivo .pg_dump.json"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBackupForRestore(backup);
                                setConfirmStep(1);
                                setConfirmText('');
                                setRestoreModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-[#151B23] hover:bg-[#252D38] text-[#94A3B8] hover:text-[#EAB308] transition-colors"
                              title="Restaurar este backup..."
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleProtect(backup)}
                              className={`p-1.5 rounded-lg bg-[#151B23] hover:bg-[#252D38] transition-colors ${backup.isProtected ? 'text-[#EAB308]' : 'text-[#64748B] hover:text-[#EAB308]'}`}
                              title={backup.isProtected ? 'Quitar protección' : 'Proteger backup contra retención'}
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(backup)}
                              disabled={backup.isProtected}
                              className={`p-1.5 rounded-lg bg-[#151B23] hover:bg-[#252D38] transition-colors ${backup.isProtected ? 'opacity-30 cursor-not-allowed text-[#64748B]' : 'text-[#64748B] hover:text-[#EF4444]'}`}
                              title={backup.isProtected ? 'No se puede eliminar porque está protegido' : 'Eliminar backup'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Configuration & Retention Card */}
      {canAdmin && (
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-[#252D38] pb-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#F1F5F9] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#06B6D4]" />
                Programación Automática & Política de Retención
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Configuración del worker de backup programado y purga automática de copias antiguas
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Enable Switch */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#F1F5F9] block">
                  Copia de Seguridad Automática
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoBackupEnabled"
                    checked={config.autoBackupEnabled}
                    onChange={(e) => setConfig({ ...config, autoBackupEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4] focus:ring-[#06B6D4]"
                  />
                  <label htmlFor="autoBackupEnabled" className="text-xs text-[#94A3B8] cursor-pointer">
                    {config.autoBackupEnabled ? 'Habilitado (Automático)' : 'Deshabilitado (Manual solamente)'}
                  </label>
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#F1F5F9] block">
                  Frecuencia de Ejecución
                </label>
                <select
                  value={config.frequency}
                  onChange={(e) => setConfig({ ...config, frequency: e.target.value as any })}
                  className="w-full bg-[#0B0F14] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value="DAILY">Diario (Cada 24 horas)</option>
                  <option value="WEEKLY">Semanal (Una vez por semana)</option>
                  <option value="MONTHLY">Mensual (Primer día de mes)</option>
                </select>
              </div>

              {/* Time */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#F1F5F9] block">
                  Hora de Ejecución (UTC)
                </label>
                <Input
                  type="text"
                  value={config.timeUtc}
                  onChange={(e) => setConfig({ ...config, timeUtc: e.target.value })}
                  placeholder="03:00"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-[#252D38]/60">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#F1F5F9] block">
                  Retención Diaria (Backups a conservar)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={config.retentionDaily}
                  onChange={(e) => setConfig({ ...config, retentionDaily: Number(e.target.value) })}
                  className="font-mono text-xs"
                />
                <span className="text-[10px] text-[#64748B]">Recomendado: 7 días</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#F1F5F9] block">
                  Retención Semanal (Semanas a conservar)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={config.retentionWeekly}
                  onChange={(e) => setConfig({ ...config, retentionWeekly: Number(e.target.value) })}
                  className="font-mono text-xs"
                />
                <span className="text-[10px] text-[#64748B]">Recomendado: 4 semanas</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#F1F5F9] block">
                  Retención Mensual (Meses a conservar)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={config.retentionMonthly}
                  onChange={(e) => setConfig({ ...config, retentionMonthly: Number(e.target.value) })}
                  className="font-mono text-xs"
                />
                <span className="text-[10px] text-[#64748B]">Recomendado: 3 meses</span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#252D38]">
              <Button type="submit" variant="cyan" size="sm" disabled={isSavingConfig} icon={<Save className="w-3.5 h-3.5" />}>
                {isSavingConfig ? 'Guardando...' : 'Guardar Parámetros de Retención'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Modal: Create Backup */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0F141B] border border-[#252D38] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#252D38] pb-3">
              <h3 className="text-base font-bold text-[#F1F5F9] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#06B6D4]" />
                Crear Copia de Seguridad Manual
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-[#64748B] hover:text-[#F1F5F9]">✕</button>
            </div>

            <form onSubmit={handleCreateBackup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#F1F5F9]">Nombre del Backup (Opcional)</label>
                <Input
                  type="text"
                  placeholder={`backup-${new Date().toISOString().slice(0, 10)}`}
                  value={newBackupName}
                  onChange={(e) => setNewBackupName(e.target.value)}
                  className="text-xs"
                />
                <span className="text-[10px] text-[#64748B]">Si se deja en blanco se generará automáticamente con la fecha y hora.</span>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="modalProtected"
                  checked={newBackupProtected}
                  onChange={(e) => setNewBackupProtected(e.target.checked)}
                  className="w-4 h-4 rounded border-[#252D38] bg-[#0B0F14] text-[#06B6D4]"
                />
                <label htmlFor="modalProtected" className="text-xs text-[#94A3B8] cursor-pointer">
                  Marcar como <strong>Protegido ⭐</strong> (Evita que sea eliminado por la política de retención automática)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#252D38]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setCreateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="cyan" size="sm" disabled={isCreatingBackup} icon={<Database className="w-3.5 h-3.5" />}>
                  {isCreatingBackup ? 'Generando dump...' : 'Generar Backup Ahora'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Safe Restore with Double Confirmation */}
      {restoreModalOpen && selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0F141B] border border-[#EF4444]/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#252D38] pb-3">
              <h3 className="text-base font-bold text-[#EF4444] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                Restauración de Base de Datos
              </h3>
              <button onClick={() => setRestoreModalOpen(false)} className="text-[#64748B] hover:text-[#F1F5F9]">✕</button>
            </div>

            {confirmStep === 1 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#F1F5F9] space-y-2">
                  <p className="font-bold text-[#EF4444]">⚠️ ADVERTENCIA CRÍTICA: Operación de sobreescritura</p>
                  <p className="text-[#94A3B8]">
                    La restauración del backup <strong>{selectedBackupForRestore.name}</strong> reemplazará los datos actuales por el estado del backup del <strong>{new Date(selectedBackupForRestore.createdAt).toLocaleString()}</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#151B23] border border-[#252D38] space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-[#64748B]">Tipo de Backup:</span> <span className="font-mono text-[#F1F5F9]">{selectedBackupForRestore.type}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Tamaño:</span> <span className="font-mono text-[#F1F5F9]">{selectedBackupForRestore.sizeFormatted}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Tablas contenidas:</span> <span className="font-mono text-[#F1F5F9]">{selectedBackupForRestore.tablesCount} tablas</span></div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="chkPreRestore"
                    checked={!skipPreRestore}
                    onChange={(e) => setSkipPreRestore(!e.target.checked)}
                    className="w-4 h-4 rounded border-[#252D38] bg-[#0B0F14] text-[#22C55E]"
                  />
                  <label htmlFor="chkPreRestore" className="text-xs text-[#94A3B8] cursor-pointer">
                    Crear automáticamente un <strong>backup de seguridad previo</strong> (Recomendado)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#252D38]">
                  <Button variant="secondary" size="sm" onClick={() => setRestoreModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmStep(2)}>
                    Continuar al paso de Confirmación &rarr;
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#94A3B8]">
                  Para confirmar de forma irrevocable, escribe la palabra <strong className="text-[#EF4444] font-mono">RESTAURAR</strong> a continuación:
                </p>

                <Input
                  type="text"
                  placeholder="RESTAURAR"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="font-mono text-center text-sm tracking-widest border-[#EF4444]/50 focus:border-[#EF4444]"
                />

                <div className="flex items-center justify-between pt-4 border-t border-[#252D38]">
                  <Button variant="secondary" size="sm" onClick={() => setConfirmStep(1)}>
                    &larr; Volver
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={confirmText !== 'RESTAURAR' || isRestoring}
                    onClick={handleExecuteRestore}
                    icon={isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  >
                    {isRestoring ? 'Restaurando datos...' : 'Ejecutar Restauración Inmediata'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupsPage;
