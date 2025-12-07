/**
 * Video Preloading Hook
 * 
 * Provides intelligent video preloading with network speed detection
 * and adaptive loading strategies.
 * 
 * Features:
 * - Preload next 2 videos in feed
 * - Network speed detection for adaptive loading
 * - Low-bandwidth mode with poster images
 * - Manual play button for slow connections
 * 
 * Requirements: 2.2, 2.4
 */

import { useEffect, useState, useCallback, useRef } from 'react';

interface NetworkInfo {
  /**
   * Effective connection type (4g, 3g, 2g, slow-2g)
   */
  effectiveType: string;
  
  /**
   * Downlink speed in Mbps
   */
  downlink: number;
  
  /**
   * Whether data saver mode is enabled
   */
  saveData: boolean;
  
  /**
   * Round-trip time in milliseconds
   */
  rtt: number;
}

interface UseVideoPreloadOptions {
  /**
   * Number of videos to preload ahead
   * @default 2
   */
  preloadCount?: number;
  
  /**
   * Current video index in feed
   */
  currentIndex: number;
  
  /**
   * Array of video URLs to preload
   */
  videoUrls: string[];
  
  /**
   * Callback when network speed changes
   */
  onNetworkChange?: (info: NetworkInfo) => void;
}

interface UseVideoPreloadReturn {
  /**
   * Whether low-bandwidth mode is active
   */
  isLowBandwidth: boolean;
  
  /**
   * Current network information
   */
  networkInfo: NetworkInfo | null;
  
  /**
   * Set of preloaded video URLs
   */
  preloadedUrls: Set<string>;
  
  /**
   * Whether a specific URL is preloaded
   */
  isPreloaded: (url: string) => boolean;
  
  /**
   * Manually trigger preload for a URL
   */
  preloadUrl: (url: string) => void;
  
  /**
   * Clear all preloaded videos
   */
  clearPreloaded: () => void;
}

/**
 * Detect network speed and connection quality
 * Uses Network Information API when available
 */
function getNetworkInfo(): NetworkInfo | null {
  // Check if Network Information API is available
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;

  if (!connection) {
    return null;
  }

  return {
    effectiveType: connection.effectiveType || '4g',
    downlink: connection.downlink || 10,
    saveData: connection.saveData || false,
    rtt: connection.rtt || 50,
  };
}

/**
 * Determine if connection is low-bandwidth
 * Based on effective type, downlink speed, and save data mode
 */
function isLowBandwidthConnection(info: NetworkInfo | null): boolean {
  if (!info) {
    // Conservative default: assume good connection if API unavailable
    return false;
  }

  // Check save data mode
  if (info.saveData) {
    return true;
  }

  // Check effective connection type
  if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') {
    return true;
  }

  // Check downlink speed (< 1.5 Mbps is considered slow)
  if (info.downlink < 1.5) {
    return true;
  }

  // Check round-trip time (> 300ms is considered slow)
  if (info.rtt > 300) {
    return true;
  }

  return false;
}

