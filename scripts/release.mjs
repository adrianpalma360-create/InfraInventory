#!/usr/bin/env node
/**
 * InfraInventory - Centralized Release & Semantic Versioning Manager
 * 
 * Manages semantic versioning (MAJOR.MINOR.PATCH) and keeps all metadata
 * in sync across backend, frontend, Dockerfiles, package.json files, and GitHub Actions.
 * 
 * Usage:
 *   node scripts/release.mjs current           # Print current version
 *   node scripts/release.mjs bump [patch]      # Bump patch (11.0.0 -> 11.0.1) [DEFAULT]
 *   node scripts/release.mjs bump minor        # Bump minor (11.0.1 -> 11.1.0)
 *   node scripts/release.mjs bump major        # Bump major (11.1.0 -> 12.0.0)
 *   node scripts/release.mjs set <X.Y.Z>       # Set explicit version (e.g. 15.2.0)
 *   node scripts/release.mjs sync              # Synchronize all project files with version.json
 *   node scripts/release.mjs check             # Validate version consistency across files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const VERSION_FILE = path.join(ROOT_DIR, 'version.json');
const BACKEND_CONFIG = path.join(ROOT_DIR, 'backend', 'src', 'config', 'appConfig.ts');
const FRONTEND_CONFIG = path.join(ROOT_DIR, 'frontend', 'src', 'config', 'appConfig.ts');

const PACKAGE_JSONS = [
  path.join(ROOT_DIR, 'package.json'),
  path.join(ROOT_DIR, 'backend', 'package.json'),
  path.join(ROOT_DIR, 'frontend', 'package.json'),
  path.join(ROOT_DIR, 'discovery', 'package.json'),
  path.join(ROOT_DIR, 'monitoring-worker', 'package.json'),
];

const DOCKERFILES = [
  path.join(ROOT_DIR, 'backend', 'Dockerfile'),
  path.join(ROOT_DIR, 'frontend', 'Dockerfile'),
  path.join(ROOT_DIR, 'discovery', 'Dockerfile'),
  path.join(ROOT_DIR, 'monitoring-worker', 'Dockerfile'),
];

const PORTAINER_COMPOSE = path.join(ROOT_DIR, 'docker-compose.portainer.yml');

/**
 * Load current version info
 */
export function loadVersion() {
  if (!fs.existsSync(VERSION_FILE)) {
    throw new Error(`Version file not found: ${VERSION_FILE}`);
  }
  return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
}

/**
 * Validate Semantic Version format
 */
