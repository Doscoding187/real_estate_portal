import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { apiFetch } from '@/lib/api';

export type AgentEntitlementsSnapshot = {
  trialExpired: boolean;
  canPublishListings: boolean;
  canReceiveLeads: boolean;
  canAppearInDirectory: boolean;
  trialStatusDetail: {
    status: 'active' | 'expired' | 'none';
    trialEndsAt: string | null;
    daysRemaining: number | null;
  };
  featureFlags: {
    maxActiveListings: number;
    hasAiInsights: boolean;
    hasAreaIntelligence: boolean;
    hasCommissionTracking: boolean;
    hasRevenueDashboard: boolean;
    hasTeamDashboard: boolean;
    hasRecruitmentFunnel: boolean;
    hasBenchmarking: boolean;
    hasPriorityExposure: boolean;
  };
};

export type AgentOnboardingStatus = {
  packageSelected: boolean;
  onboardingStep: number;
  onboardingComplete: boolean;
  dashboardUnlocked: boolean;
  fullFeaturesUnlocked: boolean;
  recommendedNextStep: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  profileCompletionScore: number;
  profileCompletionFlags: string[];
  entitlements: AgentEntitlementsSnapshot;
};

type UseAgentOnboardingStatusOptions = {
  requireDashboardUnlocked?: boolean;
};

export function useAgentOnboardingStatus(options: UseAgentOnboardingStatusOptions = {}) {
  const { requireDashboardUnlocked = false } = options;
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [status, setStatus] = useState<AgentOnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'agent') {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      setIsLoading(true);
      try {
        const result = await apiFetch<AgentOnboardingStatus>('/agent/onboarding-status');
        if (cancelled) return;

        if (!result.packageSelected) {
          setLocation('/agent/select-package');
          return;
        }

        if (requireDashboardUnlocked && !result.dashboardUnlocked) {
          setLocation('/agent/setup');
          return;
        }

        setStatus(result);
      } catch {
        if (!cancelled) {
          setLocation('/agent/select-package');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [authLoading, requireDashboardUnlocked, setLocation, user?.role]);

  return {
    status,
    isLoading: authLoading || isLoading,
  };
}
