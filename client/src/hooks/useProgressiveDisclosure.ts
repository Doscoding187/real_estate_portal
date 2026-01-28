/**
 * Progressive Disclosure Hook
 *
 * Manages progressive feature revelation based on user engagement.
 * Implements Requirements 14.2, 14.3, 14.4
 *
 * Feature Unlock Thresholds:
 * - Filters/Save: 10+ content views
 * - Topics: 3+ saves
 * - Partner Profiles: 1+ partner engagement
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

interface FeatureUnlock {
  feature: string;
  unlocked: boolean;
  threshold: number;
  currentProgress: number;
}

interface OnboardingState {
  userId: string;
  isFirstSession: boolean;
  welcomeOverlayShown: boolean;
  welcomeOverlayDismissed: boolean;
  suggestedTopics: string[];
  tooltipsShown: string[];
  contentViewCount: number;
  saveCount: number;
  partnerEngagementCount: number;
  featuresUnlocked: string[];
}

export type OnboardingEventType =
  | 'content_view'
  | 'save'
  | 'partner_engagement'
  | 'topic_select'
  | 'tooltip_dismiss';

export function useProgressiveDisclosure() {
  const queryClient = useQueryClient();

  // Fetch onboarding state
  const { data: onboardingState, isLoading } = useQuery<OnboardingState>({
    queryKey: ['/api/onboarding/state'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch feature unlocks
  const { data: featureUnlocks = [] } = useQuery<FeatureUnlock[]>({
    queryKey: ['/api/onboarding/feature-unlocks'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Track event mutation
  const trackEventMutation = useMutation({
    mutationFn: async (eventType: OnboardingEventType) => {
      const response = await fetch('/api/onboarding/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: eventType }),
      });
      if (!response.ok) throw new Error('Failed to track event');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both queries to refresh state and unlocks
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/feature-unlocks'] });
    },
  });

  // Helper functions to check feature unlock status
  const isFeatureUnlocked = (feature: string): boolean => {
    return onboardingState?.featuresUnlocked?.includes(feature) ?? false;
  };

  const getFeatureProgress = (feature: string): FeatureUnlock | undefined => {
    return featureUnlocks.find(unlock => unlock.feature === feature);
  };

  // Specific feature checks
  const canUseFiltersAndSave = isFeatureUnlocked('filters_save');
  const canUseTopics = isFeatureUnlocked('topics');
  const canViewPartnerProfiles = isFeatureUnlocked('partner_profiles');

  // Track content view
  const trackContentView = () => {
    trackEventMutation.mutate('content_view');
  };

  // Track save
  const trackSave = () => {
    trackEventMutation.mutate('save');
  };

  // Track partner engagement
  const trackPartnerEngagement = () => {
    trackEventMutation.mutate('partner_engagement');
  };

  // Track topic selection
  const trackTopicSelect = () => {
    trackEventMutation.mutate('topic_select');
  };

  return {
    // State
    onboardingState,
    featureUnlocks,
    isLoading,

    // Feature checks
    isFeatureUnlocked,
    getFeatureProgress,
    canUseFiltersAndSave,
    canUseTopics,
    canViewPartnerProfiles,

    // Tracking functions
    trackContentView,
    trackSave,
    trackPartnerEngagement,
    trackTopicSelect,

    // Mutation state
    isTracking: trackEventMutation.isPending,
  };
}

/**
 * Hook to automatically track content views
 * Call this in components that display content
 */
export function useAutoTrackContentView() {
  const { trackContentView } = useProgressiveDisclosure();

  useEffect(() => {
    trackContentView();
  }, []);
}

/**
 * Hook to get feature unlock progress for UI display
 */
export function useFeatureUnlockProgress(feature: string) {
  const { getFeatureProgress, isFeatureUnlocked } = useProgressiveDisclosure();

  const progress = getFeatureProgress(feature);
  const unlocked = isFeatureUnlocked(feature);

  return {
    unlocked,
    progress: progress?.currentProgress ?? 0,
    threshold: progress?.threshold ?? 0,
    percentage: progress ? Math.min(100, (progress.currentProgress / progress.threshold) * 100) : 0,
  };
}
