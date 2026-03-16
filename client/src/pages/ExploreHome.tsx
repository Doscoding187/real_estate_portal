import { type FormEvent, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronRight, Grid3x3, Play, Search } from 'lucide-react';
import { CategoryChipRow, type CategoryChip } from '@/components/explore-discovery/CategoryChipRow';
import { TrendingVideosSection } from '@/components/explore-discovery/TrendingVideosSection';
import { useTrendingVideos, type TrendingVideo } from '@/hooks/useTrendingVideos';
import { useExploreIntent } from '@/hooks/useExploreIntent';
import { trpc } from '@/lib/trpc';
import { type ExploreFocus, mapFocusToLegacyIntent, setExploreIntent } from '@/lib/exploreIntentSession';
import { writeStoredExploreIntent } from '@/lib/exploreIntent';
import { designTokens } from '@/lib/design-tokens';
import { getVariants, pageVariants } from '@/lib/animations/exploreAnimations';
import { exploreExperienceTokens, exploreVisualTokens } from '@/lib/animations/exploreExperienceTokens';

type CardVariant = 'hero' | 'standard' | 'wide';

interface RailSection {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  focus: ExploreFocus;
  subFocus: string;
  variant: CardVariant;
  videos: TrendingVideo[];
  isLoading: boolean;
  debugMeta?: {
    mode: 'global' | 'recommended';
    requestedIntentFocus: string | null;
    requestedIntentSubFocus: string | null;
    resolvedLegacyIntent: string | null;
    appliedIntentMultiplier: number | null;
    requestedCreatorActorId: number | null;
  };
  sectionPurity?: {
    matchPct: number;
    returnedCount: number;
    requestedCount: number;
    shortfallReason?: string;
  };
}

interface CreatorCard {
  creatorActorId: number;
  creatorId: number | null;
  handle: string;
  name: string;
  topFocusTags: string[];
  focus: ExploreFocus;
  subFocus: string;
  coverUrl: string;
}

const INTENT_CHIPS: CategoryChip[] = [
  { id: 'walkthroughs', label: 'Walkthroughs', focus: 'buy', subFocus: 'walkthroughs' },
  {
    id: 'investment_finance',
    label: 'Investment & Finance',
    focus: 'finance',
    subFocus: 'investment_finance',
  },
  { id: 'renovations', label: 'Renovations', focus: 'renovate', subFocus: 'renovation_home_improvement' },
  { id: 'interior_design', label: 'Interior Design', focus: 'services', subFocus: 'interior_design' },
  { id: 'architecture', label: 'Architecture', focus: 'services', subFocus: 'architecture' },
  { id: 'construction', label: 'Construction', focus: 'renovate', subFocus: 'construction' },
  { id: 'neighbourhoods', label: 'Neighborhoods', focus: 'neighbourhood', subFocus: 'neighborhoods' },
  { id: 'developments', label: 'Developments', focus: 'invest', subFocus: 'developments' },
];

function categoryOf(video: TrendingVideo): string {
  return String(video.feedItem.category || '').toLowerCase();
}

function mapVideoToFocus(video: TrendingVideo): ExploreFocus {
  const category = categoryOf(video);
  if (category === 'finance') return 'finance';
  if (category === 'investment') return 'invest';
  if (category === 'renovation') return 'renovate';
  if (category === 'services') return 'services';
  return 'buy';
}

function mapTagToFocus(tag: string): ExploreFocus {
  const normalized = String(tag || '').toLowerCase();
  if (normalized === 'sell') return 'sell';
  if (normalized === 'renovate' || normalized === 'renovation') return 'renovate';
  if (normalized === 'services') return 'services';
  if (normalized === 'finance') return 'finance';
  if (normalized === 'invest' || normalized === 'investment') return 'invest';
  if (normalized === 'neighbourhood' || normalized === 'neighborhoods') return 'neighbourhood';
  return 'buy';
}

function variantWidthClass(variant: CardVariant): string {
  switch (variant) {
    case 'hero':
      return 'w-[15rem] md:w-[16rem]';
    case 'standard':
      return 'w-[13.5rem] md:w-[14.5rem]';
    case 'wide':
      return 'w-[20rem] md:w-[28rem]';
    default:
      return 'w-[14rem]';
  }
}

