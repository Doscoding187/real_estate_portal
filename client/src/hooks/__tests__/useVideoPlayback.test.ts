/**
 * Unit Tests for useVideoPlayback hook
 * 
 * Tests cover:
 * - Auto-play on viewport entry
 * - Auto-pause on viewport exit
 * - Error handling and retry logic
 * - Preloading behavior
 * 
 * Requirements: 10.1 (Unit testing for video playback logic)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVideoPlayback } from '../useVideoPlayback';
import { useEffect } from 'react';

// Mock IntersectionObserver
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  elements: Set<Element>;
  options: IntersectionObserverInit;

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.elements = new Set();
    this.options = options;
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  unobserve(element: Element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }

  // Helper to trigger intersection
  triggerIntersection(isIntersecting: boolean) {
    const entries: IntersectionObserverEntry[] = Array.from(this.elements).map((element) => ({
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 0.5 : 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    }));
    this.callback(entries, this as any);
  }
}

// Store the mock instance for test access
let mockObserverInstance: MockIntersectionObserver | null = null;

describe('useVideoPlayback', () => {
  let mockVideoElement: HTMLVideoElement;
  let mockContainerElement: HTMLDivElement;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockObserverInstance = null;

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn((callback, options) => {
      mockObserverInstance = new MockIntersectionObserver(callback, options);
      return mockObserverInstance as any;
    }) as any;

    // Create mock video element with all necessary methods and properties
    mockVideoElement = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      preload: 'metadata',
      currentTime: 0,
      duration: 0,
      paused: true,
      ended: false,
      readyState: 0,
    } as any;

    // Create mock container element
    mockContainerElement = document.createElement('div');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useVideoPlayback());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isBuffering).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.inView).toBe(false);
      expect(result.current.videoRef).toBeDefined();
      expect(result.current.containerRef).toBeDefined();
    });

    it('should provide control functions', () => {
      const { result } = renderHook(() => useVideoPlayback());

      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.retry).toBe('function');
    });

    it('should set up IntersectionObserver with correct threshold', () => {
      const threshold = 0.5;
      renderHook(() => useVideoPlayback({ threshold }));

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ threshold })
      );
    });

    it('should accept custom threshold value', () => {
      const customThreshold = 0.75;
      renderHook(() => useVideoPlayback({ threshold: customThreshold }));

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ threshold: customThreshold })
      );
    });
  });

  describe('Auto-play on Viewport Entry (Requirement 2.1)', () => {
    it('should auto-play video when entering viewport', async () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        if (result.current.videoRef.current === null) {
          (result.current.videoRef as any).current = mockVideoElement;
        }
        if (result.current.containerRef.current === null) {
          (result.current.containerRef as any).current = mockContainerElement;
        }
      });

      // Trigger intersection (video enters viewport)
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalled();
        expect(result.current.inView).toBe(true);
      });
    });

    it('should not auto-play in low-bandwidth mode', async () => {
      const { result } = renderHook(() => useVideoPlayback({ lowBandwidthMode: true }));

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Trigger intersection
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      // Wait a bit to ensure no auto-play happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockVideoElement.play).not.toHaveBeenCalled();
      expect(result.current.inView).toBe(true);
    });

    it('should call onEnterViewport callback when video enters viewport', async () => {
      const onEnterViewport = vi.fn();
      const { result } = renderHook(() => useVideoPlayback({ onEnterViewport }));

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Trigger intersection
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(onEnterViewport).toHaveBeenCalled();
      });
    });

    it('should update isPlaying state after successful play', async () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Trigger intersection
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(true);
      });
    });
  });

  describe('Auto-pause on Viewport Exit (Requirement 2.3)', () => {
    it('should auto-pause video when exiting viewport', async () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // First, enter viewport and play
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(result.current.inView).toBe(true);
      });

      // Then exit viewport
      act(() => {
        mockObserverInstance?.triggerIntersection(false);
      });

      await waitFor(() => {
        expect(mockVideoElement.pause).toHaveBeenCalled();
        expect(result.current.inView).toBe(false);
      });
    });

    it('should call onExitViewport callback when video exits viewport', async () => {
      const onExitViewport = vi.fn();
      const { result } = renderHook(() => useVideoPlayback({ onExitViewport }));

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Enter viewport first
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      // Then exit viewport
      act(() => {
        mockObserverInstance?.triggerIntersection(false);
      });

      await waitFor(() => {
        expect(onExitViewport).toHaveBeenCalled();
      });
    });

    it('should update isPlaying state to false after pause', async () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Enter viewport
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(true);
      });

      // Exit viewport
      act(() => {
        mockObserverInstance?.triggerIntersection(false);
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(false);
      });
    });
  });

  describe('Error Handling and Retry Logic (Requirement 2.7)', () => {
    it('should handle play errors gracefully', async () => {
      const playError = new Error('Autoplay blocked');
      mockVideoElement.play = vi.fn().mockRejectedValue(playError);

      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Trigger intersection
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Autoplay blocked');
        expect(result.current.isPlaying).toBe(false);
      });
    });

    it('should auto-retry on error with exponential backoff', async () => {
      vi.useFakeTimers();

      let callCount = 0;
      mockVideoElement.play = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary error'));
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Trigger intersection
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      // First attempt fails
      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
      });

      // Wait for first retry (1000ms)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(2);
      });

      // Wait for second retry (2000ms)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(3);
        expect(result.current.isPlaying).toBe(true);
        expect(result.current.error).toBe(null);
      });

      vi.useRealTimers();
    });

    it('should stop retrying after max retries', async () => {
      vi.useFakeTimers();

      mockVideoElement.play = vi.fn().mockRejectedValue(new Error('Persistent error'));

      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Trigger intersection
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      // Initial attempt
      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
      });

      // Retry 1
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(2);
      });

      // Retry 2
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(3);
      });

      // Retry 3
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(4);
      });

      // Should not retry again
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockVideoElement.play).toHaveBeenCalledTimes(4);
      expect(result.current.error).toBeTruthy();

      vi.useRealTimers();
    });

    it('should allow manual retry after error', async () => {
      mockVideoElement.play = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Trigger intersection
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Manual retry
      await act(async () => {
        await result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
        expect(result.current.isPlaying).toBe(true);
      });
    });

    it('should reset retry count on successful play', async () => {
      vi.useFakeTimers();

      let callCount = 0;
      mockVideoElement.play = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First error'));
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // First attempt fails
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
      });

      // Retry succeeds
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(true);
        expect(result.current.error).toBe(null);
      });

      vi.useRealTimers();
    });
  });

  describe('Preloading Behavior (Requirement 2.2)', () => {
    it('should set preload attribute when preloadNext is enabled and in view', async () => {
      const { result } = renderHook(() => useVideoPlayback({ preloadNext: true }));

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Trigger intersection
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(mockVideoElement.preload).toBe('auto');
      });
    });

    it('should reset preload to metadata when out of view', async () => {
      const { result } = renderHook(() => useVideoPlayback({ preloadNext: true }));

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Enter viewport
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(mockVideoElement.preload).toBe('auto');
      });

      // Exit viewport
      act(() => {
        mockObserverInstance?.triggerIntersection(false);
      });

      await waitFor(() => {
        expect(mockVideoElement.preload).toBe('metadata');
      });
    });

    it('should not change preload when preloadNext is disabled', async () => {
      const { result } = renderHook(() => useVideoPlayback({ preloadNext: false }));

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      const initialPreload = mockVideoElement.preload;

      // Trigger intersection
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockVideoElement.preload).toBe(initialPreload);
    });
  });

  describe('Buffering State Detection (Requirement 2.7)', () => {
    it('should detect buffering state', () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
      });

      // Get the 'waiting' event handler
      const waitingHandler = (mockVideoElement.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'waiting'
      )?.[1];

      expect(waitingHandler).toBeDefined();

      // Trigger waiting event
      act(() => {
        waitingHandler?.();
      });

      expect(result.current.isBuffering).toBe(true);
    });

    it('should clear buffering state on playing', () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
      });

      // Get event handlers
      const waitingHandler = (mockVideoElement.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'waiting'
      )?.[1];
      const playingHandler = (mockVideoElement.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'playing'
      )?.[1];

      // Trigger buffering
      act(() => {
        waitingHandler?.();
      });

      expect(result.current.isBuffering).toBe(true);

      // Trigger playing
      act(() => {
        playingHandler?.();
      });

      expect(result.current.isBuffering).toBe(false);
    });

    it('should handle multiple buffering events', () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
      });

      const waitingHandler = (mockVideoElement.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'waiting'
      )?.[1];
      const canPlayHandler = (mockVideoElement.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'canplay'
      )?.[1];

      // Buffering starts
      act(() => {
        waitingHandler?.();
      });
      expect(result.current.isBuffering).toBe(true);

      // Can play
      act(() => {
        canPlayHandler?.();
      });
      expect(result.current.isBuffering).toBe(false);

      // Buffering again
      act(() => {
        waitingHandler?.();
      });
      expect(result.current.isBuffering).toBe(true);
    });
  });

  describe('Manual Controls', () => {
    it('should allow manual play', async () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
      });

      await act(async () => {
        await result.current.play();
      });

      expect(mockVideoElement.play).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(true);
    });

    it('should allow manual pause', () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
      });

      act(() => {
        result.current.pause();
      });

      expect(mockVideoElement.pause).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should disconnect IntersectionObserver on unmount', () => {
      const { result, unmount } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.containerRef as any).current = mockContainerElement;
      });

      const disconnectSpy = vi.spyOn(mockObserverInstance!, 'disconnect');

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should remove video event listeners on unmount', () => {
      const { result, unmount } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
      });

      const removeEventListenerSpy = vi.spyOn(mockVideoElement, 'removeEventListener');

      unmount();

      // Should remove all event listeners
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing video ref gracefully', async () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Don't attach video ref
      act(() => {
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Trigger intersection
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      // Should not crash
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(result.current.error).toBe(null);
    });

    it('should handle missing container ref gracefully', () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Don't attach container ref
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
      });

      // Should not crash
      expect(result.current).toBeDefined();
    });

    it('should not retry when out of viewport', async () => {
      vi.useFakeTimers();

      mockVideoElement.play = vi.fn().mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = mockContainerElement;
      });

      // Enter viewport (triggers play and error)
      act(() => {
        mockObserverInstance?.triggerIntersection(true);
      });

      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
      });

      // Exit viewport before retry
      act(() => {
        mockObserverInstance?.triggerIntersection(false);
      });

      // Wait for retry time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not retry when out of viewport
      expect(mockVideoElement.play).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });
});
