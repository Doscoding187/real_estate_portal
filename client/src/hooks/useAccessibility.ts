/**
 * Accessibility Hooks for Explore Discovery Engine
 *
 * Provides hooks for:
 * - Reduced motion preferences
 * - Keyboard navigation
 * - Screen reader announcements
 * - Focus management
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to detect and respect prefers-reduced-motion setting
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Legacy browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook for keyboard navigation in lists/grids
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  itemCount: number,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'grid';
    columns?: number;
    loop?: boolean;
    onSelect?: (index: number) => void;
    onEscape?: () => void;
  } = {},
) {
  const { orientation = 'vertical', columns = 1, loop = true, onSelect, onEscape } = options;

  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<T>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (itemCount === 0) return;

      let newIndex = focusedIndex;
      let handled = false;

      switch (event.key) {
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'grid') {
            newIndex = orientation === 'grid' ? focusedIndex - columns : focusedIndex - 1;
            handled = true;
          }
          break;
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'grid') {
            newIndex = orientation === 'grid' ? focusedIndex + columns : focusedIndex + 1;
            handled = true;
          }
          break;
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'grid') {
            newIndex = focusedIndex - 1;
            handled = true;
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'grid') {
            newIndex = focusedIndex + 1;
            handled = true;
          }
          break;
        case 'Home':
          newIndex = 0;
          handled = true;
          break;
        case 'End':
          newIndex = itemCount - 1;
          handled = true;
          break;
        case 'Enter':
        case ' ':
          onSelect?.(focusedIndex);
          handled = true;
          break;
        case 'Escape':
          onEscape?.();
          handled = true;
          break;
      }

      if (handled) {
        event.preventDefault();

        // Handle bounds
        if (loop) {
          if (newIndex < 0) newIndex = itemCount - 1;
          if (newIndex >= itemCount) newIndex = 0;
        } else {
          newIndex = Math.max(0, Math.min(itemCount - 1, newIndex));
        }

        setFocusedIndex(newIndex);
      }
    },
    [focusedIndex, itemCount, orientation, columns, loop, onSelect, onEscape],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    containerRef,
    focusedIndex,
    setFocusedIndex,
    getItemProps: (index: number) => ({
      tabIndex: index === focusedIndex ? 0 : -1,
      'aria-selected': index === focusedIndex,
      onFocus: () => setFocusedIndex(index),
    }),
  };
}

/**
 * Hook for screen reader announcements
 */
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement is read
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return announce;
}

/**
 * Hook for focus trap (modals, dialogs)
 */
export function useFocusTrap<T extends HTMLElement>(isActive: boolean) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store current focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Get focusable elements
    const getFocusableElements = () => {
      return container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for skip links
 */
export function useSkipLink(targetId: string) {
  const skipToContent = useCallback(() => {
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, [targetId]);

  return skipToContent;
}

/**
 * Hook for managing video accessibility
 */
export function useVideoAccessibility(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showCaptions, setShowCaptions] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const announce = useAnnounce();

  // Auto-pause for reduced motion preference
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (prefersReducedMotion && isPlaying) {
      video.pause();
      setIsPlaying(false);
      announce('Video paused due to reduced motion preference');
    }
  }, [prefersReducedMotion, isPlaying, videoRef, announce]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      announce('Video playing');
    } else {
      video.pause();
      setIsPlaying(false);
      announce('Video paused');
    }
  }, [videoRef, announce]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
    announce(video.muted ? 'Video muted' : 'Video unmuted');
  }, [videoRef, announce]);

  const toggleCaptions = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const tracks = video.textTracks;
    if (tracks.length > 0) {
      const track = tracks[0];
      track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
      setShowCaptions(track.mode === 'showing');
      announce(track.mode === 'showing' ? 'Captions enabled' : 'Captions disabled');
    }
  }, [videoRef, announce]);

  const seek = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;

      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
      announce(`Seeked ${seconds > 0 ? 'forward' : 'backward'} ${Math.abs(seconds)} seconds`);
    },
    [videoRef, announce],
  );

  // Keyboard controls
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          togglePlay();
          break;
        case 'm':
          event.preventDefault();
          toggleMute();
          break;
        case 'c':
          event.preventDefault();
          toggleCaptions();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seek(-5);
          break;
        case 'ArrowRight':
          event.preventDefault();
          seek(5);
          break;
        case 'j':
          event.preventDefault();
          seek(-10);
          break;
        case 'l':
          event.preventDefault();
          seek(10);
          break;
      }
    },
    [togglePlay, toggleMute, toggleCaptions, seek],
  );

  // Update time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef]);

  return {
    isPlaying,
    isMuted,
    showCaptions,
    currentTime,
    duration,
    prefersReducedMotion,
    togglePlay,
    toggleMute,
    toggleCaptions,
    seek,
    handleKeyDown,
  };
}

export default useReducedMotion;
