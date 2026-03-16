/**
 * useTrendingVideos Hook
 *
 * Fetches trending videos for the Explore Home page with category filtering support.
 * Prioritizes videos by engagement (views, saves, watch time) from the last 7 days.
 *
 * Requirements: 1.3, 1.5, 4.1, 4.2
 */

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { getFeedItems, type FeedItem as CanonicalFeedItem } from '@/lib/exploreFeed';
import { type ExploreIntent, readStoredExploreIntent } from '@/lib/exploreIntent';
import type { FeedItem as SharedVideoFeedItem } from '@/features/explore/components/video-feed/types';
import { getExploreMockFeedItems } from '@/data/exploreMockFeed';
import { isExploreMockMode } from '@/lib/exploreMockMode';
import { useAuth } from '@/_core/hooks/useAuth';

export interface TrendingVideo {
  id: number;
  title: string;
  thumbnailUrl: string;
  videoUrl?: string;
  duration: number;
  views: number;
  saves?: number;
  creatorName: string;
  creatorAvatar?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  trustBand?: 'low' | 'standard' | 'high';
  categoryId?: number;
  propertyId?: number;
  actorId?: number;
  contentType?: 'short' | 'walkthrough' | 'showcase';
  orientation?: string;
  createdAt?: string;
  feedItem: SharedVideoFeedItem;
}

interface UseTrendingVideosOptions {
  categoryId?: number;
  limit?: number;
  intent?: ExploreIntent | null;
  intentFocus?: string;
  intentSubFocus?: string;
  mode?: 'auto' | 'global' | 'recommended';
  disableMock?: boolean;
}

