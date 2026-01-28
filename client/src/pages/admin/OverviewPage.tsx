import React from 'react';
import {
  Users,
  Home,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Activity,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';

const OverviewPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { data: analytics, isLoading: analyticsLoading } = trpc.admin.getAnalytics.useQuery();
  const { data: actions, isLoading: actionsLoading } = trpc.admin.getAdminActionItems.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Poll every 30s
    },
  );
  // Fetch Quality Stats
  const { data: propStats } = trpc.admin.getPropertiesStats.useQuery();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-ZA').format(num);

  // SECTION 1: EXECUTIVE PULSE
  const pulseMetrics = [
    {
      label: 'Revenue (30d)',
      value: analyticsLoading ? '...' : formatCurrency(analytics?.monthlyRevenue || 0),
      trend: '+12%', // Mock trend for now
      color: 'text-blue-600',
    },
    {
      label: 'Active Users',
      value: analyticsLoading ? '...' : formatNumber(analytics?.totalUsers || 0),
      trend: `+${analytics?.userGrowth || 0}`,
      color: 'text-emerald-600',
    },
    {
      label: 'Active Listings',
      value: analyticsLoading ? '...' : formatNumber(analytics?.activeProperties || 0),
      trend: `+${analytics?.propertyGrowth || 0}`,
      color: 'text-purple-600',
    },
  ];

  // SECTION 2: ACTION REQUIRED
  const totalActionItems =
    (actions?.pendingAgentApprovals || 0) +
    (actions?.pendingListingApprovals || 0) +
    (actions?.pendingDevelopmentApprovals || 0);

  const hasActions = totalActionItems > 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Daily decision support center.</p>
      </div>

      {/* SECTION 1: EXECUTIVE PULSE (Compact) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pulseMetrics.map((metric, i) => (
          <Card
            key={i}
            className="py-6 px-6 flex items-center justify-between border-slate-200 shadow-sm bg-white"
          >
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                {metric.label}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{metric.value}</h3>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100">
              {metric.trend}
            </Badge>
          </Card>
        ))}
      </div>

      {/* SECTION 2: ACTION REQUIRED (Hero) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-l-4 border-l-amber-500 shadow-sm relative overflow-hidden bg-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className={
                  hasActions
                    ? 'p-2 bg-amber-50 rounded-lg text-amber-600'
                    : 'p-2 bg-emerald-50 rounded-lg text-emerald-600'
                }
              >
                {hasActions ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <CheckCircle className="h-6 w-6" />
                )}
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">
                  {hasActions ? 'Action Required' : 'All Clear'}
                </CardTitle>
                <p className="text-slate-500 text-sm mt-1">
                  {hasActions
                    ? `You have ${totalActionItems} items requiring attention.`
                    : 'No pending approvals or reviews.'}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-2">
            {actionsLoading ? (
              <div className="text-sm text-slate-500">Loading action items...</div>
            ) : hasActions ? (
              <>
                {(actions?.pendingAgentApprovals || 0) > 0 && (
                  <div
                    onClick={() => setLocation('/admin/approvals')}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-medium text-slate-700">
                        {actions?.pendingAgentApprovals} Agent approvals pending
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                )}
                {(actions?.pendingListingApprovals || 0) > 0 && (
                  <div
                    onClick={() => setLocation('/admin/approvals')}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-medium text-slate-700">
                        {actions?.pendingListingApprovals} Listings awaiting review
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                )}
                {(actions?.pendingDevelopmentApprovals || 0) > 0 && (
                  <div
                    onClick={() => setLocation('/admin/approvals')}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-medium text-slate-700">
                        {actions?.pendingDevelopmentApprovals} Developments pending review
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-slate-500 mb-4 text-sm">Great job! You've cleared the queue.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/admin/properties')}
                >
                  Manage Existing Listings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 3: GROWTH SNAPSHOT */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="h-full bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <TrendingUp className="h-5 w-5 text-slate-400" />
                Growth Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">New Users</p>
                  <p className="text-xs text-slate-500">Last 30 days</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">+{analytics?.userGrowth || 0}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">New Listings</p>
                  <p className="text-xs text-slate-500">Last 30 days</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">+{analytics?.propertyGrowth || 0}</p>
                </div>
              </div>

              {/* Quality Score (Phase 6) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-medium text-slate-700">Avg Quality</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {(propStats as any)?.qualityMetrics?.featuredCount || 0} Featured Listings
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-lg">
                    {Math.round((propStats as any)?.qualityMetrics?.averageScore || 0)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button
                  variant="ghost"
                  className="w-full text-xs text-slate-500 hover:text-slate-900 justify-start px-0"
                  onClick={() => setLocation('/admin/analytics')}
                >
                  View Full Analytics <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 4: MONETIZATION SNAPSHOT */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Monetization
        </h3>
        <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-slate-400" />
                <span className="text-slate-700 font-medium">Active Subscriptions</span>
              </div>
              <span className="font-bold text-slate-900">{analytics?.paidSubscriptions || 0}</span>
            </div>
            <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-slate-400" />
                <span className="text-slate-700 font-medium">Revenue (MoM)</span>
              </div>
              <span className="font-bold text-emerald-600">+12%</span>
            </div>
            <div
              className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
              onClick={() => setLocation('/admin/revenue')}
            >
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-slate-400" />
                <span className="text-slate-700 font-medium group-hover:text-blue-600 transition-colors">
                  Revenue Center
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OverviewPage;
