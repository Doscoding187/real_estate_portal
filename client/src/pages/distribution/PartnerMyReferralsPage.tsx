import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2, UsersRound, WalletCards } from 'lucide-react';
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

type ReferralDocProgress = {
  requiredCount: number;
  uploadedRequiredCount: number;
  verifiedRequiredCount: number;
  pendingReviewCount: number;
  rejectedCount: number;
  missingCount: number;
  uploadComplete: boolean;
  verificationComplete: boolean;
};

type ReferralListItem = {
  dealId: number;
  status?: string | null;
  development?: { name?: string | null } | null;
  journey?: {
    nextAction?: string | null;
    ownerRole?: string | null;
    slaDueAt?: string | null;
    atRisk?: boolean;
    actionCode?: string | null;
  } | null;
  docProgress: ReferralDocProgress;
};

const EMPTY_DOC_PROGRESS: ReferralDocProgress = {
  requiredCount: 0,
  uploadedRequiredCount: 0,
  verifiedRequiredCount: 0,
  pendingReviewCount: 0,
  rejectedCount: 0,
  missingCount: 0,
  uploadComplete: true,
  verificationComplete: true,
};

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
  docProgress: ReferralDocProgress,
) {
  const normalized = normalizeStage(stage);
  if (normalized === 'commission_paid') return 'View paid reward';
  if (normalized === 'commission_pending') return 'Track reward';
  if (normalized === 'bond_approved' || normalized === 'contract_signed') return 'Protect payout';
  if (normalized === 'application_submitted') {
    if (!docProgress.verificationComplete) {
      return 'Upload missing docs';
    }
    return 'Await approval';
  }
  if (normalized === 'cancelled') return 'Review outcome';
  return 'Move to next stage';
}

function getDocProgress(input: any): ReferralDocProgress {
  const value = input?.docProgress;
  if (!value || typeof value !== 'object') return EMPTY_DOC_PROGRESS;
  return {
    requiredCount: Number(value.requiredCount || 0),
    uploadedRequiredCount: Number(value.uploadedRequiredCount || 0),
    verifiedRequiredCount: Number(value.verifiedRequiredCount || 0),
    pendingReviewCount: Number(value.pendingReviewCount || 0),
    rejectedCount: Number(value.rejectedCount || 0),
    missingCount: Number(value.missingCount || 0),
    uploadComplete: Boolean(value.uploadComplete),
    verificationComplete: Boolean(value.verificationComplete),
  };
}

function toReferralListItem(input: any): ReferralListItem {
  return {
    dealId: Number(input?.dealId || 0),
    status: input?.status ?? null,
    development: input?.development ?? null,
    journey: input?.journey ?? null,
    docProgress: getDocProgress(input),
  };
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

  const allItems: ReferralListItem[] = (referralsQuery.data?.items || []).map((item: any) =>
    toReferralListItem(item),
  );
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
      <main className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-6 md:px-7">
        <Card className="mb-5 overflow-hidden border-primary/15 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[var(--brand-blue)] via-[var(--info)] to-[var(--brand-blue-hover)] px-6 py-5 text-white">
            <p className="text-[10px] font-semibold uppercase text-blue-100">Referral tracker</p>
            <h1 className="mt-1 text-[28px] font-semibold">My Buyers</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[#ece6da]">
              Track buyer status, next steps, required documents, and referral reward progress.
            </p>
          </div>
          <CardContent className="flex flex-wrap items-center gap-2 bg-primary/5 py-4">
            <Button variant="conversion" onClick={() => setLocation('/distribution/partner/submit')}>
              Submit Buyer
            </Button>
            <Button variant="conversion" onClick={() => setLocation('/distribution/partner/accelerator')}>
              Match Buyer
            </Button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              Status
              <select
                className="h-9 rounded-md border border-primary/15 bg-white px-2"
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

        <Card className="mb-4 border-primary/15 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-primary" />
              Journey to Referral Reward
            </CardTitle>
            <CardDescription>Every buyer moves from review to site visit, sale, and payout.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-primary/15 bg-primary/5/60 p-3">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-lg font-semibold text-amber-700">
                R {Math.round(commissionSummary.pending).toLocaleString('en-ZA')}
              </p>
            </div>
            <div className="rounded-md border border-primary/15 bg-primary/5/60 p-3">
              <p className="text-xs text-slate-500">Approved</p>
              <p className="text-lg font-semibold text-blue-700">
                R {Math.round(commissionSummary.approved).toLocaleString('en-ZA')}
              </p>
            </div>
            <div className="rounded-md border border-primary/15 bg-primary/5/60 p-3">
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
                {atRiskCount} buyer{atRiskCount === 1 ? '' : 's'} need immediate
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

        <Card className="border-primary/15 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-primary" />
              Buyer Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleItems.map(item => (
              <div key={item.dealId} className="w-full rounded-md border border-primary/15 bg-white p-3 text-left">
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
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-[#e7dfd3]">
                  <div className="h-full rounded bg-primary" style={{ width: `${getStageProgress(item.status)}%` }} />
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
                          Submit Buyer
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
