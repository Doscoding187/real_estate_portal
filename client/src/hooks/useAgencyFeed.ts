/**
 * Hook for managing agency feed state and interactions
 * Requirements: 2.1, 2.2
 */

import { useCallback } from 'react';

type ExploreShort = Record<string, unknown> & { id?: number | string };
type AgencyFeedMetadata = Record<string, unknown>;

export interface AgencyFeedResult {
  shorts: ExploreShort[];
  feedType: 'agency';
  hasMore: boolean;
  offset: number;
  metadata: AgencyFeedMetadata;
}

interface UseAgencyFeedOptions {
  agencyId: number;
  includeAgentContent?: boolean;
  limit?: number;
}

export function useAgencyFeed(_options: UseAgencyFeedOptions) {
  const unavailableError =
    'Agency Explore feeds are not available in the canonical discovery workflow.';
  const loadMore = useCallback(() => undefined, []);
  const setupObserver = useCallback((_element: HTMLElement | null) => undefined, []);
  const refetch = useCallback(async () => undefined, []);

  return {
    feed: null,
    shorts: [],
    metadata: undefined,
    isLoading: false,
    isLoadingMore: false,
    error: unavailableError,
    hasMore: false,
    loadMore,
    setupObserver,
    refetch,
    invalidateCache: refetch,
  };
}
