/**
 * Hook for managing property save functionality
 * Requirements: 14.1, 14.2, 14.4, 14.5
 */

import { useState, useCallback } from 'react';
import { trpc } from '../lib/trpc';

interface UseSavePropertyOptions {
  propertyId: number;
  /**
   * Retained for legacy component compatibility. Property saves are persisted
   * through the canonical properties favorites workflow, not Explore
   * engagement records.
   */
  contentId?: number;
  initialSaved?: boolean;
  onSaveSuccess?: () => void;
  onUnsaveSuccess?: () => void;
}

export function useSaveProperty({
  propertyId,
  initialSaved = false,
  onSaveSuccess,
  onUnsaveSuccess,
}: UseSavePropertyOptions) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleSaveMutation = trpc.properties.toggleFavorite.useMutation({
    onSuccess: data => {
      const nextSaved = data.favorited;
      setIsSaved(nextSaved);

      // Trigger animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);

      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Call success callbacks
      if (nextSaved && onSaveSuccess) {
        onSaveSuccess();
      } else if (!nextSaved && onUnsaveSuccess) {
        onUnsaveSuccess();
      }
    },
    onError: error => {
      console.error('Failed to toggle save:', error);
      // Optionally show a toast notification
    },
  });

  const toggleSave = useCallback(() => {
    toggleSaveMutation.mutate({ propertyId });
  }, [propertyId, toggleSaveMutation]);

  return {
    isSaved,
    isAnimating,
    isLoading: toggleSaveMutation.isPending,
    toggleSave,
  };
}
