import { useAuth } from '@/_core/hooks/useAuth';
import { getAccountAuthHref } from '@/lib/publicNavigation';
import { UNAUTHED_ERR_MSG } from '../../../shared/const';
import { TRPCClientError } from '@trpc/client';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

const normalizeRole = (value?: string | null) => {
  if (value === 'user') return 'visitor';
  if (value === 'admin') return 'super_admin';
  return value;
};

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
    case 'service_provider':
      return '/service/dashboard';
    case 'visitor':
      return '/user/dashboard';
    default:
      return '/dashboard';
  }
};

export const RequireRole = ({
  role,
  children,
  unauthenticatedAuthEntry,
  roleMismatchFallback,
}: {
  role: string;
  children: React.ReactNode;
  /**
   * Optional contextual auth entry. When set, unauthenticated visitors are
   * routed to /login with the requested mode, role preselection and return
   * path instead of a context-free /login bounce. Defaults stay unchanged.
   */
  unauthenticatedAuthEntry?: 'signin' | 'register';
  /**
   * Optional assisted-entry UI. When set, a signed-in user with the wrong
   * role sees this fallback instead of being silently redirected to their
   * role home. It never grants access; authorization stays server-enforced.
   */
  roleMismatchFallback?: React.ReactNode;
}) => {
  const { isAuthenticated, user, loading, error } = useAuth();
  const [, setLocation] = useLocation();
  const requiredRole = normalizeRole(role);
  const actualRole = normalizeRole(user?.role);
  const isUnauthorizedError =
    error instanceof TRPCClientError &&
    (error.data?.code === 'UNAUTHORIZED' || error.message === UNAUTHED_ERR_MSG);

  useEffect(() => {
    if (loading) return;
    if (error && !isUnauthorizedError) return;

      if (!isAuthenticated) {
        if (window.location.pathname !== '/login') {
          const currentPath = `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`;
          let loginPath = '/login';
          if (unauthenticatedAuthEntry) {
            loginPath = getAccountAuthHref(unauthenticatedAuthEntry, currentPath, {
              registerRole: requiredRole ?? undefined,
            });
          }
          setLocation(loginPath);
        }
        return;
      }

    if (actualRole !== requiredRole && !roleMismatchFallback) {
      const fallbackPath = getRoleHomePath(actualRole);
      if (window.location.pathname !== fallbackPath) setLocation(fallbackPath);
    }
  }, [
    actualRole,
    error,
    isAuthenticated,
    isUnauthorizedError,
    loading,
    requiredRole,
    setLocation,
    unauthenticatedAuthEntry,
    // The redirect skip only depends on fallback presence; render identity is
    // controlled by the call site (stable module-level element).
    roleMismatchFallback !== undefined,
  ]);

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

  if (!isAuthenticated) {
    return null;
  }

  if (actualRole !== requiredRole) {
    return <>{roleMismatchFallback ?? null}</>;
  }

  return <>{children}</>;
};
