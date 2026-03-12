import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  DollarSign,
  FileBarChart,
  Home,
  Target,
  TrendingUp,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatCurrency(cents: number) {
  return `R ${((cents || 0) / 100).toLocaleString()}`;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  detail,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  detail?: string;
}) {
  return (
    <Card className="shadow-soft hover:shadow-hover transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {detail ? <p className="text-sm text-gray-500">{detail}</p> : null}
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
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

export default function AgentAnalytics() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(today.getDate() + 30);

  const { data: stats, isLoading: statsLoading } = trpc.agent.getDashboardStats.useQuery();
  const { data: pipeline, isLoading: pipelineLoading } = trpc.agent.getLeadsPipeline.useQuery({});
  const { data: showings, isLoading: showingsLoading } = trpc.agent.getMyShowings.useQuery({
    startDate: today.toISOString().split('T')[0],
    endDate: nextMonth.toISOString().split('T')[0],
  });
  const { data: activation, isLoading: activationLoading } =
    trpc.agent.getActivationMilestones.useQuery();
  const trackAnalyticsView = trpc.analytics.track.useMutation();
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

  useEffect(() => {
    if (user?.role !== 'agent' || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackAnalyticsView.mutate({
      event: 'agent_analytics_viewed',
      properties: {
        sourceSurface: 'agent_analytics',
      },
    });
  }, [trackAnalyticsView, user?.role]);

  const pipelineSummary = useMemo(() => {
    if (!pipeline) return [] as Array<{ key: string; label: string; count: number }>;

    return Object.entries(pipeline).map(([key, leads]) => ({
      key,
      label: STAGE_LABELS[key] || key,
      count: Array.isArray(leads) ? leads.length : 0,
    }));
  }, [pipeline]);

  const totalPipelineCount = useMemo(
    () => pipelineSummary.reduce((sum, stage) => sum + stage.count, 0),
    [pipelineSummary],
  );

  const stageByLeadId = useMemo(() => {
    const mapping = new Map<number, string>();
    if (!pipeline) return mapping;

    Object.entries(pipeline).forEach(([stage, leads]) => {
      (leads as any[]).forEach(lead => {
        mapping.set(lead.id, stage);
      });
    });

    return mapping;
  }, [pipeline]);

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

  const highestPipelineStage =
    pipelineSummary.reduce(
      (max, stage) => (stage.count > max.count ? stage : max),
      pipelineSummary[0] || { key: 'new', label: 'New', count: 0 },
    ) || { key: 'new', label: 'New', count: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agent Operating Snapshot</h1>
              <p className="text-sm text-gray-500 mt-1">
                Live operational metrics only. Advanced attribution and trend analytics remain hidden
                until instrumentation is in place.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setLocation('/agent/leads')}>
                CRM <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLocation('/agent/calendar')}>
                Calendar <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <p className="text-sm text-blue-700 font-medium">Operator</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">
            {user?.name ? `${user.name.split(' ')[0]}'s core workflow` : 'Core workflow'}
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            This page is for current activity, pipeline load, and upcoming showings. It is not a
            conversion or revenue dashboard yet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          <MetricCard
            title="Active Listings"
            value={statsLoading ? '-' : (stats?.activeListings ?? 0)}
            icon={Home}
          />
          <MetricCard
            title="New Leads This Week"
            value={statsLoading ? '-' : (stats?.newLeadsThisWeek ?? 0)}
            icon={Users}
          />
          <MetricCard
            title="Showings Today"
            value={statsLoading ? '-' : (stats?.showingsToday ?? 0)}
            icon={Calendar}
          />
          <MetricCard
            title="Offers In Progress"
            value={statsLoading ? '-' : (stats?.offersInProgress ?? 0)}
            icon={Target}
          />
          <MetricCard
            title="Pending Commissions"
            value={statsLoading ? '-' : formatCurrency(stats?.commissionsPending ?? 0)}
            icon={DollarSign}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileBarChart className="h-5 w-5 text-blue-600" />
                  Pipeline Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pipelineLoading ? (
                  <p className="text-sm text-gray-500">Loading pipeline metrics...</p>
                ) : pipelineSummary.length === 0 ? (
                  <p className="text-sm text-gray-500">No pipeline activity yet.</p>
                ) : (
                  <div className="space-y-4">
                    {pipelineSummary.map(stage => (
                      <div key={stage.key} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">{stage.label}</span>
                          <span className="font-semibold text-gray-900">{stage.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{
                              width: `${totalPipelineCount > 0 ? (stage.count / totalPipelineCount) * 100 : 0}%`,
                            }}
                          />
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
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Recent Lead Activity
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation('/agent/leads')}>
                  Open CRM <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {pipelineLoading ? (
                  <p className="text-sm text-gray-500">Loading recent leads...</p>
                ) : recentLeads.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent leads in the pipeline.</p>
                ) : (
                  <div className="space-y-3">
                    {recentLeads.map((lead: any) => {
                      const stage = stageByLeadId.get(lead.id) || 'new';
                      return (
                        <div
                          key={lead.id}
                          className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4"
                        >
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900">{lead.name}</p>
                            <p className="text-sm text-gray-500">
                              {lead.property?.title || 'No property linked'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Badge variant="outline">{lead.source}</Badge>
                              <span>{new Date(lead.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                            {STAGE_LABELS[stage] || stage}
                          </Badge>
                        </div>
                      );
                    })}
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
                  View Calendar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {showingsLoading ? (
                  <p className="text-sm text-gray-500">Loading showings...</p>
                ) : upcomingShowings.length === 0 ? (
                  <p className="text-sm text-gray-500">No scheduled showings in the next 30 days.</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingShowings.map((showing: any) => (
                      <div key={showing.id} className="rounded-xl border border-gray-100 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
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
                          <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                            {showing.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Operational Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="rounded-xl bg-gray-50 p-4">
                  Highest current pipeline pressure is in <span className="font-semibold text-gray-900">{highestPipelineStage.label}</span>{' '}
                  with <span className="font-semibold text-gray-900">{highestPipelineStage.count}</span> leads.
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  Conversion rates, channel trends, and revenue rollups are intentionally hidden until
                  event instrumentation is live and trustworthy.
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" onClick={() => setLocation('/agent/listings')}>
                    Review Listings <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => setLocation('/agent/leads')}>
                    Work Pipeline <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  Activation Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activationLoading ? (
                  <p className="text-sm text-gray-500">Loading activation milestones...</p>
                ) : (
                  <div className="space-y-4">
                    {[
                      ['Profile completed', activation?.milestones.agent_profile_completed],
                      ['First listing created', activation?.milestones.agent_listing_created],
                      ['First listing live', activation?.milestones.agent_listing_live],
                      ['First lead received', activation?.milestones.agent_lead_received],
                      ['First CRM action', activation?.milestones.agent_crm_action_logged],
                      ['First showing completed', activation?.milestones.agent_showing_completed],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-700">{label}</span>
                        <span className={cn('font-medium', value ? 'text-green-700' : 'text-gray-400')}>
                          {value ? new Date(String(value)).toLocaleDateString() : 'Not reached'}
                        </span>
                      </div>
                    ))}

                    <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Weekly Active Core</span>
                        <Badge variant="outline">
                          {activation?.weeklyActive.core ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Weekly Active CRM</span>
                        <Badge variant="outline">
                          {activation?.weeklyActive.crm ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Weekly Active Scheduling</span>
                        <Badge variant="outline">
                          {activation?.weeklyActive.scheduling ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>

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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
