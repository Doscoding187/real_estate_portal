import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

type PrequalFormValues = {
  subjectName: string;
  subjectPhone: string;
  grossIncomeMonthly: string;
  deductionsMonthly: string;
  depositAmount: string;
  city: string;
};

type AcceleratorAssessment = {
  assessmentId: string;
  outputs: {
    maxMonthlyRepayment: number;
    purchasePrice: number;
    confidenceLabel: string;
  };
};

type AcceleratorMatchSnapshot = {
  matchSnapshotId: string;
  matches: Array<{
    developmentId: number;
    developmentName: string;
    area: string;
    purchasePrice: number;
    bestFitRatio: number;
  }>;
};

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

const DEFAULT_PREQUAL_FORM: PrequalFormValues = {
  subjectName: '',
  subjectPhone: '',
  grossIncomeMonthly: '',
  deductionsMonthly: '0',
  depositAmount: '0',
  city: '',
};

function parseMoneyInt(value: string, fallbackValue = 0) {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(parsed)) return fallbackValue;
  return Math.max(0, Math.round(parsed));
}

function buildWhatsAppShareMessage(
  match: AcceleratorMatchSnapshot['matches'][number],
  assessment: AcceleratorAssessment | null,
) {
  const lines = [
    'Buyer pre-qualification snapshot',
    `Development: ${match.developmentName}`,
    `Location: ${match.area || 'N/A'}`,
    `Indicative price: ${formatCurrency(match.purchasePrice)}`,
    `Match score: ${(match.bestFitRatio * 100).toFixed(0)}%`,
  ];

  if (assessment) {
    lines.push(`Affordability ceiling: ${formatCurrency(assessment.outputs.purchasePrice)}`);
    lines.push(`Confidence: ${assessment.outputs.confidenceLabel}`);
  }

  return lines.join('\n');
}

