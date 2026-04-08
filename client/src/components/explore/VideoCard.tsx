// @ts-nocheck
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/lib/trpc';
import type { DiscoveryFeedMode } from '../../../../shared/discovery/contracts';
import {
  Bath,
  Bed,
  Car,
  Heart,
  Loader2,
  MapPin,
  Maximize,
  MessageCircle,
  Pause,
  Play,
  RefreshCw,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import { ContactAgentModal } from './ContactAgentModal';
import { useVideoPlayback } from '@/hooks/useVideoPlayback';
import { designTokens } from '@/lib/design-tokens';
import { buttonVariants } from '@/lib/animations/exploreAnimations';

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
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  trustBand?: 'low' | 'standard' | 'high';
  unitSize?: number;
  parking?: string;
  parkingType?: string;
  parkingBays?: number;
  badgeLabel?: string;
  badgeStat?: string;
  creatorInitials?: string;
}

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  onView?: () => void;
  discoveryMode?: DiscoveryFeedMode;
}

const formatSize = (value: any) => {
  const unitSize = Number(value?.unitSize);
  if (Number.isFinite(unitSize) && unitSize > 0) return `${unitSize} m2`;
  return '-';
};

const formatYard = (value: any) => {
  const yard = Number(value?.yardSize);
  if (Number.isFinite(yard) && yard > 0) return `${yard} m2`;
  return '--';
};

const formatParking = (value: any) => {
  const parking = String(value?.parking ?? '').toLowerCase();
  const parkingType = String(value?.parkingType ?? '').toLowerCase();
  const bays = Number(value?.parkingBays);

  const hasBays = Number.isFinite(bays) && bays > 0;
  const hasParkingEnum = parking && parking !== 'none' && parking !== '0';
  const hasParkingType = parkingType && parkingType !== 'none';

  if (!hasParkingEnum && !hasParkingType && !hasBays) return '--';

  if (hasParkingEnum) {
    if ((parking === 'carport' || parking === 'garage') && hasBays) {
      return bays >= 2 ? `double ${parking}` : parking;
    }

    return parking;
  }

  if (hasParkingType) return parkingType;
  return hasBays ? (bays >= 2 ? '2 parking' : '1 parking') : '--';
};

const formatCompactNumber = (value?: number) => {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(value);
};

const getInitials = (name?: string) => {
  const parts = String(name || 'Discovery')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map(part => part[0]?.toUpperCase() ?? '').join('') || 'DS';
};

const getBadgeTone = (label?: string) => {
  const tone = String(label || '').toLowerCase();

  if (tone.includes('listing') || tone.includes('development')) {
    return 'linear-gradient(135deg, rgba(37, 99, 235, 0.95) 0%, rgba(59, 130, 246, 0.92) 100%)';
  }

  if (tone.includes('walkthrough') || tone.includes('service')) {
    return 'linear-gradient(135deg, rgba(22, 163, 74, 0.95) 0%, rgba(52, 211, 153, 0.92) 100%)';
  }

  if (tone.includes('neighbourhood')) {
    return 'linear-gradient(135deg, rgba(147, 51, 234, 0.95) 0%, rgba(192, 132, 252, 0.92) 100%)';
  }

  if (tone.includes('insight')) {
    return 'linear-gradient(135deg, rgba(249, 115, 22, 0.95) 0%, rgba(251, 191, 36, 0.92) 100%)';
  }

  return 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(79, 70, 229, 0.92) 100%)';
};

