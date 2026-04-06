import { sql } from 'drizzle-orm';
import { getDb } from '../db';

export type MetricRole = 'agent' | 'developer' | 'private_seller';

const ROLES: MetricRole[] = ['agent', 'developer', 'private_seller'];
const SCHEDULER_INTERVAL_MS = 60 * 1000;
let schedulerHandle: NodeJS.Timeout | null = null;
let lastScheduledRunKey: string | null = null;

type RoleMetrics = {
  activeAccounts: number;
  newSubscriptions: number;
  churnedAccounts: number;
  mrr: number;
  expansionRevenue: number;
  addOnRevenue: number;
  arpu: number;
  nrr: number;
};

type RoleNrrComponents = {
  startMrr: number;
  endMrr: number;
  endExistingMrr: number;
  newLogoMrr: number;
  nrr: number;
};

type FunnelMetrics = {
  roleSelected: number;
  strategyClicked: number;
  strategyBooked: number;
  upgradeStarted: number;
  upgradeCompleted: number;
  avgDecisionLatencyMs: number | null;
};

function extractRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    if (result.length > 0 && Array.isArray(result[0])) return result[0];
    if (result.length > 0 && typeof result[0] === 'object') return result;
    return [];
  }
  if (Array.isArray(result.rows)) return result.rows;
  if (Array.isArray(result[0])) return result[0];
  return [];
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateKey(input?: string | Date): string {
  const date = input instanceof Date ? input : input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getRangeForDate(dateKey: string): { startTs: string; endTs: string } {
  const startTs = `${dateKey} 00:00:00`;
  const endTs = `${addDays(dateKey, 1)} 00:00:00`;
  return { startTs, endTs };
}

export function isKpiRollupSchedulerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const override = String(env.KPI_ROLLUP_SCHEDULER_ENABLED ?? '')
    .trim()
    .toLowerCase();

  if (override === 'true') return true;
  if (override === 'false') return false;

  return env.NODE_ENV !== 'staging';
}

function roleUserCondition(role: MetricRole) {
  if (role === 'agent') return sql`u.role IN ('agent', 'agency_admin')`;
  if (role === 'developer') return sql`u.role = 'property_developer'`;
  return sql`u.role = 'visitor'`;
}

async function ensureRollupTables(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS daily_role_metrics (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      metric_date DATE NOT NULL,
      role ENUM('agent', 'developer', 'private_seller') NOT NULL,
      active_accounts INT NOT NULL DEFAULT 0,
      new_subscriptions INT NOT NULL DEFAULT 0,
      churned_accounts INT NOT NULL DEFAULT 0,
      mrr DECIMAL(14,2) NOT NULL DEFAULT 0,
      expansion_revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
      add_on_revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
      arpu DECIMAL(14,2) NOT NULL DEFAULT 0,
      nrr DECIMAL(7,2) NOT NULL DEFAULT 100,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uk_daily_role_metrics_date_role (metric_date, role),
      KEY idx_daily_role_metrics_role (role),
      KEY idx_daily_role_metrics_date (metric_date)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS daily_funnel_metrics (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      metric_date DATE NOT NULL,
      role ENUM('agent', 'developer', 'private_seller') NOT NULL,
      role_selected INT NOT NULL DEFAULT 0,
      strategy_clicked INT NOT NULL DEFAULT 0,
      strategy_booked INT NOT NULL DEFAULT 0,
      upgrade_started INT NOT NULL DEFAULT 0,
      upgrade_completed INT NOT NULL DEFAULT 0,
      avg_decision_latency_ms DECIMAL(14,2) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uk_daily_funnel_metrics_date_role (metric_date, role),
      KEY idx_daily_funnel_metrics_role (role),
      KEY idx_daily_funnel_metrics_date (metric_date)
    )
  `);
}

async function querySingleValue(db: any, query: any): Promise<number> {
  const result = await db.execute(query);
  const rows = extractRows(result);
  if (!rows.length) return 0;
  const first = rows[0] || {};
  const value = first.value ?? first.total ?? first.count ?? Object.values(first)[0] ?? 0;
  return toNumber(value, 0);
}

async function computeCohortMrrSnapshot(
  db: any,
  role: MetricRole,
  asOfTs: string,
  cohortCreatedBeforeTs: string,
): Promise<number> {
  return querySingleValue(
    db,
    sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN COALESCE(us.billing_interval, 'monthly') = 'yearly' THEN COALESCE(sp.price_zar, 0) / 12
          ELSE COALESCE(sp.price_zar, 0)
        END
      ), 0) AS value
      FROM user_subscriptions us
      INNER JOIN users u ON u.id = us.user_id
      LEFT JOIN subscription_plans sp ON sp.plan_id = us.plan_id
      WHERE ${roleUserCondition(role)}
        AND us.created_at < ${cohortCreatedBeforeTs}
        AND (us.cancelled_at IS NULL OR us.cancelled_at >= ${asOfTs})
        AND us.status IN ('active_paid', 'past_due', 'grace_period')
    `,
  );
}

