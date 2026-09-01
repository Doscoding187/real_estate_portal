import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Compass,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ReferralOpportunity = {
  developmentId: number;
  developmentName: string;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  computed?: {
    commissionDisplay?: string | null;
  } | null;
  opportunity?: {
    status?: string | null;
  } | null;
};

type SubmittedReferral = {
  dealId: number;
  development?: {
    name?: string | null;
  } | null;
  status?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  journey?: {
    nextAction?: string | null;
  } | null;
  docProgress?: {
    requiredCount?: number | null;
    verifiedRequiredCount?: number | null;
  } | null;
};

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price on request';
  return `R ${Math.round(amount).toLocaleString('en-ZA')}`;
}

function formatPriceRange(
  priceFrom: number | null | undefined,
  priceTo: number | null | undefined,
) {
  const from = Number(priceFrom || 0);
  const to = Number(priceTo || 0);
  const hasFrom = Number.isFinite(from) && from > 0;
  const hasTo = Number.isFinite(to) && to > 0;

  if (hasFrom && hasTo) {
    return Math.abs(from - to) <= 1
      ? formatCurrency(from)
      : `${formatCurrency(from)} – ${formatCurrency(to)}`;
  }
  if (hasFrom) return `From ${formatCurrency(from)}`;
  if (hasTo) return `Up to ${formatCurrency(to)}`;
  return 'Price on request';
}

function titleCase(value: string | null | undefined) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function formatRelativeDate(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Recently updated';

  const diffInDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffInDays <= 0) return 'Updated today';
  if (diffInDays === 1) return 'Updated yesterday';
  if (diffInDays < 7) return `Updated ${diffInDays} days ago`;
  return `Updated ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`;
}