/**
 * Hook for intelligent video preloading with network detection
 * 
 * @example
 * ```tsx
 * const { isLowBandwidth, preloadedUrls, isPreloaded } = useVideoPreload({
 *   currentIndex: 0,
 *   videoUrls: ['video1.mp4', 'video2.mp4', 'video3.mp4'],
 *   preloadCount: 2,
 * });
 * 
 * return (
 *   <div>
 *     {isLowBandwidth && <p>Low bandwidth mode active</p>}
 *     {videoUrls.map((url, index) => (
 *       <video 
 *         key={url}
 *         src={url}
 *         preload={isPreloaded(url) ? 'auto' : 'metadata'}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useVideoPreload(
  options: UseVideoPreloadOptions
): UseVideoPreloadReturn {
  const {
    preloadCount = 2,
    currentIndex,
    videoUrls,
    onNetworkChange,
  } = options;

  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(
    getNetworkInfo()
  );
  const [isLowBandwidth, setIsLowBandwidth] = useState(
    isLowBandwidthConnection(networkInfo)
  );
  const [preloadedUrls, setPreloadedUrls] = useState<Set<string>>(new Set());
  
  // Track preload elements to clean up
  const preloadElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  /**
   * Update network information
   */
  const updateNetworkInfo = useCallback(() => {
    const info = getNetworkInfo();
    setNetworkInfo(info);
    setIsLowBandwidth(isLowBandwidthConnection(info));
    
    if (info && onNetworkChange) {
      onNetworkChange(info);
    }
  }, [onNetworkChange]);

  /**
   * Listen for network changes
   * Requirement 2.2: Network speed detection for adaptive loading
   */
  useEffect(() => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    if (!connection) {
      return;
    }

    // Update on connection change
    connection.addEventListener('change', updateNetworkInfo);

    return () => {
      connection.removeEventListener('change', updateNetworkInfo);
    };
  }, [updateNetworkInfo]);

  /**
   * Preload a specific video URL
   */
  const preloadUrl = useCallback((url: string) => {
    // Skip if already preloaded
    if (preloadedUrls.has(url)) {
      return;
    }

    // Skip if in low-bandwidth mode
    if (isLowBandwidth) {
      return;
    }

    // Create hidden video element for preloading
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    
    // Hide the element
    video.style.display = 'none';
    
    // Add to DOM to trigger preload
    document.body.appendChild(video);
    
    // Track the element
    preloadElementsRef.current.set(url, video);
    
    // Mark as preloaded once metadata is loaded
    const handleLoadedMetadata = () => {
      setPreloadedUrls((prev) => new Set(prev).add(url));
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Clean up on error
    const handleError = () => {
      console.warn(`Failed to preload video: ${url}`);
      video.remove();
      preloadElementsRef.current.delete(url);
    };
    
    video.addEventListener('error', handleError);
  }, [isLowBandwidth, preloadedUrls]);

  /**
   * Check if a URL is preloaded
   */
  const isPreloaded = useCallback(
    (url: string) => preloadedUrls.has(url),
    [preloadedUrls]
  );

  /**
   * Clear all preloaded videos
   */
  const clearPreloaded = useCallback(() => {
    // Remove all preload elements from DOM
    preloadElementsRef.current.forEach((video) => {
      video.remove();
    });
    
    preloadElementsRef.current.clear();
    setPreloadedUrls(new Set());
  }, []);

  /**
   * Preload next videos based on current index
   * Requirement 2.2: Preload next 2 videos in feed
   */
  useEffect(() => {
    // Skip if in low-bandwidth mode
    if (isLowBandwidth) {
      return;
    }

    // Calculate which videos to preload
    const urlsToPreload: string[] = [];
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < videoUrls.length) {
        urlsToPreload.push(videoUrls[nextIndex]);
      }
    }

    // Preload each URL
    urlsToPreload.forEach((url) => {
      preloadUrl(url);
    });

    // Clean up old preloaded videos that are too far behind
    const minIndex = Math.max(0, currentIndex - preloadCount);
    const maxIndex = Math.min(videoUrls.length - 1, currentIndex + preloadCount);
    
    preloadElementsRef.current.forEach((video, url) => {
      const urlIndex = videoUrls.indexOf(url);
      if (urlIndex !== -1 && (urlIndex < minIndex || urlIndex > maxIndex)) {
        // Remove videos that are out of range
        video.remove();
        preloadElementsRef.current.delete(url);
        setPreloadedUrls((prev) => {
          const next = new Set(prev);
          next.delete(url);
          return next;
        });
      }
    });
  }, [currentIndex, videoUrls, preloadCount, isLowBandwidth, preloadUrl]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      clearPreloaded();
    };
  }, [clearPreloaded]);

  return {
    isLowBandwidth,
    networkInfo,
    preloadedUrls,
    isPreloaded,
    preloadUrl,
    clearPreloaded,
  };
}
