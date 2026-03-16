import { z } from 'zod';
import { router, superAdminProcedure, agencyAdminProcedure } from './_core/trpc';
import {
  getDb,
  getPlatformAnalytics,
  getListingStats,
  updateProperty,
  getPlatformSetting,
  setPlatformSetting,
  getAllPlatformSettings,
  countPendingAgents,
  countPendingListings,
  countPendingDevelopments,
  getEcosystemStats,
} from './db';
import {
  users,
  agencies,
  agencyJoinRequests,
  // auditLogs,
  properties,
  // platformSettings,
  // commissions,
  // agencySubscriptions,
  // invoices,
  // plans,
  // TODO: Re-enable when revenue center schema is added
  // subscriptionTransactions,
  // advertisingCampaigns,
  // revenueForecasts,
  // failedPayments,
  listings,
  listingMedia,
  agents,
  developments,
  developers,
  developmentApprovalQueue,
} from '../drizzle/schema';
import { eq, desc, asc, and, or, like, sql, type SQL, gte, lte } from 'drizzle-orm';
import { logAudit, AuditActions } from './_core/auditLog';
import { nowAsDbTimestamp } from './utils/dbTypeUtils';
import { developmentService } from './services/developmentService';
import {
  getKpiFunnelSummary,
  getKpiReconciliation,
  getKpiSummary,
  runDailyKpiRollup,
  runKpiRollupRange,
} from './services/kpiRollupService';
import {
  AFFORDABILITY_CONFIG_KEYS,
  getAffordabilityConfigSnapshot,
  updateAffordabilityConfigEntry,
} from './services/affordabilityConfigService';

const kpiRangeInput = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    days: z.number().int().min(1).max(365).optional(),
  })
  .optional();

const kpiRollupInput = z
  .object({
    date: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .optional();

const kpiReconciliationInput = z
  .object({
    date: z.string().optional(),
  })
  .optional();

const affordabilityConfigKeySchema = z.enum(AFFORDABILITY_CONFIG_KEYS);

function extractRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    if (result.length > 0 && Array.isArray(result[0])) return result[0];
    if (result.length > 0 && typeof result[0] === 'object') return result;
    return [];
  }
  if (Array.isArray((result as any).rows)) return (result as any).rows;
  if (Array.isArray((result as any)[0])) return (result as any)[0];
  return [];
}

