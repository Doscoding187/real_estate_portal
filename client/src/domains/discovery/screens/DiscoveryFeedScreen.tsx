import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2, MapPin, RefreshCw, RotateCcw, Settings2, Sparkles, WalletCards } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VideoCard from '@/components/explore/VideoCard';
import { DiscoveryFeedProvider, useDiscoveryFeed } from '../providers/DiscoveryFeedProvider';
import { useDiscoveryStore } from '../store/useDiscoveryStore';
import { trpc } from '@/lib/trpc';
import { designTokens } from '@/lib/design-tokens';
import { pageVariants, getVariants } from '@/lib/animations/exploreAnimations';

type DiscoveryTab = 'all' | 'property' | 'service';
type DiscoveryIntentPill = 'buy' | 'rent' | 'invest' | 'explore';

const INTENT_PILLS: Array<{ value: DiscoveryIntentPill; label: string }> = [
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
  { value: 'invest', label: 'Invest' },
  { value: 'explore', label: 'Explore' },
];

function formatCompactCount(value?: number): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(value);
}

function getCreatorInitials(name?: string): string {
  const parts = String(name || 'Discovery')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map(part => part[0]?.toUpperCase() ?? '').join('') || 'DS';
}

function getDiscoveryBadgeLabel(itemType: string, raw: Record<string, any>): string {
  const contentType = String(raw?.contentType || '').toLowerCase();
  const category = String(raw?.category || '').toLowerCase();

  if (contentType === 'walkthrough' || category === 'walkthrough') return 'Walkthrough';
  if (itemType === 'property') return 'Listing';
  if (itemType === 'development') return 'Development';
  if (itemType === 'location') return 'Neighbourhood';
  if (itemType === 'service') return 'Home service';
  if (itemType === 'insight') return 'Insight';
  return 'Discovery';
}

interface DiscoveryVideoViewportProps {
  overlay?: ReactNode;
  emptyTitle?: string;
  emptyCopy?: string;
  background?: string;
  showMetaChips?: boolean;
}

