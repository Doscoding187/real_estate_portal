/**
 * Onboarding Tooltip Hook
 * 
 * Manages tooltip display logic and triggers.
 * Implements Requirements 16.10, 16.11, 16.12
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OnboardingState {
  userId: string;
  tooltipsShown: string[];
  contentViewCount: number;
}

type TooltipId = 'topic_navigation' | 'partner_content';

interface TooltipTrigger {
  type: 'scroll_count' | 'first_encounter';
  threshold?: number;
}

const TOOLTIP_TRIGGERS: Record<TooltipId, TooltipTrigger> = {
  topic_navigation: {
    type: 'scroll_count',
    threshold: 5, // After 5 items scrolled
  },
  partner_content: {
    type: 'first_encounter', // On first partner content encounter
  },
};

export function useOnboardingTooltip(tooltipId: TooltipId) {
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollCount, setScrollCount] = useState(0);

  // Fetch onboarding state
  const { data: onboardingState } = useQuery<OnboardingState>({
    queryKey: ['/api/onboarding/state'],
    staleTime: 5 * 60 * 1000,
  });

  // Show tooltip mutation
  const showTooltipMutation = useMutation({
    mutationFn: async (tooltipId: string) => {
      const response = await fetch('/api/onboarding/tooltip/show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tooltipId }),
      });
      if (!response.ok) throw new Error('Failed to mark tooltip as shown');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
    },
  });

  // Check if tooltip has been shown
  const hasBeenShown = onboardingState?.tooltipsShown?.includes(tooltipId) ?? false;

  // Check trigger conditions
  useEffect(() => {
    if (hasBeenShown) {
      return; // Don't show if already shown
    }

    const trigger = TOOLTIP_TRIGGERS[tooltipId];

    if (trigger.type === 'scroll_count' && trigger.threshold) {
      if (scrollCount >= trigger.threshold) {
        setIsVisible(true);
        showTooltipMutation.mutate(tooltipId);
      }
    }
  }, [scrollCount, hasBeenShown, tooltipId]);

  // Increment scroll count
  const incrementScrollCount = () => {
    setScrollCount((prev) => prev + 1);
  };

  // Show tooltip manually (for first_encounter type)
  const showTooltip = () => {
    if (!hasBeenShown) {
      setIsVisible(true);
      showTooltipMutation.mutate(tooltipId);
    }
  };

  // Dismiss tooltip
  const dismissTooltip = () => {
    setIsVisible(false);
  };

  return {
    isVisible,
    hasBeenShown,
    showTooltip,
    dismissTooltip,
    incrementScrollCount,
  };
}

/**
 * Hook for topic navigation tooltip
 * Automatically tracks scroll count
 */
export function useTopicNavigationTooltip() {
  return useOnboardingTooltip('topic_navigation');
}

/**
 * Hook for partner content tooltip
 * Manually triggered on first partner content encounter
 */
export function usePartnerContentTooltip() {
  const tooltip = useOnboardingTooltip('partner_content');

  // Trigger on first partner content encounter
  const onPartnerContentEncounter = () => {
    tooltip.showTooltip();
  };

  return {
    ...tooltip,
    onPartnerContentEncounter,
  };
}
