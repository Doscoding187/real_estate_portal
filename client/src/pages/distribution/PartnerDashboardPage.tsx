import { useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Building2,
  Coins,
  FileWarning,
  GitBranch,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatStageLabel(stage: string) {
  return String(stage || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

export default function PartnerDashboardPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  const statusQuery = trpc.distribution.referrer.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const myAccessQuery = trpc.distribution.referrer.myAccess.useQuery(
    { includePaused: true, includeRevoked: false },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );

  const pipelineQuery = trpc.distribution.referrer.myPipeline.useQuery(
    { limit: 200 },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );

  const viewingsQuery = trpc.distribution.referrer.myViewings.useQuery(
    { includePast: false, limit: 10 },
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

  const referralsQuery = trpc.distribution.partner.listMyReferrals.useQuery(
    { limit: 20 },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );

  const pendingCommissionAmount = useMemo(() => {
    return (commissionsQuery.data || []).reduce((total, row: any) => {
      const status = String(row.entryStatus || '').toLowerCase();
      if (status === 'pending' || status === 'approved') {
        return total + Number(row.commissionAmount || 0);
      }
      return total;
    }, 0);
  }, [commissionsQuery.data]);

  const paidCommissionAmount = useMemo(() => {
    return (commissionsQuery.data || []).reduce((total, row: any) => {
      const status = String(row.entryStatus || '').toLowerCase();
      if (status === 'paid') {
        return total + Number(row.commissionAmount || 0);
      }
      return total;
    }, 0);
  }, [commissionsQuery.data]);

  const stageOrder = pipelineQuery.data?.stageOrder || [];
  const stageCounts = (pipelineQuery.data?.stageCounts || {}) as Record<string, number>;
  const pipelineDeals = pipelineQuery.data?.deals || [];

  const activeDealsCount = useMemo(() => {
    const excluded = new Set(['commission_paid', 'cancelled']);
    return Object.entries(stageCounts).reduce((total, [stage, count]) => {
      if (excluded.has(stage)) return total;
      return total + Number(count || 0);
    }, 0);
  }, [stageCounts]);

  const pendingDocReferrals = useMemo(() => {
    const items = referralsQuery.data?.items || [];
    return items.filter((item: any) => {
      const requiredCount = Number(item.docProgress?.requiredCount || 0);
      const verifiedCount = Number(item.docProgress?.verifiedRequiredCount || 0);
      return requiredCount > verifiedCount;
    });
  }, [referralsQuery.data?.items]);

  const stockRows = useMemo(() => {
    const grouped = new Map<number, any>();
    for (const row of myAccessQuery.data || []) {
      const devId = Number(row.developmentId);
      if (!grouped.has(devId)) {
        grouped.set(devId, {
          developmentId: devId,
          developmentName: row.developmentName || 'Development',
          city: row.city || '',
          province: row.province || '',
          priceFrom: row.priceFrom ? Number(row.priceFrom) : null,
          priceTo: row.priceTo ? Number(row.priceTo) : null,
          unitTypes: row.unitTypes || [],
          accessStatus: row.accessStatus || 'active',
          commissionModel: row.commissionModel || null,
          defaultCommissionPercent:
            typeof row.defaultCommissionPercent === 'number'
              ? Number(row.defaultCommissionPercent)
              : null,
          defaultCommissionAmount:
            typeof row.defaultCommissionAmount === 'number'
              ? Number(row.defaultCommissionAmount)
              : null,
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) =>
      String(a.developmentName).localeCompare(String(b.developmentName)),
    );
  }, [myAccessQuery.data]);

  const quickWins = useMemo(() => {
    const withEstimatedPayout = stockRows.map(row => {
      let estimatedPayout: number | null = null;
      if (row.commissionModel === 'flat_amount' && row.defaultCommissionAmount) {
        estimatedPayout = Number(row.defaultCommissionAmount);
      } else if (
        row.commissionModel === 'flat_percentage' &&
        row.defaultCommissionPercent &&
        row.priceFrom
      ) {
        estimatedPayout = (Number(row.priceFrom) * Number(row.defaultCommissionPercent)) / 100;
      }

      return {
        ...row,
        estimatedPayout,
      };
    });

    return withEstimatedPayout
      .sort((a, b) => Number(b.estimatedPayout || 0) - Number(a.estimatedPayout || 0))
      .slice(0, 3);
  }, [stockRows]);

  const averageCommissionAmount = useMemo(() => {
    const rows = commissionsQuery.data || [];
    if (!rows.length) return 25000;
    const sum = rows.reduce((total, row: any) => total + Number(row.commissionAmount || 0), 0);
    return Math.max(0, Math.round(sum / rows.length));
  }, [commissionsQuery.data]);

  const potentialIncomeAmount = useMemo(() => {
    return activeDealsCount * averageCommissionAmount;
  }, [activeDealsCount, averageCommissionAmount]);

  const nextPayoutTargetAmount = useMemo(() => {
    return averageCommissionAmount;
  }, [averageCommissionAmount]);

  const upcomingViewings = useMemo(() => {
    const rows = [...(viewingsQuery.data || [])];
    rows.sort((left: any, right: any) => {
      const leftMs = toDate(left.scheduledStartAt)?.getTime() || Number.POSITIVE_INFINITY;
      const rightMs = toDate(right.scheduledStartAt)?.getTime() || Number.POSITIVE_INFINITY;
      return leftMs - rightMs;
    });
    return rows.slice(0, 5);
  }, [viewingsQuery.data]);

  const activityFeed = useMemo(() => {
    return [...pipelineDeals]
      .sort((left: any, right: any) => {
        const leftMs = toDate(left.updatedAt)?.getTime() || 0;
        const rightMs = toDate(right.updatedAt)?.getTime() || 0;
        return rightMs - leftMs;
      })
      .slice(0, 6);
  }, [pipelineDeals]);

  const showLoadingState =
    loading ||
    statusQuery.isLoading ||
    myAccessQuery.isLoading ||
    pipelineQuery.isLoading ||
    viewingsQuery.isLoading ||
    referralsQuery.isLoading ||
    commissionsQuery.isLoading;

  if (showLoadingState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1320px] px-4 pb-8 pt-6 md:px-7">
        <section className="mb-5 rounded-2xl border border-cyan-100 bg-[linear-gradient(120deg,#ecfeff,#f0f9ff)] px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Networking Engine Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Pre-Qualify Faster, Place Smarter, Track Income
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Your workflow is centered on four pillars: qualification outcome, current stock,
            commission income, and explicit pipeline stages.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            title="Network Access"
            value={String(statusQuery.data?.accessCount || 0)}
            description="Live stock programs"
            icon={<Building2 className="h-4 w-4" />}
          />
          <MetricCard
            title="Active Deals"
            value={String(activeDealsCount)}
            description="Deals currently in-flight"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCard
            title="Pending Docs"
            value={String(pendingDocReferrals.length)}
            description="Referrals needing documents"
            icon={<FileWarning className="h-4 w-4" />}
          />
          <MetricCard
            title="Pending Income"
            value={formatCurrency(pendingCommissionAmount)}
            description="Approved/pending commission"
            icon={<Coins className="h-4 w-4" />}
          />
          <MetricCard
            title="Paid Income"
            value={formatCurrency(paidCommissionAmount)}
            description="Commission already paid"
            icon={<Coins className="h-4 w-4" />}
          />
          <MetricCard
            title="Potential Income"
            value={formatCurrency(potentialIncomeAmount)}
            description="Estimated from active deals"
            icon={<Target className="h-4 w-4" />}
          />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1) Auto-Qualification Workflow</CardTitle>
              <CardDescription>
                Seamless process for referrers: capture basics, run backend calculations, and get a
                clear affordability + match outcome.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <WorkflowStep
                index={1}
                title="Capture Minimum Client Inputs"
                description="Income, deductions, deposit, and optional location preference."
              />
              <WorkflowStep
                index={2}
                title="Run Accelerator"
                description="Backend computes affordability and returns matching developments."
              />
              <WorkflowStep
                index={3}
                title="Share Outcome + Submit Referral"
                description="Use qualification pack as a confidence artifact before submission."
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => setLocation('/distribution/partner/accelerator')}>
                  Run Pre-Qualification
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/distribution/partner/submit')}
                >
                  Submit From Outcome
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">2) Stock Currently In Place</CardTitle>
              <CardDescription>
                Live developments available in your network with visible entry-level pricing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Fastest Path To Next Payout</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">
                  Close 1 more deal to unlock approximately {formatCurrency(nextPayoutTargetAmount)}
                </p>
              </div>
              {stockRows.slice(0, 6).map(row => (
                <button
                  key={row.developmentId}
                  type="button"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-cyan-300"
                  onClick={() => setLocation('/distribution/partner/developments')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{row.developmentName}</p>
                    <Badge variant="outline">{row.accessStatus}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {[row.city, row.province].filter(Boolean).join(', ') || 'Location unavailable'}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">
                    Price range: {formatCurrency(row.priceFrom)} - {formatCurrency(row.priceTo)}
                  </p>
                </button>
              ))}
              {!stockRows.length ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
                  No accessible stock currently visible.
                </p>
              ) : null}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation('/distribution/partner/developments')}
              >
                Open Full Stock View
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3) My Income</CardTitle>
              <CardDescription>
                Keep commission visibility front-and-center so referrers always know what is
                pending vs paid.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(commissionsQuery.data || []).slice(0, 8).map((entry: any) => (
                <div key={entry.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      {entry.developmentName} - Deal #{entry.dealId}
                    </p>
                    <Badge variant={entry.entryStatus === 'paid' ? 'default' : 'secondary'}>
                      {entry.entryStatus}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Amount: {formatCurrency(entry.commissionAmount)} | Updated:{' '}
                    {formatDateTime(entry.updatedAt)}
                  </p>
                </div>
              ))}
              {!(commissionsQuery.data || []).length ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
                  No commission entries yet.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">4) Explicit Stage Workflow</CardTitle>
              <CardDescription>
                This is the exact sequence your referrals move through.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stageOrder.map((stage: string) => (
                <div key={stage} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-800">{formatStageLabel(stage)}</span>
                  </div>
                  <Badge variant="secondary">{Number(stageCounts[stage] || 0)}</Badge>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation('/distribution/partner/referrals')}
              >
                Open Full Pipeline
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Wins</CardTitle>
              <CardDescription>
                Opportunity prompts designed to drive immediate action today.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickWins.map(win => (
                <button
                  key={`win-${win.developmentId}`}
                  type="button"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-cyan-300"
                  onClick={() => setLocation('/distribution/partner/developments')}
                >
                  <p className="font-medium text-slate-900">{win.developmentName}</p>
                  <p className="text-xs text-slate-500">
                    {[win.city, win.province].filter(Boolean).join(', ') || 'Location unavailable'}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">
                    Est. payout: {formatCurrency(win.estimatedPayout)}
                  </p>
                </button>
              ))}
              {!quickWins.length ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
                  Quick wins will appear as stock and commission rules update.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Activity</CardTitle>
              <CardDescription>Viewings and near-term actions to keep deals moving.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingViewings.map((viewing: any) => (
                <div
                  key={viewing.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{viewing.developmentName}</p>
                    <Badge variant="secondary">{viewing.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Buyer: {viewing.buyerName || 'Not provided'} | {formatDateTime(viewing.scheduledStartAt)}
                  </p>
                </div>
              ))}
              {!upcomingViewings.length ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
                  No upcoming viewings scheduled.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Current Deal Queue</CardTitle>
                <CardDescription>Live snapshot of referrals currently being worked.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
                Full Queue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {pipelineDeals.slice(0, 7).map((deal: any) => (
                <button
                  key={deal.id}
                  type="button"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-cyan-300"
                  onClick={() => setLocation(`/distribution/partner/referrals/${Number(deal.id)}`)}
                >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {deal.developmentName} - {deal.buyerName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {deal.managerDisplayName || 'Manager pending'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{formatStageLabel(deal.currentStage)}</Badge>
                      <Badge variant="outline">{deal.commissionStatus}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Next step:{' '}
                    {!deal.documentsComplete
                      ? 'Collect missing required documents'
                      : deal.currentStage === 'viewing_scheduled' && !deal.validationStatus
                        ? 'Capture viewing outcome'
                        : 'Advance to next manager stage'}
                  </p>
                </button>
              ))}
              {!pipelineDeals.length ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
                  No deals yet. Start by running pre-qualification.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity Feed</CardTitle>
              <CardDescription>
                Ownership layer: recent movements across your deals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {activityFeed.map((deal: any) => (
                <div key={`feed-${deal.id}`} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="font-medium text-slate-900">
                    Deal #{deal.id} moved to {formatStageLabel(deal.currentStage)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {deal.developmentName} | {formatDateTime(deal.updatedAt)}
                  </p>
                </div>
              ))}
              {!activityFeed.length ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-3">
                  <p className="text-slate-500">No recent activity yet.</p>
                </div>
              ) : null}
              <div className="rounded-lg border border-cyan-200 bg-cyan-50/70 p-3">
                <p className="font-medium text-cyan-900">Use the Accelerator First</p>
                <p className="mt-1 text-cyan-800">
                  Always run pre-qualification first to improve conversion quality.
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                <p className="font-medium text-amber-900">Docs Pending: {pendingDocReferrals.length}</p>
                <p className="mt-1 text-amber-800">
                  Complete document sets faster to move deals through stage gates.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => setLocation('/distribution/partner/accelerator')}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Start New Pre-Qualification
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </ReferralAppShell>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wide">
          {icon}
          {title}
        </CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-slate-500">{description}</CardContent>
    </Card>
  );
}

function WorkflowStep({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Step {index}</p>
      <p className="mt-0.5 font-medium text-slate-900">{title}</p>
      <p className="mt-0.5 text-sm text-slate-600">{description}</p>
    </div>
  );
}