async function computeMrrSnapshot(db: any, role: MetricRole, asOfTs: string): Promise<number> {
  return querySingleValue(
    db,
    sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN COALESCE(us.billing_interval, 'monthly') = 'yearly' THEN COALESCE(sp.price_zar, 0) / 12
          ELSE COALESCE(sp.price_zar, 0)
        END
      ), 0) AS value
      FROM user_subscriptions us
      INNER JOIN users u ON u.id = us.user_id
      LEFT JOIN subscription_plans sp ON sp.plan_id = us.plan_id
      WHERE ${roleUserCondition(role)}
        AND us.created_at < ${asOfTs}
        AND (us.cancelled_at IS NULL OR us.cancelled_at >= ${asOfTs})
        AND us.status IN ('active_paid', 'past_due', 'grace_period')
    `,
  );
}

async function computeRoleNrrComponents(
  db: any,
  role: MetricRole,
  startTs: string,
  endTs: string,
): Promise<RoleNrrComponents> {
  const [startMrr, endMrr, endExistingMrr] = await Promise.all([
    computeCohortMrrSnapshot(db, role, startTs, startTs),
    computeMrrSnapshot(db, role, endTs),
    computeCohortMrrSnapshot(db, role, endTs, startTs),
  ]);

  const newLogoMrr = Math.max(0, endMrr - endExistingMrr);
  const nrr = startMrr > 0 ? (endExistingMrr / startMrr) * 100 : 100;

  return {
    startMrr,
    endMrr,
    endExistingMrr,
    newLogoMrr,
    nrr,
  };
}

async function computeRoleMetrics(db: any, role: MetricRole, dateKey: string): Promise<RoleMetrics> {
  const { startTs, endTs } = getRangeForDate(dateKey);

  const activeAccounts = await querySingleValue(
    db,
    sql`
      SELECT COUNT(DISTINCT us.user_id) AS value
      FROM user_subscriptions us
      INNER JOIN users u ON u.id = us.user_id
      WHERE ${roleUserCondition(role)}
        AND us.created_at < ${endTs}
        AND (us.cancelled_at IS NULL OR us.cancelled_at >= ${startTs})
        AND us.status IN ('active_paid', 'trial_active', 'past_due', 'grace_period')
    `,
  );

  const newSubscriptions = await querySingleValue(
    db,
    sql`
      SELECT COUNT(DISTINCT se.user_id) AS value
      FROM subscription_events se
      INNER JOIN users u ON u.id = se.user_id
      WHERE ${roleUserCondition(role)}
        AND se.event_type IN ('subscription_created', 'trial_started')
        AND se.created_at >= ${startTs}
        AND se.created_at < ${endTs}
    `,
  );

  const churnedAccounts = await querySingleValue(
    db,
    sql`
      SELECT COUNT(DISTINCT se.user_id) AS value
      FROM subscription_events se
      INNER JOIN users u ON u.id = se.user_id
      WHERE ${roleUserCondition(role)}
        AND se.event_type = 'subscription_cancelled'
        AND se.created_at >= ${startTs}
        AND se.created_at < ${endTs}
    `,
  );

  const expansionRevenue = await querySingleValue(
    db,
    sql`
      SELECT COALESCE(SUM(bt.amount_zar), 0) AS value
      FROM billing_transactions bt
      INNER JOIN users u ON u.id = bt.user_id
      WHERE ${roleUserCondition(role)}
        AND bt.status = 'completed'
        AND bt.transaction_type IN ('upgrade', 'trial_conversion')
        AND bt.created_at >= ${startTs}
        AND bt.created_at < ${endTs}
    `,
  );

  const addOnRevenue = await querySingleValue(
    db,
    sql`
      SELECT COALESCE(SUM(bt.amount_zar), 0) AS value
      FROM billing_transactions bt
      INNER JOIN users u ON u.id = bt.user_id
      WHERE ${roleUserCondition(role)}
        AND bt.status = 'completed'
        AND bt.transaction_type = 'addon_purchase'
        AND bt.created_at >= ${startTs}
        AND bt.created_at < ${endTs}
    `,
  );

  const nrrComponents = await computeRoleNrrComponents(db, role, startTs, endTs);
  const mrrEnd = nrrComponents.endMrr;
  const arpu = activeAccounts > 0 ? mrrEnd / activeAccounts : 0;
  const nrr = nrrComponents.nrr;

  return {
    activeAccounts,
    newSubscriptions,
    churnedAccounts,
    mrr: mrrEnd,
    expansionRevenue,
    addOnRevenue,
    arpu,
    nrr,
  };
}

async function computeUpgradeCounts(db: any, role: MetricRole, dateKey: string) {
  const { startTs, endTs } = getRangeForDate(dateKey);

  const upgradeStarted = await querySingleValue(
    db,
    sql`
      SELECT COUNT(*) AS value
      FROM subscription_events se
      INNER JOIN users u ON u.id = se.user_id
      WHERE ${roleUserCondition(role)}
        AND se.event_type IN ('trial_started', 'subscription_created')
        AND se.created_at >= ${startTs}
        AND se.created_at < ${endTs}
    `,
  );

  const upgradeCompleted = await querySingleValue(
    db,
    sql`
      SELECT COUNT(*) AS value
      FROM subscription_events se
      INNER JOIN users u ON u.id = se.user_id
      WHERE ${roleUserCondition(role)}
        AND se.event_type IN ('subscription_upgraded', 'subscription_created')
        AND se.created_at >= ${startTs}
        AND se.created_at < ${endTs}
    `,
  );

  return { upgradeStarted, upgradeCompleted };
}

async function computeFunnelMetricsFromV2(db: any, role: MetricRole, dateKey: string): Promise<FunnelMetrics> {
  const { startTs, endTs } = getRangeForDate(dateKey);
  const rowsResult = (await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.action')) = 'role_selected' THEN 1 ELSE 0 END), 0) AS roleSelected,
      COALESCE(SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.action')) = 'path_selected'
        AND JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.path')) = 'strategy_call' THEN 1 ELSE 0 END), 0) AS strategyClicked,
      COALESCE(SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.action')) IN ('qualification_submitted', 'calendar_loaded') THEN 1 ELSE 0 END), 0) AS strategyBooked,
      AVG(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.action')) = 'path_selected'
        THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.durationMs')) AS DECIMAL(14,2)) END) AS avgDecisionLatencyMs
    FROM analytics_events
    WHERE event_type = 'funnel_step'
      AND event_timestamp >= ${startTs}
      AND event_timestamp < ${endTs}
      AND JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.role')) = ${role}
  `)) as any;
  const rows = extractRows(rowsResult);
  const first = rows[0] || {};
  const upgrades = await computeUpgradeCounts(db, role, dateKey);

  return {
    roleSelected: toNumber(first.roleSelected, 0),
    strategyClicked: toNumber(first.strategyClicked, 0),
    strategyBooked: toNumber(first.strategyBooked, 0),
    upgradeStarted: upgrades.upgradeStarted,
    upgradeCompleted: upgrades.upgradeCompleted,
    avgDecisionLatencyMs:
      first.avgDecisionLatencyMs === null || first.avgDecisionLatencyMs === undefined
        ? null
        : toNumber(first.avgDecisionLatencyMs, 0),
  };
}

