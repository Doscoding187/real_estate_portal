/**
 * Keyboard Accessible Video Card Wrapper
 * 
 * Enhances VideoCard with keyboard navigation support.
 * Requirements: 5.1, 5.6
 * 
 * Features:
 * - Space/Enter to play/pause
 * - Arrow keys for navigation
 * - L to like
 * - S to share
 * - C to contact
 * - Visible focus indicators
 */

import { useEffect, useRef } from 'react';
import VideoCard from './VideoCard';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

interface KeyboardAccessibleVideoCardProps {
  video: any;
  isActive: boolean;
  onView?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onLike?: () => void;
  onShare?: () => void;
  onContact?: () => void;
}

export function KeyboardAccessibleVideoCard({
  video,
  isActive,
  onView,
  onNavigateUp,
  onNavigateDown,
  onLike,
  onShare,
  onContact,
}: KeyboardAccessibleVideoCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Define keyboard shortcuts for this video
  const shortcuts = [
    {
      key: 'ArrowUp',
      description: 'Previous video',
      action: () => onNavigateUp?.(),
    },
    {
      key: 'ArrowDown',
      description: 'Next video',
      action: () => onNavigateDown?.(),
    },
    {
      key: 'l',
      description: 'Like video',
      action: () => onLike?.(),
    },
    {
      key: 's',
      description: 'Share video',
      action: () => onShare?.(),
    },
    {
      key: 'c',
      description: 'Contact agent',
      action: () => onContact?.(),
    },
  ];

  useKeyboardNavigation({
    shortcuts,
    enabled: isActive,
    preventDefaultKeys: ['ArrowUp', 'ArrowDown'],
  });

  // Focus container when active
  useEffect(() => {
    if (isActive && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      tabIndex={isActive ? 0 : -1}
      className="h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      role="article"
      aria-label={`Video: ${video.title || video.propertyTitle}`}
    >
      <VideoCard
        video={video}
        isActive={isActive}
        onView={onView}
      />
      
      {/* Screen reader instructions */}
      <div className="sr-only">
        Press L to like, S to share, C to contact agent. Use arrow keys to navigate between videos.
      </div>
    </div>
  );
}
