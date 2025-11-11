import { useAuth } from '@/_core/hooks/useAuth';
import { Navigate } from 'wouter';

export const RequireSuperAdmin = ({
  children,
}: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || user?.role !== 'super_admin') {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};