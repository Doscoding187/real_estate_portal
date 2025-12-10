/**
 * Hook for managing agency analytics state
 * Requirements: 3.1, 3.4
 * 
 * Fetches and manages agency analytics data including:
 * - Total content count and views
 * - Engagement metrics
 * - Agent breakdown
 * - Top performing content
 */

import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

export interface AgentPerformance {
  agentId: number;
  agentName: string;
  contentCount: number;
  totalViews: number;
  averagePerformanceScore: number;
}

export interface TopContent {
  id: number;
  title: string;
  contentType: string;
  viewCount: number;
  performanceScore: number;
  saveCount: number;
  shareCount: number;
}

export interface AgencyMetrics {
  totalContent: number;
  totalViews: number;
  totalEngagements: number;
  averageEngagementRate: number;
  topPerformingContent: TopContent[];
  agentBreakdown: AgentPerformance[];
}

interface UseAgencyAnalyticsOptions {
  agencyId: number;
  timeRange?: '7d' | '30d' | '90d' | 'all';
}

export function useAgencyAnalytics(options: UseAgencyAnalyticsOptions) {
  const { agencyId, timeRange = '30d' } = options;

  const [metrics, setMetrics] = useState<AgencyMetrics | null>(null);

  // Fetch agency analytics using tRPC
  const analyticsQuery = trpc.exploreApi.getAgencyAnalytics.useQuery({
    agencyId,
    timeRange,
  });

  const isLoading = analyticsQuery.isLoading;
  const error = analyticsQuery.error;
  const refetch = analyticsQuery.refetch;

  // Process analytics data
  useEffect(() => {
    if (analyticsQuery.data?.success && analyticsQuery.data.data) {
      setMetrics(analyticsQuery.data.data as AgencyMetrics);
    }
  }, [analyticsQuery.data]);

  // Handle permission errors
  const permissionError = error?.data?.code === 'FORBIDDEN' ? error.message : null;

  // Invalidate cache (for data updates)
  const invalidateCache = useCallback(() => {
    analyticsQuery.refetch();
  }, [analyticsQuery]);

  return {
    metrics,
    isLoading,
    error: error?.message || null,
    permissionError,
    refetch,
    invalidateCache,
  };
}
