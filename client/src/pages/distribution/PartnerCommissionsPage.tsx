import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatPartnerDealStatus,
  formatPartnerPayoutRecordState,
  getPartnerPayoutRecordState,
} from '@/lib/distributionPartnerJourney';

type EntryStatusFilter = 'all' | 'pending' | 'approved' | 'paid' | 'cancelled';

function formatCurrency(value: number | null | undefined, currency = 'ZAR') {
  const amount = Math.round(Number(value || 0));
  if (!Number.isFinite(amount)) return 'R 0';
  if (currency === 'ZAR') return `R ${amount.toLocaleString('en-ZA')}`;
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

function formatCurrencyTotals(amounts: Record<string, number>) {
  const rows = Object.entries(amounts)
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => formatCurrency(amount, currency));
  return rows.length ? rows.join(' · ') : '—';
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

  if (loading || commissionsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-6 md:px-7">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>My referral payouts</CardTitle>
            <CardDescription>
              Follow payout amounts, approval, and confirmed payment. This page shows recorded states; it does not promise a payment date.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
              My deals
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/developments')}>
              Find opportunities
            </Button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              Status
              <select
                className="h-9 rounded border border-input bg-background px-2"
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
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Recorded payout totals</CardTitle>
            <CardDescription>
              Potential amounts use the saved referral terms. They are not payable until the opportunity’s eligibility trigger is recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded border bg-surface p-3">
              <p className="text-xs text-slate-500">Potential</p>
              <p className="text-lg font-semibold text-slate-700">{formatCurrencyTotals(summary.potential)}</p>
            </div>
            <div className="rounded border bg-surface p-3">
              <p className="text-xs text-slate-500">Pending approval</p>
              <p className="text-lg font-semibold text-amber-700">{formatCurrencyTotals(summary.pending)}</p>
            </div>
            <div className="rounded border bg-surface p-3">
              <p className="text-xs text-slate-500">Approved</p>
              <p className="text-lg font-semibold text-blue-700">{formatCurrencyTotals(summary.approved)}</p>
            </div>
            <div className="rounded border bg-surface p-3">
              <p className="text-xs text-slate-500">Paid</p>
              <p className="text-lg font-semibold text-green-700">{formatCurrencyTotals(summary.paid)}</p>
            </div>
          </CardContent>
        </Card>

        {commissionsQuery.error ? (
          <Card>
            <CardContent className="py-6 text-sm text-red-600">{commissionsQuery.error.message}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Referral Payout Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredRows.map((row: any) => (
              <button
                key={row.id}
                className="w-full rounded border bg-white p-3 text-left transition hover:border-blue-300"
                onClick={() => setLocation(`/distribution/partner/referrals/${Number(row.dealId)}`)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.developmentName || 'Development'}</p>
                    <p className="text-xs text-slate-500">Deal #{row.dealId} · {formatPartnerDealStatus(row.dealStage, Number(row.dealId))}</p>
                    {row.buyerName ? <p className="mt-1 text-xs text-slate-600">Person introduced: {row.buyerName}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">
                      {getPartnerPayoutRecordState(row.entryStatus, row.dealStage) === 'potential'
                        ? 'Potential referral payout'
                        : 'Referral payout amount'}
                    </p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(row.commissionAmount, row.currency)}</p>
                    <div className="mt-1 flex flex-wrap justify-end gap-1">
                      <Badge variant="secondary">
                        {formatPartnerPayoutRecordState(
                          getPartnerPayoutRecordState(row.entryStatus, row.dealStage),
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {row.approvedAt ? <span>Approved: {String(row.approvedAt)}</span> : null}
                  {row.paidAt ? <span>Paid: {String(row.paidAt)}</span> : null}
                  {row.paymentReference ? <span>Ref: {row.paymentReference}</span> : null}
                </div>
              </button>
            ))}

            {!commissionsQuery.error && !filteredRows.length ? (
              <p className="py-6 text-center text-sm text-slate-500">No referral payout records found for this filter yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </ReferralAppShell>
  );
}
