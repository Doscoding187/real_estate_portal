/**
 * useTrendingSuburbs Hook
 * 
 * Fetches trending suburbs data from the API
 * 
 * Requirements:
 * - 21.4-21.5: Display top 10 trending suburbs with statistics
 */

import { trpc } from '@/lib/trpc';

interface UseTrendingSuburbsOptions {
  limit?: number;
  enabled?: boolean;
}

export const useTrendingSuburbs = (options: UseTrendingSuburbsOptions = {}) => {
  const { limit = 10, enabled = true } = options;

  return trpc.locationPages.getTrendingSuburbs.useQuery(
    { limit },
    {
      enabled,
      staleTime: 1000 * 60 * 60, // 1 hour - trending data doesn't change frequently
      gcTime: 1000 * 60 * 60 * 2, // 2 hours
    }
  );
};
