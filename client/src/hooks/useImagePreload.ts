/**
 * Image Preloading Hook
 * Task 16: Add image preloading
 * Requirements: 6.4
 *
 * Preloads images for next 5 items in feed to improve perceived performance.
 * Integrates with ProgressiveImage component for seamless loading experience.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

interface PreloadOptions {
  /**
   * Number of images to preload ahead
   * @default 5
   */
  preloadCount?: number;

  /**
   * Priority for preloading (higher = more important)
   * @default 'low'
   */
  priority?: 'high' | 'low';

  /**
   * Whether to preload on slow connections
   * @default false
   */
  preloadOnSlowConnection?: boolean;

  /**
   * Callback when an image is successfully preloaded
   */
  onImageLoaded?: (url: string) => void;

  /**
   * Callback when an image fails to preload
   */
  onImageError?: (url: string, error: Error) => void;
}

interface PreloadState {
  loadedImages: Set<string>;
  failedImages: Set<string>;
  loadingImages: Set<string>;
}

/**
 * Hook to preload images for upcoming feed items
 *
 * @param urls - Array of image URLs to preload
 * @param options - Preload configuration options
 * @returns Object containing loaded, failed, and loading image sets
 *
 * @example
 * ```tsx
 * const { loadedImages, isImageLoaded } = useImagePreload(imageUrls, {
 *   preloadCount: 5,
 *   priority: 'low'
 * });
 * ```
 */
export function useImagePreload(
  urls: string[],
  options: PreloadOptions = {},
): PreloadState & {
  isImageLoaded: (url: string) => boolean;
  isImageLoading: (url: string) => boolean;
  isImageFailed: (url: string) => boolean;
  preloadImage: (url: string) => Promise<void>;
} {
  const {
    preloadCount = 5,
    priority = 'low',
    preloadOnSlowConnection = false,
    onImageLoaded,
    onImageError,
  } = options;

  const [state, setState] = useState<PreloadState>({
    loadedImages: new Set(),
    failedImages: new Set(),
    loadingImages: new Set(),
  });

  const preloadedRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  /**
   * Check network connection speed
   */
  const isSlowConnection = useCallback((): boolean => {
    if (!('connection' in navigator)) return false;

    const connection = (navigator as any).connection;
    if (!connection) return false;

    // Consider 2G, slow-2g, or saveData as slow
    return (
      connection.effectiveType === '2g' ||
      connection.effectiveType === 'slow-2g' ||
      connection.saveData === true
    );
  }, []);

  /**
   * Preload a single image
   */
  const preloadImage = useCallback(
    (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Skip if already loaded or failed
        if (state.loadedImages.has(url) || state.failedImages.has(url)) {
          resolve();
          return;
        }

        // Skip if already loading
        if (state.loadingImages.has(url)) {
          resolve();
          return;
        }

        // Check connection speed
        if (!preloadOnSlowConnection && isSlowConnection()) {
          resolve();
          return;
        }

        // Mark as loading
        setState(prev => ({
          ...prev,
          loadingImages: new Set(prev.loadingImages).add(url),
        }));

        // Create image element
        const img = new Image();

        // Set priority hint if supported
        if ('fetchPriority' in img) {
          (img as any).fetchPriority = priority;
        }

        // Set up abort controller for cleanup
        const abortController = new AbortController();
        abortControllersRef.current.set(url, abortController);

        img.onload = () => {
          setState(prev => {
            const newLoadingImages = new Set(prev.loadingImages);
            newLoadingImages.delete(url);

            return {
              ...prev,
              loadedImages: new Set(prev.loadedImages).add(url),
              loadingImages: newLoadingImages,
            };
          });

          preloadedRefs.current.set(url, img);
          abortControllersRef.current.delete(url);
          onImageLoaded?.(url);
          resolve();
        };

        img.onerror = event => {
          const error = new Error(`Failed to preload image: ${url}`);

          setState(prev => {
            const newLoadingImages = new Set(prev.loadingImages);
            newLoadingImages.delete(url);

            return {
              ...prev,
              failedImages: new Set(prev.failedImages).add(url),
              loadingImages: newLoadingImages,
            };
          });

          abortControllersRef.current.delete(url);
          onImageError?.(url, error);
          reject(error);
        };

        // Start loading
        img.src = url;
      });
    },
    [
      state.loadedImages,
      state.failedImages,
      state.loadingImages,
      priority,
      preloadOnSlowConnection,
      isSlowConnection,
      onImageLoaded,
      onImageError,
    ],
  );

  /**
   * Preload images when URLs change
   */
  useEffect(() => {
    // Take only the first N images to preload
    const urlsToPreload = urls.slice(0, preloadCount);

    // Preload images in sequence with slight delay to avoid blocking
    const preloadSequence = async () => {
      for (let i = 0; i < urlsToPreload.length; i++) {
        const url = urlsToPreload[i];

        try {
          await preloadImage(url);

          // Add small delay between preloads to avoid blocking main thread
          if (i < urlsToPreload.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error) {
          // Continue with next image even if one fails
          console.warn(`Failed to preload image ${i + 1}/${urlsToPreload.length}:`, error);
        }
      }
    };

    preloadSequence();

    // Cleanup function
    return () => {
      // Abort any ongoing preloads
      abortControllersRef.current.forEach(controller => {
        controller.abort();
      });
      abortControllersRef.current.clear();
    };
  }, [urls, preloadCount, preloadImage]);

  /**
   * Helper functions to check image state
   */
  const isImageLoaded = useCallback(
    (url: string) => state.loadedImages.has(url),
    [state.loadedImages],
  );

  const isImageLoading = useCallback(
    (url: string) => state.loadingImages.has(url),
    [state.loadingImages],
  );

  const isImageFailed = useCallback(
    (url: string) => state.failedImages.has(url),
    [state.failedImages],
  );

  return {
    ...state,
    isImageLoaded,
    isImageLoading,
    isImageFailed,
    preloadImage,
  };
}