interface UseTrendingVideosReturn {
  videos: TrendingVideo[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  isEmpty: boolean;
  debugMeta?: {
    mode: 'global' | 'recommended';
    requestedIntentFocus: string | null;
    requestedIntentSubFocus: string | null;
    resolvedLegacyIntent: string | null;
    appliedIntentMultiplier: number | null;
    requestedCreatorActorId: number | null;
  };
  sectionPurity?: {
    requestedFocus: string;
    requestedSubFocus: string | null;
    requestedCount: number;
    returnedCount: number;
    matchedCount: number;
    matchPct: number;
    shortfallReason?: string;
  };
}

function mapToSharedVideoFeedItem(item: CanonicalFeedItem): SharedVideoFeedItem {
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

export function useTrendingVideos(options: UseTrendingVideosOptions = {}): UseTrendingVideosReturn {
  const { categoryId, limit = 12 } = options;
  const intent = options.intent === undefined ? readStoredExploreIntent() : options.intent;
  const intentFocus = String(options.intentFocus ?? '')
    .trim()
    .toLowerCase();
  const intentSubFocus = String(options.intentSubFocus ?? '')
    .trim()
    .toLowerCase();
  const mode = options.mode ?? 'auto';
  const useMockData = !options.disableMock && isExploreMockMode();
  const { isAuthenticated } = useAuth();
  const shouldUseGlobalTrending =
    mode === 'global' ||
    (mode === 'auto' && !intentFocus && (!isAuthenticated || !intent));

  const globalTrendingQuery = trpc.explore.getTrendingGlobal.useQuery(
    {
      limit,
      offset: 0,
    },
    {
      enabled: !useMockData && shouldUseGlobalTrending,
    },
  );

  const personalizedTrendingQuery = trpc.explore.getFeed.useQuery(
    {
      feedType: 'recommended',
      limit,
      offset: 0,
      intent: intent ?? undefined,
      intentFocus: intentFocus || undefined,
      intentSubFocus: intentSubFocus || undefined,
    },
    {
      enabled: !useMockData && !shouldUseGlobalTrending,
    },
  );

  const resolvedItems = useMemo(() => {
    const categoryKey = categoryId
      ? (['property', 'renovation', 'finance', 'investment', 'services'][categoryId - 1] ?? undefined)
      : undefined;
    const byCategory = (items: CanonicalFeedItem[]) =>
      categoryKey ? items.filter(item => item.category === categoryKey) : items;

    const sourceItems = useMockData
      ? getExploreMockFeedItems()
      : getFeedItems(shouldUseGlobalTrending ? globalTrendingQuery.data : personalizedTrendingQuery.data);
    const filteredItems = byCategory(sourceItems).filter(item => Boolean(item.mediaUrl));

    return {
      items: filteredItems,
      usingMock: useMockData,
    };
  }, [
    categoryId,
    globalTrendingQuery.data,
    personalizedTrendingQuery.data,
    shouldUseGlobalTrending,
    useMockData,
  ]);

  // Process and filter videos
  const videos = useMemo(
    () =>
      resolvedItems.items.slice(0, limit).map(item => ({
        id: item.id,
        title: item.title || 'Property Video',
        thumbnailUrl: item.thumbnailUrl || item.mediaUrl || '',
        videoUrl: item.mediaUrl,
        duration: item.durationSec || 30,
        views: item.stats.views || 0,
        saves: item.stats.saves || 0,
        creatorName: item.actor.displayName || 'Agent',
        creatorAvatar: undefined,
        verificationStatus: item.actor.verificationStatus,
        trustBand: item.actorInsights?.trustBand || 'standard',
        propertyId: item.linkedListingId,
        actorId: item.actor.id ?? undefined,
        contentType: item.contentType,
        orientation: item.orientation,
        createdAt: undefined,
        feedItem: mapToSharedVideoFeedItem(item),
      })),
    [limit, resolvedItems.items],
  );

  // Determine if empty (no videos after filtering)
  const activeQuery = shouldUseGlobalTrending ? globalTrendingQuery : personalizedTrendingQuery;
  const isLoading = resolvedItems.usingMock ? false : activeQuery.isLoading;
  const error = resolvedItems.usingMock || !activeQuery.error ? null : new Error(activeQuery.error.message);
  const isEmpty = !isLoading && videos.length === 0;
  const sectionPurityRaw = (activeQuery.data as any)?.metadata?.sectionPurity;
  const metadata = (activeQuery.data as any)?.metadata;
  const debugMeta = {
    mode: (shouldUseGlobalTrending ? 'global' : String(metadata?.mode || 'recommended')) as
      | 'global'
      | 'recommended',
    requestedIntentFocus: metadata?.requestedIntentFocus
      ? String(metadata.requestedIntentFocus)
      : intentFocus || null,
    requestedIntentSubFocus: metadata?.requestedIntentSubFocus
      ? String(metadata.requestedIntentSubFocus)
      : intentSubFocus || null,
    resolvedLegacyIntent: metadata?.resolvedLegacyIntent ? String(metadata.resolvedLegacyIntent) : null,
    appliedIntentMultiplier:
      typeof metadata?.appliedIntentMultiplier === 'number'
        ? Number(metadata.appliedIntentMultiplier)
        : null,
    requestedCreatorActorId:
      typeof metadata?.requestedCreatorActorId === 'number'
        ? Number(metadata.requestedCreatorActorId)
        : null,
  };
  const sectionPurity =
    sectionPurityRaw && typeof sectionPurityRaw === 'object'
      ? {
          requestedFocus: String(sectionPurityRaw.requestedFocus || ''),
          requestedSubFocus: sectionPurityRaw.requestedSubFocus
            ? String(sectionPurityRaw.requestedSubFocus)
            : null,
          requestedCount: Number(sectionPurityRaw.requestedCount || 0),
          returnedCount: Number(sectionPurityRaw.returnedCount || 0),
          matchedCount: Number(sectionPurityRaw.matchedCount || 0),
          matchPct: Number(sectionPurityRaw.matchPct || 0),
          shortfallReason: sectionPurityRaw.shortfallReason
            ? String(sectionPurityRaw.shortfallReason)
            : undefined,
        }
      : undefined;

  return {
    videos,
    isLoading,
    error,
    refetch: activeQuery.refetch,
    isEmpty,
    debugMeta,
    sectionPurity,
  };
}
