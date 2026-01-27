/**
 * Agency Analytics Dashboard Component
 * Displays comprehensive analytics for an agency's Explore content
 * Requirements: 3.1, 3.3
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useAgencyAnalytics } from '@/hooks/useAgencyAnalytics';
import { AgencyMetricsCards } from './AgencyMetricsCards';
import { AgentBreakdownTable } from './AgentBreakdownTable';
import { TopContentList } from './TopContentList';

interface AgencyAnalyticsDashboardProps {
  agencyId: number;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export function AgencyAnalyticsDashboard({ agencyId }: AgencyAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Fetch agency analytics using the hook
  const { metrics, isLoading, error, permissionError } = useAgencyAnalytics({
    agencyId,
    timeRange,
  });

  // Handle permission errors
  if (permissionError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to view this agency's analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{permissionError}</p>
        </CardContent>
      </Card>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Analytics</CardTitle>
          <CardDescription>Unable to load agency analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Handle no data state
  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agency Analytics</CardTitle>
          <CardDescription>No analytics data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Upload content to Explore to start tracking your agency's performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Agency Analytics</h2>
          <p className="text-slate-500">Track your agency's Explore performance</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <div className="flex gap-2">
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(range => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === '7d' && '7 Days'}
                {range === '30d' && '30 Days'}
                {range === '90d' && '90 Days'}
                {range === 'all' && 'All Time'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <AgencyMetricsCards
        totalContent={metrics.totalContent}
        totalViews={metrics.totalViews}
        totalEngagements={metrics.totalEngagements}
        averageEngagementRate={metrics.averageEngagementRate}
      />

      {/* Agent Breakdown Table */}
      <AgentBreakdownTable agents={metrics.agentBreakdown} />

      {/* Top Performing Content */}
      <TopContentList content={metrics.topPerformingContent} />
    </div>
  );
}
