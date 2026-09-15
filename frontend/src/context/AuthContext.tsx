import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Permission, Role } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  mustChangePassword: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAuthSession: (user: User, permissions: Permission[]) => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: Role | Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const setupStatus = await api.getSetupStatus();
      setIsConfigured(setupStatus.isConfigured);

      if (setupStatus.isConfigured) {
        const data = await api.getMe();
        setUser(data);
        setPermissions(data.permissions || []);
      } else {
        setUser(null);
        setPermissions([]);
      }
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen for 401 unauthorized event from api requests
    const handleUnauthorized = () => {
      setUser(null);
      setPermissions([]);
      localStorage.removeItem('palma_auth_token');
    };

    window.addEventListener('palma:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('palma:unauthorized', handleUnauthorized);
    };
  }, [refreshUser]);

  const login = async (credentials: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      setUser(res.user);
      setPermissions(res.permissions || []);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setPermissions([]);
      setIsLoading(false);
    }
  };

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      if (user.role === 'ADMIN') return true;
      return permissions.includes(permission);
    },
    [user, permissions]
  );

  const hasRole = useCallback(
    (role: Role | Role[]): boolean => {
      if (!user) return false;
      if (Array.isArray(role)) {
        return role.includes(user.role);
      }
      return user.role === role;
    },
    [user]
  );

  const setAuthSession = useCallback((newUser: User, newPermissions: Permission[]) => {
    setUser(newUser);
    setPermissions(newPermissions);
    setIsConfigured(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        isConfigured,
        mustChangePassword: !!user?.mustChangePassword,
        login,
        logout,
        refreshUser,
        setAuthSession,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Component helper for declarative UI permission checking
interface CanProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ permission, children, fallback = null }) => {
  const { hasPermission } = useAuth();
  if (hasPermission(permission)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
};
