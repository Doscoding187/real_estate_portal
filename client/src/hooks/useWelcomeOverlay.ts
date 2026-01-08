/**
 * Welcome Overlay Hook
 * 
 * Manages welcome overlay state and interactions.
 * Implements Requirements 16.7, 16.8, 16.9
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

interface Topic {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export function useWelcomeOverlay() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch onboarding state
  const { data: onboardingState, isLoading } = useQuery<OnboardingState>({
    queryKey: ['/api/onboarding/state'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch topics
  const { data: allTopics = [] } = useQuery<Topic[]>({
    queryKey: ['/api/topics'],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Show welcome overlay mutation
  const showOverlayMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/onboarding/welcome/show', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark overlay as shown');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
    },
  });

  // Dismiss welcome overlay mutation
  const dismissOverlayMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/onboarding/welcome/dismiss', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to dismiss overlay');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
    },
  });

  // Check if overlay should be shown
  useEffect(() => {
    if (!isLoading && onboardingState) {
      const shouldShow =
        onboardingState.isFirstSession &&
        !onboardingState.welcomeOverlayShown;

      if (shouldShow) {
        setIsOpen(true);
        showOverlayMutation.mutate();
      }
    }
  }, [onboardingState, isLoading]);

  // Get suggested topics
  const suggestedTopics = allTopics.filter((topic) =>
    onboardingState?.suggestedTopics?.includes(topic.slug)
  );

  // Handle topic selection
  const handleTopicSelect = (topicSlug: string) => {
    // Topic selection will be handled by parent component
    // This just closes the overlay
    setIsOpen(false);
    dismissOverlayMutation.mutate();
  };

  // Handle dismiss
  const handleDismiss = () => {
    setIsOpen(false);
    dismissOverlayMutation.mutate();
  };

  return {
    isOpen,
    suggestedTopics,
    onTopicSelect: handleTopicSelect,
    onDismiss: handleDismiss,
    isLoading,
  };
}
