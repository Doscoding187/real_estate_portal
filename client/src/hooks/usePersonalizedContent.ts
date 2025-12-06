/**
 * usePersonalizedContent Hook
 * Fetches personalized content sections for Explore home
 * Requirements: 12.1, 12.5, 12.6
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DiscoveryItem } from './useDiscoveryFeed';

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
}

export function usePersonalizedContent(options: UsePersonalizedContentOptions = {}) {
  const [sections, setSections] = useState<PersonalizedSection[]>([]);

  // Fetch "For You" personalized content
  const { data: forYouData, isLoading: forYouLoading } = useQuery({
    queryKey: ['personalizedContent', 'for-you', options.categoryId],
    queryFn: async () => {
      const response = await apiClient.exploreApi.getFeed.query({
        categoryId: options.categoryId,
        limit: 10,
        offset: 0,
      });
      return response;
    },
  });

  // Fetch "Popular Near You" location-based content
  const { data: popularNearYouData, isLoading: popularNearYouLoading } = useQuery({
    queryKey: ['personalizedContent', 'popular-near-you', options.location],
    queryFn: async () => {
      if (!options.location) return null;
      
      const response = await apiClient.exploreApi.getFeed.query({
        location: options.location,
        limit: 10,
        offset: 0,
      });
      return response;
    },
    enabled: !!options.location,
  });

  // Fetch "New Developments" content
  const { data: newDevelopmentsData, isLoading: newDevelopmentsLoading } = useQuery({
    queryKey: ['personalizedContent', 'new-developments', options.categoryId],
    queryFn: async () => {
      // Filter for development content type
      const response = await apiClient.exploreApi.getFeed.query({
        categoryId: options.categoryId,
        limit: 10,
        offset: 0,
      });
      
      // Filter for developments (in production, this would be a backend filter)
      const developments = response.data?.items.filter(
        (item: any) => item.contentType === 'development' || item.developmentId
      ) || [];
      
      return { ...response, data: { ...response.data, items: developments } };
    },
  });

  // Fetch "Trending" content
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['personalizedContent', 'trending', options.categoryId],
    queryFn: async () => {
      const response = await apiClient.exploreApi.getFeed.query({
        categoryId: options.categoryId,
        limit: 10,
        offset: 0,
      });
      
      // Sort by engagement score (in production, backend would handle this)
      const sorted = [...(response.data?.items || [])].sort(
        (a: any, b: any) => (b.engagementScore || 0) - (a.engagementScore || 0)
      );
      
      return { ...response, data: { ...response.data, items: sorted } };
    },
  });

  // Organize data into sections
  useEffect(() => {
    const newSections: PersonalizedSection[] = [];

    // For You section
    if (forYouData?.data?.items && forYouData.data.items.length > 0) {
      newSections.push({
        id: 'for-you',
        title: 'For You',
        subtitle: 'Personalized based on your preferences',
        type: 'for-you',
        items: forYouData.data.items.map((item: any) => ({
          id: item.id,
          type: item.contentType,
          data: item,
        })),
      });
    }

    // Popular Near You section
    if (popularNearYouData?.data?.items && popularNearYouData.data.items.length > 0) {
      newSections.push({
        id: 'popular-near-you',
        title: 'Popular Near You',
        subtitle: 'Trending properties in your area',
        type: 'popular-near-you',
        items: popularNearYouData.data.items.map((item: any) => ({
          id: item.id,
          type: item.contentType,
          data: item,
        })),
      });
    }

    // New Developments section
    if (newDevelopmentsData?.data?.items && newDevelopmentsData.data.items.length > 0) {
      newSections.push({
        id: 'new-developments',
        title: 'New Developments',
        subtitle: 'Latest property developments',
        type: 'new-developments',
        items: newDevelopmentsData.data.items.map((item: any) => ({
          id: item.id,
          type: item.contentType,
          data: item,
        })),
      });
    }

    // Trending section
    if (trendingData?.data?.items && trendingData.data.items.length > 0) {
      newSections.push({
        id: 'trending',
        title: 'Trending',
        subtitle: 'Most popular properties right now',
        type: 'trending',
        items: trendingData.data.items.map((item: any) => ({
          id: item.id,
          type: item.contentType,
          data: item,
        })),
      });
    }

    setSections(newSections);
  }, [forYouData, popularNearYouData, newDevelopmentsData, trendingData]);

  const isLoading =
    forYouLoading || popularNearYouLoading || newDevelopmentsLoading || trendingLoading;

  return {
    sections,
    isLoading,
  };
}
