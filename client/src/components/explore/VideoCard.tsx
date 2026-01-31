import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/lib/trpc';
import {
  Heart,
  Share2,
  MessageCircle,
  Play,
  Pause,
  TrendingUp,
  MapPin,
  Bed,
  Bath,
  Square,
  TreePine,
  Loader2,
  RefreshCw,
  Car,
  Maximize,
} from 'lucide-react';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import { ContactAgentModal } from './ContactAgentModal';
import { useVideoPlayback } from '@/hooks/useVideoPlayback';
import { designTokens } from '@/lib/design-tokens';
import { fadeVariants, buttonVariants } from '@/lib/animations/exploreAnimations';

interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  userId: number;
  createdAt: Date;
  type?: string;
  propertyTitle?: string;
  propertyLocation?: string;
  propertyPrice?: number;
  caption?: string;
  duration?: number;
  isLiked?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  yardSize?: number;
  propertyType?: string;
  highlights?: string[];
  agentName?: string;
  shares?: number;
  // Expanded fields for accurate card rendering
  unitSize?: number;
  parking?: string;
  parkingType?: string;
  parkingBays?: number;
}

// Format helpers
const formatSize = (u: any) => {
  const unitSize = Number(u?.unitSize);
  if (Number.isFinite(unitSize) && unitSize > 0) return `${unitSize} m2`;
  return '-';
};

const formatYard = (u: any) => {
  const yard = Number(u?.yardSize);
  if (Number.isFinite(yard) && yard > 0) return `${yard} m²`;
  return '—';
};

const formatParking = (u: any) => {
  // backend persists: parking (enum-ish), parkingType (detail), parkingBays (int)
  const parking = String(u?.parking ?? '').toLowerCase();
  const parkingType = String(u?.parkingType ?? '').toLowerCase();
  const bays = Number(u?.parkingBays);

  const hasBays = Number.isFinite(bays) && bays > 0;
  const hasParkingEnum = parking && parking !== 'none' && parking !== '0';
  const hasParkingType = parkingType && parkingType !== 'none';

  if (!hasParkingEnum && !hasParkingType && !hasBays) return '—';

  // prefer explicit enum value
  if (hasParkingEnum) {
    if ((parking === 'carport' || parking === 'garage') && hasBays) {
      return bays >= 2 ? `double ${parking}` : parking;
    }
    return parking; // 'open', 'covered', etc.
  }

  // fallback to parkingType if enum missing
  if (hasParkingType) return parkingType;

  // last fallback: bays only
  return hasBays ? (bays >= 2 ? '2 parking' : '1 parking') : '—';
};

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  onView?: () => void;
}