async function computeFunnelMetricsFromLegacy(
  db: any,
  role: MetricRole,
  dateKey: string,
): Promise<FunnelMetrics> {
  const { startTs, endTs } = getRangeForDate(dateKey);
  const rowsResult = (await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.action')) = 'role_selected' THEN 1 ELSE 0 END), 0) AS roleSelected,
      COALESCE(SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.action')) = 'path_selected'
        AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.path')) = 'strategy_call' THEN 1 ELSE 0 END), 0) AS strategyClicked,
      COALESCE(SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.action')) IN ('qualification_submitted', 'calendar_loaded') THEN 1 ELSE 0 END), 0) AS strategyBooked,
      AVG(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.action')) = 'path_selected'
        THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.durationMs')) AS DECIMAL(14,2)) END) AS avgDecisionLatencyMs
    FROM analytics_events
    WHERE event_type = 'funnel_step'
      AND created_at >= ${startTs}
      AND created_at < ${endTs}
      AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.role')) = ${role}
  `)) as any;
  const rows = extractRows(rowsResult);
  const first = rows[0] || {};
  const upgrades = await computeUpgradeCounts(db, role, dateKey);

  return {
    roleSelected: toNumber(first.roleSelected, 0),
    strategyClicked: toNumber(first.strategyClicked, 0),
    strategyBooked: toNumber(first.strategyBooked, 0),
    upgradeStarted: upgrades.upgradeStarted,
    upgradeCompleted: upgrades.upgradeCompleted,
    avgDecisionLatencyMs:
      first.avgDecisionLatencyMs === null || first.avgDecisionLatencyMs === undefined
        ? null
        : toNumber(first.avgDecisionLatencyMs, 0),
  };
}

async function computeFunnelMetrics(db: any, role: MetricRole, dateKey: string): Promise<FunnelMetrics> {
  try {
    return await computeFunnelMetricsFromV2(db, role, dateKey);
  } catch {
    return computeFunnelMetricsFromLegacy(db, role, dateKey);
  }
}

export async function runDailyKpiRollup(targetDate?: string | Date) {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') {
    return { ok: false, reason: 'Database unavailable' };
  }

  await ensureRollupTables(db);
  const dateKey = toDateKey(targetDate);

  for (const role of ROLES) {
    const roleMetrics = await computeRoleMetrics(db, role, dateKey);
    const funnelMetrics = await computeFunnelMetrics(db, role, dateKey);

    await db.execute(sql`
      INSERT INTO daily_role_metrics (
        metric_date,
        role,
        active_accounts,
        new_subscriptions,
        churned_accounts,
        mrr,
        expansion_revenue,
        add_on_revenue,
        arpu,
        nrr
      )
      VALUES (
        ${dateKey},
        ${role},
        ${roleMetrics.activeAccounts},
        ${roleMetrics.newSubscriptions},
        ${roleMetrics.churnedAccounts},
        ${roleMetrics.mrr.toFixed(2)},
        ${roleMetrics.expansionRevenue.toFixed(2)},
        ${roleMetrics.addOnRevenue.toFixed(2)},
        ${roleMetrics.arpu.toFixed(2)},
        ${roleMetrics.nrr.toFixed(2)}
      )
      ON DUPLICATE KEY UPDATE
        active_accounts = VALUES(active_accounts),
        new_subscriptions = VALUES(new_subscriptions),
        churned_accounts = VALUES(churned_accounts),
        mrr = VALUES(mrr),
        expansion_revenue = VALUES(expansion_revenue),
        add_on_revenue = VALUES(add_on_revenue),
        arpu = VALUES(arpu),
        nrr = VALUES(nrr),
        updated_at = CURRENT_TIMESTAMP(3)
    `);

    await db.execute(sql`
      INSERT INTO daily_funnel_metrics (
        metric_date,
        role,
        role_selected,
        strategy_clicked,
        strategy_booked,
        upgrade_started,
        upgrade_completed,
        avg_decision_latency_ms
      )
      VALUES (
        ${dateKey},
        ${role},
        ${funnelMetrics.roleSelected},
        ${funnelMetrics.strategyClicked},
        ${funnelMetrics.strategyBooked},
        ${funnelMetrics.upgradeStarted},
        ${funnelMetrics.upgradeCompleted},
        ${funnelMetrics.avgDecisionLatencyMs}
      )
      ON DUPLICATE KEY UPDATE
        role_selected = VALUES(role_selected),
        strategy_clicked = VALUES(strategy_clicked),
        strategy_booked = VALUES(strategy_booked),
        upgrade_started = VALUES(upgrade_started),
        upgrade_completed = VALUES(upgrade_completed),
        avg_decision_latency_ms = VALUES(avg_decision_latency_ms),
        updated_at = CURRENT_TIMESTAMP(3)
    `);
  }

  return { ok: true, date: dateKey };
}

export async function runKpiRollupRange(fromDate: string, toDate: string) {
  const from = toDateKey(fromDate);
  const to = toDateKey(toDate);
  let cursor = from;
  const rolled: string[] = [];
  const failed: Array<{ date: string; reason: string }> = [];

  while (cursor <= to) {
    const result = await runDailyKpiRollup(cursor);
    if (result.ok) {
      rolled.push(cursor);
    } else {
      failed.push({
        date: cursor,
        reason: String((result as any)?.reason || 'Unknown rollup failure'),
      });
    }
    cursor = addDays(cursor, 1);
  }

  return {
    ok: failed.length === 0,
    rolledDates: rolled,
    failedDates: failed,
  };
}

type RoleSummary = {
  role: MetricRole;
  startActiveAccounts: number;
  activeAccounts: number;
  newSubscriptions: number;
  churnedAccounts: number;
  mrr: number;
  arpu: number;
  nrr: number;
  nrrStartMrr: number;
  nrrEndExistingMrr: number;
  newLogoMrr: number;
  retentionRate: number;
  expansionRevenue: number;
  addOnRevenue: number;
  addOnAdoptionRate: number;
};

function emptyRoleSummary(role: MetricRole): RoleSummary {
  return {
    role,
    startActiveAccounts: 0,
    activeAccounts: 0,
    newSubscriptions: 0,
    churnedAccounts: 0,
    mrr: 0,
    arpu: 0,
    nrr: 100,
    nrrStartMrr: 0,
    nrrEndExistingMrr: 0,
    newLogoMrr: 0,
    retentionRate: 100,
    expansionRevenue: 0,
    addOnRevenue: 0,
    addOnAdoptionRate: 0,
  };
}

export async function getKpiSummary(fromDate: string, toDate: string) {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') {
    return {
      version: 'v1',
      from: toDateKey(fromDate),
      to: toDateKey(toDate),
      generatedAt: new Date().toISOString(),
      roles: ROLES.map(role => emptyRoleSummary(role)),
    };
  }

  await ensureRollupTables(db);
  const from = toDateKey(fromDate);
  const to = toDateKey(toDate);
  const rangeStartTs = `${from} 00:00:00`;
  const rangeEndTs = `${addDays(to, 1)} 00:00:00`;

  const rowsResult = (await db.execute(sql`
    SELECT
      metric_date AS metricDate,
      role,
      active_accounts AS activeAccounts,
      new_subscriptions AS newSubscriptions,
      churned_accounts AS churnedAccounts,
      mrr,
      expansion_revenue AS expansionRevenue,
      add_on_revenue AS addOnRevenue,
      arpu,
      nrr
    FROM daily_role_metrics
    WHERE metric_date >= ${from}
      AND metric_date <= ${to}
    ORDER BY metric_date ASC
  `)) as any;
  const rows = extractRows(rowsResult);

  const addOnRowsResult = (await db.execute(sql`
    SELECT
      u.role AS userRole,
      COUNT(DISTINCT bt.user_id) AS buyers
    FROM billing_transactions bt
    INNER JOIN users u ON u.id = bt.user_id
    WHERE bt.status = 'completed'
      AND bt.transaction_type = 'addon_purchase'
      AND bt.created_at >= ${`${from} 00:00:00`}
      AND bt.created_at < ${`${addDays(to, 1)} 00:00:00`}
    GROUP BY u.role
  `)) as any;
  const addOnRows = extractRows(addOnRowsResult);

  const addOnBuyersByRole: Record<MetricRole, number> = {
    agent: 0,
    developer: 0,
    private_seller: 0,
  };
  for (const row of addOnRows) {
    const userRole = String(row.userRole || '');
    const buyers = toNumber(row.buyers, 0);
    if (userRole === 'property_developer') addOnBuyersByRole.developer += buyers;
    else if (userRole === 'agent' || userRole === 'agency_admin') addOnBuyersByRole.agent += buyers;
    else addOnBuyersByRole.private_seller += buyers;
  }

  const grouped = new Map<MetricRole, any[]>();
  for (const role of ROLES) grouped.set(role, []);
  for (const row of rows) {
    const role = String(row.role) as MetricRole;
    if (!grouped.has(role)) continue;
    grouped.get(role)!.push(row);
  }

  const nrrByRole: Record<MetricRole, RoleNrrComponents> = {
    agent: { startMrr: 0, endMrr: 0, endExistingMrr: 0, newLogoMrr: 0, nrr: 100 },
    developer: { startMrr: 0, endMrr: 0, endExistingMrr: 0, newLogoMrr: 0, nrr: 100 },
    private_seller: { startMrr: 0, endMrr: 0, endExistingMrr: 0, newLogoMrr: 0, nrr: 100 },
  };

  for (const role of ROLES) {
    nrrByRole[role] = await computeRoleNrrComponents(db, role, rangeStartTs, rangeEndTs);
  }

  const summaries: RoleSummary[] = ROLES.map(role => {
    const roleRows = grouped.get(role) || [];
    if (!roleRows.length) return emptyRoleSummary(role);

    const first = roleRows[0];
    const last = roleRows[roleRows.length - 1];
    const churnedAccounts = roleRows.reduce((sum, row) => sum + toNumber(row.churnedAccounts, 0), 0);
    const newSubscriptions = roleRows.reduce((sum, row) => sum + toNumber(row.newSubscriptions, 0), 0);
    const expansionRevenue = roleRows.reduce((sum, row) => sum + toNumber(row.expansionRevenue, 0), 0);
    const addOnRevenue = roleRows.reduce((sum, row) => sum + toNumber(row.addOnRevenue, 0), 0);
    const startActive = toNumber(first.activeAccounts, 0);
    const endActive = toNumber(last.activeAccounts, 0);
    const endMrr = nrrByRole[role].endMrr;
    const nrrStartMrr = nrrByRole[role].startMrr;
    const nrrEndExistingMrr = nrrByRole[role].endExistingMrr;
    const newLogoMrr = nrrByRole[role].newLogoMrr;
    const arpu = endActive > 0 ? endMrr / endActive : 0;
    const nrr = nrrByRole[role].nrr;
    const retentionRate = startActive > 0 ? Math.max(0, ((startActive - churnedAccounts) / startActive) * 100) : 100;
    const addOnAdoptionRate = endActive > 0 ? (addOnBuyersByRole[role] / endActive) * 100 : 0;

    return {
      role,
      startActiveAccounts: startActive,
      activeAccounts: endActive,
      newSubscriptions,
      churnedAccounts,
      mrr: endMrr,
      arpu,
      nrr,
      nrrStartMrr,
      nrrEndExistingMrr,
      newLogoMrr,
      retentionRate,
      expansionRevenue,
      addOnRevenue,
      addOnAdoptionRate,
    };
  });

  const totalStartActive = summaries.reduce((sum, row) => sum + row.startActiveAccounts, 0);
  const totalEndActive = summaries.reduce((sum, row) => sum + row.activeAccounts, 0);
  const totalChurned = summaries.reduce((sum, row) => sum + row.churnedAccounts, 0);
  const totalMrr = summaries.reduce((sum, row) => sum + row.mrr, 0);
  const totalExpansionRevenue = summaries.reduce((sum, row) => sum + row.expansionRevenue, 0);
  const totalAddOnRevenue = summaries.reduce((sum, row) => sum + row.addOnRevenue, 0);
  const totalNrrStartMrr = summaries.reduce((sum, row) => sum + row.nrrStartMrr, 0);
  const totalNrrEndExistingMrr = summaries.reduce((sum, row) => sum + row.nrrEndExistingMrr, 0);
  const totalNewLogoMrr = summaries.reduce((sum, row) => sum + row.newLogoMrr, 0);
  const totalAddOnBuyers = ROLES.reduce((sum, role) => sum + toNumber(addOnBuyersByRole[role], 0), 0);
  const totalArpu = totalEndActive > 0 ? totalMrr / totalEndActive : 0;
  const totalNrr = totalNrrStartMrr > 0 ? (totalNrrEndExistingMrr / totalNrrStartMrr) * 100 : 100;
  const totalRetentionRate =
    totalStartActive > 0 ? Math.max(0, ((totalStartActive - totalChurned) / totalStartActive) * 100) : 100;
  const totalAddOnAdoptionRate = totalEndActive > 0 ? (totalAddOnBuyers / totalEndActive) * 100 : 0;

  return {
    version: 'v1',
    from,
    to,
    generatedAt: new Date().toISOString(),
    roles: summaries,
    totals: {
      startActiveAccounts: totalStartActive,
      activeAccounts: totalEndActive,
      mrr: totalMrr,
      arpu: totalArpu,
      nrr: totalNrr,
      nrrStartMrr: totalNrrStartMrr,
      nrrEndExistingMrr: totalNrrEndExistingMrr,
      newLogoMrr: totalNewLogoMrr,
      retentionRate: totalRetentionRate,
      expansionRevenue: totalExpansionRevenue,
      addOnRevenue: totalAddOnRevenue,
      addOnAdoptionRate: totalAddOnAdoptionRate,
    },
  };
}

export async function getKpiFunnelSummary(fromDate: string, toDate: string) {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') {
    return {
      version: 'v1',
      from: toDateKey(fromDate),
      to: toDateKey(toDate),
      generatedAt: new Date().toISOString(),
      roles: ROLES.map(role => ({
        role,
        roleSelected: 0,
        strategyClicked: 0,
        strategyBooked: 0,
        upgradeStarted: 0,
        upgradeCompleted: 0,
        avgDecisionLatencyMs: null,
      })),
    };
  }

  await ensureRollupTables(db);
  const from = toDateKey(fromDate);
  const to = toDateKey(toDate);

  const rowsResult = (await db.execute(sql`
    SELECT
      role,
      role_selected AS roleSelected,
      strategy_clicked AS strategyClicked,
      strategy_booked AS strategyBooked,
      upgrade_started AS upgradeStarted,
      upgrade_completed AS upgradeCompleted,
      avg_decision_latency_ms AS avgDecisionLatencyMs
    FROM daily_funnel_metrics
    WHERE metric_date >= ${from}
      AND metric_date <= ${to}
  `)) as any;
  const rows = extractRows(rowsResult);

  const grouped = new Map<MetricRole, any[]>();
  for (const role of ROLES) grouped.set(role, []);
  for (const row of rows) {
    const role = String(row.role) as MetricRole;
    if (!grouped.has(role)) continue;
    grouped.get(role)!.push(row);
  }

  const summaries = ROLES.map(role => {
    const roleRows = grouped.get(role) || [];
    if (!roleRows.length) {
      return {
        role,
        roleSelected: 0,
        strategyClicked: 0,
        strategyBooked: 0,
        upgradeStarted: 0,
        upgradeCompleted: 0,
        avgDecisionLatencyMs: null,
      };
    }

    const roleSelected = roleRows.reduce((sum, row) => sum + toNumber(row.roleSelected, 0), 0);
    const strategyClicked = roleRows.reduce((sum, row) => sum + toNumber(row.strategyClicked, 0), 0);
    const strategyBooked = roleRows.reduce((sum, row) => sum + toNumber(row.strategyBooked, 0), 0);
    const upgradeStarted = roleRows.reduce((sum, row) => sum + toNumber(row.upgradeStarted, 0), 0);
    const upgradeCompleted = roleRows.reduce((sum, row) => sum + toNumber(row.upgradeCompleted, 0), 0);

    const weightedLatency = roleRows.reduce(
      (acc, row) => {
        const latency = row.avgDecisionLatencyMs === null ? null : toNumber(row.avgDecisionLatencyMs, 0);
        const weight = Math.max(1, toNumber(row.roleSelected, 0));
        if (latency === null) return acc;
        return {
          sum: acc.sum + latency * weight,
          weight: acc.weight + weight,
        };
      },
      { sum: 0, weight: 0 },
    );

    const avgDecisionLatencyMs =
      weightedLatency.weight > 0 ? Number((weightedLatency.sum / weightedLatency.weight).toFixed(2)) : null;

    return {
      role,
      roleSelected,
      strategyClicked,
      strategyBooked,
      upgradeStarted,
      upgradeCompleted,
      avgDecisionLatencyMs,
    };
  });

  return {
    version: 'v1',
    from,
    to,
    generatedAt: new Date().toISOString(),
    roles: summaries,
  };
}

function toFixedNumber(value: number, decimals = 2) {
  return Number((Number(value || 0)).toFixed(decimals));
}

export async function getKpiReconciliation(targetDate?: string | Date) {
  const db = await getDb();
  const date = toDateKey(targetDate);

  if (!db || typeof db.execute !== 'function') {
    return {
      version: 'v1',
      date,
      generatedAt: new Date().toISOString(),
      roles: ROLES.map(role => ({
        role,
        raw: null,
        rollup: null,
        variance: null,
        isMatch: false,
      })),
    };
  }

  await ensureRollupTables(db);

  const [roleRollupResult, funnelRollupResult] = await Promise.all([
    db.execute(sql`
      SELECT
        role,
        active_accounts AS activeAccounts,
        new_subscriptions AS newSubscriptions,
        churned_accounts AS churnedAccounts,
        mrr,
        expansion_revenue AS expansionRevenue,
        add_on_revenue AS addOnRevenue,
        arpu,
        nrr
      FROM daily_role_metrics
      WHERE metric_date = ${date}
    `),
    db.execute(sql`
      SELECT
        role,
        role_selected AS roleSelected,
        strategy_clicked AS strategyClicked,
        strategy_booked AS strategyBooked,
        upgrade_started AS upgradeStarted,
        upgrade_completed AS upgradeCompleted,
        avg_decision_latency_ms AS avgDecisionLatencyMs
      FROM daily_funnel_metrics
      WHERE metric_date = ${date}
    `),
  ]);

  const roleRollupRows = extractRows(roleRollupResult);
  const funnelRollupRows = extractRows(funnelRollupResult);
  const roleRollupByRole = new Map<string, any>();
  const funnelRollupByRole = new Map<string, any>();

  for (const row of roleRollupRows) roleRollupByRole.set(String(row.role), row);
  for (const row of funnelRollupRows) funnelRollupByRole.set(String(row.role), row);

  const roles: any[] = [];
  for (const role of ROLES) {
    const rawRole = await computeRoleMetrics(db, role, date);
    const rawFunnel = await computeFunnelMetrics(db, role, date);
    const rollupRole = roleRollupByRole.get(role) || null;
    const rollupFunnel = funnelRollupByRole.get(role) || null;

    const variance = {
      activeAccounts: toFixedNumber(
        (rollupRole ? toNumber(rollupRole.activeAccounts, 0) : 0) - rawRole.activeAccounts,
        0,
      ),
      newSubscriptions: toFixedNumber(
        (rollupRole ? toNumber(rollupRole.newSubscriptions, 0) : 0) - rawRole.newSubscriptions,
        0,
      ),
      churnedAccounts: toFixedNumber(
        (rollupRole ? toNumber(rollupRole.churnedAccounts, 0) : 0) - rawRole.churnedAccounts,
        0,
      ),
      mrr: toFixedNumber((rollupRole ? toNumber(rollupRole.mrr, 0) : 0) - rawRole.mrr),
      nrr: toFixedNumber((rollupRole ? toNumber(rollupRole.nrr, 0) : 0) - rawRole.nrr),
      roleSelected: toFixedNumber(
        (rollupFunnel ? toNumber(rollupFunnel.roleSelected, 0) : 0) - rawFunnel.roleSelected,
        0,
      ),
      strategyBooked: toFixedNumber(
        (rollupFunnel ? toNumber(rollupFunnel.strategyBooked, 0) : 0) - rawFunnel.strategyBooked,
        0,
      ),
      avgDecisionLatencyMs: toFixedNumber(
        (rollupFunnel && rollupFunnel.avgDecisionLatencyMs !== null
          ? toNumber(rollupFunnel.avgDecisionLatencyMs, 0)
          : 0) - (rawFunnel.avgDecisionLatencyMs === null ? 0 : toNumber(rawFunnel.avgDecisionLatencyMs, 0)),
      ),
    };

    const isMatch =
      Math.abs(variance.activeAccounts) === 0 &&
      Math.abs(variance.newSubscriptions) === 0 &&
      Math.abs(variance.churnedAccounts) === 0 &&
      Math.abs(variance.roleSelected) === 0 &&
      Math.abs(variance.strategyBooked) === 0 &&
      Math.abs(variance.mrr) < 0.01 &&
      Math.abs(variance.nrr) < 0.01 &&
      Math.abs(variance.avgDecisionLatencyMs) < 0.01;

    roles.push({
      role,
      raw: {
        ...rawRole,
        ...rawFunnel,
      },
      rollup: {
        activeAccounts: rollupRole ? toNumber(rollupRole.activeAccounts, 0) : null,
        newSubscriptions: rollupRole ? toNumber(rollupRole.newSubscriptions, 0) : null,
        churnedAccounts: rollupRole ? toNumber(rollupRole.churnedAccounts, 0) : null,
        mrr: rollupRole ? toNumber(rollupRole.mrr, 0) : null,
        expansionRevenue: rollupRole ? toNumber(rollupRole.expansionRevenue, 0) : null,
        addOnRevenue: rollupRole ? toNumber(rollupRole.addOnRevenue, 0) : null,
        arpu: rollupRole ? toNumber(rollupRole.arpu, 0) : null,
        nrr: rollupRole ? toNumber(rollupRole.nrr, 0) : null,
        roleSelected: rollupFunnel ? toNumber(rollupFunnel.roleSelected, 0) : null,
        strategyClicked: rollupFunnel ? toNumber(rollupFunnel.strategyClicked, 0) : null,
        strategyBooked: rollupFunnel ? toNumber(rollupFunnel.strategyBooked, 0) : null,
        upgradeStarted: rollupFunnel ? toNumber(rollupFunnel.upgradeStarted, 0) : null,
        upgradeCompleted: rollupFunnel ? toNumber(rollupFunnel.upgradeCompleted, 0) : null,
        avgDecisionLatencyMs:
          rollupFunnel && rollupFunnel.avgDecisionLatencyMs !== null
            ? toNumber(rollupFunnel.avgDecisionLatencyMs, 0)
            : null,
      },
      variance,
      isMatch,
    });
  }

  return {
    version: 'v1',
    date,
    generatedAt: new Date().toISOString(),
    roles,
  };
}

export function startKpiRollupScheduler(): boolean {
  if (!isKpiRollupSchedulerEnabled()) {
    return false;
  }

  if (schedulerHandle) return true;

  const runScheduled = async () => {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const runKey = `${now.toISOString().slice(0, 10)}T${String(hour).padStart(2, '0')}:${String(
      minute,
    ).padStart(2, '0')}Z`;

    if (hour === 2 && minute === 0 && lastScheduledRunKey !== runKey) {
      lastScheduledRunKey = runKey;
      const target = new Date(now);
      target.setUTCDate(target.getUTCDate() - 1);
      const dateKey = target.toISOString().slice(0, 10);
      try {
        const result = await runDailyKpiRollup(dateKey);
        if (result.ok) {
          console.log(`[KPI Rollup] Scheduled rollup completed for ${dateKey}`);
        } else {
          console.warn('[KPI Rollup] Scheduled rollup skipped:', result);
        }
      } catch (error) {
        console.error('[KPI Rollup] Scheduled rollup failed:', error);
      }
    }
  };

  schedulerHandle = setInterval(runScheduled, SCHEDULER_INTERVAL_MS);
  schedulerHandle.unref?.();

  // Startup backfill for yesterday (safe to rerun due idempotent upsert)
  setTimeout(async () => {
    const target = new Date();
    target.setUTCDate(target.getUTCDate() - 1);
    const dateKey = target.toISOString().slice(0, 10);
    try {
      const result = await runDailyKpiRollup(dateKey);
      if (result.ok) {
        console.log(`[KPI Rollup] Startup rollup completed for ${dateKey}`);
      }
    } catch (error) {
      console.error('[KPI Rollup] Startup rollup failed:', error);
    }
  }, 10_000);

  return true;
}
