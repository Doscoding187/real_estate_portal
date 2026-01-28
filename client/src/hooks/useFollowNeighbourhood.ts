/**
 * Hook for managing neighbourhood follow functionality
 * Requirements: 5.6, 13.1
 */

import { useState, useCallback } from 'react';
import { trpc } from '../lib/trpc';

interface UseFollowNeighbourhoodOptions {
  neighbourhoodId: number;
  initialFollowing?: boolean;
  onFollowSuccess?: () => void;
  onUnfollowSuccess?: () => void;
}

export function useFollowNeighbourhood({
  neighbourhoodId,
  initialFollowing = false,
  onFollowSuccess,
  onUnfollowSuccess,
}: UseFollowNeighbourhoodOptions) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);

  const toggleFollowMutation = trpc.exploreApi.toggleNeighbourhoodFollow.useMutation({
    onSuccess: data => {
      setIsFollowing(data.data.following);

      // Call success callbacks
      if (data.data.following && onFollowSuccess) {
        onFollowSuccess();
      } else if (!data.data.following && onUnfollowSuccess) {
        onUnfollowSuccess();
      }
    },
    onError: error => {
      console.error('Failed to toggle follow:', error);
      // Optionally show a toast notification
    },
  });

  const toggleFollow = useCallback(() => {
    toggleFollowMutation.mutate({ neighbourhoodId });
  }, [neighbourhoodId, toggleFollowMutation]);

  return {
    isFollowing,
    isLoading: toggleFollowMutation.isLoading,
    toggleFollow,
  };
}
