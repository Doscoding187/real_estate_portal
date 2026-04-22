import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

type PrequalFormValues = {
  grossIncomeMonthly: string;
  deductionsMonthly: string;
  depositAmount: string;
  area: string;
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
    logoUrl?: string | null;
    unitOptions?: Array<{
      unitTypeId?: string | null;
      unitName?: string;
      priceFrom?: number;
      priceTo?: number;
      fitRatio?: number;
    }>;
    purchasePrice: number;
    bestFitRatio: number;
  }>;
};

type AccessStockRow = {
  developmentId: number;
  developmentName: string;
  location: string;
  priceFrom: number | null;
  priceTo: number | null;
  commissionAmount: number;
  commissionDisplay: string;
  commissionModel: string | null;
  defaultCommissionPercent: number | null;
  defaultCommissionAmount: number | null;
  imageUrl: string | null;
  badge: 'Hot' | 'High demand' | 'Fast payout';
};

type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  urgency: 'urgent' | 'action' | 'info';
  timeLabel: string;
  onClick: () => void;
};

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

const DEFAULT_PREQUAL_FORM: PrequalFormValues = {
  grossIncomeMonthly: '',
  deductionsMonthly: '0',
  depositAmount: '0',
  area: '',
};

function formatCurrency(value: number | null | undefined, abbreviated = false) {
  const numeric = Number(value || 0);
  if (abbreviated && Math.abs(numeric) >= 1000) {
    return `R ${Math.round(numeric / 1000)}k`;
  }
  return `R ${numeric.toLocaleString('en-ZA')}`;
}

function formatCurrencyRange(priceFrom: number | null | undefined, priceTo: number | null | undefined) {
  const from = Number(priceFrom || 0);
  const to = Number(priceTo || 0);
  const hasFrom = Number.isFinite(from) && from > 0;
  const hasTo = Number.isFinite(to) && to > 0;
  if (hasFrom && hasTo) {
    if (Math.abs(from - to) <= 1) return formatCurrency(from);
    return `${formatCurrency(from)} - ${formatCurrency(to)}`;
  }
  if (hasFrom) return `From ${formatCurrency(from)}`;
  if (hasTo) return `Up to ${formatCurrency(to)}`;
  return 'Price not configured';
}

function parseMoneyInt(value: string, fallbackValue = 0) {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(parsed)) return fallbackValue;
  return Math.max(0, Math.round(parsed));
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

function formatRelativeTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return '-';
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Now';
  if (days === 1) return '1d';
  return `${days}d`;
}

