// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Activity,
  Database,
  RefreshCw,
  TrendingUp,
  Users,
  BarChart3,
  Clock,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { GlassCard } from '@/components/ui/glass-card';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agents',
  agency: 'Agencies',
  developer: 'Developers',
  private_seller: 'Private Sellers',
};

function getYesterdayDateKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-ZA').format(Number(value || 0));
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  const num = Number(value || 0);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

function deltaToneClasses(direction: string) {
  if (direction === 'up') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (direction === 'down') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

const DeltaChip: React.FC<{ label: string; metric: any }> = ({ label, metric }) => {
  const direction = String(metric?.direction || 'flat');
  const glyph = direction === 'up' ? '^' : direction === 'down' ? 'v' : '-';
  const deltaPct = Number(metric?.deltaPct || 0);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${deltaToneClasses(direction)}`}
    >
      <span>{label}</span>
      <span>{glyph}</span>
      <span>{formatSignedPercent(deltaPct)}</span>
    </span>
  );
};

const TrendBars: React.FC<{ values: number[]; colorClass: string }> = ({ values, colorClass }) => {
  const max = Math.max(1, ...values.map(v => Number(v || 0)));
  return (
    <div className="flex h-10 items-end gap-1">
      {values.map((value, idx) => {
        const height = Math.max(6, Math.round((Number(value || 0) / max) * 36));
        return <div key={idx} className={`w-2 rounded-sm ${colorClass}`} style={{ height }} />;
      })}
    </div>
  );
};

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, sub }) => {
  return (
    <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
        {sub ? <p className="text-xs text-slate-500 mt-1">{sub}</p> : null}
      </CardContent>
    </GlassCard>
  );
};

const RevenueCenterPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState('30');
  const [reconDate, setReconDate] = useState(getYesterdayDateKey());

  const days = Math.max(1, Number(dateRange) || 30);
  const queryInput = useMemo(() => ({ days }), [days]);
  const utils = trpc.useUtils();

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
  } = trpc.admin.getRevenueAnalytics.useQuery(queryInput, {
    refetchInterval: 60_000,
  });

  const {
    data: reconciliation,
    isFetching: reconFetching,
    refetch: refetchReconciliation,
  } = trpc.admin.getKpiReconciliation.useQuery(
    { date: reconDate },
    { enabled: Boolean(reconDate) },
  );

  const runRollup = trpc.admin.runKpiRollup.useMutation({
    onSuccess: async () => {
      await utils.admin.getRevenueAnalytics.invalidate(queryInput);
      await refetch();
    },
  });

  const handleRunYesterday = () => {
    runRollup.mutate({});
  };

  const handleRecomputeRange = () => {
    if (!data?.from || !data?.to) return;
    runRollup.mutate({ from: data.from, to: data.to });
  };

  const freshnessBadge = data?.freshness?.isStale ? (
    <Badge variant="destructive">Stale</Badge>
  ) : (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Fresh</Badge>
  );
  const rollupStatusBadge =
    data?.freshness?.rollupStatus === 'healthy' ? (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Rollup Healthy</Badge>
    ) : data?.freshness?.rollupStatus === 'backfill_running' ? (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">Backfill Running</Badge>
    ) : (
      <Badge variant="secondary">Rollup Degraded</Badge>
    );

  const rangeLabel = data?.from && data?.to ? `${data.from} to ${data.to}` : `Last ${days} days`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/overview')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Revenue Center</h1>
              <p className="text-slate-500">Deterministic role-level KPI telemetry and funnel diagnostics</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[170px] bg-white/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="60">Last 60 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="180">Last 180 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="bg-white/70"
                onClick={handleRunYesterday}
                disabled={runRollup.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${runRollup.isPending ? 'animate-spin' : ''}`} />
                Run Yesterday
              </Button>
              <Button
                className="bg-slate-900 hover:bg-slate-800"
                onClick={handleRecomputeRange}
                disabled={runRollup.isPending || !data?.from || !data?.to}
              >
                <Database className="h-4 w-4 mr-2" />
                Recompute Range
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {freshnessBadge}
              {rollupStatusBadge}
              <span>Range: {rangeLabel}</span>
              <span>Role rollup: {data?.freshness?.latestRoleMetricDate || 'N/A'}</span>
              <span>Lag: {data?.freshness?.lagDays ?? 'N/A'}d</span>
            </div>
          </div>
        </div>

        {error ? (
          <GlassCard className="border-red-200 bg-red-50/80 py-6">
            <CardContent>
              <p className="text-sm text-red-700">Failed to load KPI data: {error.message}</p>
            </CardContent>
          </GlassCard>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Role MRR"
            value={formatCurrency(data?.totals?.mrr || 0)}
            sub={`Generated ${data?.sourceGeneratedAt ? new Date(data.sourceGeneratedAt).toLocaleString() : 'N/A'}`}
          />
          <KpiCard
            icon={<Activity className="h-5 w-5" />}
            label="Weighted NRR"
            value={formatPercent(data?.totals?.nrr || 0)}
            sub={`Existing MRR ${formatCurrency(data?.totals?.nrrEndExistingMrr || 0)} / Start MRR ${formatCurrency(data?.totals?.nrrStartMrr || 0)}`}
          />
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Retention"
            value={formatPercent(data?.totals?.retentionRate || 0)}
            sub="Role-weighted active account retention"
          />
          <KpiCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Add-on Adoption"
            value={formatPercent(data?.totals?.addOnAdoptionRate || 0)}
            sub={`${formatCurrency(data?.totals?.addOnRevenue || 0)} add-ons`}
          />
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            label="Funnel Drop-off"
            value={formatPercent(data?.totals?.funnelDropOffRate || 0)}
            sub="Role selected to strategy booked"
          />
        </div>

        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader>
            <CardTitle className="text-slate-800">Revenue Snapshot (Executive)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
                <p className="text-xs text-slate-500">Total MRR</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">
                  {formatCurrency(data?.revenueSnapshot?.totalMrr || 0)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <DeltaChip label="WoW" metric={data?.comparisons?.wow?.metrics?.mrr} />
                  <DeltaChip label="MoM" metric={data?.comparisons?.mom?.metrics?.mrr} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
                <p className="text-xs text-slate-500">New MRR (Last 30 Days)</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">
                  {formatCurrency(data?.revenueSnapshot?.newMrrLast30 || 0)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <DeltaChip label="WoW" metric={data?.comparisons?.wow?.metrics?.newMrrLast30} />
                  <DeltaChip label="MoM" metric={data?.comparisons?.mom?.metrics?.newMrrLast30} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
                <p className="text-xs text-slate-500">Weighted ARPU</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">
                  {formatCurrency(data?.revenueSnapshot?.weightedArpu || 0)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <DeltaChip label="WoW" metric={data?.comparisons?.wow?.metrics?.weightedArpu} />
                  <DeltaChip label="MoM" metric={data?.comparisons?.mom?.metrics?.weightedArpu} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
                <p className="text-xs text-slate-500">Strategy vs Self-Serve Delta</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">
                  {formatSignedPercent(data?.revenueSnapshot?.conversionDeltaPct || 0)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <DeltaChip label="WoW" metric={data?.comparisons?.wow?.metrics?.conversionDeltaPct} />
                  <DeltaChip label="MoM" metric={data?.comparisons?.mom?.metrics?.conversionDeltaPct} />
                </div>
              </div>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader>
            <CardTitle className="text-slate-800">
              7-Day Trend Strip ({data?.funnelTrends?.from || 'N/A'} to {data?.funnelTrends?.to || 'N/A'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
              {(data?.funnelTrends?.roles || []).map((roleTrend: any) => {
                const tierSeries = (roleTrend.points || []).map((point: any) => point.tierCtrPct || 0);
                const setupSeries = (roleTrend.points || []).map((point: any) => point.setupStartRatePct || 0);
                const paidSeries = (roleTrend.points || []).map(
                  (point: any) => point.paidConversionRatePct || 0,
                );
                const latest = roleTrend.latest || {};
                const delta = roleTrend.trendDelta || {};

                return (
                  <div key={roleTrend.role} className="rounded-lg border border-slate-200 bg-white/70 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {ROLE_LABELS[roleTrend.role] || roleTrend.role}
                    </p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Tier CTR</span>
                          <span className="font-medium text-slate-800">
                            {formatPercent(latest.tierCtrPct || 0)} ({formatSignedPercent(delta.tierCtrPct || 0)})
                          </span>
                        </div>
                        <TrendBars values={tierSeries} colorClass="bg-blue-500/80" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Setup Start Rate</span>
                          <span className="font-medium text-slate-800">
                            {formatPercent(latest.setupStartRatePct || 0)} (
                            {formatSignedPercent(delta.setupStartRatePct || 0)})
                          </span>
                        </div>
                        <TrendBars values={setupSeries} colorClass="bg-emerald-500/80" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Paid Conversion Rate</span>
                          <span className="font-medium text-slate-800">
                            {formatPercent(latest.paidConversionRatePct || 0)} (
                            {formatSignedPercent(delta.paidConversionRatePct || 0)})
                          </span>
                        </div>
                        <TrendBars values={paidSeries} colorClass="bg-violet-500/80" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader>
            <CardTitle className="text-slate-800">Strategic Insights (Auto)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              {(data?.strategicInsights || []).map((insight: any, idx: number) => (
                <div key={`${insight.title}-${idx}`} className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    {insight.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{insight.detail}</p>
                </div>
              ))}
            </div>
            {!(data?.strategicInsights || []).length ? (
              <p className="text-sm text-slate-500">No strategic insights available for selected range.</p>
            ) : null}
          </CardContent>
        </GlassCard>

        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader>
            <CardTitle className="text-slate-800">NRR Composition (New Logos Excluded)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
                <p className="text-xs text-slate-500">Start MRR (Cohort Base)</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">
                  {formatCurrency(data?.totals?.nrrStartMrr || 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
                <p className="text-xs text-slate-500">End Existing MRR (Same Cohort)</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">
                  {formatCurrency(data?.totals?.nrrEndExistingMrr || 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
                <p className="text-xs text-slate-500">New Logo MRR (Excluded from NRR)</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">
                  {formatCurrency(data?.totals?.newLogoMrr || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader>
            <CardTitle className="text-slate-800">Role KPI + Funnel Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-right">ARPU</TableHead>
                  <TableHead className="text-right">NRR</TableHead>
                  <TableHead className="text-right">Retention</TableHead>
                  <TableHead className="text-right">Add-on %</TableHead>
                  <TableHead className="text-right">Role Selected</TableHead>
                  <TableHead className="text-right">Strategy Booked</TableHead>
                  <TableHead className="text-right">Drop-off</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.roles || []).map((row: any) => (
                  <TableRow key={row.role} className="hover:bg-white/40">
                    <TableCell className="font-medium text-slate-900">
                      {ROLE_LABELS[row.role] || row.role}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(row.activeAccounts)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(row.mrr)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.arpu)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.nrr)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.retentionRate)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.addOnAdoptionRate)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.funnel?.roleSelected || 0)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.funnel?.strategyBooked || 0)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.funnel?.dropOffRate || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!data?.roles?.length ? (
              <div className="text-center py-8 text-sm text-slate-500">
                No rollup records found in selected range.
              </div>
            ) : null}

            {runRollup.isSuccess ? (
              <div className="mt-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                KPI rollup completed at {new Date().toLocaleTimeString()}.
              </div>
            ) : null}

            {runRollup.error ? (
              <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                Rollup failed: {runRollup.error.message}
              </div>
            ) : null}
          </CardContent>
        </GlassCard>

        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader>
            <CardTitle className="text-slate-800">Funnel KPI Sheet (Role Measurement)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                <p className="text-xs text-slate-500">Path Split</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  Self-Serve {formatPercent(data?.funnelSheet?.totals?.pathSplitSelfServePct || 0)} | Strategy{' '}
                  {formatPercent(data?.funnelSheet?.totals?.pathSplitStrategyPct || 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                <p className="text-xs text-slate-500">Tier Click Rate</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {formatPercent(data?.funnelSheet?.totals?.tierClickRatePct || 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                <p className="text-xs text-slate-500">Setup Start Rate</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {formatPercent(data?.funnelSheet?.totals?.setupStartRatePct || 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                <p className="text-xs text-slate-500">Self-Serve vs Strategy Delta</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {formatSignedPercent(data?.funnelSheet?.totals?.conversionDeltaPct || 0)}
                </p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Role Selected</TableHead>
                  <TableHead className="text-right">Path Chosen</TableHead>
                  <TableHead className="text-right">Self-Serve %</TableHead>
                  <TableHead className="text-right">Strategy %</TableHead>
                  <TableHead className="text-right">Pricing Viewed</TableHead>
                  <TableHead className="text-right">Tier Clicked</TableHead>
                  <TableHead className="text-right">Tier CTR</TableHead>
                  <TableHead className="text-right">Setup Started</TableHead>
                  <TableHead className="text-right">Strategy Booked</TableHead>
                  <TableHead className="text-right">Paid Conversion</TableHead>
                  <TableHead className="text-right">Conv Delta</TableHead>
                  <TableHead className="text-right">ARPU</TableHead>
                  <TableHead className="text-right">Top Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.funnelSheet?.roles || []).map((row: any) => (
                  <TableRow key={row.role} className="hover:bg-white/40">
                    <TableCell className="font-medium text-slate-900">
                      {ROLE_LABELS[row.role] || row.role}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(row.roleSelected || 0)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.pathChosen || 0)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.pathSplitSelfServePct || 0)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.pathSplitStrategyPct || 0)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.pricingViewed || 0)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.tierClicked || 0)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.tierClickRatePct || 0)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.setupStarted || 0)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.strategyBooked || 0)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.paidConversion || 0)}</TableCell>
                    <TableCell className="text-right">{formatSignedPercent(row.conversionDeltaPct || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.arpu || 0)}</TableCell>
                    <TableCell className="text-right">
                      {row.topTier ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 uppercase">
                          {row.topTier}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!(data?.funnelSheet?.roles || []).length ? (
              <div className="text-center py-6 text-sm text-slate-500">
                No funnel-sheet records available in selected range.
              </div>
            ) : null}
          </CardContent>
        </GlassCard>

        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-800">Raw vs Rollup Reconciliation</CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={reconDate}
                onChange={e => setReconDate(e.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white/80 px-3 text-sm"
              />
              <Button
                variant="outline"
                className="bg-white/70"
                onClick={() => refetchReconciliation()}
                disabled={reconFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${reconFetching ? 'animate-spin' : ''}`} />
                Validate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">MRR Delta</TableHead>
                  <TableHead className="text-right">NRR Delta</TableHead>
                  <TableHead className="text-right">Role Selected Delta</TableHead>
                  <TableHead className="text-right">Strategy Booked Delta</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reconciliation?.roles || []).map((row: any) => (
                  <TableRow key={row.role} className="hover:bg-white/40">
                    <TableCell className="font-medium text-slate-900">
                      {ROLE_LABELS[row.role] || row.role}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.variance?.mrr || 0)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.variance?.nrr || 0)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.variance?.roleSelected || 0)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.variance?.strategyBooked || 0)}</TableCell>
                    <TableCell className="text-right">
                      {row.isMatch ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Match</Badge>
                      ) : (
                        <Badge variant="destructive">Mismatch</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-slate-500">
              Reconciliation date: {reconciliation?.date || reconDate}. Deltas are rollup minus raw recomputation.
            </p>
          </CardContent>
        </GlassCard>

        {isFetching ? <p className="text-xs text-slate-400">Refreshing KPI data...</p> : null}
      </div>
    </div>
  );
};

export default RevenueCenterPage;
