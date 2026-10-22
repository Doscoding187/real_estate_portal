import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type EntryStatusFilter = 'all' | 'pending' | 'approved' | 'paid' | 'cancelled';

function formatCurrency(value: number | null | undefined, currency = 'ZAR') {
  const amount = Math.round(Number(value || 0));
  if (!Number.isFinite(amount)) return 'R 0';
  if (currency === 'ZAR') return `R ${amount.toLocaleString('en-ZA')}`;
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

function formatStageLabel(value: string | null | undefined) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
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
      entryStatus: statusFilter === 'all' ? undefined : statusFilter,
    },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );

  const summary = useMemo(() => {
    const rows = commissionsQuery.data || [];
    return rows.reduce(
      (acc, row: any) => {
        const status = String(row.entryStatus || '').toLowerCase();
        const amount = Number(row.commissionAmount || 0);
        if (status === 'pending') acc.pending += amount;
        if (status === 'approved') acc.approved += amount;
        if (status === 'paid') acc.paid += amount;
        return acc;
      },
      { pending: 0, approved: 0, paid: 0 },
    );
  }, [commissionsQuery.data]);

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
            <CardTitle>Referral Payouts</CardTitle>
            <CardDescription>Track recorded referral payouts under the applicable program terms.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
              Open Buyer Tracker
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/submit')}>
              Referral Intake Status
            </Button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              Status
              <select
                className="h-9 rounded border border-input bg-background px-2"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as EntryStatusFilter)}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Recorded Payout Summary</CardTitle>
            <CardDescription>Totals from referral payout records in the current view.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            <div className="rounded border bg-surface p-3">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-lg font-semibold text-amber-700">{formatCurrency(summary.pending)}</p>
            </div>
            <div className="rounded border bg-surface p-3">
              <p className="text-xs text-slate-500">Approved</p>
              <p className="text-lg font-semibold text-blue-700">{formatCurrency(summary.approved)}</p>
            </div>
            <div className="rounded border bg-surface p-3">
              <p className="text-xs text-slate-500">Paid</p>
              <p className="text-lg font-semibold text-green-700">{formatCurrency(summary.paid)}</p>
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
            {(commissionsQuery.data || []).map((row: any) => (
              <button
                key={row.id}
                className="w-full rounded border bg-white p-3 text-left transition hover:border-blue-300"
                onClick={() => setLocation(`/distribution/partner/referrals/${Number(row.dealId)}`)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.developmentName || 'Development'}</p>
                    <p className="text-xs text-slate-500">Deal #{row.dealId} | Buyer stage {formatStageLabel(row.dealStage)}</p>
                    {row.buyerName ? <p className="mt-1 text-xs text-slate-600">Buyer: {row.buyerName}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(row.commissionAmount, row.currency)}</p>
                    <div className="mt-1 flex flex-wrap justify-end gap-1">
                      <Badge variant="secondary">{formatStageLabel(row.entryStatus)}</Badge>
                      {row.triggerStage ? <Badge variant="outline">Recorded payout stage: {formatStageLabel(row.triggerStage)}</Badge> : null}
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

            {!commissionsQuery.error && !(commissionsQuery.data || []).length ? (
              <p className="py-6 text-center text-sm text-slate-500">No referral payout records found for this filter yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </ReferralAppShell>
  );
}
