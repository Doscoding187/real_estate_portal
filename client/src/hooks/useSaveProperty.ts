/**
 * Hook for managing property save functionality
 * Requirements: 14.1, 14.2, 14.4, 14.5
 */

import { useCallback, useEffect, useState } from 'react';
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
  const utils = trpc.useUtils();

  useEffect(() => {
    setIsSaved(initialSaved);
  }, [propertyId, initialSaved]);

  const setSaveMutation = trpc.properties.setFavorite.useMutation({
    onSuccess: data => {
      const nextSaved = data.saved;
      setIsSaved(nextSaved);
      void utils.properties.getFavorites.invalidate();

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
      console.error('Failed to update saved property:', error);
    },
  });

  const toggleSave = useCallback(() => {
    if (setSaveMutation.isPending) return;
    setSaveMutation.mutate({ propertyId, saved: !isSaved });
  }, [propertyId, isSaved, setSaveMutation]);

  return {
    isSaved,
    isAnimating,
    isLoading: setSaveMutation.isPending,
    toggleSave,
  };
}
