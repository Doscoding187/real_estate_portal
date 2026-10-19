import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ChevronRight, CreditCard, Info, Loader2, Search, ShieldCheck } from 'lucide-react';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Button } from '@/components/ui/button';
import {
  describePartnerPayoutRecordState,
  formatPartnerDateTime,
  formatPartnerDealStatus,
  formatPartnerPayoutRecordState,
  getPartnerPayoutRecordState,
  type PartnerPayoutRecordState,
  type PartnerViewingRecord,
} from '@/lib/distributionPartnerJourney';

type EntryStatusFilter = 'all' | 'pending' | 'approved' | 'paid' | 'cancelled';

function formatCurrency(value: number | null | undefined, currency = 'ZAR') {
  const amount = Math.round(Number(value || 0));
  if (!Number.isFinite(amount)) return 'R 0';
  if (currency === 'ZAR') return `R ${amount.toLocaleString('en-ZA')}`;
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

function formatRecordAmount(value: unknown, currency: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Amount not recorded';
  return formatCurrency(amount, String(currency || 'ZAR').toUpperCase());
}

function formatCurrencyTotals(amounts: Record<string, number>) {
  const rows = Object.entries(amounts)
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => formatCurrency(amount, currency));
  return rows.length ? rows.join(' · ') : '—';
}

function payoutStateChipClass(state: PartnerPayoutRecordState) {
  if (state === 'paid') return 'border-[#cde9d2] bg-[#f5fcf6] text-[#2f8f4e]';
  if (state === 'approved') return 'border-[#cfe0f8] bg-[#eff5fe] text-[#33507e]';
  if (state === 'pending_approval') return 'border-[#f5d9a8] bg-[#fffbf2] text-[#b07a1e]';
  return 'border-border bg-surface text-muted-foreground';
}

