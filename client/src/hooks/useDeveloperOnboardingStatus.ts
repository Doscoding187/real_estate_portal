import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

export type DeveloperOnboardingStatus = {
  hasProfile: boolean;
  profileSubmitted: boolean;
  profileApproved: boolean;
  profileRejected: boolean;
  profileStatus: 'missing' | 'pending' | 'approved' | 'rejected';
  onboardingStep: number;
  dashboardUnlocked: boolean;
  fullFeaturesUnlocked: boolean;
  recommendedNextStep: string;
  developmentsCount: number;
  profile: {
    id: number;
    name: string;
    status: 'pending' | 'approved' | 'rejected';
    city: string | null;
    province: string | null;
    developerBrandProfileId: number | null;
  } | null;
};

export function useDeveloperOnboardingStatus() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  const statusQuery = trpc.developer.getOnboardingStatus.useQuery(undefined, {
    enabled: user?.role === 'property_developer',
    retry: 0,
    refetchOnWindowFocus: false,
  });

  return {
    status: statusQuery.data ?? null,
    isLoading: authLoading || statusQuery.isLoading,
    error: statusQuery.error ?? null,
  };
}
