/**
 * KPI Grid Component for Mission Control Dashboard
 * Displays all KPIs in a responsive grid layout
 * Requirements: 2.3, 2.4
 */

import { Users, UserCheck, TrendingUp, Home, DollarSign, Target } from 'lucide-react';
import { KPICard } from './KPICard';
import { trpc } from '@/lib/trpc';

interface KPIGridProps {
  timeRange?: '7d' | '30d' | '90d';
}

export function KPIGrid({ timeRange = '30d' }: KPIGridProps) {
  const {
    data: kpis,
    isLoading,
    error,
  } = trpc.developer.getDashboardKPIs.useQuery({
    timeRange,
    forceRefresh: false,
  });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-medium">Failed to load KPIs</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getTrend = (change: number): 'up' | 'down' | 'neutral' => {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'neutral';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {/* Total Leads */}
      <KPICard
        title="Total Leads"
        value={isLoading ? '...' : formatNumber(kpis?.totalLeads || 0)}
        change={kpis?.trends.totalLeads}
        trend={getTrend(kpis?.trends.totalLeads || 0)}
        icon={Users}
        gradientFrom="from-blue-500"
        gradientTo="to-blue-600"
        loading={isLoading}
      />

      {/* Qualified Leads */}
      <KPICard
        title="Qualified Leads"
        value={isLoading ? '...' : formatNumber(kpis?.qualifiedLeads || 0)}
        change={kpis?.trends.qualifiedLeads}
        trend={getTrend(kpis?.trends.qualifiedLeads || 0)}
        icon={UserCheck}
        gradientFrom="from-green-500"
        gradientTo="to-green-600"
        loading={isLoading}
      />

      {/* Conversion Rate */}
      <KPICard
        title="Conversion Rate"
        value={isLoading ? '...' : formatPercentage(kpis?.conversionRate || 0)}
        change={kpis?.trends.conversionRate}
        trend={getTrend(kpis?.trends.conversionRate || 0)}
        icon={TrendingUp}
        gradientFrom="from-purple-500"
        gradientTo="to-purple-600"
        loading={isLoading}
      />

      {/* Units Sold */}
      <KPICard
        title="Units Sold"
        value={
          isLoading
            ? '...'
            : `${kpis?.unitsSold || 0}/${(kpis?.unitsSold || 0) + (kpis?.unitsAvailable || 0)}`
        }
        change={kpis?.trends.unitsSold}
        trend={getTrend(kpis?.trends.unitsSold || 0)}
        icon={Home}
        gradientFrom="from-orange-500"
        gradientTo="to-orange-600"
        loading={isLoading}
      />

      {/* Affordability Match */}
      <KPICard
        title="Affordability Match"
        value={isLoading ? '...' : formatPercentage(kpis?.affordabilityMatchPercent || 0)}
        change={kpis?.trends.affordabilityMatchPercent}
        trend={getTrend(kpis?.trends.affordabilityMatchPercent || 0)}
        icon={DollarSign}
        gradientFrom="from-teal-500"
        gradientTo="to-teal-600"
        loading={isLoading}
      />

      {/* Marketing Performance */}
      <KPICard
        title="Marketing Score"
        value={isLoading ? '...' : Math.round(kpis?.marketingPerformanceScore || 0)}
        change={kpis?.trends.marketingPerformanceScore}
        trend={getTrend(kpis?.trends.marketingPerformanceScore || 0)}
        icon={Target}
        gradientFrom="from-pink-500"
        gradientTo="to-pink-600"
        loading={isLoading}
      />
    </div>
  );
}
