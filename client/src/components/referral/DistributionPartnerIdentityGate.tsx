import type { ReactNode } from 'react';
import { useLocation, Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

export function DistributionPartnerIdentityGate({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const statusQuery = trpc.distribution.referrer.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  if (loading || (isAuthenticated && (statusQuery.isLoading || statusQuery.isFetching))) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in to continue</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Distribution Network access uses your existing Property Listify account.
        </p>
        <Button
          className="mt-5"
          onClick={() => setLocation('/login?next=/distribution/partner/overview')}
        >
          Sign in
        </Button>
      </main>
    );
  }

  if (statusQuery.isError) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">We could not check access</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your Distribution workspace has not been opened. Try again in a moment.
        </p>
        <Button className="mt-5" variant="outline" onClick={() => void statusQuery.refetch()}>
          Try again
        </Button>
      </main>
    );
  }

  if (!statusQuery.data?.hasIdentity) {
    return <Redirect to="/distribution/partner/overview" />;
  }

  return <>{children}</>;
}
