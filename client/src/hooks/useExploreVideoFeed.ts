/**
 * Hook for managing Explore video feed state and interactions
 * Requirements: 1.1, 1.2, 2.3, 2.4
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';

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

export function useExploreVideoFeed(options: UseExploreVideoFeedOptions = {}) {
  const [videos, setVideos] = useState<ExploreVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<number[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const watchTimeRef = useRef<number>(0);
  const watchStartRef = useRef<number>(0);

  // Create session on mount
  const createSessionMutation = trpc.recommendationEngine.createSession.useMutation();
  const closeSessionMutation = trpc.recommendationEngine.closeSession.useMutation();
  const recordEngagementMutation = trpc.recommendationEngine.recordEngagement.useMutation();

  // Fetch video feed
  const { data: videoData, isLoading: isFetching, refetch } = trpc.exploreApi.getVideoFeed.useQuery({
    sessionHistory,
    categoryId: options.categoryId,
    limit: options.limit || 10,
    offset: 0,
  });

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const result = await createSessionMutation.mutateAsync({
          deviceType: 'desktop', // TODO: Detect actual device type
        });
        setSessionId(result.data.sessionId);
      } catch (err) {
        console.error('Failed to create session:', err);
      }
    };

    initSession();

    // Cleanup: close session on unmount
    return () => {
      if (sessionId) {
        closeSessionMutation.mutate({ sessionId });
      }
    };
  }, []);

  // Load videos
  useEffect(() => {
    if (videoData?.success && videoData.data.videos) {
      setVideos(videoData.data.videos as any);
      setIsLoading(false);
      setError(null);
    } else if (!isFetching && !videoData) {
      setError('Failed to load videos');
      setIsLoading(false);
    }
  }, [videoData, isFetching]);

  // Start watch time tracking
  const startWatchTime = useCallback(() => {
    watchStartRef.current = Date.now();
  }, []);

  // Record engagement
  const recordEngagement = useCallback(
    async (
      contentId: number,
      engagementType: 'view' | 'save' | 'share' | 'click' | 'skip' | 'complete',
      completed: boolean = false,
    ) => {
      const watchTime = watchStartRef.current
        ? Math.floor((Date.now() - watchStartRef.current) / 1000)
        : 0;

      try {
        await recordEngagementMutation.mutateAsync({
          contentId,
          engagementType,
          watchTime,
          completed,
          sessionId: sessionId || undefined,
        });
      } catch (err) {
        console.error('Failed to record engagement:', err);
      }
    },
    [sessionId, recordEngagementMutation],
  );

  // Navigate to next video
  const goToNext = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      const currentVideo = videos[currentIndex];
      
      // Record skip if video wasn't completed
      if (currentVideo) {
        recordEngagement(currentVideo.id, 'skip', false);
      }

      setCurrentIndex((prev) => prev + 1);
      setSessionHistory((prev) => [...prev, currentVideo.id]);
      startWatchTime();

      // Preload more videos if near the end
      if (currentIndex >= videos.length - 3) {
        refetch();
      }
    }
  }, [currentIndex, videos, recordEngagement, refetch, startWatchTime]);

  // Navigate to previous video
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      startWatchTime();
    }
  }, [currentIndex, startWatchTime]);

  // Handle video completion
  const onVideoComplete = useCallback(() => {
    const currentVideo = videos[currentIndex];
    if (currentVideo) {
      recordEngagement(currentVideo.id, 'complete', true);
    }
  }, [currentIndex, videos, recordEngagement]);

  // Handle save action
  const onSave = useCallback(async () => {
    const currentVideo = videos[currentIndex];
    if (currentVideo) {
      recordEngagement(currentVideo.id, 'save', false);
      // TODO: Call save API
    }
  }, [currentIndex, videos, recordEngagement]);

  // Handle share action
  const onShare = useCallback(async () => {
    const currentVideo = videos[currentIndex];
    if (currentVideo) {
      recordEngagement(currentVideo.id, 'share', false);
      // TODO: Implement share functionality
    }
  }, [currentIndex, videos, recordEngagement]);

  // Handle view listing action
  const onViewListing = useCallback(() => {
    const currentVideo = videos[currentIndex];
    if (currentVideo) {
      recordEngagement(currentVideo.id, 'click', false);
      // TODO: Navigate to listing page
    }
  }, [currentIndex, videos, recordEngagement]);

  // Start watch time on mount and index change
  useEffect(() => {
    startWatchTime();
  }, [currentIndex, startWatchTime]);

  return {
    videos,
    currentVideo: videos[currentIndex] || null,
    currentIndex,
    isLoading,
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
