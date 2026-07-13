import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Handshake,
  HandCoins,
  ListChecks,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  UserRoundCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { LeadRow } from '../leads/AgencyLeadsWorkspace';
import { EmptyPanel, ErrorPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import type { AgencyLead, Tone, WorkspaceContentProps } from '../workspace/types';
import { formatAge, formatDate, numberLabel, toneClasses } from '../workspace/utils';

type ViewingStatus =
  | 'requested'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

type ViewingFilterStatus =
  | 'all'
  | 'upcoming'
  | 'awaiting_confirmation'
  | 'unconfirmed'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'feedback_required'
  | 'rescheduled';

type ViewingRecord = {
  id: number;
  listingId?: number | null;
  propertyId?: number | null;
  leadId?: number | null;
  agentId?: number | null;
  scheduledAt?: string | Date | null;
  durationMinutes?: number | null;
  status?: ViewingStatus | string | null;
  queueStatus?: string | null;
  isUpcoming?: boolean;
  isFeedbackRequired?: boolean;
  attendee?: string | null;
  notes?: string | null;
  location?: string | null;
  instructions?: string | null;
  nextAction?: string | null;
  feedbackStructured?: Record<string, any> | null;
  agent?: { id: number; userId?: number | null; name: string; email?: string | null; phone?: string | null } | null;
  lead?: {
    id: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: string | null;
    nextFollowUp?: string | Date | null;
  } | null;
  listing?: {
    id: number;
    title?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    status?: string | null;
  } | null;
  property?: {
    id: number;
    title?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    price?: number | null;
    status?: string | null;
  } | null;
};

const VIEWING_STATUS_OPTIONS: Array<{ value: ViewingFilterStatus; label: string }> = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'unconfirmed', label: 'Awaiting confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'feedback_required', label: 'Feedback required' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
  { value: 'all', label: 'All viewings' },
];

const STATUS_TONES: Record<string, Tone> = {
  requested: 'amber',
  awaiting_confirmation: 'amber',
  confirmed: 'emerald',
  completed: 'teal',
  cancelled: 'rose',
  no_show: 'rose',
  rescheduled: 'sky',
  feedback_required: 'amber',
  upcoming: 'sky',
};

const AGENCY_WORKSPACE_TIME_ZONE = 'Africa/Johannesburg';

function statusLabel(value?: string | null) {
  if (!value) return 'Requested';
  if (value === 'no_show') return 'No-show';
  return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function viewingTone(value?: string | null): Tone {
  return STATUS_TONES[String(value || 'requested')] || 'slate';
}

function toInputDateTime(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function todayInputDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AGENCY_WORKSPACE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}-${parts.find(part => part.type === 'day')?.value}`;
}

function tomorrowMorningInput() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toInputDateTime(date);
}

function compactWhen(value?: string | Date | null) {
  if (!value) return 'No time';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time';
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: AGENCY_WORKSPACE_TIME_ZONE,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function normalizePhone(value?: string | null) {
  return String(value || '').replace(/[^\d+]/g, '');
}

function whatsappHref(value?: string | null) {
  const phone = normalizePhone(value);
  if (!phone) return null;
  const digits = phone.startsWith('+') ? phone.slice(1) : phone.startsWith('0') ? `27${phone.slice(1)}` : phone;
  return `https://wa.me/${digits}`;
}

function mergeLeads(...groups: Array<AgencyLead[] | undefined>) {
  const map = new Map<number, AgencyLead>();
  groups.flat().forEach(lead => {
    if (lead?.id) map.set(lead.id, lead);
  });
  return Array.from(map.values());
}

function useViewingRefresh(selectedViewingId?: number | null) {
  const utils = trpc.useUtils();
  return async () => {
    await Promise.all([
      utils.agency.getMyDay.invalidate(),
      utils.agency.getViewings.invalidate(),
      selectedViewingId
        ? utils.agency.getViewingDetail.invalidate({ viewingId: selectedViewingId })
        : Promise.resolve(),
      utils.agency.getLeads.invalidate(),
      utils.agency.getRecentLeads.invalidate(),
      utils.agency.getDashboardStats.invalidate(),
      utils.agency.getAgentLeaderboard.invalidate(),
      utils.canvassing.getDashboard.invalidate(),
      utils.canvassing.getFollowUpQueue.invalidate(),
    ]);
  };
}

