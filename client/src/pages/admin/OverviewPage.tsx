import React from 'react';
import {
  Users,
  Home,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { trpc } from '@/lib/trpc';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: 'up' | 'down';
  color?: string;
  change?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  trend,
  color = 'bg-muted',
  change,
}) => {
  return (
    <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] hover:shadow-[0_12px_40px_rgba(8,_112,_184,_0.1)] transition-all py-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className={`p-2 rounded-full ${color}`}>{icon}</div>
        {trend && (
          <div className="flex items-center">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <p className="text-xs text-slate-500">{label}</p>
        {change && <p className="text-xs text-slate-500 mt-1">{change}</p>}
      </CardContent>
    </GlassCard>
  );
};

const OverviewPage: React.FC = () => {
  // Fetch real analytics data
  const { data: analytics, isLoading } = trpc.admin.getAnalytics.useQuery();

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-ZA').format(num);
  };

  // Calculate percentage change (mock for now, can be enhanced with historical data)
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return '+0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  // Real data for key metrics
  const keyMetrics = [
    {
      title: 'Monthly Revenue',
      value: isLoading ? '...' : formatCurrency(analytics?.monthlyRevenue || 0),
      label: 'Last 30 Days',
      change: isLoading ? '...' : `${analytics?.userGrowth || 0} new users`,
      trend: 'up' as const,
      icon: <DollarSign className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Total Users',
      value: isLoading ? '...' : formatNumber(analytics?.totalUsers || 0),
      label: 'Active Users',
      change: isLoading ? '...' : `+${analytics?.userGrowth || 0} this month`,
      trend: 'up' as const,
      icon: <Users className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      title: 'Properties Listed',
      value: isLoading ? '...' : formatNumber(analytics?.totalProperties || 0),
      label: 'Total Properties',
      change: isLoading ? '...' : `+${analytics?.propertyGrowth || 0} this month`,
      trend: 'up' as const,
      icon: <Home className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      title: 'Paid Subscriptions',
      value: isLoading ? '...' : formatNumber(analytics?.paidSubscriptions || 0),
      label: 'Active Subscriptions',
      change: isLoading ? '...' : `${analytics?.totalAgencies || 0} total agencies`,
      trend: 'up' as const,
      icon: <CreditCard className="h-6 w-6 text-amber-600" />,
      color: 'bg-amber-100',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-slate-500">Welcome back! Here's what's happening with your platform.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {keyMetrics.map((metric, index) => (
          <StatCard key={index} {...metric} />
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader>
            <CardTitle className="text-slate-800">Active Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {isLoading ? '...' : formatNumber(analytics?.activeProperties || 0)}
            </div>
            <p className="text-sm text-slate-500 mt-2">Properties currently available</p>
          </CardContent>
        </GlassCard>

        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader>
            <CardTitle className="text-slate-800">Total Agencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {isLoading ? '...' : formatNumber(analytics?.totalAgencies || 0)}
            </div>
            <p className="text-sm text-slate-500 mt-2">Registered agencies</p>
          </CardContent>
        </GlassCard>

        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader>
            <CardTitle className="text-slate-800">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {isLoading ? '...' : formatNumber(analytics?.totalAgents || 0)}
            </div>
            <p className="text-sm text-slate-500 mt-2">Active agents on platform</p>
          </CardContent>
        </GlassCard>

        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader>
            <CardTitle className="text-slate-800">Total Developers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {isLoading ? '...' : formatNumber(analytics?.totalDevelopers || 0)}
            </div>
            <p className="text-sm text-slate-500 mt-2">Property developers</p>
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
};

export default OverviewPage;