/**
 * Hook to preload images for feed items based on scroll position
 * Automatically extracts image URLs from feed items and preloads upcoming images
 *
 * @param items - Array of feed items
 * @param currentIndex - Current visible item index
 * @param options - Preload configuration options
 *
 * @example
 * ```tsx
 * const { loadedImages } = useFeedImagePreload(feedItems, currentIndex, {
 *   preloadCount: 5
 * });
 * ```
 */
export function useFeedImagePreload<T extends { data: any }>(
  items: T[],
  currentIndex: number,
  options: PreloadOptions = {},
) {
  /**
   * Extract image URLs from feed items
   */
  const extractImageUrls = useCallback((items: T[]): string[] => {
    return items
      .map(item => {
        const data = item.data;

        // Try common image URL properties
        return (
          data.thumbnailUrl ||
          data.imageUrl ||
          data.heroBannerUrl ||
          data.image ||
          data.thumbnail ||
          null
        );
      })
      .filter((url): url is string => url !== null && url !== undefined);
  }, []);

  // Get upcoming image URLs starting from current index
  const upcomingItems = items.slice(
    currentIndex + 1,
    currentIndex + 1 + (options.preloadCount || 5),
  );
  const upcomingImageUrls = extractImageUrls(upcomingItems);

  return useImagePreload(upcomingImageUrls, options);
}

/**
 * Hook to preload images with progressive quality
 * Loads low-quality placeholder first, then high-quality version
 *
 * @param url - Image URL to preload
 * @param options - Preload configuration options
 *
 * @example
 * ```tsx
 * const { lowQualityLoaded, highQualityLoaded } = useProgressiveImagePreload(imageUrl);
 * ```
 */
export function useProgressiveImagePreload(url: string, options: PreloadOptions = {}) {
  const [lowQualityLoaded, setLowQualityLoaded] = useState(false);
  const [highQualityLoaded, setHighQualityLoaded] = useState(false);

  /**
   * Generate low-quality URL
   */
  const getLowQualityUrl = useCallback((src: string): string => {
    if (src.includes('cloudfront.net') || src.includes('amazonaws.com')) {
      const url = new URL(src);
      url.searchParams.set('w', '100');
      url.searchParams.set('q', '30');
      return url.toString();
    }
    return src;
  }, []);

  const lowQualityUrl = getLowQualityUrl(url);

  // Preload low quality first
  const { isImageLoaded: isLowQualityLoaded } = useImagePreload([lowQualityUrl], {
    ...options,
    priority: 'high',
    onImageLoaded: () => setLowQualityLoaded(true),
  });

  // Preload high quality after low quality loads
  const { isImageLoaded: isHighQualityLoaded } = useImagePreload(lowQualityLoaded ? [url] : [], {
    ...options,
    priority: 'low',
    onImageLoaded: () => setHighQualityLoaded(true),
  });

  return {
    lowQualityLoaded: isLowQualityLoaded(lowQualityUrl),
    highQualityLoaded: isHighQualityLoaded(url),
    isLoading: !highQualityLoaded,
  };
}

export default useImagePreload;
