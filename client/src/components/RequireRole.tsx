import { useAuth } from '@/_core/hooks/useAuth';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

type RequireRoleProps = {
  role: string | string[];
  children: React.ReactNode;
  redirectTo?: string;
};

function isRoleAllowed(userRole: string | undefined, required: string | string[]) {
  if (!userRole) return false;
  if (Array.isArray(required)) {
    return required.includes(userRole);
  }
  return userRole === required;
}

export const RequireRole = ({ role, children, redirectTo = '/login' }: RequireRoleProps) => {
  const { isAuthenticated, user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Bail out while auth status is loading (prevents flash-of-unauthenticated)
    if (loading) return;

    // If not authorized, redirect client-side.
    if (!isAuthenticated || !isRoleAllowed(user?.role, role)) {
      if (window.location.pathname !== redirectTo) {
        setLocation(redirectTo);
      }
    }
  }, [isAuthenticated, user, loading, role, redirectTo, setLocation]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-slate-600">Checking access...</span>
      </div>
    );
  }

  if (!isAuthenticated || !isRoleAllowed(user?.role, role)) {
    return null;
  }

  return <>{children}</>;
};
