/**
 * Save Button Component
 * Requirements: 14.1, 14.2, 14.5
 * Provides visual save/unsave functionality with animation
 */

import React from 'react';
import { Bookmark } from 'lucide-react';
import { useSaveProperty } from '../../hooks/useSaveProperty';

interface SaveButtonProps {
  propertyId: number;
  initialSaved?: boolean;
  variant?: 'default' | 'overlay' | 'card';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onSaveSuccess?: () => void;
  onUnsaveSuccess?: () => void;
}

export function SaveButton({
  propertyId,
  initialSaved = false,
  variant = 'default',
  size = 'md',
  showLabel = false,
  onSaveSuccess,
  onUnsaveSuccess,
}: SaveButtonProps) {
  const { isSaved, isAnimating, isLoading, toggleSave } = useSaveProperty({
    propertyId,
    initialSaved,
    onSaveSuccess,
    onUnsaveSuccess,
  });

  // Size classes
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  // Variant styles
  const variantClasses = {
    default: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200',
    overlay: 'bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm',
    card: 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm',
  };

  return (
    <button
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        toggleSave();
      }}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-full
        flex items-center justify-center
        transition-all duration-200
        ${isAnimating ? 'scale-125' : 'scale-100'}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isSaved ? 'text-blue-600' : ''}
      `}
      aria-label={isSaved ? 'Unsave property' : 'Save property'}
      title={isSaved ? 'Unsave property' : 'Save property'}
    >
      <Bookmark
        size={iconSizes[size]}
        fill={isSaved ? 'currentColor' : 'none'}
        className={`transition-all duration-200 ${isAnimating ? 'animate-bounce' : ''}`}
      />
      {showLabel && <span className="ml-2 text-sm font-medium">{isSaved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
