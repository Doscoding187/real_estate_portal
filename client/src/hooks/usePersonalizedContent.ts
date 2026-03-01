/**
 * usePersonalizedContent Hook
 * Fetches personalized content sections for Explore home
 * Requirements: 12.1, 12.5, 12.6
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { DiscoveryItem } from './useDiscoveryFeed';

export interface PersonalizedSection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'for-you' | 'popular-near-you' | 'new-developments' | 'trending' | 'partner';
  items: DiscoveryItem[];
}

interface UsePersonalizedContentOptions {
  categoryId?: number;
  location?: { lat: number; lng: number };
}

function pickFeedItems(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const value = payload as Record<string, unknown>;
  if (Array.isArray(value.items)) return value.items as any[];
  if (Array.isArray(value.shorts)) return value.shorts as any[];
  return [];
}

export function usePersonalizedContent(options: UsePersonalizedContentOptions = {}) {
  const [sections, setSections] = useState<PersonalizedSection[]>([]);

  // Fetch "For You" personalized content
  const forYouQuery = trpc.explore.getFeed.useQuery({
    feedType: 'recommended',
    limit: 10,
    offset: 0,
  });

  const forYouData = forYouQuery.data;
  const forYouLoading = forYouQuery.isLoading;

  // Fetch "Popular Near You" location-based content
  const popularNearYouQuery = trpc.explore.getFeed.useQuery(
    {
      feedType: 'area',
      location: options.location ? `${options.location.lat},${options.location.lng}` : '',
      limit: 10,
      offset: 0,
    },
    {
      enabled: !!options.location,
    },
  );

  const popularNearYouData = popularNearYouQuery.data;
  const popularNearYouLoading = popularNearYouQuery.isLoading;

  // Fetch "New Developments" content
  const newDevelopmentsQuery = trpc.explore.getFeed.useQuery({
    feedType: 'recommended',
    limit: 10,
    offset: 0,
  });

  const newDevelopmentsData = newDevelopmentsQuery.data;
  const newDevelopmentsLoading = newDevelopmentsQuery.isLoading;

  // Fetch "Trending" content
  const trendingQuery = trpc.explore.getFeed.useQuery({
    feedType: 'recommended',
    limit: 10,
    offset: 0,
  });

  const trendingData = trendingQuery.data;
  const trendingLoading = trendingQuery.isLoading;

  // Calculate isLoading BEFORE using it in useEffect
  const isLoading =
    forYouLoading || popularNearYouLoading || newDevelopmentsLoading || trendingLoading;

  // Organize data into sections
  useEffect(() => {
    const newSections: PersonalizedSection[] = [];

    // Check if we have any real data
    const forYouItems = pickFeedItems(forYouData);
    const nearYouItems = pickFeedItems(popularNearYouData);
    const developmentItems = pickFeedItems(newDevelopmentsData);
    const trendingItems = pickFeedItems(trendingData);

    const hasRealData =
      forYouItems.length > 0 ||
      nearYouItems.length > 0 ||
      developmentItems.length > 0 ||
      trendingItems.length > 0;

    if (!hasRealData && !isLoading) {
      setSections([]);
      return;
    }

    // For You section
    if (forYouItems.length > 0) {
      newSections.push({
        id: 'for-you',
        title: 'For You',
        subtitle: 'Personalized based on your preferences',
        type: 'for-you',
        items: forYouItems.map((item: any) => ({
          id: item.id,
          type: 'property',
          data: item,
        })),
      });
    }

    // Popular Near You section
    if (nearYouItems.length > 0) {
      newSections.push({
        id: 'popular-near-you',
        title: 'Popular Near You',
        subtitle: 'Trending properties in your area',
        type: 'popular-near-you',
        items: nearYouItems.map((item: any) => ({
          id: item.id,
          type: 'property',
          data: item,
        })),
      });
    }

    // New Developments section
    if (developmentItems.length > 0) {
      const developments = developmentItems.filter((item: any) => item.developmentId);

      if (developments.length > 0) {
        newSections.push({
          id: 'new-developments',
          title: 'New Developments',
          subtitle: 'Latest property developments',
          type: 'new-developments',
          items: developments.map((item: any) => ({
            id: item.id,
            type: 'property',
            data: item,
          })),
        });
      }
    }

    // Trending section
    if (trendingItems.length > 0) {
      const sorted = [...trendingItems].sort(
        (a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0),
      );

      newSections.push({
        id: 'trending',
        title: 'Trending',
        subtitle: 'Most popular properties right now',
        type: 'trending',
        items: sorted.map((item: any) => ({
          id: item.id,
          type: 'property',
          data: item,
        })),
      });
    }

    if (newSections.length === 0) {
      setSections([]);
      return;
    }

    setSections(newSections);
  }, [
    forYouData,
    popularNearYouData,
    newDevelopmentsData,
    trendingData,
    isLoading,
  ]);

  return {
    sections,
    isLoading,
  };
}