function variantAspectClass(variant: CardVariant): string {
  switch (variant) {
    case 'hero':
      return 'aspect-[9/16]';
    case 'standard':
      return 'aspect-[3/4]';
    case 'wide':
      return 'aspect-[16/9]';
    default:
      return 'aspect-[3/4]';
  }
}

function SectionHeader({
  title,
  subtitle,
  ctaLabel,
  onCta,
  onCtaPrefetch,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCta: () => void;
  onCtaPrefetch?: () => void;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2
          className={exploreVisualTokens.sectionTitleClass}
          style={{ color: designTokens.colors.text.primary }}
        >
          {title}
        </h2>
        <p className={exploreVisualTokens.sectionSubtitleClass} style={{ color: designTokens.colors.text.secondary }}>
          {subtitle}
        </p>
      </div>
      <motion.button
        type="button"
        onClick={onCta}
        onMouseEnter={onCtaPrefetch}
        onFocus={onCtaPrefetch}
        className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium"
        style={{
          color: designTokens.colors.accent.primary,
          backgroundColor: `${designTokens.colors.accent.primary}10`,
        }}
        whileHover={exploreExperienceTokens.interactions.ctaHover}
        whileTap={exploreExperienceTokens.interactions.tap}
        transition={exploreExperienceTokens.transitions.hover}
      >
        <span>{ctaLabel}</span>
        <ChevronRight className="h-4 w-4" />
      </motion.button>
    </div>
  );
}

function MediaRailCard({
  video,
  variant,
  onClick,
  onPrefetch,
}: {
  video: TrendingVideo;
  variant: CardVariant;
  onClick: () => void;
  onPrefetch?: () => void;
}) {
  const [isMediaReady, setIsMediaReady] = useState(false);
  const mediaPoster = video.thumbnailUrl || video.videoUrl || '';
  const hasVideo = Boolean(video.videoUrl);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={`${variantWidthClass(variant)} shrink-0 overflow-hidden rounded-3xl border text-left`}
      style={{
        borderColor: designTokens.colors.bg.tertiary,
        backgroundColor: designTokens.colors.bg.primary,
        boxShadow: designTokens.shadows.md,
      }}
      whileHover={exploreExperienceTokens.interactions.cardHover}
      whileTap={exploreExperienceTokens.interactions.tap}
      transition={exploreExperienceTokens.transitions.hover}
    >
      <div className={`relative ${variantAspectClass(variant)} overflow-hidden bg-black`}>
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
}

function RailSkeleton({ variant }: { variant: CardVariant }) {
  return (
    <div className="overflow-x-auto pb-1 scrollbar-hide">
      <div className="flex min-w-max gap-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={`${variantWidthClass(variant)} shrink-0 overflow-hidden rounded-3xl border`}
            style={{
              borderColor: designTokens.colors.bg.tertiary,
              backgroundColor: designTokens.colors.bg.primary,
              boxShadow: designTokens.shadows.md,
            }}
          >
            <div
              className={`relative ${variantAspectClass(variant)} overflow-hidden`}
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
        ))}
      </div>
    </div>
  );
}

function formatRailDebugLine(section: RailSection): string {
  const focusBase = section.debugMeta?.requestedIntentFocus || section.subFocus || 'none';
  const focusDetail = section.debugMeta?.requestedIntentSubFocus
    ? `/${section.debugMeta.requestedIntentSubFocus}`
    : '';
  const legacy = section.debugMeta?.resolvedLegacyIntent || 'none';
  const multiplier =
    typeof section.debugMeta?.appliedIntentMultiplier === 'number'
      ? section.debugMeta.appliedIntentMultiplier.toFixed(2)
      : 'n/a';
  const purity = section.sectionPurity
    ? `${section.sectionPurity.matchPct.toFixed(0)}% (${section.sectionPurity.returnedCount}/${section.sectionPurity.requestedCount})`
    : 'n/a';
  const creatorSeed = section.debugMeta?.requestedCreatorActorId
    ? ` | seed=${section.debugMeta.requestedCreatorActorId}`
    : '';

  return `focus=${focusBase}${focusDetail} | legacy=${legacy} | mult=${multiplier} | purity=${purity}${creatorSeed}`;
}