export function AgencyMyDayWorkspace(props: WorkspaceContentProps) {
  const [activeDate, setActiveDate] = useState(todayInputDate());
  const [selectedViewingId, setSelectedViewingId] = useState<number | null>(null);
  const [bookingLeadId, setBookingLeadId] = useState<number | null>(null);
  const refresh = useViewingRefresh(selectedViewingId);

  const myDayQuery = trpc.agency.getMyDay.useQuery(
    { date: activeDate, limit: 12 },
    { enabled: Boolean(props.setupComplete) },
  );
  const agentsQuery = trpc.agency.listAssignableAgents.useQuery(undefined, {
    enabled: Boolean(props.setupComplete),
  });

  const completeFollowUp = trpc.agency.completeLeadFollowUp.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Follow-up completed');
    },
    onError: error => toast.error(error.message || 'Follow-up could not be completed'),
  });
  const setFollowUp = trpc.agency.setLeadFollowUp.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Next follow-up scheduled');
    },
    onError: error => toast.error(error.message || 'Follow-up could not be scheduled'),
  });
  const recordLeadContact = trpc.agency.recordLeadContactAttempt.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Buyer response recorded');
    },
    onError: error => toast.error(error.message || 'Buyer response could not be recorded'),
  });
  const updateViewingStatus = trpc.agency.updateViewingStatus.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Viewing updated');
    },
    onError: error => toast.error(error.message || 'Viewing could not be updated'),
  });
  const completeSellerFollowUp = trpc.canvassing.completeFollowUp.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Seller follow-up completed');
    },
    onError: error => toast.error(error.message || 'Seller follow-up could not be completed'),
  });
  const setSellerFollowUp = trpc.canvassing.setFollowUp.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Seller follow-up scheduled');
    },
    onError: error => toast.error(error.message || 'Seller follow-up could not be scheduled'),
  });

  const data = myDayQuery.data as any;
  const leadOptions = useMemo(
    () =>
      mergeLeads(
        props.leads,
        data?.overdueFollowUps,
        data?.dueTodayFollowUps,
        data?.urgentLeads,
      ),
    [data?.dueTodayFollowUps, data?.overdueFollowUps, data?.urgentLeads, props.leads],
  );

  if (!props.setupComplete) {
    return <ErrorPanel title="Complete agency setup before using My Day" />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Daily operating queue</p>
            <h2 className="text-xl font-semibold text-slate-950">{formatDate(activeDate)}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={activeDate}
              onChange={event => setActiveDate(event.target.value)}
              className="w-auto"
            />
            <Button variant="outline" onClick={() => myDayQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {myDayQuery.error ? <ErrorPanel title="My Day could not be loaded" /> : null}
      {myDayQuery.isLoading ? <div className="h-56 animate-pulse rounded-lg bg-slate-100" /> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <QueueMetric label="Overdue follow-ups" value={data.counts?.overdueFollowUps} tone="rose" />
            <QueueMetric label="Today follow-ups" value={data.counts?.dueTodayFollowUps} tone="amber" />
            <QueueMetric label="First response overdue" value={data.counts?.firstResponseOverdueLeads} tone="rose" />
            <QueueMetric
              label="Seller follow-ups"
              value={(data.counts?.overdueSellerFollowUps || 0) + (data.counts?.dueTodaySellerFollowUps || 0)}
              tone="rose"
            />
            <QueueMetric label="Mandate actions" value={data.counts?.mandateWork} tone="amber" />
            <QueueMetric label="Today viewings" value={data.counts?.todayViewings} tone="sky" />
            <QueueMetric label="Deal deadlines" value={data.counts?.transactionDeadlines} tone="teal" />
          </div>

          <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 space-y-5">
              <LeadQueue
                title="Buyer First Responses Overdue"
                eyebrow={`${numberLabel(data.firstResponseOverdueLeads?.length || 0)} need a recorded response`}
                leads={data.firstResponseOverdueLeads || []}
                empty="No buyer first responses are overdue"
                completeLabel="Respond"
                onOpenLead={() => props.onNavigate('leads')}
                onCall={lead => window.open(`tel:${normalizePhone(lead.phone)}`, '_self')}
                onWhatsApp={lead => {
                  const href = whatsappHref(lead.phone);
                  if (href) window.open(href, '_blank', 'noopener,noreferrer');
                }}
                onComplete={lead =>
                  recordLeadContact.mutate({
                    leadId: lead.id,
                    channel: 'call',
                    outcome: 'reached',
                    summary: 'First buyer response recorded from My Day.',
                    nextAction: 'Schedule buyer follow-up',
                  })
                }
                onBook={lead => setBookingLeadId(lead.id)}
                onNextFollowUp={lead =>
                  setFollowUp.mutate({
                    leadId: lead.id,
                    nextFollowUp: tomorrowMorningInput(),
                    note: 'Buyer follow-up scheduled from My Day.',
                  })
                }
              />

              <SellerFollowUpQueue
                title="Overdue Seller Follow-ups"
                prospects={data.overdueSellerFollowUps || []}
                empty="No overdue seller follow-ups"
                onOpen={() => props.setLocation('/agency/canvassing')}
                onComplete={prospect =>
                  completeSellerFollowUp.mutate({
                    sellerProspectId: prospect.id,
                    note: 'Seller follow-up completed from My Day.',
                  })
                }
                onTomorrow={prospect =>
                  setSellerFollowUp.mutate({
                    sellerProspectId: prospect.id,
                    nextFollowUp: tomorrowMorningInput(),
                    note: prospect.nextAction || 'Continue seller follow-up from My Day.',
                  })
                }
              />

              <SellerFollowUpQueue
                title="Seller Follow-ups Due Today"
                prospects={data.dueTodaySellerFollowUps || []}
                empty="No seller follow-ups due today"
                onOpen={() => props.setLocation('/agency/canvassing')}
                onComplete={prospect =>
                  completeSellerFollowUp.mutate({
                    sellerProspectId: prospect.id,
                    note: 'Seller follow-up completed from My Day.',
                  })
                }
                onTomorrow={prospect =>
                  setSellerFollowUp.mutate({
                    sellerProspectId: prospect.id,
                    nextFollowUp: tomorrowMorningInput(),
                    note: prospect.nextAction || 'Continue seller follow-up from My Day.',
                  })
                }
              />

              <MandateWorkQueue
                work={data.mandateWork || []}
                onOpen={() => props.setLocation('/agency/canvassing')}
              />

              <LeadQueue
                title="Overdue Lead Follow-ups"
                eyebrow={`${numberLabel(data.overdueFollowUps?.length || 0)} behind schedule`}
                leads={data.overdueFollowUps || []}
                empty="No overdue follow-ups"
                onOpenLead={() => props.onNavigate('leads')}
                onCall={lead => window.open(`tel:${normalizePhone(lead.phone)}`, '_self')}
                onWhatsApp={lead => {
                  const href = whatsappHref(lead.phone);
                  if (href) window.open(href, '_blank', 'noopener,noreferrer');
                }}
                onComplete={lead =>
                  completeFollowUp.mutate({
                    leadId: lead.id,
                    note: 'Follow-up completed from My Day.',
                  })
                }
                onBook={lead => setBookingLeadId(lead.id)}
                onNextFollowUp={lead =>
                  setFollowUp.mutate({
                    leadId: lead.id,
                    nextFollowUp: tomorrowMorningInput(),
                    note: 'Next follow-up scheduled from My Day.',
                  })
                }
              />

              <LeadQueue
                title="Follow-ups Due Today"
                eyebrow={`${numberLabel(data.dueTodayFollowUps?.length || 0)} scheduled`}
                leads={data.dueTodayFollowUps || []}
                empty="No follow-ups due today"
                onOpenLead={() => props.onNavigate('leads')}
                onCall={lead => window.open(`tel:${normalizePhone(lead.phone)}`, '_self')}
                onWhatsApp={lead => {
                  const href = whatsappHref(lead.phone);
                  if (href) window.open(href, '_blank', 'noopener,noreferrer');
                }}
                onComplete={lead =>
                  completeFollowUp.mutate({
                    leadId: lead.id,
                    note: 'Follow-up completed from My Day.',
                  })
                }
                onBook={lead => setBookingLeadId(lead.id)}
                onNextFollowUp={lead =>
                  setFollowUp.mutate({
                    leadId: lead.id,
                    nextFollowUp: tomorrowMorningInput(),
                    note: 'Next follow-up scheduled from My Day.',
                  })
                }
              />

              <ViewingQueue
                title="Today's Viewings"
                eyebrow={`${numberLabel(data.todayViewings?.length || 0)} appointments`}
                viewings={data.todayViewings || []}
                empty="No viewings on this date"
                onOpen={viewing => setSelectedViewingId(viewing.id)}
                onConfirm={viewing =>
                  updateViewingStatus.mutate({
                    viewingId: viewing.id,
                    status: 'confirmed',
                    note: 'Confirmed from My Day.',
                  })
                }
                onComplete={viewing =>
                  updateViewingStatus.mutate({
                    viewingId: viewing.id,
                    status: 'completed',
                    note: 'Attendance marked from My Day.',
                  })
                }
                onNoShow={viewing =>
                  updateViewingStatus.mutate({
                    viewingId: viewing.id,
                    status: 'no_show',
                    note: 'Marked no-show from My Day.',
                  })
                }
                onOpenListing={viewing => openListing(props, viewing)}
              />
            </div>

            <aside className="min-w-0 space-y-5">
              <ViewingQueue
                title="Needs Confirmation"
                eyebrow={`${numberLabel(data.unconfirmedViewings?.length || 0)} pending`}
                viewings={data.unconfirmedViewings || []}
                empty="No unconfirmed viewings"
                compact
                onOpen={viewing => setSelectedViewingId(viewing.id)}
                onConfirm={viewing =>
                  updateViewingStatus.mutate({
                    viewingId: viewing.id,
                    status: 'confirmed',
                    note: 'Confirmed from My Day.',
                  })
                }
                onComplete={viewing => setSelectedViewingId(viewing.id)}
                onNoShow={viewing => setSelectedViewingId(viewing.id)}
                onOpenListing={viewing => openListing(props, viewing)}
              />

              <ViewingQueue
                title="Feedback Required"
                eyebrow={`${numberLabel(data.feedbackRequiredViewings?.length || 0)} waiting`}
                viewings={data.feedbackRequiredViewings || []}
                empty="No completed viewings awaiting feedback"
                compact
                onOpen={viewing => setSelectedViewingId(viewing.id)}
                onConfirm={viewing => setSelectedViewingId(viewing.id)}
                onComplete={viewing => setSelectedViewingId(viewing.id)}
                onNoShow={viewing => setSelectedViewingId(viewing.id)}
                onOpenListing={viewing => openListing(props, viewing)}
              />

              <ListingTaskQueue
                tasks={data.listingTasks || []}
                onOpen={listing => props.setLocation(`/agency/listings?listing=${listing.id}`)}
              />

              <TransactionDeadlineQueue
                deadlines={data.transactionDeadlines || []}
                onOpen={deadline =>
                  deadline.dealId
                    ? props.setLocation(`/agency/transactions?deal=${deadline.dealId}`)
                    : props.onNavigate('transactions')
                }
              />

              <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <SectionTitle
                    icon={CalendarClock}
                    title="Upcoming Work"
                    eyebrow={`${numberLabel(data.upcomingWork?.length || 0)} after today`}
                  />
                </CardHeader>
                <CardContent className="space-y-2">
                  {(data.upcomingWork || []).slice(0, 6).map((viewing: ViewingRecord) => (
                    <ViewingCompactRow
                      key={viewing.id}
                      viewing={viewing}
                      onOpen={() => setSelectedViewingId(viewing.id)}
                    />
                  ))}
                  {!data.upcomingWork?.length ? (
                    <EmptyPanel icon={CalendarClock} title="No upcoming work" text="Future appointments appear here." />
                  ) : null}
                </CardContent>
              </Card>
            </aside>
          </section>
        </>
      ) : null}

      <CreateViewingDialog
        open={Boolean(bookingLeadId)}
        onOpenChange={open => !open && setBookingLeadId(null)}
        defaultLeadId={bookingLeadId}
        leads={leadOptions}
        agents={agentsQuery.data || []}
        onSaved={async viewingId => {
          await refresh();
          setBookingLeadId(null);
          setSelectedViewingId(viewingId);
        }}
      />

      <ViewingDetailDialog
        viewingId={selectedViewingId}
        agents={agentsQuery.data || []}
        onOpenChange={open => !open && setSelectedViewingId(null)}
        onOpenLead={() => props.onNavigate('leads')}
        onOpenListing={viewing => openListing(props, viewing)}
      />
    </section>
  );
}

