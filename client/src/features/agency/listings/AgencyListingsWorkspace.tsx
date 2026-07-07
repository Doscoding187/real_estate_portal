import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  Archive,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  Home,
  Image,
  ListFilter,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  Table2,
  UserRoundCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { trpc } from '@/lib/trpc';
import { EmptyPanel, ErrorPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import type { WorkspaceContentProps } from '../workspace/types';
import { compactCurrency, formatAge, numberLabel } from '../workspace/utils';

type InventoryStatus =
  | 'all'
  | 'draft'
  | 'ready_to_submit'
  | 'pending_review'
  | 'rejected'
  | 'approved'
  | 'published'
  | 'private_pending_edits'
  | 'archived';
type AssignmentFilter = 'all' | 'unassigned' | 'inactive';
type AttentionFilter =
  | 'all'
  | 'ready_to_submit'
  | 'needs_attention'
  | 'missing_media'
  | 'rejected'
  | 'stale'
  | 'no_enquiries'
  | 'inactive_agent'
  | 'publication_mismatch';
type TransactionFilter = 'all' | 'sell' | 'rent' | 'auction';
type ViewMode = 'table' | 'cards';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: InventoryStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready_to_submit', label: 'Ready to submit' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'private_pending_edits', label: 'Private edits' },
  { value: 'archived', label: 'Archived' },
];

const ATTENTION_OPTIONS: Array<{ value: AttentionFilter; label: string }> = [
  { value: 'all', label: 'All attention' },
  { value: 'ready_to_submit', label: 'Ready to submit' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'missing_media', label: 'Missing media' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'stale', label: 'Stale' },
  { value: 'no_enquiries', label: 'No enquiries' },
  { value: 'inactive_agent', label: 'Inactive agent' },
  { value: 'publication_mismatch', label: 'Publication mismatch' },
];

