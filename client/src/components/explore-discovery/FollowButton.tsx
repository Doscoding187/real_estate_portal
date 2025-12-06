/**
 * Follow Button Component
 * Requirements: 13.1, 13.2, 13.4
 * Provides follow/unfollow functionality for creators and neighbourhoods
 */

import React from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { useFollowCreator } from '../../hooks/useFollowCreator';
import { useFollowNeighbourhood } from '../../hooks/useFollowNeighbourhood';

interface FollowButtonProps {
  type: 'creator' | 'neighbourhood';
  targetId: number;
  initialFollowing?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  onFollowSuccess?: () => void;
  onUnfollowSuccess?: () => void;
}

export function FollowButton({
  type,
  targetId,
  initialFollowing = false,
  variant = 'default',
  size = 'md',
  showIcon = true,
  onFollowSuccess,
  onUnfollowSuccess,
}: FollowButtonProps) {
  // Use appropriate hook based on type
  const creatorHook = useFollowCreator({
    creatorId: targetId,
    initialFollowing,
    onFollowSuccess,
    onUnfollowSuccess,
  });

  const neighbourhoodHook = useFollowNeighbourhood({
    neighbourhoodId: targetId,
    initialFollowing,
    onFollowSuccess,
    onUnfollowSuccess,
  });

  const { isFollowing, isLoading, toggleFollow } =
    type === 'creator' ? creatorHook : neighbourhoodHook;

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  // Variant styles
  const variantClasses = {
    default: isFollowing
      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
      : 'bg-blue-600 hover:bg-blue-700 text-white',
    outline: isFollowing
      ? 'bg-transparent hover:bg-gray-50 text-gray-700 border-2 border-gray-300'
      : 'bg-transparent hover:bg-blue-50 text-blue-600 border-2 border-blue-600',
    ghost: isFollowing
      ? 'bg-transparent hover:bg-gray-100 text-gray-700'
      : 'bg-transparent hover:bg-blue-50 text-blue-600',
  };

  const Icon = isFollowing ? UserCheck : UserPlus;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFollow();
      }}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-full
        font-medium
        flex items-center gap-2
        transition-all duration-200
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-label={isFollowing ? `Unfollow ${type}` : `Follow ${type}`}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      <span>{isFollowing ? 'Following' : 'Follow'}</span>
    </button>
  );
}
