import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { ReferralIntakePausedCard } from '@/components/distribution/partner/ReferralIntakePausedCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

type AccessStockRow = {
  developmentId: number;
  developmentName: string;
  location: string;
  pricingByMode: {
    sale: { availableCount: number; priceFrom: number; priceTo: number } | null;
    rent: { availableCount: number; priceFrom: number; priceTo: number } | null;
  };
  referralModes: Array<'sale' | 'rent'>;
  commissionDisplay: string;
  payoutDisplay: string;
  imageUrl: string | null;
};

type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  urgency: 'urgent' | 'action' | 'info';
  timeLabel: string;
  onClick: () => void;
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

function formatMarketability(row: AccessStockRow) {
  const modes = [
    row.pricingByMode.sale
      ? `For sale: ${row.pricingByMode.sale.availableCount} available · ${formatCurrencyRange(row.pricingByMode.sale.priceFrom, row.pricingByMode.sale.priceTo)}${row.referralModes.includes('sale') ? '' : ' · referral terms unavailable'}`
      : null,
    row.pricingByMode.rent
      ? `For rent: ${row.pricingByMode.rent.availableCount} available · ${formatCurrencyRange(row.pricingByMode.rent.priceFrom, row.pricingByMode.rent.priceTo)}/month${row.referralModes.includes('rent') ? '' : ' · referral terms unavailable'}`
      : null,
  ].filter(Boolean);
  return modes.length ? modes.join(' · ') : 'No priced marketable stock';
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

function getCommissionDisplay(item: any) {
  const computed = String(item?.computed?.commissionDisplay || '').trim();
  if (computed) return computed;

  const program = item?.program || item;
  const model = String(program?.commissionModel || '');
  if (model === 'flat_amount' && Number(program?.defaultCommissionAmount || 0) > 0) {
    return `Configured referral payout: ${formatCurrency(Number(program.defaultCommissionAmount))}`;
  }
  if (model === 'flat_percentage' && Number(program?.defaultCommissionPercent || 0) > 0) {
    return `${Number(program.defaultCommissionPercent)}% referral payout; calculation basis is not configured`;
  }
  return 'Referral payout terms not configured';
}

function getPayoutDisplay(item: any) {
  const computed = String(item?.computed?.payoutDisplay || '').trim();
  if (computed) return computed;
  const notes = String(item?.program?.payoutMilestoneNotes || item?.payoutMilestoneNotes || '').trim();
  if (notes) return notes;
  const milestone = String(item?.program?.payoutMilestone || item?.payoutMilestone || '').replace(/_/g, ' ');
  if (milestone) return `Configured milestone: ${milestone}`;
  return 'Payout terms not configured';
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

  const commissionStatusCounts = useMemo(
    () =>
      (commissionsQuery.data || []).reduce(
        (counts: Record<'pending' | 'approved' | 'paid', number>, row: any) => {
          const status = String(row.entryStatus || '').toLowerCase();
          if (status === 'pending' || status === 'approved' || status === 'paid') {
            counts[status] += 1;
          }
          return counts;
        },
        { pending: 0, approved: 0, paid: 0 },
      ),
    [commissionsQuery.data],
  );

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
    const addItem = (item: any) => {
      const developmentId = Number(item?.developmentId || 0);
      if (!developmentId || grouped.has(developmentId)) return;
      const pricingByMode = item?.pricingByMode || {};
      const sale = pricingByMode.sale?.availableCount > 0 ? pricingByMode.sale : null;
      const rent = pricingByMode.rent?.availableCount > 0 ? pricingByMode.rent : null;
      if (!sale && !rent) return;
      const location = [item.city, item.province].filter(Boolean).join(' - ') || 'Location unavailable';

      grouped.set(developmentId, {
        developmentId,
        developmentName: item.developmentName || 'Development',
        location,
        pricingByMode: { sale, rent },
        referralModes: Array.isArray(item.referralModes) ? item.referralModes : [],
        commissionDisplay: getCommissionDisplay(item),
        payoutDisplay: getPayoutDisplay(item),
        imageUrl: item.imageUrl ? String(item.imageUrl) : null,
      });
    };

    for (const item of eligibleDevelopmentsQuery.data?.items || []) {
      if (item.opportunity?.status && item.opportunity.status !== 'ready') continue;
      addItem(item);
    }

    for (const item of programTermsQuery.data?.items || []) {
      if (item.opportunity?.status !== 'ready') continue;
      addItem(item);
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.developmentName.localeCompare(b.developmentName),
    );
  }, [eligibleDevelopmentsQuery.data?.items, programTermsQuery.data?.items]);

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
        detail: `${formatMarketability(topStock)} - ${topStock.commissionDisplay}`,
        timeLabel: 'Today',
        onClick: () => setLocation('/distribution/partner/developments'),
      });
    }

    if (!items.length) {
      items.push({
        id: 'empty',
        urgency: 'info',
        title: 'Referral intake paused',
        detail: 'View the status of the secure document-first workflow.',
        timeLabel: '-',
        onClick: () => setLocation('/distribution/partner/submit'),
      });
    }

    return items.slice(0, 5);
  }, [atRiskReferrals, pendingDocReferrals, viewingsQuery.data, visibleStock, setLocation]);

  const showLoadingState =
    loading ||
    statusQuery.isLoading ||
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
                Browse available programs and follow existing buyer referrals and payout records.
                New referral intake is paused while the secure document-first flow is prepared.
              </p>
            </div>
              <div className="mt-6 flex flex-wrap gap-2">
              <Button
                variant="conversion"
                  className="rounded-md bg-[#ff9500] text-white shadow-[0_8px_18px_rgba(255,149,0,0.24)] hover:bg-[#f08a00]"
                onClick={() => setLocation('/distribution/partner/submit')}
              >
                  <UsersRound className="mr-2 h-4 w-4" />
                Referral Intake Status
              </Button>
              <Button
                  variant="outline"
                  className="rounded-md border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() =>
                  document.getElementById('prequal-engine')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                  <Search className="mr-2 h-4 w-4" />
                Intake Steps
              </Button>
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-white/12 p-4 shadow-sm backdrop-blur">
              <p className="text-[11px] font-semibold uppercase text-blue-100">Today at a glance</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <HeroMetric icon={<Home className="h-4 w-4" />} label="Can refer today" value={String(stockRows.length)} />
                <HeroMetric icon={<UsersRound className="h-4 w-4" />} label="My buyers" value={String(activeDealsCount)} />
                <HeroMetric icon={<WalletCards className="h-4 w-4" />} label="Recent referral payouts recorded as paid" value={String(commissionStatusCounts.paid)} />
                <HeroMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Docs needed" value={String(pendingDocReferrals.length)} tone="amber" />
              </div>
              <div className="mt-4 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-[12px] text-[#eff6ff]">
                {attentionItems[0]?.title || 'You are ready to submit your next buyer.'}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCell label="Available Opportunities" value={String(stockRows.length)} note="Can accept buyers" tone="blue" />
          <KpiCell label="My Buyers" value={String(activeDealsCount)} note="In progress" tone="teal" />
          <KpiCell label="Documents Needed" value={String(pendingDocReferrals.length)} note="Action needed" tone="orange" />
          <KpiCell label="Needs Attention" value={String(atRiskReferrals.length)} note="Past next step" tone="red" />
          <KpiCell label="Recent Pending Payouts" value={String(commissionStatusCounts.pending)} note="See recorded program terms" tone="amber" />
          <KpiCell label="Recent Paid Payouts" value={String(commissionStatusCounts.paid)} note="Recorded as paid" tone="green" />
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
                  <p className="mt-1 text-[12px] text-muted-foreground">{visibleStock[0].location}</p>
                </div>
                <div className="rounded-md border border-[#eef2f7] bg-[#f8fafc] p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Program referral payout terms</p>
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
              <span className="rounded-md bg-[#fff7cc] p-2 text-[#a16207]">
                <Search className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Referral intake</h2>
                <p className="text-[12px] text-muted-foreground">Permission and ID evidence first</p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Prospect details and affordability cannot be saved until the signed documents and
              private evidence steps are ready.
            </p>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-[10px] font-semibold uppercase text-amber-800">Current status</p>
              <p className="mt-1 text-[13px] font-semibold text-amber-900">Intake is paused</p>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setLocation('/distribution/partner/submit')}
            >
              View referral intake status
            </Button>
          </Card>

          <Card className="border-[#dbe5f3] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-md bg-[#dcfce7] p-2 text-[#16a34a]">
                <WalletCards className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Referral Payout Records</h2>
                <p className="text-[12px] text-muted-foreground">Follow the program's recorded payment steps.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatusCountCell label="Pending payouts" value={String(commissionStatusCounts.pending)} valueClassName="text-[#9a6500]" />
              <StatusCountCell label="Approved payouts" value={String(commissionStatusCounts.approved)} valueClassName="text-primary" />
              <StatusCountCell label="Paid payouts" value={String(commissionStatusCounts.paid)} valueClassName="text-[#1a7a40]" />
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
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Marketable availability</p>
                        <p className="mt-1 text-[13px] font-semibold leading-5 text-foreground">
                          {formatMarketability(row)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Program referral payout terms</p>
                        <p className="mt-1 text-[13px] font-semibold text-[#f28c00]">{row.commissionDisplay}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Payout milestone</p>
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
                      Referral Steps
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

        <section id="prequal-engine" className="mt-5">
          <ReferralIntakePausedCard />
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
            <h3 className="text-[13px] font-semibold text-foreground">Referral Payout Records</h3>
            <p className="mt-2 text-[12px] text-muted-foreground">
              Amounts, conditions, and payment references are shown in your referral payout records from
              recorded program terms.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatusCountCell label="Pending payouts" value={String(commissionStatusCounts.pending)} valueClassName="text-[#9a6500]" />
              <StatusCountCell label="Approved payouts" value={String(commissionStatusCounts.approved)} valueClassName="text-primary" />
              <StatusCountCell label="Paid payouts" value={String(commissionStatusCounts.paid)} valueClassName="text-[#1a7a40]" />
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setLocation('/distribution/partner/commissions')}
            >
              Open Referral Payouts
            </Button>
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

function StatusCountCell({
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