function queryNumber(location: string, key: string) {
  const search =
    location.includes('?')
      ? location.split('?')[1] || ''
      : typeof window !== 'undefined'
        ? window.location.search.replace(/^\?/, '')
        : '';
  const params = new URLSearchParams(search);
  const value = Number(params.get(key));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function labelize(value?: string | null) {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function dateLabel(value?: string | Date | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function percentLabel(value?: number | null) {
  return value == null ? 'No rate' : `${value}%`;
}

function performanceLabel(value?: number | null) {
  return value === null || value === undefined ? 'Unavailable' : numberLabel(value);
}

function conversionLabel(listing: any) {
  if (!listing?.performance?.available) return 'Unavailable';
  return percentLabel(listing.performance.conversionRate);
}

function assignmentLabel(listing: any) {
  if (listing?.assignment?.agentId && !listing?.assignment?.inAgency) {
    return 'Outside agency assignment';
  }
  if (listing?.assignedAgent?.name) {
    const status = String(listing.assignedAgent.status || 'approved');
    return status === 'approved'
      ? listing.assignedAgent.name
      : `${listing.assignedAgent.name} (${labelize(status)})`;
  }
  return 'Unassigned';
}

function authoringBadgeClass(status?: string | null) {
  switch (status) {
    case 'published':
    case 'approved':
      return 'bg-emerald-100 text-emerald-700';
    case 'pending_review':
      return 'bg-amber-100 text-amber-700';
    case 'rejected':
      return 'bg-rose-100 text-rose-700';
    case 'archived':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-sky-100 text-sky-700';
  }
}

function publicationBadgeClass(state?: string | null) {
  switch (state) {
    case 'published':
      return 'bg-teal-100 text-teal-700';
    case 'public_with_private_pending_edits':
      return 'bg-violet-100 text-violet-700';
    case 'approved_not_published':
    case 'publication_mismatch':
      return 'bg-amber-100 text-amber-700';
    case 'withdrawn':
    case 'archived':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

function healthBadgeClass(listing: any) {
  if (listing?.health?.reasons?.includes('assigned_agent_inactive')) {
    return 'bg-rose-100 text-rose-700';
  }
  if (listing?.health?.needsAttention) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function healthLabel(listing: any) {
  if (listing?.health?.reasons?.includes('assigned_agent_inactive')) return 'Inactive agent';
  if (listing?.health?.needsAttention) return 'Needs attention';
  return 'Clear';
}

function reasonLabel(reason: string) {
  const labels: Record<string, string> = {
    unassigned_listing: 'Unassigned listing',
    assigned_agent_outside_agency: 'Outside agency assignment',
    assigned_agent_inactive: 'Assigned agent inactive',
    rejection_correction_required: 'Rejection correction required',
    required_details_missing: 'Required details missing',
    missing_media: 'Missing media',
    location_incomplete: 'Location incomplete',
    pricing_missing: 'Pricing missing',
    stale_draft: 'Stale draft',
    publication_mismatch: 'Publication mismatch',
    published_no_recent_enquiries: 'Published with no recent enquiries',
  };
  return labels[reason] || labelize(reason);
}

function actionSupported(listing: any, action: 'submit' | 'archive') {
  if (!listing) return false;
  const status = String(listing.authoringStatus || '');
  if (action === 'archive') return status !== 'archived';
  return ['draft', 'rejected'].includes(status) && Number(listing.readinessScore || 0) >= 75;
}

function SummaryMetric({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
  icon: typeof Home;
}) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-700',
    slate: 'bg-slate-100 text-slate-700',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-md p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{numberLabel(value)}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <p className="font-semibold text-slate-950">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function AssignmentSelect({
  listing,
  agents,
  busy,
  onAssign,
}: {
  listing: any;
  agents: any[];
  busy: boolean;
  onAssign: (listingId: number, agentId: number | null) => void;
}) {
  const outsideAgencyValue =
    listing.assignment?.agentId && !listing.assignment?.inAgency
      ? `outside-${listing.assignment.agentId}`
      : '';
  const currentAgentId = listing.assignedAgent?.id ? Number(listing.assignedAgent.id) : null;
  const hasCurrentAgentOption =
    currentAgentId !== null && agents.some(agent => Number(agent.id) === currentAgentId);
  const currentInactiveValue =
    currentAgentId !== null && !outsideAgencyValue && !hasCurrentAgentOption
      ? String(currentAgentId)
      : '';
  const value = outsideAgencyValue || currentInactiveValue || listing.assignedAgent?.id || '';

  return (
    <select
      value={value}
      disabled={busy}
      onChange={event => {
        if (event.target.value.startsWith('outside-')) return;
        onAssign(listing.id, event.target.value ? Number(event.target.value) : null);
      }}
      className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
      aria-label={`Assigned agent for ${listing.title || `listing ${listing.id}`}`}
    >
      <option value="">Unassigned</option>
      {outsideAgencyValue ? (
        <option value={outsideAgencyValue} disabled>
          Outside agency assignment
        </option>
      ) : null}
      {currentInactiveValue ? (
        <option value={currentInactiveValue} disabled>
          {assignmentLabel(listing)}
        </option>
      ) : null}
      {agents.map(agent => (
        <option key={agent.id} value={agent.id}>
          {agent.name}
        </option>
      ))}
    </select>
  );
}

function ListingTitle({ listing }: { listing: any }) {
  const location = [listing.suburb, listing.city, listing.province].filter(Boolean).join(', ');
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-slate-950">
        {listing.title || listing.address || `Listing #${listing.id}`}
      </p>
      <p className="mt-1 truncate text-sm text-slate-500">
        {location || listing.address || 'Location pending'}
      </p>
    </div>
  );
}

function ListingBadges({ listing }: { listing: any }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge className={authoringBadgeClass(listing.authoringStatus)}>
        {labelize(listing.authoringStatus)}
      </Badge>
      <Badge className={publicationBadgeClass(listing.publicationState)}>
        {labelize(listing.publicationState)}
      </Badge>
      <Badge className={healthBadgeClass(listing)}>{healthLabel(listing)}</Badge>
    </div>
  );
}

function ListingActions({
  listing,
  busy,
  onOpen,
  onEdit,
  onSubmit,
  onArchive,
  onPublic,
}: {
  listing: any;
  busy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onArchive: () => void;
  onPublic: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
      <Button variant="outline" size="sm" onClick={onOpen}>
        <Eye className="h-4 w-4" />
        Detail
      </Button>
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
      {listing.publicUrl ? (
        <Button variant="outline" size="sm" onClick={onPublic}>
          <ArrowUpRight className="h-4 w-4" />
          Public
        </Button>
      ) : null}
      {actionSupported(listing, 'submit') ? (
        <Button size="sm" disabled={busy} onClick={onSubmit}>
          <ClipboardCheck className="h-4 w-4" />
          Submit
        </Button>
      ) : null}
      {actionSupported(listing, 'archive') ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={onArchive}>
          <Archive className="h-4 w-4" />
          Archive
        </Button>
      ) : null}
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export function AgencyListingsWorkspace(props: WorkspaceContentProps) {
  const [location] = useLocation();
  const utils = trpc.useUtils();
  const ownerUserId = useMemo(() => queryNumber(location, 'owner'), [location]);
  const selectedListingFromUrl = useMemo(() => queryNumber(location, 'listing'), [location]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InventoryStatus>('all');
  const [assignment, setAssignment] = useState<AssignmentFilter>('all');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionFilter>('all');
  const [attention, setAttention] = useState<AttentionFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [page, setPage] = useState(1);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);

  useEffect(() => {
    setPage(1);
  }, [assignment, assignedAgentId, attention, ownerUserId, search, status, transactionType]);

  useEffect(() => {
    if (selectedListingFromUrl) {
      setSelectedListingId(selectedListingFromUrl);
    }
  }, [selectedListingFromUrl]);

  const inventoryInput = {
    search: search.trim() || undefined,
    status,
    assignment,
    assignedAgentId: assignedAgentId ? Number(assignedAgentId) : undefined,
    ownerUserId,
    transactionType,
    attention,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const inventoryQuery = trpc.agency.getListingInventory.useQuery(inventoryInput, {
    enabled: Boolean(props.setupComplete),
  });
  const agentsQuery = trpc.agency.listAssignableAgents.useQuery(undefined, {
    enabled: Boolean(props.setupComplete),
  });
  const detailQuery = trpc.agency.getListingDetail.useQuery(
    { listingId: selectedListingId || 0 },
    { enabled: Boolean(selectedListingId) },
  );

  const inventory = inventoryQuery.data;
  const listings = inventory?.listings || [];
  const assignableAgents = agentsQuery.data || [];
  const selectedListing =
    detailQuery.data || listings.find((listing: any) => listing.id === selectedListingId) || null;
  const maxPage = Math.max(1, Math.ceil(Number(inventory?.total || 0) / PAGE_SIZE));
  const busy = inventoryQuery.isFetching || agentsQuery.isFetching;

  const refreshInventory = async () => {
    await Promise.all([
      utils.agency.getListingInventory.invalidate(),
      utils.agency.getListingDetail.invalidate(),
      utils.agency.getDashboardStats.invalidate(),
      utils.agency.getRecentListings.invalidate(),
      utils.agency.listAgents.invalidate(),
    ]);
  };

  const assignListing = trpc.agency.assignListing.useMutation({
    onSuccess: async () => {
      await refreshInventory();
      toast.success('Listing assignment updated');
    },
    onError: error => toast.error(error.message || 'Could not update assignment'),
  });

  const submitListing = trpc.agency.submitListingForReview.useMutation({
    onSuccess: async () => {
      await refreshInventory();
      toast.success('Listing submitted for review');
    },
    onError: error => toast.error(error.message || 'Could not submit listing'),
  });

  const archiveListing = trpc.agency.archiveListing.useMutation({
    onSuccess: async () => {
      await refreshInventory();
      toast.success('Listing archived');
    },
    onError: error => toast.error(error.message || 'Could not archive listing'),
  });

  const mutationBusy =
    assignListing.isPending || submitListing.isPending || archiveListing.isPending;

  const handleAssign = (listingId: number, agentId: number | null) => {
    assignListing.mutate({ listingId, agentId });
  };

  const openEditor = (listingId: number) => {
    props.setLocation(`/listings/create?edit=true&id=${listingId}`);
  };

  const openDetail = (listingId: number) => {
    setSelectedListingId(listingId);
    props.setLocation(`/agency/listings?listing=${listingId}`);
  };

  const closeDetail = () => {
    setSelectedListingId(null);
    if (selectedListingFromUrl) {
      props.setLocation('/agency/listings');
    }
  };

  const openPublic = (listing: any) => {
    if (listing.publicUrl) props.setLocation(listing.publicUrl);
  };

  const summary = inventory?.summary || {
    published: 0,
    readyToSubmit: 0,
    unassigned: 0,
    inactiveAgent: 0,
    privatePendingEdits: 0,
    missingMedia: 0,
    needsAttention: 0,
  };

  if (!props.setupComplete) {
    return (
      <section className="space-y-5">
        <ErrorPanel title="Complete agency setup before managing listing inventory" />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryMetric label="Published" value={summary.published} tone="emerald" icon={Home} />
        <SummaryMetric label="Ready" value={summary.readyToSubmit} tone="sky" icon={CheckCircle2} />
        <SummaryMetric label="Unassigned" value={summary.unassigned} tone="amber" icon={UserRoundCheck} />
        <SummaryMetric label="Inactive agent" value={summary.inactiveAgent} tone="rose" icon={ShieldAlert} />
        <SummaryMetric label="Private edits" value={summary.privatePendingEdits} tone="slate" icon={Pencil} />
        <SummaryMetric label="Needs attention" value={summary.needsAttention} tone="amber" icon={ListFilter} />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionTitle
              icon={Home}
              title="Inventory"
              eyebrow={`${numberLabel(Number(inventory?.total || 0))} canonical listing records`}
              action={
                <Button onClick={() => props.setLocation('/listings/create')}>
                  <FileText className="h-4 w-4" />
                  New listing
                </Button>
              }
            />
            <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                aria-label="Table view"
              >
                <Table2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                aria-label="Card view"
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {ownerUserId ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <span>Team member inventory filter is active.</span>
              <Button variant="outline" size="sm" onClick={() => props.setLocation('/agency/listings')}>
                Clear
              </Button>
            </div>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-[minmax(180px,1fr)_150px_140px_160px_130px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search title, address, city"
                className="pl-9"
              />
            </div>
            <select
              value={status}
              onChange={event => setStatus(event.target.value as InventoryStatus)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={assignment}
              onChange={event => setAssignment(event.target.value as AssignmentFilter)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All assignment</option>
              <option value="unassigned">Unassigned</option>
              <option value="inactive">Inactive agent</option>
            </select>
            <select
              value={assignedAgentId}
              onChange={event => setAssignedAgentId(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Any active agent</option>
              {assignableAgents.map((agent: any) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <select
              value={transactionType}
              onChange={event => setTransactionType(event.target.value as TransactionFilter)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All deals</option>
              <option value="sell">Sale</option>
              <option value="rent">Rental</option>
              <option value="auction">Auction</option>
            </select>
            <select
              value={attention}
              onChange={event => setAttention(event.target.value as AttentionFilter)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              {ATTENTION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {inventoryQuery.error ? <ErrorPanel title="Listing inventory could not be loaded" /> : null}
          {inventoryQuery.isLoading ? (
            <div className="h-56 animate-pulse rounded-lg bg-slate-100" />
          ) : null}

          {!inventoryQuery.isLoading && listings.length ? (
            viewMode === 'table' ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="hidden bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:grid xl:grid-cols-[minmax(160px,1.4fr)_minmax(130px,0.85fr)_minmax(140px,1fr)_90px_120px_80px_minmax(160px,0.9fr)]">
                  <span>Listing</span>
                  <span>State</span>
                  <span>Agent</span>
                  <span>Readiness</span>
                  <span>Performance</span>
                  <span>Updated</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y divide-slate-200">
                  {listings.map((listing: any) => (
                    <div
                      key={listing.id}
                      className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(160px,1.4fr)_minmax(130px,0.85fr)_minmax(140px,1fr)_90px_120px_80px_minmax(160px,0.9fr)] xl:items-center"
                    >
                      <button
                        type="button"
                        onClick={() => openDetail(listing.id)}
                        className="min-w-0 text-left"
                      >
                        <ListingTitle listing={listing} />
                        <p className="mt-1 text-sm text-slate-500">
                          {labelize(listing.transactionType)} · {labelize(listing.propertyType)} ·{' '}
                          {compactCurrency(Number(listing.price || 0))}
                        </p>
                      </button>
                      <ListingBadges listing={listing} />
                      <AssignmentSelect
                        listing={listing}
                        agents={assignableAgents}
                        busy={mutationBusy}
                        onAssign={handleAssign}
                      />
                      <div>
                        <p className="font-semibold text-slate-950">{listing.readinessScore}%</p>
                        <p className="text-xs text-slate-500">{listing.media.total} media items</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">
                          {performanceLabel(listing.performance.views)} views
                        </p>
                        <p className="text-xs text-slate-500">
                          {performanceLabel(listing.performance.enquiries)} enquiries
                        </p>
                      </div>
                      <p className="text-sm text-slate-500">{formatAge(listing.timestamps.updatedAt)}</p>
                      <ListingActions
                        listing={listing}
                        busy={mutationBusy}
                        onOpen={() => openDetail(listing.id)}
                        onEdit={() => openEditor(listing.id)}
                        onSubmit={() => submitListing.mutate({ listingId: listing.id })}
                        onArchive={() => archiveListing.mutate({ listingId: listing.id })}
                        onPublic={() => openPublic(listing)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {listings.map((listing: any) => (
                  <div key={listing.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => openDetail(listing.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <ListingTitle listing={listing} />
                      </button>
                      <ListingBadges listing={listing} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <MiniMetric label="Readiness" value={`${listing.readinessScore}%`} />
                      <MiniMetric label="Media" value={listing.media.total} />
                      <MiniMetric label="Views" value={performanceLabel(listing.performance.views)} />
                      <MiniMetric label="Enquiries" value={performanceLabel(listing.performance.enquiries)} />
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <AssignmentSelect
                        listing={listing}
                        agents={assignableAgents}
                        busy={mutationBusy}
                        onAssign={handleAssign}
                      />
                      <ListingActions
                        listing={listing}
                        busy={mutationBusy}
                        onOpen={() => openDetail(listing.id)}
                        onEdit={() => openEditor(listing.id)}
                        onSubmit={() => submitListing.mutate({ listingId: listing.id })}
                        onArchive={() => archiveListing.mutate({ listingId: listing.id })}
                        onPublic={() => openPublic(listing)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}

          {!inventoryQuery.isLoading && !listings.length ? (
            <EmptyPanel
              icon={FileText}
              title="No listing records"
              text="Inventory will appear once agency listings are attached to the canonical authoring table."
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-500">
              Page {page} of {maxPage} · {numberLabel(Number(inventory?.total || 0))} records
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || busy} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= maxPage || busy}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => inventoryQuery.refetch()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={Boolean(selectedListingId)} onOpenChange={open => !open && closeDetail()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {selectedListing ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedListing.title || `Listing #${selectedListing.id}`}</SheetTitle>
                <SheetDescription>
                  Canonical listing #{selectedListing.id} · Agency #{selectedListing.agencyId || 'inferred'}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <div className="flex flex-wrap gap-2">
                  <ListingBadges listing={selectedListing} />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <DetailBlock label="Assigned agent" value={assignmentLabel(selectedListing)} />
                  <DetailBlock label="Creator" value={selectedListing.creator?.name || 'Unknown'} />
                  <DetailBlock label="Next action" value={selectedListing.nextAction || 'Review listing'} />
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">Assignment</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Reassignment changes operational contact and public mirror agent only.
                      </p>
                    </div>
                    <div className="min-w-[220px]">
                      <AssignmentSelect
                        listing={selectedListing}
                        agents={assignableAgents}
                        busy={mutationBusy}
                        onAssign={handleAssign}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <DetailBlock label="Readiness" value={`${selectedListing.readinessScore}%`} />
                  <DetailBlock label="Quality" value={`${selectedListing.qualityScore}%`} />
                  <DetailBlock label="Media" value={`${selectedListing.media.total} total`} />
                  <DetailBlock label="Images" value={selectedListing.media.images} />
                </div>

                {selectedListing.health?.reasons?.length ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-950">Attention reasons</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedListing.health.reasons.map((reason: string) => (
                        <Badge key={reason} className="bg-white text-amber-800">
                          {reasonLabel(reason)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="font-semibold text-emerald-950">No listing health exceptions</p>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-4">
                  <DetailBlock label="Views" value={performanceLabel(selectedListing.performance.views)} />
                  <DetailBlock label="Enquiries" value={performanceLabel(selectedListing.performance.enquiries)} />
                  <DetailBlock label="Days live" value={selectedListing.performance.daysLive ?? 'Private'} />
                  <DetailBlock label="Conversion" value={conversionLabel(selectedListing)} />
                </div>
                <p className="text-xs text-slate-500">
                  Performance source: {labelize(selectedListing.performance.source)}.
                </p>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">Review state</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <DetailBlock label="Submitted" value={dateLabel(selectedListing.review?.submittedAt)} />
                    <DetailBlock label="Reviewed" value={dateLabel(selectedListing.review?.reviewedAt)} />
                    <DetailBlock label="Review status" value={labelize(selectedListing.review?.status)} />
                  </div>
                  {selectedListing.rejection?.reason || selectedListing.rejection?.note ? (
                    <div className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-900">
                      <p className="font-semibold">{selectedListing.rejection.reason || 'Rejected'}</p>
                      {selectedListing.rejection.note ? (
                        <p className="mt-1 leading-6">{selectedListing.rejection.note}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {detailQuery.data?.mediaItems?.length ? (
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">Media summary</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {detailQuery.data.mediaItems.slice(0, 6).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-md bg-slate-50 p-2">
                          <Image className="h-4 w-4 text-slate-500" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-950">
                              {labelize(item.mediaType)} {item.isPrimary ? 'primary' : ''}
                            </p>
                            <p className="text-xs text-slate-500">{labelize(item.processingStatus)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {detailQuery.data?.reviewHistory?.length ? (
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">Activity</p>
                    <div className="mt-3 space-y-2">
                      {detailQuery.data.reviewHistory.map((item: any) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 p-3">
                          <div>
                            <p className="font-medium text-slate-950">{labelize(item.status)}</p>
                            <p className="text-sm text-slate-500">{item.reviewNotes || item.rejectionReason || 'Review queue update'}</p>
                          </div>
                          <p className="shrink-0 text-xs text-slate-500">{dateLabel(item.submittedAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => openEditor(selectedListing.id)}>
                    <Pencil className="h-4 w-4" />
                    Continue editing
                  </Button>
                  {selectedListing.publicUrl ? (
                    <Button variant="outline" onClick={() => openPublic(selectedListing)}>
                      <ArrowUpRight className="h-4 w-4" />
                      Open public listing
                    </Button>
                  ) : null}
                  {actionSupported(selectedListing, 'submit') ? (
                    <Button
                      variant="outline"
                      disabled={mutationBusy}
                      onClick={() => submitListing.mutate({ listingId: selectedListing.id })}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Submit for review
                    </Button>
                  ) : null}
                  {actionSupported(selectedListing, 'archive') ? (
                    <Button
                      variant="outline"
                      disabled={mutationBusy}
                      onClick={() => archiveListing.mutate({ listingId: selectedListing.id })}
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : detailQuery.isLoading ? (
            <div className="h-56 animate-pulse rounded-lg bg-slate-100" />
          ) : detailQuery.error ? (
            <div className="px-4">
              <ErrorPanel title="Listing detail could not be loaded" />
            </div>
          ) : (
            <div className="px-4">
              <EmptyPanel icon={XCircle} title="Listing not found" text="This record is not available to your agency." />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
