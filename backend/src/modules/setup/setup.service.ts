import { PrismaClient, Role, ChangeAction } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { InitializeSetupInput } from './setup.schema.js';
import { logChange } from '../../utils/changelog.js';
import { getRolePermissions } from '../../utils/permissions.js';

export class SetupService {
  constructor(private prisma: PrismaClient) {}

  async getSetupStatus(): Promise<{ isConfigured: boolean; status: 'CONFIGURED' | 'NOT_CONFIGURED' }> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'INSTALLATION_STATUS' },
      });

      if (setting && setting.value === 'CONFIGURED') {
        return { isConfigured: true, status: 'CONFIGURED' };
      }

      // Backward compatibility check for existing installations with existing admin users
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN },
      });

      if (adminCount > 0) {
        // Automatically persist CONFIGURED state to avoid re-checking in future
        await this.prisma.systemSetting.upsert({
          where: { key: 'INSTALLATION_STATUS' },
          update: { value: 'CONFIGURED' },
          create: {
            key: 'INSTALLATION_STATUS',
            value: 'CONFIGURED',
            description: 'Estado de instalación del sistema InfraInventory',
          },
        });
        return { isConfigured: true, status: 'CONFIGURED' };
      }

      return { isConfigured: false, status: 'NOT_CONFIGURED' };
    } catch (error) {
      console.error('Error checking setup status:', error);
      return { isConfigured: false, status: 'NOT_CONFIGURED' };
    }
  }

  async initialize(input: InitializeSetupInput) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Verify that setup is not already completed (race condition protection)
      const setting = await tx.systemSetting.findUnique({
        where: { key: 'INSTALLATION_STATUS' },
      });

      if (setting && setting.value === 'CONFIGURED') {
        throw new Error('InfraInventory ya está configurado. El asistente de instalación se encuentra bloqueado.');
      }

      const existingAdminCount = await tx.user.count({
        where: { role: Role.ADMIN },
      });

      if (existingAdminCount > 0) {
        throw new Error('Ya existe un usuario administrador configurado en el sistema.');
      }

      // 2. Check if username or email is already taken
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: input.username.trim(), mode: 'insensitive' } },
            { email: { equals: input.email.trim(), mode: 'insensitive' } },
          ],
        },
      });

      if (existingUser) {
        throw new Error('El nombre de usuario o correo electrónico ya se encuentra registrado.');
      }

      // 3. Hash password securely with bcrypt (12 rounds)
      const passwordHash = await bcrypt.hash(input.password, 12);

      // 4. Create single initial administrator
      const adminUser = await tx.user.create({
        data: {
          name: input.name.trim(),
          username: input.username.trim().toLowerCase(),
          email: input.email.trim().toLowerCase(),
          passwordHash,
          role: Role.ADMIN,
          isActive: true,
          mustChangePassword: false,
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          lastLogin: true,
          createdAt: true,
        },
      });

      // 5. Persist general and installation configuration settings
      const settingsToSave = [
        { key: 'INSTALLATION_STATUS', value: 'CONFIGURED', description: 'Estado de instalación inicial' },
        { key: 'SETUP_COMPLETED_AT', value: new Date().toISOString(), description: 'Fecha y hora de finalización del setup' },
        {
          key: 'organizationName',
          value: input.organizationName?.trim() || 'InfraInventory NOC',
          description: 'Nombre de la organización',
        },
      ];

      if (input.description?.trim()) {
        settingsToSave.push({
          key: 'organizationDescription',
          value: input.description.trim(),
          description: 'Descripción de la infraestructura',
        });
      }

      if (input.timezone?.trim()) {
        settingsToSave.push({
          key: 'systemTimezone',
          value: input.timezone.trim(),
          description: 'Zona horaria del sistema',
        });
      }

      if (input.language?.trim()) {
        settingsToSave.push({
          key: 'systemLanguage',
          value: input.language.trim(),
          description: 'Idioma predeterminado del sistema',
        });
      }

      for (const item of settingsToSave) {
        await tx.systemSetting.upsert({
          where: { key: item.key },
          update: { value: item.value },
          create: item,
        });
      }

      // 6. Log audit entry for installation initialization
      await logChange({
        prisma: tx as unknown as PrismaClient,
        entityType: 'Settings',
        entityId: 'setup',
        action: ChangeAction.CREATE,
        details: `Instalación inicial completada con éxito. Administrador ${adminUser.username} creado.`,
        user: adminUser.username,
      });

      return {
        user: adminUser,
        permissions: getRolePermissions(Role.ADMIN),
      };
    });
  }
}