export default function PartnerDashboardPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [prequalValues, setPrequalValues] = useState<PrequalFormValues>(DEFAULT_PREQUAL_FORM);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

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

  const createAssessmentMutation =
    trpc.distribution.partner.createAffordabilityAssessment.useMutation({
      onSuccess: result => {
        setAssessmentId(String(result.assessmentId));
      },
    });

  const normalizedAssessmentId = assessmentId || ZERO_UUID;

  const assessmentQuery = trpc.distribution.partner.getAffordabilityAssessment.useQuery(
    { assessmentId: normalizedAssessmentId },
    {
      enabled: Boolean(assessmentId),
      retry: false,
    },
  );

  const matchesQuery = trpc.distribution.partner.getAffordabilityMatches.useQuery(
    { assessmentId: normalizedAssessmentId },
    {
      enabled: false,
      retry: false,
    },
  );

  const assessment = (assessmentQuery.data || null) as AcceleratorAssessment | null;
  const matchSnapshot = (matchesQuery.data || null) as AcceleratorMatchSnapshot | null;

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

  const opportunityRows = useMemo(() => {
    return stockRows
      .map(row => {
        const commissionAmount =
          row.commissionModel === 'flat_amount' && row.defaultCommissionAmount
            ? Number(row.defaultCommissionAmount)
            : row.commissionModel === 'flat_percentage' && row.defaultCommissionPercent && row.priceFrom
              ? (Number(row.priceFrom) * Number(row.defaultCommissionPercent)) / 100
              : null;

        let badge: 'Hot' | 'High Demand' | 'Fast Payout' = 'High Demand';
        if ((commissionAmount || 0) >= 30000) badge = 'Hot';
        if ((commissionAmount || 0) >= 20000 && (commissionAmount || 0) < 30000) badge = 'Fast Payout';

        return {
          ...row,
          commissionAmount,
          badge,
        };
      })
      .sort((a, b) => Number(b.commissionAmount || 0) - Number(a.commissionAmount || 0))
      .slice(0, 6);
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

  const prequalMatches = matchSnapshot?.matches.slice(0, 3) || [];

  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      detail: string;
      severity: 'urgent' | 'action' | 'info';
      ctaLabel: string;
      onClick: () => void;
    }> = [];

    const firstMissingDocs = pendingDocReferrals[0];
    if (firstMissingDocs) {
      items.push({
        id: `docs-${firstMissingDocs.dealId}`,
        title: `${firstMissingDocs.development?.name || 'Referral'}: missing required documents`,
        detail: `Verified ${firstMissingDocs.docProgress?.verifiedRequiredCount || 0}/${firstMissingDocs.docProgress?.requiredCount || 0} required docs`,
        severity: 'urgent',
        ctaLabel: 'Open referral',
        onClick: () => setLocation(`/distribution/partner/referrals/${Number(firstMissingDocs.dealId)}`),
      });
    }

    const firstUpcomingViewing = upcomingViewings[0];
    if (firstUpcomingViewing) {
      items.push({
        id: `viewing-${firstUpcomingViewing.id}`,
        title: `Viewing scheduled: ${firstUpcomingViewing.developmentName || 'Development'}`,
        detail: `Buyer: ${firstUpcomingViewing.buyerName || 'Not provided'} on ${formatDateTime(firstUpcomingViewing.scheduledStartAt)}`,
        severity: 'action',
        ctaLabel: 'Open pipeline',
        onClick: () => setLocation('/distribution/partner/referrals'),
      });
    }

    const firstDeal = pipelineDeals[0];
    if (firstDeal) {
      items.push({
        id: `deal-${firstDeal.id}`,
        title: `Move deal #${firstDeal.id} to next stage`,
        detail: firstDeal.documentsComplete
          ? `Current stage: ${formatStageLabel(firstDeal.currentStage)}`
          : 'Documents incomplete: collect missing docs first',
        severity: 'info',
        ctaLabel: 'Open deal',
        onClick: () => setLocation(`/distribution/partner/referrals/${Number(firstDeal.id)}`),
      });
    }

    if (!items.length) {
      items.push({
        id: 'empty',
        title: 'Start with pre-qualification',
        detail: 'Run affordability first, then submit from matched stock to activate your pipeline.',
        severity: 'info',
        ctaLabel: 'Open accelerator',
        onClick: () => setLocation('/distribution/partner/accelerator'),
      });
    }

    return items.slice(0, 5);
  }, [pendingDocReferrals, upcomingViewings, pipelineDeals, setLocation]);

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
      <main className="mx-auto w-full max-w-[1320px] px-4 pb-8 pt-5 md:px-7 md:pt-6">
        <section className="relative mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#e8f0fb]/70 blur-3xl" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1a5bbf]">
                Networking Engine Dashboard
              </p>
              <h1 className="mt-2 text-[28px] font-bold leading-tight text-slate-900">
                Pre-Qualify Faster, Place Smarter, Track Income
              </h1>
              <p className="mt-1 text-[13px] text-slate-600">
                Your workflow is centered on qualification, stock, income, and explicit pipeline
                stages.
              </p>
            </div>
            <div className="relative flex gap-2">
              <Button
                variant="outline"
                className="border-slate-300 bg-white"
                onClick={() => setLocation('/distribution/partner/submit')}
              >
                Submit Referral
              </Button>
              <Button
                className="bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setLocation('/distribution/partner/accelerator')}
              >
                Run Accelerator
              </Button>
            </div>
          </div>
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
          <Card className="overflow-hidden border-[#1a1a18]/12 shadow-[0_10px_24px_rgba(26,26,24,0.07)]">
            <CardHeader>
              <CardTitle className="text-base">Core Engine: Quick Pre-Qualification</CardTitle>
              <CardDescription>
                Capture buyer basics, run affordability, and match to stock without leaving the
                dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 bg-[linear-gradient(180deg,rgba(236,254,255,0.35),rgba(255,255,255,1))]">
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Buyer name (optional)"
                  value={prequalValues.subjectName}
                  onChange={event =>
                    setPrequalValues(current => ({ ...current, subjectName: event.target.value }))
                  }
                />
                <Input
                  placeholder="Buyer phone (optional)"
                  value={prequalValues.subjectPhone}
                  onChange={event =>
                    setPrequalValues(current => ({ ...current, subjectPhone: event.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Gross income monthly (required)"
                  value={prequalValues.grossIncomeMonthly}
                  onChange={event =>
                    setPrequalValues(current => ({ ...current, grossIncomeMonthly: event.target.value }))
                  }
                  inputMode="numeric"
                />
                <Input
                  placeholder="Deductions monthly"
                  value={prequalValues.deductionsMonthly}
                  onChange={event =>
                    setPrequalValues(current => ({ ...current, deductionsMonthly: event.target.value }))
                  }
                  inputMode="numeric"
                />
                <Input
                  placeholder="Deposit amount"
                  value={prequalValues.depositAmount}
                  onChange={event =>
                    setPrequalValues(current => ({ ...current, depositAmount: event.target.value }))
                  }
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <Input
                  placeholder="Preferred city (optional)"
                  value={prequalValues.city}
                  onChange={event =>
                    setPrequalValues(current => ({ ...current, city: event.target.value }))
                  }
                />
                <Button
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => {
                    const grossIncomeMonthly = parseMoneyInt(prequalValues.grossIncomeMonthly, 0);
                    if (grossIncomeMonthly <= 0) return;

                    setAssessmentId(null);
                    createAssessmentMutation.mutate({
                      subjectName: prequalValues.subjectName.trim() || undefined,
                      subjectPhone: prequalValues.subjectPhone.trim() || undefined,
                      grossIncomeMonthly,
                      deductionsMonthly: parseMoneyInt(prequalValues.deductionsMonthly, 0),
                      depositAmount: parseMoneyInt(prequalValues.depositAmount, 0),
                      locationFilter: prequalValues.city.trim()
                        ? { city: prequalValues.city.trim() }
                        : undefined,
                    });
                  }}
                  disabled={createAssessmentMutation.isPending}
                >
                  {createAssessmentMutation.isPending ? 'Calculating...' : 'Run Pre-Qualification'}
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-300"
                  onClick={() => setLocation('/distribution/partner/accelerator')}
                >
                  Open Full Accelerator
                </Button>
              </div>

              {assessmentQuery.isLoading ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Loading affordability outcome...
                </div>
              ) : null}

              {assessment ? (
                <div className="rounded-xl border border-[#1a7a40]/20 bg-[#e8f7ee] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#1a7a40]">
                    Qualification Outcome
                  </p>
                  <p className="mt-1 text-sm text-[#1a1a18]">
                    Purchase ceiling: {formatCurrency(assessment.outputs.purchasePrice)}
                  </p>
                  <p className="text-xs text-[#1a7a40]">
                    Max repayment: {formatCurrency(assessment.outputs.maxMonthlyRepayment)}
                  </p>
                  <p className="text-xs text-[#1a7a40]">Confidence: {assessment.outputs.confidenceLabel}</p>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      className="bg-[#1a1a18] text-white hover:bg-[#2a2a28]"
                      onClick={() => {
                        if (!assessmentId) return;
                        void matchesQuery.refetch();
                      }}
                      disabled={matchesQuery.isFetching}
                    >
                      {matchesQuery.isFetching ? 'Finding matches...' : 'Get Matched Developments'}
                    </Button>
                  </div>
                </div>
              ) : null}

              {prequalMatches.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Top Matches
                  </p>
                  {prequalMatches.map(match => (
                    <div key={match.developmentId} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900">{match.developmentName}</p>
                          <p className="text-xs text-slate-500">{match.area || 'Area unavailable'}</p>
                        </div>
                        <Badge variant="secondary">Fit {(match.bestFitRatio * 100).toFixed(0)}%</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-700">
                        Indicative from {formatCurrency(match.purchasePrice)}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          className="bg-slate-900 text-white hover:bg-slate-800"
                          onClick={() =>
                            setLocation(
                              `/distribution/partner/submit?developmentId=${match.developmentId}&assessmentId=${assessmentId}`,
                            )
                          }
                        >
                          Submit This Buyer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation('/distribution/partner/developments')}
                        >
                          View Stock
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const text = buildWhatsAppShareMessage(match, assessment);
                            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          Share via WhatsApp
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle className="text-base">Opportunities Available Now</CardTitle>
              <CardDescription>
                Commission-forward stock cards ranked for speed-to-payout action.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-[#1a7a40]/20 bg-[#e8f7ee] p-3">
                <p className="text-xs uppercase tracking-wide text-[#1a7a40]">Fastest Path To Next Payout</p>
                <p className="mt-1 text-sm font-semibold text-[#1a1a18]">
                  Close 1 more deal to unlock approximately {formatCurrency(nextPayoutTargetAmount)}
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {opportunityRows.map(row => (
                  <div key={row.developmentId} className="rounded-xl border border-[#1a1a18]/12 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#1a1a18]/35 hover:shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{row.developmentName}</p>
                      <Badge
                        variant={
                          row.badge === 'Hot'
                            ? 'destructive'
                            : row.badge === 'Fast Payout'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {row.badge}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {[row.city, row.province].filter(Boolean).join(', ') || 'Location unavailable'}
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      From {formatCurrency(row.priceFrom)}{' '}
                      {row.priceTo ? `to ${formatCurrency(row.priceTo)}` : ''}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#1a7a40]">
                      Commission: {formatCurrency(row.commissionAmount)}
                    </p>
                    <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-300"
                          onClick={() =>
                          setLocation(`/distribution/partner/submit?developmentId=${row.developmentId}`)
                        }
                      >
                        Match Buyer
                      </Button>
                      <Button
                        size="sm"
                        className="bg-slate-900 text-white hover:bg-slate-800"
                        onClick={() => setLocation('/distribution/partner/developments')}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {!opportunityRows.length ? (
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
          <Card className="shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
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

          <Card className="shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
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
          <Card className="shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
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
                  className="w-full rounded-lg border border-[#1a1a18]/12 bg-white px-3 py-2 text-left transition hover:border-[#1a1a18]/35"
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

          <Card className="shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
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
          <Card className="shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
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
                  className="w-full rounded-lg border border-[#1a1a18]/12 bg-white px-3 py-2 text-left transition hover:border-[#1a1a18]/35"
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

          <Card className="shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <CardHeader>
              <CardTitle className="text-base">Needs Your Attention</CardTitle>
              <CardDescription>
                Priority actions that unblock deal progression and payout momentum.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {attentionItems.map(item => (
                <div
                  key={item.id}
                  className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <span
                    className={
                      item.severity === 'urgent'
                        ? 'absolute inset-y-0 left-0 w-1 rounded-l-xl bg-rose-500'
                        : item.severity === 'action'
                          ? 'absolute inset-y-0 left-0 w-1 rounded-l-xl bg-amber-500'
                          : 'absolute inset-y-0 left-0 w-1 rounded-l-xl bg-[#3B8BD4]'
                    }
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <Badge
                      variant={
                        item.severity === 'urgent'
                          ? 'destructive'
                          : item.severity === 'action'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
                  <div className="mt-2">
                    <Button size="sm" variant="outline" className="border-slate-300" onClick={item.onClick}>
                      {item.ctaLabel}
                    </Button>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Recent activity snapshot</p>
                {activityFeed.slice(0, 2).map((deal: any) => (
                  <p key={`feed-mini-${deal.id}`} className="mt-1 text-xs text-slate-600">
                    Deal #{deal.id} moved to {formatStageLabel(deal.currentStage)} on{' '}
                    {formatDateTime(deal.updatedAt)}
                  </p>
                ))}
                {!activityFeed.length ? (
                  <p className="mt-1 text-xs text-slate-600">No recent activity yet.</p>
                ) : null}
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
    <Card className="border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {icon}
          {title}
        </CardDescription>
        <CardTitle className="font-mono text-2xl text-slate-900">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-slate-500">{description}</CardContent>
    </Card>
  );
}
