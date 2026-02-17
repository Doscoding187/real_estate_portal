/**
 * Hook for managing property save functionality
 * Requirements: 14.1, 14.2, 14.4, 14.5
 */

import { useState, useCallback } from 'react';
import { trpc } from '../lib/trpc';

interface UseSavePropertyOptions {
  contentId: number;
  propertyId?: number;
  initialSaved?: boolean;
  onSaveSuccess?: () => void;
  onUnsaveSuccess?: () => void;
}

export function useSaveProperty({
  contentId,
  propertyId,
  initialSaved = false,
  onSaveSuccess,
  onUnsaveSuccess,
}: UseSavePropertyOptions) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleSaveMutation = trpc.explore.saveProperty.useMutation({
    onSuccess: () => {
      const nextSaved = !isSaved;
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
    toggleSaveMutation.mutate({ contentId, shortId: propertyId });
  }, [contentId, propertyId, toggleSaveMutation]);

  return {
    isSaved,
    isAnimating,
    isLoading: toggleSaveMutation.isPending,
    toggleSave,
  };
}