export default function VideoCard({
  video,
  isActive,
  onView,
  discoveryMode = 'feed',
}: VideoCardProps) {
  const { videoRef, containerRef, isPlaying, isBuffering, error, retry, play, pause } =
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

  const discoveryEngage = trpc.discovery.engage.useMutation({
    onSuccess: data => {
      if (data?.success) {
        setLiked(true);
      }
    },
    onError: mutationError => {
      console.error('Failed to record discovery engagement:', mutationError);
    },
  });

  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive && !isPlaying) {
      void play();
    } else if (!isActive && isPlaying) {
      pause();
    }
  }, [isActive, isPlaying, pause, play, videoRef]);

  useEffect(() => {
    if (!showPauseIcon) return;

    const timer = setTimeout(() => {
      setShowPauseIcon(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [showPauseIcon]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

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
        await discoveryEngage.mutateAsync({
          itemId: video.id,
          action: 'share',
          context: { mode: discoveryMode },
        });
      } catch (shareError) {
        console.log('Error sharing:', shareError);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      await discoveryEngage.mutateAsync({
        itemId: video.id,
        action: 'share',
        context: { mode: discoveryMode },
      });
    } catch (shareError) {
      console.log('Failed to copy link', shareError);
    }
  };

  const handleLike = () => {
    discoveryEngage.mutate({
      itemId: video.id,
      action: 'like',
      context: { mode: discoveryMode },
    });

    if (!liked) {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
      setShowPauseIcon(true);
    } else {
      void play();
      setShowPauseIcon(false);
    }
  };

  const handleDoubleTap = () => {
    if (!liked) {
      handleLike();
    }
  };

  const badgeLabel = video.badgeLabel || (video.type === 'listing' ? 'Listing' : 'Discovery');
  const creatorInitials = video.creatorInitials || getInitials(video.agentName);
  const surfaceBackground = getBadgeTone(badgeLabel);
  const engagementLikes = formatCompactNumber(
    video.likes + (liked ? 1 : 0) + (video.isLiked && !liked ? -1 : 0),
  );
  const engagementViews = formatCompactNumber(video.views || 0);
  const engagementShares = formatCompactNumber(video.shares || 0);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-[30px] border border-white/10 bg-black shadow-[0_30px_90px_rgba(2,6,23,0.45)]"
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(circle at top, rgba(255,255,255,0.14), transparent 26%), radial-gradient(circle at bottom, rgba(15,118,110,0.12), transparent 30%)',
        }}
      />

      {video.videoUrl?.includes('unsplash.com') ? (
        <img
          src={video.videoUrl}
          alt={video.title}
          className="h-full w-full object-cover"
          loading="lazy"
          onDoubleClick={handleDoubleTap}
          onClick={() => setShowPropertyDetails(!showPropertyDetails)}
        />
      ) : (
        <video
          ref={videoRef}
          src={video.videoUrl}
          className="h-full w-full object-cover"
          loop
          muted
          playsInline
          preload="metadata"
          poster={video.thumbnailUrl}
          onClick={togglePlayPause}
          onDoubleClick={handleDoubleTap}
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/18 via-transparent to-black/10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/92 via-black/42 to-transparent" />

      <div className="absolute inset-x-0 top-0 z-20 px-4 pb-8 pt-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-white shadow-lg"
              style={{
                background: surfaceBackground,
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              {badgeLabel}
            </span>
            {video.badgeStat ? (
              <span className="rounded-full border border-white/18 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-xl">
                {video.badgeStat}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {video.duration && video.duration > 0 ? (
              <span className="rounded-full border border-white/18 bg-black/35 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-xl">
                {formatDuration(video.duration)}
              </span>
            ) : null}
            <span className="rounded-full border border-white/18 bg-black/35 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-xl">
              {engagementViews} views
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isBuffering && !video.videoUrl?.includes('unsplash.com') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              background: 'rgba(0, 0, 0, 0.28)',
              backdropFilter: designTokens.colors.glass.backdrop,
            }}
          >
            <div className="flex flex-col items-center gap-3 rounded-[28px] border border-white/12 bg-black/35 px-6 py-5 backdrop-blur-xl">
              <Loader2 className="h-12 w-12 animate-spin text-white" strokeWidth={2.5} />
              <span className="text-sm font-medium text-white">Loading...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && !video.videoUrl?.includes('unsplash.com') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          >
            <div className="flex flex-col items-center gap-4 rounded-[30px] border border-white/12 bg-black/40 p-6 text-center backdrop-blur-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <RefreshCw className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold text-white">Playback Error</h3>
                <p className="text-sm text-gray-300">Unable to load video</p>
              </div>
              <motion.button
                onClick={retry}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className="flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white"
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

      {!video.videoUrl?.includes('unsplash.com') &&
        !showPropertyDetails &&
        !isBuffering &&
        !error && (
          <AnimatePresence>
            {(!isPlaying || showPauseIcon) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.86 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/18 bg-black/35 shadow-2xl backdrop-blur-xl">
                  {!isPlaying ? (
                    <Play className="ml-1 h-11 w-11 text-white" />
                  ) : (
                    <Pause className="h-10 w-10 text-white" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

      {showLikeAnimation && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-in zoom-in duration-500 animate-out fade-out duration-1000">
            <Heart className="h-32 w-32 fill-current text-red-500 drop-shadow-2xl" />
          </div>
        </div>
      )}

      <AnimatePresence>
        {showPropertyDetails && video.type === 'listing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex cursor-pointer flex-col p-6 pointer-events-auto"
            style={{
              background: designTokens.colors.glass.bgDark,
              backdropFilter: designTokens.colors.glass.backdrop,
            }}
            onClick={() => setShowPropertyDetails(false)}
          >
            <div className="flex-1 overflow-y-auto">
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-white">{video.propertyTitle}</h2>
                <div className="mb-4 flex items-center gap-2 text-gray-200">
                  <MapPin className="h-5 w-5 text-blue-400" />
                  <span>{video.propertyLocation}</span>
                </div>
                {video.propertyPrice ? (
                  <p className="mb-6 text-3xl font-bold text-white">
                    {formatPrice(video.propertyPrice)}
                  </p>
                ) : null}
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                {video.bedrooms ? (
                  <div
                    className="flex items-center gap-3 rounded-xl p-4"
                    style={{
                      background: designTokens.colors.glass.bg,
                      backdropFilter: designTokens.colors.glass.backdrop,
                      border: `1px solid ${designTokens.colors.glass.border}`,
                    }}
                  >
                    <Bed className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="font-semibold text-gray-900">{video.bedrooms}</p>
                      <p className="text-sm text-gray-600">Bedrooms</p>
                    </div>
                  </div>
                ) : null}

                {video.bathrooms ? (
                  <div
                    className="flex items-center gap-3 rounded-xl p-4"
                    style={{
                      background: designTokens.colors.glass.bg,
                      backdropFilter: designTokens.colors.glass.backdrop,
                      border: `1px solid ${designTokens.colors.glass.border}`,
                    }}
                  >
                    <Bath className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="font-semibold text-gray-900">{video.bathrooms}</p>
                      <p className="text-sm text-gray-600">Bathrooms</p>
                    </div>
                  </div>
                ) : null}

                {video.area ? (
                  <div
                    className="flex items-center gap-3 rounded-xl p-4"
                    style={{
                      background: designTokens.colors.glass.bg,
                      backdropFilter: designTokens.colors.glass.backdrop,
                      border: `1px solid ${designTokens.colors.glass.border}`,
                    }}
                  >
                    <HouseMeasureIcon className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="font-semibold text-gray-900">{formatSize(video)}</p>
                      <p className="text-sm text-gray-600">Building size</p>
                    </div>
                  </div>
                ) : null}

                {video.yardSize ? (
                  <div
                    className="flex items-center gap-3 rounded-xl p-4"
                    style={{
                      background: designTokens.colors.glass.bg,
                      backdropFilter: designTokens.colors.glass.backdrop,
                      border: `1px solid ${designTokens.colors.glass.border}`,
                    }}
                  >
                    <Maximize className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="font-semibold text-gray-900">{formatYard(video)}</p>
                      <p className="text-sm text-gray-600">Yard size</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {video.highlights && video.highlights.length > 0 ? (
                <div className="mb-6">
                  <h3 className="mb-3 text-lg font-bold text-white">Highlights</h3>
                  <div className="flex flex-wrap gap-2">
                    {video.highlights.map((highlight, index) => (
                      <span
                        key={`${highlight}-${index}`}
                        className="rounded-full px-3 py-1.5 text-sm text-white"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(79, 70, 229, 0.3) 100%)',
                          backdropFilter: designTokens.colors.glass.backdrop,
                          border: `1px solid ${designTokens.colors.glass.borderDark}`,
                        }}
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 text-center text-sm text-gray-300">Tap anywhere to close</div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="absolute inset-x-0 bottom-0 z-20 px-4 pb-5 pt-28 text-white sm:px-5"
      >
        <div className="pr-20">
          <div className="mb-4 inline-flex max-w-[80%] items-center gap-3 rounded-full border border-white/12 bg-black/32 px-3 py-2 backdrop-blur-xl">
            <div
              className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white"
              style={{ background: surfaceBackground }}
            >
              {creatorInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {video.agentName || 'Discovery'}
              </p>
              <p className="truncate text-[11px] uppercase tracking-[0.12em] text-white/55">
                {badgeLabel}
              </p>
            </div>
          </div>

          <h2 className="text-[1.55rem] font-extrabold leading-[1.05] text-white drop-shadow-lg sm:text-[1.8rem]">
            {video.propertyTitle || video.title}
          </h2>

          {video.type === 'listing' ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] font-medium text-white/82">
                {video.bedrooms ? (
                  <div className="flex items-center gap-1.5">
                    <Bed className="h-3.5 w-3.5 text-white/78" />
                    <span>{video.bedrooms} bed</span>
                  </div>
                ) : null}
                {video.bathrooms ? (
                  <div className="flex items-center gap-1.5">
                    <Bath className="h-3.5 w-3.5 text-white/78" />
                    <span>{video.bathrooms} bath</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5">
                  <HouseMeasureIcon className="h-3.5 w-3.5 text-white/78" />
                  <span>{formatSize(video)}</span>
                </div>
                {video.yardSize && video.yardSize > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <Maximize className="h-3.5 w-3.5 text-white/78" />
                    <span>{formatYard(video)}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5 text-white/78" />
                  <span>{formatParking(video)}</span>
                </div>
              </div>

              {video.caption ? (
                <p className="mt-3 max-w-[92%] line-clamp-2 text-sm leading-6 text-white/78">
                  {video.caption}
                </p>
              ) : null}

              <div className="mt-4 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  {video.propertyPrice ? (
                    <p className="text-3xl font-extrabold tracking-tight text-white">
                      {formatPrice(video.propertyPrice)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {video.propertyLocation ? (
                    <div className="flex max-w-[45%] items-center gap-1 text-xs font-medium text-white/72">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-white/60" />
                      <span className="truncate">{video.propertyLocation}</span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowPropertyDetails(true)}
                    className="pointer-events-auto rounded-full border border-white/16 bg-black/32 px-3 py-1.5 text-xs font-semibold text-white/86 backdrop-blur-xl"
                  >
                    Details
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 max-w-[92%] line-clamp-3 text-sm leading-6 text-white/80">
                {video.caption || video.description}
              </p>
              {video.propertyLocation ? (
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-white/72">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-white/60" />
                  <span className="truncate">{video.propertyLocation}</span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </motion.div>

      <div className="absolute bottom-6 right-4 z-20 flex flex-col items-center gap-3 pointer-events-auto">
        <motion.button
          onClick={handleLike}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          className="flex flex-col items-center gap-1"
          disabled={discoveryEngage.isPending}
        >
          <div
            className="grid h-12 w-12 place-items-center rounded-full border shadow-xl transition-all duration-300"
            style={{
              background: liked
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.92) 0%, rgba(244, 114, 182, 0.9) 100%)'
                : 'rgba(15, 23, 42, 0.46)',
              backdropFilter: designTokens.colors.glass.backdrop,
              borderColor: liked ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)',
            }}
          >
            <Heart className={`h-6 w-6 ${liked ? 'fill-current text-white' : 'text-white'}`} />
          </div>
          <span className="text-[11px] font-semibold text-white/90">{engagementLikes}</span>
        </motion.button>

        <div className="flex flex-col items-center gap-1">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-white/14 bg-slate-950/42 shadow-xl backdrop-blur-xl">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="text-[11px] font-semibold text-white/90">{engagementViews}</span>
        </div>

        <motion.button
          onClick={handleShare}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          className="flex flex-col items-center gap-1 text-white"
        >
          <div className="grid h-12 w-12 place-items-center rounded-full border border-white/14 bg-slate-950/42 shadow-xl backdrop-blur-xl">
            <Share2 className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-semibold text-white/90">{engagementShares}</span>
        </motion.button>

        <motion.button
          onClick={() => setShowContact(true)}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          className="flex flex-col items-center gap-1 text-white"
        >
          <div className="grid h-12 w-12 place-items-center rounded-full border border-white/14 bg-slate-950/42 shadow-xl backdrop-blur-xl">
            <MessageCircle className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-semibold text-white/90">Ask</span>
        </motion.button>
      </div>

      {showContact ? <ContactAgentModal video={video} onClose={() => setShowContact(false)} /> : null}
    </div>
  );
}
