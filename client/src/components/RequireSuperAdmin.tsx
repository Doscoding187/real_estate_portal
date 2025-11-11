import { useAuth } from '@/_core/hooks/useAuth';
import { useEffect } from 'react';

export const RequireSuperAdmin = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'super_admin') {
      window.location.href = '/login';
    }
  }, [isAuthenticated, user?.role]);

  if (!isAuthenticated || user?.role !== 'super_admin') {
    return null;
  }

  return <>{children}</>;
};
