import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Building2, UserPlus, Users, ArrowRight, Settings, CreditCard } from 'lucide-react';
import { AgencyStatsCards } from '@/components/agency/AgencyStatsCards';
import { AgencyPerformanceChart } from '@/components/agency/AgencyPerformanceChart';
import { RecentLeadsTable } from '@/components/agency/RecentLeadsTable';
import { RecentListingsTable } from '@/components/agency/RecentListingsTable';
import { LeadConversionAnalytics } from '@/components/agency/LeadConversionAnalytics';
import { CommissionEarningsDashboard } from '@/components/agency/CommissionEarningsDashboard';
import { AgentPerformanceLeaderboard } from '@/components/agency/AgentPerformanceLeaderboard';
import { AgencyExploreOverview } from '@/components/explore-analytics/AgencyExploreOverview';
import { useAgencyOnboardingStatus } from '@/hooks/useAgencyOnboardingStatus';
import { cn } from '@/lib/utils';

export default function AgencyDashboard() {
  const [, setLocation] = useLocation();
  const { status, isLoading: statusLoading } = useAgencyOnboardingStatus({
    requireDashboardUnlocked: true,
  });
  const dashboardReady = Boolean(status?.dashboardUnlocked);

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = trpc.agency.getDashboardStats.useQuery(
    undefined,
    { enabled: dashboardReady },
  );
  const { data: performanceData, isLoading: performanceLoading } =
    trpc.agency.getPerformanceData.useQuery(undefined, { enabled: dashboardReady });
  const { data: recentLeads, isLoading: leadsLoading } = trpc.agency.getRecentLeads.useQuery(
    undefined,
    { enabled: dashboardReady },
  );
  const { data: recentListings, isLoading: listingsLoading } =
    trpc.agency.getRecentListings.useQuery(undefined, { enabled: dashboardReady });

  // Advanced analytics
  const { data: conversionStats, isLoading: conversionLoading } =
    trpc.agency.getLeadConversionStats.useQuery(undefined, { enabled: dashboardReady });
  const { data: commissionStats, isLoading: commissionLoading } =
    trpc.agency.getCommissionStats.useQuery(undefined, { enabled: dashboardReady });
  const { data: agentLeaderboard, isLoading: leaderboardLoading } =
    trpc.agency.getAgentLeaderboard.useQuery(undefined, { enabled: dashboardReady });

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Preparing your agency workspace...</p>
        </div>
      </div>
    );
  }

  const billingNeedsAttention = !status?.billingActivated;
  const teamNeedsAttention = Boolean(status?.billingActivated && !status?.teamReady);
  const setupComplete = status?.fullFeaturesUnlocked;

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-emerald-600" />
            <div>
              <h1 className="text-4xl font-bold text-slate-800">Agency Dashboard</h1>
              <p className="text-slate-500">
                {status?.agency?.name
                  ? `Monitor performance and manage ${status.agency.name}`
                  : 'Monitor performance and manage your team'}
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200">
              Agency Admin
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation('/explore/upload')}
              disabled={!setupComplete}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Upload to Explore
            </Button>
            <Button variant="outline" onClick={() => setLocation('/agency/subscription')}>
              <CreditCard className="mr-2 h-4 w-4" />
              Subscription
            </Button>
            <Button onClick={() => setLocation('/agency/agents')}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Team
            </Button>
          </div>
        </div>

        {billingNeedsAttention ? (
          <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
            <CreditCard className="h-4 w-4" />
            <AlertTitle>Finish billing to activate your full agency workspace</AlertTitle>
            <AlertDescription className="mt-2 flex items-center justify-between gap-4">
              <span>
                Your agency profile is live, but subscription activation is still pending. Complete
                billing to unlock the full feature set and publishing workflow.
              </span>
              <Button onClick={() => setLocation('/agency/subscription')} className="shrink-0">
                Review subscription
              </Button>
            </AlertDescription>
          </Alert>
        ) : teamNeedsAttention ? (
          <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900">
            <UserPlus className="h-4 w-4" />
            <AlertTitle>Invite your first team members</AlertTitle>
            <AlertDescription className="mt-2 flex items-center justify-between gap-4">
              <span>
                Your agency workspace is active. Bring your agents in next so listings, leads, and
                team reporting start flowing through the dashboard.
              </span>
              <Button onClick={() => setLocation('/agency/invite')} className="shrink-0">
                Invite agents
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-emerald-200 bg-white">
            <Building2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle>Agency setup is live</AlertTitle>
            <AlertDescription>
              Branding, billing, and team access are in place. You can now operate the full agency
              workspace.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <AgencyStatsCards
          stats={
            stats || {
              totalListings: 0,
              totalSales: 0,
              totalLeads: 0,
              totalAgents: 0,
              activeListings: 0,
              pendingListings: 0,
              recentLeads: 0,
              recentSales: 0,
            }
          }
          isLoading={statsLoading}
        />

        {/* Performance Chart */}
        <AgencyPerformanceChart data={performanceData || []} isLoading={performanceLoading} />

        {/* Explore Performance Overview */}
        <AgencyExploreOverview />

        {/* Advanced Analytics */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <LeadConversionAnalytics
            data={conversionStats || { total: 0, converted: 0, conversionRate: 0, byStatus: [] }}
            isLoading={conversionLoading}
          />
          <CommissionEarningsDashboard
            data={
              commissionStats || {
                totalEarnings: 0,
                paidCommissions: 0,
                pendingCommissions: 0,
                monthlyBreakdown: [],
              }
            }
            isLoading={commissionLoading}
          />
        </div>

        {/* Agent Performance Leaderboard */}
        <AgentPerformanceLeaderboard data={agentLeaderboard || []} isLoading={leaderboardLoading} />

        {/* Recent Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentLeadsTable
            leads={recentLeads || []}
            isLoading={leadsLoading}
            onViewAll={() => setLocation('/agency/leads')}
          />

          <RecentListingsTable
            listings={recentListings || []}
            isLoading={listingsLoading}
            onViewAll={() => setLocation('/agency/listings')}
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common agency management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="justify-between h-auto py-4"
                onClick={() => setLocation('/agency/invite')}
              >
                <div className="text-left">
                  <div className="font-semibold flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite Agents
                  </div>
                  <div className="text-sm text-muted-foreground">Add new team members</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="justify-between h-auto py-4"
                onClick={() => setLocation('/agency/agents')}
              >
                <div className="text-left">
                  <div className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Manage Team
                  </div>
                  <div className="text-sm text-muted-foreground">Update roles and permissions</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="justify-between h-auto py-4"
                onClick={() => setLocation('/listings/create')}
                disabled={!setupComplete}
              >
                <div className="text-left">
                  <div className="font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Add Listing
                  </div>
                  <div className="text-sm text-muted-foreground">Create new property listing</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            {!setupComplete ? (
              <p className={cn('mt-4 text-sm text-slate-500')}>
                Listing and Explore publishing unlock after subscription activation.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
