/**
 * Explore Video Feed Component
 * Full-screen vertical video browsing with swipe navigation
 * Requirements: 1.1, 1.2, 1.6, 10.4
 */

import { useRef, useEffect, useState } from 'react';
import { SwipeEngine } from '../explore/SwipeEngine';
import { VideoPlayer } from './VideoPlayer';
import { VideoOverlay } from './VideoOverlay';
import { useExploreVideoFeed } from '@/hooks/useExploreVideoFeed';
import { Loader2 } from 'lucide-react';

interface ExploreVideoFeedProps {
  categoryId?: number;
}

export function ExploreVideoFeed({ categoryId }: ExploreVideoFeedProps) {
  const {
    videos,
    currentVideo,
    currentIndex,
    isLoading,
    error,
    goToNext,
    goToPrevious,
    onVideoComplete,
    onSave,
    onShare,
    onViewListing,
    refetch,
  } = useExploreVideoFeed({ categoryId, limit: 10 });

  const [isMuted, setIsMuted] = useState(true); // Requirement 10.4: Default muted

  // Loading state
  if (isLoading && videos.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
          <p className="text-white text-lg">Loading videos...</p>
        </div>
      </div>
    );
  }

  // Error or Empty state - Graceful fallback
  if ((error && videos.length === 0) || videos.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-6 px-6 text-center max-w-md">
          <div className="text-gray-400 text-6xl">🎥</div>

          <div className="space-y-2">
            <h3 className="text-white text-xl font-semibold">No videos yet</h3>
            <p className="text-gray-400">
              {error
                ? 'We encountered an error loading the video feed.'
                : 'We are still curating the best property videos for you.'}
            </p>
          </div>

          <div className="flex flex-col w-full gap-3">
            <button
              onClick={() => (window.location.href = '/explore/map')}
              className="w-full px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Browse Properties on Map
            </button>
            <button
              onClick={() => (window.location.href = '/explore/home')}
              className="w-full px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              Back to Explore Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      role="region"
      aria-label="Explore video feed"
    >
      {/* Video players with gesture detection */}
      <SwipeEngine
        onSwipeUp={goToNext}
        onSwipeDown={goToPrevious}
        onDoubleTap={onSave} // Requirement 1.4: Double-tap to save
        onTapCenter={() => setIsMuted(!isMuted)} // Requirement 10.4: Tap to unmute
        className="relative w-full h-full"
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className={`absolute inset-0 transition-opacity duration-300 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            aria-hidden={index !== currentIndex}
          >
            <VideoPlayer
              video={video}
              isActive={index === currentIndex}
              isMuted={isMuted}
              onComplete={onVideoComplete}
              onToggleMute={() => setIsMuted(!isMuted)}
            />

            {/* Video overlay with property info and actions */}
            <VideoOverlay
              video={video}
              isMuted={isMuted}
              onSave={onSave}
              onShare={onShare}
              onViewListing={onViewListing}
              onToggleMute={() => setIsMuted(!isMuted)}
            />
          </div>
        ))}
      </SwipeEngine>

      {/* Progress indicators */}
      <div className="absolute top-4 left-0 right-0 flex gap-1 px-4 z-20">
        {videos.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, idx) => {
          const actualIndex = Math.max(0, currentIndex - 2) + idx;
          return (
            <div
              key={actualIndex}
              className={`h-0.5 flex-1 rounded-full transition-all ${
                actualIndex === currentIndex ? 'bg-white' : 'bg-gray-500'
              }`}
              aria-label={`Video ${actualIndex + 1}`}
            />
          );
        })}
      </div>

      {/* Loading indicator for preloading */}
      {isLoading && videos.length > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}
