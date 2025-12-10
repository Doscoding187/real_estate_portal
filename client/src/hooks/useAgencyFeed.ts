/**
 * Hook for managing agency feed state and interactions
 * Requirements: 2.1, 2.2
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { ExploreShort, AgencyFeedMetadata } from '@/shared/types';

export interface AgencyFeedResult {
  shorts: ExploreShort[];
  feedType: 'agency';
  hasMore: boolean;
  offset: number;
  metadata: AgencyFeedMetadata;
}

interface UseAgencyFeedOptions {
  agencyId: number;
  includeAgentContent?: boolean;
  limit?: number;
}

export function useAgencyFeed(options: UseAgencyFeedOptions) {
  const { agencyId, includeAgentContent = true, limit = 20 } = options;

  const [feed, setFeed] = useState<AgencyFeedResult | null>(null);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch agency feed using tRPC
  const feedQuery = trpc.exploreApi.getAgencyFeed.useQuery({
    agencyId,
    includeAgentContent,
    limit,
    offset: (page - 1) * limit,
  });

  const isLoading = feedQuery.isLoading && page === 1;
  const error = feedQuery.error;
  const refetch = feedQuery.refetch;

  // Process feed data
  useEffect(() => {
    if (feedQuery.data?.success && feedQuery.data.data) {
      const newFeed = feedQuery.data.data as AgencyFeedResult;

      if (page === 1) {
        // First page - replace feed
        setFeed(newFeed);
      } else {
        // Subsequent pages - append to existing feed
        setFeed((prev) => {
          if (!prev) return newFeed;
          return {
            ...newFeed,
            shorts: [...prev.shorts, ...newFeed.shorts],
            offset: newFeed.offset,
          };
        });
      }

      setIsLoadingMore(false);
    }
  }, [feedQuery.data, page]);

  // Load more content (infinite scroll)
  const loadMore = useCallback(() => {
    if (!isLoadingMore && feed?.hasMore && !feedQuery.isLoading) {
      setIsLoadingMore(true);
      setPage((prev) => prev + 1);
    }
  }, [isLoadingMore, feed?.hasMore, feedQuery.isLoading]);

  // Setup intersection observer for infinite scroll
  const setupObserver = useCallback(
    (element: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!element) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && feed?.hasMore && !isLoadingMore) {
            loadMore();
          }
        },
        { threshold: 0.5 }
      );

      observerRef.current.observe(element);
    },
    [feed?.hasMore, isLoadingMore, loadMore]
  );

  // Invalidate cache (for content updates)
  const invalidateCache = useCallback(() => {
    feedQuery.refetch();
    setPage(1);
  }, [feedQuery]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    feed,
    shorts: feed?.shorts || [],
    metadata: feed?.metadata,
    isLoading,
    isLoadingMore,
    error: error?.message || null,
    hasMore: feed?.hasMore || false,
    loadMore,
    setupObserver,
    refetch,
    invalidateCache,
  };
}
