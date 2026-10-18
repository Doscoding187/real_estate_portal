import { useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  formatPartnerDealStatus,
  formatPartnerDealGuidance,
  formatPartnerDateTime,
  getPartnerPayoutRecordState,
  summarizePartnerReferralWorkflow,
  type PartnerViewingRecord,
} from '@/lib/distributionPartnerJourney';
import {
  ArrowRight,
  CircleDollarSign,
  Home,
  Loader2,
  Search,
} from 'lucide-react';

function MetricCard({
  label,
  value,
  supportingText,
  icon,
}: {
  label: string;
  value: string;
  supportingText: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-primary/15 bg-white shadow-sm">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="rounded-md bg-primary/10 p-2 text-primary">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{supportingText}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatPayoutTotals(amounts: Record<string, number>) {
  const totals = Object.entries(amounts)
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    .map(([currency, amount]) =>
      currency === 'ZAR'
        ? `R ${Math.round(amount).toLocaleString('en-ZA')}`
        : `${currency} ${Math.round(amount).toLocaleString('en-US')}`,
    );
  return totals.length ? totals.join(' · ') : 'Amount not recorded';
}

export default function PartnerDashboardPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) setLocation('/login?next=/distribution/partner/overview');
  }, [isAuthenticated, loading, setLocation]);

  const statusQuery = trpc.distribution.referrer.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnMount: 'always',
  });
  const hasDistributionIdentity = statusQuery.data?.hasIdentity === true;

  const pipelineQuery = trpc.distribution.referrer.myPipeline.useQuery(
    { limit: 500 },
    { enabled: isAuthenticated && hasDistributionIdentity, retry: false },
  );
  const referralsQuery = trpc.distribution.partner.listMyReferrals.useQuery(
    { limit: 10 },
    { enabled: isAuthenticated && hasDistributionIdentity, retry: false },
  );
  const viewingsQuery = trpc.distribution.referrer.myViewings.useQuery(
    { includePast: true, limit: 500 },
    { enabled: isAuthenticated && hasDistributionIdentity, retry: false },
  );
  const payoutsQuery = trpc.distribution.referrer.myCommissionEntries.useQuery(
    { limit: 500 },
    { enabled: isAuthenticated && hasDistributionIdentity, retry: false },
  );

  const deals = pipelineQuery.data?.deals || [];
  const activeDeals = useMemo(
    () => deals.filter(deal => !['commission_paid', 'cancelled'].includes(String(deal.currentStage))),
    [deals],
  );
  const recentDeals = referralsQuery.data?.items || [];
  const recordedViewings = (viewingsQuery.data || []) as PartnerViewingRecord[];
  const upcomingViewings = recordedViewings.filter(
    (viewing: any) =>
      viewing.status === 'scheduled' &&
      new Date(String(viewing.scheduledStartAt)).getTime() >= Date.now(),
  );
  const payoutSummary = useMemo(() => {
    const counts = { potential: 0, pending: 0, approved: 0, paid: 0, needsReview: 0 };
    const amounts: Record<'potential' | 'pending' | 'approved' | 'paid', Record<string, number>> = {
      potential: {},
      pending: {},
      approved: {},
      paid: {},
    };
    for (const entry of payoutsQuery.data || []) {
      const state = getPartnerPayoutRecordState(entry.entryStatus, entry.dealStage);
      const currency = String(entry.currency || 'ZAR').trim().toUpperCase();
      const amount = Number(entry.commissionAmount);
      if (state === 'potential') counts.potential += 1;
      if (state === 'pending_approval') counts.pending += 1;
      if (state === 'approved') counts.approved += 1;
      if (state === 'paid') counts.paid += 1;
      if (state === 'needs_review') counts.needsReview += 1;
      const bucket = state === 'potential'
        ? 'potential'
        : state === 'pending_approval'
          ? 'pending'
          : state === 'approved'
            ? 'approved'
            : state === 'paid'
              ? 'paid'
              : null;
      if (bucket && currency && Number.isFinite(amount) && amount > 0) {
        amounts[bucket][currency] = (amounts[bucket][currency] || 0) + amount;
      }
    }
    return { counts, amounts };
  }, [payoutsQuery.data]);

  const queryError = statusQuery.isError ||
    (hasDistributionIdentity && (
      pipelineQuery.isError || referralsQuery.isError || payoutsQuery.isError || viewingsQuery.isError
    ));
  const showLoading = loading || statusQuery.isLoading || (hasDistributionIdentity && (
    pipelineQuery.isLoading || referralsQuery.isLoading || payoutsQuery.isLoading || viewingsQuery.isLoading
  ));

  if (showLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  if (queryError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Card className="w-full max-w-xl border-primary/15 p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Your network could not be loaded</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Try again to load your opportunities, deals, and referral payouts.
          </p>
          <Button className="mt-5" variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </Card>
      </main>
    );
  }

  if (!hasDistributionIdentity) {
    const networkEnabled = statusQuery.data?.networkEnabled !== false;
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
        <Card className="w-full max-w-2xl border-primary/15 p-6 shadow-sm sm:p-9">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Property Listify Distribution Network
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {networkEnabled ? 'Request access to refer people' : 'The network is temporarily unavailable'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {networkEnabled
                ? 'Distribution membership is separate from an Agent OS subscription. Once approved, you will receive a Distribution ID and can follow the people you introduce using this same login.'
                : 'The Distribution Network is not accepting access requests right now. Your account and any agent workspace access are unchanged.'}
            </p>
            {networkEnabled ? (
              <div className="mt-6 flex justify-center">
                <Button onClick={() => setLocation('/distribution-network/apply')}>
                  Apply for access <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : null}
            {user?.role === 'agent' ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Your agent subscription and Distribution membership are managed separately.
              </p>
            ) : null}
          </div>
        </Card>
      </main>
    );
  }

  const firstName = String(user?.name || '').trim().split(/\s+/)[0];
  const hasAnyActivity = deals.length > 0 || payoutSummary.counts.potential > 0 || payoutSummary.counts.pending > 0 ||
    payoutSummary.counts.approved > 0 || payoutSummary.counts.paid > 0 || payoutSummary.counts.needsReview > 0 || upcomingViewings.length > 0;
  const activityMetrics = [
    ...(activeDeals.length > 0 ? [{
      label: 'Deals in progress',
      value: String(activeDeals.length),
      supportingText: 'Introductions still moving through their recorded steps',
      icon: <Home className="h-4 w-4" />,
    }] : []),
    ...(payoutSummary.counts.potential > 0 ? [{
      label: 'Potential referral payout',
      value: formatPayoutTotals(payoutSummary.amounts.potential),
      supportingText: `${payoutSummary.counts.potential} record${payoutSummary.counts.potential === 1 ? '' : 's'} · eligibility trigger not confirmed`,
      icon: <CircleDollarSign className="h-4 w-4" />,
    }] : []),
    ...(payoutSummary.counts.pending > 0 ? [{
      label: 'Awaiting team approval',
      value: formatPayoutTotals(payoutSummary.amounts.pending),
      supportingText: `${payoutSummary.counts.pending} referral payout${payoutSummary.counts.pending === 1 ? '' : 's'} waiting for approval`,
      icon: <CircleDollarSign className="h-4 w-4" />,
    }] : []),
    ...(payoutSummary.counts.approved > 0 ? [{
      label: 'Approved for payment',
      value: formatPayoutTotals(payoutSummary.amounts.approved),
      supportingText: `${payoutSummary.counts.approved} approved record${payoutSummary.counts.approved === 1 ? '' : 's'} · payment timing follows program terms`,
      icon: <CircleDollarSign className="h-4 w-4" />,
    }] : []),
    ...(payoutSummary.counts.paid > 0 ? [{
      label: 'Referral payouts paid',
      value: formatPayoutTotals(payoutSummary.amounts.paid),
      supportingText: `${payoutSummary.counts.paid} confirmed payment record${payoutSummary.counts.paid === 1 ? '' : 's'}`,
      icon: <CircleDollarSign className="h-4 w-4" />,
    }] : []),
  ];

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] space-y-5 px-4 pb-10 pt-6 md:px-7">
        <section className="rounded-lg bg-gradient-to-br from-[var(--brand-blue)] via-[var(--info)] to-[var(--brand-blue-hover)] px-5 py-6 text-white shadow-sm md:px-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Your Distribution Network</p>
          <h1 className="mt-2 text-3xl font-semibold">
            {firstName ? `Welcome, ${firstName}` : 'Help someone find their next home'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
            Find current property options, introduce someone when they want to proceed, then follow
            recorded updates and any referral payout.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="conversion" onClick={() => setLocation('/distribution/partner/developments')}>
              <Search className="mr-2 h-4 w-4" /> Find opportunities
            </Button>
            {deals.length > 0 ? (
              <Button
                variant="outline"
                className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => setLocation('/distribution/partner/referrals')}
              >
                My deals <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-blue-100">Distribution ID: {statusQuery.data?.distributionIdentityId}</p>
        </section>

        {activityMetrics.length ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {activityMetrics.map(metric => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>
        ) : null}

        {payoutSummary.counts.needsReview > 0 ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-amber-950">
                  {payoutSummary.counts.needsReview} payout {payoutSummary.counts.needsReview === 1 ? 'record needs' : 'records need'} a team check
                </p>
                <p className="mt-1 text-sm text-amber-900">
                  The recorded payout state does not match the deal progress. The team will confirm how these records fit together.
                </p>
              </div>
              <Button variant="outline" onClick={() => setLocation('/distribution/partner/payouts')}>
                View referral payouts <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!hasAnyActivity ? (
          <Card className="border-primary/15 bg-white shadow-sm">
            <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
              <div>
                <Badge variant="secondary">Your first step</Badge>
                <h2 className="mt-3 text-xl font-semibold text-foreground">Know someone looking for a property?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Search current sale and rental options by area, listed price, and bedrooms. When
                  they choose an option, the referral page guides you through permission and the
                  information needed before you share their details.
                </p>
              </div>
              <Button onClick={() => setLocation('/distribution/partner/developments')}>
                Browse opportunities <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {upcomingViewings.length > 0 ? (
          <section className="rounded-lg border border-primary/15 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Upcoming viewings</h2>
                <p className="mt-1 text-sm text-muted-foreground">Confirmed viewing bookings from your deals.</p>
              </div>
              <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
                See my deals
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {upcomingViewings.slice(0, 4).map((viewing: any) => (
                <button
                  key={viewing.id}
                  type="button"
                  onClick={() => setLocation(`/distribution/partner/referrals/${Number(viewing.dealId)}`)}
                  className="rounded-md border border-primary/15 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <p className="font-medium text-foreground">{viewing.developmentName || 'Property viewing'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatPartnerDateTime(viewing.scheduledStartAt)}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-primary/15 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">My deals</h2>
              <p className="mt-1 text-sm text-muted-foreground">The latest status recorded for each introduction.</p>
            </div>
            {recentDeals.length > 0 ? (
              <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
                View all deals <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
          {recentDeals.length > 0 ? (
            <div className="divide-y divide-border">
              {recentDeals.slice(0, 5).map((deal: any) => {
                const dealId = Number(deal.dealId);
                const processSummary = summarizePartnerReferralWorkflow(deal.workflowProgress);
                return (
                  <button
                    key={dealId}
                    type="button"
                    onClick={() => setLocation(`/distribution/partner/referrals/${dealId}`)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {deal.development?.name || `Referral ${dealId}`}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {deal.marketMode === 'rent' ? 'Rental' : 'Purchase'} · Deal #{dealId} · Updated {formatPartnerDateTime(deal.updatedAt)}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {processSummary
                          ? `Current step: ${processSummary}`
                          : `What happens next: ${formatPartnerDealGuidance(deal.status, dealId, recordedViewings)}`}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {deal.manager?.displayName
                          ? `Responsible contact: ${deal.manager.displayName}`
                          : 'Responsible contact: Pending assignment'}
                      </span>
                    </span>
                    <Badge variant="secondary">
                      {formatPartnerDealStatus(deal.status, dealId, recordedViewings)}
                    </Badge>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-md bg-surface p-4 text-sm leading-6 text-muted-foreground">
              Once you submit an introduction, its recorded progress will appear here. Your team
              manages the next transaction steps and updates this deal as information is confirmed.
            </p>
          )}
        </section>

        <Card className="border-primary/15 bg-primary/5 shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Referral payouts follow the terms saved with each deal. Dates appear only when the
              program terms and verified progress support an estimate.
            </p>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/payouts')}>
              View referral payouts
            </Button>
          </CardContent>
        </Card>
      </main>
    </ReferralAppShell>
  );
}
