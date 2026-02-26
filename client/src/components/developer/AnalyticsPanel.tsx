// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, MousePointerClick, Calendar, BarChart3, AlertCircle } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { trpc } from '@/lib/trpc';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiValue } from '@/components/dashboard/KpiValue';

type TimeRange = '7d' | '30d' | '90d';

const AnalyticsPanel: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const {
    data: kpis,
    isLoading,
    error,
    refetch,
  } = trpc.developer.getDashboardKPIs.useQuery({
    timeRange,
    forceRefresh: false,
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">Error loading analytics</h3>
        <p className="text-slate-500 mb-4">{error.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  const hasKpis = Boolean(kpis) && !isLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Track your development performance and marketing metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={v => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh Data">
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="p-6 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-32" />
              </Card>
            ))
        ) : (
          <>
            <MetricCard
              title="Total Leads"
              value={kpis?.totalLeads.toLocaleString() || '--'}
              change={`${kpis?.trends.totalLeads > 0 ? '+' : ''}${kpis?.trends.totalLeads ?? 0}%`}
              changeType={kpis?.trends.totalLeads >= 0 ? 'positive' : 'negative'}
              icon={Users}
            />
            <MetricCard
              title="Qualified Leads"
              value={kpis?.qualifiedLeads.toLocaleString() || '--'}
              change={`${kpis?.trends.qualifiedLeads > 0 ? '+' : ''}${kpis?.trends.qualifiedLeads ?? 0}%`}
              changeType={kpis?.trends.qualifiedLeads >= 0 ? 'positive' : 'negative'}
              icon={MousePointerClick}
            />
            <MetricCard
              title="Marketing Score"
              value={hasKpis ? `${kpis?.marketingPerformanceScore || 0}/100` : '--'}
              change={`${kpis?.trends.marketingPerformanceScore > 0 ? '+' : ''}${kpis?.trends.marketingPerformanceScore ?? 0}%`}
              changeType={kpis?.trends.marketingPerformanceScore >= 0 ? 'positive' : 'negative'}
              icon={TrendingUp}
            />
            <MetricCard
              title="Units Sold"
              value={kpis?.unitsSold.toLocaleString() || '--'}
              change={hasKpis ? `${kpis?.unitsAvailable ?? 0} Available` : 'Unavailable'}
              changeType="neutral"
              icon={BarChart3}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Traffic Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <KpiValue
            status="coming_soon"
            className="text-lg font-semibold"
            hint="Time-series traffic ingestion is not wired for this dashboard yet."
          />
          <p className="text-sm text-muted-foreground">
            Views and click-through trend charts will appear here once the traffic stream is enabled.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Performance Insights</span>
            <span className="text-sm font-normal text-muted-foreground">
              Based on {timeRange} activity
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-slate-500">Conversion Rate</h4>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {hasKpis ? `${kpis?.conversionRate ?? 0}%` : '--'}
                </span>
                {hasKpis ? (
                  <span
                    className={`text-xs mb-1 ${(kpis?.trends.conversionRate ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {(kpis?.trends.conversionRate ?? 0) > 0 ? '+' : ''}
                    {kpis?.trends.conversionRate ?? 0}%
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-400">Leads converting to sales</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm text-slate-500">Affordability Match</h4>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {hasKpis ? `${kpis?.affordabilityMatchPercent ?? 0}%` : '--'}
                </span>
                {hasKpis ? (
                  <span
                    className={`text-xs mb-1 ${(kpis?.trends.affordabilityMatchPercent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {(kpis?.trends.affordabilityMatchPercent ?? 0) > 0 ? '+' : ''}
                    {kpis?.trends.affordabilityMatchPercent ?? 0}%
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-400">Leads matching price range</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm text-slate-500">Lead Response</h4>
              <div className="flex items-end gap-2">
                <KpiValue
                  status="coming_soon"
                  className="text-2xl font-bold text-slate-900"
                  hint="Lead response time telemetry is not wired in developer analytics yet."
                />
              </div>
              <p className="text-xs text-slate-400">Average time to action a lead</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPanel;
