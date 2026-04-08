import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { LeadPipeline } from '@/components/agent/LeadPipeline';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  MessageSquare,
  TrendingUp,
  Users,
} from 'lucide-react';

type LeadPipelineItem = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  notes: string | null;
  createdAt: string | Date;
  property: {
    id: number;
    title: string;
    city: string;
    price: number;
  } | null;
};

type PipelineData = {
  new: LeadPipelineItem[];
  contacted: LeadPipelineItem[];
  viewing: LeadPipelineItem[];
  offer: LeadPipelineItem[];
  closed: LeadPipelineItem[];
};

const STAGE_META: Array<{
  key: keyof PipelineData;
  label: string;
  tone: string;
}> = [
  { key: 'new', label: 'New', tone: 'bg-blue-100 text-blue-700' },
  { key: 'contacted', label: 'Contacted', tone: 'bg-amber-100 text-amber-700' },
  { key: 'viewing', label: 'Viewing', tone: 'bg-violet-100 text-violet-700' },
  { key: 'offer', label: 'Offer', tone: 'bg-orange-100 text-orange-700' },
  { key: 'closed', label: 'Closed', tone: 'bg-emerald-100 text-emerald-700' },
];

const SOURCE_LABELS: Record<string, string> = {
  web: 'Website',
  property_detail: 'Property Detail',
  agent_profile: 'Agent Profile',
  development_detail: 'Development Detail',
  demand: 'Demand',
  demand_engine: 'Demand Engine',
  referral: 'Referral',
};

function formatRelativeTime(value: string | Date | null | undefined) {
  if (!value) return 'Recently';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  return formatter.format(Math.round(diffHours / 24), 'day');
}

