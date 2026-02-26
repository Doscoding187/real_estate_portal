import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

type DistributionIdentity = 'manager' | 'referrer';

type RequireDistributionIdentityProps = {
  identity: DistributionIdentity;
  children: React.ReactNode;
  loginPath?: string;
  fallbackPath?: string;
  allowSuperAdmin?: boolean;
};

export function RequireDistributionIdentity({
  identity,
  children,
  loginPath = '/login',
  fallbackPath = '/dashboard',
  allowSuperAdmin = true,
}: RequireDistributionIdentityProps) {
  const { isAuthenticated, user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const shouldSkipIdentityCheck = allowSuperAdmin && user?.role === 'super_admin';

  const managerStatusQuery = trpc.distribution.manager.status.useQuery(undefined, {
    enabled: isAuthenticated && identity === 'manager' && !shouldSkipIdentityCheck,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const referrerStatusQuery = trpc.distribution.referrer.status.useQuery(undefined, {
    enabled: isAuthenticated && identity === 'referrer' && !shouldSkipIdentityCheck,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const statusQuery = identity === 'manager' ? managerStatusQuery : referrerStatusQuery;

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      if (window.location.pathname !== loginPath) {
        setLocation(loginPath);
      }
      return;
    }

    if (shouldSkipIdentityCheck) return;
    if (statusQuery.isLoading) return;

    if (statusQuery.error || !statusQuery.data?.hasIdentity) {
      if (window.location.pathname !== fallbackPath) {
        setLocation(fallbackPath);
      }
    }
  }, [
    loading,
    isAuthenticated,
    loginPath,
    fallbackPath,
    shouldSkipIdentityCheck,
    statusQuery.isLoading,
    statusQuery.error,
    statusQuery.data,
    setLocation,
  ]);

  if (loading || (!shouldSkipIdentityCheck && statusQuery.isLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-slate-600">Checking access...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!shouldSkipIdentityCheck && (statusQuery.error || !statusQuery.data?.hasIdentity)) {
    return null;
  }

  return <>{children}</>;
}
