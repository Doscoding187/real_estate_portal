import { useAuth } from '@/_core/hooks/useAuth';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export const RequireSuperAdmin = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || user?.role !== 'super_admin') {
      if (window.location.pathname !== '/login') {
        setLocation('/login');
      }
    }
  }, [isAuthenticated, user, loading, setLocation]);

  if (loading) {
    return (
      <div className="p-4">
        <span className="text-slate-600">Checking access…</span>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'super_admin') return null;

  return <>{children}</>;
};
