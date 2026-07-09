import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileUp,
  HandCoins,
  ListChecks,
  Plus,
  RefreshCw,
  UserRoundPlus,
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
import { EmptyPanel, ErrorPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import type { AgencyLead, Tone, WorkspaceContentProps } from '../workspace/types';
import { formatDate, numberLabel, toneClasses } from '../workspace/utils';

type OfferVersion = {
  id: number;
  versionNumber: number;
  actor?: string | null;
  eventType?: string | null;
  status?: string | null;
  amount: number;
  offerExpiry?: string | null;
  conditionsSummary?: string | null;
  specialConditions?: string | null;
  createdAt?: string | null;
  submittedAt?: string | null;
  decidedAt?: string | null;
};

type WorkItem = {
  id: number;
  title: string;
  description?: string | null;
  responsibleParty?: string | null;
  dueAt?: string | null;
  status?: string | null;
  overdue?: boolean;
  completedAt?: string | null;
  notes?: string | null;
};

type TransactionRecord = {
  id: number;
  status?: string | null;
  stage?: string | null;
  riskStatus?: string | null;
  nextAction?: string | null;
  nextDeadline?: string | null;
  acceptedAmount: number;
  expectedCommission: number;
  grossCommission: number;
  agencyShare: number;
  agentShare: number;
  commissionStatus?: string | null;
  expectedPaymentDate?: string | null;
  openedAt?: string | null;
  createdAt?: string | null;
  milestones?: WorkItem[];
  conditions?: WorkItem[];
  parties?: Array<{ id: number; role?: string | null; name: string; email?: string | null; phone?: string | null }>;
  documents?: Array<{
    id: number;
    documentType?: string | null;
    fileName: string;
    uploadedAt?: string | null;
    status?: string | null;
    visibilityScope?: string | null;
  }>;
  activity?: Array<{ id: number; eventType: string; description: string; createdAt?: string | null }>;
};

type DealRecord = {
  id: number;
  transactionType?: 'sale' | 'rental' | string | null;
  stage?: string | null;
  interestStatus?: string | null;
  riskStatus?: string | null;
  acceptedAmount?: number | null;
  acceptedAt?: string | null;
  nextAction?: string | null;
  nextDeadline?: string | null;
  createdAt?: string | null;
  lead?: { id: number; name?: string | null; email?: string | null; phone?: string | null } | null;
  listing?: { id: number; title?: string | null; action?: string | null; city?: string | null; askingPrice?: number | null; monthlyRent?: number | null } | null;
  property?: { id: number; title?: string | null; city?: string | null; price?: number | null } | null;
  agent?: { id: number; name?: string | null; email?: string | null; phone?: string | null } | null;
  offers?: OfferVersion[];
  latestOffer?: OfferVersion | null;
  transaction?: TransactionRecord | null;
};

type ViewingOption = {
  id: number;
  leadId?: number | null;
  listingId?: number | null;
  propertyId?: number | null;
  agentId?: number | null;
  scheduledAt?: string | null;
  attendee?: string | null;
  lead?: { id: number; name?: string | null } | null;
  listing?: { id: number; title?: string | null } | null;
  property?: { id: number; title?: string | null } | null;
};

const currency = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

const shortDate = new Intl.DateTimeFormat('en-ZA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function money(value?: number | null) {
  return currency.format(Number(value || 0));
}

function label(value?: string | null) {
  if (!value) return 'Not set';
  return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function when(value?: string | null) {
  if (!value) return 'No deadline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No deadline';
  return shortDate.format(date);
}

function dateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return shortDate.format(date);
}

function stageTone(value?: string | null): Tone {
  if (['accepted', 'transaction_open', 'transaction_progression'].includes(String(value || ''))) return 'sky';
  if (['completed'].includes(String(value || ''))) return 'emerald';
  if (['cancelled', 'rejected', 'withdrawn', 'expired'].includes(String(value || ''))) return 'rose';
  if (['submitted', 'under_review', 'negotiation'].includes(String(value || ''))) return 'amber';
  return 'slate';
}

function riskTone(value?: string | null): Tone {
  if (value === 'complete' || value === 'on_track') return 'emerald';
  if (value === 'at_risk' || value === 'blocked' || value === 'cancelled') return 'rose';
  if (value === 'watch') return 'amber';
  return 'slate';
}

function badgeClass(tone: Tone) {
  const classes = toneClasses(tone);
  return cn(classes.soft, classes.border, classes.text);
}

function activeWorkCount(items?: WorkItem[]) {
  return (items || []).filter(item => !['completed', 'waived', 'cancelled'].includes(String(item.status || ''))).length;
}

function useDealRefresh(selectedDealId?: number | null) {
  const utils = trpc.useUtils();
  return async () => {
    await Promise.all([
      utils.agency.getDealWorkspace.invalidate(),
      selectedDealId
        ? utils.agency.getDealWorkspace.invalidate({ dealId: selectedDealId, limit: 1 })
        : Promise.resolve(),
      utils.agency.getMyDay.invalidate(),
      utils.agency.getLeads.invalidate(),
      utils.agency.getRecentLeads.invalidate(),
      utils.agency.getDashboardStats.invalidate(),
      utils.agency.getCommissionStats.invalidate(),
    ]);
  };
}

export function AgencyTransactionsWorkspace(props: WorkspaceContentProps) {
  const [selectedDealId, setSelectedDealId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const id = Number(new URLSearchParams(window.location.search).get('deal') || 0);
    return Number.isFinite(id) && id > 0 ? id : null;
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const refresh = useDealRefresh(selectedDealId);

  const dealsQuery = trpc.agency.getDealWorkspace.useQuery(
    { limit: 80 },
    { enabled: Boolean(props.setupComplete) },
  );
  const completedViewingsQuery = trpc.agency.getViewings.useQuery(
    { status: 'completed', limit: 100, offset: 0 },
    { enabled: Boolean(props.setupComplete) },
  );
  const deals = (dealsQuery.data || []) as DealRecord[];
  const completedViewingsData = completedViewingsQuery.data as
    | { viewings?: ViewingOption[] }
    | ViewingOption[]
    | undefined;
  const completedViewings = Array.isArray(completedViewingsData)
    ? completedViewingsData
    : completedViewingsData?.viewings || [];
  const selectedDeal = deals.find(deal => deal.id === selectedDealId) || deals[0] || null;

  const metrics = useMemo(() => {
    const accepted = deals.filter(deal => deal.transaction).length;
    const activeOffers = deals.filter(deal => !deal.transaction && deal.latestOffer).length;
    const expectedCommission = deals.reduce(
      (sum, deal) => sum + Number(deal.transaction?.expectedCommission || 0),
      0,
    );
    const atRisk = deals.filter(deal =>
      ['at_risk', 'blocked'].includes(String(deal.transaction?.riskStatus || deal.riskStatus || '')),
    ).length;
    return { accepted, activeOffers, expectedCommission, atRisk };
  }, [deals]);

  if (!props.setupComplete) {
    return <ErrorPanel title="Complete agency setup before using Deals" />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Connected commercial engine</p>
            <h2 className="text-xl font-semibold text-slate-950">Offers and Transactions</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => dealsQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New deal
            </Button>
          </div>
        </CardContent>
      </Card>

      {dealsQuery.error ? <ErrorPanel title="Deals could not be loaded" /> : null}
      {dealsQuery.isLoading ? <div className="h-56 animate-pulse rounded-lg bg-slate-100" /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DealMetric label="Active offers" value={metrics.activeOffers} tone="amber" />
        <DealMetric label="Open transactions" value={metrics.accepted} tone="sky" />
        <DealMetric label="Expected commission" value={money(metrics.expectedCommission)} tone="emerald" />
        <DealMetric label="Risk watch" value={metrics.atRisk} tone={metrics.atRisk ? 'rose' : 'slate'} />
      </div>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <SectionTitle icon={BriefcaseBusiness} title="Deal Records" eyebrow={`${numberLabel(deals.length)} tracked`} />
          </CardHeader>
          <CardContent className="space-y-2">
            {deals.map(deal => (
              <DealListRow
                key={deal.id}
                deal={deal}
                active={selectedDeal?.id === deal.id}
                onClick={() => setSelectedDealId(deal.id)}
              />
            ))}
            {!deals.length ? (
              <EmptyPanel icon={BriefcaseBusiness} title="No deals yet" text="Create a deal from a completed viewing or qualified lead." />
            ) : null}
          </CardContent>
        </Card>

        {selectedDeal ? (
          <DealDetail
            deal={selectedDeal}
            refresh={refresh}
            onCounter={() => setCounterOpen(true)}
            onCondition={() => setConditionOpen(true)}
            onParty={() => setPartyOpen(true)}
          />
        ) : (
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <EmptyPanel icon={HandCoins} title="Select a deal" text="Offer and transaction detail appears here." />
            </CardContent>
          </Card>
        )}
      </section>

      <CreateDealDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        leads={props.leads}
        viewings={completedViewings}
        onSaved={async dealId => {
          await refresh();
          setSelectedDealId(dealId);
          setCreateOpen(false);
        }}
      />

      <CounterDialog
        open={counterOpen}
        onOpenChange={setCounterOpen}
        deal={selectedDeal}
        onSaved={async () => {
          await refresh();
          setCounterOpen(false);
        }}
      />

      <ConditionDialog
        open={conditionOpen}
        onOpenChange={setConditionOpen}
        transaction={selectedDeal?.transaction || null}
        onSaved={async () => {
          await refresh();
          setConditionOpen(false);
        }}
      />

      <PartyDialog
        open={partyOpen}
        onOpenChange={setPartyOpen}
        transaction={selectedDeal?.transaction || null}
        onSaved={async () => {
          await refresh();
          setPartyOpen(false);
        }}
      />

    </section>
  );
}

function DealMetric({ label: metricLabel, value, tone }: { label: string; value: string | number; tone: Tone }) {
  const classes = toneClasses(tone);
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-slate-500">{metricLabel}</p>
        <p className={cn('mt-2 text-2xl font-semibold', classes.text)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function DealListRow({ deal, active, onClick }: { deal: DealRecord; active: boolean; onClick: () => void }) {
  const title = deal.listing?.title || deal.property?.title || deal.lead?.name || `Deal #${deal.id}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50',
        active ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{deal.lead?.name || 'No lead'} - {deal.agent?.name || 'No agent'}</p>
        </div>
        <Badge className={cn('shrink-0 border', badgeClass(stageTone(deal.stage)))}>{label(deal.stage)}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <span>{label(deal.transactionType)}</span>
        <span className="text-right">{money(deal.acceptedAmount || deal.latestOffer?.amount || 0)}</span>
      </div>
    </button>
  );
}

function DealDetail({
  deal,
  refresh,
  onCounter,
  onCondition,
  onParty,
}: {
  deal: DealRecord;
  refresh: () => Promise<void>;
  onCounter: () => void;
  onCondition: () => void;
  onParty: () => void;
}) {
  const submitOffer = trpc.agency.submitOfferVersion.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Offer submitted');
    },
    onError: error => toast.error(error.message || 'Offer could not be submitted'),
  });
  const acceptOffer = trpc.agency.acceptOfferVersion.useMutation({
    onSuccess: async result => {
      await refresh();
      toast.success(result.idempotent ? 'Transaction already exists' : 'Transaction opened');
    },
    onError: error => toast.error(error.message || 'Offer could not be accepted'),
  });
  const updateWorkItem = trpc.agency.updateTransactionWorkItem.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Transaction work updated');
    },
    onError: error => toast.error(error.message || 'Transaction work could not be updated'),
  });
  const updateTransaction = trpc.agency.updateTransaction.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success('Transaction updated');
    },
    onError: error => toast.error(error.message || 'Transaction could not be updated'),
  });

  const transaction = deal.transaction;
  const latestOffer = deal.latestOffer;
  const canSubmit = latestOffer && ['draft', 'countered'].includes(String(latestOffer.status || ''));
  const canAccept = latestOffer && !transaction && !['rejected', 'withdrawn', 'expired'].includes(String(latestOffer.status || ''));
  const activeConditions = activeWorkCount(transaction?.conditions);
  const activeMilestones = activeWorkCount(transaction?.milestones);
  const listingContext = deal.listing?.title || deal.property?.title || 'No listing context';
  const buyerName = deal.lead?.name || 'Buyer not recorded';

  return (
    <div className="min-w-0 space-y-5">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <Badge className={cn('border', badgeClass(stageTone(deal.stage)))}>{label(deal.stage)}</Badge>
                <Badge className={cn('border', badgeClass(riskTone(transaction?.riskStatus || deal.riskStatus)))}>
                  {label(transaction?.riskStatus || deal.riskStatus)}
                </Badge>
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">
                {listingContext || buyerName || `Deal #${deal.id}`}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {buyerName} - {deal.agent?.name || 'No responsible agent'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-500">Expected commission</p>
              <p className="text-2xl font-semibold text-emerald-700">{money(transaction?.expectedCommission || 0)}</p>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeaderFact label="Buyer" value={buyerName} />
            <HeaderFact label="Seller/listing context" value={listingContext} />
            <HeaderFact label="Accepted price" value={money(transaction?.acceptedAmount || deal.acceptedAmount || latestOffer?.amount || 0)} />
            <HeaderFact label="Transaction status" value={label(transaction?.status || deal.stage)} />
            <HeaderFact label="Commission snapshot" value={money(transaction?.expectedCommission || 0)} />
            <HeaderFact label="Created" value={dateTime(transaction?.createdAt || deal.createdAt)} />
            <HeaderFact label="Accepted" value={dateTime(deal.acceptedAt || transaction?.openedAt || transaction?.createdAt)} />
            <HeaderFact label="Next deadline" value={when(transaction?.nextDeadline || deal.nextDeadline)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {canSubmit ? (
              <Button
                variant="outline"
                disabled={submitOffer.isPending}
                onClick={() => submitOffer.mutate({ offerVersionId: latestOffer.id })}
              >
                <ArrowRight className="h-4 w-4" />
                Submit offer
              </Button>
            ) : null}
            {!transaction ? (
              <>
                <Button variant="outline" onClick={onCounter} disabled={!latestOffer}>
                  <HandCoins className="h-4 w-4" />
                  Record counter
                </Button>
                <Button
                  disabled={!canAccept || acceptOffer.isPending}
                  onClick={() =>
                    latestOffer &&
                    acceptOffer.mutate({
                      offerVersionId: latestOffer.id,
                      commissionBasis: 'percentage',
                      commissionPercentage: 5,
                      commissionVatTreatment: 'exclusive',
                      agencySharePercentage: 50,
                      referralSplit: 0,
                      otherDeductions: 0,
                      transferDutyVatTreatment: deal.transactionType === 'rental' ? 'not_applicable' : 'unknown',
                    })
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Accept and open transaction
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onCondition}>
                  <ListChecks className="h-4 w-4" />
                  Add condition
                </Button>
                <Button variant="outline" onClick={onParty}>
                  <UserRoundPlus className="h-4 w-4" />
                  Add party
                </Button>
                <Button
                  variant="outline"
                  disabled={updateTransaction.isPending || transaction.status === 'completed'}
                  onClick={() =>
                    updateTransaction.mutate({
                      transactionId: transaction.id,
                      status: 'completed',
                      commissionStatus: 'payable',
                      note: 'Transaction completed from deal workspace.',
                    })
                  }
                >
                  <CircleDollarSign className="h-4 w-4" />
                  Mark complete
                </Button>
                <Button
                  variant="outline"
                  disabled={updateTransaction.isPending || transaction.status === 'cancelled'}
                  onClick={() =>
                    updateTransaction.mutate({
                      transactionId: transaction.id,
                      status: 'cancelled',
                      commissionStatus: 'cancelled',
                      note: 'Transaction cancelled from deal workspace.',
                    })
                  }
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <SectionTitle icon={HandCoins} title="Offer Timeline" eyebrow={`${numberLabel(deal.offers?.length || 0)} versions`} />
            </CardHeader>
            <CardContent className="space-y-3">
              {(deal.offers || []).map(offer => (
                <OfferRow key={offer.id} offer={offer} />
              ))}
              {!deal.offers?.length ? (
                <EmptyPanel icon={HandCoins} title="No offer terms" text="Draft terms from a completed viewing or qualified lead." />
              ) : null}
            </CardContent>
          </Card>

          {transaction ? (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <SectionTitle icon={CalendarClock} title="Milestone Timeline" eyebrow={`${numberLabel(activeMilestones)} active`} />
              </CardHeader>
              <CardContent className="space-y-2">
                {(transaction.milestones || []).map(item => (
                  <WorkItemRow
                    key={item.id}
                    item={item}
                    onComplete={() =>
                      updateWorkItem.mutate({
                        transactionId: transaction.id,
                        itemType: 'milestone',
                        itemId: item.id,
                        status: 'completed',
                      })
                    }
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-5">
          {transaction ? (
            <>
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <SectionTitle icon={ListChecks} title="Conditions" eyebrow={`${numberLabel(activeConditions)} outstanding`} />
                </CardHeader>
                <CardContent className="space-y-2">
                  {(transaction.conditions || []).slice(0, 8).map(item => (
                    <WorkItemRow
                      key={item.id}
                      item={item}
                      compact
                      onComplete={() =>
                        updateWorkItem.mutate({
                          transactionId: transaction.id,
                          itemType: 'condition',
                          itemId: item.id,
                          status: 'completed',
                        })
                      }
                    />
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <SectionTitle icon={CircleDollarSign} title="Commission" eyebrow={label(transaction.commissionStatus)} />
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <MoneyLine label="Gross" value={transaction.grossCommission} />
                  <MoneyLine label="Agency share" value={transaction.agencyShare} />
                  <MoneyLine label="Agent share" value={transaction.agentShare} />
                  <MoneyLine label="Expected payment" value={0} text={when(transaction.expectedPaymentDate)} />
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <SectionTitle icon={FileUp} title="Private Documents" eyebrow="Safe disabled" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Private document storage not configured locally. Upload is disabled; only existing
                    agency-private metadata can appear here.
                  </div>
                  {(transaction.documents || []).slice(0, 6).map(document => (
                    <div key={document.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-950">{document.fileName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {label(document.documentType)} - {label(document.visibilityScope || 'agency_private')} - {formatDate(document.uploadedAt)}
                      </p>
                    </div>
                  ))}
                  {!transaction.documents?.length ? (
                    <EmptyPanel icon={FileUp} title="No document metadata" text="Private document metadata remains agency-scoped when present." />
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <SectionTitle icon={Clock3} title="Activity Timeline" eyebrow={`${numberLabel(transaction.activity?.length || 0)} events`} />
                </CardHeader>
                <CardContent className="space-y-2">
                  {(transaction.activity || []).slice(0, 10).map(item => (
                    <ActivityRow key={item.id} item={item} />
                  ))}
                  {!transaction.activity?.length ? (
                    <EmptyPanel icon={Clock3} title="No transaction activity" text="Accepted offer and transaction updates appear here." />
                  ) : null}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <EmptyPanel icon={CalendarClock} title="No transaction yet" text="Accept an offer to generate milestones, conditions, and commission." />
              </CardContent>
            </Card>
          )}
        </aside>
      </section>
    </div>
  );
}

function HeaderFact({ label: factLabel, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{factLabel}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function OfferRow({ offer }: { offer: OfferVersion }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-950">V{offer.versionNumber}: {money(offer.amount)}</p>
          <p className="mt-1 text-sm text-slate-500">{label(offer.eventType)} by {label(offer.actor)}</p>
        </div>
        <Badge className={cn('border', badgeClass(stageTone(offer.status)))}>{label(offer.status)}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-600">{offer.conditionsSummary || offer.specialConditions || 'No special terms recorded.'}</p>
      <p className="mt-2 text-xs text-slate-500">Expiry: {when(offer.offerExpiry)}</p>
    </div>
  );
}

function WorkItemRow({ item, compact, onComplete }: { item: WorkItem; compact?: boolean; onComplete: () => void }) {
  const done = ['completed', 'waived', 'cancelled'].includes(String(item.status || ''));
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{item.title}</p>
          {!compact && item.description ? <p className="mt-1 text-sm text-slate-500">{item.description}</p> : null}
          {item.notes ? <p className="mt-1 text-sm text-slate-500">{item.notes}</p> : null}
          <p className="mt-1 text-xs text-slate-500">{label(item.responsibleParty)} - {when(item.dueAt)}</p>
        </div>
        <Badge className={cn('shrink-0 border', badgeClass(done ? 'emerald' : item.overdue ? 'rose' : 'amber'))}>{label(item.status)}</Badge>
      </div>
      {!done ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          aria-label={`Complete ${item.title}`}
          onClick={onComplete}
        >
          <CheckCircle2 className="h-4 w-4" />
          Complete
        </Button>
      ) : null}
    </div>
  );
}

function ActivityRow({ item }: { item: { eventType: string; description: string; createdAt?: string | null } }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950">{label(item.eventType)}</p>
        <span className="shrink-0 text-xs text-slate-500">{formatDate(item.createdAt)}</span>
      </div>
      <p className="mt-1 text-sm text-slate-600">{item.description}</p>
    </div>
  );
}

function MoneyLine({ label: lineLabel, value, text }: { label: string; value: number; text?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{lineLabel}</span>
      <span className="font-semibold text-slate-950">{text || money(value)}</span>
    </div>
  );
}

function CreateDealDialog({
  open,
  onOpenChange,
  leads,
  viewings,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: AgencyLead[];
  viewings: ViewingOption[];
  onSaved: (dealId: number) => Promise<void>;
}) {
  const [viewingId, setViewingId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [transactionType, setTransactionType] = useState<'sale' | 'rental'>('sale');
  const [amount, setAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [bondAmount, setBondAmount] = useState('');
  const [expiry, setExpiry] = useState('');
  const [conditions, setConditions] = useState('Bond approval and signed offer document.');
  const createDeal = trpc.agency.createDeal.useMutation({
    onSuccess: async result => {
      toast.success('Deal opened');
      await onSaved(result.dealId);
    },
    onError: error => toast.error(error.message || 'Deal could not be opened'),
  });

  const selectedViewing = viewings.find(viewing => String(viewing.id) === viewingId);
  const selectedLeadId = selectedViewing?.leadId || Number(leadId || 0);
  const canSave = selectedLeadId && amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Open Deal</DialogTitle>
          <DialogDescription>Start a connected offer record from completed viewing interest.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Completed viewing</span>
            <select className="w-full rounded-md border border-slate-200 px-3 py-2" value={viewingId} onChange={event => setViewingId(event.target.value)}>
              <option value="">No source viewing</option>
              {viewings.map(viewing => (
                <option key={viewing.id} value={viewing.id}>
                  #{viewing.id} {viewing.lead?.name || viewing.attendee || 'Viewing'} - {viewing.listing?.title || viewing.property?.title || 'No listing'}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Lead</span>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2"
              value={selectedViewing?.leadId ? String(selectedViewing.leadId) : leadId}
              disabled={Boolean(selectedViewing?.leadId)}
              onChange={event => setLeadId(event.target.value)}
            >
              <option value="">Select lead</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>{lead.name || lead.email || `Lead #${lead.id}`}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Type</span>
            <select className="w-full rounded-md border border-slate-200 px-3 py-2" value={transactionType} onChange={event => setTransactionType(event.target.value as 'sale' | 'rental')}>
              <option value="sale">Sale</option>
              <option value="rental">Rental</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Offer amount</span>
            <Input type="number" min="0" value={amount} onChange={event => setAmount(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Deposit</span>
            <Input type="number" min="0" value={depositAmount} onChange={event => setDepositAmount(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Bond amount</span>
            <Input type="number" min="0" value={bondAmount} onChange={event => setBondAmount(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Offer expiry</span>
            <Input type="datetime-local" value={expiry} onChange={event => setExpiry(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Conditions</span>
            <Textarea value={conditions} onChange={event => setConditions(event.target.value)} />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!canSave || createDeal.isPending}
            onClick={() =>
              createDeal.mutate({
                leadId: Number(selectedLeadId),
                sourceViewingId: viewingId ? Number(viewingId) : undefined,
                listingId: selectedViewing?.listingId || undefined,
                propertyId: selectedViewing?.propertyId || undefined,
                responsibleAgentId: selectedViewing?.agentId || undefined,
                transactionType,
                interestStatus: 'wants_offer',
                terms: {
                  amount: Number(amount),
                  depositAmount: depositAmount ? Number(depositAmount) : undefined,
                  financeRequired: Boolean(bondAmount),
                  bondAmount: bondAmount ? Number(bondAmount) : undefined,
                  offerExpiry: expiry || undefined,
                  conditionsSummary: conditions,
                },
              })
            }
          >
            Open deal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CounterDialog({ open, onOpenChange, deal, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; deal: DealRecord | null; onSaved: () => Promise<void> }) {
  const [actor, setActor] = useState<'buyer' | 'seller' | 'tenant' | 'landlord'>('seller');
  const [amount, setAmount] = useState('');
  const [expiry, setExpiry] = useState('');
  const [note, setNote] = useState('');
  const createCounter = trpc.agency.createOfferVersion.useMutation({
    onSuccess: async () => {
      toast.success('Counter recorded');
      await onSaved();
    },
    onError: error => toast.error(error.message || 'Counter could not be recorded'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Counter</DialogTitle>
          <DialogDescription>Preserve negotiation history without overwriting prior terms.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Actor</span>
            <select className="w-full rounded-md border border-slate-200 px-3 py-2" value={actor} onChange={event => setActor(event.target.value as any)}>
              <option value="seller">Seller</option>
              <option value="buyer">Buyer</option>
              <option value="landlord">Landlord</option>
              <option value="tenant">Tenant</option>
            </select>
          </label>
          <Input type="number" min="0" placeholder="Counter amount" value={amount} onChange={event => setAmount(event.target.value)} />
          <Input type="datetime-local" value={expiry} onChange={event => setExpiry(event.target.value)} />
          <Textarea placeholder="Counter notes or special conditions" value={note} onChange={event => setNote(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!deal || !amount || createCounter.isPending}
            onClick={() =>
              deal &&
              createCounter.mutate({
                dealId: deal.id,
                actor,
                eventType: actor === 'seller' ? 'seller_counter' : actor === 'landlord' ? 'landlord_counter' : actor === 'tenant' ? 'tenant_counter' : 'buyer_counter',
                status: 'submitted',
                parentOfferVersionId: deal.latestOffer?.id,
                terms: {
                  amount: Number(amount),
                  offerExpiry: expiry || undefined,
                  specialConditions: note || undefined,
                },
                note,
              })
            }
          >
            Save counter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConditionDialog({ open, onOpenChange, transaction, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; transaction: TransactionRecord | null; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [responsibleParty, setResponsibleParty] = useState('agency');
  const [dueAt, setDueAt] = useState('');
  const [description, setDescription] = useState('');
  const addCondition = trpc.agency.addTransactionCondition.useMutation({
    onSuccess: async () => {
      toast.success('Condition added');
      await onSaved();
    },
    onError: error => toast.error(error.message || 'Condition could not be added'),
  });

  return (
    <SimpleTransactionDialog open={open} onOpenChange={onOpenChange} title="Add Condition" description="Create a first-class transaction condition with a responsible party and deadline.">
      <Input placeholder="Condition title" value={title} onChange={event => setTitle(event.target.value)} />
      <select className="w-full rounded-md border border-slate-200 px-3 py-2" value={responsibleParty} onChange={event => setResponsibleParty(event.target.value)}>
        {['agency', 'buyer', 'seller', 'tenant', 'landlord', 'conveyancer', 'bond_originator', 'attorney', 'service_provider', 'other'].map(value => (
          <option key={value} value={value}>{label(value)}</option>
        ))}
      </select>
      <Input type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} />
      <Textarea placeholder="Description or notes" value={description} onChange={event => setDescription(event.target.value)} />
      <DialogActions onCancel={() => onOpenChange(false)} onSave={() => transaction && addCondition.mutate({ transactionId: transaction.id, title, responsibleParty: responsibleParty as any, dueAt: dueAt || undefined, description })} disabled={!transaction || !title || addCondition.isPending} />
    </SimpleTransactionDialog>
  );
}

function PartyDialog({ open, onOpenChange, transaction, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; transaction: TransactionRecord | null; onSaved: () => Promise<void> }) {
  const [role, setRole] = useState('conveyancer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const addParty = trpc.agency.addTransactionParty.useMutation({
    onSuccess: async () => {
      toast.success('Party added');
      await onSaved();
    },
    onError: error => toast.error(error.message || 'Party could not be added'),
  });

  return (
    <SimpleTransactionDialog open={open} onOpenChange={onOpenChange} title="Add Party" description="Record professionals and contacts even when they do not yet have accounts.">
      <select className="w-full rounded-md border border-slate-200 px-3 py-2" value={role} onChange={event => setRole(event.target.value)}>
        {['buyer', 'tenant', 'seller', 'landlord', 'listing_agent', 'buyer_agent', 'agency_manager', 'bond_originator', 'conveyancer', 'bond_attorney', 'cancellation_attorney', 'inspector', 'managing_agent', 'service_provider', 'other'].map(value => (
          <option key={value} value={value}>{label(value)}</option>
        ))}
      </select>
      <Input placeholder="Name" value={name} onChange={event => setName(event.target.value)} />
      <Input placeholder="Email" value={email} onChange={event => setEmail(event.target.value)} />
      <Input placeholder="Phone" value={phone} onChange={event => setPhone(event.target.value)} />
      <DialogActions onCancel={() => onOpenChange(false)} onSave={() => transaction && addParty.mutate({ transactionId: transaction.id, role: role as any, name, email: email || undefined, phone: phone || undefined })} disabled={!transaction || !name || addParty.isPending} />
    </SimpleTransactionDialog>
  );
}

function SimpleTransactionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function DialogActions({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button disabled={disabled} onClick={onSave}>Save</Button>
    </div>
  );
}
