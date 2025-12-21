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

  // Fetch personalized feed
  const feedQuery = trpc.explore.getFeed.useQuery({
    feedType: 'recommended',
    limit: 20,
    offset: (page - 1) * 20,
  });
  
  const feedData = feedQuery.data ? { content: feedQuery.data } : null;
  const isLoading = feedQuery.isLoading;
  const error = feedQuery.error;
  const refetch = feedQuery.refetch;

  // Record engagement mutation
  const recordEngagementMutation = trpc.explore.recordInteraction.useMutation();

  // Process feed data into content blocks
  useEffect(() => {
    // Check if we have valid array data
    const contentArray = feedData?.content;
    const hasValidContent = Array.isArray(contentArray) && contentArray.length > 0;
    
    if (hasValidContent) {
      const newBlocks = organizeIntoBlocks(contentArray);
      
      if (page === 1) {
        setContentBlocks(newBlocks);
      } else {
        setContentBlocks(prev => [...prev, ...newBlocks]);
      }

      setHasMore(contentArray.length === 20);
    } else if (!isLoading && usePlaceholderData && contentBlocks.length === 0) {
      // Use placeholder data when no real data is available
      setContentBlocks(getPlaceholderContentBlocks());
      setHasMore(false);
    }
  }, [feedData, page, isLoading, usePlaceholderData]);

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
        shortId: contentId,
        interactionType: engagementType === 'click' ? 'view' : engagementType,
        feedType: 'recommended',
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
