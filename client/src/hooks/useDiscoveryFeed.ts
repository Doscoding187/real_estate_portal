import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { getPlaceholderContentBlocks } from '@/data/explorePlaceholderData';

export interface DiscoveryItem {
  id: number;
  type: 'property' | 'video' | 'neighbourhood' | 'insight';
  data: any;
}

export interface ContentBlock {
  id: string;
  title: string;
  type: 'for-you' | 'popular-near-you' | 'new-developments' | 'trending';
  items: DiscoveryItem[];
}

interface UseDiscoveryFeedOptions {
  categoryId?: number;
  filters?: Record<string, any>;
  usePlaceholder?: boolean; // Enable placeholder data for visualization
}

export function useDiscoveryFeed(options: UseDiscoveryFeedOptions = {}) {
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [usePlaceholderData] = useState(options.usePlaceholder ?? true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Check if we have active filters (checking keys that matter)
  const activeFilters = options.filters || {};
  const hasActiveFilters =
    Object.keys(activeFilters).length > 0 &&
    Object.values(activeFilters).some(
      v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true),
    );

  // Fetch personalized feed (Default mode)
  const feedQuery = trpc.explore.getFeed.useQuery(
    {
      feedType: 'recommended',
      limit: 20,
      offset: (page - 1) * 20,
    },
    {
      enabled: !hasActiveFilters, // Only run if NO filters
      keepPreviousData: true,
    },
  );

  // Fetch filtered search results (Search mode)
  // We map the Record<string,any> filters to the strict types required by TRPC
  const searchQuery = trpc.properties.search.useQuery(
    {
      limit: 20,
      offset: (page - 1) * 20,
      ...activeFilters, // Spread filters. NOTE: Ensure keys match PropertyFilters!
    },
    {
      enabled: hasActiveFilters,
      keepPreviousData: true,
    },
  );

  const isLoading = hasActiveFilters ? searchQuery.isLoading : feedQuery.isLoading;
  const error = hasActiveFilters ? searchQuery.error : feedQuery.error;
  const refetch = hasActiveFilters ? searchQuery.refetch : feedQuery.refetch;
  const queryData = hasActiveFilters ? searchQuery.data : feedQuery.data;

  // Record engagement mutation
  const recordEngagementMutation = trpc.explore.recordInteraction.useMutation();

  // Organize content into themed blocks
  const organizeIntoBlocks = useCallback(
    (items: any[]): ContentBlock[] => {
      const blocks: ContentBlock[] = [];

      // Group items into blocks of 6-8 items
      const blockSize = 7;
      for (let i = 0; i < items.length; i += blockSize) {
        const blockItems = items.slice(i, i + blockSize);

        // Determine block type based on content
        let blockType: ContentBlock['type'] = 'for-you';
        let blockTitle = 'For You';

        if (i === 0 && page === 1) {
          blockType = 'for-you';
          blockTitle = 'For You';
        } else if (i === blockSize && page === 1) {
          blockType = 'popular-near-you';
          blockTitle = 'Popular Near You';
        } else if (i === blockSize * 2 && page === 1) {
          blockType = 'new-developments';
          blockTitle = 'New Developments';
        } else {
          blockType = 'trending';
          blockTitle = 'Trending';
        }

        blocks.push({
          id: `block-${page}-${i}`,
          title: blockTitle,
          type: blockType,
          items: blockItems.map((item: any) => ({
            id: item.id,
            type: item.contentType,
            data: item,
          })),
        });
      }

      return blocks;
    },
    [page],
  );

  // Process feed data into content blocks
  useEffect(() => {
    if (hasActiveFilters) {
      // Search Mode: Wrap results in a single block
      if (searchQuery.data?.properties) {
        const searchBlock: ContentBlock = {
          id: 'search-results',
          title: `Found ${searchQuery.data.total} Properties`,
          type: 'for-you',
          items: searchQuery.data.properties.map((p: any) => ({
            id: Number(p.id),
            type: 'property',
            data: p,
          })),
        };

        if (page === 1) {
          setContentBlocks([searchBlock]);
        } else {
          const newBlock: ContentBlock = {
            id: `search-page-${page}`,
            title: '', // No title for subsequent pages
            type: 'for-you',
            items: searchQuery.data.properties.map((p: any) => ({
              id: Number(p.id),
              type: 'property',
              data: p,
            })),
          };
          setContentBlocks(prev => [...prev, newBlock]);
        }
        setHasMore(searchQuery.data.hasMore);
      }
    } else {
      // Feed Mode - queries return { shorts: [...], hasMore, ... }
      // We need to treat queryData as FeedResult
      const feedResult = queryData as any; // Typed as any to avoid strict interface issues for now, but implies FeedResult
      const contentArray = feedResult?.shorts || [];
      const hasValidContent = Array.isArray(contentArray) && contentArray.length > 0;

      if (hasValidContent) {
        const newBlocks = organizeIntoBlocks(contentArray);

        if (page === 1) {
          setContentBlocks(newBlocks);
        } else {
          setContentBlocks(prev => [...prev, ...newBlocks]);
        }

        // Use server's hasMore if available, otherwise fallback (though server should always provide it now)
        setHasMore(feedResult?.hasMore ?? contentArray.length === 20);
      } else if (!isLoading && usePlaceholderData && contentBlocks.length === 0) {
        // Only show placeholder if we have absolutely nothing and aren't loading
        setContentBlocks(getPlaceholderContentBlocks());
        setHasMore(false);
      }
    }
  }, [
    queryData,
    page,
    isLoading,
    usePlaceholderData,
    hasActiveFilters,
    searchQuery.data,
    organizeIntoBlocks,
  ]);

  // Load more content
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isLoading, hasMore]);

  // Record engagement
  const recordEngagement = useCallback(
    async (contentId: number, engagementType: 'view' | 'click' | 'save' | 'share') => {
      try {
        await recordEngagementMutation.mutateAsync({
          shortId: contentId,
          interactionType: engagementType === 'click' ? 'view' : engagementType,
          feedType: 'recommended',
        });
      } catch (error) {
        console.error('Failed to record engagement:', error);
      }
    },
    [recordEngagementMutation],
  );

  // Setup intersection observer for infinite scroll
  const setupObserver = useCallback(
    (element: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!element) return;

      observerRef.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasMore && !isLoading) {
            loadMore();
          }
        },
        { threshold: 0.5 },
      );

      observerRef.current.observe(element);
    },
    [hasMore, isLoading, loadMore],
  );

  return {
    contentBlocks,
    isLoading,
    error,
    hasMore,
    loadMore,
    recordEngagement,
    setupObserver,
    refetch,
  };
}
