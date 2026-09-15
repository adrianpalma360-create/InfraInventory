import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { ChangeLog } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { TableSkeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { History, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export const ChangesPage: React.FC = () => {
  const toast = useToast();
  const [changes, setChanges] = useState<ChangeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getChanges({
        entityType: entityFilter || undefined,
        page,
        limit: 25,
      });
      setChanges(res.items);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      toast.error('Error al cargar historial', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [entityFilter, page]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <History className="w-5 h-5 text-[#F59E0B]" />
            Historial de Auditoría & Evolución
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1A212B] text-[#94A3B8] font-mono border border-[#252D38]">
              {totalCount}
            </span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Registro inmutable de creación, edición y eliminación de recursos de infraestructura
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadData}>
            Refrescar
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0F141B] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#F59E0B] cursor-pointer"
          >
            <option value="">Todas las Entidades</option>
            <option value="Machine">Máquinas (Hosts)</option>
            <option value="Network">Redes (CIDR)</option>
            <option value="VLAN">VLANs</option>
            <option value="Port">Puertos</option>
            <option value="Service">Servicios</option>
            <option value="Location">Ubicaciones</option>
            <option value="User">Usuarios & Seguridad</option>
            <option value="Settings">Configuración</option>
            <option value="NetworkInterface">Interfaces</option>
            <option value="IPAddress">Direcciones IP</option>
            <option value="DiscoveryScan">Escaneos Discovery</option>
            <option value="DiscoveryChange">Eventos Discovery</option>
          </select>
        </div>
      </Card>

      {/* Changes Timeline Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : changes.length === 0 ? (
          <div className="text-center py-16 text-[#64748B] text-xs">
            No se han registrado eventos de auditoría todavía.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F141B] text-[#94A3B8] border-b border-[#252D38] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Tipo de Recurso</th>
                    <th className="py-3 px-4">Detalle del Cambio</th>
                    <th className="py-3 px-4">Usuario / Agente</th>
                    <th className="py-3 px-4 text-right">Fecha & Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {changes.map((log) => (
                    <tr key={log.id} className="hover:bg-[#1A212B]/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            log.action === 'CREATE'
                              ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                              : log.action === 'DELETE'
                              ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                              : 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#F1F5F9] whitespace-nowrap">
                        {log.entityType}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#94A3B8] text-[11px]">
                        {log.details}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] font-mono whitespace-nowrap">
                        {log.user}
                      </td>
                      <td className="py-3 px-4 text-right text-[#64748B] font-mono whitespace-nowrap text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[#252D38] flex items-center justify-between text-xs text-[#94A3B8]">
              <div>
                Página <span className="font-semibold text-[#F1F5F9]">{page}</span> de{' '}
                <span className="font-semibold text-[#F1F5F9]">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                >
                  Siguiente
                  <ChevronRight className="w-3.5 h-3.5 ml-1 inline" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