export default function ExploreHome() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { setIntent } = useExploreIntent();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChipId, setSelectedChipId] = useState<string | undefined>();
  const prefetchedFeedKeysRef = useRef<Set<string>>(new Set());

  const walkthroughRailQuery = useTrendingVideos({
    limit: 10,
    mode: 'recommended',
    intentFocus: 'walkthroughs',
    disableMock: true,
  });
  const financeRailQuery = useTrendingVideos({
    limit: 10,
    mode: 'recommended',
    intentFocus: 'investment_finance',
    disableMock: true,
  });
  const renovationRailQuery = useTrendingVideos({
    limit: 10,
    mode: 'recommended',
    intentFocus: 'renovation_home_improvement',
    disableMock: true,
  });
  const neighbourhoodRailQuery = useTrendingVideos({
    limit: 8,
    mode: 'recommended',
    intentFocus: 'neighborhoods',
    disableMock: true,
  });
  const creatorSpotlightQuery = trpc.explore.getCreatorSpotlight.useQuery({
    limit: 6,
    windowDays: 14,
  });

  const prefetchFeedSeed = (
    focus: ExploreFocus,
    subFocus?: string,
    options?: { creatorActorId?: number },
  ) => {
    const creatorActorId =
      options?.creatorActorId && options.creatorActorId > 0 ? options.creatorActorId : undefined;
    const normalizedSubFocus = String(subFocus || '').trim() || undefined;
    const dedupeKey = `${focus}|${normalizedSubFocus || ''}|${creatorActorId || ''}`;
    if (prefetchedFeedKeysRef.current.has(dedupeKey)) return;
    prefetchedFeedKeysRef.current.add(dedupeKey);

    const input = {
      feedType: 'recommended' as const,
      limit: 20,
      offset: 0,
      intent: mapFocusToLegacyIntent(focus),
      intentFocus: focus,
      ...(normalizedSubFocus ? { intentSubFocus: normalizedSubFocus } : {}),
      ...(creatorActorId ? { creatorActorId } : {}),
    };

    void utils.explore.getFeed.prefetch(input).catch(() => {
      prefetchedFeedKeysRef.current.delete(dedupeKey);
    });
  };

  const navigateToFeed = (
    focus: ExploreFocus,
    subFocus?: string,
    query?: string,
    options?: { creatorActorId?: number },
  ) => {
    prefetchFeedSeed(focus, subFocus, options);
    setExploreIntent({ focus, subFocus });
    const legacyIntent = mapFocusToLegacyIntent(focus);
    writeStoredExploreIntent(legacyIntent);
    void setIntent(legacyIntent);

    const params = new URLSearchParams();
    params.set('focus', focus);
    if (subFocus) params.set('subFocus', subFocus);
    const q = String(query ?? '').trim();
    if (q.length) params.set('q', q);
    if (options?.creatorActorId && options.creatorActorId > 0) {
      params.set('creatorActorId', String(options.creatorActorId));
    }

    setLocation(`/explore/feed?${params.toString()}`);
  };

  const selectedChip = useMemo(
    () => INTENT_CHIPS.find(chip => chip.id === selectedChipId),
    [selectedChipId],
  );

  const rails = useMemo<RailSection[]>(
    () => [
      {
        id: 'property_walkthroughs',
        title: 'Property Walkthroughs',
        subtitle: 'Video-first tours and on-site reveals. No listing grids.',
        ctaLabel: 'Open feed',
        focus: 'buy',
        subFocus: 'walkthroughs',
        variant: 'standard',
        videos: walkthroughRailQuery.videos,
        isLoading: walkthroughRailQuery.isLoading,
        debugMeta: walkthroughRailQuery.debugMeta,
        sectionPurity: walkthroughRailQuery.sectionPurity
          ? {
              matchPct: walkthroughRailQuery.sectionPurity.matchPct,
              returnedCount: walkthroughRailQuery.sectionPurity.returnedCount,
              requestedCount: walkthroughRailQuery.sectionPurity.requestedCount,
              shortfallReason: walkthroughRailQuery.sectionPurity.shortfallReason,
            }
          : undefined,
      },
      {
        id: 'investment_finance',
        title: 'Investment & Finance',
        subtitle: 'Bond explainers, yield context, and market perspective clips.',
        ctaLabel: 'View insights',
        focus: 'finance',
        subFocus: 'investment_finance',
        variant: 'standard',
        videos: financeRailQuery.videos,
        isLoading: financeRailQuery.isLoading,
        debugMeta: financeRailQuery.debugMeta,
        sectionPurity: financeRailQuery.sectionPurity
          ? {
              matchPct: financeRailQuery.sectionPurity.matchPct,
              returnedCount: financeRailQuery.sectionPurity.returnedCount,
              requestedCount: financeRailQuery.sectionPurity.requestedCount,
              shortfallReason: financeRailQuery.sectionPurity.shortfallReason,
            }
          : undefined,
      },
      {
        id: 'renovation_home_improvement',
        title: 'Renovation & Home Improvement',
        subtitle: 'Before/after projects, upgrades, and practical build progress updates.',
        ctaLabel: 'See projects',
        focus: 'renovate',
        subFocus: 'renovation_home_improvement',
        variant: 'standard',
        videos: renovationRailQuery.videos,
        isLoading: renovationRailQuery.isLoading,
        debugMeta: renovationRailQuery.debugMeta,
        sectionPurity: renovationRailQuery.sectionPurity
          ? {
              matchPct: renovationRailQuery.sectionPurity.matchPct,
              returnedCount: renovationRailQuery.sectionPurity.returnedCount,
              requestedCount: renovationRailQuery.sectionPurity.requestedCount,
              shortfallReason: renovationRailQuery.sectionPurity.shortfallReason,
            }
          : undefined,
      },
      {
        id: 'neighbourhood_stories',
        title: 'Neighborhood Stories',
        subtitle: 'Location storytelling through creator-led short-form videos.',
        ctaLabel: 'Explore videos',
        focus: 'neighbourhood',
        subFocus: 'neighborhoods',
        variant: 'wide',
        videos: neighbourhoodRailQuery.videos,
        isLoading: neighbourhoodRailQuery.isLoading,
        debugMeta: neighbourhoodRailQuery.debugMeta,
        sectionPurity: neighbourhoodRailQuery.sectionPurity
          ? {
              matchPct: neighbourhoodRailQuery.sectionPurity.matchPct,
              returnedCount: neighbourhoodRailQuery.sectionPurity.returnedCount,
              requestedCount: neighbourhoodRailQuery.sectionPurity.requestedCount,
              shortfallReason: neighbourhoodRailQuery.sectionPurity.shortfallReason,
            }
          : undefined,
      },
    ],
    [
      financeRailQuery.isLoading,
      financeRailQuery.debugMeta,
      financeRailQuery.sectionPurity,
      financeRailQuery.videos,
      neighbourhoodRailQuery.isLoading,
      neighbourhoodRailQuery.debugMeta,
      neighbourhoodRailQuery.sectionPurity,
      neighbourhoodRailQuery.videos,
      renovationRailQuery.isLoading,
      renovationRailQuery.debugMeta,
      renovationRailQuery.sectionPurity,
      renovationRailQuery.videos,
      walkthroughRailQuery.isLoading,
      walkthroughRailQuery.debugMeta,
      walkthroughRailQuery.sectionPurity,
      walkthroughRailQuery.videos,
    ],
  );

  const creatorSpotlight = useMemo<CreatorCard[]>(() => {
    const payload = creatorSpotlightQuery.data;
    const rawItems = Array.isArray((payload as any)?.items)
      ? ((payload as any).items as Array<Record<string, unknown>>)
      : [];

    return rawItems.map(item => {
      const topFocusTags = Array.isArray(item.topFocusTags)
        ? item.topFocusTags
            .map(tag => String(tag || '').trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 3)
        : [];
      const primaryTag = topFocusTags[0] || 'property';
      const focus = mapTagToFocus(String(item.seedFocus || primaryTag));

      return {
        creatorActorId: Number(item.creatorActorId || 0),
        creatorId: Number(item.creatorId || 0) || null,
        handle: String(item.handle || ''),
        name: String(item.displayName || 'Creator'),
        topFocusTags,
        focus,
        subFocus: String(item.seedSubFocus || primaryTag),
        coverUrl: String(item.avatarUrl || ''),
      };
    });
  }, [creatorSpotlightQuery.data]);

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    const focus = selectedChip?.focus ?? 'buy';
    const subFocus = selectedChip?.subFocus ?? (query ? query.toLowerCase().replace(/\s+/g, '-') : undefined);
    navigateToFeed(focus, subFocus, query);
  };

  return (
    <motion.div
      className="min-h-screen"
      style={{ backgroundColor: designTokens.colors.bg.secondary }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={getVariants(pageVariants)}
    >
      <motion.header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{
          backgroundColor: designTokens.colors.glass.bg,
          borderColor: designTokens.colors.bg.tertiary,
        }}
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={exploreExperienceTokens.transitions.route}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold" style={{ color: designTokens.colors.text.primary }}>
            Explore
          </h1>
          <div
            className="flex items-center gap-1 rounded-full p-1"
            style={{ backgroundColor: designTokens.colors.bg.tertiary }}
            role="tablist"
            aria-label="Explore view selection"
          >
            <motion.button
              type="button"
              onClick={() => setLocation('/explore/home')}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: designTokens.colors.bg.primary,
                color: designTokens.colors.text.primary,
                boxShadow: designTokens.shadows.sm,
              }}
              whileHover={exploreExperienceTokens.interactions.ctaHover}
              whileTap={exploreExperienceTokens.interactions.tap}
              transition={exploreExperienceTokens.transitions.hover}
              role="tab"
              aria-selected={true}
            >
              <Grid3x3 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Home</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setLocation('/explore/feed')}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: 'transparent',
                color: designTokens.colors.text.secondary,
              }}
              whileHover={exploreExperienceTokens.interactions.ctaHover}
              whileTap={exploreExperienceTokens.interactions.tap}
              transition={exploreExperienceTokens.transitions.hover}
              role="tab"
              aria-selected={false}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Feed</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-20 lg:space-y-24">
          <section className="space-y-5" aria-label="Explore controls">
            <form onSubmit={onSearchSubmit} className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                style={{ color: designTokens.colors.text.tertiary }}
                aria-hidden="true"
              />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search property videos, creators, topics..."
                className="h-12 w-full rounded-full border bg-transparent pl-12 pr-20 text-sm outline-none"
                style={{
                  borderColor: designTokens.colors.bg.tertiary,
                  backgroundColor: designTokens.colors.bg.primary,
                  color: designTokens.colors.text.primary,
                }}
                aria-label="Search explore videos"
              />
              <motion.button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  backgroundColor: `${designTokens.colors.accent.primary}14`,
                  color: designTokens.colors.accent.primary,
                }}
                whileTap={exploreExperienceTokens.interactions.tap}
                transition={exploreExperienceTokens.transitions.tap}
              >
                Open Feed
              </motion.button>
            </form>

            <CategoryChipRow
              chips={INTENT_CHIPS}
              selectedChipId={selectedChipId}
              onChipPrefetch={chip => prefetchFeedSeed(chip.focus, chip.subFocus)}
              onChipClick={chip => {
                setSelectedChipId(chip.id);
                navigateToFeed(chip.focus, chip.subFocus);
              }}
            />
          </section>

          <TrendingVideosSection
            searchQuery=""
            disableMock={true}
            onSeeAll={() => navigateToFeed('buy', 'trending_now')}
            onVideoClick={video => {
              const focus = mapVideoToFocus(video);
              const subFocus = String(video.feedItem.category || 'trending').toLowerCase();
              navigateToFeed(focus, subFocus);
            }}
          />

          {rails.map(section => (
            <section key={section.id} aria-label={section.title}>
              <SectionHeader
                title={section.title}
                subtitle={section.subtitle}
                ctaLabel={section.ctaLabel}
                onCta={() => navigateToFeed(section.focus, section.subFocus)}
                onCtaPrefetch={() => prefetchFeedSeed(section.focus, section.subFocus)}
              />
              {import.meta.env.DEV && (
                <p className="mb-3 text-xs" style={{ color: designTokens.colors.text.tertiary }}>
                  <span className="font-mono">{formatRailDebugLine(section)}</span>
                  {section.sectionPurity?.shortfallReason
                    ? ` - ${section.sectionPurity.shortfallReason.replace(/_/g, ' ')}`
                    : ''}
                </p>
              )}

              {section.isLoading ? (
                <RailSkeleton variant={section.variant} />
              ) : section.videos.length === 0 ? (
                <div
                  className="rounded-3xl border p-6"
                  style={{
                    borderColor: designTokens.colors.bg.tertiary,
                    backgroundColor: designTokens.colors.bg.primary,
                  }}
                >
                  <p style={{ color: designTokens.colors.text.secondary }}>
                    No videos available in this section yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto pb-1 scrollbar-hide">
                  <div className="flex min-w-max gap-5">
                    {section.videos.map(video => (
                      <MediaRailCard
                        key={`${section.id}-${video.id}`}
                        video={video}
                        variant={section.variant}
                        onClick={() => navigateToFeed(section.focus, section.subFocus)}
                        onPrefetch={() => prefetchFeedSeed(section.focus, section.subFocus)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}

          <section aria-label="Creator Spotlight">
            <SectionHeader
              title="Creator Spotlight"
              subtitle="Top voices in property media across agents, designers, builders, and analysts."
              ctaLabel="View creators"
              onCta={() => navigateToFeed('buy', 'creators')}
            />

            {creatorSpotlightQuery.isLoading ? (
              <RailSkeleton variant="standard" />
            ) : creatorSpotlight.length === 0 ? (
              <div
                className="rounded-3xl border p-6"
                style={{
                  borderColor: designTokens.colors.bg.tertiary,
                  backgroundColor: designTokens.colors.bg.primary,
                }}
              >
                <p style={{ color: designTokens.colors.text.secondary }}>
                  Creator spotlight is warming up. Check back after more interactions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-1 scrollbar-hide">
                <div className="flex min-w-max gap-5">
                  {creatorSpotlight.map(creator => (
                    <motion.button
                      key={`${creator.creatorActorId}-${creator.handle}`}
                      type="button"
                      onMouseEnter={() =>
                        prefetchFeedSeed(creator.focus, creator.subFocus, {
                          creatorActorId: creator.creatorActorId,
                        })
                      }
                      onFocus={() =>
                        prefetchFeedSeed(creator.focus, creator.subFocus, {
                          creatorActorId: creator.creatorActorId,
                        })
                      }
                      onClick={() =>
                        navigateToFeed(creator.focus, creator.subFocus, undefined, {
                          creatorActorId: creator.creatorActorId,
                        })
                      }
                      className="w-[15rem] shrink-0 rounded-3xl border p-4 text-left"
                      style={{
                        borderColor: designTokens.colors.bg.tertiary,
                        backgroundColor: designTokens.colors.bg.primary,
                        boxShadow: designTokens.shadows.sm,
                      }}
                      whileHover={exploreExperienceTokens.interactions.cardHover}
                      whileTap={exploreExperienceTokens.interactions.tap}
                      transition={exploreExperienceTokens.transitions.hover}
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <img
                          src={creator.coverUrl}
                          alt={creator.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold" style={{ color: designTokens.colors.text.primary }}>
                            {creator.name}
                          </p>
                          {creator.topFocusTags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {creator.topFocusTags.slice(0, 2).map(tag => (
                                <span
                                  key={`${creator.creatorActorId}-${tag}`}
                                  className="rounded-full border px-1.5 py-0.5 text-[10px] uppercase"
                                  style={{
                                    borderColor: designTokens.colors.bg.tertiary,
                                    color: designTokens.colors.text.secondary,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: designTokens.colors.text.secondary }}>
                        View videos
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </motion.div>
  );
}

