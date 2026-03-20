/**
 * usePersonalizedContent Hook
 * Fetches personalized content sections for Explore home
 * Requirements: 12.1, 12.5, 12.6
 */

import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { DiscoveryItem } from './useDiscoveryFeed';
import { getFeedItems, type FeedItem as CanonicalFeedItem } from '@/lib/exploreFeed';
import { type ExploreIntent } from '@/lib/exploreIntent';
import { getExploreMockFeedItems } from '@/data/exploreMockFeed';
import { isExploreMockMode } from '@/lib/exploreMockMode';

export interface PersonalizedSection {
  id: string;
  canonicalId?: string;
  title: string;
  subtitle?: string;
  type: 'for-you' | 'popular-near-you' | 'new-developments' | 'trending' | 'partner';
  items: DiscoveryItem[];
  videoAspect?: 'portrait' | 'square' | 'landscape';
}

interface UsePersonalizedContentOptions {
  categoryId?: number;
  location?: { lat: number; lng: number };
  intent?: ExploreIntent | null;
}

export function usePersonalizedContent(options: UsePersonalizedContentOptions = {}) {
  const [sections, setSections] = useState<PersonalizedSection[]>([]);
  const useMockData = isExploreMockMode();
  const allowPlacementMock = import.meta.env.DEV;
  const categoryKey = options.categoryId
    ? (['property', 'renovation', 'finance', 'investment', 'services'][options.categoryId - 1] ?? undefined)
    : undefined;
  const mockItems = useMemo(() => getExploreMockFeedItems(), []);

  // Fetch "For You" personalized content
  const forYouQuery = trpc.explore.getFeed.useQuery(
    {
      feedType: 'recommended',
      limit: 10,
      offset: 0,
    },
    {
      enabled: !useMockData,
    },
  );

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
      enabled: !useMockData && !!options.location,
    },
  );

  const popularNearYouData = popularNearYouQuery.data;
  const popularNearYouLoading = popularNearYouQuery.isLoading;

  // Fetch "New Developments" content
  const newDevelopmentsQuery = trpc.explore.getFeed.useQuery(
    {
      feedType: 'recommended',
      limit: 10,
      offset: 0,
    },
    {
      enabled: !useMockData,
    },
  );

  const newDevelopmentsData = newDevelopmentsQuery.data;
  const newDevelopmentsLoading = newDevelopmentsQuery.isLoading;

  // Fetch "Trending" content
  const trendingQuery = trpc.explore.getFeed.useQuery(
    {
      feedType: 'recommended',
      limit: 10,
      offset: 0,
    },
    {
      enabled: !useMockData,
    },
  );

  const trendingData = trendingQuery.data;
  const trendingLoading = trendingQuery.isLoading;

  // Calculate isLoading BEFORE using it in useEffect
  const isLoading =
    !useMockData && (forYouLoading || popularNearYouLoading || newDevelopmentsLoading || trendingLoading);

  // Organize data into sections
  useEffect(() => {
    const newSections: PersonalizedSection[] = [];
    const isVideoItem = (item: any) =>
      item?.contentType === 'short' || item?.contentType === 'walkthrough' || item?.contentType === 'showcase';
    const toVideoDiscoveryItem = (item: any): DiscoveryItem => ({
      id: item.id,
      type: 'video',
      data: item,
    });
    const toPropertyDiscoveryItem = (item: any): DiscoveryItem => {
      const city = item?.location?.city || 'Johannesburg';
      const suburb = item?.location?.suburb || city;
      const province = item?.location?.province || 'Gauteng';
      const basePrice = 900000 + (Number(item?.id || 0) % 8) * 250000;
      const bedrooms = 1 + (Number(item?.id || 0) % 5);
      const bathrooms = 1 + (Number(item?.id || 0) % 4);
      const size = 70 + (Number(item?.id || 0) % 7) * 35;
      return {
        id: Number(`${item.id}1`),
        type: 'property',
        data: {
          id: item?.linkedListingId || item.id,
          title: item?.title || 'Featured Listing',
          priceMin: basePrice,
          priceMax: basePrice + 300000,
          location: [suburb, city, province].filter(Boolean).join(', '),
          city,
          province,
          beds: bedrooms,
          baths: bathrooms,
          size,
          imageUrl: item?.thumbnailUrl || item?.mediaUrl,
          thumbnailUrl: item?.thumbnailUrl || item?.mediaUrl,
          propertyType: item?.category === 'investment' ? 'Investment' : 'Residential',
          isSaved: false,
        },
      };
    };
    const toNeighbourhoodDiscoveryItem = (item: any): DiscoveryItem => {
      const city = item?.location?.city || 'Johannesburg';
      const suburb = item?.location?.suburb || city;
      const avgPrice = 850000 + (Number(item?.id || 0) % 6) * 280000;
      return {
        id: Number(`${item.id}2`),
        type: 'neighbourhood',
        data: {
          id: Number(`${item.id}2`),
          name: suburb,
          city,
          heroBannerUrl: item?.thumbnailUrl || item?.mediaUrl,
          imageUrl: item?.thumbnailUrl || item?.mediaUrl,
          propertyCount: Math.max(25, Number(item?.stats?.views || 0) % 300),
          avgPropertyPrice: avgPrice,
          priceChange: (Number(item?.stats?.shares || 0) % 9) - 2,
          followerCount: Math.max(120, Number(item?.stats?.saves || 0) * 3),
          highlights: ['Lifestyle', 'Schools', 'Transport'],
        },
      };
    };
    const toInsightDiscoveryItem = (item: any, index: number): DiscoveryItem => {
      const category = String(item?.category || '').toLowerCase();
      const insightType =
        category === 'investment'
          ? 'market-trend'
          : category === 'finance'
            ? 'price-analysis'
            : 'investment-tip';
      const city = item?.location?.city || 'Johannesburg';
      return {
        id: Number(`${item.id}3${index}`),
        type: 'insight',
        data: {
          id: Number(`${item.id}3${index}`),
          title:
            category === 'finance'
              ? `Finance Tip: ${city}`
              : category === 'investment'
                ? `Investment Pulse: ${city}`
                : 'Market Insight',
          description:
            category === 'finance'
              ? 'Bond trends, transfer costs, and affordability explained in simple terms.'
              : 'Demand momentum and pricing pressure to help you make better decisions.',
          imageUrl: item?.thumbnailUrl || item?.mediaUrl,
          insightType,
          data: {
            value: `${Math.max(4, Number(item?.stats?.shares || 0) + 3)}%`,
            change: (Number(item?.stats?.saves || 0) % 8) - 3,
            label: `${city} weekly signal`,
          },
        },
      };
    };
    const orientationOf = (item: any) => String(item?.orientation || '').toLowerCase();
    const isLandscape = (item: any) =>
      orientationOf(item).includes('horizontal') ||
      orientationOf(item).includes('landscape') ||
      item?.contentType === 'walkthrough';
    const byCategory = (items: CanonicalFeedItem[]) =>
      categoryKey ? items.filter(item => item?.category === categoryKey) : items;
    const score = (item: any) =>
      Number(item?.stats?.views || 0) +
      Number(item?.stats?.saves || 0) * 7 +
      Number(item?.stats?.shares || 0) * 9;

    const resolveItems = (payload: unknown) =>
      byCategory(useMockData ? mockItems : getFeedItems(payload));
    const forYouItems = resolveItems(forYouData);
    const nearYouItems = resolveItems(popularNearYouData);
    const newListingItems = resolveItems(newDevelopmentsData);
    const trendingItems = resolveItems(trendingData);

    const combined = [...forYouItems, ...trendingItems, ...newListingItems].sort(
      (a: any, b: any) => score(b) - score(a),
    );
    const pickUnique = (source: any[], predicate: (item: any) => boolean, limit = 10) => {
      const picked: any[] = [];
      const seenIds = new Set<number>();
      for (const item of source) {
        if (picked.length >= limit) break;
        if (!item || seenIds.has(item.id)) continue;
        if (!predicate(item)) continue;
        seenIds.add(item.id);
        picked.push(item);
      }
      return picked;
    };
    const topUpRail = (realItems: any[], fallbackItems: any[], limit: number) => {
      const picked = pickUnique(realItems, () => true, limit);
      if (!allowPlacementMock) return picked;

      const merged = [...picked];
      const seenIds = new Set<number>(merged.map(item => Number(item?.id || 0)));
      const candidates = fallbackItems.length > 0 ? fallbackItems : mockItems;

      for (const item of candidates) {
        if (merged.length >= limit) break;
        const itemId = Number(item?.id || 0);
        if (!item || seenIds.has(itemId)) continue;
        seenIds.add(itemId);
        merged.push(item);
      }

      return merged;
    };

    const forYouReal = pickUnique(
      [...combined, ...forYouItems, ...trendingItems],
      item => isVideoItem(item) && item?.category === 'property',
      10,
    );
    const forYouFallback = pickUnique(
      mockItems,
      item => isVideoItem(item) && item?.category === 'property',
      10,
    );
    const forYouRail = topUpRail(forYouReal, forYouFallback, 10);
    newSections.push({
      id: 'for-you',
      canonicalId: 'for_you',
      title: 'For You',
      subtitle: 'Personalized picks matched to your activity and market signals',
      type: 'for-you',
      items: forYouRail.map(toVideoDiscoveryItem),
      videoAspect: 'portrait',
    });

    const homeRepairServicesReal = pickUnique(
      [...combined, ...trendingItems, ...forYouItems],
      item =>
        isVideoItem(item) && (item?.category === 'services' || item?.category === 'renovation'),
      10,
    );
    const homeRepairServicesFallback = pickUnique(
      mockItems,
      item =>
        isVideoItem(item) && (item?.category === 'services' || item?.category === 'renovation'),
      10,
    );
    const homeRepairServices = topUpRail(homeRepairServicesReal, homeRepairServicesFallback, 10);
    newSections.push({
      id: 'home-services',
      canonicalId: 'home_services',
      title: 'Home Services',
      subtitle: 'Interior Design, Renovations, Plumbing, Electrical, House Plans, Repairs',
      type: 'partner',
      items: homeRepairServices.map(toVideoDiscoveryItem),
      videoAspect: 'square',
    });

    const featuredToursReal = pickUnique(
      [...combined, ...newListingItems],
      item => isVideoItem(item) && (item?.contentType === 'walkthrough' || isLandscape(item)),
      10,
    );
    const featuredToursFallback = pickUnique(
      mockItems,
      item => isVideoItem(item) && (item?.contentType === 'walkthrough' || isLandscape(item)),
      10,
    );
    const featuredTours = topUpRail(featuredToursReal, featuredToursFallback, 10);
    newSections.push({
      id: 'featured-tours',
      canonicalId: 'featured_tours',
      title: 'Featured Tours',
      subtitle: 'Curated walkthroughs and in-depth property tours',
      type: 'new-developments',
      items: featuredTours.map(toVideoDiscoveryItem),
      videoAspect: 'landscape',
    });

    const newListingsReal = pickUnique(
      [...newListingItems, ...combined],
      item => isVideoItem(item) && item?.category === 'property',
      12,
    );
    const newListingsFallback = pickUnique(
      mockItems,
      item => isVideoItem(item) && item?.category === 'property',
      12,
    );
    const newListings = topUpRail(newListingsReal, newListingsFallback, 12);
    newSections.push({
      id: 'new-listings',
      canonicalId: 'new_listings',
      title: 'New Listings',
      subtitle: 'Fresh inventory from your preferred markets',
      type: 'new-developments',
      items: newListings.map(toPropertyDiscoveryItem),
    });

    const topContractorsReal = pickUnique(
      [...homeRepairServices, ...combined, ...trendingItems],
      item =>
        isVideoItem(item) &&
        (item?.actor?.actorType === 'contractor' ||
          item?.category === 'services' ||
          item?.category === 'renovation'),
      10,
    );
    const topContractorsFallback = pickUnique(
      mockItems,
      item =>
        isVideoItem(item) &&
        (item?.category === 'services' || item?.category === 'renovation'),
      10,
    );
    const topContractors = topUpRail(topContractorsReal, topContractorsFallback, 10);
    newSections.push({
      id: 'top-contractors-builders',
      canonicalId: 'top_contractors_builders',
      title: 'Top Contractors & Builders',
      subtitle: 'Trusted pros with strong engagement and completion signals',
      type: 'partner',
      items: topContractors.map(toVideoDiscoveryItem),
      videoAspect: 'landscape',
    });

    const financeEducationReal = pickUnique(
      [...combined, ...trendingItems],
      item =>
        isVideoItem(item) &&
        (item?.category === 'finance' || item?.category === 'investment'),
      10,
    );
    const financeEducationFallback = pickUnique(
      mockItems,
      item =>
        isVideoItem(item) &&
        (item?.category === 'finance' || item?.category === 'investment'),
      10,
    );
    const financeEducation = topUpRail(financeEducationReal, financeEducationFallback, 10);
    newSections.push({
      id: 'finance-education',
      canonicalId: 'finance_education',
      title: 'Finance & Education',
      subtitle: 'Short explainers on affordability, bonds, and planning',
      type: 'trending',
      items: financeEducation.map(toVideoDiscoveryItem),
      videoAspect: 'square',
    });

    const exploreNeighbourhoodsReal = pickUnique(
      [...nearYouItems, ...combined],
      item => isVideoItem(item),
      8,
    );
    const exploreNeighbourhoodsFallback = pickUnique(mockItems, item => isVideoItem(item), 8);
    const exploreNeighbourhoods = topUpRail(
      exploreNeighbourhoodsReal,
      exploreNeighbourhoodsFallback,
      8,
    );
    newSections.push({
      id: 'explore-neighbourhoods',
      canonicalId: 'neighbourhoods',
      title: 'Explore Neighbourhoods',
      subtitle: 'Area snapshots and momentum signals',
      type: 'popular-near-you',
      items: exploreNeighbourhoods.map(toNeighbourhoodDiscoveryItem),
    });

    const marketInsightsReal = pickUnique(
      [...financeEducation, ...combined],
      item =>
        isVideoItem(item) &&
        (item?.category === 'finance' || item?.category === 'investment'),
      8,
    );
    const marketInsightsFallback = pickUnique(
      mockItems,
      item =>
        isVideoItem(item) &&
        (item?.category === 'finance' || item?.category === 'investment'),
      8,
    );
    const marketInsights = topUpRail(marketInsightsReal, marketInsightsFallback, 8);
    newSections.push({
      id: 'market-insights',
      canonicalId: 'market_insights',
      title: 'Market Insights',
      subtitle: 'Finance and education snippets for smarter decisions',
      type: 'trending',
      items: marketInsights.map((item, index) => toInsightDiscoveryItem(item, index)),
    });

    setSections(prev => {
      const sameLength = prev.length === newSections.length;
      if (!sameLength) return newSections;

      const sameShape = prev.every((section, index) => {
        const next = newSections[index];
        if (!next) return false;
        if (
          section.id !== next.id ||
          section.canonicalId !== next.canonicalId ||
          section.title !== next.title ||
          section.subtitle !== next.subtitle ||
          section.type !== next.type ||
          section.videoAspect !== next.videoAspect ||
          section.items.length !== next.items.length
        ) {
          return false;
        }

        return section.items.every((item, itemIndex) => {
          const nextItem = next.items[itemIndex];
          if (!nextItem) return false;
          return item.id === nextItem.id && item.type === nextItem.type;
        });
      });

      return sameShape ? prev : newSections;
    });
  }, [
    categoryKey,
    forYouData,
    popularNearYouData,
    newDevelopmentsData,
    trendingData,
    mockItems,
    useMockData,
    allowPlacementMock,
  ]);

  return {
    sections,
    isLoading,
  };
}
