import { QueryClient } from '@tanstack/react-query';

/**
 * Optimized React Query Client Configuration
 *
 * Performance optimizations:
 * - 5 minute staleTime: Data stays fresh for 5 minutes before refetch
 * - 10 minute cacheTime: Cached data persists for 10 minutes after last use
 * - Exponential backoff retry: Prevents overwhelming servers during failures
 * - Prefetch strategies: Proactively loads next page data
 *
 * Requirements: 6.3, 6.6
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes before being considered stale
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Cached data persists for 10 minutes after last component unmount
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

      // Don't refetch on window focus to reduce unnecessary API calls
      refetchOnWindowFocus: false,

      // Retry failed requests up to 2 times
      retry: 2,

      // Exponential backoff: 1s, 2s, 4s (capped at 30s)
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Don't refetch on mount if data is still fresh
      refetchOnMount: false,

      // Refetch on reconnect to get latest data after network issues
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,

      // Exponential backoff for mutations
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

/**
 * Prefetch Strategies for Explore Feature
 *
 * Proactively loads next page data to improve perceived performance
 */

interface ExploreFeedFilters {
  categoryId?: number | null;
  propertyType?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  location?: string | null;
  offset?: number;
  limit?: number;
}

/**
 * Prefetch next page of explore feed data
 * Call this when user is near the end of current page
 */
export function prefetchExploreFeed(filters: ExploreFeedFilters) {
  const currentOffset = filters.offset || 0;
  const limit = filters.limit || 20;
  const nextOffset = currentOffset + limit;

  return queryClient.prefetchQuery({
    queryKey: ['explore', 'feed', { ...filters, offset: nextOffset }],
    queryFn: async () => {
      // This will be handled by the actual API hook
      // The prefetch just warms up the cache
      const response = await fetch(
        '/api/explore/getFeed?' +
          new URLSearchParams({
            ...Object.fromEntries(
              Object.entries({ ...filters, offset: nextOffset }).filter(([_, v]) => v != null),
            ),
          } as any),
      );
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetch video feed data
 * Call this when user is viewing videos
 */
export function prefetchVideoFeed(filters: ExploreFeedFilters) {
  const currentOffset = filters.offset || 0;
  const limit = filters.limit || 10;
  const nextOffset = currentOffset + limit;

  return queryClient.prefetchQuery({
    queryKey: ['explore', 'videos', { ...filters, offset: nextOffset }],
    queryFn: async () => {
      const response = await fetch(
        '/api/explore/getVideoFeed?' +
          new URLSearchParams({
            ...Object.fromEntries(
              Object.entries({ ...filters, offset: nextOffset }).filter(([_, v]) => v != null),
            ),
          } as any),
      );
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetch map properties based on bounds
 * Call this when map is panned or zoomed
 */
export function prefetchMapProperties(
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  categoryId?: number,
) {
  return queryClient.prefetchQuery({
    queryKey: ['explore', 'map', bounds, categoryId],
    queryFn: async () => {
      const params = new URLSearchParams({
        north: bounds.north.toString(),
        south: bounds.south.toString(),
        east: bounds.east.toString(),
        west: bounds.west.toString(),
        ...(categoryId && { categoryId: categoryId.toString() }),
      });

      const response = await fetch('/api/explore/getMapProperties?' + params);
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetch neighbourhood details
 * Call this when user hovers over neighbourhood card
 */
export function prefetchNeighbourhoodDetail(neighbourhoodId: number) {
  return queryClient.prefetchQuery({
    queryKey: ['neighbourhood', neighbourhoodId],
    queryFn: async () => {
      const response = await fetch(`/api/explore/getNeighbourhoodDetail?id=${neighbourhoodId}`);
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // Neighbourhood data changes less frequently
  });
}

/**
 * Invalidate explore feed cache
 * Call this after user actions that should refresh the feed
 */
export function invalidateExploreFeed() {
  return queryClient.invalidateQueries({
    queryKey: ['explore', 'feed'],
  });
}

/**
 * Invalidate video feed cache
 * Call this after video interactions
 */
export function invalidateVideoFeed() {
  return queryClient.invalidateQueries({
    queryKey: ['explore', 'videos'],
  });
}

/**
 * Clear all explore-related cache
 * Call this on logout or when user wants to reset
 */
export function clearExploreCache() {
  return queryClient.removeQueries({
    queryKey: ['explore'],
  });
}
