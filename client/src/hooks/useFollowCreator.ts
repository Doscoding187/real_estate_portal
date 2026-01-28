/**
 * Hook for managing creator follow functionality
 * Requirements: 13.2, 13.5
 */

import { useState, useCallback } from 'react';
import { trpc } from '../lib/trpc';

interface UseFollowCreatorOptions {
  creatorId: number;
  initialFollowing?: boolean;
  onFollowSuccess?: () => void;
  onUnfollowSuccess?: () => void;
}

export function useFollowCreator({
  creatorId,
  initialFollowing = false,
  onFollowSuccess,
  onUnfollowSuccess,
}: UseFollowCreatorOptions) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);

  const toggleFollowMutation = trpc.exploreApi.toggleCreatorFollow.useMutation({
    onSuccess: data => {
      setIsFollowing(data.data.following);

      // Call success callbacks
      if (data.data.following && onFollowSuccess) {
        onFollowSuccess();
      } else if (!data.data.following && onUnfollowSuccess) {
        onUnfollowSuccess();
      }
    },
  });

  const toggleFollow = useCallback(() => {
    toggleFollowMutation.mutate({ creatorId });
  }, [creatorId, toggleFollowMutation]);

  return {
    isFollowing,
    isLoading: toggleFollowMutation.isLoading,
    toggleFollow,
  };
}
