import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import type {
  AgencyRecommendedNextStep,
  AgencySubscriptionDisplayStatus,
} from '@shared/agencyJourney';
import { useCallback, useEffect } from 'react';
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
  recommendedNextStep: AgencyRecommendedNextStep;
  teamMembersCount: number;
  invitationsCount: number;
  accessState: AgencyAccessState;
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

export type AgencyAccessState = {
  onboardingComplete: boolean;
  billingStatus: AgencySubscriptionDisplayStatus;
  planKey: string | null;
  planAccessSource: string;
  degraded: boolean;
  fallbackReason: string | null;
  actionableReason: string;
  workspaceAccess: {
    listings: boolean;
    publishing: boolean;
    teamManagement: boolean;
    reporting: boolean;
  };
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
  const { refetch: refetchStatus } = statusQuery;
  const retry = useCallback(() => {
    void refetchStatus();
  }, [refetchStatus]);

  useEffect(() => {
    if (authLoading || statusQuery.isLoading) return;
    if (user?.role !== 'agency_admin') return;

    const status = statusQuery.data;

    // A failed or absent response is not evidence that the Agency has not
    // been created. Preserve the current route and let the workspace offer a
    // retry instead of incorrectly bouncing an owner into setup.
    if (statusQuery.error || !status) return;

    if (!status.hasAgency) {
      if (window.location.pathname !== '/agency/setup') setLocation('/agency/setup');
      return;
    }

    if (requireDashboardUnlocked && !status.dashboardUnlocked) {
      if (window.location.pathname !== '/agency/setup') setLocation('/agency/setup');
      return;
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
    error: statusQuery.error
      ? 'We could not confirm your Agency workspace access right now.'
      : null,
    retry,
  };
}
