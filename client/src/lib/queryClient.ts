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
