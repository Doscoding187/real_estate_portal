import { useAuth } from '@/_core/hooks/useAuth';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export const RequireRole = ({ role, children }: { role: string; children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== role) {
      setLocation('/login');
    }
  }, [isAuthenticated, user?.role, role, setLocation]);

  if (!isAuthenticated || user?.role !== role) {
    return null;
  }

  return <>{children}</>;
};
