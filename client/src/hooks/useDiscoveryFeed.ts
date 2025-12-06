import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

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
}

export function useDiscoveryFeed(options: UseDiscoveryFeedOptions = {}) {
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch personalized feed
  const { data: feedData, isLoading, error, refetch } = useQuery({
    queryKey: ['discoveryFeed', options.categoryId, options.filters, page],
    queryFn: async () => {
      const response = await apiClient.exploreApi.getFeed.query({
        categoryId: options.categoryId,
        filters: options.filters,
        limit: 20,
        offset: (page - 1) * 20,
      });
      return response;
    },
  });

  // Record engagement mutation
  const recordEngagementMutation = useMutation({
    mutationFn: async (params: {
      contentId: number;
      engagementType: 'view' | 'click' | 'save' | 'share';
    }) => {
      return apiClient.recommendationEngine.recordEngagement.mutate({
        contentId: params.contentId,
        engagementType: params.engagementType,
        watchTime: 0,
        completed: false,
      });
    },
  });

  // Process feed data into content blocks
  useEffect(() => {
    if (feedData?.content) {
      const newBlocks = organizeIntoBlocks(feedData.content);
      
      if (page === 1) {
        setContentBlocks(newBlocks);
      } else {
        setContentBlocks(prev => [...prev, ...newBlocks]);
      }

      setHasMore(feedData.content.length === 20);
    }
  }, [feedData, page]);

  // Organize content into themed blocks
  const organizeIntoBlocks = (items: any[]): ContentBlock[] => {
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
  };

  // Load more content
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isLoading, hasMore]);

  // Record engagement
  const recordEngagement = useCallback(async (
    contentId: number,
    engagementType: 'view' | 'click' | 'save' | 'share'
  ) => {
    try {
      await recordEngagementMutation.mutateAsync({
        contentId,
        engagementType,
      });
    } catch (error) {
      console.error('Failed to record engagement:', error);
    }
  }, [recordEngagementMutation]);

  // Setup intersection observer for infinite scroll
  const setupObserver = useCallback((element: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    observerRef.current.observe(element);
  }, [hasMore, isLoading, loadMore]);

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
