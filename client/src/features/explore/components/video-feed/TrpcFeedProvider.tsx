import { useMemo } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useShortsFeed } from '@/hooks/useShortsFeed';
import type { FeedType, PropertyShort } from '@/../../shared/types';
import type { ExploreIntent } from '@/lib/exploreIntent';
import { VideoFeed } from './VideoFeed';
import type { FeedItem, VideoFeedEventHandlers } from './types';

interface TrpcFeedProviderProps {
  feedType?: FeedType;
  feedId?: number;
  category?: string;
  intent?: ExploreIntent | null;
  isAuthenticated?: boolean;
  initialIndex?: number;
  onGuestWatch?: (contentId: string, index: number) => void;
  onGateTrigger?: (reason: 'watch_limit' | 'save') => void;
}

function mapCardToVideoFeedItem(card: PropertyShort): FeedItem {
  const primaryMedia = card.media?.[0];

  return {
    id: String(card.id),
    kind: 'video',
    videoUrl: primaryMedia?.url || '',
    posterUrl: primaryMedia?.thumbnailUrl || primaryMedia?.url || '',
    caption: card.title || card.caption || 'Explore Video',
    creatorName: card.agent?.name || 'Creator',
    creatorHandle: (card.agent?.name || 'creator').toLowerCase().replace(/\s+/g, '-'),
    category: String(card.caption || '').toLowerCase(),
    actorTrust: {
      actorType: card.agent?.actorType,
      verificationStatus: card.agent?.verificationStatus,
      trustBand: card.agent?.trustBand,
      momentumLabel: card.agent?.momentumLabel,
      lowReports: card.agent?.lowReports,
    },
  };
}

export function TrpcFeedProvider({
  feedType = 'recommended',
  feedId,
  category,
  intent,
  isAuthenticated = false,
  initialIndex = 0,
  onGuestWatch,
  onGateTrigger,
}: TrpcFeedProviderProps) {
  const {
    cards,
    isLoading,
    error,
    refresh,
    recordImpression,
    recordViewStart,
    recordViewProgress,
    recordViewComplete,
    recordLike,
    recordSave,
    recordShare,
    goToIndex,
    recordNotInterested,
  } = useShortsFeed({ feedType, feedId, category, intent });

  const items = useMemo(() => cards.map(mapCardToVideoFeedItem), [cards]);

  const handlers: VideoFeedEventHandlers = useMemo(
    () => ({
      onImpression: contentId => {
        const id = Number(contentId);
        if (!Number.isFinite(id) || id <= 0) return;
        recordImpression(id);
      },
      onViewStart: contentId => {
        const id = Number(contentId);
        if (!Number.isFinite(id) || id <= 0) return;
        recordViewStart(id, undefined);
      },
      onViewProgress: (contentId, pct) => {
        const id = Number(contentId);
        if (!Number.isFinite(id) || id <= 0) return;
        recordViewProgress(id, pct, 100);
      },
      onViewComplete: contentId => {
        const id = Number(contentId);
        if (!Number.isFinite(id) || id <= 0) return;
        recordViewComplete(id, undefined);
      },
      onLike: contentId => {
        const id = Number(contentId);
        if (!Number.isFinite(id) || id <= 0) return;
        recordLike(id);
      },
      onSave: contentId => {
        if (!isAuthenticated) {
          onGateTrigger?.('save');
          return;
        }
        const id = Number(contentId);
        if (!Number.isFinite(id) || id <= 0) return;
        recordSave(id);
      },
      onShare: contentId => {
        const id = Number(contentId);
        if (!Number.isFinite(id) || id <= 0) return;
        recordShare(id);
      },
      onNotInterested: contentId => {
        const id = Number(contentId);
        if (!Number.isFinite(id) || id <= 0) return;
        recordNotInterested(id);
      },
      onCtaClick: () => undefined,
    }),
    [
      isAuthenticated,
      onGateTrigger,
      recordImpression,
      recordLike,
      recordNotInterested,
      recordSave,
      recordShare,
      recordViewComplete,
      recordViewProgress,
      recordViewStart,
    ],
  );

  if (isLoading && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading explore feed...</span>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-black px-6 text-white">
        <p className="text-center text-sm text-white/80">{error}</p>
        <button
          onClick={refresh}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-black px-6 text-center text-white/80">
        No explore videos available yet.
      </div>
    );
  }

  return (
    <VideoFeed
      items={items}
      handlers={handlers}
      initialIndex={initialIndex}
      onActiveIndexChange={index => {
        const cardIndex = Math.max(0, Math.min(cards.length - 1, index));
        goToIndex(cardIndex);
        const active = items[index];
        if (active) {
          onGuestWatch?.(active.id, index);
        }
      }}
    />
  );
}
