import { PrismaClient, ChangeAction } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { LoginInput, ChangePasswordInput, UpdateProfileInput } from './auth.schema.js';
import { logChange } from '../../utils/changelog.js';
import { getRolePermissions } from '../../utils/permissions.js';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async login(input: LoginInput) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: input.username, mode: 'insensitive' } },
          { email: { equals: input.username, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      await logChange({
        prisma: this.prisma,
        entityType: 'User',
        entityId: 'system',
        action: ChangeAction.UPDATE,
        details: `Intento fallido de inicio de sesión para el usuario: ${input.username} (Usuario no encontrado)`,
        user: input.username,
      });
      throw new Error('Credenciales incorrectas');
    }

    if (!user.isActive) {
      await logChange({
        prisma: this.prisma,
        entityType: 'User',
        entityId: user.id,
        action: ChangeAction.UPDATE,
        details: `Intento de acceso rechazado: Usuario ${user.username} desactivado`,
        user: user.username,
      });
      throw new Error('Tu cuenta se encuentra desactivada. Contacta con un administrador.');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);

    if (!isMatch) {
      await logChange({
        prisma: this.prisma,
        entityType: 'User',
        entityId: user.id,
        action: ChangeAction.UPDATE,
        details: `Intento fallido de inicio de sesión para el usuario: ${user.username} (Contraseña incorrecta)`,
        user: user.username,
      });
      throw new Error('Credenciales incorrectas');
    }

    // Update last login
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'User',
      entityId: user.id,
      action: ChangeAction.UPDATE,
      details: `Inicio de sesión satisfactorio para ${user.username} [${user.role}]`,
      user: user.username,
    });

    return {
      user: updatedUser,
      permissions: getRolePermissions(updatedUser.role),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return {
      ...user,
      permissions: getRolePermissions(user.role),
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (input.email && input.email !== user.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: input.email, NOT: { id: userId } },
      });
      if (existing) {
        throw new Error('El correo electrónico ya está registrado por otro usuario');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name ?? user.name,
        email: input.email !== undefined ? input.email : user.email,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'User',
      entityId: user.id,
      action: ChangeAction.UPDATE,
      details: `Perfil de usuario ${user.username} actualizado`,
      user: user.username,
    });

    return {
      ...updated,
      permissions: getRolePermissions(updated.role),
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const isMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error('La contraseña actual es incorrecta');
    }

    if (input.newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLogin: true,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'User',
      entityId: user.id,
      action: ChangeAction.UPDATE,
      details: `Contraseña modificada correctamente por el usuario ${user.username}`,
      user: user.username,
    });

    return {
      user: updated,
      permissions: getRolePermissions(updated.role),
    };
  }
}
