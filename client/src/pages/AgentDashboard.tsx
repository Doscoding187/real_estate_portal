import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { AgentDashboardOverview } from '@/components/agent/AgentDashboardOverview';
import { apiFetch } from '@/lib/api';

type AgentOnboardingGuard = {
  packageSelected: boolean;
  dashboardUnlocked: boolean;
};

export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  // Check if agent profile exists
  const agentProfileQuery = trpc.agent.getDashboardStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'agent',
    retry: false,
  });
  const { isLoading: isLoadingProfile, error } = agentProfileQuery;

  useEffect(() => {
    if (!error) return;
    if (error.message.includes('Agent profile not found')) {
      setLocation('/agent/setup');
    }
  }, [error, setLocation]);

  useEffect(() => {
    if (loading || !isAuthenticated || user?.role !== 'agent') return;

    let cancelled = false;

    const checkOnboarding = async () => {
      try {
        const onboarding = await apiFetch<AgentOnboardingGuard>('/agent/onboarding-status');
        if (cancelled) return;

        if (!onboarding.packageSelected) {
          setLocation('/agent/select-package');
          return;
        }

        if (!onboarding.dashboardUnlocked) {
          setLocation('/agent/setup');
        }
      } catch {
        if (!cancelled) {
          setLocation('/agent/select-package');
        }
      }
    };

    void checkOnboarding();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, setLocation, user?.role]);

  // Show loading spinner while auth is being checked
  if (loading || isLoadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AgentAppShell>
      <AgentDashboardOverview />
    </AgentAppShell>
  );
}
