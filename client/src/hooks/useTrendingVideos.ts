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
import { getFeedItems } from '@/lib/exploreFeed';
import { isExploreMockMode } from '@/lib/exploreMockMode';

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
  categoryId?: number;
  propertyId?: number;
  createdAt?: string;
}

interface UseTrendingVideosOptions {
  categoryId?: number;
  limit?: number;
}

interface UseTrendingVideosReturn {
  videos: TrendingVideo[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  isEmpty: boolean;
}

// Placeholder trending videos for development/fallback
const placeholderTrendingVideos: TrendingVideo[] = [
  {
    id: 1,
    title: 'Luxury Penthouse Tour in Sandton',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=711&fit=crop',
    duration: 45,
    views: 12500,
    saves: 340,
    creatorName: 'Luxury Estates SA',
    creatorAvatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
  },
  {
    id: 2,
    title: 'Modern Family Home in Bryanston',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=711&fit=crop',
    duration: 38,
    views: 8900,
    saves: 210,
    creatorName: 'Home Finders',
    creatorAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    id: 3,
    title: 'Secure Estate Living in Fourways',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=711&fit=crop',
    duration: 52,
    views: 15200,
    saves: 420,
    creatorName: 'Estate Living SA',
    creatorAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
  },
  {
    id: 4,
    title: 'Waterfront Apartment in V&A',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&h=711&fit=crop',
    duration: 41,
    views: 9800,
    saves: 280,
    creatorName: 'Cape Properties',
    creatorAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  },
  {
    id: 5,
    title: 'New Development Launch: The Apex',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=400&h=711&fit=crop',
    duration: 58,
    views: 22000,
    saves: 650,
    creatorName: 'Apex Developers',
    creatorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop',
  },
  {
    id: 6,
    title: 'Student Accommodation Tour',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400&h=711&fit=crop',
    duration: 35,
    views: 6500,
    saves: 180,
    creatorName: 'Student Living SA',
    creatorAvatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
  {
    id: 7,
    title: 'Golf Estate Dream Home',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=400&h=711&fit=crop',
    duration: 48,
    views: 11200,
    saves: 390,
    creatorName: 'Golf Estates',
    creatorAvatar:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop',
  },
  {
    id: 8,
    title: 'Pet-Friendly Garden Cottage',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400&h=711&fit=crop',
    duration: 32,
    views: 7800,
    saves: 220,
    creatorName: 'Pet Homes SA',
    creatorAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
  },
];

export function useTrendingVideos(options: UseTrendingVideosOptions = {}): UseTrendingVideosReturn {
  const { categoryId, limit = 12 } = options;
  const useMockData = isExploreMockMode();
  const discoveryCategoryMap = [
    undefined,
    'property',
    'service',
    'insight',
    'insight',
    'service',
  ] as const;
  const category = categoryId !== undefined ? discoveryCategoryMap[categoryId] : undefined;

  // Fetch trending videos from API
  const feedQuery = trpc.discovery.getFeed.useQuery({
    mode: 'home',
    contentType: 'video',
    category,
    limit,
  }, {
    enabled: !useMockData,
  });

  // Process and filter videos
  const videos = useMemo(() => {
    if (useMockData) {
      let placeholders = [...placeholderTrendingVideos];

      if (categoryId) {
        placeholders = placeholders.slice(0, Math.max(3, Math.floor(placeholders.length / 2)));
      }

      return placeholders.slice(0, limit);
    }

    const videoItems = getFeedItems(feedQuery.data);

    if (videoItems.length > 0) {
      return videoItems.slice(0, limit).map((item: any) => ({
        id: item.id,
        title: item.title || 'Property Video',
        thumbnailUrl: item.thumbnailUrl || item.imageUrl || '',
        videoUrl: item.mediaUrl,
        duration: item.durationSec || item.duration || 30,
        views: item.views || item.viewCount || item.stats?.views || 0,
        saves: item.saves || item.saveCount || item.stats?.saves || 0,
        creatorName: item.creatorName || item.actor?.displayName || 'Agent',
        creatorAvatar: item.creatorAvatar || item.actor?.avatarUrl,
        categoryId: categoryId,
        propertyId: item.propertyId,
        createdAt: item.createdAt,
      }));
    }

    return [];
  }, [feedQuery.data, categoryId, limit, useMockData]);

  // Determine if empty (no videos after filtering)
  const isEmpty = !feedQuery.isLoading && !feedQuery.error && videos.length === 0;

  return {
    videos,
    isLoading: feedQuery.isLoading,
    error: feedQuery.error ? new Error(feedQuery.error.message) : null,
    refetch: feedQuery.refetch,
    isEmpty,
  };
}
