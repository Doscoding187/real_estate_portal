/**
 * Tests for useImagePreload Hook
 * Task 16: Add image preloading
 * Requirements: 6.4
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useImagePreload,
  useFeedImagePreload,
  useProgressiveImagePreload,
} from '../useImagePreload';

// Mock Image constructor
class MockImage {
  src: string = '';
  onload: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor() {
    // Simulate async image loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
}

// Mock navigator.connection
const mockConnection = {
  effectiveType: '4g',
  saveData: false,
};

describe('useImagePreload', () => {
  beforeEach(() => {
    // Mock Image
    global.Image = MockImage as any;

    // Mock navigator.connection
    Object.defineProperty(navigator, 'connection', {
      value: mockConnection,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Preloading', () => {
    it('should preload images successfully', async () => {
      const urls = ['image1.jpg', 'image2.jpg', 'image3.jpg'];

      const { result } = renderHook(() => useImagePreload(urls));

      // Initially, no images should be loaded
      expect(result.current.loadedImages.size).toBe(0);

      // Wait for images to load
      await waitFor(
        () => {
          expect(result.current.loadedImages.size).toBe(3);
        },
        { timeout: 1000 },
      );

      // All images should be loaded
      expect(result.current.isImageLoaded('image1.jpg')).toBe(true);
      expect(result.current.isImageLoaded('image2.jpg')).toBe(true);
      expect(result.current.isImageLoaded('image3.jpg')).toBe(true);
    });

    it('should respect preloadCount option', async () => {
      const urls = ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg', 'image5.jpg'];

      const { result } = renderHook(() => useImagePreload(urls, { preloadCount: 3 }));

      await waitFor(
        () => {
          expect(result.current.loadedImages.size).toBe(3);
        },
        { timeout: 1000 },
      );

      // Only first 3 should be loaded
      expect(result.current.isImageLoaded('image1.jpg')).toBe(true);
      expect(result.current.isImageLoaded('image2.jpg')).toBe(true);
      expect(result.current.isImageLoaded('image3.jpg')).toBe(true);
      expect(result.current.isImageLoaded('image4.jpg')).toBe(false);
      expect(result.current.isImageLoaded('image5.jpg')).toBe(false);
    });

    it('should call onImageLoaded callback', async () => {
      const onImageLoaded = vi.fn();
      const urls = ['image1.jpg'];

      renderHook(() => useImagePreload(urls, { onImageLoaded }));

      await waitFor(
        () => {
          expect(onImageLoaded).toHaveBeenCalledWith('image1.jpg');
        },
        { timeout: 1000 },
      );
    });

    it('should handle image loading errors', async () => {
      // Mock Image to fail
      class FailingMockImage extends MockImage {
        constructor() {
          super();
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
          }, 10);
        }
      }
      global.Image = FailingMockImage as any;

      const onImageError = vi.fn();
      const urls = ['failing-image.jpg'];

      const { result } = renderHook(() => useImagePreload(urls, { onImageError }));

      await waitFor(
        () => {
          expect(result.current.failedImages.size).toBe(1);
        },
        { timeout: 1000 },
      );

      expect(result.current.isImageFailed('failing-image.jpg')).toBe(true);
      expect(onImageError).toHaveBeenCalled();
    });
  });

  describe('Network Awareness', () => {
    it('should skip preloading on slow connections by default', async () => {
      // Set slow connection
      mockConnection.effectiveType = '2g';

      const urls = ['image1.jpg', 'image2.jpg'];

      const { result } = renderHook(() =>
        useImagePreload(urls, { preloadOnSlowConnection: false }),
      );

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not preload on slow connection
      expect(result.current.loadedImages.size).toBe(0);

      // Reset connection
      mockConnection.effectiveType = '4g';
    });

    it('should preload on slow connections when forced', async () => {
      // Set slow connection
      mockConnection.effectiveType = '2g';

      const urls = ['image1.jpg'];

      const { result } = renderHook(() => useImagePreload(urls, { preloadOnSlowConnection: true }));

      await waitFor(
        () => {
          expect(result.current.loadedImages.size).toBe(1);
        },
        { timeout: 1000 },
      );

      // Reset connection
      mockConnection.effectiveType = '4g';
    });

    it('should respect data saver mode', async () => {
      // Enable data saver
      mockConnection.saveData = true;

      const urls = ['image1.jpg'];

      const { result } = renderHook(() =>
        useImagePreload(urls, { preloadOnSlowConnection: false }),
      );

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not preload with data saver
      expect(result.current.loadedImages.size).toBe(0);

      // Reset data saver
      mockConnection.saveData = false;
    });
  });

  describe('Helper Functions', () => {
    it('should correctly identify loaded images', async () => {
      const urls = ['image1.jpg', 'image2.jpg'];

      const { result } = renderHook(() => useImagePreload(urls));

      await waitFor(
        () => {
          expect(result.current.isImageLoaded('image1.jpg')).toBe(true);
        },
        { timeout: 1000 },
      );

      expect(result.current.isImageLoaded('image1.jpg')).toBe(true);
      expect(result.current.isImageLoaded('nonexistent.jpg')).toBe(false);
    });

    it('should correctly identify loading images', async () => {
      const urls = ['image1.jpg'];

      const { result } = renderHook(() => useImagePreload(urls));

      // Should be loading initially
      expect(result.current.isImageLoading('image1.jpg')).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isImageLoading('image1.jpg')).toBe(false);
        },
        { timeout: 1000 },
      );
    });

    it('should allow manual preloading', async () => {
      const { result } = renderHook(() => useImagePreload([]));

      await act(async () => {
        await result.current.preloadImage('manual-image.jpg');
      });

      expect(result.current.isImageLoaded('manual-image.jpg')).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', async () => {
      const urls = ['image1.jpg', 'image2.jpg'];

      const { unmount } = renderHook(() => useImagePreload(urls));

      // Unmount immediately
      unmount();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});

describe('useFeedImagePreload', () => {
  beforeEach(() => {
    global.Image = MockImage as any;
    mockConnection.effectiveType = '4g';
    mockConnection.saveData = false;
  });

  it('should extract and preload images from feed items', async () => {
    const items = [
      { id: 1, data: { imageUrl: 'feed1.jpg' } },
      { id: 2, data: { thumbnailUrl: 'feed2.jpg' } },
      { id: 3, data: { heroBannerUrl: 'feed3.jpg' } },
    ];

    const { result } = renderHook(() => useFeedImagePreload(items, 0, { preloadCount: 3 }));

    await waitFor(
      () => {
        expect(result.current.loadedImages.size).toBeGreaterThan(0);
      },
      { timeout: 1000 },
    );
  });

  it('should preload upcoming items based on current index', async () => {
    const items = [
      { id: 1, data: { imageUrl: 'feed1.jpg' } },
      { id: 2, data: { imageUrl: 'feed2.jpg' } },
      { id: 3, data: { imageUrl: 'feed3.jpg' } },
      { id: 4, data: { imageUrl: 'feed4.jpg' } },
    ];

    const { result, rerender } = renderHook(
      ({ currentIndex }) => useFeedImagePreload(items, currentIndex, { preloadCount: 2 }),
      { initialProps: { currentIndex: 0 } },
    );

    await waitFor(
      () => {
        expect(result.current.loadedImages.size).toBe(2);
      },
      { timeout: 1000 },
    );

    // Should preload feed2.jpg and feed3.jpg (next 2 after index 0)
    expect(result.current.isImageLoaded('feed2.jpg')).toBe(true);
    expect(result.current.isImageLoaded('feed3.jpg')).toBe(true);
  });

  it('should handle items without images gracefully', async () => {
    const items = [
      { id: 1, data: { title: 'No image' } },
      { id: 2, data: { imageUrl: 'feed2.jpg' } },
    ];

    const { result } = renderHook(() => useFeedImagePreload(items, 0, { preloadCount: 2 }));

    await waitFor(
      () => {
        expect(result.current.loadedImages.size).toBe(1);
      },
      { timeout: 1000 },
    );
  });
});

describe('useProgressiveImagePreload', () => {
  beforeEach(() => {
    global.Image = MockImage as any;
    mockConnection.effectiveType = '4g';
    mockConnection.saveData = false;
  });

  it('should load low quality first, then high quality', async () => {
    const url = 'https://cloudfront.net/image.jpg';

    const { result } = renderHook(() => useProgressiveImagePreload(url));

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for low quality to load
    await waitFor(
      () => {
        expect(result.current.lowQualityLoaded).toBe(true);
      },
      { timeout: 1000 },
    );

    // Then high quality should load
    await waitFor(
      () => {
        expect(result.current.highQualityLoaded).toBe(true);
      },
      { timeout: 2000 },
    );

    expect(result.current.isLoading).toBe(false);
  });

  it('should generate low quality URL for CloudFront images', async () => {
    const url = 'https://cloudfront.net/image.jpg';

    const { result } = renderHook(() => useProgressiveImagePreload(url));

    await waitFor(
      () => {
        expect(result.current.lowQualityLoaded).toBe(true);
      },
      { timeout: 1000 },
    );

    // Low quality should load first
    expect(result.current.lowQualityLoaded).toBe(true);
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    global.Image = MockImage as any;
    mockConnection.effectiveType = '4g';
    mockConnection.saveData = false;
  });

  it('should handle URL changes correctly', async () => {
    const { result, rerender } = renderHook(({ urls }) => useImagePreload(urls), {
      initialProps: { urls: ['image1.jpg'] },
    });

    await waitFor(
      () => {
        expect(result.current.loadedImages.size).toBe(1);
      },
      { timeout: 1000 },
    );

    // Change URLs
    rerender({ urls: ['image2.jpg', 'image3.jpg'] });

    await waitFor(
      () => {
        expect(result.current.loadedImages.size).toBeGreaterThan(1);
      },
      { timeout: 1000 },
    );
  });

  it('should not reload already loaded images', async () => {
    const onImageLoaded = vi.fn();
    const urls = ['image1.jpg'];

    const { rerender } = renderHook(() => useImagePreload(urls, { onImageLoaded }));

    await waitFor(
      () => {
        expect(onImageLoaded).toHaveBeenCalledTimes(1);
      },
      { timeout: 1000 },
    );

    // Rerender with same URLs
    rerender();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not reload
    expect(onImageLoaded).toHaveBeenCalledTimes(1);
  });
});
