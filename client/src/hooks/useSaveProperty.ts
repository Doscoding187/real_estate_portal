/**
 * Hook for managing property save functionality
 * Requirements: 14.1, 14.2, 14.4, 14.5
 */

import { useState, useCallback } from 'react';
import { trpc } from '../lib/trpc';

interface UseSavePropertyOptions {
  propertyId: number;
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

  const toggleSaveMutation = trpc.exploreApi.toggleSaveProperty.useMutation({
    onSuccess: (data) => {
      setIsSaved(data.data.saved);
      
      // Trigger animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);

      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Call success callbacks
      if (data.data.saved && onSaveSuccess) {
        onSaveSuccess();
      } else if (!data.data.saved && onUnsaveSuccess) {
        onUnsaveSuccess();
      }
    },
  });

  const toggleSave = useCallback(() => {
    toggleSaveMutation.mutate({ propertyId });
  }, [propertyId, toggleSaveMutation]);

  return {
    isSaved,
    isAnimating,
    isLoading: toggleSaveMutation.isLoading,
    toggleSave,
  };
}
