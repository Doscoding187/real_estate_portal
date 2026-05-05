import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowRight,
  CheckCircle2,
  Home,
  Search,
  Target,
  UsersRound,
  WalletCards,
  Loader2,
} from 'lucide-react';

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
  payoutDisplay: string;
  buyerProfile: string;
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

function pickRepresentativePrice(priceFrom: number | null | undefined, priceTo: number | null | undefined) {
  const from = Number(priceFrom || 0);
  const to = Number(priceTo || 0);
  if (Number.isFinite(from) && from > 0) return from;
  if (Number.isFinite(to) && to > 0) return to;
  return 0;
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
    return `${Number(input.defaultCommissionPercent)}% referral reward`;
  }
  return 'Reward configured';
}

function getPayoutDisplay(item: any) {
  const computed = String(item?.computed?.payoutDisplay || '').trim();
  if (computed) return computed;
  const notes = String(item?.program?.payoutMilestoneNotes || item?.payoutMilestoneNotes || '').trim();
  if (notes) return notes;
  const milestone = String(item?.program?.payoutMilestone || item?.payoutMilestone || '').replace(/_/g, ' ');
  if (milestone) return `Paid after ${milestone}`;
  return 'Paid after qualifying sale milestone';
}

function getBuyerProfile(priceFrom: number | null | undefined, priceTo: number | null | undefined, location: string) {
  const representativePrice = pickRepresentativePrice(priceFrom, priceTo);
  if (representativePrice >= 1800000) return `Upscale buyer in ${location}`;
  if (representativePrice >= 1200000) return `Family or investor buyer in ${location}`;
  if (representativePrice > 0) return `First-time or value buyer in ${location}`;
  return `Buyer looking in ${location}`;
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
        const location = [row.city, row.province].filter(Boolean).join(' - ') || 'Location unavailable';
        const commissionModel = row.commissionModel ? String(row.commissionModel) : null;
        const defaultCommissionPercent =
          row.defaultCommissionPercent == null ? null : Number(row.defaultCommissionPercent);
        const defaultCommissionAmount =
          row.defaultCommissionAmount == null ? null : Number(row.defaultCommissionAmount);
        const commissionAmount = computeCommissionAmount({
          commissionModel,
          defaultCommissionPercent,
          defaultCommissionAmount,
          purchasePrice: pickRepresentativePrice(priceFrom, priceTo),
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
          location,
          priceFrom,
          priceTo,
          commissionAmount,
          commissionDisplay,
          commissionModel,
          defaultCommissionPercent,
          defaultCommissionAmount,
          payoutDisplay: getPayoutDisplay(row),
          buyerProfile: getBuyerProfile(priceFrom, priceTo, location),
          imageUrl: row.imageUrl ? String(row.imageUrl) : null,
          badge,
        });
      }
    }

    for (const item of eligibleDevelopmentsQuery.data?.items || []) {
      if (item.opportunity?.status && item.opportunity.status !== 'ready') continue;
      const developmentId = Number(item.developmentId || 0);
      if (!developmentId || grouped.has(developmentId)) continue;
      const commissionModel = item.program?.commissionModel ? String(item.program.commissionModel) : null;
      const defaultCommissionPercent =
        item.program?.defaultCommissionPercent == null
          ? null
          : Number(item.program.defaultCommissionPercent);
      const defaultCommissionAmount =
        item.program?.defaultCommissionAmount == null ? null : Number(item.program.defaultCommissionAmount);
      const priceFrom = item.priceFrom ? Number(item.priceFrom) : null;
      const priceTo = item.priceTo ? Number(item.priceTo) : priceFrom;
      const location = [item.city, item.province].filter(Boolean).join(' - ') || 'Location unavailable';
      const commissionAmount = computeCommissionAmount({
        commissionModel,
        defaultCommissionPercent,
        defaultCommissionAmount,
        purchasePrice: pickRepresentativePrice(priceFrom, priceTo),
      });
      const commissionDisplay = getCommissionDisplay({
        amount: commissionAmount,
        commissionModel,
        defaultCommissionPercent,
      });
      grouped.set(developmentId, {
        developmentId,
        developmentName: item.developmentName || 'Development',
        location,
        priceFrom,
        priceTo,
        commissionAmount,
        commissionDisplay,
        commissionModel,
        defaultCommissionPercent,
        defaultCommissionAmount,
        payoutDisplay: getPayoutDisplay(item),
        buyerProfile: getBuyerProfile(priceFrom, priceTo, location),
        imageUrl: item.imageUrl ? String(item.imageUrl) : null,
        badge: commissionAmount >= 18000 ? 'Fast payout' : 'High demand',
      });
    }

    for (const item of programTermsQuery.data?.items || []) {
      if (item.opportunity?.status !== 'ready') continue;
      const developmentId = Number(item.developmentId || 0);
      if (!developmentId || grouped.has(developmentId)) continue;
      const commissionModel = item.program?.commissionModel ? String(item.program.commissionModel) : null;
      const defaultCommissionPercent =
        item.program?.defaultCommissionPercent == null
          ? null
          : Number(item.program.defaultCommissionPercent);
      const defaultCommissionAmount =
        item.program?.defaultCommissionAmount == null ? null : Number(item.program.defaultCommissionAmount);
      const priceFrom = item.priceFrom ? Number(item.priceFrom) : null;
      const priceTo = item.priceTo ? Number(item.priceTo) : priceFrom;
      const location = [item.city, item.province].filter(Boolean).join(' - ') || 'Location unavailable';
      const commissionAmount = computeCommissionAmount({
        commissionModel,
        defaultCommissionPercent,
        defaultCommissionAmount,
        purchasePrice: pickRepresentativePrice(priceFrom, priceTo),
      });
      const commissionDisplay = getCommissionDisplay({
        amount: commissionAmount,
        commissionModel,
        defaultCommissionPercent,
      });

      grouped.set(developmentId, {
        developmentId,
        developmentName: item.developmentName || 'Development',
        location,
        priceFrom,
        priceTo,
        commissionAmount,
        commissionDisplay,
        commissionModel,
        defaultCommissionPercent,
        defaultCommissionAmount,
        payoutDisplay: getPayoutDisplay(item),
        buyerProfile: getBuyerProfile(priceFrom, priceTo, location),
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

  const visibleStock = stockRows.slice(0, 5);
  const hiddenStockCount = Math.max(0, stockRows.length - visibleStock.length);
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
        detail: `${formatCurrencyRange(topStock.priceFrom, topStock.priceTo)} - Reward ${topStock.commissionDisplay}`,
        timeLabel: 'Today',
        onClick: () => setLocation('/distribution/partner/developments'),
      });
    }

    if (!items.length) {
      items.push({
        id: 'empty',
        urgency: 'info',
        title: 'Match your first buyer',
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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1420px] px-4 pb-10 pt-5 md:px-7">
        <section className="overflow-hidden rounded-lg border border-[#1d4ed8]/20 bg-gradient-to-br from-[#1d4ed8] via-[#2457f5] to-[#1e40af] text-white shadow-[0_18px_50px_rgba(37,83,235,0.22)]">
          <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.25fr_0.75fr] md:px-8">
            <div className="flex min-h-[170px] flex-col justify-between">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase text-blue-100">
                {new Date().toLocaleDateString('en-ZA', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                - Good morning
              </p>
              <h1 className="text-[30px] font-semibold leading-tight text-white md:text-[36px]">
                My Buyer Referral Hub
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#dbeafe]">
                Add a buyer, see where they fit, and track every next step to payout.
              </p>
            </div>
              <div className="mt-6 flex flex-wrap gap-2">
              <Button
                variant="conversion"
                  className="rounded-md bg-[#ff9500] text-white shadow-[0_8px_18px_rgba(255,149,0,0.24)] hover:bg-[#f08a00]"
                onClick={() => setLocation('/distribution/partner/submit')}
              >
                  <UsersRound className="mr-2 h-4 w-4" />
                Submit Buyer
              </Button>
              <Button
                  variant="outline"
                  className="rounded-md border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() =>
                  document.getElementById('prequal-engine')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                  <Search className="mr-2 h-4 w-4" />
                Match Buyer
              </Button>
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-white/12 p-4 shadow-sm backdrop-blur">
              <p className="text-[11px] font-semibold uppercase text-blue-100">Today at a glance</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <HeroMetric icon={<Home className="h-4 w-4" />} label="Can refer today" value={String(stockRows.length)} />
                <HeroMetric icon={<UsersRound className="h-4 w-4" />} label="My buyers" value={String(activeDealsCount)} />
                <HeroMetric icon={<WalletCards className="h-4 w-4" />} label="Potential reward" value={formatCurrency(potentialIncome, true)} />
                <HeroMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Docs needed" value={String(pendingDocReferrals.length)} tone="amber" />
              </div>
              <div className="mt-4 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-[12px] text-[#eff6ff]">
                {attentionItems[0]?.title || 'You are ready to submit your next buyer.'}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <KpiCell label="Available Opportunities" value={String(stockRows.length)} note="Can accept buyers" tone="blue" />
          <KpiCell label="My Buyers" value={String(activeDealsCount)} note="In progress" tone="teal" />
          <KpiCell label="Documents Needed" value={String(pendingDocReferrals.length)} note="Action needed" tone="orange" />
          <KpiCell label="Needs Attention" value={String(atRiskReferrals.length)} note="Past next step" tone="red" />
          <KpiCell label="Pending Reward" value={formatCurrency(pendingIncome, true)} note="Awaiting approval" tone="amber" />
          <KpiCell label="Paid Reward" value={formatCurrency(paidIncome, true)} note="This quarter" tone="green" />
          <KpiCell label="Potential Reward" value={formatCurrency(potentialIncome, true)} note="From active buyers" tone="purple" />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card className="border-[#dbe5f3] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-md bg-[#e8f1ff] p-2 text-[#2563eb]">
                <Target className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Find Opportunity</h2>
                <p className="text-[12px] text-muted-foreground">What can I refer today?</p>
              </div>
            </div>
            {visibleStock[0] ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">{visibleStock[0].developmentName}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{visibleStock[0].buyerProfile}</p>
                </div>
                <div className="rounded-md border border-[#eef2f7] bg-[#f8fafc] p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Estimated reward</p>
                  <p className="mt-1 text-[16px] font-semibold text-[#f28c00]">{visibleStock[0].commissionDisplay}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{visibleStock[0].payoutDisplay}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation('/distribution/partner/developments')}
                >
                  Open Sales Inventory
                </Button>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">No ready opportunities are available yet.</p>
            )}
          </Card>

          <Card className="border-[#dbe5f3] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-md bg-[#dcfce7] p-2 text-[#059669]">
                <Search className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Match Buyer</h2>
                <p className="text-[12px] text-muted-foreground">Who fits which development?</p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Run buying power once, then submit directly into the best-fit opportunity with the
              assessment attached.
            </p>
            <div className="mt-4 rounded-md border border-[#eef2f7] bg-[#f8fafc] p-3">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Current matcher</p>
              <p className="mt-1 text-[13px] font-semibold text-foreground">
                {matches.length ? `${matches.length} matched development${matches.length === 1 ? '' : 's'}` : 'Ready for next buyer'}
              </p>
            </div>
            <Button
              variant="conversion"
              className="mt-4 w-full rounded-md bg-[#ff9500] text-white hover:bg-[#f08a00]"
              onClick={() => document.getElementById('prequal-engine')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Pre-Qualify Buyer
            </Button>
          </Card>

          <Card className="border-[#dbe5f3] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-md bg-[#dcfce7] p-2 text-[#16a34a]">
                <WalletCards className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Track Earnings</h2>
                <p className="text-[12px] text-muted-foreground">What money is moving?</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <EarningCell label="Pending" value={formatCurrency(pendingIncome, true)} valueClassName="text-[#9a6500]" />
              <EarningCell label="Approved" value={formatCurrency(approvedIncome, true)} valueClassName="text-primary" />
              <EarningCell label="Paid" value={formatCurrency(paidIncome, true)} valueClassName="text-[#1a7a40]" />
            </div>
            <div className="mt-4 rounded-md border border-[#bfdbfe] bg-[#eaf4ff] p-3">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Needs action</p>
              <p className="mt-1 text-[13px] font-semibold text-foreground">
                {pendingDocReferrals[0]?.buyer?.name || staleDeal?.buyerName || 'No blocked buyer'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pendingDocReferrals[0]
                  ? `${pendingDocReferrals[0].docProgress?.verifiedRequiredCount || 0}/${pendingDocReferrals[0].docProgress?.requiredCount || 0} docs verified`
                  : staleDeal
                    ? `Current stage: ${formatStageLabel(staleDeal.currentStage)}`
                    : 'Your buyer pipeline is clean right now.'}
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setLocation('/distribution/partner/referrals')}
            >
              Open Buyer Tracker
            </Button>
          </Card>
        </section>

        <section id="prequal-engine" className="mt-5 overflow-hidden rounded-lg border border-[#dbe5f3] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-[#eef2f7] bg-white px-6 py-5">
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">Help Me Match My Buyer</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Find what your buyer can afford and match them to ready opportunities.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-[10px] font-semibold uppercase text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Core Feature
            </span>
          </div>

          <div className="grid md:grid-cols-2">
            <div className="border-r border-[#eef2f7] p-6">
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                  Gross income monthly (required)
                </span>
                <Input
                  placeholder="Gross income monthly (required)"
                  value={prequalValues.grossIncomeMonthly}
                  onChange={event =>
                    setPrequalValues(current => ({ ...current, grossIncomeMonthly: event.target.value }))
                  }
                  inputMode="numeric"
                  className="border-[#e5edf7] bg-[#f8fafc]"
                />
              </label>

              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Monthly expenses
                  </span>
                  <Input
                    placeholder="e.g. 18 000"
                    value={prequalValues.deductionsMonthly}
                    onChange={event =>
                      setPrequalValues(current => ({ ...current, deductionsMonthly: event.target.value }))
                    }
                    inputMode="numeric"
                    className="border-[#e5edf7] bg-[#f8fafc]"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Deposit available
                  </span>
                  <Input
                    placeholder="Optional"
                    value={prequalValues.depositAmount}
                    onChange={event =>
                      setPrequalValues(current => ({ ...current, depositAmount: event.target.value }))
                    }
                    inputMode="numeric"
                    className="border-[#e5edf7] bg-[#f8fafc]"
                  />
                </label>
              </div>

              <label className="mb-4 block">
                <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                  Preferred area
                </span>
                <Input
                  placeholder="e.g. Midrand, Centurion, Fourways"
                  value={prequalValues.area}
                  onChange={event => setPrequalValues(current => ({ ...current, area: event.target.value }))}
                  className="border-[#e5edf7] bg-[#f8fafc]"
                />
              </label>

              <Button
                variant="conversion"
                className="w-full rounded-md bg-[#ff9500] text-white hover:bg-[#f08a00]"
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

            <div className="bg-[#f8fbff] p-6">
              <p className="mb-3 text-[10px] font-semibold uppercase text-muted-foreground">
                Buyer Fit Matches
              </p>

              {!assessment ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center text-[12px] text-muted-foreground">
                  Enter buyer details and run pre-qualification to see matching stock, fit reasons,
                  and estimated reward.
                </div>
              ) : (
                <div>
                  <div className="mb-3 rounded-md border border-[#e5edf7] bg-white p-3">
                    <p className="text-[11px] text-muted-foreground">
                      Buyer can afford up to{' '}
                      <span className="font-mono font-semibold text-foreground">
                        {formatCurrency(assessment.outputs.purchasePrice)}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Max repayment: {formatCurrency(assessment.outputs.maxMonthlyRepayment)} -{' '}
                      {assessment.outputs.confidenceLabel}
                    </p>
                    <Button
                      size="sm"
                      variant="conversion"
                      className="mt-2 rounded-md bg-[#ff9500] text-white hover:bg-[#f08a00]"
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
                      <div key={match.developmentId} className="mb-2 rounded-md border border-[#e5edf7] bg-white p-3">
                        <p className="text-[13px] font-semibold text-foreground">{match.developmentName}</p>
                        <p className="text-[11px] text-muted-foreground">{match.area || 'N/A'}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="font-mono text-[13px] font-semibold text-foreground">
                            {formatCurrency(displayPrice)}
                          </p>
                          <span
                            className={
                              confidence === 'Strong'
                                ? 'rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success'
                                : confidence === 'Medium'
                                  ? 'rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning'
                                  : 'rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted-foreground'
                            }
                          >
                            {confidence} match
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] font-semibold text-[#f28c00]">
                          Est. reward: {getCommissionDisplay({
                            amount: commissionAmount,
                            commissionModel: linkedStock?.commissionModel,
                            defaultCommissionPercent: linkedStock?.defaultCommissionPercent,
                          })}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Fit reason: {confidence.toLowerCase()} affordability fit
                          {linkedStock?.buyerProfile ? ` for ${linkedStock.buyerProfile.toLowerCase()}` : ''}.
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="conversion"
                            className="rounded-md bg-[#ff9500] text-white hover:bg-[#f08a00]"
                            onClick={() =>
                              setLocation(
                                `/distribution/partner/submit?developmentId=${match.developmentId}&assessmentId=${assessmentId}`,
                              )
                            }
                          >
                            Submit Buyer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-md border-border text-foreground"
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
                    <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                      Max affordability: {formatCurrency(assessment.outputs.purchasePrice)}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5">
          <Card className="border-[#dbe5f3] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-foreground">Buyer Progress Funnel</h3>
              <button
                type="button"
                className="text-[12px] text-primary hover:underline"
                onClick={() => setLocation('/distribution/partner/referrals')}
              >
                Drill into pipeline -
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-md border border-[#bfdbfe] bg-[#eaf4ff] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Can Refer Today</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-foreground">{stockRows.length}</p>
              </div>
              <div className="rounded-md border border-[#bfdbfe] bg-[#eaf4ff] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Submitted Buyers</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-foreground">{referralItems.length}</p>
              </div>
              <div className="rounded-md border border-[#bfdbfe] bg-[#eaf4ff] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">App+ Conversion</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-primary">
                  {formatPercent(submitToApplicationRate)}
                </p>
              </div>
              <div className="rounded-md border border-[#bfdbfe] bg-[#eaf4ff] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Paid Conversion</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-[#1a7a40]">
                  {formatPercent(submitToPaidRate)}
                </p>
              </div>
              <div className="rounded-md border border-[#bfdbfe] bg-[#eaf4ff] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Submissions (7d)</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-foreground">{submissionsLast7Days}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-5 rounded-lg border border-[#dbe5f3] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[17px] font-semibold text-foreground">What Can I Refer Today?</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">Ready opportunities your buyers can be submitted to now.</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-[#bfdbfe] bg-white px-3 py-2 text-[12px] font-semibold text-[#2563eb] hover:bg-[#eff6ff]"
              onClick={() => setLocation('/distribution/partner/developments')}
            >
              View all opportunities <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleStock.map(row => (
              <article
                key={row.developmentId}
                className="overflow-hidden rounded-lg border border-[#dbe5f3] bg-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-[#fff7cc] to-[#ffedd5]">
                  <span
                    className={`absolute left-3 top-3 rounded px-2 py-1 text-[9px] font-bold uppercase text-white ${
                      row.badge === 'Hot'
                        ? 'bg-[#ef4444]'
                        : row.badge === 'Fast payout'
                          ? 'bg-[#10b981]'
                          : 'bg-[#f59e0b]'
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
                    <Home className="h-12 w-12 text-[#f59e0b]/65" />
                  )}
                </div>
                <div className="p-4">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{row.developmentName}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{row.location}</p>
                    <div className="mt-4 grid gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Price range</p>
                        <p className="mt-1 font-mono text-[15px] font-semibold text-foreground">
                          {formatCurrencyRange(row.priceFrom, row.priceTo)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Referral reward</p>
                        <p className="mt-1 text-[13px] font-semibold text-[#f28c00]">{row.commissionDisplay}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Best buyer</p>
                        <p className="mt-1 text-[12px] text-foreground">{row.buyerProfile}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Payout trigger</p>
                        <p className="mt-1 text-[12px] text-foreground">{row.payoutDisplay}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLocation('/distribution/partner/developments')}
                      className="rounded-md border border-[#dbe5f3] bg-white px-3 py-2 text-[12px] font-semibold text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Sales Pack
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLocation(`/distribution/partner/submit?developmentId=${row.developmentId}`)
                      }
                      className="rounded-md bg-[#ff9500] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#f08a00]"
                    >
                      Submit Buyer
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <button
              type="button"
              onClick={() => setLocation('/distribution/partner/developments')}
              className="flex min-h-[272px] flex-col items-center justify-center rounded-lg border border-dashed border-[#bfdbfe] bg-gradient-to-b from-[#f8fbff] to-[#eef6ff] p-5 text-center text-[12px] text-[#2563eb] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2563eb] shadow-sm">
                <ArrowRight className="h-5 w-5" />
              </span>
              <span className="block text-[15px] font-semibold text-foreground">
                View all opportunities
              </span>
              <span className="mt-2 block text-[11px] text-[#475569]">
                {hiddenStockCount > 0
                  ? `${hiddenStockCount} more development${hiddenStockCount === 1 ? '' : 's'} waiting in the sales inventory.`
                  : 'Open the full sales inventory, brochures, and submit-ready opportunities.'}
              </span>
            </button>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card className="border-[#dbe5f3] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-foreground">My Buyers in Motion</h3>
              <button
                type="button"
                className="text-[12px] text-primary hover:underline"
                onClick={() => setLocation('/distribution/partner/referrals')}
              >
                Open full pipeline -
              </button>
            </div>

            <div className="overflow-hidden rounded-md border border-[#dbe5f3]">
              <div className="flex">
                {stageOrder.map((stage: string, index: number) => {
                  const hasItems = Number(stageCounts[stage] || 0) > 0;
                  const isActive = activePipelineStage === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setLocation('/distribution/partner/referrals')}
                      className={`flex-1 border-r border-[#dbe5f3] px-3 py-3 text-left last:border-r-0 ${
                        isActive ? 'bg-[#eaf4ff]' : 'bg-white hover:bg-[#f8fafc]'
                      }`}
                    >
                      <p className={`mb-1 text-[9px] font-semibold uppercase tracking-[0.05em] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {index < stageOrder.length - 1 ? formatStageLabel(stage) : 'Paid'}
                      </p>
                      <p className={`font-mono text-[22px] leading-none ${isActive ? 'text-primary' : 'text-foreground'}`}>
                        {Number(stageCounts[stage] || 0)}
                      </p>
                      <span
                        className={`mt-2 block h-1.5 w-1.5 rounded-full ${
                          isActive ? 'bg-primary' : hasItems ? 'bg-foreground' : 'bg-muted-foreground'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {staleDeal ? (
              <div className="mt-3 rounded-md border border-[#bfdbfe] bg-[#eaf4ff] px-3 py-2">
                <p className="text-[11px] font-semibold text-primary">
                  Buyer needs action: {staleDeal.buyerName || 'Buyer'}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {staleDeal.developmentName} - current stage {formatStageLabel(staleDeal.currentStage)}
                </p>
              </div>
            ) : null}
          </Card>

          <Card className="border-[#dbe5f3] bg-white p-5 shadow-sm">
            <h3 className="text-[13px] font-semibold text-foreground">Referral Reward Progress</h3>
            <div className="mt-3 rounded-md border border-[#bfdbfe] bg-[#dcebff] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#334155]">
                Total referral reward pipeline
              </p>
              <p className="mt-1 font-mono text-[30px] font-semibold text-foreground">
                {formatCurrency(totalIncomePipeline)}
              </p>
              <p className="text-[11px] text-muted-foreground">{new Date().getFullYear()} reward pipeline</p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <EarningCell label="Pending" value={formatCurrency(pendingIncome, true)} valueClassName="text-[#9a6500]" />
              <EarningCell label="Approved" value={formatCurrency(approvedIncome, true)} valueClassName="text-primary" />
              <EarningCell label="Paid" value={formatCurrency(paidIncome, true)} valueClassName="text-[#1a7a40]" />
            </div>

            <div className="mt-4 rounded-md border border-[#fde68a] bg-[#fff7cc] p-3">
              <p className="text-[11px] font-semibold text-foreground">Next payout unlock</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Move {unlockDealsRemaining} more buyer{unlockDealsRemaining === 1 ? '' : 's'} forward to unlock approximately{' '}
                <strong className="text-[#f28c00]">{formatCurrency(nextUnlockAmount)}</strong>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-[#fde68a]">
                <div
                  className="h-full rounded bg-[#f59e0b]"
                  style={{ width: `${Math.round(unlockProgress * 100)}%` }}
                />
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-5">
          <Card className="border-[#dbe5f3] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-foreground">Your Next Moves</h3>
              <button
                type="button"
                className="text-[12px] text-primary hover:underline"
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
                className="flex w-full items-start gap-3 border-b border-[#eef2f7] py-2.5 text-left last:border-b-0 hover:bg-[#f8fafc]"
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
                  <span className="block text-[12px] font-medium text-foreground">{item.title}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{item.detail}</span>
                </span>
                <span className="pt-0.5 text-[10px] text-muted-foreground">{item.timeLabel}</span>
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
  tone,
}: {
  label: string;
  value: string;
  note: string;
  valueClassName?: string;
  tone?: 'blue' | 'teal' | 'orange' | 'red' | 'amber' | 'green' | 'purple';
}) {
  const toneClass = {
    blue: 'border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]',
    teal: 'border-[#bbf7d0] bg-[#ecfdf5] text-[#059669]',
    orange: 'border-[#fed7aa] bg-[#fff7ed] text-[#f97316]',
    red: 'border-[#fecaca] bg-[#fef2f2] text-[#ef4444]',
    amber: 'border-[#fde68a] bg-[#fffbeb] text-[#d97706]',
    green: 'border-[#bbf7d0] bg-[#ecfdf5] text-[#16a34a]',
    purple: 'border-[#e9d5ff] bg-[#faf5ff] text-[#9333ea]',
  }[tone || 'blue'];

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase text-[#475569]">{label}</p>
      <p className={`mt-1 font-mono text-[20px] font-semibold leading-none ${valueClassName || ''}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] text-[#64748b]">{note}</p>
    </div>
  );
}

function HeroMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: 'amber';
}) {
  return (
    <div className="rounded-md border border-white/20 bg-white/12 p-3">
      <div className={tone === 'amber' ? 'mb-2 text-blue-100' : 'mb-2 text-blue-100'}>
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase text-blue-100">{label}</p>
      <p className="mt-1 font-mono text-[20px] font-semibold leading-none text-white">{value}</p>
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
    <div className="rounded-md border border-[#eef2f7] bg-[#f8fafc] px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-[17px] font-semibold text-foreground ${valueClassName || ''}`}>
        {value}
      </p>
    </div>
  );
}
