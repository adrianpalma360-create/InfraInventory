/**
 * Centralized Application Metadata & Version Configuration
 * Single Source of Truth for App Version, Author, Copyright, and Branding
 */

export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  tag?: string;
  buildDate?: string;
  releaseCommit?: string;
}

export const APP_VERSION_INFO: VersionInfo = {
  major: 11,
  minor: 0,
  patch: 0,
  tag: 'Release',
  buildDate: '2026-09-15',
  releaseCommit: 'prod-v11.0.0-release',
};

// Formatted Semantic Version (e.g. "6.0.0")
export const APP_VERSION = `${APP_VERSION_INFO.major}.${APP_VERSION_INFO.minor}.${APP_VERSION_INFO.patch}${
  APP_VERSION_INFO.tag && APP_VERSION_INFO.tag !== 'Release' ? `-${APP_VERSION_INFO.tag}` : ''
}`;

export const APP_CONFIG = {
  APP_NAME: 'InfraInventory',
  APP_VERSION,
  APP_VERSION_INFO,
  APP_AUTHOR: 'Adrian Palma',
  APP_COPYRIGHT: '© 2026 Adrian Palma',
  APP_COPYRIGHT_LEGAL: 'Todos los derechos reservados.',
  APP_DESCRIPTION:
    'Plataforma de gestión, inventario, descubrimiento, monitorización, automatización con workflows seguros y asistencia inteligente de infraestructura.',
  APP_NOC_TITLE: 'Palma NOC Enterprise',
  
  // Safe tech stack metadata (Zero sensitive data)
  TECH_STACK: [
    { name: 'Frontend', tech: 'React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, Recharts' },
    { name: 'Backend', tech: 'Node.js 20, Fastify 4, TypeScript, Zod, JWT' },
    { name: 'Base de Datos', tech: 'PostgreSQL 16 Engine' },
    { name: 'ORM', tech: 'Prisma ORM 5' },
    { name: 'Motor IA & Automatización', tech: 'Ollama Engine, Workflow Runner, Four-Eyes Approvals, Dry-Run Engine' },
    { name: 'Contenedores', tech: 'Docker & Docker Compose' },
    { name: 'Comunicaciones', tech: 'WebSocket Telemetry & REST API' },
  ],

  // System Modules
  MODULES: [
    { title: '⚡ Automatización & Workflows', desc: 'Workflows con versionado, catálogo de acciones, Dry Run, aprobaciones Four-Eyes y agentes.' },
    { title: '🤖 Asistente IA', desc: 'Asistente inteligente con grounding estricto, diagnóstico 360°, informes y SQL seguro read-only.' },
    { title: '🛠️ Gestión Operativa', desc: 'Tickets, Mantenimientos, RFCs, Tareas, Catálogo de SLAs y Runbooks.' },
    { title: '🏢 Activos IT & Hardware', desc: 'Hardware, Garantías, Licencias de Software, Proveedores y Compras.' },
    { title: '🗺️ Topología & Mapa de Red', desc: 'Visualización gráfica de capas L2/L3, nodos y enlaces de red.' },
    { title: '📦 IPAM & Redes', desc: 'Gestión de Subredes, IPs, VLANs, Calculadora CIDR y Detección de Conflictos.' },
    { title: '🏷️ Tags & Etiquetas', desc: 'Etiquetado flexible y transversal de hosts, servicios e infraestructura.' },
    { title: '📍 Ubicaciones Físicas (Locations)', desc: 'Jerarquía multinivel de Datacenters, Salas, Racks y Oficinas.' },
    { title: '🖥️ Inventario de Máquinas', desc: 'Máquinas, Interfaces de Red, Puertos y Catálogo de Servicios.' },
    { title: '🗂️ Grupos de Hosts', desc: 'Agrupación lógica con telemetría de CPU, RAM, Latencia y Salud.' },
    { title: '📡 Discovery Activo / Pasivo', desc: 'Escaneo de redes ARP/ICMP/TCP con detección de deltas.' },
    { title: '📊 Monitorización NOC', desc: 'Telemetría de salud, puertos y servicios en tiempo real.' },
    { title: '📈 Gráficos & Series Temporales', desc: 'Streaming WebSocket y consulta de métricas históricas.' },
    { title: '🔔 Centro de Alertas', desc: 'Detección de anomalías estadísticas mediante Z-Score.' },
    { title: '🔄 Auditoría & Trazabilidad', desc: 'Historial inmutable de cambios sobre cada elemento.' },
  ],
} as const;

export default APP_CONFIG;
