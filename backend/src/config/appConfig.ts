/**
 * Centralized Backend Application Metadata & Version Configuration
 * Single Source of Truth for App Version, Author, Copyright, and Public Metadata
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
    'Plataforma de gestión, inventario, descubrimiento y monitorización de infraestructura.',
  APP_NOC_TITLE: 'Palma NOC Enterprise',
} as const;

export default APP_CONFIG;
