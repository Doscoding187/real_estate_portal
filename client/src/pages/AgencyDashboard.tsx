import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, UserPlus, Users, ArrowRight, Settings } from 'lucide-react';
import { AgencyStatsCards } from '@/components/agency/AgencyStatsCards';
import { AgencyPerformanceChart } from '@/components/agency/AgencyPerformanceChart';
import { RecentLeadsTable } from '@/components/agency/RecentLeadsTable';
import { RecentListingsTable } from '@/components/agency/RecentListingsTable';
import { LeadConversionAnalytics } from '@/components/agency/LeadConversionAnalytics';
import { CommissionEarningsDashboard } from '@/components/agency/CommissionEarningsDashboard';
import { AgentPerformanceLeaderboard } from '@/components/agency/AgentPerformanceLeaderboard';

export default function AgencyDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = trpc.agency.getDashboardStats.useQuery();
  const { data: performanceData, isLoading: performanceLoading } =
    trpc.agency.getPerformanceData.useQuery();
  const { data: recentLeads, isLoading: leadsLoading } = trpc.agency.getRecentLeads.useQuery();
  const { data: recentListings, isLoading: listingsLoading } =
    trpc.agency.getRecentListings.useQuery();

  // Advanced analytics
  const { data: conversionStats, isLoading: conversionLoading } =
    trpc.agency.getLeadConversionStats.useQuery();
  const { data: commissionStats, isLoading: commissionLoading } =
    trpc.agency.getCommissionStats.useQuery();
  const { data: agentLeaderboard, isLoading: leaderboardLoading } =
    trpc.agency.getAgentLeaderboard.useQuery();

  // Show loading spinner while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not agency_admin
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'agency_admin') {
    setLocation('/dashboard');
    return null;
  }

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
              <p className="text-slate-500">Monitor performance and manage your team</p>
            </div>
            <Badge className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200">Agency Admin</Badge>
          </div>

          <Button onClick={() => setLocation('/agency/agents')}>
            <Settings className="mr-2 h-4 w-4" />
            Manage Team
          </Button>
        </div>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
