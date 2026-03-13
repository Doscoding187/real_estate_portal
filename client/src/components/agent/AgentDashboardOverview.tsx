import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowRight,
  BellDot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock3,
  DollarSign,
  Home,
  Share2,
  Users,
} from 'lucide-react';

type PipelineStage = 'new' | 'contacted' | 'viewing' | 'offer' | 'closed';
type LeadItem = {
  id: number;
  name: string;
  phone?: string | null;
  source?: string | null;
  createdAt: string | Date;
  property?: { title?: string } | null;
};
type PipelineData = Record<PipelineStage, LeadItem[]>;
type ShowingItem = {
  id: number;
  status: string;
  scheduledAt?: string | Date;
  property?: { title?: string | null } | null;
  client?: { name?: string | null } | null;
};
type ListingItem = {
  id: number;
  title: string;
  city?: string | null;
  price?: number | null;
  enquiries?: number;
  views?: number;
};
type CommissionItem = {
  id: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  transactionType: string;
  createdAt: string;
  property?: { title?: string } | null;
  client?: { name?: string } | null;
};
type NotificationItem = {
  id: number;
  type: 'lead_assigned' | 'offer_received' | 'showing_scheduled' | 'system_alert';
  title: string;
  content: string;
  isRead: number;
  createdAt: string;
};

const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const stageMeta: Array<{ key: PipelineStage; label: string; tone: string }> = [
  { key: 'new', label: 'New', tone: 'border-primary/15 bg-primary/10 text-primary' },
  { key: 'contacted', label: 'Contacted', tone: 'border-border bg-secondary/70 text-foreground' },
  { key: 'viewing', label: 'Viewing', tone: 'border-border bg-accent/20 text-foreground' },
  { key: 'offer', label: 'Offer', tone: 'border-accent/20 bg-accent/15 text-foreground' },
  { key: 'closed', label: 'Closed', tone: 'border-border bg-muted text-muted-foreground' },
];
const formatCurrency = (cents?: number | null) =>
  `R ${((cents || 0) / 100).toLocaleString('en-ZA')}`;
const formatLeadSource = (source?: string | null) =>
  source ? source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
const formatDateTime = (value?: string | Date | null) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleString('en-ZA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const formatDate = (value?: string | Date | null) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
};

function KpiTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <Card className="rounded-[18px] border border-border bg-card shadow-sm">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            <p className="text-xl font-semibold tracking-tight text-foreground sm:text-[1.35rem]">
              {value}
            </p>
          </div>
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl border', tone)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentDashboardOverview() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const trackDashboardView = trpc.analytics.track.useMutation();
  const hasTrackedView = useRef(false);
  const today = useMemo(() => new Date(), []);
  const nextMonth = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }, []);

  const { data: stats, isLoading: statsLoading } = trpc.agent.getDashboardStats.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === 'agent', retry: false },
  );
  const { data: pipelineData, isLoading: pipelineLoading } = trpc.agent.getLeadsPipeline.useQuery(
    {},
    { enabled: isAuthenticated && user?.role === 'agent', retry: false },
  );
  const { data: showingsData, isLoading: showingsLoading } = trpc.agent.getMyShowings.useQuery(
    {
      startDate: today.toISOString().split('T')[0],
      endDate: nextMonth.toISOString().split('T')[0],
    },
    { enabled: isAuthenticated && user?.role === 'agent', retry: false },
  );
  const { data: activation, isLoading: activationLoading } =
    trpc.agent.getActivationMilestones.useQuery(undefined, {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
    });
  const { data: listingsData, isLoading: listingsLoading } = trpc.agent.getMyListings.useQuery(
    { limit: 6 },
    { enabled: isAuthenticated && user?.role === 'agent', retry: false },
  );
  const { data: notificationsData, isLoading: notificationsLoading } =
    trpc.agent.getNotifications.useQuery(
      { limit: 6, unreadOnly: false },
      { enabled: isAuthenticated && user?.role === 'agent', retry: false },
    );
  const { data: unreadNotifications } = trpc.agent.getUnreadNotificationCount.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'agent',
    retry: false,
  });
  const { data: commissionsData, isLoading: commissionsLoading } =
    trpc.agent.getMyCommissions.useQuery(
      { status: 'all' },
      { enabled: isAuthenticated && user?.role === 'agent', retry: false },
    );

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
    onError: error => toast.error(error.message || 'Failed to request public profile'),
  });
  const markAllNotificationsAsRead = trpc.agent.markAllNotificationsAsRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.agent.getNotifications.invalidate(),
        utils.agent.getUnreadNotificationCount.invalidate(),
      ]);
      toast.success('Notifications marked as read');
    },
    onError: error => toast.error(error.message || 'Failed to mark notifications as read'),
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'agent' || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackDashboardView.mutate({
      event: 'agent_dashboard_viewed',
      properties: { sourceSurface: 'agent_dashboard_overview' },
    });
  }, [isAuthenticated, trackDashboardView, user?.role]);
  const pipeline = useMemo(
    () =>
      ({
        new: ensureArray<LeadItem>((pipelineData as Partial<PipelineData> | undefined)?.new),
        contacted: ensureArray<LeadItem>(
          (pipelineData as Partial<PipelineData> | undefined)?.contacted,
        ),
        viewing: ensureArray<LeadItem>(
          (pipelineData as Partial<PipelineData> | undefined)?.viewing,
        ),
        offer: ensureArray<LeadItem>((pipelineData as Partial<PipelineData> | undefined)?.offer),
        closed: ensureArray<LeadItem>((pipelineData as Partial<PipelineData> | undefined)?.closed),
      }) as PipelineData,
    [pipelineData],
  );

  const listings = useMemo(() => ensureArray<ListingItem>(listingsData), [listingsData]);
  const notifications = useMemo(
    () => ensureArray<NotificationItem>(notificationsData),
    [notificationsData],
  );
  const commissions = useMemo(
    () => ensureArray<CommissionItem>(commissionsData),
    [commissionsData],
  );
  const showings = useMemo(() => ensureArray<ShowingItem>(showingsData), [showingsData]);

  const recentLeads = useMemo(
    () =>
      Object.values(pipeline)
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [pipeline],
  );
  const upcomingShowings = useMemo(
    () =>
      [...showings]
        .filter(showing => {
          const scheduledAt = showing.scheduledAt ? new Date(showing.scheduledAt).getTime() : 0;
          return showing.status === 'scheduled' && scheduledAt >= today.getTime();
        })
        .sort(
          (a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime(),
        )
        .slice(0, 4),
    [showings, today],
  );
  const majorDeals = useMemo(
    () =>
      [...commissions]
        .sort((a, b) => {
          if (b.amount !== a.amount) return b.amount - a.amount;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, 3),
    [commissions],
  );

  const unreadCount = unreadNotifications?.count || 0;
  const latestNotifications = useMemo(() => notifications.slice(0, 4), [notifications]);
  const activationItems = [
    ['Profile completed', activation?.milestones.agent_profile_completed],
    ['Profile published', activation?.milestones.agent_profile_published],
    ['First listing live', activation?.milestones.agent_listing_live],
    ['First lead received', activation?.milestones.agent_lead_received],
    ['First CRM action', activation?.milestones.agent_crm_action_logged],
    ['First showing completed', activation?.milestones.agent_showing_completed],
  ] as const;

  const activationCompleteCount = activationItems.filter(([, value]) => Boolean(value)).length;
  const activationRemainingCount = activationItems.length - activationCompleteCount;
  const pipelineCount = stageMeta.reduce((sum, stage) => sum + pipeline[stage.key].length, 0);
  const todayAppointments = stats?.showingsToday ?? 0;
  const pendingCommissionValue = stats?.commissionsPending ?? 0;
  const offersInProgress = stats?.offersInProgress ?? 0;

  const heroSummary = !activation?.milestones.agent_profile_published
    ? 'Your dashboard is live. Finish the remaining setup so your public profile and branded presence go live.'
    : upcomingShowings.length > 0
      ? `${upcomingShowings.length} appointment${upcomingShowings.length === 1 ? '' : 's'} already sit on your schedule. Keep the day moving from one desk.`
      : recentLeads.length > 0
        ? `You have ${pipelineCount} active lead${pipelineCount === 1 ? '' : 's'} in the pipeline. The next move is turning them into appointments.`
        : listings.length > 0
          ? 'Inventory is live. The next priority is capturing and converting your first active enquiries.'
          : 'Your operating desk is ready. Add the first listing and start the live Agent OS workflow.';

  return (
    <>
      <div className="min-h-screen bg-transparent">
        <main className="content-rail flex w-full flex-col gap-4 py-4 sm:gap-5 sm:py-5">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_380px]">
            <Card className="overflow-hidden rounded-[22px] border border-border bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-card)_88%,white)_0%,color-mix(in_srgb,var(--color-primary)_4%,var(--color-card))_100%)] shadow-sm sm:rounded-[24px]">
              <CardContent className="space-y-5 p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2.5">
                    <h1 className="text-[1.45rem] font-semibold tracking-tight text-foreground sm:text-[1.7rem]">
                      Welcome back, {user?.name?.split(' ')[0] || 'Agent'}.
                    </h1>
                    <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground sm:text-sm">
                      Here&apos;s what&apos;s happening in your business today.
                    </p>
                    <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
                      {heroSummary}
                    </p>
                  </div>
                  {activationRemainingCount > 0 ? (
                    <Button
                      variant="outline"
                      className="h-9 rounded-xl border-border bg-card px-3.5 text-sm shadow-sm"
                      onClick={() => setIsActivationOpen(true)}
                    >
                      Finish setup � {activationRemainingCount} left
                    </Button>
                  ) : (
                    <Badge className="h-8 rounded-xl border border-accent/20 bg-accent/15 px-3 text-foreground hover:bg-accent/15">
                      Setup complete
                    </Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[18px] border border-border bg-card/85 p-3.5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Pending commission
                    </p>
                    <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
                      {statsLoading ? '�' : formatCurrency(pendingCommissionValue)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-border bg-card/85 p-3.5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Offers in progress
                    </p>
                    <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
                      {statsLoading ? '�' : offersInProgress}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-border bg-card/85 p-3.5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Appointments today
                    </p>
                    <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
                      {statsLoading ? '�' : todayAppointments}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-border bg-card/85 p-3.5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Unread alerts
                    </p>
                    <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
                      {unreadCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="rounded-[22px] border border-border bg-card shadow-sm sm:rounded-[24px]">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Calendar view
                    </p>
                    <CardTitle className="mt-1 text-lg font-semibold text-foreground">
                      Upcoming appointments
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-8 rounded-xl px-2.5 text-sm"
                    onClick={() => setLocation('/agent/calendar')}
                  >
                    Calendar <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  {showingsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading appointments...</p>
                  ) : upcomingShowings.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                      No scheduled appointments yet.
                    </div>
                  ) : (
                    upcomingShowings.map(showing => (
                      <div
                        key={showing.id}
                        className="rounded-[18px] border border-border bg-secondary/50 p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1.5">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {showing.property?.title || 'Property showing'}
                            </p>
                            <p className="text-[13px] text-muted-foreground">
                              {showing.client?.name || 'Prospective buyer'}
                            </p>
                            <div className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                              <CalendarClock className="h-3.5 w-3.5" />
                              {formatDateTime(showing.scheduledAt)}
                            </div>
                          </div>
                          <Badge className="border-accent/20 bg-accent/15 text-foreground hover:bg-accent/15">
                            Scheduled
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[22px] border border-border bg-card shadow-sm sm:rounded-[24px]">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Deal flow
                    </p>
                    <CardTitle className="mt-1 text-lg font-semibold text-foreground">
                      Recent major deals
                    </CardTitle>
                  </div>
                  <Badge className="border-border bg-secondary text-muted-foreground hover:bg-secondary">
                    {statsLoading ? '�' : `${offersInProgress} offers in progress`}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-border bg-secondary/60 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Pending commission
                      </p>
                      <p className="mt-1.5 text-lg font-semibold text-foreground">
                        {statsLoading ? '�' : formatCurrency(pendingCommissionValue)}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-border bg-secondary/60 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Closed pipeline
                      </p>
                      <p className="mt-1.5 text-lg font-semibold text-foreground">
                        {pipeline.closed.length}
                      </p>
                    </div>
                  </div>

                  {commissionsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading recent deals...</p>
                  ) : majorDeals.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                      No commission-backed deal records yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {majorDeals.map(deal => (
                        <div
                          key={deal.id}
                          className="rounded-[18px] border border-border bg-secondary/50 p-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {deal.property?.title || 'Commission record'}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-border text-muted-foreground capitalize"
                                >
                                  {deal.transactionType}
                                </Badge>
                              </div>
                              <p className="text-[13px] text-muted-foreground">
                                {deal.client?.name || 'Client not attached'}
                              </p>
                              <p className="text-[12px] text-muted-foreground">
                                {formatDate(deal.createdAt)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-semibold text-foreground">
                                {formatCurrency(deal.amount)}
                              </p>
                              <Badge
                                className={cn(
                                  'mt-2 capitalize',
                                  deal.status === 'paid'
                                    ? 'border-accent/20 bg-accent/15 text-foreground'
                                    : deal.status === 'approved'
                                      ? 'border-primary/15 bg-primary/10 text-primary'
                                      : deal.status === 'pending'
                                        ? 'border-border bg-secondary text-muted-foreground'
                                        : 'border-border bg-muted text-muted-foreground',
                                )}
                              >
                                {deal.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiTile
              label="Active listings"
              value={statsLoading ? '�' : (stats?.activeListings ?? 0)}
              icon={Home}
              tone="border-primary/15 bg-primary/10 text-primary"
            />
            <KpiTile
              label="New leads"
              value={statsLoading ? '�' : (stats?.newLeadsThisWeek ?? 0)}
              icon={Users}
              tone="border-primary/15 bg-primary/10 text-primary"
            />
            <KpiTile
              label="Offers in progress"
              value={statsLoading ? '�' : offersInProgress}
              icon={BriefcaseBusiness}
              tone="border-accent/20 bg-accent/15 text-foreground"
            />
            <KpiTile
              label="Showings today"
              value={statsLoading ? '�' : todayAppointments}
              icon={CalendarClock}
              tone="border-primary/15 bg-primary/10 text-primary"
            />
            <KpiTile
              label="Pending commissions"
              value={statsLoading ? '�' : formatCurrency(pendingCommissionValue)}
              icon={DollarSign}
              tone="border-border bg-secondary text-foreground"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <Card className="rounded-[22px] border border-border bg-card shadow-sm sm:rounded-[24px]">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    CRM pulse
                  </p>
                  <CardTitle className="mt-1 text-lg font-semibold text-foreground">
                    Recent leads & pipeline
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  className="h-8 rounded-xl px-2.5 text-sm"
                  onClick={() => setLocation('/agent/leads')}
                >
                  Work CRM <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0">
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
                  {stageMeta.map(stage => (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => setLocation('/agent/leads')}
                      className="rounded-[16px] border border-border bg-secondary/50 p-3 text-left transition hover:border-border hover:bg-card hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Badge className={cn('border', stage.tone)}>{stage.label}</Badge>
                        <span className="text-lg font-semibold tracking-tight text-foreground">
                          {pipeline[stage.key].length}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {pipelineLoading ? (
                  <p className="text-sm text-muted-foreground">Loading lead activity...</p>
                ) : recentLeads.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                    No lead activity yet. The moment enquiries start landing, this becomes the main
                    operating queue.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentLeads.map(lead => (
                      <div
                        key={lead.id}
                        className="rounded-[18px] border border-border bg-secondary/50 p-3.5"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{lead.name}</p>
                              <Badge
                                variant="outline"
                                className="rounded-full border-border text-muted-foreground"
                              >
                                {formatLeadSource(lead.source)}
                              </Badge>
                            </div>
                            <p className="text-[13px] text-muted-foreground">
                              {lead.property?.title || 'No property linked'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                              <span>{formatDateTime(lead.createdAt)}</span>
                              {lead.phone ? (
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {lead.phone}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            className="justify-start rounded-xl px-0 text-sm text-foreground lg:px-3"
                            onClick={() => setLocation('/agent/leads')}
                          >
                            Open lead <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="rounded-[22px] border border-border bg-card shadow-sm sm:rounded-[24px]">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Inventory overview
                    </p>
                    <CardTitle className="mt-1 text-lg font-semibold text-foreground">
                      Active listings
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-8 rounded-xl px-2.5 text-sm"
                    onClick={() => setLocation('/agent/listings')}
                  >
                    Manage <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  {listingsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading inventory...</p>
                  ) : listings.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                      No listings yet. Add your first property to start driving inventory, enquiries
                      and calendar activity.
                    </div>
                  ) : (
                    listings.slice(0, 3).map(listing => (
                      <div
                        key={listing.id}
                        className="rounded-[18px] border border-border bg-secondary/50 p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1.5">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {listing.title}
                            </p>
                            <p className="text-[13px] text-muted-foreground">
                              {listing.city || 'Location pending'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                              <span>{listing.views ?? 0} views</span>
                              <span>{listing.enquiries ?? 0} enquiries</span>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {listing.price
                              ? `R ${Number(listing.price).toLocaleString('en-ZA')}`
                              : 'Price on request'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[22px] border border-border bg-card shadow-sm sm:rounded-[24px]">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Alerts & reminders
                    </p>
                    <CardTitle className="mt-1 text-lg font-semibold text-foreground">
                      Notifications
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="border-border bg-secondary text-muted-foreground hover:bg-secondary">
                      {unreadCount} unread
                    </Badge>
                    {unreadCount > 0 ? (
                      <Button
                        variant="ghost"
                        className="h-8 rounded-xl px-2.5 text-sm"
                        disabled={markAllNotificationsAsRead.isPending}
                        onClick={() => markAllNotificationsAsRead.mutate()}
                      >
                        Mark all read
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  {notificationsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading reminders...</p>
                  ) : latestNotifications.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                      No notifications yet. System alerts, showing reminders and lead events will
                      appear here.
                    </div>
                  ) : (
                    latestNotifications.map(notification => (
                      <div
                        key={notification.id}
                        className={cn(
                          'rounded-[18px] border px-3.5 py-3.5',
                          notification.isRead === 0
                            ? 'border-primary/15 bg-primary/5'
                            : 'border-border bg-secondary/50',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border',
                              notification.isRead === 0
                                ? 'border-primary/15 bg-primary/10 text-primary'
                                : 'border-border bg-card text-muted-foreground',
                            )}
                          >
                            {notification.type === 'showing_scheduled' ? (
                              <CalendarClock className="h-4 w-4" />
                            ) : notification.type === 'offer_received' ? (
                              <DollarSign className="h-4 w-4" />
                            ) : notification.type === 'lead_assigned' ? (
                              <Users className="h-4 w-4" />
                            ) : (
                              <BellDot className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">
                                {notification.title}
                              </p>
                              {notification.isRead === 0 ? (
                                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                              ) : null}
                            </div>
                            <p className="text-[13px] leading-5 text-muted-foreground">
                              {notification.content}
                            </p>
                            <p className="text-[12px] text-muted-foreground">
                              {formatDateTime(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>

      <Dialog open={isActivationOpen} onOpenChange={setIsActivationOpen}>
        <DialogContent className="max-w-lg rounded-[24px] border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              Complete your Agent setup
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-muted-foreground">
              Finish the remaining once-off milestones, then the checklist disappears and the
              dashboard stays focused on live business operations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {activationLoading ? (
              <p className="text-sm text-muted-foreground">Loading activation status...</p>
            ) : (
              activationItems.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-[18px] border border-border bg-secondary/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {value ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-accent" />
                    ) : (
                      <CircleDashed className="h-4.5 w-4.5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </div>
                  <Badge
                    className={cn(
                      value
                        ? 'border-accent/20 bg-accent/15 text-foreground'
                        : 'border-border bg-card text-muted-foreground',
                    )}
                  >
                    {value ? 'Done' : 'Pending'}
                  </Badge>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {!activation?.milestones.agent_profile_published ? (
              <Button
                className="h-10 rounded-xl bg-primary px-4 text-primary-foreground hover:bg-primary/90"
                disabled={publishProfileMutation.isPending}
                onClick={() => publishProfileMutation.mutate()}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {publishProfileMutation.isPending ? 'Working...' : 'Request Public Profile'}
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-10 rounded-xl border-border bg-card px-4"
              onClick={() => setLocation('/agent/listings')}
            >
              Open Listings <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-xl border-border bg-card px-4"
              onClick={() => setLocation('/agent/leads')}
            >
              Open CRM <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
