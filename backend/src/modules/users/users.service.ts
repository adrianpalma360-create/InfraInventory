import { PrismaClient, ChangeAction, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserPasswordInput,
  UserQueryInput,
} from './users.schema.js';
import { logChange } from '../../utils/changelog.js';

export class UsersService {
  constructor(private prisma: PrismaClient) {}

  async listUsers(query: UserQueryInput) {
    const { search, role, isActive, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

    return user;
  }

  async createUser(input: CreateUserInput, requestedBy: string) {
    // Check username uniqueness
    const existingUsername = await this.prisma.user.findFirst({
      where: { username: { equals: input.username, mode: 'insensitive' } },
    });
    if (existingUsername) {
      throw new Error(`El nombre de usuario "${input.username}" ya está registrado`);
    }

    // Check email uniqueness if provided
    if (input.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: { equals: input.email, mode: 'insensitive' } },
      });
      if (existingEmail) {
        throw new Error(`El email "${input.email}" ya está registrado`);
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const created = await this.prisma.user.create({
      data: {
        username: input.username,
        name: input.name,
        email: input.email || null,
        passwordHash,
        role: input.role,
        isActive: input.isActive,
        mustChangePassword: input.mustChangePassword,
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
      entityId: created.id,
      action: ChangeAction.CREATE,
      details: `Usuario ${created.username} (${created.name}) creado con rol ${created.role}`,
      user: requestedBy,
    });

    return created;
  }

  async updateUser(id: string, input: UpdateUserInput, requestedBy: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Check if modifying role / active status of the last admin
    if (user.role === Role.ADMIN) {
      if (input.role && input.role !== Role.ADMIN) {
        const adminCount = await this.prisma.user.count({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (adminCount <= 1) {
          throw new Error('No se puede cambiar el rol del único Administrador activo del sistema');
        }
      }

      if (input.isActive === false) {
        const activeAdminCount = await this.prisma.user.count({
          where: { role: Role.ADMIN, isActive: true, NOT: { id } },
        });
        if (activeAdminCount === 0) {
          throw new Error('No se puede desactivar al único Administrador activo del sistema');
        }
      }
    }

    // Check email uniqueness if modified
    if (input.email && input.email !== user.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: { equals: input.email, mode: 'insensitive' }, NOT: { id } },
      });
      if (existing) {
        throw new Error('El correo electrónico ya está registrado por otro usuario');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: input.name ?? user.name,
        email: input.email !== undefined ? input.email : user.email,
        role: input.role ?? user.role,
        isActive: input.isActive ?? user.isActive,
        mustChangePassword: input.mustChangePassword ?? user.mustChangePassword,
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
      entityId: updated.id,
      action: ChangeAction.UPDATE,
      details: `Usuario ${updated.username} actualizado (Rol: ${updated.role}, Activo: ${updated.isActive})`,
      user: requestedBy,
    });

    return updated;
  }

  async setPassword(id: string, input: UpdateUserPasswordInput, requestedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: input.mustChangePassword,
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
      details: `Contraseña restablecida administrativamente para el usuario ${user.username}`,
      user: requestedBy,
    });

    return updated;
  }

  async deleteUser(id: string, requestedBy: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new Error('No puedes eliminar tu propia cuenta de usuario activa');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.role === Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN, isActive: true, NOT: { id } },
      });
      if (adminCount === 0) {
        throw new Error('No se puede eliminar al único Administrador del sistema');
      }
    }

    await this.prisma.user.delete({ where: { id } });

    await logChange({
      prisma: this.prisma,
      entityType: 'User',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Usuario ${user.username} (${user.name} - [${user.role}]) eliminado del sistema`,
      user: requestedBy,
    });

    return { success: true, message: `Usuario ${user.username} eliminado correctamente` };
  }
}
