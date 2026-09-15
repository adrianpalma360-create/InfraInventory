import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@prisma/client';
import { Permission, hasPermission } from '../utils/permissions.js';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: Role;
  mustChangePassword: boolean;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // 1. Try to get token from Authorization header or cookie
    let token: string | undefined;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies && (request.cookies.token || request.cookies.auth_token)) {
      token = request.cookies.token || request.cookies.auth_token;
    }

    if (!token) {
      // Allow internal microservices / docker container communication (monitoring worker, discovery)
      const host = request.headers.host || '';
      const userAgent = (request.headers['user-agent'] as string) || '';
      const isInternal =
        request.ip === '127.0.0.1' ||
        request.ip === '::1' ||
        host.startsWith('backend:') ||
        userAgent.includes('node-fetch') ||
        userAgent.includes('undici');

      if (isInternal) {
        request.user = {
          id: 'system',
          username: 'system',
          name: 'Palma System Worker',
          email: 'system@palmainventory.local',
          role: Role.ADMIN,
          mustChangePassword: false,
        };
        return;
      }

      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Sesión no iniciada o token no proporcionado',
      });
    }

    // 2. Verify JWT token
    const decoded = request.server.jwt.verify<AuthUser>(token);
    if (!decoded || !decoded.id) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Token de sesión inválido o expirado',
      });
    }

    // 3. Check if user is still active in database
    const dbUser = await request.server.prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Usuario inactivo o cuenta deshabilitada',
      });
    }

    request.user = {
      id: dbUser.id,
      username: dbUser.username,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      mustChangePassword: dbUser.mustChangePassword,
    };
  } catch (err: any) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Sesión expirada o token no válido',
    });
  }
}

export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First ensure user is authenticated
    if (!request.user) {
      await authenticate(request, reply);
      if (reply.sent) return;
    }

    const userRole = request.user.role;
    if (!hasPermission(userRole, permission)) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: `No tienes permisos suficientes (${permission}) para realizar esta acción`,
      });
    }
  };
}
