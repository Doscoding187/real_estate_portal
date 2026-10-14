import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { AgentPresenceProof } from '@/components/agent/AgentPresenceProof';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import {
  getAgentJourneyAction,
  getAgentProfileCompletionDescription,
  isAgentProfileJourneyStep,
} from '@/lib/agentJourney';
import { ArrowRight, Building2, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';

type Stage = 'new' | 'contacted' | 'viewing' | 'offer' | 'closed';
type Lead = {
  id: number;
  name: string;
  status: string;
  createdAt: string | Date;
  property?: { id: number; title: string; city: string } | null;
  commercial?: { listingTitle: string; city: string | null } | null;
};
type Listing = {
  id: number;
  title: string;
  city: string;
  price: number;
  status: string;
  enquiries?: number;
  primaryImage?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};
type AuthoredListing = {
  id: number;
  title: string;
  status: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};
type Showing = {
  id: number;
  propertyId?: number | null;
  listingId?: number | null;
  status: string;
  scheduledAt?: string | Date;
  property?: { title?: string } | null;
  client?: { name?: string } | null;
};
const stages: Array<{ key: Stage; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'viewing', label: 'Viewing' },
  { key: 'offer', label: 'Offer' },
  { key: 'closed', label: 'Closed' },
];
const emptyPipeline: Record<Stage, Lead[]> = {
  new: [],
  contacted: [],
  viewing: [],
  offer: [],
  closed: [],
};
const panelClass =
  'min-w-0 rounded-2xl border border-border bg-card text-card-foreground shadow-sm';
const actionClass =
  'inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';

function toDate(value: string | Date | undefined) {
  if (!value) return null;
  const normalized =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value)
      ? value.replace(' ', 'T')
      : value;
  const timestampValue =
    typeof normalized === 'string' &&
    normalized.includes('T') &&
    !/(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
      ? `${normalized}Z`
      : normalized;
  const date = new Date(timestampValue);
  return Number.isNaN(date.getTime()) ? null : date;
}
function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
function formatStatus(status: string) {
  if (['available', 'published', 'active'].includes(status)) return 'Published';
  if (status === 'pending_review') return 'Awaiting moderation';
  return status.replace(/_/g, ' ').replace(/\b\w/g, value => value.toUpperCase());
}
function formatPrice(price: number) {
  return price > 0
    ? new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        maximumFractionDigits: 0,
      }).format(price)
    : 'Price not supplied';
}
function timestamp(item: { updatedAt?: string | Date; createdAt?: string | Date }) {
  return toDate(item.updatedAt ?? item.createdAt)?.getTime() || 0;
}
function Panel({
  title,
  action,
  children,
  testId,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section className={panelClass} data-testid={testId} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="px-4 py-3 sm:px-5">{children}</div>
    </section>
  );
}
function RequestState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: boolean;
  retry: () => unknown;
  children: ReactNode;
}) {
  if (error)
    return (
      <div role="alert" className="py-3 text-sm">
        <p>We couldn’t load this information.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void retry()}>
          Try again
        </Button>
      </div>
    );
  if (loading)
    return (
      <div role="status" aria-label="Loading dashboard information" className="space-y-3 py-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  return <>{children}</>;
}

