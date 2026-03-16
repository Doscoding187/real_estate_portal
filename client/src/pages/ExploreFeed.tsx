import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/lib/trpc';
import { Loader2, Upload, Sparkles, MapPin, Grid3x3, SlidersHorizontal } from 'lucide-react';
import VideoCard from '@/components/explore/VideoCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { useExploreCommonState } from '@/hooks/useExploreCommonState';
import { ResponsiveFilterPanel } from '@/components/explore-discovery/ResponsiveFilterPanel';
import { designTokens } from '@/lib/design-tokens';
import { pageVariants, getVariants } from '@/lib/animations/exploreAnimations';
import { getFeedItems } from '@/lib/exploreFeed';
import { useExploreIntent } from '@/hooks/useExploreIntent';
import { ExploreIntentPrompt } from '@/components/explore/ExploreIntentPrompt';
import { exploreExperienceTokens } from '@/lib/animations/exploreExperienceTokens';
import { canUploadToExploreRole } from '@/lib/exploreUploadAccess';
import {
  clearExploreIntent,
  mapFocusToLegacyIntent,
  readExploreIntent,
  type ExploreFocus,
} from '@/lib/exploreIntentSession';

const EXPLORE_FOCUS_VALUES: ExploreFocus[] = [
  'buy',
  'sell',
  'renovate',
  'services',
  'finance',
  'invest',
  'neighbourhood',
];

function isExploreFocus(value: string): value is ExploreFocus {
  return EXPLORE_FOCUS_VALUES.includes(value as ExploreFocus);
}

const INTERACTIVE_TRANSITION_STYLE = {
  transitionDuration: `${exploreExperienceTokens.durationsMs.hover}ms`,
  transitionTimingFunction: exploreExperienceTokens.easingCss.interactive,
} as const;