export function DiscoveryVideoViewport({
  overlay,
  emptyTitle = 'No discovery items yet',
  emptyCopy = 'Adjust your discovery mode or category and try again.',
  background = 'linear-gradient(135deg, #06121f 0%, #102c47 48%, #0f766e 100%)',
  showMetaChips = true,
}: DiscoveryVideoViewportProps) {
  const { items, isLoading, isFetching, error, hasMore, fetchNextPage, query, refetch } = useDiscoveryFeed();
  const [currentIndex, setCurrentIndex] = useState(0);
  const engageMutation = trpc.discovery.engage.useMutation();

  const videos = useMemo(
    () =>
      items.map(item => {
        const raw = (item.metadata ?? {}) as any;
        const creatorName =
          raw?.actor?.displayName || raw?.authorName || raw?.creatorName || 'Discovery';
        const itemType = item.type === 'property' || item.type === 'development' ? 'listing' : 'content';
        const badgeStat = formatCompactCount(
          Number(raw?.videoCount ?? raw?.stats?.posts ?? raw?.viewCount ?? item.engagement.views),
        );

        return {
          id: item.id,
          title: item.title || 'Discovery item',
          description: item.description || '',
          videoUrl: item.media.videoUrl || item.media.coverUrl,
          thumbnailUrl: item.media.coverUrl,
          views: item.engagement.views,
          likes: item.engagement.likes,
          shares: raw?.shareCount ?? raw?.stats?.shares ?? 0,
          userId: raw?.actor?.id || 0,
          createdAt: new Date(raw?.createdAt || Date.now()),
          type: itemType,
          propertyTitle: item.title,
          propertyLocation:
            item.location?.name ||
            [raw?.location?.suburb, raw?.location?.city].filter(Boolean).join(', '),
          propertyPrice: item.price,
          caption: item.description || raw?.category || '',
          highlights: raw?.highlights || [raw?.category].filter(Boolean),
          agentName: creatorName,
          creatorInitials: getCreatorInitials(creatorName),
          badgeLabel: getDiscoveryBadgeLabel(item.type, raw),
          badgeStat,
          isLiked: false,
        };
      }),
    [items],
  );

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    const index = Math.round(scrollTop / clientHeight);
    setCurrentIndex(index);

    if (scrollTop + clientHeight >= scrollHeight - clientHeight * 1.5 && hasMore && !isFetching) {
      fetchNextPage();
    }
  };

  useEffect(() => {
    const media = document.querySelectorAll('video');
    media.forEach((video, index) => {
      if (index === currentIndex) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [currentIndex]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: designTokens.colors.bg.dark }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: designTokens.colors.text.inverse }} />
          <p className="text-sm" style={{ color: designTokens.colors.text.inverse }}>
            Loading discovery feed...
          </p>
        </div>
      </div>
    );
  }

  if (error && videos.length === 0) {
    return (
      <div
        className="flex h-screen items-center justify-center px-6 text-center"
        style={{ backgroundColor: designTokens.colors.bg.dark }}
      >
        <div className="max-w-md">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <RotateCcw className="h-7 w-7" style={{ color: designTokens.colors.text.inverse }} />
          </div>
          <h2 className="mb-3 text-2xl font-semibold" style={{ color: designTokens.colors.text.inverse }}>
            Discovery feed is temporarily unavailable
          </h2>
          <p className="mb-6 text-sm leading-6" style={{ color: 'rgba(255,255,255,0.8)' }}>
            We could not load this discovery lane right now. Retry the request or adjust your mode and try again.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center px-6 text-center" style={{ backgroundColor: designTokens.colors.bg.dark }}>
        <div>
          <h2 className="mb-3 text-2xl font-semibold" style={{ color: designTokens.colors.text.inverse }}>
            {emptyTitle}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>
            {emptyCopy}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="relative h-screen overflow-hidden"
      style={{ background }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={getVariants(pageVariants)}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_38%)]" />
      {overlay}

      {showMetaChips ? (
        <div className="absolute left-4 right-4 top-4 z-30 flex items-center justify-between gap-3">
          <div className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs font-medium text-white backdrop-blur-xl">
            Discovery mode: {query.mode}
            {query.category ? ` / ${query.category}` : ''}
          </div>
          <div className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs text-white/80 backdrop-blur-xl">
            {videos.length} items
          </div>
        </div>
      ) : null}

      <div
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{
          scrollSnapType: 'y mandatory',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleScroll}
      >
        {videos.map((video, idx) => (
          <div
            key={video.id}
            className="flex h-screen w-full snap-start snap-always items-center justify-center px-3 py-3 md:px-5 md:py-6"
          >
            <VideoCard
              video={video}
              isActive={idx === currentIndex}
              discoveryMode={query.mode}
              onView={() => {
                void engageMutation.mutateAsync({
                  itemId: video.id,
                  action: 'view',
                  context: {
                    mode: query.mode,
                    position: idx,
                    query,
                  },
                });
              }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function DiscoveryFeedScreen() {
  const query = useDiscoveryStore(state => state.query);
  const setQuery = useDiscoveryStore(state => state.setQuery);
  const resetFilters = useDiscoveryStore(state => state.resetFilters);
  const getActiveFilterCount = useDiscoveryStore(state => state.getActiveFilterCount);
  const [tab, setTab] = useState<DiscoveryTab>(
    query.category === 'service' ? 'service' : query.category === 'property' ? 'property' : 'all',
  );
  const activeFilterCount = getActiveFilterCount();

  useEffect(() => {
    setTab(
      query.category === 'service'
        ? 'service'
        : query.category === 'property'
          ? 'property'
          : 'all',
    );
  }, [query.category]);

  useEffect(() => {
    setQuery({
      mode: 'feed',
      category: tab === 'all' ? undefined : tab,
      contentType: 'video',
    });
  }, [setQuery, tab]);

  const setPriceMin = (value: string) => {
    const min = value ? Number(value) : undefined;
    setQuery({
      priceRange: {
        ...query.priceRange,
        min: Number.isFinite(min as number) ? min : undefined,
      },
    });
  };

  const setPriceMax = (value: string) => {
    const max = value ? Number(value) : undefined;
    setQuery({
      priceRange: {
        ...query.priceRange,
        max: Number.isFinite(max as number) ? max : undefined,
      },
    });
  };

  return (
    <DiscoveryFeedProvider mode="feed">
      <DiscoveryVideoViewport
        overlay={
          <div className="absolute left-4 right-4 top-4 z-30 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs font-medium text-white backdrop-blur-xl">
                Discovery feed
                {activeFilterCount > 0 ? ` / ${activeFilterCount} active filters` : ''}
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs font-medium text-white backdrop-blur-xl transition hover:bg-black/45"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <Tabs value={tab} onValueChange={value => setTab(value as DiscoveryTab)} className="w-full max-w-md">
              <TabsList className="w-full rounded-full border border-white/15 bg-black/35 p-1 backdrop-blur-xl">
                <TabsTrigger value="all" className="flex items-center gap-2 rounded-full text-white data-[state=active]:bg-white/20">
                  <Sparkles className="h-4 w-4" />
                  All
                </TabsTrigger>
                <TabsTrigger value="property" className="flex items-center gap-2 rounded-full text-white data-[state=active]:bg-white/20">
                  <MapPin className="h-4 w-4" />
                  Property
                </TabsTrigger>
                <TabsTrigger value="service" className="flex items-center gap-2 rounded-full text-white data-[state=active]:bg-white/20">
                  <Settings2 className="h-4 w-4" />
                  Service
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="rounded-3xl border border-white/15 bg-black/30 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/90">
                <WalletCards className="h-4 w-4" />
                Discovery filters
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {INTENT_PILLS.map(intent => (
                  <button
                    key={intent.value}
                    type="button"
                    onClick={() =>
                      setQuery({
                        intent: query.intent === intent.value ? undefined : intent.value,
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-sm transition ${
                      query.intent === intent.value
                        ? 'bg-white text-slate-900'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {intent.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-white/70">Min price</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={query.priceRange?.min ?? ''}
                    onChange={event => setPriceMin(event.target.value)}
                    placeholder="Any"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/35"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-white/70">Max price</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={query.priceRange?.max ?? ''}
                    onChange={event => setPriceMax(event.target.value)}
                    placeholder="Any"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/35"
                  />
                </label>
              </div>
            </div>
          </div>
        }
      />
    </DiscoveryFeedProvider>
  );
}
