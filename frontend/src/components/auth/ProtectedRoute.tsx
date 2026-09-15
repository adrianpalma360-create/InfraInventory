import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { SetupPage } from '../../pages/SetupPage.js';
import { MustChangePasswordModal } from './MustChangePasswordModal.js';
import { Loader2, Activity } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isConfigured, mustChangePassword, setAuthSession } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex flex-col items-center justify-center text-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] flex items-center justify-center shadow-xl shadow-cyan-500/20 mb-4 animate-pulse">
          <Activity className="w-6 h-6 text-[#0B0F14]" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#06B6D4]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Verificando sesión segura del NOC...</span>
        </div>
      </div>
    );
  }

  // 1. Initial Setup redirection if installation is not configured yet
  if (!isConfigured) {
    return <SetupPage onComplete={(user, permissions) => setAuthSession(user, permissions)} />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      {children}
      {mustChangePassword && <MustChangePasswordModal isOpen={true} />}
    </>
  );
};