export default function ExploreFeed() {
  const [locationPath, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const canUploadToExplore = canUploadToExploreRole(user?.role);
  const [settledIndex, setSettledIndex] = useState(0);
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const snapSettleTimerRef = useRef<number | null>(null);
  const userPausedRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { intent, shouldShowPrompt, setIntent, dismissPrompt } = useExploreIntent();
  const sessionIntent = useMemo(() => readExploreIntent(), []);
  const locationSearch = typeof window === 'undefined' ? '' : window.location.search;
  const queryIntent = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const focus = params.get('focus');
    const subFocus = params.get('subFocus');
    const creatorActorId = params.get('creatorActorId');
    return {
      focus: focus || null,
      subFocus: subFocus || null,
      creatorActorId: creatorActorId ? Number(creatorActorId) : null,
    };
  }, [locationPath, locationSearch]);
  const effectiveFocus = queryIntent?.focus ?? sessionIntent?.focus ?? null;
  const effectiveSubFocus = queryIntent?.subFocus ?? sessionIntent?.subFocus ?? null;
  const effectiveCreatorActorId =
    queryIntent?.creatorActorId && Number.isFinite(queryIntent.creatorActorId)
      ? queryIntent.creatorActorId
      : null;
  const effectiveIntent =
    intent ??
    (effectiveFocus && isExploreFocus(effectiveFocus)
      ? mapFocusToLegacyIntent(effectiveFocus)
      : undefined) ??
    undefined;
  const showIntentBadge =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('debugIntent');

  // Use common state hook for shared logic
  const { feedType, setFeedType, showFilters, setShowFilters, toggleFilters, filterActions } =
    useExploreCommonState({
      initialViewMode: 'shorts',
      initialFeedType: 'recommended',
    });

  // Fetch explore shorts feed
  const feedQueryInput: any = {
    feedType: feedType,
    limit: 20,
    offset: 0,
    userId: user?.id,
  };
  if (feedType === 'area') {
    feedQueryInput.location = searchQuery || 'gauteng';
  }
  if (feedType === 'category') {
    feedQueryInput.category = searchQuery || 'property';
  }
  if (effectiveIntent) {
    feedQueryInput.intent = effectiveIntent;
  }
  if (effectiveFocus) {
    feedQueryInput.intentFocus = effectiveFocus;
  }
  if (effectiveSubFocus) {
    feedQueryInput.intentSubFocus = effectiveSubFocus;
  }
  if (effectiveCreatorActorId && effectiveCreatorActorId > 0) {
    feedQueryInput.creatorActorId = effectiveCreatorActorId;
  }

  const { data: feedData, isLoading } = trpc.explore.getFeed.useQuery(feedQueryInput);
  const feedMetadata = useMemo(
    () => ((feedData as any)?.metadata ? ((feedData as any).metadata as Record<string, unknown>) : null),
    [feedData],
  );

  // Mutation for recording interactions
  const recordInteractionMutation = trpc.explore.recordInteraction.useMutation();

  const videos = getFeedItems(feedData);
  const normalizedSearch = searchQuery.trim().toLowerCase();

  // Filter videos based on search query
  const filteredVideos = normalizedSearch
    ? videos.filter(
        video =>
          String(video.title ?? '')
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(video.category ?? '')
            .toLowerCase()
            .includes(normalizedSearch) ||
          `${video.location?.suburb || ''} ${video.location?.city || ''} ${video.location?.province || ''}`
            .toLowerCase()
            .includes(normalizedSearch),
      )
    : videos;
  const hasActiveFilterContext = Boolean(
    searchQuery || effectiveFocus || effectiveSubFocus || effectiveCreatorActorId,
  );

  const scheduleSnapSettle = useCallback((index: number) => {
    if (typeof window === 'undefined') {
      setSettledIndex(index);
      return;
    }
    if (snapSettleTimerRef.current !== null) {
      window.clearTimeout(snapSettleTimerRef.current);
    }
    snapSettleTimerRef.current = window.setTimeout(() => {
      setSettledIndex(index);
      snapSettleTimerRef.current = null;
    }, exploreExperienceTokens.durationsMs.tap);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight } = e.currentTarget;
    const index = Math.round(scrollTop / clientHeight);
    scheduleSnapSettle(index);
  };

  // Auto-play current video
  useEffect(() => {
    const container = feedScrollRef.current;
    if (!container) return;

    const videos = Array.from(container.querySelectorAll('video'));
    videos.forEach((video, index) => {
      if (index !== settledIndex) {
        video.pause();
        return;
      }

      if (userPausedRef.current) {
        video.pause();
        return;
      }

      if (video.paused) {
        video.play().catch(() => {});
      }
    });
  }, [settledIndex, feedType, filteredVideos.length]);

  useEffect(() => {
    userPausedRef.current = false;
  }, [settledIndex]);

  useEffect(() => {
    setSettledIndex(0);
    userPausedRef.current = false;
    const scrollContainer = feedScrollRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [feedType, filteredVideos.length]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && snapSettleTimerRef.current !== null) {
        window.clearTimeout(snapSettleTimerRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <motion.div
        className="flex h-[100dvh] items-center justify-center"
        style={{ backgroundColor: '#f8fafc' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
          <p className="text-sm text-slate-700">
            Loading amazing properties...
          </p>
        </div>
      </motion.div>
    );
  }

  if (!isLoading && filteredVideos.length === 0) {
    return (
      <motion.div
        className="flex h-[100dvh] items-center justify-center px-6 text-center"
        style={{ backgroundColor: '#f8fafc' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div>
          <h2 className="mb-3 text-2xl font-semibold text-slate-900">
            No explore items yet
          </h2>
          <p className="text-slate-600">
            Upload content or adjust filters to see results.
          </p>
          {hasActiveFilterContext && (
            <button
              type="button"
              className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900"
              onClick={() => {
                setSearchQuery('');
                setFeedType('recommended');
                clearExploreIntent();
                setLocation('/explore/feed');
              }}
            >
              Show all videos
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative h-[100dvh] overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%)',
      }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={getVariants(pageVariants)}
    >
      <ExploreIntentPrompt
        open={shouldShowPrompt}
        onSelect={nextIntent => {
          void setIntent(nextIntent);
        }}
        onDismiss={dismissPrompt}
      />

      {showIntentBadge && effectiveFocus && (
        <div className="pointer-events-none absolute left-4 top-16 z-[70] rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
          Focus: {effectiveFocus}
          {effectiveSubFocus ? ` / ${effectiveSubFocus}` : ''}
          {effectiveCreatorActorId ? ` / creator:${effectiveCreatorActorId}` : ''}
          {typeof feedMetadata?.appliedIntentMultiplier === 'number'
            ? ` x${Number(feedMetadata.appliedIntentMultiplier).toFixed(2)}`
            : ''}
        </div>
      )}

      {/* Background blur effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-200/70 via-indigo-100/35 to-transparent"></div>

      <motion.header
        className="absolute inset-x-0 top-0 z-50 border-b backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          borderColor: 'rgba(148, 163, 184, 0.28)',
        }}
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={exploreExperienceTokens.transitions.route}
      >
        <div className="mx-auto flex w-full max-w-[680px] items-center gap-2 px-3 py-3">
          <Tabs value={feedType} onValueChange={value => setFeedType(value as any)} className="min-w-0 flex-1">
            <TabsList
              className="w-full rounded-full border p-1"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                borderColor: 'rgba(148, 163, 184, 0.3)',
              }}
            >
              <TabsTrigger
                value="recommended"
                className="rounded-full px-2 text-slate-600 transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white sm:px-3"
                style={INTERACTIVE_TRANSITION_STYLE}
              >
                <Sparkles className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">For You</span>
              </TabsTrigger>
              <TabsTrigger
                value="area"
                className="rounded-full px-2 text-slate-600 transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white sm:px-3"
                style={INTERACTIVE_TRANSITION_STYLE}
              >
                <MapPin className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Area</span>
              </TabsTrigger>
              <TabsTrigger
                value="category"
                className="rounded-full px-2 text-slate-600 transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white sm:px-3"
                style={INTERACTIVE_TRANSITION_STYLE}
              >
                <Grid3x3 className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Type</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <motion.button
            onClick={toggleFilters}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border text-slate-700 sm:w-auto sm:gap-2 sm:px-3"
            style={{
              backgroundColor: showFilters ? designTokens.colors.accent.primary : 'rgba(255, 255, 255, 0.92)',
              borderColor: 'rgba(148, 163, 184, 0.3)',
              color: showFilters ? '#ffffff' : '#334155',
            }}
            whileHover={exploreExperienceTokens.interactions.ctaHover}
            whileTap={exploreExperienceTokens.interactions.tap}
            transition={exploreExperienceTokens.transitions.hover}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden text-xs font-medium sm:inline">Filters</span>
            {filterActions.getFilterCount() > 0 && (
              <span
                className="absolute -right-1 -top-1 rounded-full px-1.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: designTokens.colors.status.error }}
              >
                {filterActions.getFilterCount()}
              </span>
            )}
          </motion.button>

          {isAuthenticated && canUploadToExplore && (
            <motion.button
              onClick={() => setLocation('/explore/upload')}
              className="inline-flex h-9 items-center justify-center rounded-full border px-3 text-sm font-medium text-white"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                borderColor: 'rgba(37, 99, 235, 0.55)',
                boxShadow: '0 10px 22px rgba(37, 99, 235, 0.24)',
              }}
              whileHover={exploreExperienceTokens.interactions.ctaHover}
              whileTap={exploreExperienceTokens.interactions.tap}
              transition={exploreExperienceTokens.transitions.hover}
              aria-label="Upload content"
            >
              <Upload className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Upload</span>
            </motion.button>
          )}
        </div>
      </motion.header>

      <div className="relative z-10 mx-auto h-full w-full max-w-[680px] overflow-hidden lg:rounded-[1.8rem] lg:border lg:border-slate-200 lg:shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
        <AnimatePresence mode="wait">
          <motion.div
            ref={feedScrollRef}
            key={feedType}
            className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-auto scrollbar-hide"
            style={{
              scrollSnapType: 'y mandatory',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
            onScroll={handleScroll}
            initial={{ opacity: 0.96 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.96 }}
            transition={exploreExperienceTokens.transitions.route}
          >
            {filteredVideos?.map((item, idx: number) => {
              const kind: 'listing' | 'clip' =
                item.contentDomain === 'market' &&
                (item.contentKind === 'listing' || item.contentKind === 'development')
                  ? 'listing'
                  : 'clip';

              return (
                <div key={item.id} className="h-[100dvh] w-full snap-start snap-always">
                  <VideoCard
                    video={{
                      id: String(item.id),
                      title: item.title,
                      description: '',
                      videoUrl: item.mediaUrl,
                      thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
                      views: item.stats.views || 0,
                      likes: item.stats.saves || 0,
                      userId: item.actor.id || 0,
                      createdAt: new Date(),
                      type: kind,
                      kind,
                      contentDomain: item.contentDomain,
                      contentKind: item.contentKind,
                      creatorType: item.creatorType,
                      mediaType: item.mediaType,
                      caption: item.title,
                      category: item.category,
                      highlights: [item.category],
                      agentName: item.actor.displayName,
                      verificationStatus: item.actor.verificationStatus,
                      trustBand: item.actorInsights?.trustBand || 'standard',
                      duration: item.durationSec || 0,
                      ...(kind === 'listing'
                        ? {
                            propertyTitle: item.title,
                            propertyLocation: [item.location?.suburb, item.location?.city]
                              .filter(Boolean)
                              .join(', '),
                          }
                        : {}),
                    }}
                    isActive={idx === settledIndex}
                    autoplayManagedByParent
                    onUserPause={() => {
                      if (idx === settledIndex) {
                        userPausedRef.current = true;
                      }
                    }}
                    onUserPlay={() => {
                      if (idx === settledIndex) {
                        userPausedRef.current = false;
                      }
                    }}
                    onView={() => {
                      recordInteractionMutation.mutate({
                        contentId: item.id,
                        interactionType: 'view',
                        feedType: feedType,
                      });
                    }}
                  />
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Responsive Filter Panel */}
      <ResponsiveFilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={() => {
          setShowFilters(false);
          // Filters are already applied via Zustand store
        }}
      />
    </motion.div>
  );
}

