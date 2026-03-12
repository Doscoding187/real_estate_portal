import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';

type PipelineStage = 'new' | 'contacted' | 'viewing' | 'offer' | 'closed';

type LeadItem = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  status?: string;
  createdAt: string | Date;
  property?: {
    id: number;
    title: string;
    city?: string;
    price?: number;
  } | null;
};

type PipelineData = Record<PipelineStage, LeadItem[]>;

type ShowingItem = {
  id: number;
  status: string;
  scheduledAt?: string | Date;
  property?: {
    id: number;
    title?: string | null;
    city?: string | null;
  } | null;
  client?: {
    name?: string | null;
  } | null;
};

type ListingItem = {
  id: number;
  title: string;
  city?: string | null;
  price?: number | null;
  status: string;
  enquiries?: number;
  views?: number;
};

type CommissionItem = {
  id: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  transactionType: 'sale' | 'rent' | 'referral' | 'other';
  createdAt: string;
  property?: {
    id: number;
    title: string;
  } | null;
  client?: {
    name: string;
  } | null;
};

type NotificationItem = {
  id: number;
  type: 'lead_assigned' | 'offer_received' | 'showing_scheduled' | 'system_alert';
  title: string;
  content: string;
  isRead: number;
  createdAt: string;
};

const stageMeta: Array<{
  key: PipelineStage;
  label: string;
  tone: string;
}> = [
  { key: 'new', label: 'New', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'contacted', label: 'Contacted', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'viewing', label: 'Viewing', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'offer', label: 'Offer', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'closed', label: 'Closed', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

function formatCurrency(cents: number | null | undefined) {
  return `R ${((cents || 0) / 100).toLocaleString('en-ZA')}`;
}

function formatLeadSource(source: string | null | undefined) {
  if (!source) return 'Unknown';
  return source.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleString('en-ZA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-ZA', {
    month: 'short',
    day: 'numeric',
  });
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden rounded-[22px] border border-black/5 bg-white/90 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] sm:rounded-[26px]">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {label}
            </p>
            <p className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {value}
            </p>
            <p className="text-sm leading-5 text-slate-500">{detail}</p>
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm',
              accent,
            )}
          >
            <Icon className="h-5 w-5" />
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
    {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
    },
  );

  const { data: pipelineData, isLoading: pipelineLoading } = trpc.agent.getLeadsPipeline.useQuery(
    {},
    {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
    },
  );

  const { data: showings, isLoading: showingsLoading } = trpc.agent.getMyShowings.useQuery(
    {
      startDate: today.toISOString().split('T')[0],
      endDate: nextMonth.toISOString().split('T')[0],
    },
    {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
    },
  );

  const { data: activation, isLoading: activationLoading } =
    trpc.agent.getActivationMilestones.useQuery(undefined, {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
    });

  const { data: listings = [], isLoading: listingsLoading } = trpc.agent.getMyListings.useQuery(
    { limit: 6 },
    {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
    },
  );

  const { data: notifications = [], isLoading: notificationsLoading } =
    trpc.agent.getNotifications.useQuery(
      { limit: 6, unreadOnly: false },
      {
        enabled: isAuthenticated && user?.role === 'agent',
        retry: false,
      },
    );

  const { data: unreadNotifications } = trpc.agent.getUnreadNotificationCount.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'agent',
    retry: false,
  });

  const { data: commissions = [], isLoading: commissionsLoading } =
    trpc.agent.getMyCommissions.useQuery(
      { status: 'all' },
      {
        enabled: isAuthenticated && user?.role === 'agent',
        retry: false,
      },
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
    onError: error => {
      toast.error(error.message || 'Failed to request public profile');
    },
  });

  const markAllNotificationsAsRead = trpc.agent.markAllNotificationsAsRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.agent.getNotifications.invalidate(),
        utils.agent.getUnreadNotificationCount.invalidate(),
      ]);
      toast.success('Notifications marked as read');
    },
    onError: error => {
      toast.error(error.message || 'Failed to mark notifications as read');
    },
  });

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

  const recentLeads = useMemo(
    () =>
      Object.values(pipeline)
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [pipeline],
  );

  const majorDeals = useMemo(
    () =>
      ([...commissions] as CommissionItem[])
        .sort((a, b) => {
          if (b.amount !== a.amount) return b.amount - a.amount;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, 3),
    [commissions],
  );

  const upcomingShowings = useMemo(
    () =>
      ([...showings] as ShowingItem[])
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

  const unreadCount = unreadNotifications?.count || 0;
  const latestNotifications = useMemo(
    () => ([...notifications] as NotificationItem[]).slice(0, 4),
    [notifications],
  );

  const activationItems = [
    ['Profile completed', activation?.milestones.agent_profile_completed],
    ['Profile published', activation?.milestones.agent_profile_published],
    ['First listing live', activation?.milestones.agent_listing_live],
    ['First lead received', activation?.milestones.agent_lead_received],
    ['First CRM action', activation?.milestones.agent_crm_action_logged],
    ['First showing completed', activation?.milestones.agent_showing_completed],
  ] as const;

  const activationCompleteCount = activationItems.filter(([, value]) => Boolean(value)).length;
  const activationPercent = Math.round((activationCompleteCount / activationItems.length) * 100);
  const pipelineCount = stageMeta.reduce((sum, stage) => sum + pipeline[stage.key].length, 0);

  const primaryFocus = !activation?.milestones.agent_profile_published
    ? {
        title: 'Request your public profile',
        detail:
          'Publishing your profile unlocks your public identity, branded presence, and trust layer.',
        cta: 'Request Public Profile',
        action: () => publishProfileMutation.mutate(),
        pending: publishProfileMutation.isPending,
      }
    : recentLeads.length === 0
      ? {
          title: 'Seed your CRM with the first live lead',
          detail:
            'Your dashboard is ready. Capture the first lead so the rest of the operating flow starts.',
          cta: 'Open CRM',
          action: () => setLocation('/agent/leads'),
          pending: false,
        }
      : upcomingShowings.length === 0
        ? {
            title: 'Convert pipeline momentum into appointments',
            detail:
              'Schedule the next showing directly from CRM and move leads into real operating motion.',
            cta: 'Open Calendar',
            action: () => setLocation('/agent/calendar'),
            pending: false,
          }
        : {
            title: 'Operate the day from one desk',
            detail:
              'Listings, leads, showings, deals and reminders are all now live in this overview.',
            cta: 'Open Analytics',
            action: () => setLocation('/agent/analytics'),
            pending: false,
          };

  const readinessState = activation?.weeklyActive?.qualified
    ? 'Qualified weekly active'
    : activation?.weeklyActive?.crm
      ? 'CRM weekly active'
      : activation?.weeklyActive?.core
        ? 'Core weekly active'
        : 'Still activating';

  const todayLabel = today.toLocaleDateString('en-ZA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.14),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(29,78,216,0.08),_transparent_24%),linear-gradient(180deg,#f7f8f3_0%,#eef2ec_100%)]">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 xl:px-8">
        <section className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="relative overflow-hidden rounded-[26px] border border-[#0f766e]/10 bg-[linear-gradient(135deg,#082f49_0%,#0f766e_38%,#10b981_100%)] p-5 text-white shadow-[0_40px_90px_-48px_rgba(8,47,73,0.68)] sm:rounded-[34px] sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.28),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                    Agent OS overview
                  </Badge>
                  <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                    {readinessState}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-5xl">
                    Welcome back, {user?.name?.split(' ')[0] || 'Agent'}.
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-emerald-50/95 sm:text-base">
                    This overview now reflects the live Agent OS operating model: active inventory,
                    major deal movement, upcoming appointments, and notifications that need action.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[22px] border border-white/15 bg-white/12 p-4 backdrop-blur-sm sm:rounded-[28px] sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50/80">
                    Primary focus
                  </p>
                  <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
                    {primaryFocus.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/85">{primaryFocus.detail}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
                      disabled={primaryFocus.pending}
                      onClick={primaryFocus.action}
                    >
                      {primaryFocus.pending ? 'Working...' : primaryFocus.cta}
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-2xl border border-white/20 text-white hover:bg-white/10"
                      onClick={() => setLocation('/agent/leads')}
                    >
                      Open CRM <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/15 bg-slate-950/18 p-4 backdrop-blur-sm sm:rounded-[28px] sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50/80">
                    Today
                  </p>
                  <p className="mt-3 text-xl font-semibold text-white">{todayLabel}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                      <p className="text-emerald-50/80">Pipeline load</p>
                      <p className="mt-1 text-2xl font-semibold text-white">{pipelineCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                      <p className="text-emerald-50/80">Unread alerts</p>
                      <p className="mt-1 text-2xl font-semibold text-white">{unreadCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden rounded-[26px] border border-black/5 bg-white/88 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.48)] backdrop-blur-sm sm:rounded-[34px]">
            <CardHeader className="space-y-3 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Activation runway
                  </p>
                  <CardTitle className="mt-2 text-2xl font-semibold text-slate-950">
                    {activationCompleteCount} / {activationItems.length} milestones complete
                  </CardTitle>
                </div>
                <div className="rounded-2xl bg-slate-950 px-3 py-2 text-right text-white">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Progress</p>
                  <p className="text-lg font-semibold">{activationPercent}%</p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#082f49_0%,#0f766e_52%,#22c55e_100%)] transition-all"
                  style={{ width: `${activationPercent}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {activationLoading ? (
                <p className="text-sm text-slate-500">Loading activation status...</p>
              ) : (
                activationItems.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {value ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="text-sm font-medium text-slate-800">{label}</span>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold uppercase tracking-[0.16em]',
                        value ? 'text-emerald-700' : 'text-slate-400',
                      )}
                    >
                      {value ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))
              )}

              {!activation?.milestones.agent_profile_published ? (
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-slate-200 bg-white"
                  disabled={publishProfileMutation.isPending}
                  onClick={() => publishProfileMutation.mutate()}
                >
                  {publishProfileMutation.isPending
                    ? 'Requesting profile...'
                    : 'Request Public Profile'}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Active listings"
            value={statsLoading ? '-' : (stats?.activeListings ?? 0)}
            detail="Inventory currently live"
            icon={Home}
            accent="border-emerald-100 bg-emerald-50 text-emerald-700"
          />
          <StatCard
            label="New leads"
            value={statsLoading ? '-' : (stats?.newLeadsThisWeek ?? 0)}
            detail="Fresh demand this week"
            icon={Users}
            accent="border-blue-100 bg-blue-50 text-blue-700"
          />
          <StatCard
            label="Offers in progress"
            value={statsLoading ? '-' : (stats?.offersInProgress ?? 0)}
            detail="Negotiations moving now"
            icon={BriefcaseBusiness}
            accent="border-amber-100 bg-amber-50 text-amber-700"
          />
          <StatCard
            label="Showings today"
            value={statsLoading ? '-' : (stats?.showingsToday ?? 0)}
            detail="Appointments on the calendar"
            icon={CalendarClock}
            accent="border-violet-100 bg-violet-50 text-violet-700"
          />
          <StatCard
            label="Pending commissions"
            value={statsLoading ? '-' : formatCurrency(stats?.commissionsPending ?? 0)}
            detail="Live ledger total awaiting payout"
            icon={DollarSign}
            accent="border-slate-200 bg-slate-100 text-slate-900"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-6">
            <Card className="rounded-[24px] border border-black/5 bg-white/92 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.42)] sm:rounded-[30px]">
              <CardHeader className="flex flex-col gap-4 border-b border-slate-100 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Inventory overview
                  </p>
                  <CardTitle className="mt-2 text-2xl font-semibold text-slate-950">
                    Active listings
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => setLocation('/agent/listings')}
                >
                  Manage listings <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {listingsLoading ? (
                  <p className="text-sm text-slate-500">Loading listings...</p>
                ) : (listings as ListingItem[]).length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50/60 p-8 text-sm text-slate-500">
                    No listings yet. Add your first property to start driving active inventory,
                    enquiries and calendar activity.
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {(listings as ListingItem[]).slice(0, 4).map(listing => (
                      <div
                        key={listing.id}
                        className="rounded-[22px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-[28px] sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <p className="text-lg font-semibold text-slate-950">{listing.title}</p>
                            <p className="text-sm text-slate-600">
                              {[
                                listing.city,
                                listing.price
                                  ? `R${Number(listing.price).toLocaleString('en-ZA')}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' � ')}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="rounded-full border-slate-200 capitalize text-slate-600"
                          >
                            {listing.status}
                          </Badge>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                              Enquiries
                            </p>
                            <p className="mt-1 text-2xl font-semibold text-slate-950">
                              {listing.enquiries || 0}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-100 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                              Views
                            </p>
                            <p className="mt-1 text-2xl font-semibold text-slate-950">
                              {listing.views || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border border-black/5 bg-white/92 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.42)] sm:rounded-[30px]">
              <CardHeader className="flex flex-col gap-4 border-b border-slate-100 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    CRM pulse
                  </p>
                  <CardTitle className="mt-2 text-2xl font-semibold text-slate-950">
                    Recent leads and pipeline
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => setLocation('/agent/leads')}
                >
                  Work CRM <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
                <div className="grid gap-3 grid-cols-2 xl:grid-cols-5">
                  {stageMeta.map(stage => (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => setLocation('/agent/leads')}
                      className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4 text-left transition hover:border-slate-200 hover:bg-white hover:shadow-sm sm:rounded-3xl"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Badge className={cn('border', stage.tone)}>{stage.label}</Badge>
                        <span className="text-2xl font-semibold tracking-tight text-slate-950">
                          {pipeline[stage.key].length}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {pipelineLoading ? (
                  <p className="text-sm text-slate-500">Loading lead activity...</p>
                ) : recentLeads.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50/60 p-8 text-sm text-slate-500">
                    No lead activity yet. The moment enquiries start landing, this becomes the main
                    operating queue for the day.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentLeads.map(lead => (
                      <div
                        key={lead.id}
                        className="rounded-[22px] border border-slate-100 bg-slate-50/70 px-4 py-4 sm:rounded-[26px]"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-slate-950">{lead.name}</p>
                              <Badge
                                variant="outline"
                                className="rounded-full border-slate-200 text-slate-600"
                              >
                                {formatLeadSource(lead.source)}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">
                              {lead.property?.title || 'No property linked'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
                            className="justify-start rounded-2xl px-0 text-slate-700 lg:justify-center lg:px-3"
                            onClick={() => setLocation('/agent/leads')}
                          >
                            Open lead <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[24px] border border-black/5 bg-white/92 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.42)] sm:rounded-[30px]">
              <CardHeader className="flex flex-col gap-4 border-b border-slate-100 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Calendar view
                  </p>
                  <CardTitle className="mt-2 text-2xl font-semibold text-slate-950">
                    Upcoming appointments
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => setLocation('/agent/calendar')}
                >
                  Open calendar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                {showingsLoading ? (
                  <p className="text-sm text-slate-500">Loading appointments...</p>
                ) : upcomingShowings.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50/60 p-8 text-sm text-slate-500">
                    No scheduled showings yet. Book from CRM or from the calendar once a lead is
                    ready for a visit.
                  </div>
                ) : (
                  upcomingShowings.map(showing => (
                    <div
                      key={showing.id}
                      className="rounded-[22px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 sm:rounded-[26px]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="text-base font-semibold text-slate-950">
                            {showing.property?.title || 'Property showing'}
                          </p>
                          <p className="text-sm text-slate-600">
                            {showing.property?.city || 'Calendar appointment'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            <CalendarClock className="h-4 w-4" />
                            {formatDateTime(showing.scheduledAt)}
                          </div>
                          <p className="text-sm text-slate-500">
                            {showing.client?.name || 'Prospective buyer'}
                          </p>
                        </div>
                        <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                          Scheduled
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border border-black/5 bg-white/92 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.42)] sm:rounded-[30px]">
              <CardHeader className="flex flex-col gap-4 border-b border-slate-100 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Deal flow
                  </p>
                  <CardTitle className="mt-2 text-2xl font-semibold text-slate-950">
                    Recent major deals
                  </CardTitle>
                </div>
                <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                  {statsLoading ? '-' : `${stats?.offersInProgress ?? 0} offers in progress`}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-emerald-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      Pending value
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {formatCurrency(stats?.commissionsPending ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                      Closed pipeline
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {pipeline.closed.length}
                    </p>
                  </div>
                </div>

                {commissionsLoading ? (
                  <p className="text-sm text-slate-500">Loading recent deal movement...</p>
                ) : majorDeals.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50/60 p-8 text-sm text-slate-500">
                    No commission-backed deal records yet. This card will start surfacing meaningful
                    deals as transactions move forward.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {majorDeals.map(deal => (
                      <div
                        key={deal.id}
                        className="rounded-[22px] border border-slate-100 bg-slate-50/70 px-4 py-4 sm:rounded-[26px]"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-slate-950">
                                {deal.property?.title || 'Commission record'}
                              </p>
                              <Badge
                                variant="outline"
                                className="rounded-full border-slate-200 capitalize text-slate-600"
                              >
                                {deal.transactionType}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">
                              {deal.client?.name || 'Client not attached'}
                            </p>
                            <p className="text-xs text-slate-500">{formatDate(deal.createdAt)}</p>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-lg font-semibold text-slate-950">
                              {formatCurrency(deal.amount)}
                            </p>
                            <Badge
                              className={cn(
                                'mt-2 border capitalize',
                                deal.status === 'paid'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : deal.status === 'approved'
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : deal.status === 'pending'
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border-slate-200 bg-slate-100 text-slate-600',
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

            <Card className="rounded-[24px] border border-black/5 bg-white/92 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.42)] sm:rounded-[30px]">
              <CardHeader className="flex flex-col gap-4 border-b border-slate-100 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Alerts and reminders
                  </p>
                  <CardTitle className="mt-2 text-2xl font-semibold text-slate-950">
                    Notifications
                  </CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100">
                    {unreadCount} unread
                  </Badge>
                  {unreadCount > 0 ? (
                    <Button
                      variant="ghost"
                      className="rounded-2xl"
                      disabled={markAllNotificationsAsRead.isPending}
                      onClick={() => markAllNotificationsAsRead.mutate()}
                    >
                      Mark all read
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-6">
                {notificationsLoading ? (
                  <p className="text-sm text-slate-500">Loading reminders...</p>
                ) : latestNotifications.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50/60 p-8 text-sm text-slate-500">
                    No notifications yet. System alerts, showing reminders and lead events will
                    appear here.
                  </div>
                ) : (
                  latestNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={cn(
                        'rounded-[22px] border px-4 py-4 sm:rounded-[26px]',
                        notification.isRead === 0
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : 'border-slate-100 bg-slate-50/70',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl',
                            notification.isRead === 0
                              ? 'bg-white text-emerald-700'
                              : 'bg-white text-slate-600',
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
                            <p className="text-sm font-semibold text-slate-950">
                              {notification.title}
                            </p>
                            {notification.isRead === 0 ? (
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            ) : null}
                          </div>
                          <p className="text-sm leading-5 text-slate-600">{notification.content}</p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[24px] border border-black/5 bg-[linear-gradient(145deg,#111827_0%,#082f49_55%,#0f766e_140%)] text-white shadow-[0_22px_70px_-42px_rgba(15,23,42,0.72)] sm:rounded-[30px]">
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex items-center gap-2 text-emerald-200">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                    Agent OS principle
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">One operating desk. No split workflows.</h3>
                  <p className="text-sm leading-6 text-slate-300">
                    Listings, leads, appointments, deals and reminders are now driven from live
                    backend workflows. That is the correct foundation for the next growth layer.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Listings</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {statsLoading ? '-' : (stats?.activeListings ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Deals</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {statsLoading ? '-' : (stats?.offersInProgress ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Alerts</p>
                    <p className="mt-1 text-lg font-semibold text-white">{unreadCount}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
                    onClick={() => setLocation('/agent/analytics')}
                  >
                    Review analytics <TrendingUp className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-2xl border border-white/15 text-white hover:bg-white/10"
                    onClick={() => setLocation('/agent/calendar')}
                  >
                    Open calendar <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
