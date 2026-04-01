import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export type AgencyOnboardingStatus = {
  hasAgency: boolean;
  profileConfigured: boolean;
  brandingConfigured: boolean;
  billingActivated: boolean;
  teamReady: boolean;
  onboardingStep: number;
  dashboardUnlocked: boolean;
  fullFeaturesUnlocked: boolean;
  recommendedNextStep: string;
  teamMembersCount: number;
  invitationsCount: number;
  agency: {
    id: number;
    name: string;
    slug: string;
    subscriptionStatus: string;
    subscriptionPlan: string;
    city: string | null;
    province: string | null;
  } | null;
};

type UseAgencyOnboardingStatusOptions = {
  requireDashboardUnlocked?: boolean;
};

export function useAgencyOnboardingStatus(options: UseAgencyOnboardingStatusOptions = {}) {
  const { requireDashboardUnlocked = false } = options;
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const statusQuery = trpc.agency.getOnboardingStatus.useQuery(undefined, {
    enabled: user?.role === 'agency_admin',
    retry: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (authLoading || statusQuery.isLoading) return;
    if (user?.role !== 'agency_admin') return;

    const status = statusQuery.data;

    if (!status?.hasAgency) {
      if (window.location.pathname !== '/agency/setup') setLocation('/agency/setup');
      return;
    }

    if (requireDashboardUnlocked && !status.dashboardUnlocked) {
      if (window.location.pathname !== '/agency/setup') setLocation('/agency/setup');
      return;
    }

    if (statusQuery.error) {
      if (window.location.pathname !== '/agency/setup') setLocation('/agency/setup');
    }
  }, [
    authLoading,
    requireDashboardUnlocked,
    setLocation,
    statusQuery.data,
    statusQuery.error,
    statusQuery.isLoading,
    user?.role,
  ]);

  return {
    status: statusQuery.data ?? null,
    isLoading: authLoading || statusQuery.isLoading,
  };
}