export function AgencyViewingsWorkspace(props: WorkspaceContentProps) {
  const [status, setStatus] = useState<ViewingFilterStatus>('upcoming');
  const [agentId, setAgentId] = useState('');
  const [listingId, setListingId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedViewingId, setSelectedViewingId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get('viewing') || 0);
    return Number.isFinite(id) && id > 0 ? id : null;
  });
  const refresh = useViewingRefresh(selectedViewingId);

  const agentsQuery = trpc.agency.listAssignableAgents.useQuery(undefined, {
    enabled: Boolean(props.setupComplete),
  });
  const viewingsQuery = trpc.agency.getViewings.useQuery(
    {
      status,
      agentId: agentId ? Number(agentId) : undefined,
      listingId: listingId ? Number(listingId) : undefined,
      propertyId: propertyId ? Number(propertyId) : undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 100,
      offset: 0,
    },
    { enabled: Boolean(props.setupComplete) },
  );
  const updateViewingStatus = trpc.agency.updateViewingStatus.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Viewing updated');
    },
    onError: error => toast.error(error.message || 'Viewing could not be updated'),
  });

  const viewings = ((viewingsQuery.data as any)?.viewings || []) as ViewingRecord[];
  const grouped = useMemo(() => groupViewingsByDate(viewings), [viewings]);

  const openDetail = (viewingId: number) => {
    setSelectedViewingId(viewingId);
    props.setLocation(`/agency/viewings?viewing=${viewingId}`);
  };
  const closeDetail = () => {
    setSelectedViewingId(null);
    props.setLocation('/agency/viewings');
  };

  if (!props.setupComplete) {
    return <ErrorPanel title="Complete agency setup before managing viewings" />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionTitle
              icon={CalendarDays}
              title="Viewings Workspace"
              eyebrow={`${numberLabel(viewings.length)} matching appointments`}
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <CalendarClock className="h-4 w-4" />
                  Book viewing
                </Button>
              }
            />
            <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <ListChecks className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[minmax(180px,1fr)_180px_170px_140px_140px_150px_150px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search lead, contact, listing"
                className="pl-9"
              />
            </div>
            <select
              value={status}
              onChange={event => setStatus(event.target.value as ViewingFilterStatus)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              {VIEWING_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={agentId}
              onChange={event => setAgentId(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">All agents</option>
              {(agentsQuery.data || []).map((agent: any) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <Input
              value={listingId}
              onChange={event => setListingId(event.target.value.replace(/\D/g, ''))}
              placeholder="Listing ID"
            />
            <Input
              value={propertyId}
              onChange={event => setPropertyId(event.target.value.replace(/\D/g, ''))}
              placeholder="Property ID"
            />
            <Input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} />
            <Input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {VIEWING_STATUS_OPTIONS.slice(0, 6).map(option => (
              <Button
                key={option.value}
                variant={status === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {viewingsQuery.error ? <ErrorPanel title="Viewings could not be loaded" /> : null}
          {viewingsQuery.isLoading ? <div className="h-56 animate-pulse rounded-lg bg-slate-100" /> : null}

          {!viewingsQuery.isLoading && viewings.length ? (
            viewMode === 'list' ? (
              <div className="space-y-3">
                {viewings.map(viewing => (
                  <ViewingRow
                    key={viewing.id}
                    viewing={viewing}
                    onOpen={() => openDetail(viewing.id)}
                    onConfirm={() =>
                      updateViewingStatus.mutate({
                        viewingId: viewing.id,
                        status: 'confirmed',
                        note: 'Confirmed from Viewings workspace.',
                      })
                    }
                    onComplete={() =>
                      updateViewingStatus.mutate({
                        viewingId: viewing.id,
                        status: 'completed',
                        note: 'Attendance marked from Viewings workspace.',
                      })
                    }
                    onNoShow={() =>
                      updateViewingStatus.mutate({
                        viewingId: viewing.id,
                        status: 'no_show',
                        note: 'Marked no-show from Viewings workspace.',
                      })
                    }
                    onOpenListing={() => openListing(props, viewing)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-3">
                {grouped.map(group => (
                  <div key={group.date} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-3 text-sm font-semibold text-slate-700">{group.label}</p>
                    <div className="space-y-2">
                      {group.items.map(viewing => (
                        <ViewingCompactRow
                          key={viewing.id}
                          viewing={viewing}
                          onOpen={() => openDetail(viewing.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}

          {!viewingsQuery.isLoading && !viewings.length ? (
            <EmptyPanel
              icon={CalendarDays}
              title="No viewings in this view"
              text="Adjust filters or book a viewing from a lead."
            />
          ) : null}
        </CardContent>
      </Card>

      <CreateViewingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        leads={props.leads}
        agents={agentsQuery.data || []}
        onSaved={async viewingId => {
          await refresh();
          setCreateOpen(false);
          openDetail(viewingId);
        }}
      />

      <ViewingDetailDialog
        viewingId={selectedViewingId}
        agents={agentsQuery.data || []}
        onOpenChange={open => !open && closeDetail()}
        onOpenLead={() => props.onNavigate('leads')}
        onOpenListing={viewing => openListing(props, viewing)}
      />
    </section>
  );
}

function QueueMetric({ label, value, tone }: { label: string; value?: number; tone: Tone }) {
  const classes = toneClasses(tone);
  return (
    <div className={cn('rounded-lg border p-4', classes.border, classes.soft)}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{numberLabel(value || 0)}</p>
    </div>
  );
}

function SellerFollowUpQueue({
  title,
  prospects,
  empty,
  onOpen,
  onComplete,
  onTomorrow,
}: {
  title: string;
  prospects: any[];
  empty: string;
  onOpen: (prospect: any) => void;
  onComplete: (prospect: any) => void;
  onTomorrow: (prospect: any) => void;
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle
          icon={Clock3}
          title={title}
          eyebrow={`${numberLabel(prospects.length)} seller opportunities`}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {prospects.map(prospect => (
          <div key={prospect.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">
                  {prospect.ownerName || 'Unnamed seller opportunity'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {[prospect.propertyAddress, prospect.suburb, prospect.city].filter(Boolean).join(', ') ||
                    'Location not recorded'}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  Next: {prospect.nextAction || 'Record the next seller action'}
                </p>
              </div>
              <Badge variant="outline">{statusLabel(prospect.stage || 'new')}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpen(prospect)}>
                <ArrowRight className="h-4 w-4" />
                Open
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!prospect.phone}
                onClick={() => window.open(`tel:${normalizePhone(prospect.phone)}`, '_self')}
              >
                <Phone className="h-4 w-4" />
                Call
              </Button>
              <Button variant="outline" size="sm" onClick={() => onComplete(prospect)}>
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </Button>
              <Button variant="outline" size="sm" onClick={() => onTomorrow(prospect)}>
                <Clock3 className="h-4 w-4" />
                Tomorrow
              </Button>
            </div>
          </div>
        ))}
        {!prospects.length ? <EmptyPanel icon={Clock3} title={empty} text="This queue is clear." /> : null}
      </CardContent>
    </Card>
  );
}

function MandateWorkQueue({ work, onOpen }: { work: any[]; onOpen: (item: any) => void }) {
  return (
    <Card className="min-w-0 border-amber-200 bg-amber-50/40 shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle
          icon={Handshake}
          title="Mandate Actions"
          eyebrow={`${numberLabel(work.length)} blocking seller actions`}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {work.map(item => (
          <div key={item.id} className="rounded-lg border border-amber-100 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{item.ownerName || 'Seller opportunity'}</p>
                <p className="mt-1 text-sm text-slate-500">{item.propertyAddress || 'Location to be completed'}</p>
                <p className="mt-2 text-sm font-medium text-slate-700">Next: {item.nextAction}</p>
              </div>
              <Badge variant="outline">{statusLabel(item.type || item.status)}</Badge>
            </div>
            <Button className="mt-3" variant="outline" size="sm" onClick={() => onOpen(item)}>
              <ArrowRight className="h-4 w-4" />
              Open mandate
            </Button>
          </div>
        ))}
        {!work.length ? <EmptyPanel icon={Handshake} title="No mandate actions" text="Current mandate requirements are complete." /> : null}
      </CardContent>
    </Card>
  );
}

function LeadQueue({
  title,
  eyebrow,
  leads,
  empty,
  onOpenLead,
  onCall,
  onWhatsApp,
  onComplete,
  onBook,
  onNextFollowUp,
  completeLabel = 'Complete',
}: {
  title: string;
  eyebrow: string;
  leads: AgencyLead[];
  empty: string;
  onOpenLead: (lead: AgencyLead) => void;
  onCall: (lead: AgencyLead) => void;
  onWhatsApp: (lead: AgencyLead) => void;
  onComplete: (lead: AgencyLead) => void;
  onBook: (lead: AgencyLead) => void;
  onNextFollowUp: (lead: AgencyLead) => void;
  completeLabel?: string;
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={MessageSquare} title={title} eyebrow={eyebrow} />
      </CardHeader>
      <CardContent className="space-y-3">
        {leads.map(lead => (
          <div key={lead.id} className="rounded-lg border border-slate-200 p-3">
            <LeadRow lead={lead} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenLead(lead)}>
                <ArrowRight className="h-4 w-4" />
                Open
              </Button>
              <Button variant="outline" size="sm" disabled={!lead.phone} onClick={() => onCall(lead)}>
                <Phone className="h-4 w-4" />
                Call
              </Button>
              <Button variant="outline" size="sm" disabled={!lead.phone} onClick={() => onWhatsApp(lead)}>
                WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={() => onComplete(lead)}>
                <CheckCircle2 className="h-4 w-4" />
                {completeLabel}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onBook(lead)}>
                <CalendarClock className="h-4 w-4" />
                Book
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNextFollowUp(lead)}>
                <Clock3 className="h-4 w-4" />
                Tomorrow
              </Button>
            </div>
          </div>
        ))}
        {!leads.length ? <EmptyPanel icon={MessageSquare} title={empty} text="This queue is clear." /> : null}
      </CardContent>
    </Card>
  );
}

function ViewingQueue({
  title,
  eyebrow,
  viewings,
  empty,
  compact,
  onOpen,
  onConfirm,
  onComplete,
  onNoShow,
  onOpenListing,
}: {
  title: string;
  eyebrow: string;
  viewings: ViewingRecord[];
  empty: string;
  compact?: boolean;
  onOpen: (viewing: ViewingRecord) => void;
  onConfirm: (viewing: ViewingRecord) => void;
  onComplete: (viewing: ViewingRecord) => void;
  onNoShow: (viewing: ViewingRecord) => void;
  onOpenListing: (viewing: ViewingRecord) => void;
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={CalendarDays} title={title} eyebrow={eyebrow} />
      </CardHeader>
      <CardContent className="space-y-3">
        {viewings.map(viewing =>
          compact ? (
            <ViewingCompactRow key={viewing.id} viewing={viewing} onOpen={() => onOpen(viewing)} />
          ) : (
            <ViewingRow
              key={viewing.id}
              viewing={viewing}
              onOpen={() => onOpen(viewing)}
              onConfirm={() => onConfirm(viewing)}
              onComplete={() => onComplete(viewing)}
              onNoShow={() => onNoShow(viewing)}
              onOpenListing={() => onOpenListing(viewing)}
            />
          ),
        )}
        {!viewings.length ? <EmptyPanel icon={CalendarDays} title={empty} text="This queue is clear." /> : null}
      </CardContent>
    </Card>
  );
}

function ViewingRow({
  viewing,
  onOpen,
  onConfirm,
  onComplete,
  onNoShow,
  onOpenListing,
}: {
  viewing: ViewingRecord;
  onOpen: () => void;
  onConfirm: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onOpenListing: () => void;
}) {
  const status = viewing.queueStatus || viewing.status || 'requested';
  const classes = toneClasses(viewingTone(status));
  const canConfirm = ['requested', 'awaiting_confirmation', 'rescheduled'].includes(String(viewing.status));
  const canFinish = String(viewing.status) === 'confirmed';

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', classes.dot)} />
          <p className="font-semibold text-slate-950">{viewing.attendee || viewing.lead?.name || 'Viewing'}</p>
          <Badge variant="outline" className="capitalize">
            {statusLabel(status)}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">{compactWhen(viewing.scheduledAt)}</p>
        <p className="mt-1 truncate text-sm text-slate-600">
          {viewing.listing?.title || viewing.property?.title || viewing.location || 'No listing context'}
        </p>
        <p className="mt-1 truncate text-xs text-slate-500">
          {viewing.agent?.name || 'Unassigned'} - {viewing.notes || viewing.nextAction || 'Review next action'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button variant="outline" size="sm" onClick={onOpen}>
          <Eye className="h-4 w-4" />
          Open
        </Button>
        <Button variant="outline" size="sm" disabled={!viewing.listingId && !viewing.propertyId} onClick={onOpenListing}>
          Listing
        </Button>
        {canConfirm ? (
          <Button variant="outline" size="sm" onClick={onConfirm}>
            <CheckCircle2 className="h-4 w-4" />
            Confirm
          </Button>
        ) : null}
        {canFinish ? (
          <>
            <Button variant="outline" size="sm" onClick={onComplete}>
              Attended
            </Button>
            <Button variant="outline" size="sm" onClick={onNoShow}>
              No-show
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ViewingCompactRow({ viewing, onOpen }: { viewing: ViewingRecord; onOpen: () => void }) {
  const status = viewing.queueStatus || viewing.status || 'requested';
  const classes = toneClasses(viewingTone(status));
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">
            {viewing.attendee || viewing.lead?.name || `Viewing #${viewing.id}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">{compactWhen(viewing.scheduledAt)}</p>
        </div>
        <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', classes.dot)} />
      </div>
      <p className="mt-2 truncate text-xs text-slate-500">
        {viewing.listing?.title || viewing.property?.title || viewing.agent?.name || statusLabel(status)}
      </p>
    </button>
  );
}

function ListingTaskQueue({ tasks, onOpen }: { tasks: any[]; onOpen: (listing: any) => void }) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={ListChecks} title="Listing Tasks" eyebrow={`${numberLabel(tasks.length)} requiring attention`} />
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.slice(0, 6).map(listing => (
          <button
            key={listing.id}
            type="button"
            onClick={() => onOpen(listing)}
            className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-teal-300"
          >
            <p className="truncate text-sm font-semibold text-slate-950">{listing.title || `Listing #${listing.id}`}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{listing.nextAction || 'Review listing'}</p>
          </button>
        ))}
        {!tasks.length ? <EmptyPanel icon={ListChecks} title="No listing tasks" text="Listing task queue is clear." /> : null}
      </CardContent>
    </Card>
  );
}

function TransactionDeadlineQueue({
  deadlines,
  onOpen,
}: {
  deadlines: any[];
  onOpen: (deadline: any) => void;
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle
          icon={BriefcaseBusiness}
          title="Deal Deadlines"
          eyebrow={`${numberLabel(deadlines.length)} due or overdue`}
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {deadlines.slice(0, 6).map(deadline => {
          const tone = deadline.overdue ? 'rose' : deadline.type === 'offer_expiry' ? 'amber' : 'sky';
          const classes = toneClasses(tone);
          return (
            <button
              key={deadline.id}
              type="button"
              onClick={() => onOpen(deadline)}
              className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-teal-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{deadline.title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {deadline.detail || deadline.lead?.name || 'Transaction work'}
                  </p>
                </div>
                <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', classes.dot)} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>{compactWhen(deadline.dueAt)}</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                  <HandCoins className="h-3.5 w-3.5" />
                  {deadline.amount ? `R${Number(deadline.amount).toLocaleString('en-ZA')}` : 'Deal'}
                </span>
              </div>
            </button>
          );
        })}
        {!deadlines.length ? (
          <EmptyPanel icon={BriefcaseBusiness} title="No deal deadlines" text="Offer expiries and transaction conditions appear here." />
        ) : null}
      </CardContent>
    </Card>
  );
}

function CreateViewingDialog({
  open,
  onOpenChange,
  defaultLeadId,
  leads,
  agents,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLeadId?: number | null;
  leads: AgencyLead[];
  agents: Array<{ id: number; name: string }>;
  onSaved: (viewingId: number) => void | Promise<void>;
}) {
  const [leadId, setLeadId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [status, setStatus] = useState<'awaiting_confirmation' | 'confirmed'>('awaiting_confirmation');
  const [listingId, setListingId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [location, setLocation] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const selectedLead = leads.find(lead => String(lead.id) === leadId) || null;

  useEffect(() => {
    if (!open) return;
    const initialLead = defaultLeadId ? leads.find(lead => lead.id === defaultLeadId) : leads[0];
    setLeadId(initialLead ? String(initialLead.id) : '');
    setAgentId(initialLead?.agentId ? String(initialLead.agentId) : agents[0]?.id ? String(agents[0].id) : '');
    setScheduledAt('');
    setDurationMinutes(45);
    setStatus('awaiting_confirmation');
    setPropertyId(initialLead?.propertyId ? String(initialLead.propertyId) : '');
    setListingId('');
    setLocation(initialLead?.property ? [initialLead.property.city, initialLead.property.province].filter(Boolean).join(', ') : '');
    setInstructions('');
    setNotes('');
  }, [agents, defaultLeadId, leads, open]);

  const createViewing = trpc.agency.createViewing.useMutation({
    onSuccess: async result => {
      toast.success('Viewing saved');
      await onSaved(Number(result.viewingId));
    },
    onError: error => toast.error(error.message || 'Viewing could not be saved'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book Viewing</DialogTitle>
          <DialogDescription>Schedule against a same-agency lead, listing, and active agent.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label="Lead/contact">
            <select
              value={leadId}
              onChange={event => {
                const nextLead = leads.find(lead => String(lead.id) === event.target.value);
                setLeadId(event.target.value);
                setAgentId(nextLead?.agentId ? String(nextLead.agentId) : agentId);
                setPropertyId(nextLead?.propertyId ? String(nextLead.propertyId) : '');
              }}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Select lead</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>
                  {lead.name || `Lead #${lead.id}`} - {lead.email || lead.phone || 'No contact'}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Assigned agent">
              <select
                value={agentId}
                onChange={event => setAgentId(event.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Select agent</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={event => setStatus(event.target.value as any)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="awaiting_confirmation">Awaiting confirmation</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Date and time">
              <Input type="datetime-local" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} />
            </Field>
            <Field label="Duration">
              <Input
                type="number"
                min={15}
                max={240}
                step={15}
                value={durationMinutes}
                onChange={event => setDurationMinutes(Number(event.target.value || 45))}
              />
            </Field>
            <Field label="Property ID">
              <Input value={propertyId} onChange={event => setPropertyId(event.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>

          <Field label="Canonical listing ID">
            <Input
              value={listingId}
              onChange={event => setListingId(event.target.value.replace(/\D/g, ''))}
              placeholder={selectedLead?.property?.title || 'Optional when lead has property context'}
            />
          </Field>

          <Field label="Location">
            <Input value={location} onChange={event => setLocation(event.target.value)} />
          </Field>
          <Field label="Instructions">
            <Textarea value={instructions} onChange={event => setInstructions(event.target.value)} />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={event => setNotes(event.target.value)} />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={createViewing.isPending || !leadId || !agentId || !scheduledAt}
              onClick={() =>
                createViewing.mutate({
                  leadId: Number(leadId),
                  agentId: Number(agentId),
                  scheduledAt,
                  durationMinutes,
                  status,
                  listingId: listingId ? Number(listingId) : undefined,
                  propertyId: propertyId ? Number(propertyId) : undefined,
                  location: location || undefined,
                  instructions: instructions || undefined,
                  notes: notes || undefined,
                })
              }
            >
              <CalendarClock className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewingDetailDialog({
  viewingId,
  agents,
  onOpenChange,
  onOpenLead,
  onOpenListing,
}: {
  viewingId?: number | null;
  agents: Array<{ id: number; name: string }>;
  onOpenChange: (open: boolean) => void;
  onOpenLead: () => void;
  onOpenListing: (viewing: ViewingRecord) => void;
}) {
  const refresh = useViewingRefresh(viewingId);
  const detailQuery = trpc.agency.getViewingDetail.useQuery(
    { viewingId: viewingId || 0 },
    { enabled: Boolean(viewingId) },
  );
  const viewing = detailQuery.data as (ViewingRecord & { activities?: any[]; lifecycle?: { allowedNextStatuses: ViewingStatus[] } }) | undefined;
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [reassignAgentId, setReassignAgentId] = useState('');
  const [feedback, setFeedback] = useState({
    attended: 'true',
    interestLevel: 'medium',
    priceReaction: '',
    propertyFit: '',
    objections: '',
    financingNotes: '',
    sellerFeedback: '',
    recommendedNextAction: 'follow_up',
    followUpDate: '',
    notes: '',
  });

  useEffect(() => {
    if (!viewing) return;
    setRescheduleAt(toInputDateTime(viewing.scheduledAt));
    setReassignAgentId(viewing.agentId ? String(viewing.agentId) : '');
    const existing = viewing.feedbackStructured || {};
    setFeedback({
      attended: existing.attended === false ? 'false' : 'true',
      interestLevel: existing.interestLevel || 'medium',
      priceReaction: existing.priceReaction || '',
      propertyFit: existing.propertyFit || '',
      objections: existing.objections || '',
      financingNotes: existing.financingNotes || '',
      sellerFeedback: existing.sellerFeedback || '',
      recommendedNextAction: existing.recommendedNextAction || 'follow_up',
      followUpDate: toInputDateTime(existing.followUpDate),
      notes: existing.notes || '',
    });
  }, [viewing]);

  const updateViewingStatus = trpc.agency.updateViewingStatus.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Viewing updated');
    },
    onError: error => toast.error(error.message || 'Viewing could not be updated'),
  });
  const rescheduleViewing = trpc.agency.rescheduleViewing.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Viewing rescheduled');
    },
    onError: error => toast.error(error.message || 'Viewing could not be rescheduled'),
  });
  const reassignViewing = trpc.agency.reassignViewing.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Viewing reassigned');
    },
    onError: error => toast.error(error.message || 'Viewing could not be reassigned'),
  });
  const submitFeedback = trpc.agency.submitViewingFeedback.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Feedback saved');
    },
    onError: error => toast.error(error.message || 'Feedback could not be saved'),
  });

  const allowed = new Set(viewing?.lifecycle?.allowedNextStatuses || []);
  const canFeedback = viewing?.status === 'completed';
  const busy =
    updateViewingStatus.isPending ||
    rescheduleViewing.isPending ||
    reassignViewing.isPending ||
    submitFeedback.isPending;

  return (
    <Dialog open={Boolean(viewingId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{viewing?.attendee || viewing?.lead?.name || 'Viewing detail'}</DialogTitle>
          <DialogDescription>
            {viewing ? `${compactWhen(viewing.scheduledAt)} - ${statusLabel(viewing.queueStatus || viewing.status)}` : 'Loading'}
          </DialogDescription>
        </DialogHeader>

        {detailQuery.isLoading ? <div className="h-56 animate-pulse rounded-lg bg-slate-100" /> : null}
        {detailQuery.error ? <ErrorPanel title="Viewing detail could not be loaded" /> : null}
        {viewing ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="capitalize">
                      {statusLabel(viewing.queueStatus || viewing.status)}
                    </Badge>
                    <p className="mt-3 text-lg font-semibold text-slate-950">{compactWhen(viewing.scheduledAt)}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {viewing.durationMinutes || 45} minutes - {viewing.agent?.name || 'No agent'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {viewing.leadId ? (
                      <Button variant="outline" size="sm" onClick={onOpenLead}>
                        Open lead
                      </Button>
                    ) : null}
                    {viewing.listingId || viewing.propertyId ? (
                      <Button variant="outline" size="sm" onClick={() => onOpenListing(viewing)}>
                        Open listing
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <DetailBlock label="Contact" value={viewing.lead?.email || viewing.lead?.phone || 'No contact'} />
                  <DetailBlock label="Listing" value={viewing.listing?.title || viewing.property?.title || 'No listing'} />
                  <DetailBlock label="Location" value={viewing.location || viewing.listing?.address || viewing.property?.address || 'No location'} />
                </div>
                {viewing.instructions || viewing.notes ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    {viewing.instructions ? <p>{viewing.instructions}</p> : null}
                    {viewing.notes ? <p>{viewing.notes}</p> : null}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">Activity Timeline</p>
                <div className="mt-3 space-y-3">
                  {viewing.activities?.map(activity => (
                    <div key={activity.id} className="rounded-md border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="outline" className="capitalize">
                          {String(activity.type || 'note').replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-slate-500">{formatAge(activity.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{activity.description || 'Activity recorded.'}</p>
                    </div>
                  ))}
                  {!viewing.activities?.length ? (
                    <EmptyPanel icon={Clock3} title="No activity yet" text="Viewing activity appears here." />
                  ) : null}
                </div>
              </div>

              {canFeedback ? (
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">Feedback</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Field label="Attendance">
                      <select
                        value={feedback.attended}
                        onChange={event => setFeedback(prev => ({ ...prev, attended: event.target.value }))}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="true">Attended</option>
                        <option value="false">Did not attend</option>
                      </select>
                    </Field>
                    <Field label="Interest level">
                      <select
                        value={feedback.interestLevel}
                        onChange={event => setFeedback(prev => ({ ...prev, interestLevel: event.target.value }))}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="none">None</option>
                      </select>
                    </Field>
                    <Field label="Price reaction">
                      <Input value={feedback.priceReaction} onChange={event => setFeedback(prev => ({ ...prev, priceReaction: event.target.value }))} />
                    </Field>
                    <Field label="Property fit">
                      <Input value={feedback.propertyFit} onChange={event => setFeedback(prev => ({ ...prev, propertyFit: event.target.value }))} />
                    </Field>
                    <Field label="Recommended next action">
                      <select
                        value={feedback.recommendedNextAction}
                        onChange={event => setFeedback(prev => ({ ...prev, recommendedNextAction: event.target.value }))}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="offer">Offer</option>
                        <option value="nurture">Nurture</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="reschedule">Reschedule</option>
                        <option value="close_lost">Closure</option>
                        <option value="none">None</option>
                      </select>
                    </Field>
                    <Field label="Follow-up date">
                      <Input
                        type="datetime-local"
                        value={feedback.followUpDate}
                        onChange={event => setFeedback(prev => ({ ...prev, followUpDate: event.target.value }))}
                      />
                    </Field>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <Field label="Objections">
                      <Textarea value={feedback.objections} onChange={event => setFeedback(prev => ({ ...prev, objections: event.target.value }))} />
                    </Field>
                    <Field label="Financing/readiness notes">
                      <Textarea value={feedback.financingNotes} onChange={event => setFeedback(prev => ({ ...prev, financingNotes: event.target.value }))} />
                    </Field>
                    <Field label="Seller or landlord feedback">
                      <Textarea value={feedback.sellerFeedback} onChange={event => setFeedback(prev => ({ ...prev, sellerFeedback: event.target.value }))} />
                    </Field>
                    <Field label="Notes">
                      <Textarea value={feedback.notes} onChange={event => setFeedback(prev => ({ ...prev, notes: event.target.value }))} />
                    </Field>
                  </div>
                  <Button
                    className="mt-4"
                    disabled={busy}
                    onClick={() =>
                      submitFeedback.mutate({
                        viewingId: viewing.id,
                        feedback: {
                          attended: feedback.attended === 'true',
                          interestLevel: feedback.interestLevel as any,
                          priceReaction: feedback.priceReaction || undefined,
                          propertyFit: feedback.propertyFit || undefined,
                          objections: feedback.objections || undefined,
                          financingNotes: feedback.financingNotes || undefined,
                          sellerFeedback: feedback.sellerFeedback || undefined,
                          recommendedNextAction: feedback.recommendedNextAction as any,
                          followUpDate: feedback.followUpDate || undefined,
                          notes: feedback.notes || undefined,
                        },
                      })
                    }
                  >
                    <MessageSquare className="h-4 w-4" />
                    Save feedback
                  </Button>
                </div>
              ) : null}
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">Lifecycle</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allowed.has('confirmed') ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => updateViewingStatus.mutate({ viewingId: viewing.id, status: 'confirmed', note: 'Confirmed from detail.' })}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm
                    </Button>
                  ) : null}
                  {allowed.has('completed') ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => updateViewingStatus.mutate({ viewingId: viewing.id, status: 'completed', note: 'Attendance marked from detail.' })}
                    >
                      Attended
                    </Button>
                  ) : null}
                  {allowed.has('no_show') ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => updateViewingStatus.mutate({ viewingId: viewing.id, status: 'no_show', note: 'Marked no-show from detail.' })}
                    >
                      No-show
                    </Button>
                  ) : null}
                  {allowed.has('cancelled') ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => updateViewingStatus.mutate({ viewingId: viewing.id, status: 'cancelled', note: 'Cancelled from detail.' })}
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">Reschedule</p>
                <div className="mt-3 space-y-3">
                  <Input type="datetime-local" value={rescheduleAt} onChange={event => setRescheduleAt(event.target.value)} />
                  <Button
                    variant="outline"
                    disabled={busy || !rescheduleAt}
                    onClick={() =>
                      rescheduleViewing.mutate({
                        viewingId: viewing.id,
                        scheduledAt: rescheduleAt,
                        status: 'awaiting_confirmation',
                        note: 'Rescheduled from detail.',
                      })
                    }
                  >
                    <CalendarClock className="h-4 w-4" />
                    Reschedule
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">Assigned Agent</p>
                <div className="mt-3 space-y-3">
                  <select
                    value={reassignAgentId}
                    onChange={event => setReassignAgentId(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">Select agent</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    disabled={busy || !reassignAgentId || Number(reassignAgentId) === viewing.agentId}
                    onClick={() =>
                      reassignViewing.mutate({
                        viewingId: viewing.id,
                        agentId: Number(reassignAgentId),
                        note: 'Reassigned from viewing detail.',
                      })
                    }
                  >
                    <UserRoundCheck className="h-4 w-4" />
                    Reassign
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function DetailBlock({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-slate-950">{value || 'Not recorded'}</p>
    </div>
  );
}

function groupViewingsByDate(viewings: ViewingRecord[]) {
  const groups = new Map<string, ViewingRecord[]>();
  viewings.forEach(viewing => {
    const date = viewing.scheduledAt ? new Date(viewing.scheduledAt) : null;
    const key = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : 'unscheduled';
    groups.set(key, [...(groups.get(key) || []), viewing]);
  });
  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    label: date === 'unscheduled' ? 'Unscheduled' : formatDate(date),
    items,
  }));
}

function openListing(props: WorkspaceContentProps, viewing: ViewingRecord) {
  if (viewing.listingId) {
    props.setLocation(`/agency/listings?listing=${viewing.listingId}`);
    return;
  }
  if (viewing.propertyId) {
    props.setLocation(`/property/${viewing.propertyId}`);
  }
}