function getRewardDisplay(opportunity: ReferralOpportunity) {
  const configured = String(opportunity?.computed?.commissionDisplay || '').trim();
  if (configured && !/not configured/i.test(configured)) {
    return configured.replace(/commission/gi, 'reward');
  }
  return 'Reward details available in programme terms';
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accentClass,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  accentClass: string;
}) {
  const Icon = icon;
  return (
    <Card className={cn(agentPageStyles.statCard, 'border-l-4', accentClass)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="mt-2 text-sm leading-5 text-slate-600">{detail}</p>
          </div>
          <span className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
            <Icon className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentReferrals() {
  const [, setLocation] = useLocation();
  const opportunitiesQuery =
    trpc.distribution.partner.listEligibleDevelopmentsForSubmission.useQuery(undefined, {
      retry: false,
      refetchOnWindowFocus: false,
    });
  const referralsQuery = trpc.distribution.partner.listMyReferrals.useQuery(
    { limit: 8 },
    {
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const networkStatusQuery = trpc.distribution.referrer.status.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const opportunities: ReferralOpportunity[] = opportunitiesQuery.data?.items || [];
  const submittedReferrals: SubmittedReferral[] = referralsQuery.data?.items || [];
  const readyOpportunities = opportunities.filter(item => item.opportunity?.status === 'ready');
  const documentFollowUps = submittedReferrals.filter(
    item =>
      Number(item.docProgress?.requiredCount || 0) >
      Number(item.docProgress?.verifiedRequiredCount || 0),
  ).length;
  const hasFullNetworkAccess = networkStatusQuery.data?.hasAccess === true;
  const activeProgramCount = Number(networkStatusQuery.data?.accessCount || 0);
  const isLoading = opportunitiesQuery.isLoading || referralsQuery.isLoading;

  const refreshData = () => {
    void opportunitiesQuery.refetch();
    void referralsQuery.refetch();
    void networkStatusQuery.refetch();
  };

  return (
    <AgentAppShell>
      <main className={cn(agentPageStyles.container, 'max-w-[1200px]')}>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className={agentPageStyles.title}>Referrals</h1>
              <Badge className="border-blue-200 bg-blue-50 text-[var(--primary)] hover:bg-blue-50">
                Agent workspace
              </Badge>
            </div>
            <p className={cn(agentPageStyles.subtitle, 'mt-1 max-w-2xl')}>
              Match qualified buyers with live developer opportunities, submit a referral and keep
              the resulting buyer file visible from your workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className={agentPageStyles.ghostButton}
              onClick={() => setLocation('/distribution/partner/accelerator')}
            >
              <Compass className="mr-2 h-4 w-4" />
              Match a buyer
            </Button>
            <Button
              className={agentPageStyles.primaryButton}
              onClick={() => setLocation('/distribution/partner/submit')}
            >
              Submit referral
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {opportunitiesQuery.isError && referralsQuery.isError ? (
          <Card className="mb-6 border-rose-200 bg-rose-50 shadow-none">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-rose-900">Referral data could not be loaded.</p>
                <p className="mt-1 text-sm text-rose-700">
                  Your direct listings and CRM remain available. Try again to load the current
                  referral opportunities and buyer files.
                </p>
              </div>
              <Button variant="outline" onClick={refreshData}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Open opportunities"
                value={isLoading ? '—' : readyOpportunities.length}
                detail="Developments currently accepting buyer referrals"
                icon={Building2}
                accentClass="border-emerald-400"
              />
              <MetricCard
                label="Buyer files"
                value={isLoading ? '—' : submittedReferrals.length}
                detail="Your submitted referrals, across every stage"
                icon={FileText}
                accentClass="border-[var(--primary)]"
              />
              <MetricCard
                label="Needs documents"
                value={isLoading ? '—' : documentFollowUps}
                detail="Submitted buyers with required documents still in progress"
                icon={CheckCircle2}
                accentClass="border-amber-400"
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
              <section aria-labelledby="opportunities-heading">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 id="opportunities-heading" className="text-lg font-bold text-slate-900">
                      Opportunities ready for buyers
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Only developments with an active referral route appear here.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={opportunitiesQuery.isFetching}
                    onClick={refreshData}
                  >
                    {opportunitiesQuery.isFetching ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    )}
                    Refresh
                  </Button>
                </div>

                <Card className={agentPageStyles.panel}>
                  <CardContent className="p-4 sm:p-5">
                    {opportunitiesQuery.isLoading ? (
                      <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[var(--primary)]" />
                        Loading active opportunities…
                      </div>
                    ) : readyOpportunities.length ? (
                      <div className="space-y-3">
                        {readyOpportunities.slice(0, 4).map(opportunity => {
                          const location = [
                            opportunity.suburb,
                            opportunity.city,
                            opportunity.province,
                          ]
                            .filter(Boolean)
                            .join(', ');
                          return (
                            <article
                              key={opportunity.developmentId}
                              className="rounded-[16px] border border-slate-200 bg-white p-4 transition hover:border-[var(--primary)]/30 hover:shadow-sm"
                            >
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-semibold text-slate-900">
                                      {opportunity.developmentName}
                                    </h3>
                                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                      Open for buyers
                                    </Badge>
                                  </div>
                                  {location ? (
                                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                      {location}
                                    </p>
                                  ) : null}
                                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    <span className="font-medium text-slate-700">
                                      {formatPriceRange(opportunity.priceFrom, opportunity.priceTo)}
                                    </span>
                                    <span className="font-medium text-emerald-700">
                                      {getRewardDisplay(opportunity)}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="shrink-0"
                                  onClick={() =>
                                    setLocation(
                                      `/distribution/partner/submit?developmentId=${Number(opportunity.developmentId)}`,
                                    )
                                  }
                                >
                                  Submit buyer
                                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </article>
                          );
                        })}
                        {readyOpportunities.length > 4 ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setLocation('/distribution/partner/developments')}
                          >
                            View all {readyOpportunities.length} open opportunities
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex min-h-[260px] flex-col items-center justify-center px-4 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <Building2 className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <h3 className="mt-4 font-semibold text-slate-900">
                          No developer opportunities are accepting referrals right now.
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                          This changes as developers activate programmes. Your Agent Launch Access
                          workspace remains fully available while you wait for an opportunity that
                          fits the buyer.
                        </p>
                        <Button variant="outline" className="mt-5" onClick={refreshData}>
                          Check again
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>

              <section aria-labelledby="buyer-files-heading">
                <div className="mb-3">
                  <h2 id="buyer-files-heading" className="text-lg font-bold text-slate-900">
                    Your buyer files
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Keep the next action and application requirements close at hand.
                  </p>
                </div>
                <Card className={agentPageStyles.panel}>
                  <CardContent className="p-4 sm:p-5">
                    {referralsQuery.isLoading ? (
                      <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[var(--primary)]" />
                        Loading your referral files…
                      </div>
                    ) : submittedReferrals.length ? (
                      <div className="space-y-3">
                        {submittedReferrals.slice(0, 5).map(referral => (
                          <article
                            key={referral.dealId}
                            className="rounded-[14px] border border-slate-200 bg-slate-50/70 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {referral.development?.name || 'Developer opportunity'}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {referral.journey?.nextAction ||
                                    'Review the latest referral update.'}
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="shrink-0 bg-white text-slate-600"
                              >
                                {titleCase(referral.status)}
                              </Badge>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <span className="text-xs text-slate-500">
                                {formatRelativeDate(referral.updatedAt || referral.createdAt)}
                              </span>
                              <button
                                type="button"
                                className="text-xs font-semibold text-[var(--primary)] hover:underline"
                                onClick={() =>
                                  setLocation(
                                    `/distribution/partner/referrals/${Number(referral.dealId)}`,
                                  )
                                }
                              >
                                Open file
                              </button>
                            </div>
                          </article>
                        ))}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setLocation('/distribution/partner/referrals')}
                        >
                          View all buyer files
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex min-h-[260px] flex-col items-center justify-center px-4 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                          <Send className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <h3 className="mt-4 font-semibold text-slate-900">No buyer files yet.</h3>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                          Start with a buyer you are already helping, match them to an open
                          opportunity, then submit the referral with their consent.
                        </p>
                        <Button
                          variant="outline"
                          className="mt-5"
                          onClick={() => setLocation('/distribution/partner/accelerator')}
                        >
                          Match a buyer
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>

            {hasFullNetworkAccess ? (
              <Card className="mt-6 border-[var(--primary)]/20 bg-[var(--primary)]/[0.035] shadow-none">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-xl bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
                      <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">
                        Expanded referral network access is active.
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        You are connected to {activeProgramCount} active developer programme
                        {activeProgramCount === 1 ? '' : 's'} with the full referral tracker and
                        payout workflow available.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setLocation('/distribution/partner/overview')}
                  >
                    Open network tracker
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </main>
    </AgentAppShell>
  );
}
