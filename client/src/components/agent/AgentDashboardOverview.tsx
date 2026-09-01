import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { AgentPresenceProof } from '@/components/agent/AgentPresenceProof';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Home,
  Lock,
  MapPin,
  X,
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
  commercial?: {
    listingTitle: string;
    spaceIdentifier: string;
    useType: string;
    city: string | null;
    province: string | null;
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
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type AuthoredListingItem = {
  id: number;
  title: string;
  status: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type ShowingItem = {
  id: number;
  listingId?: number | null;
  visitorName?: string | null;
  status: string;
  scheduledAt?: string | Date;
};

type AgentDashboardEntitlements = {
  trialExpired: boolean;
  canPublishListings: boolean;
  canReceiveLeads: boolean;
  canAppearInDirectory: boolean;
  trialStatusDetail: {
    status: 'active' | 'expired' | 'none';
    trialEndsAt: string | null;
    daysRemaining: number | null;
  };
  featureFlags: {
    maxActiveListings: number;
    hasAiInsights: boolean;
    hasAreaIntelligence: boolean;
    hasCommissionTracking: boolean;
    hasRevenueDashboard: boolean;
    hasTeamDashboard: boolean;
    hasRecruitmentFunnel: boolean;
    hasBenchmarking: boolean;
    hasPriorityExposure: boolean;
  };
};

type AgentDashboardOnboardingStatus = {
  packageSelected: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  onboardingStep: number;
  onboardingComplete: boolean;
  fullFeaturesUnlocked: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  profile: {
    slug: string;
  } | null;
  profileCompletionScore: number;
  profileCompletionFlags: string[];
  entitlements: AgentDashboardEntitlements;
};

type DashboardGuidanceMode = 'setup';

const GUIDANCE_STORAGE_KEY = 'agent-dashboard-guidance-dismissed';
const SETUP_GUIDANCE_SNOOZE_MS = 24 * 60 * 60 * 1000;

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

function formatStatus(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function isActiveListingStatus(value: string | null | undefined): boolean {
  const normalized = String(value || '').toLowerCase();
  return ['available', 'published', 'active'].includes(normalized);
}

function formatPropertyType(value: string | null | undefined): string {
  if (!value) return 'Property';
  return formatStatus(value);
}

function getScheduleTime(showing: ShowingItem): Date | null {
  return toDate(showing.scheduledAt);
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
    case 'pending_review':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'sold':
    case 'rented':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    default:
      return 'border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] text-[var(--primary)]';
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

function formatSetupFlag(flag: string): string {
  return flag
    .replace(/^missing_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function FeatureLockOverlay({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[15px] bg-white/88 p-6 backdrop-blur-[2px]">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <Button className="mt-5 rounded-full px-5" onClick={onAction}>
          {actionLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function getGuidanceSnoozeMs(mode: DashboardGuidanceMode | null) {
  if (mode === 'setup') return SETUP_GUIDANCE_SNOOZE_MS;
  return 0;
}

export function AgentDashboardOverview() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [onboardingStatus, setOnboardingStatus] = useState<AgentDashboardOnboardingStatus | null>(
    null,
  );
  const [dismissedGuidance, setDismissedGuidance] = useState<{
    signature: string;
    dismissedAt: number;
  } | null>(null);

  const { data: stats, isLoading: statsLoading } = trpc.agent.getDashboardStats.useQuery(
    undefined,
    {
      retry: false,
    },
  );
  const recordSurfaceView = trpc.agent.recordSurfaceView.useMutation();
  useEffect(() => {
    recordSurfaceView.mutate({ surface: 'dashboard' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: pipelineData } = trpc.agent.getLeadsPipeline.useQuery(
    { filters: {} },
    { retry: false },
  );

  const { data: listingsData } = trpc.agent.getMyListings.useQuery(
    { status: 'all', limit: 24 },
    { retry: false },
  );

  // Published inventory is intentionally projected into `properties`, while
  // drafts and submitted listings remain in the canonical Listing lifecycle.
  // Read both surfaces so the agent dashboard can acknowledge work that is
  // complete and awaiting review instead of treating the agent as brand new.
  const { data: authoredListingsData, isLoading: authoredListingsLoading } =
    trpc.listing.myListings.useQuery(
      { limit: 24, offset: 0 },
      { retry: false, enabled: Boolean(user) },
    );

  useEffect(() => {
    let cancelled = false;

    const loadOnboardingStatus = async () => {
      try {
        const result = await apiFetch<AgentDashboardOnboardingStatus>('/agent/onboarding-status');
        if (!cancelled) {
          setOnboardingStatus(result);
        }
      } catch {
        if (!cancelled) {
          setOnboardingStatus(null);
        }
      }
    };

    void loadOnboardingStatus();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const activeListings = useMemo(
    () =>
      ((listingsData || []) as ListingItem[]).filter(listing =>
        isActiveListingStatus(listing.status),
      ),
    [listingsData],
  );

  const authoredListings = useMemo(
    () => (authoredListingsData || []) as AuthoredListingItem[],
    [authoredListingsData],
  );

  const pendingReviewListings = useMemo(
    () => authoredListings.filter(listing => listing.status === 'pending_review'),
    [authoredListings],
  );

  const draftListings = useMemo(
    () => authoredListings.filter(listing => listing.status === 'draft'),
    [authoredListings],
  );

  const latestPendingReviewListing = useMemo(
    () =>
      [...pendingReviewListings].sort(
        (left, right) =>
          (toDate(right.updatedAt ?? right.createdAt)?.getTime() || 0) -
          (toDate(left.updatedAt ?? left.createdAt)?.getTime() || 0),
      )[0] || null,
    [pendingReviewListings],
  );

  const latestDraftListing = useMemo(
    () =>
      [...draftListings].sort(
        (left, right) =>
          (toDate(right.updatedAt ?? right.createdAt)?.getTime() || 0) -
          (toDate(left.updatedAt ?? left.createdAt)?.getTime() || 0),
      )[0] || null,
    [draftListings],
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

  const entitlements = onboardingStatus?.entitlements;
  const profileCompletionScore = onboardingStatus?.profileCompletionScore ?? 0;
  const profileSetupFlags = onboardingStatus?.profileCompletionFlags ?? [];
  const fullFeaturesUnlocked = onboardingStatus?.fullFeaturesUnlocked ?? false;
  const needsProfileCompletion = !fullFeaturesUnlocked;
  const canPublishListings = entitlements?.canPublishListings ?? false;
  const trialExpired = entitlements?.trialExpired ?? false;
  const setupPriorityFlags = profileSetupFlags.slice(0, 3).map(formatSetupFlag);
  const guidanceMode: DashboardGuidanceMode | null = needsProfileCompletion ? 'setup' : null;
  const guidanceSignature = JSON.stringify({
    mode: guidanceMode,
    onboardingStep: onboardingStatus?.onboardingStep ?? 0,
    profileCompletionScore,
    profileSetupFlags,
  });
  const guidanceSnoozeMs = getGuidanceSnoozeMs(guidanceMode);
  const guidanceDismissed =
    guidanceMode != null &&
    dismissedGuidance?.signature === guidanceSignature &&
    Date.now() - dismissedGuidance.dismissedAt < guidanceSnoozeMs;
  const showFeatureBanner = Boolean(onboardingStatus) && guidanceMode != null && !guidanceDismissed;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(GUIDANCE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { signature?: string; dismissedAt?: number };
      if (typeof parsed?.signature === 'string' && typeof parsed?.dismissedAt === 'number') {
        setDismissedGuidance({
          signature: parsed.signature,
          dismissedAt: parsed.dismissedAt,
        });
      }
    } catch {
      // Ignore corrupt local state and fall back to visible guidance.
    }
  }, []);

  const dismissGuidance = () => {
    if (typeof window === 'undefined' || !guidanceMode) return;
    const next = {
      signature: guidanceSignature,
      dismissedAt: Date.now(),
    };
    setDismissedGuidance(next);
    window.localStorage.setItem(GUIDANCE_STORAGE_KEY, JSON.stringify(next));
  };

  const activeListingCount = stats?.activeListings ?? activeListings.length;
  const pendingReviewCount = pendingReviewListings.length;
  const draftCount = draftListings.length;

  const heroMetrics = [
    {
      label: 'Active Listings',
      value: statsLoading ? '-' : String(activeListingCount),
      status:
        activeListingCount > 0
          ? 'Published'
          : authoredListingsLoading
            ? 'Loading'
            : pendingReviewCount > 0
              ? `${pendingReviewCount} in review`
              : 'Start',
      statusClassName:
        activeListingCount > 0
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : pendingReviewCount > 0
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-slate-200 bg-slate-100 text-slate-700',
      icon: Building2,
      iconShellClassName:
        'bg-[color:color-mix(in_oklab,var(--primary)_10%,white)] text-[var(--primary)]',
    },
    {
      label: 'Appointments Today',
      value: statsLoading ? '-' : String(stats?.showingsToday ?? todaysShowings.length),
      status: (stats?.showingsToday ?? todaysShowings.length) > 0 ? 'Booked' : 'None',
      statusClassName:
        (stats?.showingsToday ?? todaysShowings.length) > 0
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-100 text-slate-700',
      icon: CalendarDays,
      iconShellClassName: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Unread Alerts',
      value: String(unreadNotificationCount),
      status: unreadNotificationCount > 0 ? 'Unread' : 'Clear',
      statusClassName:
        unreadNotificationCount > 0
          ? 'border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] text-[var(--primary)]'
          : 'border-slate-200 bg-slate-100 text-slate-700',
      icon: Bell,
      iconShellClassName:
        unreadNotificationCount > 0
          ? 'bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] text-[var(--primary)]'
          : 'bg-slate-100 text-slate-600',
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
  const publicProfileHref = onboardingStatus?.profile?.slug
    ? `/agents/${onboardingStatus.profile.slug}`
    : '/agent/settings';
  const publicProfileLabel = onboardingStatus?.profile?.slug
    ? 'View public profile'
    : 'Review your profile';
  const hasPublishedInventory = activeListings.length > 0;
  const hasPendingReviewInventory = pendingReviewCount > 0;
  const hasDraftInventory = draftCount > 0;
  const workspaceAction = !canPublishListings
    ? {
        eyebrow: 'Workspace readiness',
        title: needsProfileCompletion
          ? 'Finish setting up your professional presence.'
          : 'Your workspace is not ready to publish yet.',
        description: needsProfileCompletion
          ? 'Complete the remaining profile details so you can publish inventory and start building your pipeline.'
          : trialExpired
            ? 'Your access period has ended. Review your access to continue working with listings and leads.'
            : 'Review your profile and activation status before you start publishing inventory.',
        actionLabel: needsProfileCompletion ? 'Continue setup' : 'Review access',
        actionHref: needsProfileCompletion ? '/agent/setup' : '/agent/settings',
      }
    : !hasPublishedInventory && hasPendingReviewInventory
      ? {
          eyebrow: 'Listing submitted',
          title:
            pendingReviewCount === 1
              ? 'Your first listing is in review.'
              : `${pendingReviewCount} listings are in review.`,
          description: latestPendingReviewListing
            ? `${latestPendingReviewListing.title} is complete and waiting for Property Listify review. We will notify you when it is ready to go live.`
            : 'Your completed listing is waiting for Property Listify review. We will notify you when it is ready to go live.',
          actionLabel: 'View review status',
          actionHref: '/agent/listings?tab=pending',
        }
      : !hasPublishedInventory && hasDraftInventory
        ? {
            eyebrow: 'Listing in progress',
            title: 'Continue your listing draft.',
            description: latestDraftListing
              ? `${latestDraftListing.title} is saved as a private draft. Finish the remaining details when you are ready to submit it for review.`
              : 'Your listing draft is saved privately. Finish the remaining details when you are ready to submit it for review.',
            actionLabel: 'Continue draft',
            actionHref: '/agent/listings?tab=draft',
          }
        : !hasPublishedInventory
      ? {
          eyebrow: 'Launch your business',
          title: 'Get your first property live.',
          description:
            'Your Agent workspace is ready. Publishing a listing is the first step towards discovery, enquiries and a working pipeline.',
          actionLabel: 'Add your first listing',
          actionHref: '/listings/create',
        }
      : activeLeads > 0
        ? {
            eyebrow: 'Today’s priority',
            title: `${activeLeads} lead${activeLeads === 1 ? '' : 's'} ready for follow-up.`,
            description:
              'Keep the conversation moving while the enquiry and property context are still fresh.',
            actionLabel: 'Work your leads',
            actionHref: '/agent/leads',
          }
        : todaysShowings.length > 0
          ? {
              eyebrow: 'Today’s priority',
              title: `${todaysShowings.length} showing${todaysShowings.length === 1 ? '' : 's'} on your calendar.`,
              description:
                'Review the schedule, prepare the property context and keep the next conversation on track.',
              actionLabel: 'Open your calendar',
              actionHref: '/agent/productivity',
            }
          : {
              eyebrow: 'Keep momentum',
              title: 'Keep your business moving.',
              description:
                'Your inventory is live. Add another property, review your public presence or prepare your next follow-up.',
              actionLabel: 'Add another listing',
              actionHref: '/listings/create',
            };
  const showLaunchSteps =
    canPublishListings && !hasPublishedInventory && !hasPendingReviewInventory && !hasDraftInventory;
  const showReviewSteps = canPublishListings && !hasPublishedInventory && hasPendingReviewInventory;
  const workspaceJourneyLabel = showLaunchSteps
    ? 'Your launch path'
    : showReviewSteps
      ? 'Your review path'
      : 'Your operating loop';
  const workspaceJourneySteps = showLaunchSteps
    ? [
        {
          label: 'Publish your first listing',
          detail: 'Give people something to discover.',
        },
        {
          label: 'Receive enquiries',
          detail: 'Keep interest tied to the property.',
        },
        {
          label: 'Work your pipeline',
          detail: 'Turn the next conversation into progress.',
        },
      ]
    : showReviewSteps
      ? [
          {
            label: 'Listing submitted',
            detail: 'Your property is complete and awaiting review.',
          },
          {
            label: 'Review in progress',
            detail: 'We will let you know if anything needs attention.',
          },
          {
            label: 'Ready for enquiries',
            detail: 'Once approved, people can discover and contact you.',
          },
        ]
      : [
          {
            label: 'Keep inventory current',
            detail: 'Make every live property easy to discover.',
          },
          {
            label: 'Respond while interest is fresh',
            detail: 'Keep each enquiry connected to its property.',
          },
          {
            label: 'Plan the next conversation',
            detail: 'Use your calendar and pipeline to keep momentum.',
          },
        ];
  const workspaceJourneyFooter = showLaunchSteps
    ? 'Start with the first property; the rest of your workspace opens around it.'
    : showReviewSteps
      ? 'Your completed listing is in the review queue. We will notify you when it is ready to go live.'
      : 'Your workspace keeps inventory, enquiries and the working day connected.';

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <main className="mx-auto flex max-w-[1700px] flex-col gap-5 px-4 py-5 md:px-7 md:py-7 xl:px-7 xl:pb-10">
        {showFeatureBanner ? (
          <CardShell className="overflow-hidden border-transparent bg-gradient-to-r from-slate-950 via-slate-900 to-[#0f4c81] text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:px-7">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Workspace setup
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={dismissGuidance}
                    className="h-8 w-8 rounded-full border border-white/10 bg-white/6 text-white/72 hover:bg-white/12 hover:text-white"
                    aria-label="Dismiss dashboard guidance"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.04em] text-white">
                  Finish the last profile details before you put your work live.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
                  Your profile is {profileCompletionScore}% complete. Add the remaining professional
                  details so your listings, directory presence and operating workspace can work
                  together.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {setupPriorityFlags.map(flag => (
                    <Badge
                      key={flag}
                      variant="outline"
                      className="rounded-full border-white/14 bg-white/8 px-3 py-1 text-[11px] font-medium text-white/78"
                    >
                      Add {flag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/12 bg-white/8 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/52">
                  Recommended next step
                </p>
                <p className="mt-2 text-lg font-semibold text-white">Finish your profile setup</p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Complete the remaining items, then come back here to list, receive enquiries and
                  manage the day from one place.
                </p>
                <Button
                  type="button"
                  onClick={() => setLocation('/agent/setup')}
                  className="mt-5 rounded-full bg-white text-slate-950 hover:bg-white/92"
                >
                  Continue setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardShell>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <CardShell className="overflow-hidden border-transparent bg-gradient-to-br from-[var(--primary)] via-[var(--primary)] to-[#0b4b81] text-white shadow-[0_14px_42px_rgba(0,92,168,0.26)]">
            <div className="relative grid h-full gap-6 px-7 py-7 lg:grid-cols-[minmax(0,1fr)_210px]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-sm" />
              <div className="pointer-events-none absolute bottom-[-52px] left-8 h-32 w-32 rounded-full bg-white/8 blur-sm" />

              <div className="relative z-10 flex min-w-0 flex-col justify-between gap-7">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    {workspaceAction.eyebrow} · {firstName} · {pageDateLabel}
                  </p>
                  <h1 className="max-w-2xl text-[30px] font-semibold tracking-[-0.045em] leading-[1.1] text-white md:text-[34px]">
                    {workspaceAction.title}
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-white/72 md:text-[15px]">
                    {workspaceAction.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => setLocation(workspaceAction.actionHref)}
                    className="h-auto rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--primary)] shadow-none hover:bg-white/92"
                  >
                    {workspaceAction.actionLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setLocation(publicProfileHref)}
                    className="h-auto rounded-full border border-white/18 bg-white/10 px-4 py-2 text-[12.5px] font-medium text-white hover:bg-white/18 hover:text-white"
                  >
                    {publicProfileLabel}
                  </Button>
                </div>
              </div>

              <div className="relative z-10 flex min-w-0 flex-col rounded-[18px] border border-white/14 bg-slate-950/10 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/58">
                  {workspaceJourneyLabel}
                </p>
                <div className="mt-4 flex flex-1 flex-col justify-center gap-2.5">
                  {workspaceJourneySteps.map((step, index) => (
                    <div
                      key={step.label}
                      className="flex gap-2.5 rounded-xl border border-white/10 bg-white/[0.07] p-3"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/14 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold leading-4 text-white">
                          {step.label}
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-white/62">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-4 text-white/58">
                  {workspaceJourneyFooter}
                </p>
              </div>
            </div>
          </CardShell>

          <div className="flex min-w-0 flex-col gap-4">
            {onboardingStatus?.approvalStatus === 'approved' && <AgentPresenceProof />}

            <CardShell className="px-[22px] py-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">
                    Today&apos;s operating pulse
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Current numbers across inventory, showings and notifications.
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

              {!showFeatureBanner && !fullFeaturesUnlocked ? (
                <div className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Finish setup to unlock your full reporting.</p>
                      <p className="mt-1 text-sm text-amber-800">
                        Complete the remaining profile steps to unlock the full reporting layer.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation('/agent/setup')}
                      className="rounded-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                    >
                      Finish setup
                    </Button>
                  </div>
                </div>
              ) : null}

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
                              ? 'Unread notifications'
                              : metric.label === 'Appointments Today'
                                ? 'Showings booked for today'
                                : 'Currently published inventory'}
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
          </div>
        </section>

        <section className="grid gap-[18px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <CardShell className="relative px-[22px] py-5">
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
                              {lead.commercial?.listingTitle ||
                                lead.property?.title ||
                                'General inquiry'}
                              {lead.commercial?.city || lead.property?.city
                                ? ` - ${lead.commercial?.city || lead.property?.city}`
                                : ''}
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
                        const listedDate = toDate(listing.createdAt ?? listing.updatedAt);

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
                              {listedDate
                                ? listedDate.toLocaleDateString('en-ZA', {
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
                  {hasPendingReviewInventory ? (
                    <>
                      <Badge
                        variant="outline"
                        className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-[10.5px] font-semibold text-amber-700"
                      >
                        {pendingReviewCount} in review
                      </Badge>
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        {pendingReviewCount === 1
                          ? 'Your first listing is complete and in review.'
                          : `${pendingReviewCount} completed listings are in review.`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {latestPendingReviewListing
                          ? `${latestPendingReviewListing.title} will appear here as active inventory once it is approved.`
                          : 'Your completed listing will appear here as active inventory once it is approved.'}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation('/agent/listings?tab=pending')}
                        className="mt-4 rounded-full border-amber-300 bg-white text-amber-800 hover:bg-amber-50 hover:text-amber-900"
                      >
                        View review status
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </>
                  ) : hasDraftInventory ? (
                    <>
                      <p className="text-sm font-medium text-slate-700">
                        {draftCount === 1
                          ? 'You have a listing draft in progress.'
                          : `You have ${draftCount} listing drafts in progress.`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {latestDraftListing
                          ? `${latestDraftListing.title} is saved privately until you are ready to submit it for review.`
                          : 'Your draft is saved privately until you are ready to submit it for review.'}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation('/agent/listings?tab=draft')}
                        className="mt-4 rounded-full border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-white text-[var(--primary)] hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-[var(--primary)]"
                      >
                        Continue draft
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-700">
                        You do not have active listings yet.
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Publish a property to start tracking leads, offers, and appointments here.
                      </p>
                      {canPublishListings ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setLocation('/listings/create')}
                          className="mt-4 rounded-full border-[color:color-mix(in_oklab,var(--primary)_24%,white)] bg-white text-[var(--primary)] hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-[var(--primary)]"
                        >
                          Add your first listing
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              )}

              {!canPublishListings ? (
                <FeatureLockOverlay
                  title="Listing publishing is still locked"
                  description={
                    profileCompletionScore < 70
                      ? 'Reach 70% profile completion to publish listings, unlock stronger visibility, and open your full inventory workflow.'
                      : trialExpired
                        ? 'Your trial access has expired. Review your package to restore publishing access.'
                        : 'Your current access does not include listing publishing yet.'
                  }
                  actionLabel={profileCompletionScore < 70 ? 'Finish setup' : 'Review access'}
                  onAction={() =>
                    setLocation(profileCompletionScore < 70 ? '/agent/setup' : '/agent/settings')
                  }
                />
              ) : null}
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
                  {DAY_LABELS.map((dayLabel, index) => (
                    <span
                      key={`${dayLabel}-${index}`}
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
