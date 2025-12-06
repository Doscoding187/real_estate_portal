/**
 * Video Player Component
 * HTML5 video player with auto-loop and muted playback
 * Requirements: 1.6, 10.1, 10.4
 */

import { useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface VideoPlayerProps {
  video: {
    id: number;
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
  };
  isActive: boolean;
  isMuted: boolean;
  onComplete: () => void;
  onToggleMute: () => void;
}

export function VideoPlayer({
  video,
  isActive,
  isMuted,
  onComplete,
  onToggleMute,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasCompletedRef = useRef(false);

  // Play/pause based on active state
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive) {
      videoElement.play().catch((err) => {
        console.error('Failed to play video:', err);
      });
      hasCompletedRef.current = false;
    } else {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
  }, [isActive]);

  // Handle mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Handle video end - auto-loop (Requirement 1.6)
  const handleVideoEnd = () => {
    if (!hasCompletedRef.current) {
      onComplete();
      hasCompletedRef.current = true;
    }

    // Auto-loop: restart video
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((err) => {
        console.error('Failed to loop video:', err);
      });
    }
  };

  // Preload next videos (Requirement 10.1)
  useEffect(() => {
    if (videoRef.current && isActive) {
      videoRef.current.preload = 'auto';
    }
  }, [isActive]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        className="w-full h-full object-cover"
        playsInline
        loop={false} // We handle looping manually to track completion
        muted={isMuted}
        onEnded={handleVideoEnd}
        preload={isActive ? 'auto' : 'metadata'}
        aria-label="Property video"
      />

      {/* Mute indicator */}
      {isActive && (
        <button
          onClick={onToggleMute}
          className="absolute top-20 right-4 z-30 p-3 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
      )}

      {/* Tap to unmute hint (shown briefly on first video) */}
      {isActive && isMuted && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-4 py-2 bg-black/70 rounded-full text-white text-sm animate-pulse">
            Tap to unmute
          </div>
        </div>
      )}
    </div>
  );
}