function formatNotificationTone(type: string | null | undefined, isRead: boolean) {
  if (isRead) return 'bg-slate-100 text-slate-600';

  switch (type) {
    case 'lead_assigned':
      return 'bg-blue-100 text-blue-700';
    case 'showing_scheduled':
      return 'bg-violet-100 text-violet-700';
    case 'offer_received':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-300 bg-[#fbfaf7] px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function AgentLeads() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('pipeline');
  const { status, isLoading: statusLoading } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });

  const propertyId = useMemo(() => {
    const [, search = ''] = location.split('?');
    const searchParams = new URLSearchParams(search);
    const value = searchParams.get('propertyId');
    const parsed = value ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [location]);

  const leadsLocked = !statusLoading && !status?.entitlements?.canReceiveLeads;

  const { data: stats } = trpc.agent.getDashboardStats.useQuery(undefined, {
    enabled: !leadsLocked && !statusLoading,
    retry: false,
  });

  const { data: pipelineData } = trpc.agent.getLeadsPipeline.useQuery(
    {
      filters: {
        propertyId,
      },
    },
    {
      enabled: !leadsLocked && !statusLoading,
      retry: false,
    },
  );

  const { data: notificationsData = [] } = trpc.agent.getNotifications.useQuery(
    {
      limit: 8,
      unreadOnly: false,
    },
    {
      enabled: !leadsLocked && !statusLoading,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const pipeline = useMemo(
    () =>
      (pipelineData || {
        new: [],
        contacted: [],
        viewing: [],
        offer: [],
        closed: [],
      }) as PipelineData,
    [pipelineData],
  );

  const allLeads = useMemo(
    () =>
      [
        ...pipeline.new,
        ...pipeline.contacted,
        ...pipeline.viewing,
        ...pipeline.offer,
        ...pipeline.closed,
      ] as LeadPipelineItem[],
    [pipeline],
  );

  const activeLeadCount = allLeads.filter(
    lead => lead.status !== 'closed' && lead.status !== 'lost',
  ).length;
  const propertyLinkedCount = allLeads.filter(lead => Boolean(lead.property)).length;
  const sourceRollup = useMemo(() => {
    const counts = new Map<string, number>();
    allLeads.forEach(lead => {
      const key = String(lead.source || 'web');
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([source, count]) => ({
        source,
        label: SOURCE_LABELS[source] || source.replace(/_/g, ' '),
        count,
        percentage: allLeads.length > 0 ? Math.round((count / allLeads.length) * 100) : 0,
      }))
      .sort((left, right) => right.count - left.count);
  }, [allLeads]);

  const recentActivity = useMemo(
    () =>
      notificationsData.filter(item =>
        ['lead_assigned', 'showing_scheduled', 'offer_received'].includes(String(item.type)),
      ),
    [notificationsData],
  );

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        {statusLoading ? (
          <AgentFeatureLockedState
            title="Preparing your lead workspace"
            description="We are confirming your onboarding and lead access before loading your CRM."
            actionLabel="Loading"
            onAction={() => {}}
            isLoading
          />
        ) : leadsLocked ? (
          <AgentFeatureLockedState
            title="Lead management unlocks after contact setup"
            description="Add the remaining core profile details, especially your contact information, to start receiving and managing leads."
            actionLabel="Finish setup"
            onAction={() => setLocation('/agent/setup')}
          />
        ) : (
          <>
            <div className={agentPageStyles.header}>
              <div className={agentPageStyles.headingBlock}>
                <h1 className={agentPageStyles.title}>Leads & CRM</h1>
                <p className={agentPageStyles.subtitle}>
                  {propertyId
                    ? `Managing real enquiries linked to property #${propertyId}`
                    : 'Live pipeline, source mix, and CRM activity for your agent account.'}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className={agentPageStyles.ghostButton}
                  onClick={() => setLocation('/agent/productivity')}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Open calendar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <Card className={agentPageStyles.statCard}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={agentPageStyles.statLabel}>Active Leads</p>
                      <p className={agentPageStyles.statValue}>{activeLeadCount}</p>
                      <p className={cn(agentPageStyles.statSub, 'text-blue-600')}>
                        {pipeline.new.length} new and {pipeline.offer.length} in offer stage
                      </p>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={agentPageStyles.statCard}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={agentPageStyles.statLabel}>New This Week</p>
                      <p className={agentPageStyles.statValue}>{stats?.newLeadsThisWeek || 0}</p>
                      <p className={cn(agentPageStyles.statSub, 'text-violet-600')}>
                        Fresh enquiries routed into your live pipeline
                      </p>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-3">
                      <TrendingUp className="h-6 w-6 text-violet-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={agentPageStyles.statCard}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={agentPageStyles.statLabel}>Property Linked</p>
                      <p className={agentPageStyles.statValue}>{propertyLinkedCount}</p>
                      <p className={cn(agentPageStyles.statSub, 'text-emerald-600')}>
                        Leads already tied to a listing or property record
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <BarChart3 className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={agentPageStyles.statCard}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={agentPageStyles.statLabel}>CRM Activity</p>
                      <p className={agentPageStyles.statValue}>{recentActivity.length}</p>
                      <p className={cn(agentPageStyles.statSub, 'text-amber-600')}>
                        Recent alerts from lead, offer, and showing updates
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3">
                      <Bell className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList
                className={cn(agentPageStyles.tabsList, 'grid w-full max-w-3xl grid-cols-3')}
              >
                <TabsTrigger value="pipeline" className={agentPageStyles.tabTrigger}>
                  <Users className="mr-2 h-4 w-4" />
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="insights" className={agentPageStyles.tabTrigger}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Insights
                </TabsTrigger>
                <TabsTrigger value="activity" className={agentPageStyles.tabTrigger}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pipeline">
                <LeadPipeline propertyId={propertyId} />
              </TabsContent>

              <TabsContent value="insights" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Live funnel snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {allLeads.length > 0 ? (
                      STAGE_META.map(stage => {
                        const count = pipeline[stage.key].length;
                        const percentage =
                          allLeads.length > 0 ? Math.round((count / allLeads.length) * 100) : 0;

                        return (
                          <div key={stage.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={stage.tone}>{stage.label}</Badge>
                                <span className="text-sm text-slate-600">{count} leads</span>
                              </div>
                              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                                {percentage}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-[var(--primary)]"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <EmptyPanel
                        title="No pipeline data yet"
                        description="As soon as your account starts receiving leads, this tab will show the live funnel breakdown instead of sample conversion charts."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Source mix</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sourceRollup.length > 0 ? (
                      sourceRollup.map(source => (
                        <div key={source.source} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">
                              {source.label}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {source.count} leads
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-2 flex-1 rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[#5a9bd6]"
                                style={{ width: `${source.percentage}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs font-medium text-slate-500">
                              {source.percentage}%
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyPanel
                        title="No source data yet"
                        description="Once real enquiries arrive, this section will show where they came from. No sample marketing charts are shown here."
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Recent CRM activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentActivity.length > 0 ? (
                      recentActivity.map(item => (
                        <div
                          key={item.id}
                          className="rounded-[14px] border border-slate-200/80 bg-[#fbfaf7] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-slate-900">{item.title}</p>
                                <Badge
                                  className={formatNotificationTone(
                                    String(item.type),
                                    item.isRead === 1,
                                  )}
                                >
                                  {item.isRead === 1 ? 'Read' : 'Unread'}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {item.content}
                              </p>
                            </div>
                            <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyPanel
                        title="No CRM alerts yet"
                        description="Lead routing, showing bookings, and offer updates will appear here as real activity for this account."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className={agentPageStyles.panel}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Unified messaging</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          A dedicated lead inbox is not live yet. For now, use lead detail, CRM
                          notes, and showing scheduling from the pipeline rather than a fake message
                          center.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className={agentPageStyles.ghostButton}
                        onClick={() => setActiveTab('pipeline')}
                      >
                        Open pipeline
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </AgentAppShell>
  );
}
