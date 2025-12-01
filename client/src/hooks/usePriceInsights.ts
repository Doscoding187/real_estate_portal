import { trpc } from '@/lib/trpc';

/**
 * Custom hook for fetching property price insights
 * 
 * Fetches aggregated price statistics for all cities with sufficient listings.
 * Data includes median prices, price distributions, average price per m², 
 * and micromarket comparisons.
 * 
 * @returns Object containing data, loading state, error, and refetch function
 */
export function usePriceInsights() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = trpc.priceInsights.getAllCityInsights.useQuery(undefined, {
    // Cache data for 15 minutes (matches backend cache TTL)
    staleTime: 15 * 60 * 1000,
    // Keep data in cache for 30 minutes
    cacheTime: 30 * 60 * 1000,
    // Retry failed requests up to 2 times
    retry: 2,
    // Don't refetch on window focus (data changes slowly)
    refetchOnWindowFocus: false,
  });

  return {
    data: data || null,
    isLoading,
    error: error ? new Error(error.message) : null,
    refetch,
  };
}
