import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Home,
  ListTodo,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(cents: number) {
  return `R ${((cents || 0) / 100).toLocaleString()}`;
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card className="shadow-soft hover:shadow-hover transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  viewing: 'Viewing',
  offer: 'Offer',
  closed: 'Closed',
};

export function AgentDashboardOverview() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();
  const trackDashboardView = trpc.analytics.track.useMutation();
  const publishProfileMutation = trpc.agent.publishProfile.useMutation({
    onSuccess: result => {
      toast.success(
        result.isPublic
          ? 'Public profile is now live'
          : 'Profile is ready. Public publishing is pending approval.',
      );
      void Promise.all([
        utils.agent.getActivationMilestones.invalidate(),
        utils.agent.getDashboardStats.invalidate(),
      ]);
    },
    onError: error => {
      toast.error(error.message || 'Failed to request public profile');
    },
  });
  const hasTrackedView = useRef(false);

  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(today.getDate() + 30);

  const { data: stats, isLoading: statsLoading } = trpc.agent.getDashboardStats.useQuery(
    undefined,
    {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
    },
  );
  const { data: pipeline, isLoading: pipelineLoading } = trpc.agent.getLeadsPipeline.useQuery(
    {},
    {
      enabled: isAuthenticated && user?.role === 'agent',
    },
  );
  const { data: showings, isLoading: showingsLoading } = trpc.agent.getMyShowings.useQuery(
    {
      startDate: today.toISOString().split('T')[0],
      endDate: nextMonth.toISOString().split('T')[0],
    },
    {
      enabled: isAuthenticated && user?.role === 'agent',
    },
  );
  const { data: activation, isLoading: activationLoading } =
    trpc.agent.getActivationMilestones.useQuery(undefined, {
      enabled: isAuthenticated && user?.role === 'agent',
    });
  const { data: listings = [], isLoading: listingsLoading } = trpc.agent.getMyListings.useQuery(
    {
      limit: 5,
    },
    {
      enabled: isAuthenticated && user?.role === 'agent',
    },
  );

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'agent' || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackDashboardView.mutate({
      event: 'agent_dashboard_viewed',
      properties: {
        sourceSurface: 'agent_dashboard_overview',
      },
    });
  }, [isAuthenticated, trackDashboardView, user?.role]);

  const recentLeads = useMemo(() => {
    if (!pipeline) return [] as any[];
    return Object.values(pipeline)
      .flat()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [pipeline]);

  const upcomingShowings = useMemo(() => {
    if (!showings) return [] as any[];
    return showings
      .filter((showing: any) => {
        const scheduledAt = new Date(showing.scheduledAt).getTime();
        return showing.status === 'scheduled' && scheduledAt >= today.getTime();
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )
      .slice(0, 5);
  }, [showings, today]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 space-y-6 max-w-[1800px] mx-auto">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white shadow-hover">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back, {user?.name?.split(' ')[0] || 'Agent'}
              </h1>
              <p className="mt-2 text-blue-100">
                Your dashboard now reflects live Agent OS workflow data only.
              </p>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm text-blue-100">Today</p>
              <p className="text-lg font-semibold">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            title="Active Listings"
            value={statsLoading ? '-' : (stats?.activeListings ?? 0)}
            icon={Home}
          />
          <StatCard
            title="New Leads This Week"
            value={statsLoading ? '-' : (stats?.newLeadsThisWeek ?? 0)}
            icon={Users}
          />
          <StatCard
            title="Showings Today"
            value={statsLoading ? '-' : (stats?.showingsToday ?? 0)}
            icon={Calendar}
          />
          <StatCard
            title="Pending Commissions"
            value={statsLoading ? '-' : formatCurrency(stats?.commissionsPending ?? 0)}
            icon={DollarSign}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Recent Leads
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation('/agent/leads')}>
                  Work CRM <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {pipelineLoading ? (
                  <p className="text-sm text-gray-500">Loading leads...</p>
                ) : recentLeads.length === 0 ? (
                  <p className="text-sm text-gray-500">No lead activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentLeads.map((lead: any) => (
                      <div
                        key={lead.id}
                        className="rounded-xl border border-gray-100 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900">{lead.name}</p>
                            <p className="text-sm text-gray-500">
                              {lead.property?.title || 'No property linked'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(lead.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">{lead.source || 'web'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-blue-600" />
                  Listing Snapshot
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation('/agent/listings')}>
                  Manage Listings <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {listingsLoading ? (
                  <p className="text-sm text-gray-500">Loading listings...</p>
                ) : listings.length === 0 ? (
                  <p className="text-sm text-gray-500">No listings yet.</p>
                ) : (
                  <div className="space-y-3">
                    {listings.map((listing: any) => (
                      <div
                        key={listing.id}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900">{listing.title}</p>
                          <p className="text-sm text-gray-500">
                            {listing.city} {listing.price ? `| R${Number(listing.price).toLocaleString()}` : ''}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-semibold text-gray-900">
                            {listing.enquiries || 0} enquiries
                          </div>
                          <div className="text-gray-500 capitalize">{listing.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Upcoming Showings
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation('/agent/calendar')}>
                  Calendar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {showingsLoading ? (
                  <p className="text-sm text-gray-500">Loading showings...</p>
                ) : upcomingShowings.length === 0 ? (
                  <p className="text-sm text-gray-500">No scheduled showings yet.</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingShowings.map((showing: any) => (
                      <div key={showing.id} className="rounded-xl border border-gray-100 p-4">
                        <p className="font-semibold text-gray-900">
                          {showing.property?.title || 'Property Showing'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(showing.scheduledAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {showing.client?.name || 'Prospective buyer'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  Activation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activationLoading ? (
                  <p className="text-sm text-gray-500">Loading activation status...</p>
                ) : (
                  <>
                    {[
                      ['Profile completed', activation?.milestones.agent_profile_completed],
                      ['Profile published', activation?.milestones.agent_profile_published],
                      ['First listing live', activation?.milestones.agent_listing_live],
                      ['First lead received', activation?.milestones.agent_lead_received],
                      ['First showing completed', activation?.milestones.agent_showing_completed],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-700">{label}</span>
                        <span className={value ? 'text-green-700 font-medium' : 'text-gray-400'}>
                          {value ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    ))}

                    {!activation?.milestones.agent_profile_published ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={publishProfileMutation.isPending}
                        onClick={() => publishProfileMutation.mutate()}
                      >
                        {publishProfileMutation.isPending
                          ? 'Requesting public profile...'
                          : 'Request Public Profile'}
                      </Button>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-blue-600" />
                  Next Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-between" onClick={() => setLocation('/agent/leads')}>
                  Work Pipeline
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between" onClick={() => setLocation('/agent/calendar')}>
                  Review Schedule
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between" onClick={() => setLocation('/agent/analytics')}>
                  Open Operating Snapshot
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