export default function PartnerCommissionsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<EntryStatusFilter>('all');

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  const commissionsQuery = trpc.distribution.referrer.myCommissionEntries.useQuery(
    {
      limit: 300,
      entryStatus: undefined,
    },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );
  const viewingsQuery = trpc.distribution.referrer.myViewings.useQuery(
    { includePast: true, limit: 500 },
    { enabled: isAuthenticated, retry: false },
  );
  const recordedViewings = (viewingsQuery.data || []) as PartnerViewingRecord[];

  const summary = useMemo(() => {
    const rows = commissionsQuery.data || [];
    return rows.reduce(
      (
        acc: Record<'potential' | 'pending' | 'approved' | 'paid', Record<string, number>>,
        row: any,
      ) => {
        const state = getPartnerPayoutRecordState(row.entryStatus, row.dealStage);
        const amount = Number(row.commissionAmount || 0);
        const currency = String(row.currency || 'ZAR').toUpperCase();
        const bucket = state === 'potential' ? 'potential' :
          state === 'pending_approval' ? 'pending' :
            state === 'approved' ? 'approved' :
              state === 'paid' ? 'paid' : null;
        if (bucket) {
          acc[bucket][currency] = (acc[bucket][currency] || 0) + amount;
        }
        return acc;
      },
      { potential: {}, pending: {}, approved: {}, paid: {} },
    );
  }, [commissionsQuery.data]);

  const filteredRows = useMemo(() => {
    const rows = commissionsQuery.data || [];
    return statusFilter === 'all'
      ? rows
      : rows.filter((row: any) => String(row.entryStatus || '').toLowerCase() === statusFilter);
  }, [commissionsQuery.data, statusFilter]);

  if (loading || commissionsQuery.isLoading || viewingsQuery.isLoading) {
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
            <CreditCard className="h-3.5 w-3.5" /> Referral payouts
          </span>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0b1c3f]">
            Track every referral payout
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-muted-foreground">
            Follow payout amounts, approval, and confirmed payment. This page shows recorded states;
            it does not promise a payment date.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="conversion" onClick={() => setLocation('/distribution/partner/developments')}>
              <Search className="mr-2 h-4 w-4" /> Find opportunities
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
              My deals
            </Button>
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-[#cfe0f8] bg-[#eff5fe] p-5 text-[12.5px] leading-5 text-[#33507e] md:grid-cols-2 md:p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
            <p>
              <span className="font-semibold text-[#0b1c3f]">States are recorded, not promised.</span>{' '}
              Each record shows the latest payout state recorded for a deal. Payment timing is never
              guaranteed on this page.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
            <p>
              <span className="font-semibold text-[#0b1c3f]">Amounts follow the saved programme terms.</span>{' '}
              Potential amounts use the saved referral terms until the deal's eligibility trigger is
              recorded.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold text-[#0b1c3f]">Recorded payout totals</h2>
          <p className="mt-1 text-[13.5px] leading-5 text-muted-foreground">
            Potential amounts use the saved referral terms. They are not payable until the
            opportunity's eligibility trigger is recorded.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Potential
              </p>
              <p className="mt-1.5 text-xl font-semibold text-[#0b1c3f]">
                {formatCurrencyTotals(summary.potential)}
              </p>
            </div>
            <div className="rounded-lg border border-[#f5d9a8] bg-[#fffbf2] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#b07a1e]">
                Pending approval
              </p>
              <p className="mt-1.5 text-xl font-semibold text-[#b07a1e]">
                {formatCurrencyTotals(summary.pending)}
              </p>
            </div>
            <div className="rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#33507e]">
                Approved
              </p>
              <p className="mt-1.5 text-xl font-semibold text-[#33507e]">
                {formatCurrencyTotals(summary.approved)}
              </p>
            </div>
            <div className="rounded-lg border border-[#cde9d2] bg-[#f5fcf6] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2f8f4e]">
                Paid
              </p>
              <p className="mt-1.5 text-xl font-semibold text-[#2f8f4e]">
                {formatCurrencyTotals(summary.paid)}
              </p>
            </div>
          </div>
        </section>

        {commissionsQuery.error ? (
          <div className="rounded-xl border border-[#f5d9a8] bg-[#fffbf2] p-4 text-sm text-[#b07a1e] shadow-sm" role="alert">
            We could not load your referral payout records. Refresh and try again.
          </div>
        ) : null}
        {viewingsQuery.error ? (
          <div className="rounded-xl border border-[#f5d9a8] bg-[#fffbf2] p-4 text-sm text-[#b07a1e] shadow-sm">
            We could not load viewing information, so some deal progress may be unavailable. Your
            referral payout records are still shown below.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] font-semibold text-[#0b1c3f]">
            Showing {filteredRows.length} payout record{filteredRows.length === 1 ? '' : 's'}
          </p>
        </div>

        <section className="rounded-xl border border-border bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 md:px-5">
            <h2 className="text-lg font-semibold text-[#0b1c3f]">Referral payout records</h2>
            <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
              Status
              <select
                className="h-9 rounded-lg border border-border bg-white px-3 text-sm font-normal text-foreground"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as EntryStatusFilter)}
              >
                <option value="all">All</option>
                <option value="pending">Potential or pending approval</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          <div className="space-y-3 p-4 md:p-5">
            {filteredRows.map((row: any) => {
              const payoutState = getPartnerPayoutRecordState(row.entryStatus, row.dealStage);
              const dealStage = String(row.dealStage || '').toLowerCase();
              const dealProgressLabel =
                dealStage === 'viewing_scheduled' && viewingsQuery.error
                  ? 'Deal progress unavailable'
                  : formatPartnerDealStatus(row.dealStage, Number(row.dealId), recordedViewings);
              return (
                <button
                  key={row.id}
                  type="button"
                  className="w-full rounded-xl border border-border bg-white p-4 text-left shadow-sm transition hover:border-[#9cc0ee] hover:shadow-md md:p-5"
                  onClick={() => setLocation(`/distribution/partner/referrals/${Number(row.dealId)}`)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[16px] font-semibold text-[#0b1c3f]">
                          {row.developmentName || 'Development'}
                        </p>
                        <span
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                            payoutStateChipClass(payoutState),
                          )}
                        >
                          {formatPartnerPayoutRecordState(payoutState)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                        Deal #{row.dealId} · {dealProgressLabel}
                      </p>
                      {row.buyerName ? (
                        <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                          Person introduced: {row.buyerName}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[12.5px] leading-5 text-muted-foreground">
                        {describePartnerPayoutRecordState(payoutState)}
                      </p>
                      {row.approvedAt || row.paidAt || row.paymentReference ? (
                        <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-muted-foreground">
                          {row.approvedAt ? (
                            <span>Approved: {formatPartnerDateTime(row.approvedAt)}</span>
                          ) : null}
                          {row.paidAt ? <span>Paid: {formatPartnerDateTime(row.paidAt)}</span> : null}
                          {row.paymentReference ? <span>Ref: {row.paymentReference}</span> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex w-full shrink-0 flex-col items-start gap-2 sm:w-56 sm:items-end">
                      <div className="w-full rounded-lg border border-border bg-surface p-3.5 sm:text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {payoutState === 'potential' ? 'Potential referral payout' : 'Referral payout amount'}
                        </p>
                        <p className="mt-1.5 text-[15px] font-semibold text-[#0b1c3f]">
                          {formatRecordAmount(row.commissionAmount, row.currency)}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#1d6fe3]">
                        View deal <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {!commissionsQuery.error && !filteredRows.length ? (
              <div className="py-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f0fd] text-[#1d6fe3]">
                  <CreditCard className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-lg font-semibold text-[#0b1c3f]">
                  {(commissionsQuery.data || []).length
                    ? 'No payout records for this filter'
                    : 'Referral payout records will appear here'}
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-[13.5px] leading-5 text-muted-foreground">
                  {(commissionsQuery.data || []).length
                    ? 'Choose another status to see the rest of your payout records.'
                    : 'Records appear when a referral reaches its payout eligibility trigger. Potential amounts are shown before they become payable.'}
                </p>
                {(commissionsQuery.data || []).length ? (
                  <Button variant="outline" className="mt-4" onClick={() => setStatusFilter('all')}>
                    Show all records
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </ReferralAppShell>
  );
}
