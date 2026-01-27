import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  Calendar,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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

// Mock chart data (until time-series API is ready)
const trafficData = [
  { month: 'Jan', views: 2400, clicks: 1200 },
  { month: 'Feb', views: 3200, clicks: 1600 },
  { month: 'Mar', views: 2800, clicks: 1400 },
  { month: 'Apr', views: 3900, clicks: 2100 },
  { month: 'May', views: 4200, clicks: 2400 },
  { month: 'Jun', views: 5100, clicks: 2900 },
];

const sourceData = [
  { name: 'Direct', value: 35, color: '#3b82f6' }, // blue-500
  { name: 'Search', value: 30, color: '#10b981' }, // emerald-500
  { name: 'Social', value: 20, color: '#f59e0b' }, // amber-500
  { name: 'Referral', value: 15, color: '#ef4444' }, // red-500
];

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
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

      {/* Overview Metrics */}
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
              value={kpis?.totalLeads.toLocaleString() || '0'}
              change={`${kpis?.trends.totalLeads > 0 ? '+' : ''}${kpis?.trends.totalLeads}%`}
              changeType={kpis?.trends.totalLeads >= 0 ? 'positive' : 'negative'}
              icon={Users}
            />
            <MetricCard
              title="Qualified Leads"
              value={kpis?.qualifiedLeads.toLocaleString() || '0'}
              change={`${kpis?.trends.qualifiedLeads > 0 ? '+' : ''}${kpis?.trends.qualifiedLeads}%`}
              changeType={kpis?.trends.qualifiedLeads >= 0 ? 'positive' : 'negative'}
              icon={MousePointerClick}
            />
            <MetricCard
              title="Marketing Score"
              value={`${kpis?.marketingPerformanceScore || 0}/100`}
              change={`${kpis?.trends.marketingPerformanceScore > 0 ? '+' : ''}${kpis?.trends.marketingPerformanceScore}%`}
              changeType={kpis?.trends.marketingPerformanceScore >= 0 ? 'positive' : 'negative'}
              icon={TrendingUp}
            />
            <MetricCard
              title="Units Sold"
              value={kpis?.unitsSold.toLocaleString() || '0'}
              change={`${kpis?.unitsAvailable} Available`}
              changeType="neutral"
              icon={BarChart3}
            />
          </>
        )}
      </div>

      {/* Traffic Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Overview (Live Data Coming Soon)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Views"
                dot={{ strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#10b981"
                strokeWidth={2}
                name="Clicks"
                dot={{ strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 lg:col-span-2">
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
                  <span className="text-2xl font-bold text-slate-900">{kpis?.conversionRate}%</span>
                  <span
                    className={`text-xs mb-1 ${kpis?.trends.conversionRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {kpis?.trends.conversionRate > 0 ? '+' : ''}
                    {kpis?.trends.conversionRate}%
                  </span>
                </div>
                <p className="text-xs text-slate-400">Leads converting to sales</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-slate-500">Affordability Match</h4>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {kpis?.affordabilityMatchPercent}%
                  </span>
                  <span
                    className={`text-xs mb-1 ${kpis?.trends.affordabilityMatchPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {kpis?.trends.affordabilityMatchPercent > 0 ? '+' : ''}
                    {kpis?.trends.affordabilityMatchPercent}%
                  </span>
                </div>
                <p className="text-xs text-slate-400">Leads matching price range</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-slate-500">Lead Response</h4>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-900">2.4h</span>
                  <span className="text-xs mb-1 text-green-600">-5%</span>
                </div>
                <p className="text-xs text-slate-400">Avg time to action lead</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
