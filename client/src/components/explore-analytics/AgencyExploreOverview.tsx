/**
 * Agency Explore Overview Component
 * Aggregate Explore analytics for agency dashboard
 * Requirements: 11.5
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Eye, Video, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

export function AgencyExploreOverview() {
  const [, setLocation] = useLocation();

  // Fetch aggregate metrics for the agency
  // Note: This would need a new endpoint for agency-level aggregation
  // For now, we'll use placeholder data
  const { data: metrics, isLoading } = trpc.exploreAnalytics.getAggregatedMetrics.useQuery({
    period: 'month',
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Explore Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Explore Performance</CardTitle>
          <CardDescription>No Explore content from your team yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Encourage your agents to upload videos to Explore to start tracking performance.
          </p>
          <Button onClick={() => setLocation('/explore/upload')}>Upload to Explore</Button>
        </CardContent>
      </Card>
    );
  }

  const data = metrics.data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Explore Performance</CardTitle>
            <CardDescription>This month's aggregate metrics</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation('/agency/explore')}>
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Eye className="h-5 w-5 text-blue-500" />}
            label="Total Views"
            value={data.totalViews.toLocaleString()}
          />
          <MetricCard
            icon={<Users className="h-5 w-5 text-green-500" />}
            label="Unique Viewers"
            value={data.totalUniqueViewers.toLocaleString()}
          />
          <MetricCard
            icon={<Video className="h-5 w-5 text-purple-500" />}
            label="Completion Rate"
            value={`${data.averageCompletionRate.toFixed(1)}%`}
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
            label="Engagement Rate"
            value={`${data.engagementRate.toFixed(1)}%`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-slate-50">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
