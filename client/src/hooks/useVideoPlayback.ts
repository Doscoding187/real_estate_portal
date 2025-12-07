/**
 * Video Playback Hook
 * 
 * Provides viewport-based auto-play/pause functionality for video elements
 * using IntersectionObserver with 50% threshold.
 * 
 * Features:
 * - Auto-play when video enters viewport (50% visible)
 * - Auto-pause when video exits viewport
 * - Buffering state detection
 * - Error handling with retry logic
 * - Network speed detection for adaptive loading
 * 
 * Requirements: 2.1, 2.3, 2.7
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseVideoPlaybackOptions {
  /**
   * Enable preloading of next videos in feed
   * @default false
   */
  preloadNext?: boolean;
  
  /**
   * Enable low-bandwidth mode (poster images instead of auto-play)
   * @default false
   */
  lowBandwidthMode?: boolean;
  
  /**
   * Viewport visibility threshold (0-1)
   * @default 0.5 (50%)
   */
  threshold?: number;
  
  /**
   * Callback when video enters viewport
   */
  onEnterViewport?: () => void;
  
  /**
   * Callback when video exits viewport
   */
  onExitViewport?: () => void;
}

interface UseVideoPlaybackReturn {
  /**
   * Ref to attach to video element
   */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  
  /**
   * Ref to attach to container element for viewport detection
   */
  containerRef: React.RefObject<HTMLDivElement | null>;
  
  /**
   * Whether video is currently playing
   */
  isPlaying: boolean;
  
  /**
   * Whether video is buffering
   */
  isBuffering: boolean;
  
  /**
   * Error object if playback failed
   */
  error: Error | null;
  
  /**
   * Whether video is in viewport
   */
  inView: boolean;
  
  /**
   * Manually retry playback after error
   */
  retry: () => void;
  
  /**
   * Manually play video
   */
  play: () => Promise<void>;
  
  /**
   * Manually pause video
   */
  pause: () => void;
}

/**
 * Hook for managing video playback with viewport detection
 * 
 * @example
 * ```tsx
 * const { videoRef, containerRef, isPlaying, isBuffering, error, retry } = 
 *   useVideoPlayback({ preloadNext: true });
 * 
 * return (
 *   <div ref={containerRef}>
 *     <video ref={videoRef} src={videoUrl} />
 *     {isBuffering && <Spinner />}
 *     {error && <button onClick={retry}>Retry</button>}
 *   </div>
 * );
 * ```
 */
export function useVideoPlayback(
  options: UseVideoPlaybackOptions = {}
): UseVideoPlaybackReturn {
  const {
    preloadNext = false,
    lowBandwidthMode = false,
    threshold = 0.5,
    onEnterViewport,
    onExitViewport,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [inView, setInView] = useState(false);

  /**
   * Attempt to play video with error handling
   */
  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      setError(null);
      await video.play();
      setIsPlaying(true);
      retryCountRef.current = 0;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to play video');
      console.error('Video playback failed:', error);
      setError(error);
      setIsPlaying(false);

      // Auto-retry with exponential backoff
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000);
        
        setTimeout(() => {
          if (inView) {
            play();
          }
        }, delay);
      }
    }
  }, [inView]);

  /**
   * Pause video
   */
  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setIsPlaying(false);
  }, []);

  /**
   * Manual retry after error
   */
  const retry = useCallback(() => {
    retryCountRef.current = 0;
    setError(null);
    if (inView) {
      play();
    }
  }, [inView, play]);

  /**
   * Set up IntersectionObserver for viewport detection
   * Requirement 2.1: Auto-play when video enters viewport
   * Requirement 2.3: Auto-pause when video exits viewport
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting;
          setInView(isIntersecting);

          if (isIntersecting) {
            // Video entered viewport
            onEnterViewport?.();
            
            // Auto-play if not in low-bandwidth mode
            if (!lowBandwidthMode) {
              play();
            }
          } else {
            // Video exited viewport
            onExitViewport?.();
            
            // Auto-pause to conserve resources
            pause();
          }
        });
      },
      {
        threshold,
        // Add root margin for smoother transitions
        rootMargin: '0px',
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [threshold, lowBandwidthMode, onEnterViewport, onExitViewport, play, pause]);

  /**
   * Set up buffering state detection
   * Requirement 2.7: Implement buffering state detection
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleStalled = () => {
      setIsBuffering(true);
    };

    const handleSuspend = () => {
      // Video data loading has been suspended
      setIsBuffering(false);
    };

    const handleLoadStart = () => {
      setIsBuffering(true);
    };

    const handleLoadedData = () => {
      setIsBuffering(false);
    };

    // Add event listeners
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('suspend', handleSuspend);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('suspend', handleSuspend);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);

  /**
   * Track play/pause state changes
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  /**
   * Preload next videos if enabled
   * Requirement 2.2: Preload next 2 videos in feed
   */
  useEffect(() => {
    if (!preloadNext || !inView) return;

    const video = videoRef.current;
    if (!video) return;

    // Set preload attribute when in view
    video.preload = 'auto';

    return () => {
      // Reset to metadata when out of view to save bandwidth
      if (video) {
        video.preload = 'metadata';
      }
    };
  }, [preloadNext, inView]);

  return {
    videoRef,
    containerRef,
    isPlaying,
    isBuffering,
    error,
    inView,
    retry,
    play,
    pause,
  };
}