function formatStageLabel(stage: string) {
  return String(stage || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function normalizePipelineStage(stage: unknown) {
  const value = String(stage || '').toLowerCase();
  if (!value) return 'viewing_scheduled';
  if (value === 'submitted' || value === 'lead') return 'viewing_scheduled';
  return value;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0%';
  return `${Math.round(value * 100)}%`;
}

function getMatchConfidence(bestFitRatio: number): 'Strong' | 'Medium' | 'Low' {
  if (bestFitRatio >= 0.85) return 'Strong';
  if (bestFitRatio >= 0.65) return 'Medium';
  return 'Low';
}

function computeCommissionAmount(input: {
  commissionModel?: string | null;
  defaultCommissionPercent?: number | null;
  defaultCommissionAmount?: number | null;
  purchasePrice?: number | null;
}) {
  const model = String(input.commissionModel || '');
  const purchasePrice = Number(input.purchasePrice || 0);
  if (model === 'flat_amount') {
    return Math.max(0, Number(input.defaultCommissionAmount || 0));
  }
  if (model === 'flat_percentage') {
    const percent = Number(input.defaultCommissionPercent || 0);
    if (percent > 0 && purchasePrice > 0) {
      return Math.round((purchasePrice * percent) / 100);
    }
  }
  return 0;
}

function getCommissionDisplay(input: {
  amount: number;
  commissionModel?: string | null;
  defaultCommissionPercent?: number | null;
}) {
  if (input.amount > 0) return formatCurrency(input.amount);
  if (String(input.commissionModel || '') === 'flat_percentage' && Number(input.defaultCommissionPercent || 0) > 0) {
    return `${Number(input.defaultCommissionPercent)}% fee`;
  }
  return 'Commission configured';
}

function buildWhatsAppShareMessage(
  matches: AcceleratorMatchSnapshot['matches'],
  maxPurchase: number,
) {
  const summary = matches
    .slice(0, 3)
    .map(
      match =>
        `- ${match.developmentName} (${match.area || 'N/A'}) - From ${formatCurrency(match.purchasePrice)}`,
    )
    .join('\n');

  return [
    'Hi! Based on your financials, here are developments you may qualify for:',
    '',
    summary || '- No matching developments yet',
    '',
    `Max purchase power: ${formatCurrency(maxPurchase)}`,
    '',
    "Let's set up a viewing.",
  ].join('\n');
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
  const eligibleDevelopmentsQuery =
    trpc.distribution.partner.listEligibleDevelopmentsForSubmission.useQuery(undefined, {
      enabled: isAuthenticated,
      retry: false,
    });
  const programTermsQuery = trpc.distribution.partner.listProgramTerms.useQuery(
    { includeDisabled: true },
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

  const viewingsQuery = trpc.distribution.referrer.myViewings.useQuery(
    { includePast: false, limit: 10 },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );

  const createAssessmentMutation =
    trpc.distribution.partner.createAffordabilityAssessment.useMutation({
      onSuccess: result => setAssessmentId(String(result.assessmentId)),
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
  const matches = matchSnapshot?.matches || [];

  useEffect(() => {
    if (!assessmentId) return;
    void matchesQuery.refetch();
  }, [assessmentId]);

  const pipelineDeals = pipelineQuery.data?.deals || [];
  const stageOrder = pipelineQuery.data?.stageOrder || [];
  const stageCounts = (pipelineQuery.data?.stageCounts || {}) as Record<string, number>;

  const pendingDocReferrals = useMemo(() => {
    const items = referralsQuery.data?.items || [];
    return items.filter((item: any) => {
      const requiredCount = Number(item.docProgress?.requiredCount || 0);
      const verifiedCount = Number(item.docProgress?.verifiedRequiredCount || 0);
      return requiredCount > verifiedCount;
    });
  }, [referralsQuery.data?.items]);
  const referralItems = referralsQuery.data?.items || [];
  const atRiskReferrals = useMemo(() => {
    const items = referralsQuery.data?.items || [];
    return items.filter((item: any) => Boolean(item.journey?.atRisk));
  }, [referralsQuery.data?.items]);

  const activeDealsCount = useMemo(() => {
    const excluded = new Set(['commission_paid', 'cancelled']);
    return Object.entries(stageCounts).reduce((total, [stage, count]) => {
      if (excluded.has(stage)) return total;
      return total + Number(count || 0);
    }, 0);
  }, [stageCounts]);

  const pendingIncome = useMemo(() => {
    return (commissionsQuery.data || []).reduce((sum, row: any) => {
      const status = String(row.entryStatus || '').toLowerCase();
      return status === 'pending' ? sum + Number(row.commissionAmount || 0) : sum;
    }, 0);
  }, [commissionsQuery.data]);

  const approvedIncome = useMemo(() => {
    return (commissionsQuery.data || []).reduce((sum, row: any) => {
      const status = String(row.entryStatus || '').toLowerCase();
      return status === 'approved' ? sum + Number(row.commissionAmount || 0) : sum;
    }, 0);
  }, [commissionsQuery.data]);

  const paidIncome = useMemo(() => {
    return (commissionsQuery.data || []).reduce((sum, row: any) => {
      const status = String(row.entryStatus || '').toLowerCase();
      return status === 'paid' ? sum + Number(row.commissionAmount || 0) : sum;
    }, 0);
  }, [commissionsQuery.data]);

  const totalIncomePipeline = pendingIncome + approvedIncome + paidIncome;

  const averageCommissionAmount = useMemo(() => {
    const rows = commissionsQuery.data || [];
    if (!rows.length) return 25000;
    const sum = rows.reduce((total, row: any) => total + Number(row.commissionAmount || 0), 0);
    return Math.max(0, Math.round(sum / rows.length));
  }, [commissionsQuery.data]);

  const potentialIncome = activeDealsCount * averageCommissionAmount;

  const paidDealsCount = Number(stageCounts.commission_paid || 0);
  const unlockTargetDeals = 3;
  const unlockProgress = Math.max(0, Math.min(1, paidDealsCount / unlockTargetDeals));
  const unlockDealsRemaining = Math.max(0, unlockTargetDeals - paidDealsCount);
  const nextUnlockAmount = averageCommissionAmount;

  const applicationOrBeyondCount = useMemo(() => {
    const convertedStages = new Set([
      'application_submitted',
      'contract_signed',
      'bond_approved',
      'commission_pending',
      'commission_paid',
    ]);
    return referralItems.filter((item: any) =>
      convertedStages.has(normalizePipelineStage(item.status)),
    ).length;
  }, [referralItems]);

  const paidReferralCount = useMemo(
    () =>
      referralItems.filter(
        (item: any) => normalizePipelineStage(item.status) === 'commission_paid',
      ).length,
    [referralItems],
  );

  const submissionsLast7Days = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    return referralItems.filter((item: any) => {
      const created = toDate(item.createdAt);
      return Boolean(created && created.getTime() >= cutoff);
    }).length;
  }, [referralItems]);

  const submitToApplicationRate =
    referralItems.length > 0 ? applicationOrBeyondCount / referralItems.length : 0;
  const submitToPaidRate = referralItems.length > 0 ? paidReferralCount / referralItems.length : 0;

  const stockRows = useMemo<AccessStockRow[]>(() => {
    const grouped = new Map<number, AccessStockRow>();
    for (const row of myAccessQuery.data || []) {
      if (row?.isReferralEnabled === false) continue;
      if (row?.tierEligible === false) continue;
      const developmentId = Number(row.developmentId);
      if (!grouped.has(developmentId)) {
        const unitTypeFloor = Array.isArray(row.unitTypes)
          ? row.unitTypes
              .map((unit: any) => Number(unit?.priceFrom || 0))
              .filter((price: number) => Number.isFinite(price) && price > 0)
              .sort((a: number, b: number) => a - b)[0]
          : null;
        const unitTypeCeiling = Array.isArray(row.unitTypes)
          ? row.unitTypes
              .map((unit: any) => Number(unit?.priceTo || unit?.priceFrom || 0))
              .filter((price: number) => Number.isFinite(price) && price > 0)
              .sort((a: number, b: number) => b - a)[0]
          : null;
        const priceFromRaw = Number(unitTypeFloor || row.priceFrom || 0);
        const priceToRaw = Number(unitTypeCeiling || row.priceTo || priceFromRaw || 0);
        const priceFrom = Number.isFinite(priceFromRaw) && priceFromRaw > 0 ? priceFromRaw : null;
        const priceTo = Number.isFinite(priceToRaw) && priceToRaw > 0 ? priceToRaw : priceFrom;
        const commissionModel = row.commissionModel ? String(row.commissionModel) : null;
        const defaultCommissionPercent =
          row.defaultCommissionPercent == null ? null : Number(row.defaultCommissionPercent);
        const defaultCommissionAmount =
          row.defaultCommissionAmount == null ? null : Number(row.defaultCommissionAmount);
        const commissionAmount = computeCommissionAmount({
          commissionModel,
          defaultCommissionPercent,
          defaultCommissionAmount,
          purchasePrice: priceFrom || 0,
        });
        const commissionDisplay = getCommissionDisplay({
          amount: commissionAmount,
          commissionModel,
          defaultCommissionPercent,
        });

        let badge: 'Hot' | 'High demand' | 'Fast payout' = 'High demand';
        if (commissionAmount >= 30000) badge = 'Hot';
        if (commissionAmount >= 18000 && commissionAmount < 30000) badge = 'Fast payout';

        grouped.set(developmentId, {
          developmentId,
          developmentName: row.developmentName || 'Development',
          location: [row.city, row.province].filter(Boolean).join(' - ') || 'Location unavailable',
          priceFrom,
          priceTo,
          commissionAmount,
          commissionDisplay,
          commissionModel,
          defaultCommissionPercent,
          defaultCommissionAmount,
          imageUrl: row.imageUrl ? String(row.imageUrl) : null,
          badge,
        });
      }
    }

    for (const item of eligibleDevelopmentsQuery.data?.items || []) {
      const developmentId = Number(item.developmentId || 0);
      if (!developmentId || grouped.has(developmentId)) continue;
      const commissionModel = item.program?.commissionModel ? String(item.program.commissionModel) : null;
      const defaultCommissionPercent =
        item.program?.defaultCommissionPercent == null
          ? null
          : Number(item.program.defaultCommissionPercent);
      const defaultCommissionAmount =
        item.program?.defaultCommissionAmount == null ? null : Number(item.program.defaultCommissionAmount);
      const commissionAmount = computeCommissionAmount({
        commissionModel,
        defaultCommissionPercent,
        defaultCommissionAmount,
        purchasePrice: 0,
      });
      const commissionDisplay = getCommissionDisplay({
        amount: commissionAmount,
        commissionModel,
        defaultCommissionPercent,
      });
      grouped.set(developmentId, {
        developmentId,
        developmentName: item.developmentName || 'Development',
        location: [item.city, item.province].filter(Boolean).join(' - ') || 'Location unavailable',
        priceFrom: item.priceFrom ? Number(item.priceFrom) : null,
        priceTo: item.priceTo ? Number(item.priceTo) : item.priceFrom ? Number(item.priceFrom) : null,
        commissionAmount,
        commissionDisplay,
        commissionModel,
        defaultCommissionPercent,
        defaultCommissionAmount,
        imageUrl: item.imageUrl ? String(item.imageUrl) : null,
        badge: commissionAmount >= 18000 ? 'Fast payout' : 'High demand',
      });
    }

    for (const item of programTermsQuery.data?.items || []) {
      const developmentId = Number(item.developmentId || 0);
      if (!developmentId || grouped.has(developmentId)) continue;
      const commissionModel = item.program?.commissionModel ? String(item.program.commissionModel) : null;
      const defaultCommissionPercent =
        item.program?.defaultCommissionPercent == null
          ? null
          : Number(item.program.defaultCommissionPercent);
      const defaultCommissionAmount =
        item.program?.defaultCommissionAmount == null ? null : Number(item.program.defaultCommissionAmount);
      const commissionAmount = computeCommissionAmount({
        commissionModel,
        defaultCommissionPercent,
        defaultCommissionAmount,
        purchasePrice: 0,
      });
      const commissionDisplay = getCommissionDisplay({
        amount: commissionAmount,
        commissionModel,
        defaultCommissionPercent,
      });

      grouped.set(developmentId, {
        developmentId,
        developmentName: item.developmentName || 'Development',
        location: [item.city, item.province].filter(Boolean).join(' - ') || 'Location unavailable',
        priceFrom: item.priceFrom ? Number(item.priceFrom) : null,
        priceTo: item.priceTo ? Number(item.priceTo) : item.priceFrom ? Number(item.priceFrom) : null,
        commissionAmount,
        commissionDisplay,
        commissionModel,
        defaultCommissionPercent,
        defaultCommissionAmount,
        imageUrl: item.imageUrl ? String(item.imageUrl) : null,
        badge: commissionAmount >= 18000 ? 'Fast payout' : 'High demand',
      });
    }

    return Array.from(grouped.values()).sort(
      (a, b) =>
        Number(b.commissionAmount || 0) - Number(a.commissionAmount || 0) ||
        a.developmentName.localeCompare(b.developmentName),
    );
  }, [eligibleDevelopmentsQuery.data?.items, myAccessQuery.data, programTermsQuery.data?.items]);

  const visibleStock = stockRows.slice(0, 3);
  const hiddenStockCount = Math.max(0, stockRows.length - 3);
  const stockByDevelopmentId = useMemo(() => {
    const map = new Map<number, AccessStockRow>();
    for (const row of stockRows) {
      map.set(Number(row.developmentId), row);
    }
    return map;
  }, [stockRows]);

  const activePipelineStage = useMemo(() => {
    const ranked = stageOrder
      .map((stage: string) => ({ stage, count: Number(stageCounts[stage] || 0) }))
      .sort((a, b) => b.count - a.count);
    return ranked[0]?.stage || null;
  }, [stageCounts, stageOrder]);

  const staleDeal = useMemo(() => {
    const now = Date.now();
    return pipelineDeals.find((deal: any) => {
      const updated = toDate(deal.updatedAt);
      if (!updated) return false;
      const days = (now - updated.getTime()) / (1000 * 60 * 60 * 24);
      return days > 2;
    });
  }, [pipelineDeals]);

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];

    const firstAtRisk = atRiskReferrals[0];
    if (firstAtRisk) {
      items.push({
        id: `risk-${firstAtRisk.dealId}`,
        urgency: 'urgent',
        title: `${firstAtRisk.buyer?.name || 'Buyer'} - SLA at risk`,
        detail:
          firstAtRisk.journey?.nextAction ||
          `${firstAtRisk.development?.name || 'Deal'} requires immediate follow-up.`,
        timeLabel: 'Now',
        onClick: () => setLocation(`/distribution/partner/referrals/${Number(firstAtRisk.dealId)}`),
      });
    }

    const firstMissingDocs = pendingDocReferrals[0];
    if (firstMissingDocs) {
      items.push({
        id: `docs-${firstMissingDocs.dealId}`,
        urgency: 'urgent',
        title: `${firstMissingDocs.buyer?.name || 'Buyer'} - docs overdue`,
        detail: `${firstMissingDocs.development?.name || 'Deal'} - ${firstMissingDocs.docProgress?.verifiedRequiredCount || 0}/${firstMissingDocs.docProgress?.requiredCount || 0} verified`,
        timeLabel: 'Now',
        onClick: () => setLocation(`/distribution/partner/referrals/${Number(firstMissingDocs.dealId)}`),
      });
    }

    const firstViewing = (viewingsQuery.data || [])[0];
    if (firstViewing) {
      items.push({
        id: `viewing-${firstViewing.id}`,
        urgency: 'action',
        title: `Viewing scheduled - ${firstViewing.buyerName || 'Buyer'}`,
        detail: `${firstViewing.developmentName || 'Development'} - ${formatDateTime(firstViewing.scheduledStartAt)}`,
        timeLabel: formatRelativeTime(firstViewing.scheduledStartAt),
        onClick: () => setLocation('/distribution/partner/referrals'),
      });
    }

    const topStock = visibleStock[0];
    if (topStock) {
      items.push({
        id: `stock-${topStock.developmentId}`,
        urgency: 'info',
        title: `High opportunity - ${topStock.developmentName}`,
        detail: `${formatCurrencyRange(topStock.priceFrom, topStock.priceTo)} - Commission ${formatCurrency(topStock.commissionAmount)}`,
        timeLabel: 'Today',
        onClick: () => setLocation('/distribution/partner/developments'),
      });
    }

    if (!items.length) {
      items.push({
        id: 'empty',
        urgency: 'info',
        title: 'Run pre-qualification to create your first deal',
        detail: 'Input buyer affordability and generate matching opportunities.',
        timeLabel: '-',
        onClick: () => setLocation('/distribution/partner/accelerator'),
      });
    }

    return items.slice(0, 5);
  }, [atRiskReferrals, pendingDocReferrals, viewingsQuery.data, visibleStock, setLocation]);

  const showLoadingState =
    loading ||
    statusQuery.isLoading ||
    myAccessQuery.isLoading ||
    programTermsQuery.isLoading ||
    pipelineQuery.isLoading ||
    referralsQuery.isLoading ||
    commissionsQuery.isLoading ||
    viewingsQuery.isLoading;

  if (showLoadingState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0ede8]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6b6a64]" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1380px] px-4 pb-8 pt-5 md:px-7">
        <section className="overflow-hidden rounded-xl border border-[#1a1a18]/12 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 px-7 pb-5 pt-6">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[#6b6a64]">
                {new Date().toLocaleDateString('en-ZA', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                - Good morning
              </p>
              <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#1a1a18]">
                Your Network Engine
              </h1>
              <p className="mt-1 text-[13px] text-[#6b6a64]">
                Pre-qualify a buyer to unlock matching stock and commission.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="rounded-md border-[#1a1a18]/22 bg-transparent text-[#1a1a18]"
                onClick={() => setLocation('/distribution/partner/submit')}
              >
                Submit Referral
              </Button>
              <Button
                className="rounded-md bg-[#1a1a18] text-white hover:bg-[#2c2c28]"
                onClick={() =>
                  document.getElementById('prequal-engine')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Pre-Qualify Buyer
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-[#1a1a18]/12 md:grid-cols-3 xl:grid-cols-7">
            <KpiCell label="Network Access" value={String(statusQuery.data?.accessCount || 0)} note="Live developments" />
            <KpiCell label="Active Deals" value={String(activeDealsCount)} note="In progress" />
            <KpiCell label="Docs Pending" value={String(pendingDocReferrals.length)} note="Action needed" valueClassName="text-[#9a6500]" />
            <KpiCell label="At Risk" value={String(atRiskReferrals.length)} note="Past SLA" valueClassName="text-[#DC2626]" />
            <KpiCell label="Pending Income" value={formatCurrency(pendingIncome, true)} note="Awaiting approval" />
            <KpiCell label="Paid Income" value={formatCurrency(paidIncome, true)} note="This quarter" valueClassName="text-[#1a7a40]" />
            <KpiCell label="Potential Income" value={formatCurrency(potentialIncome, true)} note="From active deals" />
          </div>
        </section>

        <section id="prequal-engine" className="mt-4 overflow-hidden rounded-xl border border-[#1a1a18]/12 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#1a1a18]/12 px-6 py-5">
            <div>
              <h2 className="text-[14px] font-semibold text-[#1a1a18]">Create a Deal</h2>
              <p className="mt-0.5 text-[12px] text-[#6b6a64]">
                Find what your buyer can afford and match them to live stock instantly.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f7ee] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#1a7a40]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1a7a40]" />
              Core Feature
            </span>
          </div>

          <div className="grid md:grid-cols-2">
            <div className="border-r border-[#1a1a18]/12 p-6">
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[11px] font-medium text-[#6b6a64]">
                  Gross income monthly (required)
                </span>
                <Input
                  placeholder="Gross income monthly (required)"
                  value={prequalValues.grossIncomeMonthly}
                  onChange={event =>
                    setPrequalValues(current => ({ ...current, grossIncomeMonthly: event.target.value }))
                  }
                  inputMode="numeric"
                  className="border-[#1a1a18]/22 bg-white"
                />
              </label>

              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-[11px] font-medium text-[#6b6a64]">
                    Monthly expenses
                  </span>
                  <Input
                    placeholder="e.g. 18 000"
                    value={prequalValues.deductionsMonthly}
                    onChange={event =>
                      setPrequalValues(current => ({ ...current, deductionsMonthly: event.target.value }))
                    }
                    inputMode="numeric"
                    className="border-[#1a1a18]/22 bg-white"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-[11px] font-medium text-[#6b6a64]">
                    Deposit available
                  </span>
                  <Input
                    placeholder="Optional"
                    value={prequalValues.depositAmount}
                    onChange={event =>
                      setPrequalValues(current => ({ ...current, depositAmount: event.target.value }))
                    }
                    inputMode="numeric"
                    className="border-[#1a1a18]/22 bg-white"
                  />
                </label>
              </div>

              <label className="mb-4 block">
                <span className="mb-1.5 block text-[11px] font-medium text-[#6b6a64]">
                  Preferred area
                </span>
                <Input
                  placeholder="e.g. Midrand, Centurion, Fourways"
                  value={prequalValues.area}
                  onChange={event => setPrequalValues(current => ({ ...current, area: event.target.value }))}
                  className="border-[#1a1a18]/22 bg-white"
                />
              </label>

              <Button
                className="w-full rounded-md bg-[#1a1a18] text-white hover:bg-[#2c2c28]"
                disabled={createAssessmentMutation.isPending}
                onClick={() => {
                  const grossIncomeMonthly = parseMoneyInt(prequalValues.grossIncomeMonthly, 0);
                  if (grossIncomeMonthly <= 0) return;

                  setAssessmentId(null);
                  createAssessmentMutation.mutate({
                    grossIncomeMonthly,
                    deductionsMonthly: parseMoneyInt(prequalValues.deductionsMonthly, 0),
                    depositAmount: parseMoneyInt(prequalValues.depositAmount, 0),
                    locationFilter: prequalValues.area.trim()
                      ? { city: prequalValues.area.trim() }
                      : undefined,
                  });
                }}
              >
                {createAssessmentMutation.isPending ? 'Calculating...' : 'Run Pre-Qualification'}
              </Button>
            </div>

            <div className="bg-[#f5f4f0] p-6">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b6a64]">
                Matching Developments
              </p>

              {!assessment ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center text-[12px] text-[#9e9d96]">
                  Enter buyer details and run pre-qualification to see matching stock and estimated
                  commission.
                </div>
              ) : (
                <div>
                  <div className="mb-3 rounded-md border border-[#1a1a18]/12 bg-white p-3">
                    <p className="text-[11px] text-[#6b6a64]">
                      Buyer can afford up to{' '}
                      <span className="font-mono font-semibold text-[#1a1a18]">
                        {formatCurrency(assessment.outputs.purchasePrice)}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-[#6b6a64]">
                      Max repayment: {formatCurrency(assessment.outputs.maxMonthlyRepayment)} -{' '}
                      {assessment.outputs.confidenceLabel}
                    </p>
                    <Button
                      size="sm"
                      className="mt-2 rounded-md bg-[#1a1a18] text-white hover:bg-[#2c2c28]"
                      disabled={matchesQuery.isFetching}
                      onClick={() => {
                        if (!assessmentId) return;
                        void matchesQuery.refetch();
                      }}
                    >
                      {matchesQuery.isFetching ? 'Finding matches...' : 'Get Matched Developments'}
                    </Button>
                  </div>

                  {matches.slice(0, 3).map(match => {
                    const confidence = getMatchConfidence(match.bestFitRatio);
                    const unitPriceFrom = Number(match.unitOptions?.[0]?.priceFrom || 0);
                    const displayPrice = unitPriceFrom > 0 ? unitPriceFrom : Number(match.purchasePrice || 0);
                    const linkedStock = stockByDevelopmentId.get(Number(match.developmentId));
                    const commissionAmount = computeCommissionAmount({
                      commissionModel: linkedStock?.commissionModel,
                      defaultCommissionPercent: linkedStock?.defaultCommissionPercent,
                      defaultCommissionAmount: linkedStock?.defaultCommissionAmount,
                      purchasePrice: displayPrice,
                    });
                    return (
                      <div key={match.developmentId} className="mb-2 rounded-md border border-[#1a1a18]/12 bg-white p-3">
                        <p className="text-[13px] font-semibold text-[#1a1a18]">{match.developmentName}</p>
                        <p className="text-[11px] text-[#6b6a64]">{match.area || 'N/A'}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="font-mono text-[13px] font-semibold text-[#1a1a18]">
                            {formatCurrency(displayPrice)}
                          </p>
                          <span
                            className={
                              confidence === 'Strong'
                                ? 'rounded-full bg-[#e8f7ee] px-2 py-0.5 text-[10px] font-semibold text-[#1a7a40]'
                                : confidence === 'Medium'
                                  ? 'rounded-full bg-[#fef5e4] px-2 py-0.5 text-[10px] font-semibold text-[#9a6500]'
                                  : 'rounded-full bg-[#f0ede8] px-2 py-0.5 text-[10px] font-semibold text-[#6b6a64]'
                            }
                          >
                            {confidence} match
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#1a7a40]">
                          Est. commission: {formatCurrency(commissionAmount)}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            className="rounded-md bg-[#1a1a18] text-white hover:bg-[#2c2c28]"
                            onClick={() =>
                              setLocation(
                                `/distribution/partner/submit?developmentId=${match.developmentId}&assessmentId=${assessmentId}`,
                              )
                            }
                          >
                            Submit Deal
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-md border-[#1a1a18]/22 text-[#1a1a18]"
                            onClick={() => {
                              const message = buildWhatsAppShareMessage(matches, assessment.outputs.purchasePrice);
                              const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                              window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            Share via WhatsApp
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {matches.length > 0 ? (
                    <div className="mt-2 border-t border-[#1a1a18]/12 pt-2 text-[11px] text-[#6b6a64]">
                      Max affordability: {formatCurrency(assessment.outputs.purchasePrice)}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="border-[#1a1a18]/12 bg-white p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#1a1a18]">Conversion Funnel</h3>
              <button
                type="button"
                className="text-[12px] text-[#1a5bbf] hover:underline"
                onClick={() => setLocation('/distribution/partner/referrals')}
              >
                Drill into pipeline -
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-md border border-[#1a1a18]/12 bg-[#faf9f6] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-[#6b6a64]">Stock Available</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-[#1a1a18]">{stockRows.length}</p>
              </div>
              <div className="rounded-md border border-[#1a1a18]/12 bg-[#faf9f6] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-[#6b6a64]">Submitted Deals</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-[#1a1a18]">{referralItems.length}</p>
              </div>
              <div className="rounded-md border border-[#1a1a18]/12 bg-[#faf9f6] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-[#6b6a64]">App+ Conversion</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-[#1a5bbf]">
                  {formatPercent(submitToApplicationRate)}
                </p>
              </div>
              <div className="rounded-md border border-[#1a1a18]/12 bg-[#faf9f6] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-[#6b6a64]">Paid Conversion</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-[#1a7a40]">
                  {formatPercent(submitToPaidRate)}
                </p>
              </div>
              <div className="rounded-md border border-[#1a1a18]/12 bg-[#faf9f6] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-[#6b6a64]">Submissions (7d)</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-[#1a1a18]">{submissionsLast7Days}</p>
              </div>
            </div>
          </Card>

          <Card className="border-[#1a1a18]/12 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#1a1a18]">Your Deals in Motion</h3>
              <button
                type="button"
                className="text-[12px] text-[#1a5bbf] hover:underline"
                onClick={() => setLocation('/distribution/partner/referrals')}
              >
                Open full pipeline -
              </button>
            </div>

            <div className="overflow-hidden rounded-md border border-[#1a1a18]/12">
              <div className="flex">
                {stageOrder.map((stage: string, index: number) => {
                  const hasItems = Number(stageCounts[stage] || 0) > 0;
                  const isActive = activePipelineStage === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setLocation('/distribution/partner/referrals')}
                      className={`flex-1 border-r border-[#1a1a18]/12 px-3 py-3 text-left last:border-r-0 ${
                        isActive ? 'bg-[#e8f0fb]' : 'bg-white hover:bg-[#f5f4f0]'
                      }`}
                    >
                      <p className={`mb-1 text-[9px] font-semibold uppercase tracking-[0.05em] ${isActive ? 'text-[#1a5bbf]' : 'text-[#6b6a64]'}`}>
                        {index < stageOrder.length - 1 ? formatStageLabel(stage) : 'Paid'}
                      </p>
                      <p className={`font-mono text-[22px] leading-none ${isActive ? 'text-[#1a5bbf]' : 'text-[#1a1a18]'}`}>
                        {Number(stageCounts[stage] || 0)}
                      </p>
                      <span
                        className={`mt-2 block h-1.5 w-1.5 rounded-full ${
                          isActive ? 'bg-[#1a5bbf]' : hasItems ? 'bg-[#1a1a18]' : 'bg-[#9e9d96]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {staleDeal ? (
              <div className="mt-3 rounded-md bg-[#e8f0fb] px-3 py-2">
                <p className="text-[11px] font-semibold text-[#1a5bbf]">
                  Deal stalled: {staleDeal.buyerName || 'Buyer'} needs action
                </p>
                <p className="mt-0.5 text-[11px] text-[#6b6a64]">
                  {staleDeal.developmentName} - current stage {formatStageLabel(staleDeal.currentStage)}
                </p>
              </div>
            ) : null}
          </Card>

          <Card className="border-[#1a1a18]/12 bg-white p-5">
            <h3 className="text-[13px] font-semibold text-[#1a1a18]">Your Earnings Engine</h3>
            <p className="mt-1 font-mono text-[30px] font-semibold tracking-[-0.04em] text-[#1a1a18]">
              {formatCurrency(totalIncomePipeline)}
            </p>
            <p className="text-[11px] text-[#6b6a64]">Total in pipeline - {new Date().getFullYear()}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <EarningCell label="Pending" value={formatCurrency(pendingIncome, true)} valueClassName="text-[#9a6500]" />
              <EarningCell label="Approved" value={formatCurrency(approvedIncome, true)} valueClassName="text-[#1a5bbf]" />
              <EarningCell label="Paid" value={formatCurrency(paidIncome, true)} valueClassName="text-[#1a7a40]" />
            </div>

            <div className="mt-4 rounded-md border border-[#1a1a18]/12 bg-[#f5f4f0] p-3">
              <p className="text-[11px] font-semibold text-[#1a1a18]">Next payout unlock</p>
              <p className="mt-0.5 text-[11px] text-[#6b6a64]">
                Close {unlockDealsRemaining} more deal{unlockDealsRemaining === 1 ? '' : 's'} to unlock approximately{' '}
                <strong className="text-[#1a7a40]">{formatCurrency(nextUnlockAmount)}</strong>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-[#1a1a18]/15">
                <div
                  className="h-full rounded bg-[#1a7a40]"
                  style={{ width: `${Math.round(unlockProgress * 100)}%` }}
                />
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="border-[#1a1a18]/12 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#1a1a18]">Deals You Can Close Today</h3>
              <button
                type="button"
                className="text-[12px] text-[#1a5bbf] hover:underline"
                onClick={() => setLocation('/distribution/partner/developments')}
              >
                View all stock -
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {visibleStock.map(row => (
                <div
                  key={row.developmentId}
                  className="overflow-hidden rounded-md border border-[#1a1a18]/12 bg-white"
                >
                  <div className="relative flex h-20 items-center justify-center bg-[#f5f4f0]">
                    <span
                      className={`absolute left-2 top-2 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-white ${
                        row.badge === 'Hot'
                          ? 'bg-[#DC2626]'
                          : row.badge === 'Fast payout'
                            ? 'bg-[#059669]'
                            : 'bg-[#D97706]'
                      }`}
                    >
                      {row.badge}
                    </span>
                    {row.imageUrl ? (
                      <img
                        src={row.imageUrl}
                        alt={row.developmentName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <svg width="48" height="36" viewBox="0 0 48 36" fill="none" className="text-[#1a1a18]/30">
                        <rect x="6" y="12" width="36" height="22" rx="2" fill="currentColor" />
                        <polygon points="24,2 42,14 6,14" fill="currentColor" />
                        <rect x="19" y="22" width="10" height="12" fill="white" />
                      </svg>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] font-semibold text-[#1a1a18]">{row.developmentName}</p>
                    <p className="mt-0.5 text-[10px] text-[#6b6a64]">{row.location}</p>
                    <p className="mt-2 font-mono text-[13px] font-semibold text-[#1a1a18]">
                      {formatCurrencyRange(row.priceFrom, row.priceTo)}
                    </p>
                    <p className="text-[10px] font-medium text-[#1a7a40]">
                      Commission: {row.commissionDisplay}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLocation('/distribution/partner/developments')}
                        className="flex-1 rounded border border-[#1a1a18]/12 bg-[#f5f4f0] px-2 py-1 text-[10px] font-semibold text-[#1a1a18]"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLocation(`/distribution/partner/submit?developmentId=${row.developmentId}`)
                        }
                        className="flex-1 rounded bg-[#1a1a18] px-2 py-1 text-[10px] font-semibold text-white"
                      >
                        Match Buyer
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {hiddenStockCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setLocation('/distribution/partner/developments')}
                  className="rounded-md border border-dashed border-[#1a1a18]/22 p-4 text-center text-[11px] text-[#6b6a64] hover:bg-[#f5f4f0]"
                >
                  <span className="mb-1 block text-[24px] font-light text-[#9e9d96]">+{hiddenStockCount}</span>
                  more developments in your network
                </button>
              ) : null}
            </div>
          </Card>

          <Card className="border-[#1a1a18]/12 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#1a1a18]">Your Next Moves</h3>
              <button
                type="button"
                className="text-[12px] text-[#1a5bbf] hover:underline"
                onClick={() => setLocation('/distribution/partner/referrals')}
              >
                View all -
              </button>
            </div>

            {attentionItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex w-full items-start gap-3 border-b border-[#1a1a18]/12 py-2.5 text-left last:border-b-0"
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    item.urgency === 'urgent'
                      ? 'bg-[#DC2626]'
                      : item.urgency === 'action'
                        ? 'bg-[#D97706]'
                        : 'bg-[#3B8BD4]'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-[#1a1a18]">{item.title}</span>
                  <span className="mt-0.5 block text-[11px] text-[#6b6a64]">{item.detail}</span>
                </span>
                <span className="pt-0.5 text-[10px] text-[#9e9d96]">{item.timeLabel}</span>
              </button>
            ))}
          </Card>
        </section>
      </main>
    </ReferralAppShell>
  );
}

function KpiCell({
  label,
  value,
  note,
  valueClassName,
}: {
  label: string;
  value: string;
  note: string;
  valueClassName?: string;
}) {
  return (
    <div className="border-r border-[#1a1a18]/12 px-4 py-4 last:border-r-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#6b6a64]">{label}</p>
      <p className={`mt-1 font-mono text-[21px] font-semibold leading-none text-[#1a1a18] ${valueClassName || ''}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] text-[#9e9d96]">{note}</p>
    </div>
  );
}

function EarningCell({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md bg-[#f5f4f0] px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-[#6b6a64]">{label}</p>
      <p className={`mt-1 font-mono text-[17px] font-semibold text-[#1a1a18] ${valueClassName || ''}`}>
        {value}
      </p>
    </div>
  );
}
