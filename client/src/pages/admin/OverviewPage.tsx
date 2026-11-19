import React from 'react';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

type Figure = {
  label: string;
  hint: string;
  value: string;
  href?: string;
};

const OverviewPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = trpc.admin.getAnalytics.useQuery();
  const {
    data: launch,
    isLoading: launchLoading,
    isError: launchError,
  } = trpc.admin.getLaunchDashboardStats.useQuery();
  const { data: actions, isLoading: actionsLoading } = trpc.admin.getAdminActionItems.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Poll every 30s
    },
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  const formatNumber = (num: number) => new Intl.NumberFormat('en-ZA').format(num);

  // Show a figure only when its query returned a real number; otherwise be honest.
  const show = (
    loading: boolean,
    failed: boolean,
    value: number | undefined,
    format: (n: number) => string = formatNumber,
  ) => (loading ? '...' : failed || value === undefined ? 'Unavailable' : format(value));

  const figures: Figure[] = [
    {
      label: 'EFT payments awaiting review',
      hint: 'Submitted proofs not yet decided',
      value: show(launchLoading, launchError, launch?.eftAwaitingReview),
      href: '/admin/finance',
    },
    {
      label: 'Approved payments this month',
      hint: 'Launch-access payments verified this calendar month',
      value: show(launchLoading, launchError, launch?.approvedThisMonthCount),
      href: '/admin/finance',
    },
    {
      label: 'Approved amount this month',
      hint: 'Sum of verified billing payments, rand',
      value: show(launchLoading, launchError, launch?.approvedThisMonthRand, formatCurrency),
    },
    {
      label: 'Active subscriptions',
      hint: 'Active or in grace period',
      value: show(analyticsLoading, analyticsError, analytics?.paidSubscriptions),
    },
    {
      label: 'New users',
      hint: 'Last 30 days',
      value: show(analyticsLoading, analyticsError, analytics?.userGrowth),
    },
    {
      label: 'New leads and enquiries',
      hint: 'Last 30 days',
      value: show(launchLoading, launchError, launch?.newLeads30d),
    },
  ];

  const totalActionItems =
    (actions?.pendingAgentApprovals || 0) +
    (actions?.pendingListingApprovals || 0) +
    (actions?.pendingDevelopmentApprovals || 0);

  const hasActions = totalActionItems > 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Daily decision support center.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {figures.map(figure => (
          <Card
            key={figure.label}
            className="py-6 px-6 flex items-center justify-between border-slate-200 shadow-sm bg-white"
          >
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                {figure.label}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{figure.value}</h3>
              <p className="text-xs text-slate-500 mt-1">{figure.hint}</p>
            </div>
            {figure.href ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Open ${figure.label}`}
                onClick={() => setLocation(figure.href as string)}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
          </Card>
        ))}
      </div>

      <Card className="border-l-4 border-l-amber-500 shadow-sm relative overflow-hidden bg-white">
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
                <button
                  type="button"
                  onClick={() => setLocation('/admin/approvals?tab=agents')}
                  className="w-full text-left flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-medium text-slate-700">
                      {actions?.pendingAgentApprovals} Agent approvals pending
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                </button>
              )}
              {(actions?.pendingListingApprovals || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setLocation('/admin/approvals?tab=listings')}
                  className="w-full text-left flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-medium text-slate-700">
                      {actions?.pendingListingApprovals} Listings awaiting review
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                </button>
              )}
              {(actions?.pendingDevelopmentApprovals || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setLocation('/admin/approvals?tab=developments')}
                  className="w-full text-left flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-medium text-slate-700">
                      {actions?.pendingDevelopmentApprovals} Developments pending review
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-slate-500 mb-4 text-sm">The approval queue is empty.</p>
              <Button variant="outline" size="sm" onClick={() => setLocation('/admin/properties')}>
                Manage Existing Listings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewPage;
