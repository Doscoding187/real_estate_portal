import { useAuth } from '@/_core/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { trpc } from '@/lib/trpc';
import NotFound from '@/pages/NotFound';
import { Helmet } from 'react-helmet-async';
import { useEffect, useRef, useState } from 'react';

type AccessDecision = {
  userId: number;
  accessible: boolean;
};

export default function ExploreOptionAPilot() {
  const {
    user,
    isAuthenticated,
    loading: authLoading,
  } = useAuth({ redirectOnUnauthenticated: true });
  const authenticatedUserId = isAuthenticated && typeof user?.id === 'number' ? user.id : null;
  const { refetch: refetchAccess } = trpc.discovery.getOptionAPilotAccess.useQuery(undefined, {
    enabled: false,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [accessDecision, setAccessDecision] = useState<AccessDecision | null>(null);
  const accessRequestVersion = useRef(0);

  useEffect(() => {
    const requestVersion = ++accessRequestVersion.current;
    setAccessDecision(null);

    if (authLoading || authenticatedUserId === null) {
      return;
    }

    void refetchAccess().then(
      result => {
        if (accessRequestVersion.current !== requestVersion) return;

        setAccessDecision({
          userId: authenticatedUserId,
          accessible: result.data?.accessible === true,
        });
      },
      () => {
        if (accessRequestVersion.current !== requestVersion) return;

        setAccessDecision({ userId: authenticatedUserId, accessible: false });
      },
    );
  }, [authenticatedUserId, authLoading, refetchAccess]);

  if (
    authLoading ||
    (isAuthenticated &&
      (authenticatedUserId === null || accessDecision?.userId !== authenticatedUserId))
  ) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        data-testid="explore-option-a-pilot-loading"
      >
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated || accessDecision?.accessible !== true) {
    return <NotFound />;
  }

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main
        className="flex min-h-screen items-center justify-center bg-slate-50 p-6"
        data-testid="explore-option-a-pilot-boundary"
      >
        <section className="max-w-xl text-center text-slate-700">
          <h1 className="text-2xl font-semibold">Explore Option A pilot boundary</h1>
          <p className="mt-3">Phase 0 isolation is active.</p>
        </section>
      </main>
    </>
  );
}
