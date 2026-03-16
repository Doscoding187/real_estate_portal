import { useState, useCallback, useRef, useEffect } from 'react';
import { PropertyShort, FeedType } from '@/../../shared/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { getFeedItems } from '@/lib/exploreFeed';
import { type ExploreIntent } from '@/lib/exploreIntent';

interface UseShortsFeedOptions {
  feedType: FeedType;
  feedId?: number;
  category?: string;
  limit?: number;
  intent?: ExploreIntent | null;
}

interface ShortsFeedState {
  cards: PropertyShort[];
  currentIndex: number;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

export function useShortsFeed({
  feedType,
  feedId,
  category,
  limit = 20,
  intent,
}: UseShortsFeedOptions) {
  const { toast } = useToast();

  const [cards, setCards] = useState<PropertyShort[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const requestedOffsetsRef = useRef<Set<number>>(new Set([0]));
  const sessionIdRef = useRef(`shorts-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const impressionLoggedRef = useRef<Set<number>>(new Set());
  const progressMilestonesRef = useRef<Map<number, Set<number>>>(new Map());
  const completionLoggedRef = useRef<Set<number>>(new Set());

  const queryInput: any = {
    feedType,
    limit,
    offset,
  };
  if (feedType === 'agent' && feedId) queryInput.agentId = feedId;
  if (feedType === 'developer' && feedId) queryInput.developerId = feedId;
  if (feedType === 'agency' && feedId) queryInput.agencyId = feedId;
  if (feedType === 'category' && category) queryInput.category = category;
  if (feedType === 'area' && category) queryInput.location = category;
  if (intent) queryInput.intent = intent;

  const feedQuery = trpc.explore.getFeed.useQuery(queryInput, {
    placeholderData: previousData => previousData,
    refetchOnWindowFocus: false,
  });
  const recordInteractionMutation = trpc.explore.recordInteraction.useMutation();
  const recordOutcomeMutation = trpc.explore.recordOutcome.useMutation();

  const recordInteraction = useCallback(
    async (
      contentId: number,
      interactionType:
        | 'impression'
        | 'view'
        | 'viewProgress'
        | 'viewComplete'
        | 'like'
        | 'save'
        | 'share'
        | 'listingOpen'
        | 'notInterested',
      duration?: number,
      feedContext?: Record<string, unknown>,
    ) => {
      try {
        await recordInteractionMutation.mutateAsync({
          contentId,
          interactionType,
          duration,
          feedType,
          feedContext: {
            source: 'explore_shorts',
            ...(feedContext || {}),
          },
          deviceType: getDeviceType(),
        });
      } catch {
        // best effort analytics
      }
    },
    [feedType, recordInteractionMutation],
  );

  const recordOutcome = useCallback(
    async (
      contentId: number,
      outcomeType: 'contactClick' | 'leadSubmitted' | 'viewingRequest' | 'quoteRequest',
      outcomeContext?: Record<string, unknown>,
    ) => {
      try {
        await recordOutcomeMutation.mutateAsync({
          contentId,
          outcomeType,
          feedType,
          outcomeContext: {
            source: 'explore_shorts',
            ...(outcomeContext || {}),
          },
          deviceType: getDeviceType(),
        });
      } catch {
        // best effort analytics
      }
    },
    [feedType, recordOutcomeMutation],
  );

  const mapToPropertyShort = useCallback((item: any): PropertyShort => {
    const location = item.location || {};
    const bedrooms = Number(item?.metadata?.bedrooms || 0);
    const bathrooms = Number(item?.metadata?.bathrooms || 0);
    const parking = Number(item?.metadata?.parking || 0);

    return {
      id: item.id,
      listingId: item.linkedListingId,
      developmentId: undefined,
      agentId: item.actor?.actorType === 'agent' ? item.actor.id || undefined : undefined,
      developerId: item.actor?.actorType === 'developer' ? item.actor.id || undefined : undefined,
      agencyId: undefined,
      title: item.title,
      caption: item.category,
      primaryMediaId: item.id,
      mediaIds: [item.id],
      highlights: [item.category],
      performanceScore: Number(item.stats?.views || 0),
      boostPriority: 0,
      viewCount: Number(item.stats?.views || 0),
      uniqueViewCount: Number(item.stats?.views || 0),
      saveCount: Number(item.stats?.saves || 0),
      shareCount: Number(item.stats?.shares || 0),
      skipCount: 0,
      averageWatchTime: Number(item.durationSec || 0),
      viewThroughRate: 0,
      saveRate: 0,
      shareRate: 0,
      skipRate: 0,
      isPublished: true,
      isFeatured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      property: {
        price: Number(item?.metadata?.price || 0),
        location: {
          city: location.city || '',
          suburb: location.suburb || '',
          province: location.province || '',
        },
        specs: {
          bedrooms: Number.isFinite(bedrooms) ? bedrooms : undefined,
          bathrooms: Number.isFinite(bathrooms) ? bathrooms : undefined,
          parking: Number.isFinite(parking) ? parking : undefined,
        },
      },
      media: [
        {
          id: item.id,
          type: 'video',
          url: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
          orientation: item.orientation || 'vertical',
          width: Number(item.width || 720),
          height: Number(item.height || 1280),
          duration: Number(item.durationSec || 0),
        },
      ],
      highlightTags: [
        {
          id: item.id,
          tagKey: item.category,
          label: item.category,
          category: 'category',
          displayOrder: 1,
          isActive: true,
          createdAt: new Date(),
        },
      ],
      agent: {
        id: item.actor?.id || 0,
        name: item.actor?.displayName || 'Creator',
        actorType: item.actor?.actorType,
        verificationStatus: item.actor?.verificationStatus || 'unverified',
        trustBand: item.actorInsights?.trustBand || 'standard',
        momentumLabel: item.actorInsights?.momentumLabel || 'stable',
        lowReports: Boolean(item.actorInsights?.lowReports),
        trustScore: Number(item.actorInsights?.trustScore ?? 50),
        momentumScore: Number(item.actorInsights?.momentumScore ?? 50),
        abuseScore: Number(item.actorInsights?.abuseScore ?? 50),
      },
    };
  }, []);

  useEffect(() => {
    if (!feedQuery.data) {
      return;
    }

    const incoming = getFeedItems(feedQuery.data).map(mapToPropertyShort);

    setHasMore(Boolean(feedQuery.data.hasMore));
    setError(null);

    setCards(prev => {
      if (offset === 0) return incoming;
      const seen = new Set(prev.map(card => card.id));
      const deduped = incoming.filter(card => !seen.has(card.id));
      return [...prev, ...deduped];
    });
  }, [feedQuery.data, mapToPropertyShort, offset]);

  useEffect(() => {
    if (!feedQuery.error) return;
    const message = feedQuery.error.message || 'Failed to load properties. Please try again.';
    setError(message);
    toast({
      title: 'Error loading properties',
      description: message,
      variant: 'destructive',
    });
  }, [feedQuery.error, toast]);

  useEffect(() => {
    // Reset feed when source changes.
    requestedOffsetsRef.current = new Set([0]);
    impressionLoggedRef.current.clear();
    progressMilestonesRef.current.clear();
    completionLoggedRef.current.clear();
    setOffset(0);
    setCards([]);
    setCurrentIndex(0);
    setHasMore(true);
    setError(null);
  }, [feedType, feedId, category, limit, intent]);

  const goToNext = useCallback(() => {
    const current = cards[currentIndex];
    if (current?.id) {
      void recordInteraction(Number(current.id), 'notInterested', undefined, {
        trigger: 'swipe_next',
      });
    }

    setCurrentIndex(prevIndex => {
      const nextIndex = Math.min(prevIndex + 1, Math.max(cards.length - 1, 0));
      const shouldLoadMore =
        nextIndex >= cards.length - 3 && hasMore && !feedQuery.isFetching && cards.length > 0;

      if (shouldLoadMore) {
        const nextOffset = cards.length;
        if (!requestedOffsetsRef.current.has(nextOffset)) {
          requestedOffsetsRef.current.add(nextOffset);
          setOffset(nextOffset);
        }
      }

      return nextIndex;
    });
  }, [cards, currentIndex, hasMore, feedQuery.isFetching, recordInteraction]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const goToIndex = useCallback((index: number) => {
    const boundedIndex = Math.max(0, Math.min(index, cards.length - 1));
    setCurrentIndex(boundedIndex);

    const shouldLoadMore =
      boundedIndex >= cards.length - 3 && hasMore && !feedQuery.isFetching && cards.length > 0;
    if (shouldLoadMore) {
      const nextOffset = cards.length;
      if (!requestedOffsetsRef.current.has(nextOffset)) {
        requestedOffsetsRef.current.add(nextOffset);
        setOffset(nextOffset);
      }
    }
  }, [cards.length, hasMore, feedQuery.isFetching]);

  const refresh = useCallback(() => {
    requestedOffsetsRef.current = new Set([0]);
    impressionLoggedRef.current.clear();
    progressMilestonesRef.current.clear();
    completionLoggedRef.current.clear();
    setOffset(0);
    setCards([]);
    setCurrentIndex(0);
    setHasMore(true);
    setError(null);
    void feedQuery.refetch();
  }, [feedQuery]);

  const currentCard = cards[currentIndex] || null;

  const recordImpression = useCallback(
    (contentId: number) => {
      if (impressionLoggedRef.current.has(contentId)) return;
      impressionLoggedRef.current.add(contentId);
      progressMilestonesRef.current.delete(contentId);
      completionLoggedRef.current.delete(contentId);
      void recordInteraction(contentId, 'impression', undefined, {
        sessionId: sessionIdRef.current,
      });
    },
    [recordInteraction],
  );

  const recordViewStart = useCallback(
    (contentId: number, durationSec?: number) => {
      void recordInteraction(contentId, 'view', durationSec, {
        stage: 'viewStart',
        sessionId: sessionIdRef.current,
      });
    },
    [recordInteraction],
  );

  const recordViewProgress = useCallback(
    (contentId: number, currentSec: number, durationSec: number) => {
      if (!durationSec || durationSec <= 0) return;
      const percent = (currentSec / durationSec) * 100;
      const milestones = progressMilestonesRef.current.get(contentId) || new Set<number>();
      const thresholds = [25, 50, 75];

      for (const threshold of thresholds) {
        if (percent >= threshold && !milestones.has(threshold)) {
          milestones.add(threshold);
          progressMilestonesRef.current.set(contentId, milestones);
          void recordInteraction(contentId, 'viewProgress', Math.max(1, Math.round(currentSec)), {
            milestonePct: threshold,
            sessionId: sessionIdRef.current,
          });
        }
      }
    },
    [recordInteraction],
  );

  const recordViewComplete = useCallback(
    (contentId: number, durationSec?: number) => {
      if (completionLoggedRef.current.has(contentId)) return;
      completionLoggedRef.current.add(contentId);
      void recordInteraction(contentId, 'viewComplete', durationSec, {
        stage: 'complete',
        sessionId: sessionIdRef.current,
      });
    },
    [recordInteraction],
  );

  const recordSave = useCallback(
    (contentId: number) => {
      void recordInteraction(contentId, 'save', undefined, {
        sessionId: sessionIdRef.current,
      });
    },
    [recordInteraction],
  );

  const recordLike = useCallback(
    (contentId: number) => {
      void recordInteraction(contentId, 'like', undefined, {
        sessionId: sessionIdRef.current,
      });
    },
    [recordInteraction],
  );

  const recordShare = useCallback(
    (contentId: number) => {
      void recordInteraction(contentId, 'share', undefined, {
        sessionId: sessionIdRef.current,
      });
    },
    [recordInteraction],
  );

  const recordContactClick = useCallback(
    (contentId: number) => {
      void recordOutcome(contentId, 'contactClick', {
        sessionId: sessionIdRef.current,
        channel: 'in_app_contact',
      });
    },
    [recordOutcome],
  );

  const recordViewingRequest = useCallback(
    (contentId: number) => {
      void recordOutcome(contentId, 'viewingRequest', {
        sessionId: sessionIdRef.current,
        channel: 'book_viewing',
      });
    },
    [recordOutcome],
  );

  const recordWhatsAppClick = useCallback(
    (contentId: number) => {
      void recordOutcome(contentId, 'contactClick', {
        sessionId: sessionIdRef.current,
        channel: 'whatsapp',
      });
    },
    [recordOutcome],
  );

  const recordQuoteRequest = useCallback(
    (contentId: number) => {
      void recordOutcome(contentId, 'quoteRequest', {
        sessionId: sessionIdRef.current,
        channel: 'request_quote',
      });
    },
    [recordOutcome],
  );

  const recordListingOpen = useCallback(
    (contentId: number) => {
      void recordInteraction(contentId, 'listingOpen', undefined, {
        sessionId: sessionIdRef.current,
        source: 'context_sheet',
      });
    },
    [recordInteraction],
  );

  const recordModuleImpression = useCallback(
    (contentId: number, moduleId: string, moduleType: string) => {
      void recordInteraction(contentId, 'impression', undefined, {
        sessionId: sessionIdRef.current,
        source: 'module_break',
        event: 'moduleImpression',
        moduleId,
        moduleType,
      });
    },
    [recordInteraction],
  );

  const recordModuleListingOpen = useCallback(
    (contentId: number, moduleId: string, moduleType: string, listingId?: number) => {
      void recordInteraction(contentId, 'listingOpen', undefined, {
        sessionId: sessionIdRef.current,
        source: 'module',
        moduleId,
        moduleType,
        ...(listingId ? { listingId } : {}),
      });
    },
    [recordInteraction],
  );

  const recordNotInterested = useCallback(
    (contentId: number) => {
      void recordInteraction(contentId, 'notInterested', undefined, {
        sessionId: sessionIdRef.current,
        trigger: 'action_menu',
      });
    },
    [recordInteraction],
  );

  useEffect(() => {
    if (!currentCard?.id) return;
    recordImpression(Number(currentCard.id));
  }, [currentCard?.id, recordImpression]);

  const adjacentCards = {
    previous: cards[currentIndex - 1] || null,
    next: cards[currentIndex + 1] || null,
  };

  const state: ShortsFeedState = {
    cards,
    currentIndex,
    isLoading: feedQuery.isLoading || (feedQuery.isFetching && cards.length === 0),
    hasMore,
    error,
  };

  return {
    ...state,
    currentCard,
    adjacentCards,
    goToNext,
    goToPrevious,
    goToIndex,
    refresh,
    recordImpression,
    recordViewStart,
    recordViewProgress,
    recordViewComplete,
    recordLike,
    recordSave,
    recordShare,
    recordContactClick,
    recordViewingRequest,
    recordWhatsAppClick,
    recordQuoteRequest,
    recordListingOpen,
    recordModuleImpression,
    recordModuleListingOpen,
    recordNotInterested,
    isFirstCard: currentIndex === 0,
    isLastCard: currentIndex === cards.length - 1,
  };
}
