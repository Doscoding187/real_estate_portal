import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  CalendarDays,
  ChevronRight,
  FileCheck2,
  FileText,
  Info,
  ListChecks,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import {
  findScheduledPartnerViewing,
  formatPartnerDealStatus,
  formatPartnerDateTime,
  formatPartnerPayoutRecordState,
  getPartnerPayoutRecordState,
  summarizeActivePartnerDealWorkflow,
  type PartnerPayoutRecordState,
  type PartnerViewingRecord,
} from '@/lib/distributionPartnerJourney';

type DealFilter = 'all' | 'in_progress' | 'closed';
type DealSort = 'updated' | 'payout_high' | 'payout_low';

function isClosed(statusValue: unknown) {
  return ['commission_paid', 'cancelled'].includes(String(statusValue || '').toLowerCase());
}

function formatPayoutAmount(value: unknown, currencyValue: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Amount not recorded';
  const currency = String(currencyValue || 'ZAR').trim().toUpperCase();
  const formatted = Math.round(amount).toLocaleString(currency === 'ZAR' ? 'en-ZA' : 'en-US');
  return currency === 'ZAR' ? `R ${formatted}` : `${currency} ${formatted}`;
}

function dealStatusChipClass(status: unknown) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'commission_paid') return 'border-[#cde9d2] bg-[#f5fcf6] text-[#2f8f4e]';
  if (['cancelled', 'lost', 'declined'].includes(normalized)) {
    return 'border-border bg-surface text-muted-foreground';
  }
  return 'border-[#cfe0f8] bg-[#eff5fe] text-[#33507e]';
}

function payoutStateChipClass(state: PartnerPayoutRecordState) {
  if (state === 'paid') return 'border-[#cde9d2] bg-[#f5fcf6] text-[#2f8f4e]';
  if (state === 'approved') return 'border-[#cfe0f8] bg-[#eff5fe] text-[#33507e]';
  if (state === 'pending_approval') return 'border-[#f5d9a8] bg-[#fffbf2] text-[#b07a1e]';
  return 'border-border bg-surface text-muted-foreground';
}

function timestampOf(value: unknown) {
  const time = new Date(String(value || '')).getTime();
  return Number.isFinite(time) ? time : 0;
}

