/**
 * TrendingVideosSection Component
 *
 * Explore Home hero rail for global trending videos.
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Flame } from 'lucide-react';
import { useTrendingVideos, TrendingVideo } from '@/hooks/useTrendingVideos';
import { designTokens } from '@/lib/design-tokens';
import { exploreExperienceTokens, exploreVisualTokens } from '@/lib/animations/exploreExperienceTokens';

interface TrendingVideosSectionProps {
  searchQuery?: string;
  onSeeAll: () => void;
  onVideoClick?: (video: TrendingVideo) => void;
  disableMock?: boolean;
}

function isVerticalVideo(video: TrendingVideo): boolean {
  const orientation = String(video.orientation || '').toLowerCase();
  if (orientation.includes('horizontal') || orientation.includes('landscape')) return false;
  if (orientation.includes('square')) return false;
  return true;
}

function matchesSearch(video: TrendingVideo, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return (
    String(video.title || '').toLowerCase().includes(trimmed) ||
    String(video.creatorName || '').toLowerCase().includes(trimmed) ||
    String(video.feedItem.category || '').toLowerCase().includes(trimmed)
  );
}

export function TrendingVideosSection({
  searchQuery = '',
  onSeeAll,
  onVideoClick,
  disableMock = true,
}: TrendingVideosSectionProps) {
  const showDebug = import.meta.env.DEV;
  const { videos, isLoading, isEmpty } = useTrendingVideos({
    limit: 12,
    mode: 'global',
    disableMock,
  });

  const trendingVideos = useMemo(
    () => videos.filter(video => isVerticalVideo(video)).filter(video => matchesSearch(video, searchQuery)),
    [searchQuery, videos],
  );

  const TrendingSkeletonCard = () => (
    <div
      className="w-[13.5rem] shrink-0 overflow-hidden rounded-[1.35rem] border"
      style={{
        borderColor: designTokens.colors.bg.tertiary,
        backgroundColor: designTokens.colors.bg.primary,
        boxShadow: designTokens.shadows.md,
      }}
    >
      <div
        className="relative aspect-[9/16] overflow-hidden"
        style={{ backgroundColor: designTokens.colors.bg.tertiary }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(110deg, rgba(148,163,184,0.1) 8%, rgba(148,163,184,0.22) 18%, rgba(148,163,184,0.1) 33%)',
            backgroundSize: '220% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={exploreExperienceTokens.transitions.shimmerLoop}
          aria-hidden="true"
        />
        <div className="absolute left-3 top-3 h-5 w-20 rounded-full bg-white/20" />
        <div className="absolute inset-x-3 bottom-4 space-y-2">
          <div className="h-3 w-3/4 rounded bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-white/20" />
            <div className="h-2.5 w-24 rounded bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );

  const TrendingCard = ({ video }: { video: TrendingVideo }) => {
    const [isMediaReady, setIsMediaReady] = useState(false);
    const mediaPoster = video.thumbnailUrl || video.videoUrl || '';
    const hasVideo = Boolean(video.videoUrl);

    return (
      <motion.button
        key={video.id}
        type="button"
        onClick={() => onVideoClick?.(video)}
        className="w-[13.5rem] shrink-0 overflow-hidden rounded-[1.35rem] border text-left"
        style={{
          borderColor: designTokens.colors.bg.tertiary,
          backgroundColor: designTokens.colors.bg.primary,
          boxShadow: designTokens.shadows.md,
        }}
        whileHover={exploreExperienceTokens.interactions.cardHover}
        whileTap={exploreExperienceTokens.interactions.tap}
        transition={exploreExperienceTokens.transitions.hover}
      >
        <div className="relative aspect-[9/16] overflow-hidden bg-black">
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(110deg, rgba(148,163,184,0.12) 8%, rgba(148,163,184,0.22) 18%, rgba(148,163,184,0.12) 33%)',
              backgroundSize: '220% 100%',
              opacity: isMediaReady ? 0 : 1,
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={exploreExperienceTokens.transitions.shimmerLoop}
            aria-hidden="true"
          />
          {hasVideo ? (
            <video
              src={video.videoUrl}
              poster={mediaPoster}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
                isMediaReady ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                transitionDuration: `${exploreExperienceTokens.durationsMs.mediaFade}ms`,
                transitionTimingFunction: exploreExperienceTokens.easingCss.interactive,
              }}
              onLoadedData={() => setIsMediaReady(true)}
              onCanPlay={() => setIsMediaReady(true)}
              onError={() => setIsMediaReady(true)}
            />
          ) : (
            <img
              src={mediaPoster}
              alt={video.title}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
                isMediaReady ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                transitionDuration: `${exploreExperienceTokens.durationsMs.mediaFade}ms`,
                transitionTimingFunction: exploreExperienceTokens.easingCss.interactive,
              }}
              loading="lazy"
              decoding="async"
              onLoad={() => setIsMediaReady(true)}
              onError={() => setIsMediaReady(true)}
            />
          )}
          <div className={exploreVisualTokens.mediaOverlayClass} />
          {video.feedItem.category && (
            <span className={exploreVisualTokens.mediaTagPillClass}>
              {video.feedItem.category}
            </span>
          )}
          <div className="absolute inset-x-3 bottom-3">
            <p className="line-clamp-2 text-sm font-semibold text-white">{video.title}</p>
            <p className="mt-1 text-xs text-white/85">{video.creatorName}</p>
          </div>
        </div>
      </motion.button>
    );
  };

  if (isLoading) {
    return (
      <section className="space-y-4" aria-label="Trending videos">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={exploreVisualTokens.sectionTitleClass} style={{ color: designTokens.colors.text.primary }}>
              Trending Now
            </h2>
            <p className={exploreVisualTokens.sectionSubtitleClass} style={{ color: designTokens.colors.text.secondary }}>
              Global momentum across property media.
            </p>
            {showDebug && (
              <p className="mt-1 text-xs font-mono" style={{ color: designTokens.colors.text.tertiary }}>
                mode=global
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, idx) => (
            <TrendingSkeletonCard key={idx} />
          ))}
        </div>
      </section>
    );
  }

  if (isEmpty || trendingVideos.length === 0) {
    return (
      <section
        className="rounded-3xl border p-6"
        style={{
          borderColor: designTokens.colors.bg.tertiary,
          backgroundColor: designTokens.colors.bg.primary,
        }}
        aria-label="Trending videos"
      >
        <h2 className={exploreVisualTokens.sectionTitleClass} style={{ color: designTokens.colors.text.primary }}>
          Trending Now
        </h2>
        <p className="mt-2 text-sm" style={{ color: designTokens.colors.text.secondary }}>
          No trending clips available yet. Open feed to explore recent uploads.
        </p>
        {showDebug && (
          <p className="mt-2 text-xs font-mono" style={{ color: designTokens.colors.text.tertiary }}>
            mode=global
          </p>
        )}
        <motion.button
          type="button"
          onClick={onSeeAll}
          className="mt-4 rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: `${designTokens.colors.accent.primary}12`,
            color: designTokens.colors.accent.primary,
          }}
          whileTap={exploreExperienceTokens.interactions.tap}
          transition={exploreExperienceTokens.transitions.tap}
        >
          Open Feed
        </motion.button>
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-label="Trending videos">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ background: designTokens.colors.accent.gradient }}
          >
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className={exploreVisualTokens.sectionTitleClass} style={{ color: designTokens.colors.text.primary }}>
              Trending Now
            </h2>
            <p className={exploreVisualTokens.sectionSubtitleClass} style={{ color: designTokens.colors.text.secondary }}>
              Global trending clips from walkthroughs, insights, renovations, and neighbourhood stories.
            </p>
            {showDebug && (
              <p className="mt-1 text-xs font-mono" style={{ color: designTokens.colors.text.tertiary }}>
                mode=global
              </p>
            )}
          </div>
        </div>
        <motion.button
          type="button"
          onClick={onSeeAll}
          className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium"
          style={{
            color: designTokens.colors.accent.primary,
            backgroundColor: `${designTokens.colors.accent.primary}10`,
          }}
          whileHover={exploreExperienceTokens.interactions.ctaHover}
          whileTap={exploreExperienceTokens.interactions.tap}
          transition={exploreExperienceTokens.transitions.hover}
        >
          <span>Watch all</span>
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>

      <div className="overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex min-w-max gap-5">
          {trendingVideos.map(video => (
            <TrendingCard key={video.id} video={video} />
          ))}
        </div>
      </div>
    </section>
  );
}
