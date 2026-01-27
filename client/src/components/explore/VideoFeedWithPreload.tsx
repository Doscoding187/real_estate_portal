/**
 * Video Feed with Preloading
 *
 * Example component demonstrating integration of useVideoPreload hook
 * with video feed functionality.
 *
 * Features:
 * - Automatic preloading of next 2 videos
 * - Network speed detection
 * - Low-bandwidth mode with manual play buttons
 * - Adaptive loading based on connection quality
 *
 * Requirements: 2.2, 2.4
 */

import { useState, useEffect } from 'react';
import { useVideoPreload } from '@/hooks/useVideoPreload';
import { useVideoPlayback } from '@/hooks/useVideoPlayback';
import { Play, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Video {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  description?: string;
}

interface VideoFeedWithPreloadProps {
  videos: Video[];
  onVideoChange?: (index: number) => void;
}

/**
 * Video card component with preload integration
 */
function VideoCardWithPreload({
  video,
  isActive,
  isPreloaded,
  lowBandwidthMode,
  onView,
}: {
  video: Video;
  isActive: boolean;
  isPreloaded: boolean;
  lowBandwidthMode: boolean;
  onView: () => void;
}) {
  const { videoRef, containerRef, isPlaying, isBuffering, error, play, retry } = useVideoPlayback({
    lowBandwidthMode,
    onEnterViewport: onView,
  });

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        src={video.url}
        poster={video.thumbnailUrl}
        preload={isPreloaded ? 'auto' : 'metadata'}
        className="w-full h-full object-contain"
        loop
        playsInline
        muted
      />

      {/* Manual play button for low bandwidth */}
      {lowBandwidthMode && !isPlaying && !error && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={play}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl hover:bg-white/30 transition-all">
              <Play className="w-10 h-10 text-white ml-1" />
            </div>
            <p className="text-white text-sm font-medium">Tap to play</p>
          </div>
        </motion.button>
      )}

      {/* Buffering indicator */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="text-red-500 text-4xl">⚠️</div>
            <p className="text-white text-lg">Failed to load video</p>
            <button
              onClick={retry}
              className="px-6 py-3 bg-white/20 backdrop-blur-md text-white rounded-lg font-semibold hover:bg-white/30 transition-all border border-white/30"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Preload indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && isPreloaded && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 text-xs rounded-full font-semibold shadow-lg">
          Preloaded
        </div>
      )}

      {/* Video info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
        <h3 className="text-white text-xl font-bold mb-2">{video.title}</h3>
        {video.description && (
          <p className="text-gray-300 text-sm line-clamp-2">{video.description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Video feed component with intelligent preloading
 */
export function VideoFeedWithPreload({ videos, onVideoChange }: VideoFeedWithPreloadProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Video preloading with network detection
  const { isLowBandwidth, networkInfo, isPreloaded } = useVideoPreload({
    currentIndex,
    videoUrls: videos.map(v => v.url),
    preloadCount: 2,
    onNetworkChange: info => {
      console.log('Network changed:', info);
    },
  });

  // Notify parent of video changes
  useEffect(() => {
    onVideoChange?.(currentIndex);
  }, [currentIndex, onVideoChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowDown' && currentIndex < videos.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Network status banner */}
      <AnimatePresence>
        {isLowBandwidth && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-50 bg-yellow-500/90 backdrop-blur-md text-black px-4 py-3 shadow-lg"
          >
            <div className="flex items-center justify-center gap-3">
              <WifiOff className="w-5 h-5" />
              <div className="text-center">
                <p className="font-semibold text-sm">Low bandwidth mode active</p>
                {networkInfo && (
                  <p className="text-xs opacity-80">
                    {networkInfo.effectiveType} connection ({networkInfo.downlink.toFixed(1)} Mbps)
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Good connection indicator */}
      {!isLowBandwidth && networkInfo && process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 z-50 bg-green-500/90 backdrop-blur-md text-white px-3 py-2 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          <span>
            {networkInfo.effectiveType} ({networkInfo.downlink.toFixed(1)} Mbps)
          </span>
        </div>
      )}

      {/* Video cards */}
      <div className="relative w-full h-full">
        {videos.map((video, index) => (
          <div
            key={video.id}
            className={`absolute inset-0 transition-opacity duration-300 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <VideoCardWithPreload
              video={video}
              isActive={index === currentIndex}
              isPreloaded={isPreloaded(video.url)}
              lowBandwidthMode={isLowBandwidth}
              onView={() => setCurrentIndex(index)}
            />
          </div>
        ))}
      </div>

      {/* Navigation indicators */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1 rounded-full transition-all ${
              index === currentIndex ? 'w-8 bg-white' : 'w-1 bg-gray-500 hover:bg-gray-400'
            }`}
            aria-label={`Go to video ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="absolute right-4 bottom-1/2 transform translate-y-1/2 flex flex-col gap-4 z-20">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/30 transition-all border border-white/30"
          aria-label="Previous video"
        >
          ↑
        </button>
        <button
          onClick={() => setCurrentIndex(prev => Math.min(videos.length - 1, prev + 1))}
          disabled={currentIndex === videos.length - 1}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/30 transition-all border border-white/30"
          aria-label="Next video"
        >
          ↓
        </button>
      </div>

      {/* Video counter */}
      <div className="absolute top-4 right-4 z-50 bg-black/50 backdrop-blur-md text-white px-3 py-2 rounded-full text-sm font-semibold">
        {currentIndex + 1} / {videos.length}
      </div>
    </div>
  );
}