export function parseSemVer(versionStr) {
  const match = String(versionStr).trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semantic version format "${versionStr}". Must be MAJOR.MINOR.PATCH (e.g. 11.0.1)`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    version: `${match[1]}.${match[2]}.${match[3]}`,
  };
}

/**
 * Calculate next version
 */
export function calculateNextVersion(currentVersion, bumpType = 'patch') {
  let { major, minor, patch } = currentVersion;
  const type = String(bumpType).toLowerCase().trim();

  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else if (type === 'patch') {
    patch += 1;
  } else {
    // Check if bumpType is an explicit semver
    return parseSemVer(bumpType);
  }

  return {
    major,
    minor,
    patch,
    version: `${major}.${minor}.${patch}`,
  };
}

/**
 * Get formatted current date (YYYY-MM-DD)
 */
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Update appConfig.ts file content while preserving other configurations
 */
function updateAppConfigFile(filePath, versionInfo) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace APP_VERSION_INFO object
  const versionInfoRegex = /export const APP_VERSION_INFO:\s*VersionInfo\s*=\s*\{[\s\S]*?\};/;
  const newVersionInfoBlock = `export const APP_VERSION_INFO: VersionInfo = {
  major: ${versionInfo.major},
  minor: ${versionInfo.minor},
  patch: ${versionInfo.patch},
  tag: '${versionInfo.tag || 'Release'}',
  buildDate: '${versionInfo.buildDate}',
  releaseCommit: '${versionInfo.releaseCommit}',
};`;

  if (versionInfoRegex.test(content)) {
    content = content.replace(versionInfoRegex, newVersionInfoBlock);
    fs.writeFileSync(filePath, content, 'utf-8');
  } else {
    console.warn(`Warning: APP_VERSION_INFO pattern not found in ${filePath}`);
  }
}

/**
 * Update package.json version field
 */
function updatePackageJson(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  try {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    pkg.version = newVersion;
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.warn(`Warning: Failed to update ${filePath}: ${err.message}`);
  }
}

/**
 * Update Dockerfile ARG APP_VERSION default or LABEL
 */
function updateDockerfile(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');

  // Update ARG APP_VERSION=... if present
  content = content.replace(/ARG\s+APP_VERSION=([^\s\n]+)/g, `ARG APP_VERSION=${newVersion}`);

  // Update org.opencontainers.image.version="..." if static string
  content = content.replace(
    /org\.opencontainers\.image\.version="(\d+\.\d+\.\d+)"/g,
    `org.opencontainers.image.version="${newVersion}"`
  );

  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Update docker-compose.portainer.yml default image tag
 */
function updatePortainerCompose(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/\$\{IMAGE_TAG:-[^}]+\}/g, `\${IMAGE_TAG:-${newVersion}}`);
  content = content.replace(
    /org\.opencontainers\.image\.version:\s*"\$\{IMAGE_TAG:-[^}]+\}"/g,
    `org.opencontainers.image.version: "\${IMAGE_TAG:-${newVersion}}"`
  );
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Synchronize all files to given versionInfo
 */
export function applyVersion(versionInfo, dryRun = false) {
  const fullVersionInfo = {
    major: versionInfo.major,
    minor: versionInfo.minor,
    patch: versionInfo.patch,
    version: `${versionInfo.major}.${versionInfo.minor}.${versionInfo.patch}`,
    tag: versionInfo.tag || 'Release',
    buildDate: versionInfo.buildDate || getTodayDateString(),
    releaseCommit: versionInfo.releaseCommit || `prod-v${versionInfo.major}.${versionInfo.minor}.${versionInfo.patch}-release`,
  };

  if (dryRun) {
    console.log('[DRY-RUN] Target version information:', fullVersionInfo);
    return fullVersionInfo;
  }

  // 1. Write version.json
  fs.writeFileSync(VERSION_FILE, JSON.stringify(fullVersionInfo, null, 2) + '\n', 'utf-8');

  // 2. Update backend appConfig.ts
  updateAppConfigFile(BACKEND_CONFIG, fullVersionInfo);

  // 3. Update frontend appConfig.ts
  updateAppConfigFile(FRONTEND_CONFIG, fullVersionInfo);

  // 4. Update package.jsons
  for (const pkgPath of PACKAGE_JSONS) {
    updatePackageJson(pkgPath, fullVersionInfo.version);
  }

  // 5. Update Dockerfiles
  for (const dockerPath of DOCKERFILES) {
    updateDockerfile(dockerPath, fullVersionInfo.version);
  }

  // 6. Update Portainer Docker Compose default tag
  updatePortainerCompose(PORTAINER_COMPOSE, fullVersionInfo.version);

  return fullVersionInfo;
}

/**
 * Validate version consistency across project files
 */
export function checkConsistency() {
  const ver = loadVersion();
  const issues = [];

  // Check backend appConfig
  if (fs.existsSync(BACKEND_CONFIG)) {
    const content = fs.readFileSync(BACKEND_CONFIG, 'utf-8');
    if (!content.includes(`major: ${ver.major}`) || !content.includes(`minor: ${ver.minor}`) || !content.includes(`patch: ${ver.patch}`)) {
      issues.push(`Backend appConfig.ts does not match version.json (${ver.version})`);
    }
  }

  // Check frontend appConfig
  if (fs.existsSync(FRONTEND_CONFIG)) {
    const content = fs.readFileSync(FRONTEND_CONFIG, 'utf-8');
    if (!content.includes(`major: ${ver.major}`) || !content.includes(`minor: ${ver.minor}`) || !content.includes(`patch: ${ver.patch}`)) {
      issues.push(`Frontend appConfig.ts does not match version.json (${ver.version})`);
    }
  }

  // Check all package.json files
  for (const pkgPath of PACKAGE_JSONS) {
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.version !== ver.version) {
        issues.push(`${path.relative(ROOT_DIR, pkgPath)} version (${pkg.version}) does not match version.json (${ver.version})`);
      }
    }
  }

  // Check all Dockerfiles
  for (const dockerPath of DOCKERFILES) {
    if (fs.existsSync(dockerPath)) {
      const content = fs.readFileSync(dockerPath, 'utf-8');
      if (!content.includes(`ARG APP_VERSION=${ver.version}`)) {
        issues.push(`${path.relative(ROOT_DIR, dockerPath)} ARG APP_VERSION does not match version.json (${ver.version})`);
      }
    }
  }

  // Check docker-compose.portainer.yml
  if (fs.existsSync(PORTAINER_COMPOSE)) {
    const content = fs.readFileSync(PORTAINER_COMPOSE, 'utf-8');
    if (!content.includes(`\${IMAGE_TAG:-${ver.version}}`)) {
      issues.push(`docker-compose.portainer.yml does not match version.json (${ver.version})`);
    }
  }

  return {
    version: ver.version,
    valid: issues.length === 0,
    issues,
  };
}

function printNextSteps(version) {
  console.log(`\n📋 Next Steps to Publish Release v${version}:`);
  console.log(`   1. git add -A`);
  console.log(`   2. git commit -m "Release v${version}"`);
  console.log(`   3. git tag -a v${version} -m "Release ${version}"`);
  console.log(`   4. git push origin main`);
  console.log(`   5. git push origin v${version}\n`);
}

// ==========================================
// CLI Execution
// ==========================================
function main() {
  const args = process.argv.slice(2);
  const command = (args[0] || 'current').toLowerCase();

  const current = loadVersion();

  if (command === 'current' || command === 'get') {
    console.log(current.version);
    return;
  }

  if (command === 'info') {
    console.log(JSON.stringify(current, null, 2));
    return;
  }

  if (command === 'check') {
    const result = checkConsistency();
    if (result.valid) {
      console.log(`✅ Version configuration is fully consistent: ${result.version}`);
    } else {
      console.error(`❌ Version inconsistencies found:`);
      for (const iss of result.issues) {
        console.error(`  - ${iss}`);
      }
      process.exit(1);
    }
    return;
  }

  if (command === 'sync') {
    const updated = applyVersion(current);
    console.log(`🔄 Synchronized all files to version ${updated.version} (${updated.releaseCommit})`);
    return;
  }

  if (command === 'bump' || command === 'release') {
    const bumpType = (args[1] || 'patch').toLowerCase();
    const next = calculateNextVersion(current, bumpType);
    const updated = applyVersion(next);
    console.log(`🚀 Version updated from ${current.version} to ${updated.version}`);
    console.log(`   Tag: v${updated.version}`);
    console.log(`   Build: ${updated.releaseCommit}`);
    console.log(`   Build Date: ${updated.buildDate}`);
    printNextSteps(updated.version);
    return;
  }

  if (command === 'set') {
    const explicitVersion = args[1];
    if (!explicitVersion) {
      console.error('Error: You must provide a version to set (e.g. node scripts/release.mjs set 15.2.0)');
      process.exit(1);
    }
    const next = parseSemVer(explicitVersion);
    const updated = applyVersion(next);
    console.log(`🚀 Version explicitly set from ${current.version} to ${updated.version}`);
    console.log(`   Tag: v${updated.version}`);
    console.log(`   Build: ${updated.releaseCommit}`);
    console.log(`   Build Date: ${updated.buildDate}`);
    printNextSteps(updated.version);
    return;
  }

  console.log(`
InfraInventory Release Manager
Usage:
  node scripts/release.mjs current             # Print current version
  node scripts/release.mjs bump [patch]        # Bump PATCH (11.0.0 -> 11.0.1)
  node scripts/release.mjs bump minor          # Bump MINOR (11.0.1 -> 11.1.0)
  node scripts/release.mjs bump major          # Bump MAJOR (11.1.0 -> 12.0.0)
  node scripts/release.mjs set <X.Y.Z>         # Set explicit version (e.g. 11.5.0)
  node scripts/release.mjs sync                # Re-sync files from version.json
  node scripts/release.mjs check               # Check version consistency across files
`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
