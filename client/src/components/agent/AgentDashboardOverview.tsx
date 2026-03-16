import { useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Home,
  MapPin,
  ShieldAlert,
} from 'lucide-react';

type PipelineStage = 'new' | 'contacted' | 'viewing' | 'offer' | 'closed';

type LeadItem = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  source: string | null;
  createdAt: string | Date;
  campaignName?: string | null;
  matchConfidence?: 'high' | 'medium' | 'low' | null;
  property?: {
    id: number;
    title: string;
    city: string;
    price: number;
  } | null;
};

type PipelineData = Record<PipelineStage, LeadItem[]>;

type ListingItem = {
  id: number;
  title: string;
  city: string;
  price: number;
  status: string;
  propertyType?: string | null;
  views: number;
  enquiries: number;
  primaryImage?: string | null;
  updatedAt?: string | Date;
};

type ShowingItem = {
  id: number;
  listingId?: number | null;
  visitorName?: string | null;
  status: string;
  scheduledTime?: string | Date;
  scheduledAt?: string | Date;
};

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  content: string;
  createdAt: string | Date;
};

const PIPELINE_CONFIG: Array<{
  key: PipelineStage;
  label: string;
  shellClassName: string;
  dotClassName: string;
}> = [
  {
    key: 'new',
    label: 'New',
    shellClassName: 'border-slate-200 bg-slate-100/80',
    dotClassName: 'bg-slate-400',
  },
  {
    key: 'contacted',
    label: 'Contacted',
    shellClassName:
      'border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)]',
    dotClassName: 'bg-[var(--primary)]',
  },
  {
    key: 'viewing',
    label: 'Viewing',
    shellClassName: 'border-violet-200 bg-violet-50',
    dotClassName: 'bg-violet-500',
  },
  {
    key: 'offer',
    label: 'Offer',
    shellClassName: 'border-amber-200 bg-amber-50',
    dotClassName: 'bg-amber-500',
  },
  {
    key: 'closed',
    label: 'Closed',
    shellClassName: 'border-emerald-200 bg-emerald-50',
    dotClassName: 'bg-emerald-500',
  },
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatPrice(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatCommission(valueInCents: number | null | undefined): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format((valueInCents || 0) / 100);
}

function formatCompactCommission(valueInCents: number | null | undefined): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format((valueInCents || 0) / 100);
}

function formatStatus(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatPropertyType(value: string | null | undefined): string {
  if (!value) return 'Property';
  return formatStatus(value);
}

function formatRelativeTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return 'Just now';

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

function getScheduleTime(showing: ShowingItem): Date | null {
  return toDate(showing.scheduledTime ?? showing.scheduledAt);
}

function getLeadStage(status: string): PipelineStage {
  switch (status) {
    case 'contacted':
    case 'qualified':
      return 'contacted';
    case 'viewing_scheduled':
      return 'viewing';
    case 'offer_sent':
    case 'converted':
      return 'offer';
    case 'closed':
      return 'closed';
    default:
      return 'new';
  }
}

function getLeadStageBadgeClass(stage: PipelineStage): string {
  switch (stage) {
    case 'contacted':
      return 'border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] text-[var(--primary)]';
    case 'viewing':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'offer':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'closed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-rose-200 bg-rose-50 text-rose-700';
  }
}

function getListingStatusBadgeClass(status: string): string {
  switch (status) {
    case 'available':
    case 'published':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'sold':
    case 'rented':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    default:
      return 'border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] text-[var(--primary)]';
  }
}

function getNotificationBadge(notificationType: string): {
  label: string;
  className: string;
} {
  switch (notificationType) {
    case 'offer_received':
      return {
        label: 'Review required',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    case 'showing_scheduled':
      return {
        label: 'Scheduled',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'lead_assigned':
      return {
        label: 'Follow up',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
      };
    default:
      return {
        label: 'Live',
        className:
          'border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] text-[var(--primary)]',
      };
  }
}

function getNotificationIcon(notificationType: string) {
  switch (notificationType) {
    case 'offer_received':
      return FileText;
    case 'showing_scheduled':
      return CalendarDays;
    case 'lead_assigned':
      return ShieldAlert;
    default:
      return Bell;
  }
}

function getShowingBadgeClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'cancelled':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] text-[var(--primary)]';
  }
}

function getDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function buildCalendarDays(month: Date): Array<Date | null> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingEmptyDays = firstDay.getDay();
  const days: Array<Date | null> = [];

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, monthIndex, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function CardShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-[15px] border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AgentDashboardOverview() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const { data: stats, isLoading: statsLoading } = trpc.agent.getDashboardStats.useQuery(
    undefined,
    {
      retry: false,
    },
  );

  const { data: pipelineData } = trpc.agent.getLeadsPipeline.useQuery(
    { filters: {} },
    { retry: false },
  );

  const { data: listingsData } = trpc.agent.getMyListings.useQuery(
    { status: 'all', limit: 24 },
    { retry: false },
  );

  const { data: onboarding } = trpc.agent.getMyProfileOnboarding.useQuery(undefined, {
    retry: false,
  });

  const calendarRange = useMemo(() => {
    return {
      startDate: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
        .toISOString()
        .split('T')[0],
      endDate: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0],
    };
  }, [calendarMonth]);

  const { data: showingsData = [] } = trpc.agent.getMyShowings.useQuery(
    {
      startDate: calendarRange.startDate,
      endDate: calendarRange.endDate,
      status: 'all',
    },
    { retry: false },
  );

  const { data: notificationsData = [] } = trpc.agent.getNotifications.useQuery(
    {
      limit: 8,
      unreadOnly: true,
    },
    { retry: false },
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
      ] as LeadItem[],
    [pipeline],
  );

  const activeLeads = useMemo(
    () =>
      pipeline.new.length +
      pipeline.contacted.length +
      pipeline.viewing.length +
      pipeline.offer.length,
    [pipeline],
  );

  const listings = useMemo(() => (listingsData || []) as ListingItem[], [listingsData]);
  const activeListings = useMemo(
    () => listings.filter(listing => !['archived', 'draft'].includes(listing.status)),
    [listings],
  );

  const listingsById = useMemo(
    () => new Map(activeListings.map(listing => [listing.id, listing])),
    [activeListings],
  );

  const listingsTableRows = useMemo(() => {
    return [...activeListings]
      .sort((a, b) => b.enquiries - a.enquiries || b.views - a.views)
      .slice(0, 5);
  }, [activeListings]);

  const showings = (showingsData as ShowingItem[]).filter(
    showing => showing.status !== 'cancelled',
  );

  const showingsByDate = useMemo(() => {
    const grouped = new Map<string, ShowingItem[]>();

    for (const showing of showings) {
      const scheduled = getScheduleTime(showing);
      if (!scheduled) continue;

      const key = getDateKey(startOfDay(scheduled));
      const current = grouped.get(key) || [];
      current.push(showing);
      grouped.set(key, current);
    }

    for (const [, dayShowings] of grouped) {
      dayShowings.sort((left, right) => {
        const leftTime = getScheduleTime(left)?.getTime() || 0;
        const rightTime = getScheduleTime(right)?.getTime() || 0;
        return leftTime - rightTime;
      });
    }

    return grouped;
  }, [showings]);

  const selectedDayShowings = useMemo(() => {
    return showingsByDate.get(getDateKey(startOfDay(selectedDate))) || [];
  }, [selectedDate, showingsByDate]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const todaysShowings = useMemo(() => {
    return showingsByDate.get(getDateKey(today)) || [];
  }, [showingsByDate, today]);

  const upcomingShowings = useMemo(() => {
    return showings
      .filter(showing => {
        const scheduled = getScheduleTime(showing);
        return !!scheduled && scheduled.getTime() > new Date().getTime();
      })
      .sort((left, right) => {
        const leftTime = getScheduleTime(left)?.getTime() || 0;
        const rightTime = getScheduleTime(right)?.getTime() || 0;
        return leftTime - rightTime;
      })
      .slice(0, 3);
  }, [showings]);

  const unreadNotificationCount = notificationsData.length;
  const topAlerts = (notificationsData as NotificationItem[]).slice(0, 2);

  const pipelineLeadPreview = useMemo(() => {
    return [...allLeads]
      .filter(lead => getLeadStage(lead.status) !== 'closed')
      .sort((left, right) => {
        const leftTime = toDate(left.createdAt)?.getTime() || 0;
        const rightTime = toDate(right.createdAt)?.getTime() || 0;
        return rightTime - leftTime;
      })
      .slice(0, 3);
  }, [allLeads]);

  const additionalPipelineLeadCount = Math.max(activeLeads - pipelineLeadPreview.length, 0);

  const profileCompletionScore = onboarding?.agent?.profileCompletionScore ?? 0;
  const profileSetupFlags = onboarding?.agent?.profileCompletionFlags ?? [];
  const setupItemsRemaining = profileSetupFlags.length;

  const commissionGoal = useMemo(() => {
    const pending = stats?.commissionsPending ?? 0;
    if (pending <= 0) {
      return 150_000 * 100;
    }
    return Math.max(150_000 * 100, Math.ceil(pending / 0.56 / 100_000) * 100_000);
  }, [stats?.commissionsPending]);

  const commissionProgress =
    commissionGoal > 0
      ? Math.min(100, Math.round(((stats?.commissionsPending ?? 0) / commissionGoal) * 100))
      : 0;

  const heroMetrics = [
    {
      label: 'Pending Commission',
      value: formatCompactCommission(stats?.commissionsPending),
      status: 'Active',
      statusClassName:
        'border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] text-[var(--primary)]',
      icon: CircleDollarSign,
      iconShellClassName:
        'bg-[color:color-mix(in_oklab,var(--primary)_10%,white)] text-[var(--primary)]',
    },
    {
      label: 'Offers in Progress',
      value: statsLoading ? '-' : String(stats?.offersInProgress ?? 0),
      status: 'Pending',
      statusClassName: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: FileText,
      iconShellClassName: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Appointments Today',
      value: statsLoading ? '-' : String(stats?.showingsToday ?? todaysShowings.length),
      status: 'Scheduled',
      statusClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CalendarDays,
      iconShellClassName: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Unread Alerts',
      value: String(unreadNotificationCount),
      status: unreadNotificationCount > 0 ? 'Urgent' : 'Clear',
      statusClassName:
        unreadNotificationCount > 0
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-100 text-slate-700',
      icon: Bell,
      iconShellClassName:
        unreadNotificationCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600',
    },
  ];

  const selectedDateLabel = selectedDate.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const pageDateLabel = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Agent';
  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <main className="mx-auto flex max-w-[1700px] flex-col gap-5 px-4 py-5 md:px-7 md:py-7 xl:px-7 xl:pb-10">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <CardShell className="overflow-hidden border-transparent bg-gradient-to-br from-[var(--primary)] via-[var(--primary)] to-[#0b4b81] text-white shadow-[0_14px_42px_rgba(0,92,168,0.26)]">
            <div className="relative flex h-full flex-col justify-between gap-6 px-7 pb-6 pt-7">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-sm" />
              <div className="pointer-events-none absolute bottom-[-52px] left-8 h-32 w-32 rounded-full bg-white/8 blur-sm" />

              <div className="relative z-10 space-y-5">
                <div className="space-y-2">
                  <div className="space-y-2">
                    <h1 className="max-w-xl text-[28px] font-semibold tracking-[-0.04em] leading-[1.15] text-white">
                      Welcome back,
                      <span className="block text-white/92">{firstName}.</span>
                    </h1>
                    <p className="max-w-xl text-sm text-white/68 md:text-[15px]">
                      Here&apos;s your business snapshot for {pageDateLabel}.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      Alerts &amp; Reminders
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-white/72">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {topAlerts.length > 0 ? 'Live' : 'Quiet'}
                    </span>
                  </div>

                  {topAlerts.length > 0 ? (
                    topAlerts.map(alert => {
                      const Icon = getNotificationIcon(alert.type);
                      const badge = getNotificationBadge(alert.type);

                      return (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={() => setLocation('/agent/leads')}
                          className="flex w-full items-start gap-3 rounded-[9px] border border-white/14 bg-white/12 px-3 py-[10px] text-left transition hover:bg-white/18"
                        >
                          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/14 text-white">
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-white">
                              {alert.title}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-white/62">
                              {alert.content}
                            </span>
                            <span className="mt-2 inline-flex items-center gap-2 text-[11px] text-white/58">
                              {formatRelativeTime(alert.createdAt)}
                              <span
                                className={cn(
                                  'rounded-full border px-2 py-0.5 font-medium',
                                  badge.className,
                                )}
                              >
                                {badge.label}
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-[9px] border border-white/14 bg-white/10 px-4 py-4 text-sm text-white/70">
                      No unread alerts right now. Your follow-ups and showing updates will land
                      here.
                    </div>
                  )}
                </div>

                <div className="rounded-[9px] border border-white/14 bg-white/10 px-[14px] py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white/72">
                      Monthly Commission Goal
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {formatCommission(stats?.commissionsPending)}
                      <span className="ml-1 font-normal text-white/50">
                        / {formatCommission(commissionGoal)}
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/14">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-white/85 via-white to-[#cfe3f3]"
                      style={{ width: `${commissionProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-white/52">
                    <span>{commissionProgress}% of benchmark goal</span>
                    <span>{profileCompletionScore}% profile complete</span>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setLocation('/agent/setup')}
                className="relative z-10 inline-flex h-auto w-fit items-center gap-2 rounded-full border border-white/18 bg-white/14 px-4 py-2 text-[12.5px] font-medium text-white shadow-none backdrop-blur-sm hover:bg-white/22"
              >
                <CheckCircle2 className="h-4 w-4" />
                {onboarding?.recommendedNextStep === 'publish_profile'
                  ? 'Review profile'
                  : 'Finish setup'}
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-semibold text-[var(--primary)]">
                  {setupItemsRemaining}
                </span>
              </Button>
            </div>
          </CardShell>

          <CardShell className="px-[22px] py-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">
                  Today&apos;s Overview
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Live numbers across deals, appointments, and response load.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLocation('/agent/analytics')}
                className="h-auto rounded-full px-0 text-sm font-medium text-[var(--primary)] hover:bg-transparent hover:text-[var(--primary)]"
              >
                See all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_60px_80px] items-center gap-2 border-b border-slate-200 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              <span>Metric</span>
              <span className="text-right">Value</span>
              <span className="text-right">Status</span>
            </div>

            <div className="divide-y divide-slate-200">
              {heroMetrics.map(metric => {
                const Icon = metric.icon;

                return (
                  <div
                    key={metric.label}
                    className="grid grid-cols-[minmax(0,1fr)_60px_80px] items-center gap-2 py-[11px]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-[8px]',
                          metric.iconShellClassName,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {metric.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {metric.label === 'Unread Alerts'
                            ? 'Unread notifications needing action'
                            : metric.label === 'Appointments Today'
                              ? 'Showings booked for today'
                              : metric.label === 'Offers in Progress'
                                ? 'Negotiations still open'
                                : 'Awaiting payout'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[20px] font-semibold tracking-[-0.05em] text-slate-900">
                      {metric.value}
                    </div>
                    <div className="justify-self-end">
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-full border px-[10px] py-[3px] text-[11px] font-semibold',
                          metric.statusClassName,
                        )}
                      >
                        {metric.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardShell>
        </section>

        <section className="grid gap-[18px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <CardShell className="px-[22px] py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                    CRM Pulse
                  </p>
                  <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-slate-900">
                    Leads &amp; Pipeline
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation('/agent/leads')}
                  className="h-auto rounded-full px-0 text-sm font-medium text-[var(--primary)] hover:bg-transparent hover:text-[var(--primary)]"
                >
                  Work CRM
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 grid gap-[6px] md:grid-cols-5">
                {PIPELINE_CONFIG.map(stage => (
                  <div
                    key={stage.key}
                    className={cn(
                      'rounded-[9px] border px-3 py-[9px] transition duration-200 hover:-translate-y-0.5 hover:shadow-soft',
                      stage.shellClassName,
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', stage.dotClassName)} />
                        <span className="text-[11px] font-semibold text-slate-700">
                          {stage.label}
                        </span>
                      </div>
                      <span className="text-[18px] font-semibold tracking-[-0.05em] text-slate-900">
                        {pipeline[stage.key].length}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-[14px]">
                {pipelineLeadPreview.length > 0 ? (
                  <div className="divide-y divide-slate-200">
                    {pipelineLeadPreview.map(lead => {
                      const stage = getLeadStage(lead.status);
                      const initials = lead.name
                        .split(' ')
                        .map(part => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <div key={lead.id} className="flex items-center gap-3 py-[9px]">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#5a9bd6] to-[var(--primary)] text-[10px] font-semibold text-white shadow-[0_8px_24px_rgba(0,92,168,0.2)]">
                            {initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {lead.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {lead.property?.title || 'General inquiry'}
                              {lead.property?.city ? ` - ${lead.property.city}` : ''}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'rounded-full border px-[9px] py-[3px] text-[10px] font-semibold',
                              getLeadStageBadgeClass(stage),
                            )}
                          >
                            {PIPELINE_CONFIG.find(item => item.key === stage)?.label ||
                              formatStatus(lead.status)}
                          </Badge>
                        </div>
                      );
                    })}

                    {additionalPipelineLeadCount > 0 && (
                      <div className="flex items-center gap-3 py-[9px]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                          +{additionalPipelineLeadCount}
                        </span>
                        <p className="flex-1 text-sm text-slate-500">
                          {additionalPipelineLeadCount} more lead
                          {additionalPipelineLeadCount === 1 ? '' : 's'} in the pipeline
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setLocation('/agent/leads')}
                          className="h-auto rounded-full px-0 text-sm font-medium text-[var(--primary)] hover:bg-transparent hover:text-[var(--primary)]"
                        >
                          View all
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 px-5 py-8 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      No active leads in the pipeline yet.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      New inquiries will appear here as soon as they are assigned.
                    </p>
                  </div>
                )}
              </div>
            </CardShell>

            <CardShell className="px-[22px] py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                    Inventory Overview
                  </p>
                  <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-slate-900">
                    Active Listings
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation('/agent/listings')}
                  className="h-auto rounded-full px-0 text-sm font-medium text-[var(--primary)] hover:bg-transparent hover:text-[var(--primary)]"
                >
                  Manage all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              {listingsTableRows.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[760px] w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        <th className="pb-3 pr-4">Property</th>
                        <th className="pb-3 pr-4">Type</th>
                        <th className="pb-3 pr-4">Price</th>
                        <th className="pb-3 pr-4">Leads</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3">Listed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listingsTableRows.map(listing => {
                        const updatedDate = toDate(listing.updatedAt);

                        return (
                          <tr
                            key={listing.id}
                            className="border-b border-slate-100 last:border-b-0 hover:bg-[color:color-mix(in_oklab,var(--primary)_3%,white)]"
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <span className="flex h-8 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] text-[var(--primary)]">
                                  {listing.primaryImage ? (
                                    <img
                                      src={listing.primaryImage}
                                      alt={listing.title}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Home className="h-5 w-5" />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {listing.title}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">{listing.city}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-[13px] text-slate-600">
                              {formatPropertyType(listing.propertyType)}
                            </td>
                            <td className="py-3 pr-4 text-[13px] font-semibold text-slate-900">
                              {formatPrice(listing.price)}
                            </td>
                            <td className="py-3 pr-4 text-[13px] text-slate-600">
                              {listing.enquiries || 0} lead{listing.enquiries === 1 ? '' : 's'}
                            </td>
                            <td className="py-3 pr-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'rounded-full border px-[9px] py-[3px] text-[10.5px] font-semibold',
                                  getListingStatusBadgeClass(listing.status),
                                )}
                              >
                                {formatStatus(listing.status)}
                              </Badge>
                            </td>
                            <td className="py-3 text-[12px] text-slate-500">
                              {updatedDate
                                ? updatedDate.toLocaleDateString('en-ZA', {
                                    day: 'numeric',
                                    month: 'short',
                                  })
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 px-5 py-8 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    You do not have active listings yet.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Publish a property to start tracking leads, offers, and appointments here.
                  </p>
                </div>
              )}
            </CardShell>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <CardShell className="px-[22px] py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                    Calendar View
                  </p>
                  <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.03em] text-slate-900">
                    Schedule
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation('/agent/productivity')}
                  className="h-auto rounded-full px-0 text-sm font-medium text-[var(--primary)] hover:bg-transparent hover:text-[var(--primary)]"
                >
                  Full calendar
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4">
                <div className="mb-[10px] flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-slate-900">
                    {calendarMonth.toLocaleDateString('en-ZA', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(currentMonth => addMonths(currentMonth, -1))}
                      className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-slate-200 bg-white text-slate-500 transition hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:text-[var(--primary)]"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(currentMonth => addMonths(currentMonth, 1))}
                      className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-slate-200 bg-white text-slate-500 transition hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:text-[var(--primary)]"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-[2px]">
                  {DAY_LABELS.map(dayLabel => (
                    <span
                      key={dayLabel}
                      className="pb-1 text-center text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                    >
                      {dayLabel}
                    </span>
                  ))}

                  {buildCalendarDays(calendarMonth).map((date, index) => {
                    if (!date) {
                      return <span key={`empty-${index}`} className="h-9 rounded-lg" />;
                    }

                    const dateKey = getDateKey(startOfDay(date));
                    const hasEvents = (showingsByDate.get(dateKey) || []).length > 0;
                    const isToday = sameDay(date, today);
                    const isSelected = sameDay(date, selectedDate);

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          'relative flex h-8 items-center justify-center rounded-[6px] text-[11.5px] transition',
                          isSelected
                            ? 'bg-[var(--primary)] font-semibold text-white shadow-[0_10px_24px_rgba(0,92,168,0.22)]'
                            : isToday
                              ? 'border border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] font-semibold text-[var(--primary)]'
                              : 'text-slate-600 hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-[var(--primary)]',
                        )}
                      >
                        {date.getDate()}
                        {hasEvents && (
                          <span
                            className={cn(
                              'absolute bottom-1.5 h-1 w-1 rounded-full',
                              isSelected ? 'bg-white' : 'bg-[var(--primary)]',
                            )}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 h-px bg-slate-200" />

              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {sameDay(selectedDate, today)
                    ? `Today - ${selectedDateLabel}`
                    : selectedDateLabel}
                </p>
                <div className="mt-3 space-y-[7px]">
                  {selectedDayShowings.length > 0 ? (
                    selectedDayShowings.map(showing => {
                      const scheduled = getScheduleTime(showing);
                      const listing = showing.listingId
                        ? listingsById.get(showing.listingId)
                        : undefined;

                      return (
                        <div
                          key={showing.id}
                          className={cn(
                            'flex items-start gap-3 rounded-[9px] border px-3 py-[10px]',
                            showing.status === 'completed'
                              ? 'border-emerald-200 bg-emerald-50/70'
                              : 'border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)]',
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-8 w-8 flex-shrink-0 flex-col items-center justify-center rounded-[7px] text-[9.5px] font-semibold leading-tight',
                              showing.status === 'completed'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[var(--primary)] text-white',
                            )}
                          >
                            <span>
                              {scheduled
                                ? scheduled.toLocaleTimeString('en-ZA', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })
                                : 'TBD'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {listing?.title || `Viewing #${showing.id}`}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {showing.visitorName || 'Prospective client'}
                            </p>
                            {listing?.city && (
                              <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                                <MapPin className="h-3 w-3" />
                                {listing.city}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'rounded-full border px-[9px] py-[3px] text-[9.5px] font-semibold',
                              getShowingBadgeClass(showing.status),
                            )}
                          >
                            {formatStatus(showing.status)}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 px-4 py-5 text-sm text-slate-500">
                      No appointments scheduled for this day.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-[14px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Upcoming
                </p>
                <div className="mt-3 space-y-[7px]">
                  {upcomingShowings.length > 0 ? (
                    upcomingShowings.map(showing => {
                      const scheduled = getScheduleTime(showing);
                      const listing = showing.listingId
                        ? listingsById.get(showing.listingId)
                        : undefined;

                      return (
                        <div
                          key={`upcoming-${showing.id}`}
                          className="flex items-center gap-3 rounded-[9px] border border-slate-200 bg-slate-50/80 px-3 py-[9px]"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 flex-col items-center justify-center rounded-[7px] bg-white text-[9.5px] font-semibold text-slate-600 shadow-sm">
                            <span>
                              {scheduled
                                ? scheduled.toLocaleDateString('en-ZA', { weekday: 'short' })
                                : 'TBD'}
                            </span>
                            <span>
                              {scheduled
                                ? scheduled.toLocaleDateString('en-ZA', { day: 'numeric' })
                                : '--'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {listing?.title || `Viewing #${showing.id}`}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {scheduled
                                ? `${scheduled.toLocaleTimeString('en-ZA', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}${listing?.city ? ` - ${listing.city}` : ''}`
                                : 'Time to be confirmed'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 px-4 py-5 text-sm text-slate-500">
                      No upcoming appointments in this calendar view.
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/agent/productivity')}
                className="mt-3 h-10 w-full rounded-[9px] border-dashed border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-transparent text-[12px] font-medium text-[var(--primary)] hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-[var(--primary)]"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add new appointment
              </Button>
            </CardShell>
          </div>
        </section>
      </main>
    </div>
  );
}
