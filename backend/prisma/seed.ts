import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting InfraInventory database seed...');

  // 1. User Seeding (Only if explicit AUTO_BOOTSTRAP_ADMIN=true with explicit ADMIN_PASSWORD)
  const autoBootstrap = process.env.AUTO_BOOTSTRAP_ADMIN === 'true';
  const existingUsersCount = await prisma.user.count();

  if (autoBootstrap && existingUsersCount === 0) {
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@infrainventory.local').trim().toLowerCase();

    if (!adminPassword || adminPassword.length < 8) {
      console.warn('⚠️ AUTO_BOOTSTRAP_ADMIN enabled but no valid ADMIN_PASSWORD provided (min 8 chars). Skipping bootstrap user.');
    } else {
      console.log('⚡ AUTO_BOOTSTRAP_ADMIN enabled: Creating bootstrap administrator...');
      const adminHash = await bcrypt.hash(adminPassword, 12);

      const adminUser = await prisma.user.upsert({
        where: { username: adminUsername },
        update: {
          name: 'administrador',
          role: Role.ADMIN,
          isActive: true,
          passwordHash: adminHash,
          mustChangePassword: false,
        },
        create: {
          username: adminUsername,
          name: 'administrador',
          email: adminEmail,
          passwordHash: adminHash,
          role: Role.ADMIN,
          isActive: true,
          mustChangePassword: false,
        },
      });
      console.log(`👤 Admin User created/updated: ${adminUser.username} (${adminUser.name})`);

      await prisma.systemSetting.upsert({
        where: { key: 'INSTALLATION_STATUS' },
        update: { value: 'CONFIGURED' },
        create: {
          key: 'INSTALLATION_STATUS',
          value: 'CONFIGURED',
          description: 'Estado de instalación del sistema InfraInventory',
        },
      });
    }
  } else if (existingUsersCount > 0) {
    console.log(`ℹ️ Existing installation detected (${existingUsersCount} users found). Preserving user accounts.`);
    await prisma.systemSetting.upsert({
      where: { key: 'INSTALLATION_STATUS' },
      update: { value: 'CONFIGURED' },
      create: {
        key: 'INSTALLATION_STATUS',
        value: 'CONFIGURED',
        description: 'Estado de instalación del sistema InfraInventory',
      },
    });
  } else {
    console.log('✨ Fresh installation mode: No default users created. Ready for /setup interactive wizard.');
  }

  // 2. Create Common Services Catalog (Lookup dictionary for Port Scanning & Services)
  const services = [
    { name: 'HTTP', defaultPort: 80, protocol: 'TCP', description: 'Hypertext Transfer Protocol' },
    { name: 'HTTPS', defaultPort: 443, protocol: 'TCP', description: 'HTTP Secure' },
    { name: 'SSH', defaultPort: 22, protocol: 'TCP', description: 'Secure Shell' },
    { name: 'RDP', defaultPort: 3389, protocol: 'TCP', description: 'Remote Desktop Protocol' },
    { name: 'SQL Server', defaultPort: 1433, protocol: 'TCP', description: 'Microsoft SQL Server' },
    { name: 'PostgreSQL', defaultPort: 5432, protocol: 'TCP', description: 'PostgreSQL Relational Database' },
    { name: 'MySQL / MariaDB', defaultPort: 3306, protocol: 'TCP', description: 'MySQL Relational Database' },
    { name: 'Proxmox API / Web', defaultPort: 8006, protocol: 'TCP', description: 'Proxmox VE Web Management Console' },
    { name: 'DNS', defaultPort: 53, protocol: 'UDP', description: 'Domain Name System' },
    { name: 'SNMP', defaultPort: 161, protocol: 'UDP', description: 'Simple Network Management Protocol' },
    { name: 'NFS / SMB', defaultPort: 445, protocol: 'TCP', description: 'Server Message Block / Network File Sharing' },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }
  console.log(`🔌 Catalog of ${services.length} common network services ready.`);

  // 3. Initialize Global System Settings
  const defaultSettings = [
    { key: 'organizationName', value: 'InfraInventory' },
    { key: 'discoveryTimeoutMs', value: '600' },
    { key: 'discoveryConcurrency', value: '32' },
    { key: 'sessionExpiryDays', value: '7' },
    { key: 'enableAuditLogs', value: 'true' },
    { key: 'auditRetentionDays', value: '90' },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('⚙️ Default system settings configured.');
  console.log('✅ InfraInventory Seed completed (Clean Production Mode).');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
