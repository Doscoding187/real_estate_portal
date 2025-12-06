/**
 * Explore Analytics Dashboard Component
 * Displays creator analytics for Explore content
 * Requirements: 8.6, 11.5
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { 
  Eye, Clock, TrendingUp, Heart, Share2, MousePointerClick, 
  Video, Users, BarChart3, Calendar 
} from 'lucide-react';
import { useState } from 'react';

type Period = 'day' | 'week' | 'month' | 'all';

export function ExploreAnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('week');

  // Fetch analytics data
  const { data: analytics, isLoading } = trpc.exploreAnalytics.getMyAnalyticsDashboard.useQuery({
    period,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Explore Analytics</CardTitle>
          <CardDescription>No analytics data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Upload videos to Explore to start tracking your performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { overview, periodMetrics, topPerformingVideos, engagement } = analytics.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Explore Analytics</h2>
          <p className="text-slate-500">Track your video performance and engagement</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex gap-2">
          {(['day', 'week', 'month', 'all'] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p === 'day' && 'Today'}
              {p === 'week' && 'Week'}
              {p === 'month' && 'Month'}
              {p === 'all' && 'All Time'}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Video className="h-5 w-5" />}
          label="Total Videos"
          value={overview.totalVideos}
          color="blue"
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          label="Total Views"
          value={overview.totalViews.toLocaleString()}
          color="green"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Watch Time"
          value={formatWatchTime(overview.totalWatchTime)}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Engagement Rate"
          value={`${overview.engagementRate.toFixed(1)}%`}
          color="orange"
        />
      </div>

      {/* Period Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {period === 'day' && 'Today\'s Performance'}
            {period === 'week' && 'This Week\'s Performance'}
            {period === 'month' && 'This Month\'s Performance'}
            {period === 'all' && 'All-Time Performance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricItem
              label="Views"
              value={periodMetrics.views.toLocaleString()}
              icon={<Eye className="h-4 w-4" />}
            />
            <MetricItem
              label="Unique Viewers"
              value={periodMetrics.uniqueViewers.toLocaleString()}
              icon={<Users className="h-4 w-4" />}
            />
            <MetricItem
              label="Completion Rate"
              value={`${periodMetrics.completionRate.toFixed(1)}%`}
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <MetricItem
              label="Avg Session"
              value={formatDuration(periodMetrics.averageSessionDuration)}
              icon={<Clock className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Engagement Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Breakdown</CardTitle>
          <CardDescription>How users interact with your content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EngagementItem
              icon={<Heart className="h-5 w-5 text-red-500" />}
              label="Saves"
              value={engagement.saves.toLocaleString()}
            />
            <EngagementItem
              icon={<Share2 className="h-5 w-5 text-blue-500" />}
              label="Shares"
              value={engagement.shares.toLocaleString()}
            />
            <EngagementItem
              icon={<MousePointerClick className="h-5 w-5 text-green-500" />}
              label="Clicks"
              value={engagement.clicks.toLocaleString()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Videos */}
      {topPerformingVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Videos</CardTitle>
            <CardDescription>Your best content ranked by engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformingVideos.slice(0, 5).map((video, index) => (
                <div
                  key={video.contentId}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium text-slate-800">{video.title}</p>
                      <p className="text-sm text-slate-500">
                        {video.views.toLocaleString()} views • {video.completionRate.toFixed(1)}% completion
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">
                      Score: {video.engagementScore.toFixed(0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({ label, value, icon }: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-slate-400">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function EngagementItem({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50">
      {icon}
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

// Helper Functions
function formatWatchTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
