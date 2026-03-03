import { useAuth } from '@/_core/hooks/useAuth';
import { UNAUTHED_ERR_MSG } from '../../../shared/const';
import { TRPCClientError } from '@trpc/client';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export const RequireRole = ({ role, children }: { role: string; children: React.ReactNode }) => {
  const { isAuthenticated, user, loading, error } = useAuth();
  const [, setLocation] = useLocation();
  const normalizeRole = (value?: string | null) => {
    if (value === 'user') return 'visitor';
    if (value === 'admin') return 'super_admin';
    return value;
  };
  const requiredRole = normalizeRole(role);
  const actualRole = normalizeRole(user?.role);

  const getRoleHomePath = (currentRole?: string | null) => {
    switch (normalizeRole(currentRole)) {
      case 'super_admin':
        return '/admin/overview';
      case 'property_developer':
        return '/developer/dashboard';
      case 'agency_admin':
        return '/agency/dashboard';
      case 'agent':
        return '/agent/dashboard';
      case 'visitor':
        return '/user/dashboard';
      default:
        return '/dashboard';
    }
  };

  const isUnauthorizedError =
    error instanceof TRPCClientError &&
    (error.data?.code === 'UNAUTHORIZED' || error.message === UNAUTHED_ERR_MSG);

  useEffect(() => {
    if (loading) return;
    if (error && !isUnauthorizedError) return;

    if (!isAuthenticated) {
      if (window.location.pathname !== '/login') setLocation('/login');
      return;
    }

    if (actualRole !== requiredRole) {
      const fallbackPath = getRoleHomePath(actualRole);
      if (window.location.pathname !== fallbackPath) setLocation(fallbackPath);
    }
  }, [actualRole, error, isAuthenticated, isUnauthorizedError, loading, requiredRole, setLocation]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-slate-600">Checking access...</span>
      </div>
    );
  }

  if (error && !isUnauthorizedError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-slate-600">Unable to verify your session right now.</span>
      </div>
    );
  }

  if (!isAuthenticated || actualRole !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};
