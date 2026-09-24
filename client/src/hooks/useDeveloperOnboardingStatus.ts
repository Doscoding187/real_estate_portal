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
    cataloguePublisherId: number | null;
  } | null;
};

export type DeveloperOnboardingStatusOptions = {
  /**
   * Workspace routes that already own a contextual auth return path can turn
   * this off so a nested status read cannot replace that path with `/login`.
   */
  redirectOnUnauthenticated?: boolean;
};

export function useDeveloperOnboardingStatus({
  redirectOnUnauthenticated = true,
}: DeveloperOnboardingStatusOptions = {}) {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated });

  const statusQuery = trpc.developer.getOnboardingStatus.useQuery(undefined, {
    enabled: user?.role === 'property_developer',
    retry: 0,
    refetchOnWindowFocus: false,
  });

  return {
    status: statusQuery.data ?? null,
    isLoading: authLoading || statusQuery.isLoading,
    error: statusQuery.error ?? null,
    isError: statusQuery.isError,
    refetch: statusQuery.refetch,
  };
}