export default function VideoCard({ video, isActive, onView }: VideoCardProps) {
  // Use the new video playback hook with viewport detection
  const { videoRef, containerRef, isPlaying, isBuffering, error, inView, retry, play, pause } =
    useVideoPlayback({
      preloadNext: true,
      threshold: 0.5,
      onEnterViewport: () => {
        onView?.();
      },
    });

  const [showContact, setShowContact] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [liked, setLiked] = useState(video.isLiked || false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);

  const toggleLike = trpc.video.toggleLike.useMutation({
    onSuccess: data => {
      setLiked(data.liked);
    },
    onError: error => {
      console.error('Failed to toggle like:', error);
    },
  });

  // Manual play/pause control when isActive changes (for swipe navigation)
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive && !isPlaying) {
      play();
    } else if (!isActive && isPlaying) {
      pause();
    }
  }, [isActive, isPlaying, play, pause]);

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = async () => {
    const shareData = {
      title:
        video.type === 'listing'
          ? `Check out this property: ${video.propertyTitle}`
          : `Video by ${video.agentName}`,
      text: video.caption || '',
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        // You could show a toast notification here
        console.log('Link copied to clipboard');
      } catch (err) {
        console.log('Failed to copy link');
      }
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
      setShowPauseIcon(true);
    } else {
      play();
      setShowPauseIcon(false);
    }
  };

  // Double tap to like (TikTok-style)
  const handleDoubleTap = () => {
    if (!liked) {
      toggleLike.mutate({ videoId: parseInt(video.id) });
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
    }
  };

  // Auto-hide pause icon after 800ms
  useEffect(() => {
    if (showPauseIcon) {
      const timer = setTimeout(() => {
        setShowPauseIcon(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showPauseIcon]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex items-center justify-center bg-black"
    >
      {/* Video Container with Overlay */}
      <div className="relative h-full w-auto max-w-full">
        {/* Video or Image Element */}
        {video.videoUrl?.includes('unsplash.com') ? (
          // Placeholder Image
          <img
            src={video.videoUrl}
            alt={video.title}
            className="h-full w-auto max-w-full object-contain"
            loading="lazy"
            onDoubleClick={handleDoubleTap}
            onClick={() => setShowPropertyDetails(!showPropertyDetails)}
          />
        ) : (
          // Actual Video
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="h-full w-auto max-w-full object-contain"
            loop
            muted
            playsInline
            preload="metadata"
            poster={video.thumbnailUrl}
            onClick={togglePlayPause}
            onDoubleClick={handleDoubleTap}
            onLoadedMetadata={() => {
              // Video loaded, ready to play
            }}
          />
        )}

        {/* Buffering Indicator - Modern Glass Overlay */}
        <AnimatePresence>
          {isBuffering && !video.videoUrl?.includes('unsplash.com') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                background: designTokens.colors.glass.bgDark,
                backdropFilter: designTokens.colors.glass.backdrop,
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-white animate-spin" strokeWidth={2.5} />
                <span className="text-white text-sm font-medium">Loading...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State with Retry Button - Modern Glass Overlay */}
        <AnimatePresence>
          {error && !video.videoUrl?.includes('unsplash.com') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
            >
              <div className="flex flex-col items-center gap-4 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-semibold mb-1">Playback Error</h3>
                  <p className="text-gray-300 text-sm">Unable to load video</p>
                </div>
                <motion.button
                  onClick={retry}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="px-6 py-3 rounded-xl text-white font-medium flex items-center gap-2"
                  style={{
                    background: designTokens.colors.glass.bg,
                    backdropFilter: designTokens.colors.glass.backdrop,
                    border: `1px solid ${designTokens.colors.glass.border}`,
                    boxShadow: designTokens.shadows.glass,
                  }}
                >
                  <RefreshCw className="h-5 w-5" />
                  Retry
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap to Play/Pause - TikTok Style (Only for videos) */}
        {!video.videoUrl?.includes('unsplash.com') &&
          !showPropertyDetails &&
          !isBuffering &&
          !error && (
            <AnimatePresence>
              {(!isPlaying || showPauseIcon) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div
                    className="h-20 w-20 rounded-full flex items-center justify-center shadow-2xl"
                    style={{
                      background: designTokens.colors.glass.bgDark,
                      backdropFilter: designTokens.colors.glass.backdrop,
                      border: `1px solid ${designTokens.colors.glass.borderDark}`,
                    }}
                  >
                    {!isPlaying ? (
                      <Play className="h-10 w-10 text-white ml-1" />
                    ) : (
                      <Pause className="h-10 w-10 text-white" />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

        {/* Double Tap Like Animation */}
        {showLikeAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="animate-in zoom-in duration-500 animate-out fade-out duration-1000">
              <Heart className="h-32 w-32 text-red-500 fill-current drop-shadow-2xl" />
            </div>
          </div>
        )}

        {/* Property Details Overlay - Modern Glass Design */}
        <AnimatePresence>
          {showPropertyDetails && video.type === 'listing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col p-6 pointer-events-auto cursor-pointer"
              style={{
                background: designTokens.colors.glass.bgDark,
                backdropFilter: designTokens.colors.glass.backdrop,
              }}
              onClick={() => setShowPropertyDetails(false)}
            >
              <div className="flex-1 overflow-y-auto">
                <div className="mb-6">
                  <h2 className="text-white text-2xl font-bold mb-2">{video.propertyTitle}</h2>
                  <div className="flex items-center gap-2 text-gray-200 mb-4">
                    <MapPin className="h-5 w-5 text-blue-400" />
                    <span>{video.propertyLocation}</span>
                  </div>
                  {video.propertyPrice && (
                    <p className="text-3xl font-bold text-white mb-6">
                      {formatPrice(video.propertyPrice)}
                    </p>
                  )}
                </div>

                {/* Property Specs - Modern Glass Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {video.bedrooms && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center gap-3 rounded-xl p-4"
                      style={{
                        background: designTokens.colors.glass.bg,
                        backdropFilter: designTokens.colors.glass.backdrop,
                        border: `1px solid ${designTokens.colors.glass.border}`,
                      }}
                    >
                      <Bed className="h-6 w-6 text-blue-400" />
                      <div>
                        <p className="text-gray-900 font-semibold">{video.bedrooms}</p>
                        <p className="text-gray-600 text-sm">Bedrooms</p>
                      </div>
                    </motion.div>
                  )}

                  {video.bathrooms && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="flex items-center gap-3 rounded-xl p-4"
                      style={{
                        background: designTokens.colors.glass.bg,
                        backdropFilter: designTokens.colors.glass.backdrop,
                        border: `1px solid ${designTokens.colors.glass.border}`,
                      }}
                    >
                      <Bath className="h-6 w-6 text-blue-400" />
                      <div>
                        <p className="text-gray-900 font-semibold">{video.bathrooms}</p>
                        <p className="text-gray-600 text-sm">Bathrooms</p>
                      </div>
                    </motion.div>
                  )}

                  {video.area && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-3 rounded-xl p-4"
                      style={{
                        background: designTokens.colors.glass.bg,
                        backdropFilter: designTokens.colors.glass.backdrop,
                        border: `1px solid ${designTokens.colors.glass.border}`,
                      }}
                    >
                      <Square className="h-6 w-6 text-blue-400" />
                      <div>
                        <p className="text-gray-900 font-semibold">
                          {video.area.toLocaleString()} m²
                        </p>
                        <p className="text-gray-600 text-sm">Building Size</p>
                      </div>
                    </motion.div>
                  )}

                  {video.yardSize && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="flex items-center gap-3 rounded-xl p-4"
                      style={{
                        background: designTokens.colors.glass.bg,
                        backdropFilter: designTokens.colors.glass.backdrop,
                        border: `1px solid ${designTokens.colors.glass.border}`,
                      }}
                    >
                      <TreePine className="h-6 w-6 text-blue-400" />
                      <div>
                        <p className="text-gray-900 font-semibold">
                          {video.yardSize.toLocaleString()} m²
                        </p>
                        <p className="text-gray-600 text-sm">Yard Size</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Highlights */}
                {video.highlights && video.highlights.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                  >
                    <h3 className="text-white text-lg font-bold mb-3">Property Highlights</h3>
                    <div className="flex flex-wrap gap-2">
                      {video.highlights.map((highlight, index) => (
                        <motion.span
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.35 + index * 0.05 }}
                          className="px-3 py-1.5 rounded-full text-white text-sm"
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(79, 70, 229, 0.3) 100%)',
                            backdropFilter: designTokens.colors.glass.backdrop,
                            border: `1px solid ${designTokens.colors.glass.borderDark}`,
                          }}
                        >
                          {highlight}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center text-gray-300 text-sm mt-4"
              >
                Tap anywhere to close
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Bottom Overlay - Modern Glass Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pb-20 md:pb-24 text-white pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.6) 50%, transparent 100%)',
          }}
        >
          {video.type === 'listing' ? (
            // Listing Video - Enhanced property details
            <div className="space-y-2">
              {/* Trending Badge - Modern Glass */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-2"
              >
                <div
                  className="flex items-center gap-1 px-3 py-1 rounded-full shadow-lg"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(249, 115, 22, 0.9) 0%, rgba(239, 68, 68, 0.9) 100%)',
                    backdropFilter: designTokens.colors.glass.backdrop,
                    border: `1px solid ${designTokens.colors.glass.borderDark}`,
                  }}
                >
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-bold">Hot Property</span>
                </div>
              </motion.div>

              {/* Property Title */}
              <h2 className="font-bold text-xl md:text-2xl line-clamp-2 mb-2 drop-shadow-lg">
                {video.propertyTitle}
              </h2>

              {/* Location */}
              <div className="flex items-center gap-2 text-sm md:text-base text-gray-200 mb-2">
                <MapPin className="h-4 w-4 text-blue-400" />
                <p className="line-clamp-1">{video.propertyLocation}</p>
              </div>

              {/* Property Specs Row */}
              {/* Property Specs Row */}
              {/* DEBUG: Check what fields are actually present on 'video' object */}
              {(() => {
                console.log('[VideoCard] unit sample', {
                  unitSize: (video as any).unitSize,
                  yardSize: (video as any).yardSize,
                  parking: (video as any).parking,
                  parkingType: (video as any).parkingType,
                  parkingBays: (video as any).parkingBays,
                });
                return null;
              })()}

              <div className="flex items-center gap-3 text-xs md:text-sm text-gray-300 mb-2">
                {video.bedrooms && (
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4 text-blue-400" />
                    <span>{video.bedrooms}</span>
                  </div>
                )}
                {video.bathrooms && (
                  <div className="flex items-center gap-1">
                    <Bath className="h-4 w-4 text-blue-400" />
                    <span>{video.bathrooms}</span>
                  </div>
                )}

                {/* Size */}
                <div className="flex items-center gap-1">
                  <HouseMeasureIcon className="h-4 w-4 text-blue-400" />
                  <span>{formatSize(video)}</span>
                </div>

                {/* Yard (optional but slot stays aligned) */}
                {video.yardSize && video.yardSize > 0 && (
                  <div className="flex items-center gap-1">
                    <Maximize className="h-4 w-4 text-blue-400" />
                    <span>{formatYard(video)}</span>
                  </div>
                )}

                {/* Parking (never tied to yard) */}
                <div className="flex items-center gap-1">
                  <Car className="h-4 w-4 text-blue-400" />
                  <span>{formatParking(video)}</span>
                </div>
              </div>

              {/* Price - Modern Glass Badge */}
              {video.propertyPrice && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="inline-block px-4 py-2 rounded-full shadow-lg"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%)',
                    backdropFilter: designTokens.colors.glass.backdrop,
                    border: `1px solid ${designTokens.colors.glass.border}`,
                  }}
                >
                  <p className="font-bold text-white text-lg md:text-xl">
                    {formatPrice(video.propertyPrice)}
                  </p>
                </motion.div>
              )}
            </div>
          ) : (
            // Content Video - Show agent info
            <div className="mb-2">
              <p className="font-semibold text-base md:text-lg">@{video.agentName}</p>
            </div>
          )}

          {/* Caption */}
          {video.caption && (
            <p className="text-sm md:text-base text-gray-200 line-clamp-2 mt-2 drop-shadow-lg">
              {video.caption}
            </p>
          )}

          {/* Video duration */}
          {video.duration && video.duration > 0 && (
            <p className="text-xs md:text-sm text-gray-300 mt-1">
              {formatDuration(video.duration)}
            </p>
          )}
        </motion.div>
      </div>

      {/* Enhanced Floating Action Buttons - Modern Glass Design */}
      <div className="absolute right-3 md:right-4 bottom-28 md:bottom-32 flex flex-col items-center space-y-5 md:space-y-6 pointer-events-auto">
        {/* Like Button */}
        <motion.button
          onClick={() => {
            toggleLike.mutate({ videoId: parseInt(video.id) });
            if (!liked) {
              setShowLikeAnimation(true);
              setTimeout(() => setShowLikeAnimation(false), 1000);
            }
          }}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          className="flex flex-col items-center"
          disabled={toggleLike.isPending}
        >
          <div
            className="p-3 md:p-3.5 rounded-full shadow-xl transition-all duration-300"
            style={{
              background: liked
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(236, 72, 153, 0.9) 100%)'
                : designTokens.colors.glass.bgDark,
              backdropFilter: designTokens.colors.glass.backdrop,
              border: `1px solid ${liked ? designTokens.colors.glass.border : designTokens.colors.glass.borderDark}`,
            }}
          >
            <Heart
              className={`h-7 w-7 md:h-8 md:w-8 transition-all duration-300 ${
                liked ? 'text-white fill-current' : 'text-white'
              }`}
            />
          </div>
          <span className="text-xs md:text-sm mt-1.5 font-bold drop-shadow-lg text-white">
            {video.likes + (liked ? 1 : 0) + (video.isLiked && !liked ? -1 : 0)}
          </span>
        </motion.button>

        {/* Share Button */}
        <motion.button
          onClick={handleShare}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          className="flex flex-col items-center text-white"
        >
          <div
            className="p-3 md:p-3.5 rounded-full shadow-xl transition-all duration-300"
            style={{
              background: designTokens.colors.glass.bgDark,
              backdropFilter: designTokens.colors.glass.backdrop,
              border: `1px solid ${designTokens.colors.glass.borderDark}`,
            }}
          >
            <Share2 className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <span className="text-xs md:text-sm mt-1.5 font-bold drop-shadow-lg">
            {video.shares || 0}
          </span>
        </motion.button>

        {/* Contact Button */}
        <motion.button
          onClick={() => setShowContact(true)}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          className="flex flex-col items-center text-white"
        >
          <div
            className="p-3 md:p-3.5 rounded-full shadow-xl transition-all duration-300"
            style={{
              background: designTokens.colors.glass.bgDark,
              backdropFilter: designTokens.colors.glass.backdrop,
              border: `1px solid ${designTokens.colors.glass.borderDark}`,
            }}
          >
            <MessageCircle className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <span className="text-xs md:text-sm mt-1.5 font-bold drop-shadow-lg">Contact</span>
        </motion.button>
      </div>

      {/* Enhanced Views Counter - Modern Glass */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-4 right-4 rounded-full px-4 py-2 text-white text-xs md:text-sm font-semibold shadow-lg"
        style={{
          background: designTokens.colors.glass.bgDark,
          backdropFilter: designTokens.colors.glass.backdrop,
          border: `1px solid ${designTokens.colors.glass.borderDark}`,
        }}
      >
        <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          {video.views || 0}
        </span>
        <span className="text-white/90 ml-1">views</span>
      </motion.div>

      {/* Contact Modal */}
      {showContact && <ContactAgentModal video={video} onClose={() => setShowContact(false)} />}
    </div>
  );
}
