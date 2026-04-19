import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';

const JOURNEY_STAGES = [
  'viewing_scheduled',
  'viewing_completed',
  'application_submitted',
  'contract_signed',
  'bond_approved',
  'commission_pending',
  'commission_paid',
] as const;

function normalizeStage(stage: string | null | undefined) {
  const value = String(stage || '').toLowerCase();
  if (!value) return 'viewing_scheduled';
  if (value === 'submitted' || value === 'lead') return 'viewing_scheduled';
  return value;
}

function getStageLabel(stage: string | null | undefined) {
  const normalized = normalizeStage(stage);
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function getStageProgress(stage: string | null | undefined) {
  const normalized = normalizeStage(stage);
  const index = JOURNEY_STAGES.indexOf(normalized as (typeof JOURNEY_STAGES)[number]);
  if (index < 0) return 0;
  return Math.round(((index + 1) / JOURNEY_STAGES.length) * 100);
}

function getNextActionLabel(
  stage: string | null | undefined,
  docProgress?: { requiredCount: number; verifiedRequiredCount: number },
) {
  const normalized = normalizeStage(stage);
  if (normalized === 'commission_paid') return 'View payout';
  if (normalized === 'commission_pending') return 'Track payout';
  if (normalized === 'bond_approved' || normalized === 'contract_signed') return 'Prepare payout';
  if (normalized === 'application_submitted') {
    if ((docProgress?.verifiedRequiredCount || 0) < (docProgress?.requiredCount || 0)) {
      return 'Upload missing docs';
    }
    return 'Await approval';
  }
  if (normalized === 'cancelled') return 'Review outcome';
  return 'Move to next stage';
}

function formatOwnerRole(ownerRole: string | null | undefined) {
  const value = String(ownerRole || '').toLowerCase();
  if (!value) return 'Team';
  return value.replace(/\b\w/g, char => char.toUpperCase());
}

function getQuickActions(actionCode: string) {
  if (actionCode === 'track_payout') {
    return ['open_commissions', 'open_deal'] as const;
  }
  if (actionCode === 'submit_next_referral') {
    return ['submit_referral', 'open_deal'] as const;
  }
  if (actionCode === 'follow_up_docs') {
    return ['open_deal', 'open_submit'] as const;
  }
  return ['open_deal'] as const;
}

export default function PartnerMyReferralsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  const referralsQuery = trpc.distribution.partner.listMyReferrals.useQuery(
    {
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 100,
    },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );
  const commissionsQuery = trpc.distribution.referrer.myCommissionEntries.useQuery(
    { limit: 200 },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );

  const commissionSummary = (commissionsQuery.data || []).reduce(
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

  const allItems = referralsQuery.data?.items || [];
  const atRiskCount = allItems.filter((item: any) => Boolean(item.journey?.atRisk)).length;
  const visibleItems = showAtRiskOnly
    ? allItems.filter((item: any) => Boolean(item.journey?.atRisk))
    : allItems;

  if (loading || referralsQuery.isLoading) {
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
            <CardTitle>My Referrals</CardTitle>
            <CardDescription>Track referral status and required document progress.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/submit')}>
              Submit New Referral
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/accelerator')}>
              Open Referral Accelerator
            </Button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              Status
              <select
                className="h-9 rounded border border-input bg-background px-2"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="viewing_scheduled">Submitted</option>
                <option value="application_submitted">Application Submitted</option>
                <option value="contract_signed">Contract Signed</option>
                <option value="bond_approved">Bond Approved</option>
                <option value="commission_pending">Commission Pending</option>
                <option value="commission_paid">Commission Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <Button
              variant={showAtRiskOnly ? 'default' : 'outline'}
              onClick={() => setShowAtRiskOnly(current => !current)}
            >
              {showAtRiskOnly ? 'Showing At-Risk' : `At-Risk (${atRiskCount})`}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Journey to Commission</CardTitle>
            <CardDescription>Every referral moves from viewing to application to payout.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            <div className="rounded border bg-[#faf9f6] p-3">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-lg font-semibold text-amber-700">
                R {Math.round(commissionSummary.pending).toLocaleString('en-ZA')}
              </p>
            </div>
            <div className="rounded border bg-[#faf9f6] p-3">
              <p className="text-xs text-slate-500">Approved</p>
              <p className="text-lg font-semibold text-blue-700">
                R {Math.round(commissionSummary.approved).toLocaleString('en-ZA')}
              </p>
            </div>
            <div className="rounded border bg-[#faf9f6] p-3">
              <p className="text-xs text-slate-500">Paid</p>
              <p className="text-lg font-semibold text-green-700">
                R {Math.round(commissionSummary.paid).toLocaleString('en-ZA')}
              </p>
            </div>
          </CardContent>
        </Card>

        {!!atRiskCount && !showAtRiskOnly ? (
          <Card className="mb-4 border-red-200 bg-red-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm text-red-700">
              <p>
                {atRiskCount} referral{atRiskCount === 1 ? '' : 's'} are past SLA and need immediate
                follow-up.
              </p>
              <Button size="sm" onClick={() => setShowAtRiskOnly(true)}>
                Review At-Risk Deals
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {referralsQuery.error ? (
          <Card>
            <CardContent className="py-6 text-sm text-red-600">{referralsQuery.error.message}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Referral Deals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleItems.map((item: any) => (
              <div key={item.dealId} className="w-full rounded border bg-white p-3 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.development.name}</p>
                    <p className="text-xs text-slate-500">Deal #{item.dealId}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Next action: {item.journey?.nextAction || getNextActionLabel(item.status, item.docProgress)}
                    </p>
                    {item.journey?.slaDueAt ? (
                      <p className={`mt-1 text-[11px] ${item.journey?.atRisk ? 'text-red-600' : 'text-slate-500'}`}>
                        Owner: {formatOwnerRole(item.journey.ownerRole)} | SLA due {String(item.journey.slaDueAt)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{getStageLabel(item.status)}</Badge>
                    <Badge variant="outline">
                      {item.docProgress.verifiedRequiredCount}/{item.docProgress.requiredCount} docs
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100">
                  <div className="h-full rounded bg-blue-600" style={{ width: `${getStageProgress(item.status)}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {getQuickActions(String(item.journey?.actionCode || '')).map(action => {
                    if (action === 'open_commissions') {
                      return (
                        <Button
                          key={action}
                          size="sm"
                          onClick={() => setLocation('/distribution/partner/commissions')}
                        >
                          Open Commissions
                        </Button>
                      );
                    }
                    if (action === 'submit_referral' || action === 'open_submit') {
                      return (
                        <Button
                          key={action}
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation('/distribution/partner/submit')}
                        >
                          Submit Referral
                        </Button>
                      );
                    }
                    return (
                      <Button
                        key={action}
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/distribution/partner/referrals/${Number(item.dealId)}`)}
                      >
                        Open Deal
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}

            {!referralsQuery.error && !visibleItems.length ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No referrals found for this filter{showAtRiskOnly ? ' and SLA state' : ''}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </ReferralAppShell>
  );
}
