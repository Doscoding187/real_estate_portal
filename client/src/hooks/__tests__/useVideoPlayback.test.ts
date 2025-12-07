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

describe('useVideoPlayback', () => {
  let mockVideoElement: HTMLVideoElement;
  let intersectionObserverCallback: IntersectionObserverCallback;
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock IntersectionObserver with callback capture
    mockObserve = vi.fn();
    mockUnobserve = vi.fn();
    mockDisconnect = vi.fn();
    
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
      intersectionObserverCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
      };
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  
  // Helper function to simulate intersection
  const simulateIntersection = (isIntersecting: boolean) => {
    if (intersectionObserverCallback) {
      intersectionObserverCallback(
        [
          {
            isIntersecting,
            target: document.createElement('div'),
            intersectionRatio: isIntersecting ? 0.5 : 0,
            boundingClientRect: {} as DOMRectReadOnly,
            intersectionRect: {} as DOMRectReadOnly,
            rootBounds: null,
            time: Date.now(),
          },
        ],
        {} as IntersectionObserver
      );
    }
  };

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
  });

  describe('Manual Play/Pause Controls (Requirement 2.1, 2.3)', () => {
    it('should allow manual play', async () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach video ref
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

      // Attach video ref
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
      });

      act(() => {
        result.current.pause();
      });

      expect(mockVideoElement.pause).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
    });

    it('should handle play without video ref gracefully', async () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Don't attach video ref
      await act(async () => {
        await result.current.play();
      });

      // Should not crash
      expect(result.current.error).toBe(null);
    });

    it('should handle pause without video ref gracefully', () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Don't attach video ref
      act(() => {
        result.current.pause();
      });

      // Should not crash
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('Error Handling and Retry Logic (Requirement 2.7)', () => {
    it('should handle play errors gracefully', async () => {
      const playError = new Error('Autoplay blocked');
      mockVideoElement.play = vi.fn().mockRejectedValue(playError);

      const { result } = renderHook(() => useVideoPlayback());

      // Attach video ref
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
      });

      await act(async () => {
        await result.current.play();
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
        (result.current.containerRef as any).current = document.createElement('div');
      });

      // Simulate entering viewport to set inView to true
      act(() => {
        simulateIntersection(true);
      });

      // Wait for auto-play attempt (first failure)
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockVideoElement.play).toHaveBeenCalledTimes(1);

      // Wait for first retry (1000ms)
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      expect(mockVideoElement.play).toHaveBeenCalledTimes(2);

      // Wait for second retry (2000ms)
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await vi.runAllTimersAsync();
      });

      expect(mockVideoElement.play).toHaveBeenCalledTimes(3);
      expect(result.current.isPlaying).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should stop retrying after max retries', async () => {
      vi.useFakeTimers();

      mockVideoElement.play = vi.fn().mockRejectedValue(new Error('Persistent error'));

      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = document.createElement('div');
      });

      // Simulate entering viewport
      act(() => {
        simulateIntersection(true);
      });

      // Initial attempt
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(mockVideoElement.play).toHaveBeenCalledTimes(1);

      // Retry 1
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });
      expect(mockVideoElement.play).toHaveBeenCalledTimes(2);

      // Retry 2
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await vi.runAllTimersAsync();
      });
      expect(mockVideoElement.play).toHaveBeenCalledTimes(3);

      // Retry 3
      await act(async () => {
        vi.advanceTimersByTime(4000);
        await vi.runAllTimersAsync();
      });
      expect(mockVideoElement.play).toHaveBeenCalledTimes(4);

      // Should not retry again
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await vi.runAllTimersAsync();
      });

      expect(mockVideoElement.play).toHaveBeenCalledTimes(4);
      expect(result.current.error).toBeTruthy();
    });

    it('should allow manual retry after error', async () => {
      mockVideoElement.play = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        (result.current.videoRef as any).current = mockVideoElement;
        (result.current.containerRef as any).current = document.createElement('div');
      });

      // Simulate entering viewport
      act(() => {
        simulateIntersection(true);
      });

      // Wait for auto-play attempt (will fail)
      await act(async () => {
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      }, { timeout: 1000 });

      // Manual retry
      await act(async () => {
        result.current.retry();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
        expect(result.current.isPlaying).toBe(true);
      }, { timeout: 1000 });
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
        (result.current.containerRef as any).current = document.createElement('div');
      });

      // Simulate entering viewport
      act(() => {
        simulateIntersection(true);
      });

      // First attempt fails
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockVideoElement.play).toHaveBeenCalledTimes(1);

      // Retry succeeds
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(true);
        expect(result.current.error).toBe(null);
      });
    });
  });

  describe('Preloading Behavior (Requirement 2.2)', () => {
    it('should set preload attribute when preloadNext is enabled', () => {
      const { result } = renderHook(() => useVideoPlayback({ preloadNext: true }));

      // Attach refs
      act(() => {
        if (result.current) {
          (result.current.videoRef as any).current = mockVideoElement;
          (result.current.containerRef as any).current = document.createElement('div');
        }
      });

      // Simulate entering viewport
      act(() => {
        simulateIntersection(true);
      });

      // Verify preload is set to auto when in view
      expect(mockVideoElement.preload).toBe('auto');
    });

    it('should not change preload when preloadNext is disabled', () => {
      const { result } = renderHook(() => useVideoPlayback({ preloadNext: false }));

      // Attach refs
      act(() => {
        if (result.current) {
          (result.current.videoRef as any).current = mockVideoElement;
          (result.current.containerRef as any).current = document.createElement('div');
        }
      });

      const initialPreload = mockVideoElement.preload;

      // Simulate entering viewport
      act(() => {
        simulateIntersection(true);
      });

      // Verify preload hasn't changed
      expect(mockVideoElement.preload).toBe(initialPreload);
    });
  });

  describe('Buffering State Detection (Requirement 2.7)', () => {
    it('should set up buffering event listeners', () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        if (result.current) {
          (result.current.videoRef as any).current = mockVideoElement;
          (result.current.containerRef as any).current = document.createElement('div');
        }
      });

      // Verify event listeners were added
      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('waiting', expect.any(Function));
      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('playing', expect.any(Function));
      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('canplay', expect.any(Function));
    });

    it('should detect buffering state', () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        if (result.current) {
          (result.current.videoRef as any).current = mockVideoElement;
          (result.current.containerRef as any).current = document.createElement('div');
        }
      });

      // Get the 'waiting' event handler
      const waitingCall = (mockVideoElement.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'waiting'
      );
      const waitingHandler = waitingCall?.[1];

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
        if (result.current) {
          (result.current.videoRef as any).current = mockVideoElement;
          (result.current.containerRef as any).current = document.createElement('div');
        }
      });

      // Get event handlers
      const waitingCall = (mockVideoElement.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'waiting'
      );
      const playingCall = (mockVideoElement.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'playing'
      );
      const waitingHandler = waitingCall?.[1];
      const playingHandler = playingCall?.[1];

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
        if (result.current) {
          (result.current.videoRef as any).current = mockVideoElement;
          (result.current.containerRef as any).current = document.createElement('div');
        }
      });

      const waitingCall = (mockVideoElement.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'waiting'
      );
      const canPlayCall = (mockVideoElement.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'canplay'
      );
      const waitingHandler = waitingCall?.[1];
      const canPlayHandler = canPlayCall?.[1];

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

  describe('Cleanup', () => {
    it('should remove video event listeners on unmount', () => {
      const { result, unmount } = renderHook(() => useVideoPlayback());

      // Attach refs
      act(() => {
        if (result.current) {
          (result.current.videoRef as any).current = mockVideoElement;
          (result.current.containerRef as any).current = document.createElement('div');
        }
      });

      unmount();

      // Should remove all event listeners
      expect(mockVideoElement.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing video ref gracefully', async () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Don't attach video ref, only container
      act(() => {
        if (result.current) {
          (result.current.containerRef as any).current = document.createElement('div');
        }
      });

      // Try to play
      await act(async () => {
        if (result.current) {
          await result.current.play();
        }
      });

      // Should not crash
      expect(result.current?.error).toBe(null);
    });

    it('should handle missing container ref gracefully', () => {
      const { result } = renderHook(() => useVideoPlayback());

      // Don't attach container ref, only video
      act(() => {
        if (result.current) {
          (result.current.videoRef as any).current = mockVideoElement;
        }
      });

      // Should not crash
      expect(result.current).toBeDefined();
    });
  });
});
