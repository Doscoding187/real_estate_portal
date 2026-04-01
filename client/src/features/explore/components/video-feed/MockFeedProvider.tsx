import { useMemo } from 'react';
import type { FeedType } from '@/../../shared/types';
import { getExploreMockFeedItems } from '@/data/exploreMockFeed';
import type { ExploreIntent } from '@/lib/exploreIntent';
import { VideoFeed } from './VideoFeed';
import type { FeedItem, VideoFeedEventHandlers } from './types';

interface MockFeedProviderProps {
  feedType?: FeedType;
  category?: string;
  intent?: ExploreIntent | null;
  isAuthenticated?: boolean;
  initialIndex?: number;
  onGuestWatch?: (contentId: string, index: number) => void;
  onGateTrigger?: (reason: 'watch_limit' | 'save') => void;
}

const CATEGORY_BY_INTENT: Record<ExploreIntent, Set<string>> = {
  buy: new Set(['property', 'investment']),
  sell: new Set(['property']),
  improve: new Set(['services', 'renovation']),
  invest: new Set(['investment', 'finance']),
  learn: new Set(['finance', 'investment']),
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function matchesLocation(
  item: ReturnType<typeof getExploreMockFeedItems>[number],
  raw: string,
): boolean {
  const query = normalizeText(raw);
  if (!query) return true;
  const haystack = [item.location?.suburb, item.location?.city, item.location?.province]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function mapMockItemToFeedItem(item: ReturnType<typeof getExploreMockFeedItems>[number]): FeedItem {
  return {
    id: String(item.id),
    kind: 'video',
    videoUrl: item.mediaUrl,
    posterUrl: item.thumbnailUrl || item.mediaUrl,
    caption: item.title || item.category || 'Explore Video',
    creatorName: item.actor.displayName || 'Creator',
    creatorHandle: (item.actor.displayName || 'creator').toLowerCase().replace(/\s+/g, '-'),
    category: String(item.category || '').toLowerCase(),
    actorTrust: {
      actorType: item.actor.actorType,
      verificationStatus: item.actor.verificationStatus,
      trustBand: item.actorInsights?.trustBand || 'standard',
      momentumLabel: item.actorInsights?.momentumLabel || 'stable',
      lowReports: Boolean(item.actorInsights?.lowReports),
    },
  };
}

export function MockFeedProvider({
  feedType = 'recommended',
  category,
  intent,
  isAuthenticated = false,
  initialIndex = 0,
  onGuestWatch,
  onGateTrigger,
}: MockFeedProviderProps) {
  const items = useMemo(() => {
    const sourceItems = getExploreMockFeedItems();
    const normalizedCategory = normalizeText(category || '');
    const intentCategories = intent ? CATEGORY_BY_INTENT[intent] : null;

    const filtered = sourceItems.filter(item => {
      if (intentCategories && !intentCategories.has(item.category)) {
        return false;
      }

      if (feedType === 'category' && normalizedCategory) {
        return item.category === normalizedCategory;
      }

      if (feedType === 'area' && category) {
        return matchesLocation(item, category);
      }

      return true;
    });

    const fallback = filtered.length > 0 ? filtered : sourceItems;
    return fallback.map(mapMockItemToFeedItem);
  }, [category, feedType, intent]);

  const handlers: VideoFeedEventHandlers = useMemo(
    () => ({
      onImpression: () => undefined,
      onViewStart: () => undefined,
      onViewProgress: () => undefined,
      onViewComplete: () => undefined,
      onLike: () => undefined,
      onSave: () => {
        if (!isAuthenticated) {
          onGateTrigger?.('save');
        }
      },
      onShare: () => undefined,
      onNotInterested: () => undefined,
      onCtaClick: () => undefined,
    }),
    [isAuthenticated, onGateTrigger],
  );

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-black px-6 text-center text-white/80">
        Mock explore feed is empty.
      </div>
    );
  }

  return (
    <VideoFeed
      items={items}
      handlers={handlers}
      initialIndex={initialIndex}
      onActiveIndexChange={index => {
        const active = items[index];
        if (active) {
          onGuestWatch?.(active.id, index);
        }
      }}
    />
  );
}