export function AgentDashboardOverview({
  onboardingStatus,
  agentLaunchAccessAvailable = false,
}: {
  onboardingStatus: AgentOnboardingStatus;
  agentLaunchAccessAvailable?: boolean;
}) {
  const { user } = useAuth();
  const operationalDataEnabled = Boolean(onboardingStatus.fullFeaturesUnlocked);
  const authoredListingDataEnabled = Boolean(user && onboardingStatus.dashboardUnlocked);
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const statsQuery = trpc.agent.getDashboardStats.useQuery(undefined, {
    enabled: operationalDataEnabled,
    retry: false,
  });
  const recordSurfaceView = trpc.agent.recordSurfaceView.useMutation();
  useEffect(() => {
    recordSurfaceView.mutate({ surface: 'dashboard' });
    // Preserve the existing one-time dashboard telemetry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pipelineQuery = trpc.agent.getLeadsPipeline.useQuery(
    { filters: {} },
    { enabled: operationalDataEnabled, retry: false },
  );
  const listingsQuery = trpc.agent.getMyListings.useQuery(
    { status: 'all', limit: 24 },
    { enabled: operationalDataEnabled, retry: false },
  );
  const authoredQuery = trpc.listing.myListings.useQuery(
    { limit: 24, offset: 0 },
    { retry: false, enabled: authoredListingDataEnabled },
  );
  const calendarRange = useMemo(
    () => ({
      startDate: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
        .toISOString()
        .split('T')[0],
      endDate: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0],
    }),
    [calendarMonth],
  );
  const showingsQuery = trpc.agent.getMyShowings.useQuery(
    { ...calendarRange, status: 'all' },
    { enabled: operationalDataEnabled, retry: false },
  );
  const notificationsQuery = trpc.agent.getNotifications.useQuery(
    { limit: 8, unreadOnly: true },
    { enabled: operationalDataEnabled, retry: false },
  );

  const pipeline = (pipelineQuery.data || emptyPipeline) as Record<Stage, Lead[]>;
  const activeListings = ((listingsQuery.data || []) as Listing[]).filter(item =>
    ['available', 'published', 'active'].includes(item.status),
  );
  const authored = (authoredQuery.data || []) as AuthoredListing[];
  const drafts = authored
    .filter(item => item.status === 'draft')
    .sort((a, b) => timestamp(b) - timestamp(a));
  const pending = authored
    .filter(item => item.status === 'pending_review')
    .sort((a, b) => timestamp(b) - timestamp(a));
  const newLeads = [...pipeline.new].sort(
    (a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0),
  );
  const otherActiveLeads = [...pipeline.contacted, ...pipeline.viewing, ...pipeline.offer].sort(
    (a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0),
  );
  const previewLeads = [...newLeads, ...otherActiveLeads].slice(0, 3);
  const listingsByPropertyId = new Map(activeListings.map(item => [item.id, item]));
  const now = new Date();
  // This endpoint supplies booked property showings for the selected month, not all appointments.
  const scheduledShowings = ((showingsQuery.data || []) as Showing[]).filter(
    item => item.status === 'scheduled' && toDate(item.scheduledAt),
  );
  const todayShowings = scheduledShowings.filter(item => sameDay(toDate(item.scheduledAt)!, now));
  const upcomingShowings = scheduledShowings.filter(
    item =>
      !sameDay(toDate(item.scheduledAt)!, now) &&
      toDate(item.scheduledAt)!.getTime() > now.getTime(),
  );
  const schedulePreview = [...todayShowings, ...upcomingShowings]
    .sort((a, b) => toDate(a.scheduledAt)!.getTime() - toDate(b.scheduledAt)!.getTime())
    .slice(0, 3);
  const monthLabel = calendarMonth.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  const monthIsCurrent = sameDay(calendarMonth, new Date(now.getFullYear(), now.getMonth(), 1));
  const canPublishListings = onboardingStatus.entitlements?.canPublishListings ?? false;
  const needsProfile = isAgentProfileJourneyStep(onboardingStatus);
  const journeyAction = getAgentJourneyAction(onboardingStatus, { agentLaunchAccessAvailable });
  const inventoryLoading =
    authoredQuery.isLoading || (operationalDataEnabled && listingsQuery.isLoading);
  const inventoryError = authoredQuery.isError || (operationalDataEnabled && listingsQuery.isError);
  const hasPublished = activeListings.length > 0 || (statsQuery.data?.activeListings ?? 0) > 0;
  const hasExistingWork =
    authored.length > 0 ||
    ((listingsQuery.data || []) as Listing[]).length > 0 ||
    stages.some(stage => pipeline[stage.key].length > 0);
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Agent';
  const profileHref = onboardingStatus.profile?.slug
    ? `/agents/${onboardingStatus.profile.slug}`
    : '/agent/settings';
  const guidance = !canPublishListings
    ? {
        title: needsProfile ? 'Complete your professional profile' : journeyAction.title,
        description: needsProfile
          ? getAgentProfileCompletionDescription({ agentLaunchAccessAvailable })
          : journeyAction.description,
        label: journeyAction.waiting ? null : needsProfile ? 'Continue setup' : journeyAction.label,
        href: journeyAction.waiting ? null : needsProfile ? '/agent/setup' : journeyAction.href,
      }
    : inventoryError
      ? {
          title: 'Your listing status is unavailable',
          description: 'Try loading your inventory again before choosing your next listing step.',
          label: 'Open listings',
          href: '/agent/listings',
        }
      : inventoryLoading
        ? null
        : !hasPublished && pending.length > 0
          ? {
              title:
                pending.length === 1
                  ? 'Your first listing is in review'
                  : `${pending.length} listings are in review`,
              description: `${pending[0].title} is awaiting moderation. Approval is required before it appears as published inventory.`,
              label: 'View review status',
              href: '/agent/listings?tab=pending',
            }
          : !hasPublished && drafts.length > 0
            ? {
                title: 'Continue your listing draft',
                description: `${drafts[0].title} is saved privately. Continue when you’re ready to submit it for review.`,
                label: 'Continue draft',
                href: '/agent/listings?tab=draft',
              }
            : !hasPublished &&
                !hasExistingWork &&
                !pipelineQuery.isLoading &&
                !pipelineQuery.isError
              ? {
                  title: 'Get your first property ready',
                  description:
                    'Add the property details and photos, then submit your listing for moderation.',
                  label: 'Add your first listing',
                  href: '/listings/create',
                }
              : null;
  const publishedCount =
    !statsQuery.isError && !statsQuery.isLoading && statsQuery.data
      ? String(statsQuery.data.activeListings)
      : `${activeListings.length} shown`;
  const enquirySummary = pipelineQuery.isError
    ? 'Enquiry status unavailable'
    : pipelineQuery.isLoading
      ? 'Loading enquiries…'
      : `${newLeads.length} new enquir${newLeads.length === 1 ? 'y' : 'ies'}`;
  const unread = notificationsQuery.data?.length;
  const summary = operationalDataEnabled
    ? [
        enquirySummary,
        !showingsQuery.isError && !showingsQuery.isLoading && monthIsCurrent
          ? `${todayShowings.length} scheduled showing${todayShowings.length === 1 ? '' : 's'} today`
          : null,
        !notificationsQuery.isError && !notificationsQuery.isLoading && unread
          ? `${unread === 8 ? '8+' : unread} unread alert${unread === 1 ? '' : 's'}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Prepare your profile and private inventory at your own pace.';
  const listingRows = [...activeListings]
    .sort((a, b) => (b.enquiries ?? 0) - (a.enquiries ?? 0) || timestamp(b) - timestamp(a))
    .slice(0, 4);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-5 text-foreground md:px-7 md:py-6"
      data-testid="agent-dashboard-overview"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {firstName}</h1>
          <p className="mt-1 text-sm text-foreground/75">{summary}</p>
        </div>
        <p className="text-xs text-foreground/75">
          {now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>
      {guidance && (
        <section
          aria-label="Next step"
          className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-primary/5 p-4 sm:flex-row sm:items-center"
        >
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{guidance.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              {guidance.description}
            </p>
          </div>
          {guidance.href && guidance.label && (
            <Button asChild className="h-10 shrink-0">
              <Link href={guidance.href}>
                {guidance.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </section>
      )}
      {inventoryLoading && canPublishListings && (
        <div role="status" aria-label="Loading listing status">
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel
          title="Enquiries"
          testId="dashboard-enquiries"
          action={
            operationalDataEnabled ? (
              <Link className={actionClass} href="/agent/leads">
                Open CRM <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null
          }
        >
          {!operationalDataEnabled ? (
            <p className="py-2 text-sm leading-6 text-muted-foreground">
              New marketplace enquiries become available when your profile and Launch Access are
              ready.
            </p>
          ) : (
            <RequestState
              loading={pipelineQuery.isLoading}
              error={pipelineQuery.isError}
              retry={pipelineQuery.refetch}
            >
              {previewLeads.length > 0 ? (
                <div className="divide-y divide-border">
                  {previewLeads.map(lead => {
                    const isNew = pipeline.new.some(item => item.id === lead.id);
                    const received = toDate(lead.createdAt);
                    return (
                      <article
                        key={lead.id}
                        className="flex flex-wrap items-center gap-3 py-3 first:pt-1 last:pb-1"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <MessageSquare className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold">{lead.name || 'Enquiry'}</h3>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                            {lead.commercial?.listingTitle ||
                              lead.property?.title ||
                              'General enquiry'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isNew ? 'New enquiry' : formatStatus(lead.status)}
                            {received
                              ? ` · Received ${received.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`
                              : ''}
                          </p>
                        </div>
                        <Link href={`/agent/leads?leadId=${lead.id}`} className={actionClass}>
                          {isNew ? 'Open enquiry' : 'Open lead'}{' '}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="py-3 text-sm leading-6">
                  <p className="font-medium">No active enquiries yet</p>
                  <p className="text-muted-foreground">
                    Enquiries about your published properties appear here and in Leads &amp; CRM.
                  </p>
                </div>
              )}
            </RequestState>
          )}
        </Panel>
        <Panel
          title="Today & upcoming"
          testId="dashboard-schedule"
          action={
            operationalDataEnabled ? (
              <Link href="/agent/productivity?tab=calendar" className={actionClass}>
                Calendar <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null
          }
        >
          {!operationalDataEnabled ? (
            <p className="py-2 text-sm leading-6 text-muted-foreground">
              Your showing schedule becomes available with workspace access.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Booked property showings · {monthLabel}
                </p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-card-foreground"
                    aria-label="Previous showing month"
                    onClick={() =>
                      setCalendarMonth(
                        new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                      )
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-card-foreground"
                    aria-label="Next showing month"
                    onClick={() =>
                      setCalendarMonth(
                        new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                      )
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <RequestState
                loading={showingsQuery.isLoading}
                error={showingsQuery.isError}
                retry={showingsQuery.refetch}
              >
                {schedulePreview.length > 0 ? (
                  <div className="divide-y divide-border">
                    {schedulePreview.map(showing => {
                      const scheduled = toDate(showing.scheduledAt)!;
                      const listing = showing.propertyId
                        ? listingsByPropertyId.get(showing.propertyId)
                        : undefined;
                      return (
                        <Link
                          key={showing.id}
                          href="/agent/productivity?tab=showings"
                          className="flex items-start gap-3 rounded-md py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <span className="w-16 shrink-0 rounded-lg bg-primary/10 p-2 text-center text-xs font-semibold text-primary">
                            {sameDay(scheduled, now)
                              ? 'Today'
                              : scheduled.toLocaleDateString('en-ZA', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                            <span className="mt-1 block">
                              {scheduled.toLocaleTimeString('en-ZA', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">
                              {showing.property?.title ||
                                listing?.title ||
                                `Property showing #${showing.id}`}
                            </span>
                            {showing.client?.name && (
                              <span className="block text-xs text-muted-foreground">
                                {showing.client.name}
                              </span>
                            )}
                            <span className="mt-1 block text-xs font-semibold text-primary">
                              Open showings →
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-3 text-sm leading-6 text-muted-foreground">
                    No scheduled showings today or upcoming in this view.
                  </p>
                )}
              </RequestState>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Property showings in the selected month only. Open Calendar for other dates and
                appointment types.
              </p>
            </>
          )}
        </Panel>
      </div>

      <Panel
        title="Pipeline"
        testId="dashboard-pipeline"
        action={
          operationalDataEnabled ? (
            <Link className={actionClass} href="/agent/leads">
              Open leads <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null
        }
      >
        {!operationalDataEnabled ? (
          <p className="py-2 text-sm text-muted-foreground">
            Your pipeline will be available once workspace access is active.
          </p>
        ) : (
          <RequestState
            loading={pipelineQuery.isLoading}
            error={pipelineQuery.isError}
            retry={pipelineQuery.refetch}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {stages.map(stage => (
                <Link
                  key={stage.key}
                  href="/agent/leads"
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="text-muted-foreground">{stage.label}</span>
                  <strong className="text-lg font-semibold tabular-nums text-card-foreground">
                    {pipeline[stage.key].length}
                  </strong>
                </Link>
              ))}
            </div>
          </RequestState>
        )}
      </Panel>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel
          title="Your listings"
          testId="dashboard-listings"
          action={
            <Link href="/agent/listings" className={actionClass}>
              Manage listings <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        >
          <RequestState
            loading={inventoryLoading}
            error={inventoryError}
            retry={() => {
              void authoredQuery.refetch();
              if (operationalDataEnabled) void listingsQuery.refetch();
            }}
          >
            {listingRows.length > 0 ? (
              <>
                <p className="mb-2 text-xs text-muted-foreground">
                  {publishedCount} published listings · Previewing {listingRows.length}
                </p>
                <div className="divide-y divide-border">
                  {listingRows.map(listing => (
                    <article key={listing.id} className="flex items-center gap-3 py-3">
                      <span className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {listing.primaryImage ? (
                          <img
                            src={listing.primaryImage}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-semibold">{listing.title}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {listing.city} · {formatPrice(listing.price)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatStatus(listing.status)}
                          {typeof listing.enquiries === 'number'
                            ? ` · ${listing.enquiries} enquir${listing.enquiries === 1 ? 'y' : 'ies'}`
                            : ''}
                        </p>
                      </div>
                      <Link className={actionClass} href={`/property/${listing.id}`}>
                        Open <span className="sr-only">{listing.title}</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </article>
                  ))}
                </div>
              </>
            ) : drafts.length || pending.length ? (
              <div className="divide-y divide-border">
                {[...pending, ...drafts].slice(0, 3).map(listing => (
                  <div key={listing.id} className="flex items-center gap-3 py-3">
                    <Building2
                      className="h-5 w-5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatStatus(listing.status)}
                      </p>
                    </div>
                    <Link
                      className={actionClass}
                      href={`/agent/listings?tab=${listing.status === 'draft' ? 'draft' : 'pending'}`}
                    >
                      {listing.status === 'draft' ? 'Continue draft' : 'Review status'}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-3 text-sm leading-6 text-muted-foreground">
                {canPublishListings
                  ? 'Your published properties will appear here after moderation. Use Add listing in the header to begin.'
                  : 'Private drafts stay in your listings workspace. Publishing remains locked until your profile and access are ready.'}
              </p>
            )}
            {hasPublished && (drafts.length > 0 || pending.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-4 border-t border-border pt-3 text-xs">
                <Link className={actionClass} href="/agent/listings?tab=draft">
                  {drafts.length} draft{drafts.length === 1 ? '' : 's'}
                </Link>
                <Link className={actionClass} href="/agent/listings?tab=pending">
                  {pending.length} awaiting moderation
                </Link>
              </div>
            )}
            {!canPublishListings && !needsProfile && (
              <Link className={actionClass} href="/listings/create">
                Prepare a private listing <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </RequestState>
        </Panel>
        <div className="min-w-0 space-y-3">
          {onboardingStatus.approvalStatus === 'approved' && <AgentPresenceProof />}
          <Link href={profileHref} className={`${actionClass} px-1`}>
            {onboardingStatus.profile?.slug ? 'View public profile' : 'Review your profile'}{' '}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}
