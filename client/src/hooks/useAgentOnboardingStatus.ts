import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import type {
  AgentRecommendedNextStep,
  AgentSubscriptionDisplayStatus,
} from '@shared/agentJourney';

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
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  onboardingStep: number;
  onboardingComplete: boolean;
  dashboardUnlocked: boolean;
  fullFeaturesUnlocked: boolean;
  recommendedNextStep: AgentRecommendedNextStep;
  subscriptionTier: string;
  subscriptionStatus: AgentSubscriptionDisplayStatus;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  profile?: {
    slug?: string | null;
  } | null;
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
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const retry = useCallback(() => {
    setRequestVersion(version => version + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'agent') {
      setStatus(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiFetch<AgentOnboardingStatus>('/agent/onboarding-status');
        if (cancelled) return;

        // Professional identity work is available before activation. Paid
        // capability remains gated server-side and via fullFeaturesUnlocked.
        if (requireDashboardUnlocked && !result.dashboardUnlocked) {
          setStatus(result);
          setLocation('/agent/setup');
          return;
        }

        setStatus(result);
      } catch {
        if (!cancelled) {
          // A network or transient service failure is not onboarding evidence.
          // Preserve any last known state and let the active surface offer a
          // retry instead of sending an agent into setup incorrectly.
          setError('We could not confirm your Agent workspace access right now.');
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
  }, [authLoading, requestVersion, requireDashboardUnlocked, setLocation, user?.role]);

  return {
    status,
    isLoading: authLoading || isLoading,
    error,
    retry,
  };
}
