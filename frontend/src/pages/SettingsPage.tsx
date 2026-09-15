import React, { useState, useEffect } from 'react';
import { useAuth, Can } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { SystemSettings } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Badge } from '../components/ui/Badge.js';
import {
  Settings,
  Database,
  Radio,
  ShieldCheck,
  Zap,
  Sliders,
  Save,
  RefreshCw,
  Loader2,
  FileText,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [settings, setSettings] = useState<SystemSettings>({
    organizationName: 'Palma NOC Enterprise',
    primarySubnet: '192.168.1.0/24',
    discoveryTimeoutMs: 600,
    discoveryConcurrency: 32,
    sessionExpiryDays: 7,
    enableAuditLogs: true,
    auditRetentionDays: 90,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = hasPermission('SETTINGS_UPDATE');

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err: any) {
      toast.error('Error al cargar configuración', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('Permiso denegado', 'No tienes permisos para modificar la configuración.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      toast.success('Configuración guardada', 'Los parámetros operativos se han actualizado.');
    } catch (err: any) {
      toast.error('Error al guardar configuración', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#06B6D4]" />
            Configuración del Sistema & Parámetros Operativos
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Ajustes globales de red, motor de descubrimiento, retención y arquitectura del NOC
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={loadSettings} disabled={isLoading}>
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Recargar
        </Button>
      </div>

      {/* Operational Settings Form */}
      <form onSubmit={handleSave}>
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#252D38] pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#06B6D4]" />
              <h2 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider">
                Parámetros Generales de la Plataforma
              </h2>
            </div>
            {!canEdit && (
              <Badge variant="yellow" size="sm">
                Modo Solo Lectura
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nombre de la Organización / NOC *"
              value={settings.organizationName}
              onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
              disabled={!canEdit || isLoading}
              required
            />

            <Input
              label="Subred Principal por Defecto (CIDR) *"
              value={settings.primarySubnet}
              onChange={(e) => setSettings({ ...settings, primarySubnet: e.target.value })}
              disabled={!canEdit || isLoading}
              placeholder="192.168.1.0/24"
              required
            />

            <Input
              label="Timeout de Sondeo TCP (ms)"
              type="number"
              value={settings.discoveryTimeoutMs}
              onChange={(e) => setSettings({ ...settings, discoveryTimeoutMs: Number(e.target.value) })}
              disabled={!canEdit || isLoading}
              helperText="Tiempo máximo de espera por cada puerto TCP escaneado (recomendado: 400-800 ms)"
            />

            <Input
              label="Concurrencia de Escaneo (Hosts simultáneos)"
              type="number"
              value={settings.discoveryConcurrency}
              onChange={(e) => setSettings({ ...settings, discoveryConcurrency: Number(e.target.value) })}
              disabled={!canEdit || isLoading}
              helperText="Número de hosts sonteados concurrentemente (recomendado: 16-64)"
            />

            <Input
              label="Expiración de Sesión de Usuario (Días)"
              type="number"
              value={settings.sessionExpiryDays}
              onChange={(e) => setSettings({ ...settings, sessionExpiryDays: Number(e.target.value) })}
              disabled={!canEdit || isLoading}
              helperText="Duración máxima de cookies de sesión activa"
            />

            <Input
              label="Retención de Registros de Auditoría (Días)"
              type="number"
              value={settings.auditRetentionDays}
              onChange={(e) => setSettings({ ...settings, auditRetentionDays: Number(e.target.value) })}
              disabled={!canEdit || isLoading}
              helperText="Historial conservado en tabla ChangeLogs"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#252D38]">
            <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
              <FileText className="w-4 h-4 text-[#22C55E]" />
              <span>Auditoría de cambios activada globalmente</span>
            </div>

            <Can permission="SETTINGS_UPDATE">
              <Button type="submit" variant="cyan" disabled={isSaving || isLoading}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Guardando Ajustes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1.5" />
                    Guardar Configuración
                  </>
                )}
              </Button>
            </Can>
          </div>
        </Card>
      </form>

      {/* Infrastructure Core Status */}
      <Card className="p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-4 pb-2 border-b border-[#252D38]">
          Núcleo de Infraestructura Activo
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#0F141B] border border-[#252D38]">
            <span className="text-[#64748B] block font-medium">Motor de Base de Datos</span>
            <span className="text-[#F1F5F9] font-bold mt-1 flex items-center gap-1.5 font-mono">
              <Database className="w-3.5 h-3.5 text-[#3B82F6]" /> PostgreSQL 16
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0F141B] border border-[#252D38]">
            <span className="text-[#64748B] block font-medium">Capa ORM</span>
            <span className="text-[#F1F5F9] font-bold mt-1 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Prisma ORM Client
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0F141B] border border-[#252D38]">
            <span className="text-[#64748B] block font-medium">Servidor REST Backend</span>
            <span className="text-[#F1F5F9] font-bold mt-1 flex items-center gap-1.5 font-mono">
              <Zap className="w-3.5 h-3.5 text-[#06B6D4]" /> Fastify & JWT
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0F141B] border border-[#252D38]">
            <span className="text-[#64748B] block font-medium">Motor de Descubrimiento</span>
            <span className="text-[#F1F5F9] font-bold mt-1 flex items-center gap-1.5 font-mono">
              <Radio className="w-3.5 h-3.5 text-purple-400" /> Discovery Microservice
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
