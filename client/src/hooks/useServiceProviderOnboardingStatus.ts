import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

export type ServiceProviderOnboardingStatus = {
  hasProviderIdentity: boolean;
  profileConfigured: boolean;
  servicesConfigured: boolean;
  locationsConfigured: boolean;
  onboardingStep: number;
  dashboardUnlocked: boolean;
  fullFeaturesUnlocked: boolean;
  recommendedNextStep: string;
  provider: {
    providerId: string;
    companyName: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    subscriptionTier: 'directory' | 'directory_explore' | 'ecosystem_pro';
    subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  } | null;
};

export function useServiceProviderOnboardingStatus() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  const statusQuery = trpc.servicesEngine.myOnboardingStatus.useQuery(undefined, {
    enabled: user?.role === 'service_provider',
    retry: 0,
    refetchOnWindowFocus: false,
  });

  return {
    status: statusQuery.data ?? null,
    isLoading: authLoading || statusQuery.isLoading,
    error: statusQuery.error ?? null,
    refetch: statusQuery.refetch,
  };
}