export default function PartnerMyReferralsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<DealFilter>('all');
  const [sort, setSort] = useState<DealSort>('updated');

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  const referralsQuery = trpc.distribution.partner.listMyReferrals.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated, retry: false },
  );
  const viewingsQuery = trpc.distribution.referrer.myViewings.useQuery(
    { includePast: true, limit: 500 },
    { enabled: isAuthenticated, retry: false },
  );
  const payoutsQuery = trpc.distribution.referrer.myCommissionEntries.useQuery(
    { limit: 500 },
    { enabled: isAuthenticated, retry: false },
  );

  const items = referralsQuery.data?.items || [];
  const recordedViewings = (viewingsQuery.data || []) as PartnerViewingRecord[];
  const payoutsByDealId = useMemo(() => {
    const byDealId = new Map<number, any>();
    for (const payout of payoutsQuery.data || []) {
      const dealId = Number(payout.dealId);
      if (Number.isSafeInteger(dealId) && dealId > 0 && !byDealId.has(dealId)) {
        byDealId.set(dealId, payout);
      }
    }
    return byDealId;
  }, [payoutsQuery.data]);
  const filteredItems = useMemo(() => items.filter((item: any) => {
    if (filter === 'in_progress') return !isClosed(item.status);
    if (filter === 'closed') return isClosed(item.status);
    return true;
  }), [filter, items]);
  const sortedItems = useMemo(() => {
    const base = [...filteredItems];
    const payoutAmountOf = (dealId: number) => {
      const amount = Number(payoutsByDealId.get(dealId)?.commissionAmount);
      return Number.isFinite(amount) && amount > 0 ? amount : null;
    };
    if (sort === 'updated') {
      return base.sort((a, b) => timestampOf(b.updatedAt) - timestampOf(a.updatedAt));
    }
    return base.sort((a, b) => {
      const payoutA = payoutAmountOf(Number(a.dealId));
      const payoutB = payoutAmountOf(Number(b.dealId));
      if (payoutA === null && payoutB === null) {
        return timestampOf(b.updatedAt) - timestampOf(a.updatedAt);
      }
      if (payoutA === null) return 1;
      if (payoutB === null) return -1;
      return sort === 'payout_high' ? payoutB - payoutA : payoutA - payoutB;
    });
  }, [filteredItems, payoutsByDealId, sort]);
  const filterCounts = useMemo(
    () => ({
      all: items.length,
      in_progress: items.filter((item: any) => !isClosed(item.status)).length,
      closed: items.filter((item: any) => isClosed(item.status)).length,
    }),
    [items],
  );

  if (loading || referralsQuery.isLoading || viewingsQuery.isLoading || payoutsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-10 pt-7 md:px-7">
        <section>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe0f8] bg-[#eff5fe] px-3 py-1 text-[12px] font-medium text-[#1d6fe3]">
            <FileText className="h-3.5 w-3.5" /> My deals
          </span>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0b1c3f]">
            Follow every introduction you make
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-muted-foreground">
            See the latest recorded status for each person you introduced. Updates come from
            recorded events — a viewing appears only when a booking has been recorded.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="conversion" onClick={() => setLocation('/distribution/partner/developments')}>
              <Search className="mr-2 h-4 w-4" /> Find opportunities
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/payouts')}>
              View referral payouts
            </Button>
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-[#cfe0f8] bg-[#eff5fe] p-5 text-[12.5px] leading-5 text-[#33507e] md:grid-cols-2 md:p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
            <p>
              <span className="font-semibold text-[#0b1c3f]">Every status here is recorded.</span>{' '}
              We show the latest event the team recorded for each deal — nothing is estimated or
              predicted.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
            <p>
              <span className="font-semibold text-[#0b1c3f]">Payouts follow the saved programme terms.</span>{' '}
              Payout amounts and states come from the referral payout record for each deal; they are
              not a promise of payment.
            </p>
          </div>
        </section>

        {referralsQuery.error || viewingsQuery.error || payoutsQuery.error ? (
          <div className="rounded-xl border border-[#f5d9a8] bg-[#fffbf2] p-4 text-sm text-[#b07a1e] shadow-sm" role="alert">
            {payoutsQuery.error && !referralsQuery.error && !viewingsQuery.error
              ? 'We could not load referral payout statuses. Refresh and try again.'
              : 'We could not load the latest deal updates. Refresh and try again.'}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] font-semibold text-[#0b1c3f]">
            Showing {sortedItems.length} deal{sortedItems.length === 1 ? '' : 's'}
          </p>
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
            Sort by
            <select
              value={sort}
              onChange={event => setSort(event.target.value as DealSort)}
              className="h-9 rounded-lg border border-border bg-white px-3 text-sm font-normal text-foreground"
            >
              <option value="updated">Recently updated</option>
              <option value="payout_high">Payout: high to low</option>
              <option value="payout_low">Payout: low to high</option>
            </select>
          </label>
        </div>

        <section className="rounded-xl border border-border bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-4 md:px-5">
            {([
              ['all', 'All deals'],
              ['in_progress', 'In progress'],
              ['closed', 'Closed'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition',
                  filter === value
                    ? 'border-transparent bg-[#1d6fe3] text-white shadow-sm'
                    : 'border-border bg-white text-slate-600 hover:border-[#9cc0ee] hover:text-[#1d6fe3]',
                )}
              >
                {label}
                <span
                  className={cn(
                    'ml-1.5 text-[11px]',
                    filter === value ? 'text-white/80' : 'text-muted-foreground',
                  )}
                >
                  {filterCounts[value]}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-3 p-4 md:p-5">
            {sortedItems.map((item: any) => {
              const dealId = Number(item.dealId);
              const scheduledViewing = findScheduledPartnerViewing(dealId, recordedViewings);
              const processSummary = summarizeActivePartnerDealWorkflow(item.workflowProgress, item.status);
              const payout = payoutsByDealId.get(dealId);
              const payoutState = payout
                ? getPartnerPayoutRecordState(payout.entryStatus, payout.dealStage)
                : null;
              const payoutStatusNote = payoutsQuery.error
                ? 'Payout status could not be loaded.'
                : payout
                  ? null
                  : (payoutsQuery.data || []).length >= 500
                    ? 'Not present in the latest payout records.'
                    : 'No referral payout record has been created yet.';
              const dealStatusLabel =
                String(item.status || '').toLowerCase() === 'viewing_scheduled' && viewingsQuery.error
                  ? 'Deal progress unavailable'
                  : formatPartnerDealStatus(item.status, dealId, recordedViewings);
              const requiredDocuments = Number(item.docProgress?.requiredCount || 0);
              const verifiedDocuments = Number(item.docProgress?.verifiedRequiredCount || 0);

              return (
                <article
                  key={dealId}
                  className="rounded-xl border border-border bg-white p-4 shadow-sm transition hover:border-[#9cc0ee] hover:shadow-md md:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-[16px] font-semibold text-[#0b1c3f]">
                          {item.development?.name || `Referral ${dealId}`}
                        </h2>
                        <span
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                            dealStatusChipClass(item.status),
                          )}
                        >
                          {dealStatusLabel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                        {item.marketMode === 'rent' ? 'Rental' : 'Purchase'} · Deal #{dealId} ·
                        Updated {formatPartnerDateTime(item.updatedAt)}
                      </p>
                      {scheduledViewing ? (
                        <p className="mt-2 flex items-start gap-1.5 text-[12.5px] font-medium text-[#1d6fe3]">
                          <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {new Date(String(scheduledViewing.scheduledStartAt || '')).getTime() < Date.now()
                            ? `Viewing recorded for ${formatPartnerDateTime(scheduledViewing.scheduledStartAt)} — outcome update pending`
                            : `Viewing booked for ${formatPartnerDateTime(scheduledViewing.scheduledStartAt)}`}
                        </p>
                      ) : null}
                      {processSummary ? (
                        <p className="mt-2 flex items-start gap-1.5 text-[12.5px] leading-5 text-muted-foreground">
                          <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Current step: {processSummary}
                        </p>
                      ) : null}
                      {requiredDocuments > 0 ? (
                        <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
                          <FileCheck2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Documents: {verifiedDocuments} of {requiredDocuments} verified
                        </p>
                      ) : null}
                      <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
                        <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {item.manager?.displayName
                          ? `Responsible contact: ${item.manager.displayName}`
                          : 'Responsible contact: Pending assignment'}
                      </p>
                    </div>

                    <div className="w-full shrink-0 rounded-lg border border-[#cde9d2] bg-[#f5fcf6] p-3.5 sm:w-60">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2f8f4e]">
                        Referral payout
                      </p>
                      <p className="mt-1.5 text-[15px] font-semibold text-[#0b1c3f]">
                        {payout
                          ? formatPayoutAmount(payout.commissionAmount, payout.currency)
                          : 'Not yet recorded'}
                      </p>
                      {payout && payoutState ? (
                        <span
                          className={cn(
                            'mt-1.5 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium',
                            payoutStateChipClass(payoutState),
                          )}
                        >
                          {formatPartnerPayoutRecordState(payoutState)}
                        </span>
                      ) : null}
                      {payoutStatusNote ? (
                        <p className="mt-1.5 text-[11.5px] leading-4 text-muted-foreground">
                          {payoutStatusNote}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end border-t border-border pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/distribution/partner/referrals/${dealId}`)}
                    >
                      View deal <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </article>
              );
            })}

            {!referralsQuery.error && !sortedItems.length ? (
              <div className="py-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f0fd] text-[#1d6fe3]">
                  <FileText className="h-5 w-5" />
                </span>
                <h2 className="mt-3 text-lg font-semibold text-[#0b1c3f]">
                  {items.length ? 'No deals in this view' : 'Your introductions will appear here'}
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[13.5px] leading-5 text-muted-foreground">
                  {items.length
                    ? 'Choose another filter to see the rest of your deals.'
                    : 'Explore current opportunities first. If someone wants to proceed, we will guide you through the permission and information steps.'}
                </p>
                {items.length ? (
                  <Button variant="outline" className="mt-4" onClick={() => setFilter('all')}>
                    Show all deals
                  </Button>
                ) : (
                  <Button
                    variant="conversion"
                    className="mt-4"
                    onClick={() => setLocation('/distribution/partner/developments')}
                  >
                    Browse opportunities <Search className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </ReferralAppShell>
  );
}
