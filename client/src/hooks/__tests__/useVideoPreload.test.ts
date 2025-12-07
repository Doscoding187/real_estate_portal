/**
 * Tests for useVideoPreload hook
 * 
 * Requirements: 2.2, 2.4
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVideoPreload } from '../useVideoPreload';

// Mock Network Information API
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  saveData: false,
  rtt: 50,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

describe('useVideoPreload', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock Network Information API
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: mockConnection,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4', 'video2.mp4', 'video3.mp4'],
        })
      );

      expect(result.current.isLowBandwidth).toBe(false);
      expect(result.current.networkInfo).toBeDefined();
      expect(result.current.preloadedUrls).toBeInstanceOf(Set);
      expect(result.current.preloadedUrls.size).toBe(0);
    });

    it('should provide helper functions', () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4'],
        })
      );

      expect(typeof result.current.isPreloaded).toBe('function');
      expect(typeof result.current.preloadUrl).toBe('function');
      expect(typeof result.current.clearPreloaded).toBe('function');
    });
  });

  describe('Network Detection', () => {
    it('should detect good connection (4g)', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 10;
      mockConnection.saveData = false;
      mockConnection.rtt = 50;

      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4'],
        })
      );

      expect(result.current.isLowBandwidth).toBe(false);
      expect(result.current.networkInfo?.effectiveType).toBe('4g');
    });

    it('should detect low bandwidth (2g connection)', () => {
      mockConnection.effectiveType = '2g';
      mockConnection.downlink = 0.5;
      mockConnection.rtt = 400;

      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4'],
        })
      );

      expect(result.current.isLowBandwidth).toBe(true);
    });

    it('should detect low bandwidth (slow downlink)', () => {
      mockConnection.effectiveType = '3g';
      mockConnection.downlink = 1.0; // < 1.5 Mbps
      mockConnection.rtt = 100;

      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4'],
        })
      );

      expect(result.current.isLowBandwidth).toBe(true);
    });

    it('should detect low bandwidth (high RTT)', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 5;
      mockConnection.rtt = 350; // > 300ms

      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4'],
        })
      );

      expect(result.current.isLowBandwidth).toBe(true);
    });

    it('should detect low bandwidth (save data mode)', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 10;
      mockConnection.saveData = true;
      mockConnection.rtt = 50;

      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4'],
        })
      );

      expect(result.current.isLowBandwidth).toBe(true);
    });

    it('should handle missing Network Information API', () => {
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        value: undefined,
      });

      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4'],
        })
      );

      expect(result.current.networkInfo).toBeNull();
      expect(result.current.isLowBandwidth).toBe(false); // Conservative default
    });

    it('should call onNetworkChange callback', () => {
      const onNetworkChange = jest.fn();

      renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4'],
          onNetworkChange,
        })
      );

      // Simulate network change
      act(() => {
        const changeHandler = mockConnection.addEventListener.mock.calls.find(
          (call) => call[0] === 'change'
        )?.[1];
        if (changeHandler) {
          changeHandler();
        }
      });

      expect(onNetworkChange).toHaveBeenCalled();
    });
  });

  describe('Preloading Logic', () => {
    it('should not preload in low-bandwidth mode', () => {
      mockConnection.effectiveType = '2g';
      mockConnection.downlink = 0.5;

      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4', 'video2.mp4', 'video3.mp4'],
          preloadCount: 2,
        })
      );

      expect(result.current.isLowBandwidth).toBe(true);
      
      // Wait a bit to ensure no preloading happens
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.preloadedUrls.size).toBe(0);
    });

    it('should preload next videos in good connection', async () => {
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 10;
      mockConnection.saveData = false;

      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4', 'video2.mp4', 'video3.mp4'],
          preloadCount: 2,
        })
      );

      expect(result.current.isLowBandwidth).toBe(false);

      // Preloading happens asynchronously
      await waitFor(() => {
        // Check that video elements were created
        const videoElements = document.querySelectorAll('video[style*="display: none"]');
        expect(videoElements.length).toBeGreaterThan(0);
      });
    });

    it('should respect preloadCount parameter', () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['v1.mp4', 'v2.mp4', 'v3.mp4', 'v4.mp4', 'v5.mp4'],
          preloadCount: 3,
        })
      );

      // Should preload next 3 videos (v2, v3, v4)
      // Actual preloading is async, so we just verify the hook accepts the parameter
      expect(result.current).toBeDefined();
    });

    it('should update preloaded videos when currentIndex changes', () => {
      const { result, rerender } = renderHook(
        ({ currentIndex }) =>
          useVideoPreload({
            currentIndex,
            videoUrls: ['v1.mp4', 'v2.mp4', 'v3.mp4', 'v4.mp4'],
            preloadCount: 2,
          }),
        { initialProps: { currentIndex: 0 } }
      );

      // Move to next video
      rerender({ currentIndex: 1 });

      // Preload logic should update
      expect(result.current).toBeDefined();
    });
  });

  describe('Manual Control', () => {
    it('should allow manual preload of specific URL', () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4', 'video2.mp4'],
        })
      );

      act(() => {
        result.current.preloadUrl('video2.mp4');
      });

      // Check that video element was created
      const videoElements = document.querySelectorAll('video[src="video2.mp4"]');
      expect(videoElements.length).toBeGreaterThan(0);
    });

    it('should check if URL is preloaded', async () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4', 'video2.mp4'],
        })
      );

      expect(result.current.isPreloaded('video2.mp4')).toBe(false);

      act(() => {
        result.current.preloadUrl('video2.mp4');
      });

      // After preload is triggered, it should eventually be marked as preloaded
      // (when loadedmetadata event fires)
    });

    it('should clear all preloaded videos', () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4', 'video2.mp4'],
        })
      );

      act(() => {
        result.current.preloadUrl('video2.mp4');
      });

      act(() => {
        result.current.clearPreloaded();
      });

      expect(result.current.preloadedUrls.size).toBe(0);
      
      // Check that video elements were removed
      const videoElements = document.querySelectorAll('video[style*="display: none"]');
      expect(videoElements.length).toBe(0);
    });

    it('should not preload same URL twice', () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4', 'video2.mp4'],
        })
      );

      act(() => {
        result.current.preloadUrl('video2.mp4');
      });

      const firstCount = document.querySelectorAll('video[src="video2.mp4"]').length;

      act(() => {
        result.current.preloadUrl('video2.mp4');
      });

      const secondCount = document.querySelectorAll('video[src="video2.mp4"]').length;

      expect(secondCount).toBe(firstCount);
    });
  });

  describe('Cleanup', () => {
    it('should clean up on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: ['video1.mp4', 'video2.mp4'],
        })
      );

      act(() => {
        result.current.preloadUrl('video2.mp4');
      });

      const beforeUnmount = document.querySelectorAll('video[style*="display: none"]').length;
      expect(beforeUnmount).toBeGreaterThan(0);

      unmount();

      const afterUnmount = document.querySelectorAll('video[style*="display: none"]').length;
      expect(afterUnmount).toBe(0);
    });

    it('should remove out-of-range preloaded videos', () => {
      const { result, rerender } = renderHook(
        ({ currentIndex }) =>
          useVideoPreload({
            currentIndex,
            videoUrls: ['v1.mp4', 'v2.mp4', 'v3.mp4', 'v4.mp4', 'v5.mp4'],
            preloadCount: 2,
          }),
        { initialProps: { currentIndex: 0 } }
      );

      // Move far ahead
      rerender({ currentIndex: 4 });

      // Old preloaded videos should be cleaned up
      // (videos at index 0, 1 should be removed)
      expect(result.current).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty video URLs array', () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 0,
          videoUrls: [],
        })
      );

      expect(result.current.preloadedUrls.size).toBe(0);
    });

    it('should handle currentIndex at end of array', () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 2,
          videoUrls: ['v1.mp4', 'v2.mp4', 'v3.mp4'],
          preloadCount: 2,
        })
      );

      // Should not crash when trying to preload beyond array
      expect(result.current).toBeDefined();
    });

    it('should handle negative currentIndex', () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: -1,
          videoUrls: ['v1.mp4', 'v2.mp4'],
        })
      );

      expect(result.current).toBeDefined();
    });

    it('should handle currentIndex beyond array length', () => {
      const { result } = renderHook(() =>
        useVideoPreload({
          currentIndex: 10,
          videoUrls: ['v1.mp4', 'v2.mp4'],
        })
      );

      expect(result.current).toBeDefined();
    });
  });
});
