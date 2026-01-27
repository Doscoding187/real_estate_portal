/**
 * usePersonalizedContent Hook
 * Fetches personalized content sections for Explore home
 * Requirements: 12.1, 12.5, 12.6
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { DiscoveryItem } from './useDiscoveryFeed';
import { getPlaceholderSections } from '@/data/explorePlaceholderData';

export interface PersonalizedSection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'for-you' | 'popular-near-you' | 'new-developments' | 'trending';
  items: DiscoveryItem[];
}

interface UsePersonalizedContentOptions {
  categoryId?: number;
  location?: { lat: number; lng: number };
  usePlaceholder?: boolean; // Enable placeholder data for visualization
}

export function usePersonalizedContent(options: UsePersonalizedContentOptions = {}) {
  const [sections, setSections] = useState<PersonalizedSection[]>([]);
  const [usePlaceholderData, setUsePlaceholderData] = useState(options.usePlaceholder ?? true);

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
    const hasRealData =
      (forYouData && Array.isArray(forYouData) && forYouData.length > 0) ||
      (popularNearYouData && Array.isArray(popularNearYouData) && popularNearYouData.length > 0) ||
      (newDevelopmentsData &&
        Array.isArray(newDevelopmentsData) &&
        newDevelopmentsData.length > 0) ||
      (trendingData && Array.isArray(trendingData) && trendingData.length > 0);

    // Use placeholder data if no real data and placeholder is enabled
    if (!hasRealData && usePlaceholderData && !isLoading) {
      setSections(getPlaceholderSections());
      return;
    }

    // For You section
    if (forYouData && Array.isArray(forYouData) && forYouData.length > 0) {
      newSections.push({
        id: 'for-you',
        title: 'For You',
        subtitle: 'Personalized based on your preferences',
        type: 'for-you',
        items: forYouData.map((item: any) => ({
          id: item.id,
          type: 'property',
          data: item,
        })),
      });
    }

    // Popular Near You section
    if (popularNearYouData && Array.isArray(popularNearYouData) && popularNearYouData.length > 0) {
      newSections.push({
        id: 'popular-near-you',
        title: 'Popular Near You',
        subtitle: 'Trending properties in your area',
        type: 'popular-near-you',
        items: popularNearYouData.map((item: any) => ({
          id: item.id,
          type: 'property',
          data: item,
        })),
      });
    }

    // New Developments section
    if (
      newDevelopmentsData &&
      Array.isArray(newDevelopmentsData) &&
      newDevelopmentsData.length > 0
    ) {
      const developments = newDevelopmentsData.filter((item: any) => item.developmentId);

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
    if (trendingData && Array.isArray(trendingData) && trendingData.length > 0) {
      const sorted = [...trendingData].sort(
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

    // If still no sections after processing real data, use placeholder
    if (newSections.length === 0 && usePlaceholderData) {
      setSections(getPlaceholderSections());
      return;
    }

    setSections(newSections);
  }, [
    forYouData,
    popularNearYouData,
    newDevelopmentsData,
    trendingData,
    usePlaceholderData,
    isLoading,
  ]);

  return {
    sections,
    isLoading,
  };
}