function toDateKey(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromDateKey: string, toDateKey: string): number {
  const from = new Date(`${fromDateKey}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDateKey}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.round((to - from) / (24 * 60 * 60 * 1000)));
}

function getKpiRange(input?: z.infer<typeof kpiRangeInput>) {
  const today = new Date().toISOString().slice(0, 10);
  const to =
    toDateKey(input?.to || input?.endDate) ??
    today;

  const days = Math.max(1, Math.min(365, Number(input?.days || 30)));
  const defaultFrom = addDays(to, -(days - 1));
  const from = toDateKey(input?.from || input?.startDate) ?? defaultFrom;

  if (from <= to) return { from, to };
  return { from: to, to: from };
}

const FUNNEL_SHEET_ROLES = ['agent', 'agency', 'developer', 'private_seller'] as const;
type FunnelSheetRole = (typeof FUNNEL_SHEET_ROLES)[number];

type FunnelActionAggregate = {
  role: string;
  action: string;
  path: string;
  plan: string;
  total: number;
};

function toNumeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFunnelRole(raw: unknown): FunnelSheetRole | null {
  const value = String(raw || '')
    .trim()
    .toLowerCase();
  if (!value) return null;
  if (value === 'agent') return 'agent';
  if (value === 'agency') return 'agency';
  if (value === 'developer') return 'developer';
  if (value === 'private_seller' || value === 'private-seller') return 'private_seller';
  return null;
}

function normalizePlan(raw: unknown): 'starter' | 'growth' | 'dominance' | null {
  const value = String(raw || '')
    .trim()
    .toLowerCase();
  if (!value) return null;
  if (value === 'starter') return 'starter';
  if (value === 'growth') return 'growth';
  if (value === 'dominance') return 'dominance';
  return null;
}

async function getFunnelActionAggregates(db: any, from: string, to: string): Promise<FunnelActionAggregate[]> {
  const startTs = `${from} 00:00:00`;
  const endTs = `${addDays(to, 1)} 00:00:00`;

  try {
    const result = await db.execute(sql`
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.role')) AS role,
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.action')) AS action,
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.path')) AS path,
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.plan')) AS plan,
        COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = 'funnel_step'
        AND event_timestamp >= ${startTs}
        AND event_timestamp < ${endTs}
      GROUP BY
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.role')),
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.action')),
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.path')),
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.plan'))
    `);
    return extractRows(result).map((row: any) => ({
      role: String(row.role || ''),
      action: String(row.action || ''),
      path: String(row.path || ''),
      plan: String(row.plan || ''),
      total: toNumeric(row.total, 0),
    }));
  } catch {
    const legacyResult = await db.execute(sql`
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.role')) AS role,
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.action')) AS action,
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.path')) AS path,
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.plan')) AS plan,
        COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = 'funnel_step'
        AND created_at >= ${startTs}
        AND created_at < ${endTs}
      GROUP BY
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.role')),
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.action')),
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.path')),
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.plan'))
    `);
    return extractRows(legacyResult).map((row: any) => ({
      role: String(row.role || ''),
      action: String(row.action || ''),
      path: String(row.path || ''),
      plan: String(row.plan || ''),
      total: toNumeric(row.total, 0),
    }));
  }
}

function buildFunnelKpiSheet(
  actionRows: FunnelActionAggregate[],
  roleArpuMap: Record<string, number>,
  paidConversionMap: Record<string, number>,
) {
  const seedRole = (role: FunnelSheetRole) => ({
    role,
    roleSelected: 0,
    pathChosen: 0,
    pathSelfServe: 0,
    pathStrategy: 0,
    pricingViewed: 0,
    tierClicked: 0,
    setupStarted: 0,
    strategyBooked: 0,
    paidConversion: toNumeric(paidConversionMap[role], 0),
    arpu: toNumeric(roleArpuMap[role], 0),
    tierDistribution: {
      starter: 0,
      growth: 0,
      dominance: 0,
    },
  });

  const byRole = new Map<FunnelSheetRole, ReturnType<typeof seedRole>>();
  for (const role of FUNNEL_SHEET_ROLES) byRole.set(role, seedRole(role));

  for (const row of actionRows) {
    const role = normalizeFunnelRole(row.role);
    if (!role) continue;
    const target = byRole.get(role);
    if (!target) continue;
    const action = String(row.action || '').trim().toLowerCase();
    const path = String(row.path || '').trim().toLowerCase();
    const total = Math.max(0, toNumeric(row.total, 0));

    if (action === 'role_selected') target.roleSelected += total;
    if (action === 'path_selected') {
      target.pathChosen += total;
      if (path === 'self_serve') target.pathSelfServe += total;
      if (path === 'strategy_call') target.pathStrategy += total;
    }
    if (action === 'pricing_viewed') target.pricingViewed += total;
    if (action === 'tier_preview_click') {
      target.tierClicked += total;
      const plan = normalizePlan(row.plan);
      if (plan) target.tierDistribution[plan] += total;
    }
    if (action === 'setup_started') target.setupStarted += total;
    if (action === 'strategy_booked' || action === 'calendar_loaded' || action === 'qualification_submitted') {
      target.strategyBooked += total;
    }
  }

  const roles = FUNNEL_SHEET_ROLES.map(role => {
    const row = byRole.get(role) || seedRole(role);
    const pathSplitSelfServePct = row.pathChosen > 0 ? (row.pathSelfServe / row.pathChosen) * 100 : 0;
    const pathSplitStrategyPct = row.pathChosen > 0 ? (row.pathStrategy / row.pathChosen) * 100 : 0;
    const tierClickRatePct = row.pricingViewed > 0 ? (row.tierClicked / row.pricingViewed) * 100 : 0;
    const setupStartRatePct = row.pricingViewed > 0 ? (row.setupStarted / row.pricingViewed) * 100 : 0;
    const selfServeConversionPct = row.pathSelfServe > 0 ? (row.setupStarted / row.pathSelfServe) * 100 : 0;
    const strategyConversionPct = row.pathStrategy > 0 ? (row.strategyBooked / row.pathStrategy) * 100 : 0;
    const conversionDeltaPct = selfServeConversionPct - strategyConversionPct;
    const paidConversionRatePct = row.setupStarted > 0 ? (row.paidConversion / row.setupStarted) * 100 : 0;

    const topTierEntry = Object.entries(row.tierDistribution).sort(
      (a, b) => toNumeric(b[1], 0) - toNumeric(a[1], 0),
    )[0];
    const topTier = topTierEntry && toNumeric(topTierEntry[1], 0) > 0 ? topTierEntry[0] : null;

    return {
      ...row,
      pathSplitSelfServePct: Number(pathSplitSelfServePct.toFixed(2)),
      pathSplitStrategyPct: Number(pathSplitStrategyPct.toFixed(2)),
      tierClickRatePct: Number(tierClickRatePct.toFixed(2)),
      setupStartRatePct: Number(setupStartRatePct.toFixed(2)),
      selfServeConversionPct: Number(selfServeConversionPct.toFixed(2)),
      strategyConversionPct: Number(strategyConversionPct.toFixed(2)),
      conversionDeltaPct: Number(conversionDeltaPct.toFixed(2)),
      paidConversionRatePct: Number(paidConversionRatePct.toFixed(2)),
      topTier,
    };
  });

  const totalsBase = roles.reduce(
    (acc, row) => {
      acc.roleSelected += row.roleSelected;
      acc.pathChosen += row.pathChosen;
      acc.pathSelfServe += row.pathSelfServe;
      acc.pathStrategy += row.pathStrategy;
      acc.pricingViewed += row.pricingViewed;
      acc.tierClicked += row.tierClicked;
      acc.setupStarted += row.setupStarted;
      acc.strategyBooked += row.strategyBooked;
      acc.paidConversion += row.paidConversion;
      return acc;
    },
    {
      roleSelected: 0,
      pathChosen: 0,
      pathSelfServe: 0,
      pathStrategy: 0,
      pricingViewed: 0,
      tierClicked: 0,
      setupStarted: 0,
      strategyBooked: 0,
      paidConversion: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    roles,
    totals: {
      ...totalsBase,
      pathSplitSelfServePct:
        totalsBase.pathChosen > 0
          ? Number(((totalsBase.pathSelfServe / totalsBase.pathChosen) * 100).toFixed(2))
          : 0,
      pathSplitStrategyPct:
        totalsBase.pathChosen > 0
          ? Number(((totalsBase.pathStrategy / totalsBase.pathChosen) * 100).toFixed(2))
          : 0,
      tierClickRatePct:
        totalsBase.pricingViewed > 0
          ? Number(((totalsBase.tierClicked / totalsBase.pricingViewed) * 100).toFixed(2))
          : 0,
      setupStartRatePct:
        totalsBase.pricingViewed > 0
          ? Number(((totalsBase.setupStarted / totalsBase.pricingViewed) * 100).toFixed(2))
          : 0,
      selfServeConversionPct:
        totalsBase.pathSelfServe > 0
          ? Number(((totalsBase.setupStarted / totalsBase.pathSelfServe) * 100).toFixed(2))
          : 0,
      strategyConversionPct:
        totalsBase.pathStrategy > 0
          ? Number(((totalsBase.strategyBooked / totalsBase.pathStrategy) * 100).toFixed(2))
          : 0,
      paidConversionRatePct:
        totalsBase.setupStarted > 0
          ? Number(((totalsBase.paidConversion / totalsBase.setupStarted) * 100).toFixed(2))
          : 0,
      conversionDeltaPct:
        Number(
          (
            (totalsBase.pathSelfServe > 0
              ? (totalsBase.setupStarted / totalsBase.pathSelfServe) * 100
              : 0) -
            (totalsBase.pathStrategy > 0
              ? (totalsBase.strategyBooked / totalsBase.pathStrategy) * 100
              : 0)
          ).toFixed(2),
        ),
    },
  };
}

type DailyFunnelPoint = {
  date: string;
  pricingViewed: number;
  tierClicked: number;
  setupStarted: number;
  strategyBooked: number;
  paidConversion: number;
  tierCtrPct: number;
  setupStartRatePct: number;
  paidConversionRatePct: number;
};

async function getFunnelTrendSeries(
  db: any,
  from: string,
  to: string,
  roleArpuMap: Record<string, number>,
  windowDays = 7,
) {
  const effectiveFrom = addDays(to, -(Math.max(1, windowDays) - 1));
  const start = effectiveFrom > from ? effectiveFrom : from;
  const startTs = `${start} 00:00:00`;
  const endTs = `${addDays(to, 1)} 00:00:00`;

  const dateKeys: string[] = [];
  let cursor = start;
  while (cursor <= to) {
    dateKeys.push(cursor);
    cursor = addDays(cursor, 1);
  }

  let actionRows: Array<{ metricDate: string; role: string; action: string; total: number }> = [];
  try {
    const result = await db.execute(sql`
      SELECT
        DATE(event_timestamp) AS metricDate,
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.role')) AS role,
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.action')) AS action,
        COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = 'funnel_step'
        AND event_timestamp >= ${startTs}
        AND event_timestamp < ${endTs}
      GROUP BY
        DATE(event_timestamp),
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.role')),
        JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.action'))
    `);
    actionRows = extractRows(result).map((row: any) => ({
      metricDate: toDateKey(String(row.metricDate || '')) || '',
      role: String(row.role || ''),
      action: String(row.action || ''),
      total: toNumeric(row.total, 0),
    }));
  } catch {
    const legacy = await db.execute(sql`
      SELECT
        DATE(created_at) AS metricDate,
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.role')) AS role,
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.action')) AS action,
        COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = 'funnel_step'
        AND created_at >= ${startTs}
        AND created_at < ${endTs}
      GROUP BY
        DATE(created_at),
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.role')),
        JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.action'))
    `);
    actionRows = extractRows(legacy).map((row: any) => ({
      metricDate: toDateKey(String(row.metricDate || '')) || '',
      role: String(row.role || ''),
      action: String(row.action || ''),
      total: toNumeric(row.total, 0),
    }));
  }

  const paidRowsResult = await db.execute(sql`
    SELECT
      metric_date AS metricDate,
      role,
      SUM(upgrade_completed) AS paidConversion
    FROM daily_funnel_metrics
    WHERE metric_date >= ${start}
      AND metric_date <= ${to}
    GROUP BY metric_date, role
  `);
  const paidRows = extractRows(paidRowsResult).map((row: any) => ({
    metricDate: toDateKey(String(row.metricDate || '')) || '',
    role: String(row.role || ''),
    paidConversion: toNumeric(row.paidConversion, 0),
  }));

  const bucket = new Map<string, any>();
  for (const role of FUNNEL_SHEET_ROLES) {
    for (const date of dateKeys) {
      bucket.set(`${role}|${date}`, {
        pricingViewed: 0,
        tierClicked: 0,
        setupStarted: 0,
        strategyBooked: 0,
        paidConversion: 0,
      });
    }
  }

  for (const row of actionRows) {
    const role = normalizeFunnelRole(row.role);
    if (!role || !row.metricDate) continue;
    const key = `${role}|${row.metricDate}`;
    const target = bucket.get(key);
    if (!target) continue;
    const action = String(row.action || '').toLowerCase();
    const total = Math.max(0, toNumeric(row.total, 0));
    if (action === 'pricing_viewed') target.pricingViewed += total;
    if (action === 'tier_preview_click') target.tierClicked += total;
    if (action === 'setup_started') target.setupStarted += total;
    if (action === 'strategy_booked' || action === 'qualification_submitted' || action === 'calendar_loaded') {
      target.strategyBooked += total;
    }
  }

  for (const row of paidRows) {
    const role = normalizeFunnelRole(row.role);
    if (!role || !row.metricDate) continue;
    const key = `${role}|${row.metricDate}`;
    const target = bucket.get(key);
    if (!target) continue;
    target.paidConversion += Math.max(0, toNumeric(row.paidConversion, 0));
  }

  const roles = FUNNEL_SHEET_ROLES.map(role => {
    const points: DailyFunnelPoint[] = dateKeys.map(date => {
      const seed = bucket.get(`${role}|${date}`) || {
        pricingViewed: 0,
        tierClicked: 0,
        setupStarted: 0,
        strategyBooked: 0,
        paidConversion: 0,
      };
      const tierCtrPct = seed.pricingViewed > 0 ? (seed.tierClicked / seed.pricingViewed) * 100 : 0;
      const setupStartRatePct = seed.pricingViewed > 0 ? (seed.setupStarted / seed.pricingViewed) * 100 : 0;
      const paidConversionRatePct = seed.setupStarted > 0 ? (seed.paidConversion / seed.setupStarted) * 100 : 0;
      return {
        date,
        pricingViewed: seed.pricingViewed,
        tierClicked: seed.tierClicked,
        setupStarted: seed.setupStarted,
        strategyBooked: seed.strategyBooked,
        paidConversion: seed.paidConversion,
        tierCtrPct: Number(tierCtrPct.toFixed(2)),
        setupStartRatePct: Number(setupStartRatePct.toFixed(2)),
        paidConversionRatePct: Number(paidConversionRatePct.toFixed(2)),
      };
    });

    const latest = points[points.length - 1] || null;
    const baseline = points[0] || null;
    const trendDelta = {
      tierCtrPct:
        latest && baseline ? Number((latest.tierCtrPct - baseline.tierCtrPct).toFixed(2)) : 0,
      setupStartRatePct:
        latest && baseline
          ? Number((latest.setupStartRatePct - baseline.setupStartRatePct).toFixed(2))
          : 0,
      paidConversionRatePct:
        latest && baseline
          ? Number((latest.paidConversionRatePct - baseline.paidConversionRatePct).toFixed(2))
          : 0,
    };

    return {
      role,
      points,
      latest,
      trendDelta,
      arpu: toNumeric(roleArpuMap[role], 0),
    };
  });

  return {
    windowDays: dateKeys.length,
    from: start,
    to,
    roles,
  };
}

function buildStrategicInsights(
  funnelSheet: any,
  roles: any[],
  revenueSnapshot: { totalMrr: number; newMrrLast30: number; weightedArpu: number; conversionDeltaPct: number },
) {
  const insights: Array<{ title: string; detail: string }> = [];
  const roleRows = (funnelSheet?.roles || []) as any[];
  if (!roleRows.length) return insights;

  const bestArpu = [...roles].sort((a, b) => toNumeric(b.arpu, 0) - toNumeric(a.arpu, 0))[0];
  if (bestArpu) {
    insights.push({
      title: 'Highest ARPU Role',
      detail: `${String(bestArpu.role)} is leading with ARPU ${toNumeric(bestArpu.arpu, 0).toFixed(2)}.`,
    });
  }

  const bestStrategyLift = [...roleRows]
    .map(row => ({
      role: row.role,
      liftPct: Number((toNumeric(row.strategyConversionPct, 0) - toNumeric(row.selfServeConversionPct, 0)).toFixed(2)),
    }))
    .sort((a, b) => b.liftPct - a.liftPct)[0];

  if (bestStrategyLift && bestStrategyLift.liftPct > 0) {
    insights.push({
      title: 'Strategy Path Advantage',
      detail: `${String(bestStrategyLift.role)} converts ${bestStrategyLift.liftPct.toFixed(1)}% higher via strategy path.`,
    });
  } else {
    insights.push({
      title: 'Path Performance Watch',
      detail: `Self-serve currently leads by ${toNumeric(revenueSnapshot.conversionDeltaPct, 0).toFixed(1)}% overall.`,
    });
  }

  const tierTotals = roleRows.reduce(
    (acc, row) => {
      const distribution = row.tierDistribution || {};
      acc.starter += toNumeric(distribution.starter, 0);
      acc.growth += toNumeric(distribution.growth, 0);
      acc.dominance += toNumeric(distribution.dominance, 0);
      return acc;
    },
    { starter: 0, growth: 0, dominance: 0 },
  );
  const tierClickTotal = tierTotals.starter + tierTotals.growth + tierTotals.dominance;
  const growthShare = tierClickTotal > 0 ? (tierTotals.growth / tierClickTotal) * 100 : 0;
  insights.push({
    title: 'Tier Preference Signal',
    detail: `Growth tier accounts for ${growthShare.toFixed(1)}% of tier-preview clicks.`,
  });

  return insights.slice(0, 3);
}

type WindowSnapshot = {
  mrr: number;
  newMrrLast30: number;
  weightedArpu: number;
  conversionDeltaPct: number;
};

type MetricDelta = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  direction: 'up' | 'down' | 'flat';
};

function buildMetricDelta(current: number, previous: number): MetricDelta {
  const safeCurrent = toNumeric(current, 0);
  const safePrevious = toNumeric(previous, 0);
  const delta = safeCurrent - safePrevious;
  const deltaPct = safePrevious === 0 ? (safeCurrent === 0 ? 0 : 100) : (delta / safePrevious) * 100;
  const direction: 'up' | 'down' | 'flat' = Math.abs(delta) < 0.01 ? 'flat' : delta > 0 ? 'up' : 'down';
  return {
    current: Number(safeCurrent.toFixed(2)),
    previous: Number(safePrevious.toFixed(2)),
    delta: Number(delta.toFixed(2)),
    deltaPct: Number(deltaPct.toFixed(2)),
    direction,
  };
}

async function buildWindowSnapshot(db: any, from: string, to: string): Promise<WindowSnapshot> {
  const summary = await getKpiSummary(from, to);
  const roleRows = ((summary as any)?.roles || []) as any[];
  const roleArpuMap = roleRows.reduce(
    (acc: Record<string, number>, row: any) => {
      acc[String(row.role)] = Number(row.arpu || 0);
      return acc;
    },
    {} as Record<string, number>,
  );
  const paidConversionMap = roleRows.reduce(
    (acc: Record<string, number>, row: any) => {
      acc[String(row.role)] = Number(row.newSubscriptions || 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  let conversionDeltaPct = 0;
  if (db && typeof db.execute === 'function') {
    try {
      const actionRows = await getFunnelActionAggregates(db, from, to);
      const sheet = buildFunnelKpiSheet(actionRows, roleArpuMap, paidConversionMap);
      conversionDeltaPct = Number(toNumeric((sheet as any)?.totals?.conversionDeltaPct, 0).toFixed(2));
    } catch {
      conversionDeltaPct = 0;
    }
  }

  return {
    mrr: Number(toNumeric((summary as any)?.totals?.mrr, 0).toFixed(2)),
    newMrrLast30: Number(toNumeric((summary as any)?.totals?.newLogoMrr, 0).toFixed(2)),
    weightedArpu: Number(toNumeric((summary as any)?.totals?.arpu, 0).toFixed(2)),
    conversionDeltaPct,
  };
}

async function buildPeriodComparison(
  db: any,
  currentFrom: string,
  currentTo: string,
  previousFrom: string,
  previousTo: string,
) {
  const [current, previous] = await Promise.all([
    buildWindowSnapshot(db, currentFrom, currentTo),
    buildWindowSnapshot(db, previousFrom, previousTo),
  ]);

  return {
    current: {
      from: currentFrom,
      to: currentTo,
    },
    previous: {
      from: previousFrom,
      to: previousTo,
    },
    metrics: {
      mrr: buildMetricDelta(current.mrr, previous.mrr),
      newMrrLast30: buildMetricDelta(current.newMrrLast30, previous.newMrrLast30),
      weightedArpu: buildMetricDelta(current.weightedArpu, previous.weightedArpu),
      conversionDeltaPct: buildMetricDelta(current.conversionDeltaPct, previous.conversionDeltaPct),
    },
  };
}

/**
 * Admin router - Super admin and agency admin endpoints
 */
export const adminRouter = router({
  /**
   * Super Admin: Get action items (pending counts)
   * Designed for fast polling on the dashboard
   */
  getAdminActionItems: superAdminProcedure.query(
    async (): Promise<{
      pendingAgentApprovals: number;
      pendingListingApprovals: number;
      pendingDevelopmentApprovals: number;
      flaggedItems: number;
    }> => {
      const [agents, listings, developments] = await Promise.all([
        countPendingAgents(),
        countPendingListings(),
        countPendingDevelopments(),
      ]);

      return {
        pendingAgentApprovals: agents,
        pendingListingApprovals: listings,
        pendingDevelopmentApprovals: developments,
        flaggedItems: 0, // Placeholder
      };
    },
  ),

  /**
   * Super Admin: Get Ecosystem Overview Stats
   */
  getEcosystemStats: superAdminProcedure.query(
    async (): Promise<Awaited<ReturnType<typeof getEcosystemStats>>> => {
      return getEcosystemStats();
    },
  ),

  /**
   * Super Admin: List all users with pagination and filters
   */
  listUsers: superAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        role: z.enum(['visitor', 'agent', 'agency_admin', 'super_admin']).optional(),
        agencyId: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<{
        users: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }> => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Log audit
        await logAudit({
          userId: ctx.user.id,
          action: AuditActions.VIEW_ALL_USERS,
          metadata: { filters: input },
          req: ctx.req,
        });

        const offset = (input.page - 1) * input.limit;

        // Build where conditions
        const conditions: SQL[] = [];
        if (input.role) conditions.push(eq(users.role, input.role));
        if (input.agencyId) conditions.push(eq(users.agencyId, input.agencyId));
        const search = input.search?.trim();
        if (search) {
          conditions.push(
            or(
              like(users.email, `%${search}%`),
              like(users.firstName, `%${search}%`),
              like(users.lastName, `%${search}%`),
            )!,
          );
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [usersList, totalResult] = await Promise.all([
          db
            .select()
            .from(users)
            .where(where)
            .limit(input.limit)
            .offset(offset)
            .orderBy(desc(users.createdAt)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(where),
        ]);

        const total = Number(totalResult[0]?.count || 0);

        return {
          users: usersList.map(u => ({
            ...u,
            passwordHash: undefined, // Never expose password hash
          })),
          pagination: {
            page: input.page,
            limit: input.limit,
            total,
            totalPages: Math.ceil(total / input.limit),
          },
        };
      },
    ),

  /**
   * Super Admin: List all agencies
   */
  listAgencies: superAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        search: z.string().optional(),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<{
        agencies: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }> => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await logAudit({
          userId: ctx.user.id,
          action: AuditActions.VIEW_ALL_AGENCIES,
          metadata: { filters: input },
          req: ctx.req,
        });

        const offset = (input.page - 1) * input.limit;

        const search = input.search?.trim();
        const where = search
          ? or(like(agencies.name, `%${search}%`), like(agencies.city, `%${search}%`))!
          : undefined;

        const [agenciesList, totalResult] = await Promise.all([
          db
            .select()
            .from(agencies)
            .where(where)
            .limit(input.limit)
            .offset(offset)
            .orderBy(desc(agencies.createdAt)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(agencies)
            .where(where),
        ]);

        const total = Number(totalResult[0]?.count || 0);

        return {
          agencies: agenciesList,
          pagination: {
            page: input.page,
            limit: input.limit,
            total,
            totalPages: Math.ceil(total / input.limit),
          },
        };
      },
    ),

  /**
   * Super Admin: Update user role
   */
  updateUserRole: superAdminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(['visitor', 'agent', 'agency_admin', 'super_admin']),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_USER_ROLE,
        targetType: 'user',
        targetId: input.userId,
        metadata: { newRole: input.role },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Super Admin: Get audit logs
   */
  /*
  // Super Admin: Get audit logs
  getAuditLogs: superAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        userId: z.number().optional(),
        action: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
       // ... Implementation commented out due to missing schema
       throw new Error("Feature temporarily unavailable");
    }),
  */

  /**
   * Agency Admin: List subaccounts (agents in their agency)
   */
  listSubaccounts: agencyAdminProcedure.query(async ({ ctx }): Promise<any[]> => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Super admin can view all, agency admin only their agency
    const agencyId = ctx.user.role === 'super_admin' ? undefined : ctx.user.agencyId;

    if (ctx.user.role === 'agency_admin' && !agencyId) {
      throw new Error('Agency admin must be associated with an agency');
    }

    const subaccounts = await db
      .select()
      .from(users)
      .where(and(eq(users.isSubaccount, 1), agencyId ? eq(users.agencyId, agencyId) : undefined))
      .orderBy(desc(users.createdAt));

    return subaccounts.map(u => ({
      ...u,
      passwordHash: undefined,
    }));
  }),

  /**
   * Agency Admin: List join requests for their agency
   */
  listJoinRequests: agencyAdminProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<any[]> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const agencyId = ctx.user.role === 'super_admin' ? undefined : ctx.user.agencyId;

      if (ctx.user.role === 'agency_admin' && !agencyId) {
        throw new Error('Agency admin must be associated with an agency');
      }

      const conditions: SQL[] = [];
      if (agencyId) conditions.push(eq(agencyJoinRequests.agencyId, agencyId));
      if (input.status) conditions.push(eq(agencyJoinRequests.status, input.status));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const requests = await db
        .select()
        .from(agencyJoinRequests)
        .where(where)
        .orderBy(desc(agencyJoinRequests.createdAt));

      return requests;
    }),

  /**
   * Agency Admin: Approve/reject join request
   */
  reviewJoinRequest: agencyAdminProcedure
    .input(
      z.object({
        requestId: z.number(),
        status: z.enum(['approved', 'rejected']),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get the request
      const [request] = await db
        .select()
        .from(agencyJoinRequests)
        .where(eq(agencyJoinRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new Error('Join request not found');
      }

      // Verify agency ownership (unless super_admin)
      if (ctx.user.role === 'agency_admin' && request.agencyId !== ctx.user.agencyId) {
        throw new Error('Unauthorized: Can only review requests for your own agency');
      }

      // Update request status
      await db
        .update(agencyJoinRequests)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewedAt: nowAsDbTimestamp(),
        })
        .where(eq(agencyJoinRequests.id, input.requestId));

      // If approved, link user to agency as subaccount
      if (input.status === 'approved') {
        await db
          .update(users)
          .set({
            agencyId: request.agencyId,
            isSubaccount: 1,
          })
          .where(eq(users.id, request.userId));
      }

      await logAudit({
        userId: ctx.user.id,
        action:
          input.status === 'approved'
            ? AuditActions.APPROVE_JOIN_REQUEST
            : AuditActions.REJECT_JOIN_REQUEST,
        targetType: 'join_request',
        targetId: input.requestId,
        metadata: { userId: request.userId, agencyId: request.agencyId },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Super Admin: Get platform analytics
   */
  getAnalytics: superAdminProcedure.query(async (): Promise<any> => {
    try {
      return await getPlatformAnalytics();
    } catch (error) {
      console.warn('[admin.getAnalytics] Returning safe defaults due to error:', error);
      return {
        totalUsers: 0,
        totalAgencies: 0,
        totalProperties: 0,
        activeProperties: 0,
        totalAgents: 0,
        totalDevelopers: 0,
        paidSubscriptions: 0,
        monthlyRevenue: 0,
        userGrowth: 0,
        propertyGrowth: 0,
      };
    }
  }),

  /**
   * Super Admin: Get listing statistics
   */
  getListingStats: superAdminProcedure.query(async (): Promise<any> => {
    try {
      return await getListingStats();
    } catch (error) {
      console.warn('[admin.getListingStats] Returning safe defaults due to error:', error);
      return { pending: 0, approved: 0, rejected: 0, total: 0 };
    }
  }),

  /**
   * Super Admin: List properties for oversight (Super Admin only)
   */
  listProperties: superAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        status: z
          .enum([
            'draft',
            'pending_review',
            'approved',
            'published',
            'rejected',
            'archived',
            'sold',
            'rented',
          ])
          .optional(),
        agencyId: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<{
        properties: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }> => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await logAudit({
          userId: ctx.user.id,
          action: AuditActions.VIEW_ALL_PROPERTIES,
          metadata: { filters: input },
          req: ctx.req,
        });

        const offset = (input.page - 1) * input.limit;

        // Build where conditions
        const conditions: SQL[] = [];
        if (input.status) conditions.push(eq(listings.status, input.status));
        if (input.agencyId) {
          conditions.push(eq(listings.agencyId, input.agencyId));
        }
        if (input.search) {
          conditions.push(
            or(
              like(listings.title, `%${input.search}%`),
              like(listings.address, `%${input.search}%`),
              like(listings.city, `%${input.search}%`),
              like(listings.slug, `%${input.search}%`),
            )!,
          );
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        // Determine sort order
        let orderByClause = [desc(listings.createdAt)];

        // Phase 5: Smart Admin Queues
        // If viewing pending items, sort by Lowest Readiness (Edge cases) and High Value
        if (input.status === 'pending_review' || input.status === 'approved') {
          // Applying smart sort to approved too? Maybe just pending.
          // Wait, listing status enum usage in where clause:
          // 'pending_review' is the status for submitted listings.
        }

        if (input.status === 'pending_review') {
          orderByClause = [
            asc(listings.readinessScore), // Lowest readiness first (Review edge cases)
            desc(listings.askingPrice), // High value items
            desc(listings.createdAt), // Oldest first if tie
          ];
        }

        const [listingsList, totalResult] = await Promise.all([
          db
            .select({
              id: listings.id,
              title: listings.title,
              askingPrice: listings.askingPrice,
              monthlyRent: listings.monthlyRent,
              status: listings.status,
              approvalStatus: listings.approvalStatus,
              city: listings.city,
              createdAt: listings.createdAt,
              propertyDetails: listings.propertyDetails,
              action: listings.action,

              // Agent Info
              agent: {
                id: agents.id,
                firstName: agents.firstName,
                lastName: agents.lastName,
                profileImage: agents.profileImage,
                isVerified: agents.isVerified,
              },

              // Owner Info (fallback)
              owner: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
              },

              // Media
              thumbnail: listingMedia.thumbnailUrl,
              mediaType: listingMedia.mediaType,

              // Scores (Phase 2/3)
              readinessScore: listings.readinessScore,
              qualityScore: listings.qualityScore,
            })
            .from(listings)
            .leftJoin(agents, eq(listings.agentId, agents.id))
            .leftJoin(users, eq(listings.ownerId, users.id))
            .leftJoin(listingMedia, eq(listings.mainMediaId, listingMedia.id))
            .where(where)
            .limit(input.limit)
            .offset(offset)
            .orderBy(...orderByClause),
          db
            .select({ count: sql<number>`count(*)` })
            .from(listings)
            .where(where),
        ]);

        const total = Number(totalResult[0]?.count || 0);

        return {
          properties: listingsList.map(l => ({
            ...l,
            // Normalize price for display
            price: l.action === 'rent' ? Number(l.monthlyRent) : Number(l.askingPrice),
            // Calculate Vibe Score (Mock for now, can be enhanced)
            vibeScore: Math.floor(Math.random() * 30) + 70, // Random 70-100 for demo
          })),
          pagination: {
            page: input.page,
            limit: input.limit,
            total,
            totalPages: Math.ceil(total / input.limit),
          },
        };
      },
    ),

  /**
   * Super Admin: Get Property Listing Stats (Health Monitor)
   */
  getPropertiesStats: superAdminProcedure.query(async ({ ctx }): Promise<any> => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [stats] = await db
      .select({
        totalInventoryValue: sql<string>`sum(${listings.askingPrice})`,
        newListingsToday: sql<number>`count(case when ${listings.createdAt} >= DATE_SUB(NOW(), INTERVAL 24 HOUR) then 1 end)`,
        pendingApprovals: sql<number>`count(case when ${listings.approvalStatus} = 'pending' then 1 end)`,
        // Quality Metrics
        averageQuality: sql<number>`avg(${listings.qualityScore})`,
        featuredCount: sql<number>`count(case when ${listings.qualityScore} >= 90 then 1 end)`,
        optimizedCount: sql<number>`count(case when ${listings.qualityScore} >= 75 AND ${listings.qualityScore} < 90 then 1 end)`,
      })
      .from(listings)
      .where(eq(listings.status, 'published')); // Only count published for inventory value? Or all?
    // Let's count all active listings for inventory value

    // Actually, let's do a separate query for pending approvals to be safe on where clause
    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(eq(listings.approvalStatus, 'pending'));

    return {
      totalInventoryValue: Number(stats?.totalInventoryValue || 0),
      newListingsToday: Number(stats?.newListingsToday || 0),
      pendingApprovals: Number(pendingResult?.count || 0),
      // Quality Stats (Phase 6) - Using raw SQL to be safe if Drizzle types lag
      qualityMetrics: {
        averageScore: Number(stats?.averageQuality || 0),
        featuredCount: Number(stats?.featuredCount || 0),
        optimizedCount: Number(stats?.optimizedCount || 0),
      },
    };
  }),

  /**
   * Super Admin: Get Development Approval Analytics (Fast-Track Monitoring)
   */
  getDevelopmentAnalytics: superAdminProcedure.query(async ({ ctx }): Promise<any> => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 1. Pending Developments
    const [pendingRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(developments)
      .where(eq(developments.approvalStatus, 'pending'));

    // 2. Queue Analytics (Approvals & Rejections)
    // Using raw SQL for efficient aggregation of time differences and conditional counts
    const [queueStats] = await db.execute(sql`
        SELECT
            COUNT(*) as total_processed,
            SUM(CASE WHEN status = 'approved' AND review_notes LIKE 'Auto-approved%' THEN 1 ELSE 0 END) as auto_approved,
            SUM(CASE WHEN status = 'approved' AND (review_notes IS NULL OR review_notes NOT LIKE 'Auto-approved%') THEN 1 ELSE 0 END) as manual_approved,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
            AVG(CASE 
                WHEN status = 'approved' AND (review_notes IS NULL OR review_notes NOT LIKE 'Auto-approved%') 
                THEN TIMESTAMPDIFF(SECOND, submitted_at, reviewed_at) 
                ELSE NULL 
            END) as avg_manual_seconds
        FROM development_approval_queue
        WHERE status IN ('approved', 'rejected')
    `);

    const stats = (queueStats as any)[0] || {};
    const totalProcessed = Number(stats.total_processed || 0);
    const autoApproved = Number(stats.auto_approved || 0);
    const manualApproved = Number(stats.manual_approved || 0);

    // Ratios
    const approvalRate = totalProcessed > 0 ? (autoApproved + manualApproved) / totalProcessed : 0;
    const autoApprovalRate =
      autoApproved + manualApproved > 0 ? autoApproved / (autoApproved + manualApproved) : 0;

    return {
      pendingCount: Number(pendingRes?.count || 0),
      totalProcessed,
      autoApprovedCount: autoApproved,
      manualApprovedCount: manualApproved,
      rejectedCount: Number(stats.rejected || 0),
      avgManualApprovalSeconds: Number(stats.avg_manual_seconds || 0),
      autoApprovalRate,
    };
  }),

  /**
   * Super Admin: Moderate property listing (approve/reject)
   */
  moderateProperty: superAdminProcedure
    .input(
      z.object({
        propertyId: z.number(),
        action: z.enum(['approve', 'reject', 'archive']),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      let newStatus: string;
      switch (input.action) {
        case 'approve':
          newStatus = 'available';
          break;
        case 'reject':
          newStatus = 'archived';
          break;
        case 'archive':
          newStatus = 'archived';
          break;
        default:
          throw new Error('Invalid action');
      }

      await updateProperty(
        input.propertyId,
        ctx.user.id,
        { status: newStatus as any },
        ctx.user.role,
      );

      await logAudit({
        userId: ctx.user.id,
        action:
          input.action === 'approve' ? AuditActions.APPROVE_PROPERTY : AuditActions.REJECT_PROPERTY,
        targetType: 'property',
        targetId: input.propertyId,
        metadata: { reason: input.reason, newStatus },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Super Admin: Update subscription plan
   */
  /*
  updateSubscription: superAdminProcedure.mutation(async () => { throw new Error("Unavailable"); }),
  getPlatformSettings: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  updatePlatformSetting: superAdminProcedure.mutation(async () => { throw new Error("Unavailable"); }),
  */

  /**
   * Super Admin: Get comprehensive revenue analytics
   */
  /*
  getRevenueAnalytics: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getCommissionBreakdown: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getSubscriptionRevenue: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getRevenueByPeriod: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getRevenueByCategory: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getLTVAnalytics: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getRevenueForecast: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getFailedPayments: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  */

  /**
   * Super Admin: Get General Platform Analytics
   */
  getGeneralAnalytics: superAdminProcedure.query(async (): Promise<any> => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const results = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(agencies),
      db.select({ count: sql<number>`count(*)` }).from(listings),
      db
        .select({ count: sql<number>`count(*)` })
        .from(listings)
        .where(eq(listings.status, 'published')),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, 'agent')),
      db.select().from(users).orderBy(desc(users.createdAt)).limit(5),
      db.select().from(listings).orderBy(desc(listings.createdAt)).limit(5),
    ]);

    const [
      totalUsers,
      totalAgencies,
      totalListings,
      activeListings,
      totalAgents,
      recentUsers,
      recentListings,
    ] = results as [
      { count: number }[],
      { count: number }[],
      { count: number }[],
      { count: number }[],
      { count: number }[],
      any[],
      any[],
    ];

    return {
      counts: {
        users: Number(totalUsers[0]?.count || 0),
        agencies: Number(totalAgencies[0]?.count || 0),
        listings: Number(totalListings[0]?.count || 0),
        activeListings: Number(activeListings[0]?.count || 0),
        agents: Number(totalAgents[0]?.count || 0),
      },
      recentActivity: {
        users: recentUsers,
        listings: recentListings,
      },
    };
  }),

  /**
   * Super Admin: Get agents by status for approval
   */
  getPendingAgents: superAdminProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
      }),
    )
    .query(async ({ input }): Promise<any[]> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const where = input.status ? eq(agents.status, input.status) : undefined;

      const agentsList = await db
        .select({
          id: agents.id,
          userId: agents.userId,
          displayName: agents.displayName,
          phone: agents.phone,
          phoneNumber: agents.phone,
          email: agents.email,
          bio: agents.bio,
          licenseNumber: agents.licenseNumber,
          specializations: agents.specialization,
          status: agents.status,
          rejectionReason: agents.rejectionReason,
          createdAt: agents.createdAt,
          approvedAt: agents.approvedAt,
        })
        .from(agents)
        .where(where)
        .orderBy(desc(agents.createdAt));

      return agentsList;
    }),

  /**
   * Super Admin: Approve agent application
   */
  approveAgent: superAdminProcedure
    .input(
      z.object({
        agentId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .update(agents)
        .set({
          status: 'approved',
          approvedBy: ctx.user.id,
          approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(eq(agents.id, input.agentId));

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.APPROVE_JOIN_REQUEST,
        targetType: 'agent',
        targetId: input.agentId,
        metadata: { status: 'approved' },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Super Admin: Reject agent application
   */
  rejectAgent: superAdminProcedure
    .input(
      z.object({
        agentId: z.number(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .update(agents)
        .set({
          status: 'rejected',
          rejectionReason: input.reason,
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(eq(agents.id, input.agentId));

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.REJECT_JOIN_REQUEST,
        targetType: 'agent',
        targetId: input.agentId,
        metadata: { status: 'rejected', reason: input.reason },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Admin: List pending developments
   */
  adminListPendingDevelopments: superAdminProcedure.query(async ({ ctx }): Promise<any[]> => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Sort by submittedAt desc
    const pendingDevs = await db
      .select({
        development: developments,
        developer: developers,
        queueEntry: developmentApprovalQueue,
      })
      .from(developmentApprovalQueue)
      .innerJoin(developments, eq(developmentApprovalQueue.developmentId, developments.id))
      .innerJoin(developers, eq(developments.developerId, developers.id))
      .where(eq(developmentApprovalQueue.status, 'pending'))
      .orderBy(desc(developmentApprovalQueue.submittedAt));

    return pendingDevs.map(item => ({
      ...item.development,
      developerName: item.developer.name,
      submittedAt: item.queueEntry.submittedAt,
      queueId: item.queueEntry.id,
    }));
  }),

  /**
   * Admin: Approve development
   */
  adminApproveDevelopment: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number(),
        complianceChecks: z.record(z.boolean()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      await developmentService.approveDevelopment(input.developmentId, ctx.user.id);

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_DEVELOPMENT,
        targetType: 'development',
        targetId: input.developmentId,
        metadata: { action: 'approve', compliance: input.complianceChecks },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Admin: Reject development
   */
  adminRejectDevelopment: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      await developmentService.rejectDevelopment(input.developmentId, ctx.user.id, input.reason);

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_DEVELOPMENT,
        targetType: 'development',
        targetId: input.developmentId,
        metadata: { action: 'reject', reason: input.reason },
        req: ctx.req,
      });

      return { success: true };
    }),

  getDevelopmentAuditLogs: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }),
    )
    .query(async () => {
      return { logs: [], total: 0 };
    }),

  /**
   * Admin: Request changes (Soft Rejection)
   */
  adminRequestChanges: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number(),
        feedback: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      await developmentService.requestChanges(input.developmentId, ctx.user.id, input.feedback);

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_DEVELOPMENT,
        targetType: 'development',
        targetId: input.developmentId,
        metadata: { action: 'request_changes', feedback: input.feedback },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Admin: Get Audit Logs for a Development
   */
  /*
  getDevelopmentAuditLogs: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  */

  /**
   * =====================================================
   * COMPATIBILITY STUBS (API CONTRACT STABILIZATION)
   * These exist to satisfy frontend expectations.
   * Real implementations will replace these later.
   * =====================================================
   */

  getPlatformSettings: superAdminProcedure.query(async () => {
    // Temporary stub – frontend expects this
    return getAllPlatformSettings();
  }),

  updatePlatformSetting: superAdminProcedure
    .input(
      z.object({
        key: z.string().trim().min(2).max(100),
        value: z.any(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await setPlatformSetting(input.key, input.value, Number(ctx.user.id));

      await logAudit({
        userId: Number(ctx.user.id),
        action: 'update_platform_setting',
        targetType: 'platform_setting',
        metadata: {
          key: input.key,
        },
        req: ctx.req,
      });

      return {
        success: true,
      };
    }),

  listAffordabilityConfig: superAdminProcedure.query(async () => {
    return getAffordabilityConfigSnapshot();
  }),

  updateAffordabilityConfig: superAdminProcedure
    .input(
      z.object({
        key: affordabilityConfigKeySchema,
        value: z.number().finite(),
        label: z.string().trim().min(2).max(120).optional(),
        description: z.string().trim().max(1000).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedEntry = await updateAffordabilityConfigEntry({
        key: input.key,
        value: input.value,
        updatedByUserId: Number(ctx.user.id),
        label: input.label,
        description: input.description,
        isActive: input.isActive,
      });

      await logAudit({
        userId: Number(ctx.user.id),
        action: 'update_affordability_config',
        targetType: 'affordability_config',
        metadata: {
          key: input.key,
          value: updatedEntry.value,
          label: updatedEntry.label,
          isActive: updatedEntry.isActive,
        },
        req: ctx.req,
      });

      return {
        updatedEntry,
        snapshot: await getAffordabilityConfigSnapshot(),
      };
    }),

  getRevenueAnalytics: superAdminProcedure
    .input(kpiRangeInput)
    .query(async ({ input }) => {
      const { from, to } = getKpiRange(input);
      const [summary, funnel] = await Promise.all([getKpiSummary(from, to), getKpiFunnelSummary(from, to)]);
      const summaryTotals = (summary as any)?.totals || {};

      const funnelByRole = new Map<string, any>();
      for (const roleFunnel of (funnel as any)?.roles || []) {
        funnelByRole.set(String(roleFunnel.role), roleFunnel);
      }

      const roles = ((summary as any)?.roles || []).map((roleSummary: any) => {
        const roleFunnel = funnelByRole.get(String(roleSummary.role)) || {
          roleSelected: 0,
          strategyClicked: 0,
          strategyBooked: 0,
          upgradeStarted: 0,
          upgradeCompleted: 0,
          avgDecisionLatencyMs: null,
        };
        const roleSelected = Number(roleFunnel.roleSelected || 0);
        const strategyBooked = Number(roleFunnel.strategyBooked || 0);
        const dropOffRate =
          roleSelected > 0 ? Number((((roleSelected - strategyBooked) / roleSelected) * 100).toFixed(2)) : 0;

        return {
          role: roleSummary.role,
          startActiveAccounts: Number(roleSummary.startActiveAccounts || 0),
          activeAccounts: Number(roleSummary.activeAccounts || 0),
          newSubscriptions: Number(roleSummary.newSubscriptions || 0),
          churnedAccounts: Number(roleSummary.churnedAccounts || 0),
          mrr: Number(roleSummary.mrr || 0),
          arpu: Number(roleSummary.arpu || 0),
          nrr: Number(roleSummary.nrr || 0),
          nrrStartMrr: Number(roleSummary.nrrStartMrr || 0),
          nrrEndExistingMrr: Number(roleSummary.nrrEndExistingMrr || 0),
          newLogoMrr: Number(roleSummary.newLogoMrr || 0),
          retentionRate: Number(roleSummary.retentionRate || 0),
          expansionRevenue: Number(roleSummary.expansionRevenue || 0),
          addOnRevenue: Number(roleSummary.addOnRevenue || 0),
          addOnAdoptionRate: Number(roleSummary.addOnAdoptionRate || 0),
          funnel: {
            roleSelected,
            strategyClicked: Number(roleFunnel.strategyClicked || 0),
            strategyBooked,
            upgradeStarted: Number(roleFunnel.upgradeStarted || 0),
            upgradeCompleted: Number(roleFunnel.upgradeCompleted || 0),
            avgDecisionLatencyMs:
              roleFunnel.avgDecisionLatencyMs === null
                ? null
                : Number(roleFunnel.avgDecisionLatencyMs || 0),
            dropOffRate,
          },
        };
      });

      const totalMrr = Number(summaryTotals.mrr ?? roles.reduce((sum: number, role: any) => sum + role.mrr, 0));
      const totalActive = roles.reduce((sum: number, role: any) => sum + role.activeAccounts, 0);
      const totalStartActive = roles.reduce((sum: number, role: any) => sum + role.startActiveAccounts, 0);
      const totalChurned = roles.reduce((sum: number, role: any) => sum + role.churnedAccounts, 0);
      const totalRoleSelected = roles.reduce((sum: number, role: any) => sum + role.funnel.roleSelected, 0);
      const totalStrategyBooked = roles.reduce((sum: number, role: any) => sum + role.funnel.strategyBooked, 0);
      const totalExpansionRevenue = Number(
        summaryTotals.expansionRevenue ??
          roles.reduce((sum: number, role: any) => sum + role.expansionRevenue, 0),
      );
      const totalAddOnRevenue = Number(
        summaryTotals.addOnRevenue ?? roles.reduce((sum: number, role: any) => sum + role.addOnRevenue, 0),
      );
      const totalNrrStartMrr = Number(
        summaryTotals.nrrStartMrr ?? roles.reduce((sum: number, role: any) => sum + role.nrrStartMrr, 0),
      );
      const totalNrrEndExistingMrr = Number(
        summaryTotals.nrrEndExistingMrr ??
          roles.reduce((sum: number, role: any) => sum + role.nrrEndExistingMrr, 0),
      );
      const totalNewLogoMrr = Number(
        summaryTotals.newLogoMrr ?? roles.reduce((sum: number, role: any) => sum + role.newLogoMrr, 0),
      );

      const weightedNrr =
        totalNrrStartMrr > 0 ? (totalNrrEndExistingMrr / totalNrrStartMrr) * 100 : 100;
      const weightedRetention =
        totalStartActive > 0 ? Math.max(0, ((totalStartActive - totalChurned) / totalStartActive) * 100) : 100;
      const weightedAddOnAdoption = Number(
        summaryTotals.addOnAdoptionRate ??
          (totalActive > 0
            ? roles.reduce((sum: number, role: any) => sum + role.addOnAdoptionRate * role.activeAccounts, 0) /
              totalActive
            : 0),
      );
      const funnelDropOffRate =
        totalRoleSelected > 0
          ? Number((((totalRoleSelected - totalStrategyBooked) / totalRoleSelected) * 100).toFixed(2))
          : 0;

      const roleArpuMap = roles.reduce(
        (acc: Record<string, number>, role: any) => {
          acc[String(role.role)] = Number(role.arpu || 0);
          return acc;
        },
        {} as Record<string, number>,
      );
      const paidConversionMap = roles.reduce(
        (acc: Record<string, number>, role: any) => {
          acc[String(role.role)] = Number(role.newSubscriptions || 0);
          return acc;
        },
        {} as Record<string, number>,
      );

      const db = await getDb();
      let latestRoleMetricDate: string | null = null;
      let latestFunnelMetricDate: string | null = null;
      let funnelSheet = buildFunnelKpiSheet([], roleArpuMap, paidConversionMap);
      let funnelTrends: any = {
        windowDays: 0,
        from,
        to,
        roles: [],
      };

      const last30From = addDays(to, -29);
      const summary30 = await getKpiSummary(last30From, to);
      const newMrrLast30 = Number((summary30 as any)?.totals?.newLogoMrr || 0);

      const revenueSnapshot = {
        totalMrr: Number(totalMrr.toFixed(2)),
        newMrrLast30: Number(newMrrLast30.toFixed(2)),
        weightedArpu: totalActive > 0 ? Number((totalMrr / totalActive).toFixed(2)) : 0,
        conversionDeltaPct: 0,
      };

      if (db && typeof db.execute === 'function') {
        try {
          const actionRows = await getFunnelActionAggregates(db, from, to);
          funnelSheet = buildFunnelKpiSheet(actionRows, roleArpuMap, paidConversionMap);
        } catch {
          funnelSheet = buildFunnelKpiSheet([], roleArpuMap, paidConversionMap);
        }

        try {
          funnelTrends = await getFunnelTrendSeries(db, from, to, roleArpuMap, 7);
        } catch {
          funnelTrends = {
            windowDays: 0,
            from,
            to,
            roles: [],
          };
        }

        try {
          const roleResult = await db.execute(
            sql`SELECT MAX(metric_date) AS maxDate FROM daily_role_metrics`,
          );
          const roleRows = extractRows(roleResult);
          latestRoleMetricDate = toDateKey(
            roleRows[0]?.maxDate === null ? null : String(roleRows[0]?.maxDate || ''),
          );
        } catch {
          latestRoleMetricDate = null;
        }

        try {
          const funnelResult = await db.execute(
            sql`SELECT MAX(metric_date) AS maxDate FROM daily_funnel_metrics`,
          );
          const funnelRows = extractRows(funnelResult);
          latestFunnelMetricDate = toDateKey(
            funnelRows[0]?.maxDate === null ? null : String(funnelRows[0]?.maxDate || ''),
          );
        } catch {
          latestFunnelMetricDate = null;
        }
      }

      revenueSnapshot.conversionDeltaPct = Number(
        toNumeric((funnelSheet as any)?.totals?.conversionDeltaPct, 0).toFixed(2),
      );
      const strategicInsights = buildStrategicInsights(funnelSheet, roles, revenueSnapshot);
      const wowCurrentFrom = addDays(to, -6);
      const wowPreviousTo = addDays(wowCurrentFrom, -1);
      const wowPreviousFrom = addDays(wowPreviousTo, -6);
      const momCurrentFrom = addDays(to, -29);
      const momPreviousTo = addDays(momCurrentFrom, -1);
      const momPreviousFrom = addDays(momPreviousTo, -29);

      let comparisons = {
        wow: {
          current: { from: wowCurrentFrom, to },
          previous: { from: wowPreviousFrom, to: wowPreviousTo },
          metrics: {
            mrr: buildMetricDelta(0, 0),
            newMrrLast30: buildMetricDelta(0, 0),
            weightedArpu: buildMetricDelta(0, 0),
            conversionDeltaPct: buildMetricDelta(0, 0),
          },
        },
        mom: {
          current: { from: momCurrentFrom, to },
          previous: { from: momPreviousFrom, to: momPreviousTo },
          metrics: {
            mrr: buildMetricDelta(0, 0),
            newMrrLast30: buildMetricDelta(0, 0),
            weightedArpu: buildMetricDelta(0, 0),
            conversionDeltaPct: buildMetricDelta(0, 0),
          },
        },
      };

      try {
        const [wow, mom] = await Promise.all([
          buildPeriodComparison(db, wowCurrentFrom, to, wowPreviousFrom, wowPreviousTo),
          buildPeriodComparison(db, momCurrentFrom, to, momPreviousFrom, momPreviousTo),
        ]);
        comparisons = { wow, mom };
      } catch {
        // Keep default zero-comparison payload to preserve stable API shape.
      }

      const lagDays =
        latestRoleMetricDate && to ? daysBetween(latestRoleMetricDate, to) : null;
      const rollupStatus: 'healthy' | 'degraded' | 'backfill_running' =
        lagDays === null ? 'degraded' : lagDays <= 1 ? 'healthy' : lagDays <= 7 ? 'degraded' : 'backfill_running';

      return {
        version: 'v1',
        from,
        to,
        generatedAt: new Date().toISOString(),
        sourceGeneratedAt: (summary as any)?.generatedAt || new Date().toISOString(),
        freshness: {
          latestRoleMetricDate,
          latestFunnelMetricDate,
          lagDays,
          isStale: lagDays !== null ? lagDays > 1 : true,
          rollupStatus,
        },
        totals: {
          mrr: Number(totalMrr.toFixed(2)),
          arpu: totalActive > 0 ? Number((totalMrr / totalActive).toFixed(2)) : 0,
          nrr: Number(weightedNrr.toFixed(2)),
          nrrStartMrr: Number(totalNrrStartMrr.toFixed(2)),
          nrrEndExistingMrr: Number(totalNrrEndExistingMrr.toFixed(2)),
          newLogoMrr: Number(totalNewLogoMrr.toFixed(2)),
          retentionRate: Number(weightedRetention.toFixed(2)),
          expansionRevenue: Number(totalExpansionRevenue.toFixed(2)),
          addOnRevenue: Number(totalAddOnRevenue.toFixed(2)),
          addOnAdoptionRate: Number(weightedAddOnAdoption.toFixed(2)),
          funnelDropOffRate,
        },
        revenueSnapshot,
        comparisons,
        funnelSheet,
        funnelTrends,
        strategicInsights,
        roles,
      };
    }),

  getRevenueFunnelAnalytics: superAdminProcedure
    .input(kpiRangeInput)
    .query(async ({ input }) => {
      const { from, to } = getKpiRange(input);
      return getKpiFunnelSummary(from, to);
    }),

  getKpiReconciliation: superAdminProcedure
    .input(kpiReconciliationInput)
    .query(async ({ input }) => {
      const date = toDateKey(input?.date || null);
      return getKpiReconciliation(date || undefined);
    }),

  runKpiRollup: superAdminProcedure
    .input(kpiRollupInput)
    .mutation(async ({ ctx, input }): Promise<any> => {
      const startedAt = Date.now();
      const date = toDateKey(input?.date || null);
      const from = toDateKey(input?.from || null);
      const to = toDateKey(input?.to || null);

      let result: any;
      if (from && to) {
        const rangeFrom = from <= to ? from : to;
        const rangeTo = from <= to ? to : from;
        result = await runKpiRollupRange(rangeFrom, rangeTo);
      } else if (date) {
        result = await runDailyKpiRollup(date);
      } else {
        const yesterday = addDays(new Date().toISOString().slice(0, 10), -1);
        result = await runDailyKpiRollup(yesterday);
      }

      const durationMs = Date.now() - startedAt;
      const rolledDates =
        Array.isArray((result as any)?.rolledDates) && (result as any).rolledDates.length > 0
          ? (result as any).rolledDates.length
          : (result as any)?.date
            ? 1
            : 0;
      const estimatedRowsAffected = rolledDates * 6;

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.RUN_KPI_ROLLUP,
        targetType: 'kpi_rollup',
        metadata: {
          input: input || null,
          result,
          durationMs,
          estimatedRowsAffected,
        },
        req: ctx.req,
      });

      return {
        success: true,
        timestamp: new Date().toISOString(),
        triggeredByUserId: ctx.user.id,
        durationMs,
        estimatedRowsAffected,
        result,
      };
    }),

  /**
   * Frontend expects `getSystemStats`
   * Map it to existing ecosystem stats for now
   */
  getSystemStats: superAdminProcedure.query(async () => {
    return await getEcosystemStats();
  }),
});
