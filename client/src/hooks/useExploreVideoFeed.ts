/**
 * Hook for managing Explore video feed state and interactions.
 * Canonical source: trpc.explore.getFeed
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { getFeedItems } from '@/lib/exploreFeed';
import { readStoredExploreIntent } from '@/lib/exploreIntent';

export interface ExploreVideo {
  id: number;
  title: string;
  description?: string;
  thumbnailUrl: string;
  videoUrl: string;
  creatorId: number;
  tags: string[];
  lifestyleCategories: string[];
  priceMin?: number;
  priceMax?: number;
  duration: number;
  propertyId?: number;
  developmentId?: number;
  totalViews: number;
  completionRate: number;
  engagementScore: number;
  createdAt: Date;
}

interface UseExploreVideoFeedOptions {
  categoryId?: number;
  limit?: number;
}

const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

export function useExploreVideoFeed(options: UseExploreVideoFeedOptions = {}) {
  const limit = options.limit || 10;
  const intent = readStoredExploreIntent();
  const [offset, setOffset] = useState(0);
  const [videos, setVideos] = useState<ExploreVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestedOffsetsRef = useRef<Set<number>>(new Set([0]));
  const watchStartRef = useRef<number>(Date.now());

  const feedQuery = trpc.explore.getFeed.useQuery({
    feedType: 'recommended',
    limit,
    offset,
    intent: intent ?? undefined,
  });

  const recordInteraction = trpc.explore.recordInteraction.useMutation();
  const saveProperty = trpc.explore.saveProperty.useMutation();
  const shareProperty = trpc.explore.shareProperty.useMutation();

  useEffect(() => {
    if (!feedQuery.data) return;

    const mapped = getFeedItems(feedQuery.data)
      .filter(item => item.mediaUrl)
      .map(item => ({
        id: item.id,
        title: item.title,
        description: '',
        thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
        videoUrl: item.mediaUrl,
        creatorId: item.actor.id || 0,
        tags: [item.category],
        lifestyleCategories: [item.category],
        duration: item.durationSec || 0,
        propertyId: item.linkedListingId,
        developmentId: undefined,
        totalViews: item.stats.views,
        completionRate: 0,
        engagementScore: 0,
        createdAt: new Date(),
      }));

    setHasMore(Boolean(feedQuery.data.hasMore));
    setError(null);

    setVideos(prev => {
      if (offset === 0) return mapped;
      const seen = new Set(prev.map(video => video.id));
      const deduped = mapped.filter(video => !seen.has(video.id));
      return [...prev, ...deduped];
    });
  }, [feedQuery.data, offset]);

  useEffect(() => {
    if (feedQuery.error) {
      setError(feedQuery.error.message);
    }
  }, [feedQuery.error]);

  const record = useCallback(
    async (
      contentId: number,
      interactionType:
        | 'impression'
        | 'view'
        | 'viewProgress'
        | 'viewComplete'
        | 'save'
        | 'share'
        | 'listingOpen'
        | 'notInterested',
    ) => {
      const watchMs = Date.now() - watchStartRef.current;
      try {
        await recordInteraction.mutateAsync({
          contentId,
          interactionType,
          duration: Math.max(0, Math.round(watchMs / 1000)),
          feedType: 'recommended',
          deviceType: getDeviceType(),
        });
      } catch {
        // Best effort tracking.
      }
    },
    [recordInteraction],
  );

  const loadMoreIfNeeded = useCallback(() => {
    if (!hasMore || feedQuery.isFetching) return;
    if (requestedOffsetsRef.current.has(videos.length)) return;
    requestedOffsetsRef.current.add(videos.length);
    setOffset(videos.length);
  }, [hasMore, feedQuery.isFetching, videos.length]);

  const goToNext = useCallback(() => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo) return;

    if (currentIndex < videos.length - 1) {
      record(currentVideo.id, 'notInterested');
      setCurrentIndex(prev => prev + 1);
      watchStartRef.current = Date.now();

      if (currentIndex >= videos.length - 3) {
        loadMoreIfNeeded();
      }
      return;
    }

    loadMoreIfNeeded();
  }, [currentIndex, videos, record, loadMoreIfNeeded]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      watchStartRef.current = Date.now();
    }
  }, [currentIndex]);

  const onVideoComplete = useCallback(() => {
    const currentVideo = videos[currentIndex];
    if (currentVideo) {
      record(currentVideo.id, 'viewComplete');
    }
  }, [currentIndex, videos, record]);

  const onSave = useCallback(async () => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo) return;
    await record(currentVideo.id, 'save');
    try {
      await saveProperty.mutateAsync({ contentId: currentVideo.id });
    } catch {
      // Save requires auth; interaction already captured.
    }
  }, [currentIndex, videos, record, saveProperty]);

  const onShare = useCallback(async () => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo) return;
    await record(currentVideo.id, 'share');
    try {
      await shareProperty.mutateAsync({ contentId: currentVideo.id });
    } catch {
      // Share is best effort.
    }
  }, [currentIndex, videos, record, shareProperty]);

  const onViewListing = useCallback(() => {
    const currentVideo = videos[currentIndex];
    if (currentVideo) {
      record(currentVideo.id, 'listingOpen');
    }
  }, [currentIndex, videos, record]);

  useEffect(() => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo) return;
    record(currentVideo.id, 'impression');
    record(currentVideo.id, 'view');
    record(currentVideo.id, 'viewProgress');
    watchStartRef.current = Date.now();
  }, [currentIndex, videos, record]);

  const refetch = useCallback(async () => {
    requestedOffsetsRef.current.clear();
    requestedOffsetsRef.current.add(0);
    setOffset(0);
    setCurrentIndex(0);
    await feedQuery.refetch();
  }, [feedQuery]);

  return {
    videos,
    currentVideo: videos[currentIndex] || null,
    currentIndex,
    isLoading: feedQuery.isLoading || (feedQuery.isFetching && videos.length === 0),
    error,
    goToNext,
    goToPrevious,
    onVideoComplete,
    onSave,
    onShare,
    onViewListing,
    refetch,
  };
}
