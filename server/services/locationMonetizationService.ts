import { createHash } from 'crypto';
import { sql } from 'drizzle-orm';
import { getDb } from '../db';

export type LocationType = 'province' | 'city' | 'suburb';
export type TargetType = 'hero_ad' | 'featured_developer' | 'recommended_agent' | 'geo_listing';
export type RuleStatus = 'active' | 'scheduled' | 'expired' | 'paused';
export type EventType = 'served' | 'click' | 'lead';
export type EventContextType = 'hero' | 'developer' | 'agent' | 'listing' | 'feed' | 'unknown';

type DbLike = {
  execute: (query: any) => Promise<any>;
};

type RuleRow = {
  id: number;
  targetType: TargetType;
  targetId: number;
  locationType: LocationType;
  locationId: number;
  ranking: number;
  status: RuleStatus;
  metadata: any;
  startDate: string | null;
  endDate: string | null;
  dailyImpressionCap: number;
  totalImpressionCap: number;
  pacingMinutes: number;
  lastServedAt: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

type RuleUsageStats = {
  servedToday: number;
  servedTotal: number;
  lastServedAt: string | null;
};

export type EligibleRule = RuleRow & {
  usage: RuleUsageStats;
  sponsoredLabel: 'Sponsored';
};

type CreateRuleInput = {
  targetType: TargetType;
  targetId: number;
  locationType: LocationType;
  locationId: number;
  ranking?: number;
  status?: RuleStatus;
  metadata?: any;
  startDate?: string | null;
  endDate?: string | null;
  dailyImpressionCap?: number;
  totalImpressionCap?: number;
  pacingMinutes?: number;
  createdBy?: number | null;
};

type UpdateRuleControlsInput = {
  ranking?: number;
  status?: RuleStatus;
  metadata?: any;
  startDate?: string | null;
  endDate?: string | null;
  dailyImpressionCap?: number;
  totalImpressionCap?: number;
  pacingMinutes?: number;
};

type EligibleRulesInput = {
  targetType: TargetType;
  locationType: LocationType;
  locationId: number;
  limit?: number;
  requestId?: string;
  userId?: number | null;
  sessionKey?: string | null;
  recordServe?: boolean;
  contextType?: EventContextType;
  contextId?: number | null;
};

type RecordEventInput = {
  ruleId: number;
  eventType: EventType;
  contextType?: EventContextType;
  contextId?: number | null;
  locationType?: LocationType | null;
  locationId?: number | null;
  userId?: number | null;
  requestId?: string | null;
  sessionKey?: string | null;
  metadata?: Record<string, any> | null;
};

type RuleDailyStatsDelta = {
  metricDate: string;
  ruleId: number;
  opportunities: number;
  eligiblePasses: number;
  servedCount: number;
  blockedSchedule: number;
  blockedDailyCap: number;
  blockedTotalCap: number;
  blockedPacing: number;
};

type SurfaceDemandDelta = {
  metricDate: string;
  surfaceType: EventContextType;
  targetType: TargetType;
  locationType: LocationType;
  locationId: number;
  requests: number;
  opportunitySlots: number;
  inventorySlots: number;
  eligibleSlots: number;
  servedSlots: number;
  blockedConfigSlots: number;
  unfilledSlots: number;
};

let tablesEnsured = false;

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

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseJson(value: unknown): any {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function toMySqlDateTime(input?: string | null): string | null {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function nowMySqlDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function utcDateOnly(value?: Date): string {
  return (value || new Date()).toISOString().slice(0, 10);
}

function hashSessionKey(parts: Array<string | number | undefined | null>): string {
  const raw = parts.map(v => String(v ?? '')).join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 64);
}

function isInScheduleWindow(rule: RuleRow, now: Date): boolean {
  const start = rule.startDate ? new Date(rule.startDate) : null;
  const end = rule.endDate ? new Date(rule.endDate) : null;

  if (start && !Number.isNaN(start.getTime()) && now < start) return false;
  if (end && !Number.isNaN(end.getTime()) && now > end) return false;
  return true;
}

function getRuleLimit(rule: RuleRow, key: 'dailyImpressionCap' | 'totalImpressionCap' | 'pacingMinutes'): number {
  const metadata = parseJson(rule.metadata);
  const fromColumn = toNumber((rule as any)[key], 0);
  if (fromColumn > 0) return fromColumn;
  const fromMetadata = toNumber((metadata as any)?.[key], 0);
  return fromMetadata > 0 ? fromMetadata : 0;
}

function normalizeRuleRow(row: any): RuleRow {
  return {
    id: toNumber(row.id),
    targetType: String(row.targetType) as TargetType,
    targetId: toNumber(row.targetId),
    locationType: String(row.locationType) as LocationType,
    locationId: toNumber(row.locationId),
    ranking: clamp(toNumber(row.ranking, 0), 0, 100),
    status: String(row.status || 'scheduled') as RuleStatus,
    metadata: parseJson(row.metadata),
    startDate: row.startDate ? String(row.startDate) : null,
    endDate: row.endDate ? String(row.endDate) : null,
    dailyImpressionCap: Math.max(0, toNumber(row.dailyImpressionCap, 0)),
    totalImpressionCap: Math.max(0, toNumber(row.totalImpressionCap, 0)),
    pacingMinutes: Math.max(0, toNumber(row.pacingMinutes, 0)),
    lastServedAt: row.lastServedAt ? String(row.lastServedAt) : null,
    createdBy: row.createdBy === null ? null : toNumber(row.createdBy, 0),
    createdAt: row.createdAt ? String(row.createdAt) : nowMySqlDateTime(),
    updatedAt: row.updatedAt ? String(row.updatedAt) : nowMySqlDateTime(),
  };
}

async function ensureTables(db: DbLike) {
  if (tablesEnsured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS location_targeting_rules (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      target_type ENUM('hero_ad', 'featured_developer', 'recommended_agent', 'geo_listing') NOT NULL,
      target_id BIGINT NOT NULL,
      location_type ENUM('province', 'city', 'suburb') NOT NULL,
      location_id BIGINT NOT NULL,
      ranking INT NOT NULL DEFAULT 0,
      status ENUM('active', 'scheduled', 'expired', 'paused') NOT NULL DEFAULT 'scheduled',
      metadata JSON NULL,
      start_date DATETIME(3) NULL,
      end_date DATETIME(3) NULL,
      daily_impression_cap INT NOT NULL DEFAULT 0,
      total_impression_cap INT NOT NULL DEFAULT 0,
      pacing_minutes INT NOT NULL DEFAULT 0,
      last_served_at DATETIME(3) NULL,
      created_by BIGINT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      KEY idx_ltr_lookup (target_type, location_type, location_id, status, ranking),
      KEY idx_ltr_schedule (status, start_date, end_date),
      KEY idx_ltr_target (target_type, target_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS location_targeting_events (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      rule_id BIGINT NOT NULL,
      event_type ENUM('served', 'click', 'lead') NOT NULL,
      context_type ENUM('hero', 'developer', 'agent', 'listing', 'feed', 'unknown') NOT NULL DEFAULT 'unknown',
      context_id BIGINT NULL,
      location_type ENUM('province', 'city', 'suburb') NULL,
      location_id BIGINT NULL,
      user_id BIGINT NULL,
      request_id VARCHAR(64) NULL,
      session_key VARCHAR(128) NULL,
      metadata JSON NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_lte_rule_event_date (rule_id, event_type, created_at),
      KEY idx_lte_context (context_type, context_id, created_at),
      KEY idx_lte_location (location_type, location_id, created_at)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS location_targeting_rule_daily_stats (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      metric_date DATE NOT NULL,
      rule_id BIGINT NOT NULL,
      opportunities INT NOT NULL DEFAULT 0,
      eligible_passes INT NOT NULL DEFAULT 0,
      served_count INT NOT NULL DEFAULT 0,
      blocked_schedule INT NOT NULL DEFAULT 0,
      blocked_daily_cap INT NOT NULL DEFAULT 0,
      blocked_total_cap INT NOT NULL DEFAULT 0,
      blocked_pacing INT NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uk_ltrds_date_rule (metric_date, rule_id),
      KEY idx_ltrds_rule_date (rule_id, metric_date)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS opportunities_by_surface_by_day (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      metric_date DATE NOT NULL,
      surface_type ENUM('hero', 'developer', 'agent', 'listing', 'feed', 'unknown') NOT NULL,
      target_type ENUM('hero_ad', 'featured_developer', 'recommended_agent', 'geo_listing') NOT NULL,
      location_type ENUM('province', 'city', 'suburb') NOT NULL,
      location_id BIGINT NOT NULL,
      requests INT NOT NULL DEFAULT 0,
      opportunity_slots INT NOT NULL DEFAULT 0,
      inventory_slots INT NOT NULL DEFAULT 0,
      eligible_slots INT NOT NULL DEFAULT 0,
      served_slots INT NOT NULL DEFAULT 0,
      blocked_config_slots INT NOT NULL DEFAULT 0,
      unfilled_slots INT NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uk_obsd_day_surface (metric_date, surface_type, target_type, location_type, location_id),
      KEY idx_obsd_surface_day (surface_type, metric_date),
      KEY idx_obsd_location_day (location_type, location_id, metric_date)
    )
  `);

  tablesEnsured = true;
}

async function upsertRuleDailyStats(db: DbLike, deltas: RuleDailyStatsDelta[]) {
  if (!deltas.length) return;

  const merged = new Map<string, RuleDailyStatsDelta>();
  for (const item of deltas) {
    const key = `${item.metricDate}|${item.ruleId}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...item });
      continue;
    }
    existing.opportunities += item.opportunities;
    existing.eligiblePasses += item.eligiblePasses;
    existing.servedCount += item.servedCount;
    existing.blockedSchedule += item.blockedSchedule;
    existing.blockedDailyCap += item.blockedDailyCap;
    existing.blockedTotalCap += item.blockedTotalCap;
    existing.blockedPacing += item.blockedPacing;
  }

  const rows = Array.from(merged.values());
  const now = nowMySqlDateTime();
  const values = rows.map(row => sql`(
      ${row.metricDate},
      ${row.ruleId},
      ${row.opportunities},
      ${row.eligiblePasses},
      ${row.servedCount},
      ${row.blockedSchedule},
      ${row.blockedDailyCap},
      ${row.blockedTotalCap},
      ${row.blockedPacing},
      ${now},
      ${now}
    )`);

  await db.execute(sql`
    INSERT INTO location_targeting_rule_daily_stats (
      metric_date,
      rule_id,
      opportunities,
      eligible_passes,
      served_count,
      blocked_schedule,
      blocked_daily_cap,
      blocked_total_cap,
      blocked_pacing,
      created_at,
      updated_at
    )
    VALUES ${sql.join(values, sql`, `)}
    ON DUPLICATE KEY UPDATE
      opportunities = opportunities + VALUES(opportunities),
      eligible_passes = eligible_passes + VALUES(eligible_passes),
      served_count = served_count + VALUES(served_count),
      blocked_schedule = blocked_schedule + VALUES(blocked_schedule),
      blocked_daily_cap = blocked_daily_cap + VALUES(blocked_daily_cap),
      blocked_total_cap = blocked_total_cap + VALUES(blocked_total_cap),
      blocked_pacing = blocked_pacing + VALUES(blocked_pacing),
      updated_at = VALUES(updated_at)
  `);
}

async function upsertSurfaceDemandStats(db: DbLike, deltas: SurfaceDemandDelta[]) {
  if (!deltas.length) return;

  const merged = new Map<string, SurfaceDemandDelta>();
  for (const item of deltas) {
    const key = `${item.metricDate}|${item.surfaceType}|${item.targetType}|${item.locationType}|${item.locationId}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...item });
      continue;
    }
    existing.requests += item.requests;
    existing.opportunitySlots += item.opportunitySlots;
    existing.inventorySlots += item.inventorySlots;
    existing.eligibleSlots += item.eligibleSlots;
    existing.servedSlots += item.servedSlots;
    existing.blockedConfigSlots += item.blockedConfigSlots;
    existing.unfilledSlots += item.unfilledSlots;
  }

  const rows = Array.from(merged.values());
  const now = nowMySqlDateTime();
  const values = rows.map(row => sql`(
      ${row.metricDate},
      ${row.surfaceType},
      ${row.targetType},
      ${row.locationType},
      ${row.locationId},
      ${row.requests},
      ${row.opportunitySlots},
      ${row.inventorySlots},
      ${row.eligibleSlots},
      ${row.servedSlots},
      ${row.blockedConfigSlots},
      ${row.unfilledSlots},
      ${now},
      ${now}
    )`);

  await db.execute(sql`
    INSERT INTO opportunities_by_surface_by_day (
      metric_date,
      surface_type,
      target_type,
      location_type,
      location_id,
      requests,
      opportunity_slots,
      inventory_slots,
      eligible_slots,
      served_slots,
      blocked_config_slots,
      unfilled_slots,
      created_at,
      updated_at
    )
    VALUES ${sql.join(values, sql`, `)}
    ON DUPLICATE KEY UPDATE
      requests = requests + VALUES(requests),
      opportunity_slots = opportunity_slots + VALUES(opportunity_slots),
      inventory_slots = inventory_slots + VALUES(inventory_slots),
      eligible_slots = eligible_slots + VALUES(eligible_slots),
      served_slots = served_slots + VALUES(served_slots),
      blocked_config_slots = blocked_config_slots + VALUES(blocked_config_slots),
      unfilled_slots = unfilled_slots + VALUES(unfilled_slots),
      updated_at = VALUES(updated_at)
  `);
}

async function getRuleUsageStats(db: DbLike, ruleIds: number[]): Promise<Record<number, RuleUsageStats>> {
  if (!ruleIds.length) return {};

  const result = await db.execute(sql`
    SELECT
      rule_id AS ruleId,
      COALESCE(SUM(CASE WHEN event_type = 'served' AND DATE(created_at) = CURRENT_DATE() THEN 1 ELSE 0 END), 0) AS servedToday,
      COALESCE(SUM(CASE WHEN event_type = 'served' THEN 1 ELSE 0 END), 0) AS servedTotal,
      MAX(CASE WHEN event_type = 'served' THEN created_at ELSE NULL END) AS lastServedAt
    FROM location_targeting_events
    WHERE rule_id IN (${sql.join(ruleIds.map(id => sql`${id}`), sql`,`)})
    GROUP BY rule_id
  `);

  const rows = extractRows(result);
  const stats: Record<number, RuleUsageStats> = {};
  for (const row of rows) {
    const ruleId = toNumber(row.ruleId, 0);
    if (!ruleId) continue;
    stats[ruleId] = {
      servedToday: Math.max(0, toNumber(row.servedToday, 0)),
      servedTotal: Math.max(0, toNumber(row.servedTotal, 0)),
      lastServedAt: row.lastServedAt ? String(row.lastServedAt) : null,
    };
  }
  return stats;
}

async function recordServedBatch(
  db: DbLike,
  rules: EligibleRule[],
  options: {
    requestId?: string;
    userId?: number | null;
    sessionKey?: string | null;
    contextType?: EventContextType;
    contextId?: number | null;
  },
) {
  if (!rules.length) return;
  const createdAt = nowMySqlDateTime();
  const values = rules.map(rule => {
    const metadata = JSON.stringify({
      ranking: rule.ranking,
      targetType: rule.targetType,
      sponsoredLabel: 'Sponsored',
    });
    return sql`(
      ${rule.id},
      ${'served'},
      ${options.contextType || 'unknown'},
      ${options.contextId ?? null},
      ${rule.locationType},
      ${rule.locationId},
      ${options.userId ?? null},
      ${options.requestId ?? null},
      ${options.sessionKey ?? null},
      ${metadata},
      ${createdAt}
    )`;
  });

  await db.execute(sql`
    INSERT INTO location_targeting_events (
      rule_id,
      event_type,
      context_type,
      context_id,
      location_type,
      location_id,
      user_id,
      request_id,
      session_key,
      metadata,
      created_at
    )
    VALUES ${sql.join(values, sql`,`)}
  `);

  const ids = rules.map(rule => rule.id);
  await db.execute(sql`
    UPDATE location_targeting_rules
    SET last_served_at = ${createdAt}
    WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`,`)})
  `);
}

export async function createLocationTargetingRule(input: CreateRuleInput): Promise<RuleRow> {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') throw new Error('Database unavailable');
  await ensureTables(db);

  const now = nowMySqlDateTime();
  const ranking = clamp(toNumber(input.ranking, 0), 0, 100);
  const startDate = toMySqlDateTime(input.startDate ?? null);
  const endDate = toMySqlDateTime(input.endDate ?? null);
  const metadata = input.metadata ? JSON.stringify(input.metadata) : JSON.stringify({});
  const dailyImpressionCap = Math.max(0, toNumber(input.dailyImpressionCap, 0));
  const totalImpressionCap = Math.max(0, toNumber(input.totalImpressionCap, 0));
  const pacingMinutes = Math.max(0, toNumber(input.pacingMinutes, 0));

  await db.execute(sql`
    INSERT INTO location_targeting_rules (
      target_type,
      target_id,
      location_type,
      location_id,
      ranking,
      status,
      metadata,
      start_date,
      end_date,
      daily_impression_cap,
      total_impression_cap,
      pacing_minutes,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      ${input.targetType},
      ${input.targetId},
      ${input.locationType},
      ${input.locationId},
      ${ranking},
      ${input.status || 'scheduled'},
      ${metadata},
      ${startDate},
      ${endDate},
      ${dailyImpressionCap},
      ${totalImpressionCap},
      ${pacingMinutes},
      ${input.createdBy ?? null},
      ${now},
      ${now}
    )
  `);

  const created = await db.execute(sql`
    SELECT
      id,
      target_type AS targetType,
      target_id AS targetId,
      location_type AS locationType,
      location_id AS locationId,
      ranking,
      status,
      metadata,
      start_date AS startDate,
      end_date AS endDate,
      daily_impression_cap AS dailyImpressionCap,
      total_impression_cap AS totalImpressionCap,
      pacing_minutes AS pacingMinutes,
      last_served_at AS lastServedAt,
      created_by AS createdBy,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM location_targeting_rules
    WHERE id = LAST_INSERT_ID()
    LIMIT 1
  `);

  const row = extractRows(created)[0];
  if (!row) throw new Error('Failed to create targeting rule');
  return normalizeRuleRow(row);
}

export async function getLocationTargetingRuleById(ruleId: number): Promise<RuleRow | null> {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') return null;
  await ensureTables(db);

  const result = await db.execute(sql`
    SELECT
      id,
      target_type AS targetType,
      target_id AS targetId,
      location_type AS locationType,
      location_id AS locationId,
      ranking,
      status,
      metadata,
      start_date AS startDate,
      end_date AS endDate,
      daily_impression_cap AS dailyImpressionCap,
      total_impression_cap AS totalImpressionCap,
      pacing_minutes AS pacingMinutes,
      last_served_at AS lastServedAt,
      created_by AS createdBy,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM location_targeting_rules
    WHERE id = ${ruleId}
    LIMIT 1
  `);

  const row = extractRows(result)[0];
  return row ? normalizeRuleRow(row) : null;
}

export async function updateLocationTargetingRuleControls(
  ruleId: number,
  patch: UpdateRuleControlsInput,
): Promise<{ before: RuleRow; after: RuleRow }> {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') throw new Error('Database unavailable');
  await ensureTables(db);

  const before = await getLocationTargetingRuleById(ruleId);
  if (!before) throw new Error(`Targeting rule ${ruleId} not found`);

  const now = nowMySqlDateTime();
  const nextRanking =
    patch.ranking === undefined ? before.ranking : clamp(toNumber(patch.ranking, before.ranking), 0, 100);
  const nextStatus = patch.status || before.status;
  const nextMetadata =
    patch.metadata === undefined ? before.metadata : patch.metadata;
  const nextStartDate =
    patch.startDate === undefined ? toMySqlDateTime(before.startDate) : toMySqlDateTime(patch.startDate ?? null);
  const nextEndDate =
    patch.endDate === undefined ? toMySqlDateTime(before.endDate) : toMySqlDateTime(patch.endDate ?? null);
  const nextDailyCap =
    patch.dailyImpressionCap === undefined
      ? before.dailyImpressionCap
      : Math.max(0, toNumber(patch.dailyImpressionCap, before.dailyImpressionCap));
  const nextTotalCap =
    patch.totalImpressionCap === undefined
      ? before.totalImpressionCap
      : Math.max(0, toNumber(patch.totalImpressionCap, before.totalImpressionCap));
  const nextPacing =
    patch.pacingMinutes === undefined
      ? before.pacingMinutes
      : Math.max(0, toNumber(patch.pacingMinutes, before.pacingMinutes));

  await db.execute(sql`
    UPDATE location_targeting_rules
    SET
      ranking = ${nextRanking},
      status = ${nextStatus},
      metadata = ${JSON.stringify(nextMetadata || {})},
      start_date = ${nextStartDate},
      end_date = ${nextEndDate},
      daily_impression_cap = ${nextDailyCap},
      total_impression_cap = ${nextTotalCap},
      pacing_minutes = ${nextPacing},
      updated_at = ${now}
    WHERE id = ${ruleId}
  `);

  const after = await getLocationTargetingRuleById(ruleId);
  if (!after) throw new Error(`Targeting rule ${ruleId} missing after update`);

  return { before, after };
}

export async function setLocationTargetingRuleStatus(
  ruleId: number,
  status: RuleStatus,
): Promise<{ success: true; updatedAt: string }> {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') throw new Error('Database unavailable');
  await ensureTables(db);

  const now = nowMySqlDateTime();
  await db.execute(sql`
    UPDATE location_targeting_rules
    SET status = ${status}, updated_at = ${now}
    WHERE id = ${ruleId}
  `);

  return { success: true, updatedAt: now };
}

export async function getAllLocationTargetingRules(): Promise<RuleRow[]> {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') return [];
  await ensureTables(db);

  const result = await db.execute(sql`
    SELECT
      id,
      target_type AS targetType,
      target_id AS targetId,
      location_type AS locationType,
      location_id AS locationId,
      ranking,
      status,
      metadata,
      start_date AS startDate,
      end_date AS endDate,
      daily_impression_cap AS dailyImpressionCap,
      total_impression_cap AS totalImpressionCap,
      pacing_minutes AS pacingMinutes,
      last_served_at AS lastServedAt,
      created_by AS createdBy,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM location_targeting_rules
    ORDER BY created_at DESC
    LIMIT 500
  `);

  return extractRows(result).map(normalizeRuleRow);
}

export async function getEligibleLocationRules(input: EligibleRulesInput): Promise<EligibleRule[]> {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') return [];
  await ensureTables(db);

  const limit = clamp(toNumber(input.limit, 1), 1, 12);
  const candidateLimit = clamp(limit * 5, 5, 120);
  const now = new Date();
  const metricDate = utcDateOnly(now);
  const surfaceType: EventContextType = input.contextType || 'unknown';
  const demandDeltaBase = {
    metricDate,
    surfaceType,
    targetType: input.targetType,
    locationType: input.locationType,
    locationId: input.locationId,
    requests: 1,
    opportunitySlots: limit,
  };

  const result = await db.execute(sql`
    SELECT
      id,
      target_type AS targetType,
      target_id AS targetId,
      location_type AS locationType,
      location_id AS locationId,
      ranking,
      status,
      metadata,
      start_date AS startDate,
      end_date AS endDate,
      daily_impression_cap AS dailyImpressionCap,
      total_impression_cap AS totalImpressionCap,
      pacing_minutes AS pacingMinutes,
      last_served_at AS lastServedAt,
      created_by AS createdBy,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM location_targeting_rules
    WHERE target_type = ${input.targetType}
      AND location_type = ${input.locationType}
      AND location_id = ${input.locationId}
      AND status IN ('active', 'scheduled')
    ORDER BY ranking DESC, created_at DESC
    LIMIT ${candidateLimit}
  `);

  const candidates = extractRows(result).map(normalizeRuleRow);
  if (!candidates.length) {
    await upsertSurfaceDemandStats(db, [
      {
        ...demandDeltaBase,
        inventorySlots: 0,
        eligibleSlots: 0,
        servedSlots: 0,
        blockedConfigSlots: 0,
        unfilledSlots: limit,
      },
    ]);
    return [];
  }

  const usage = await getRuleUsageStats(
    db,
    candidates.map(rule => rule.id),
  );

  const eligible: EligibleRule[] = [];
  const deltasByRule = new Map<number, RuleDailyStatsDelta>();
  const markDelta = (
    ruleId: number,
    field:
      | 'opportunities'
      | 'eligiblePasses'
      | 'servedCount'
      | 'blockedSchedule'
      | 'blockedDailyCap'
      | 'blockedTotalCap'
      | 'blockedPacing',
  ) => {
    const existing = deltasByRule.get(ruleId) || {
      metricDate,
      ruleId,
      opportunities: 0,
      eligiblePasses: 0,
      servedCount: 0,
      blockedSchedule: 0,
      blockedDailyCap: 0,
      blockedTotalCap: 0,
      blockedPacing: 0,
    };
    existing[field] += 1;
    deltasByRule.set(ruleId, existing);
  };

  for (const rule of candidates) {
    markDelta(rule.id, 'opportunities');
    if (!isInScheduleWindow(rule, now)) {
      markDelta(rule.id, 'blockedSchedule');
      continue;
    }
    if (rule.status === 'paused' || rule.status === 'expired') {
      markDelta(rule.id, 'blockedSchedule');
      continue;
    }

    const stats = usage[rule.id] || {
      servedToday: 0,
      servedTotal: 0,
      lastServedAt: null,
    };

    const dailyCap = getRuleLimit(rule, 'dailyImpressionCap');
    const totalCap = getRuleLimit(rule, 'totalImpressionCap');
    const pacingMinutes = getRuleLimit(rule, 'pacingMinutes');

    if (dailyCap > 0 && stats.servedToday >= dailyCap) {
      markDelta(rule.id, 'blockedDailyCap');
      continue;
    }
    if (totalCap > 0 && stats.servedTotal >= totalCap) {
      markDelta(rule.id, 'blockedTotalCap');
      continue;
    }

    if (pacingMinutes > 0 && stats.lastServedAt) {
      const last = new Date(stats.lastServedAt);
      if (!Number.isNaN(last.getTime())) {
        const elapsedMinutes = (Date.now() - last.getTime()) / (1000 * 60);
        if (elapsedMinutes < pacingMinutes) {
          markDelta(rule.id, 'blockedPacing');
          continue;
        }
      }
    }

    markDelta(rule.id, 'eligiblePasses');
    eligible.push({
      ...rule,
      usage: stats,
      sponsoredLabel: 'Sponsored',
    });

    if (eligible.length >= limit) break;
  }

  if (input.recordServe) {
    await recordServedBatch(db, eligible, {
      requestId: input.requestId,
      userId: input.userId ?? null,
      sessionKey: input.sessionKey ?? null,
      contextType: input.contextType,
      contextId: input.contextId ?? null,
    });

    for (const rule of eligible) {
      markDelta(rule.id, 'servedCount');
    }
  }

  const inventorySlots = Math.min(candidates.length, limit);
  const eligibleSlots = Math.min(eligible.length, limit);
  const servedSlots = input.recordServe ? eligibleSlots : 0;
  const blockedConfigSlots = Math.max(0, inventorySlots - eligibleSlots);
  const unfilledSlots = Math.max(0, limit - inventorySlots);
  await upsertSurfaceDemandStats(db, [
    {
      ...demandDeltaBase,
      inventorySlots,
      eligibleSlots,
      servedSlots,
      blockedConfigSlots,
      unfilledSlots,
    },
  ]);

  if (deltasByRule.size > 0) {
    await upsertRuleDailyStats(db, Array.from(deltasByRule.values()));
  }

  if (!eligible.length) return [];
  return eligible;
}

export async function getGeoDominanceBoostMap(input: {
  locationType: LocationType;
  locationId: number;
  targetIds: number[];
  limit?: number;
}): Promise<
  Record<
    number,
    {
      ruleId: number;
      ranking: number;
      sponsoredLabel: 'Sponsored';
      metadata: any;
    }
  >
> {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') return {};
  await ensureTables(db);

  const targetIds = Array.from(
    new Set(input.targetIds.map(v => toNumber(v, 0)).filter(v => Number.isFinite(v) && v > 0)),
  );
  if (!targetIds.length) return {};

  const rules = await getEligibleLocationRules({
    targetType: 'geo_listing',
    locationType: input.locationType,
    locationId: input.locationId,
    limit: input.limit || Math.min(50, targetIds.length),
    recordServe: false,
    contextType: 'feed',
  });

  const byTarget: Record<number, { ruleId: number; ranking: number; sponsoredLabel: 'Sponsored'; metadata: any }> =
    {};
  for (const rule of rules) {
    const targetId = toNumber(rule.targetId, 0);
    if (!targetIds.includes(targetId)) continue;
    if (byTarget[targetId]) continue; // Keep highest-ranked eligible rule per target
    byTarget[targetId] = {
      ruleId: rule.id,
      ranking: rule.ranking,
      sponsoredLabel: 'Sponsored',
      metadata: parseJson(rule.metadata),
    };
  }

  return byTarget;
}

export async function recordLocationRuleEvent(input: RecordEventInput): Promise<{ success: true; createdAt: string }> {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') throw new Error('Database unavailable');
  await ensureTables(db);

  const createdAt = nowMySqlDateTime();
  const metadata = input.metadata ? JSON.stringify(input.metadata) : JSON.stringify({});
  await db.execute(sql`
    INSERT INTO location_targeting_events (
      rule_id,
      event_type,
      context_type,
      context_id,
      location_type,
      location_id,
      user_id,
      request_id,
      session_key,
      metadata,
      created_at
    )
    VALUES (
      ${input.ruleId},
      ${input.eventType},
      ${input.contextType || 'unknown'},
      ${input.contextId ?? null},
      ${input.locationType ?? null},
      ${input.locationId ?? null},
      ${input.userId ?? null},
      ${input.requestId ?? null},
      ${input.sessionKey ?? null},
      ${metadata},
      ${createdAt}
    )
  `);

  if (input.eventType === 'served') {
    await db.execute(sql`
      UPDATE location_targeting_rules
      SET last_served_at = ${createdAt}
      WHERE id = ${input.ruleId}
    `);
  }

  return { success: true, createdAt };
}

export async function getLocationTargetingRulePerformance(input?: {
  ruleId?: number;
  from?: string;
  to?: string;
}) {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') return [];
  await ensureTables(db);

  const from = toMySqlDateTime(input?.from || null) || `${new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 19).replace('T', ' ')}`;
  const to = toMySqlDateTime(input?.to || null) || nowMySqlDateTime();

  const whereRule = input?.ruleId ? sql`AND r.id = ${input.ruleId}` : sql``;
  const result = await db.execute(sql`
    SELECT
      r.id,
      r.target_type AS targetType,
      r.target_id AS targetId,
      r.location_type AS locationType,
      r.location_id AS locationId,
      r.ranking,
      r.status,
      COALESCE(SUM(CASE WHEN e.event_type = 'served' THEN 1 ELSE 0 END), 0) AS impressions,
      COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks,
      COALESCE(SUM(CASE WHEN e.event_type = 'lead' THEN 1 ELSE 0 END), 0) AS leads
    FROM location_targeting_rules r
    LEFT JOIN location_targeting_events e
      ON e.rule_id = r.id
      AND e.created_at >= ${from}
      AND e.created_at <= ${to}
    WHERE 1=1 ${whereRule}
    GROUP BY r.id
    ORDER BY r.updated_at DESC
    LIMIT 500
  `);

  return extractRows(result).map((row: any) => {
    const impressions = toNumber(row.impressions, 0);
    const clicks = toNumber(row.clicks, 0);
    const leads = toNumber(row.leads, 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const leadRate = clicks > 0 ? (leads / clicks) * 100 : 0;

    return {
      id: toNumber(row.id, 0),
      targetType: String(row.targetType),
      targetId: toNumber(row.targetId, 0),
      locationType: String(row.locationType),
      locationId: toNumber(row.locationId, 0),
      ranking: toNumber(row.ranking, 0),
      status: String(row.status),
      impressions,
      clicks,
      leads,
      ctr: Number(ctr.toFixed(2)),
      leadRate: Number(leadRate.toFixed(2)),
    };
  });
}

export async function getLocationTargetingDeliverySimulation(input?: {
  ruleId?: number;
  from?: string;
  to?: string;
}) {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') {
    return {
      from: null,
      to: null,
      days: 0,
      totals: null,
      rules: [],
    };
  }
  await ensureTables(db);

  const fromDate =
    input?.from && !Number.isNaN(new Date(input.from).getTime())
      ? utcDateOnly(new Date(input.from))
      : utcDateOnly(new Date(Date.now() - 30 * 86400000));
  const toDate =
    input?.to && !Number.isNaN(new Date(input.to).getTime())
      ? utcDateOnly(new Date(input.to))
      : utcDateOnly(new Date());
  const fromDateTime = `${fromDate} 00:00:00`;
  const toDateTime = `${toDate} 23:59:59`;
  const days = Math.max(
    1,
    Math.floor((new Date(`${toDate}T00:00:00Z`).getTime() - new Date(`${fromDate}T00:00:00Z`).getTime()) / 86400000) +
      1,
  );
  const whereRule = input?.ruleId ? sql`AND r.id = ${input.ruleId}` : sql``;

  const result = await db.execute(sql`
    SELECT
      r.id,
      r.target_type AS targetType,
      r.target_id AS targetId,
      r.location_type AS locationType,
      r.location_id AS locationId,
      r.ranking,
      r.status,
      r.metadata,
      r.daily_impression_cap AS dailyImpressionCap,
      r.total_impression_cap AS totalImpressionCap,
      r.pacing_minutes AS pacingMinutes,
      COALESCE(ds.opportunities, 0) AS opportunities,
      COALESCE(ds.eligiblePasses, 0) AS eligiblePasses,
      COALESCE(ds.servedFromStats, 0) AS servedFromStats,
      COALESCE(ds.blockedSchedule, 0) AS blockedSchedule,
      COALESCE(ds.blockedDailyCap, 0) AS blockedDailyCap,
      COALESCE(ds.blockedTotalCap, 0) AS blockedTotalCap,
      COALESCE(ds.blockedPacing, 0) AS blockedPacing,
      COALESCE(ev.impressions, 0) AS impressions,
      COALESCE(ev.clicks, 0) AS clicks,
      COALESCE(ev.leads, 0) AS leads
    FROM location_targeting_rules r
    LEFT JOIN (
      SELECT
        rule_id AS ruleId,
        SUM(opportunities) AS opportunities,
        SUM(eligible_passes) AS eligiblePasses,
        SUM(served_count) AS servedFromStats,
        SUM(blocked_schedule) AS blockedSchedule,
        SUM(blocked_daily_cap) AS blockedDailyCap,
        SUM(blocked_total_cap) AS blockedTotalCap,
        SUM(blocked_pacing) AS blockedPacing
      FROM location_targeting_rule_daily_stats
      WHERE metric_date >= ${fromDate}
        AND metric_date <= ${toDate}
      GROUP BY rule_id
    ) ds ON ds.ruleId = r.id
    LEFT JOIN (
      SELECT
        rule_id AS ruleId,
        SUM(CASE WHEN event_type = 'served' THEN 1 ELSE 0 END) AS impressions,
        SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks,
        SUM(CASE WHEN event_type = 'lead' THEN 1 ELSE 0 END) AS leads
      FROM location_targeting_events
      WHERE created_at >= ${fromDateTime}
        AND created_at <= ${toDateTime}
      GROUP BY rule_id
    ) ev ON ev.ruleId = r.id
    WHERE 1=1 ${whereRule}
    ORDER BY r.updated_at DESC
    LIMIT 500
  `);

  const rules = extractRows(result).map((row: any) => {
    const impressions = Math.max(0, toNumber(row.impressions, 0));
    const clicks = Math.max(0, toNumber(row.clicks, 0));
    const leads = Math.max(0, toNumber(row.leads, 0));
    const opportunities = Math.max(0, toNumber(row.opportunities, 0));
    const eligiblePasses = Math.max(0, toNumber(row.eligiblePasses, 0));
    const blockedSchedule = Math.max(0, toNumber(row.blockedSchedule, 0));
    const blockedDailyCap = Math.max(0, toNumber(row.blockedDailyCap, 0));
    const blockedTotalCap = Math.max(0, toNumber(row.blockedTotalCap, 0));
    const blockedPacing = Math.max(0, toNumber(row.blockedPacing, 0));
    const expectedImpressions = impressions + blockedDailyCap + blockedTotalCap + blockedPacing;
    const deliveryGap = Math.max(0, expectedImpressions - impressions);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const qualifiedLeadRate = impressions > 0 ? (leads / impressions) * 100 : 0;
    const clickToLeadRate = clicks > 0 ? (leads / clicks) * 100 : 0;
    const eligibilityRate = opportunities > 0 ? (eligiblePasses / opportunities) * 100 : 0;
    const pacingBlockRate = opportunities > 0 ? (blockedPacing / opportunities) * 100 : 0;

    const metadata = parseJson(row.metadata);
    const cpm = Math.max(0, toNumber(metadata?.cpm ?? metadata?.cpmRate, 0));
    const cpc = Math.max(0, toNumber(metadata?.cpc ?? metadata?.cpcRate, 0));
    const cpl = Math.max(0, toNumber(metadata?.cpl ?? metadata?.cplRate, 0));
    const revenue = impressions / 1000 * cpm + clicks * cpc + leads * cpl;
    const effectiveCpm = impressions > 0 ? revenue / (impressions / 1000) : 0;
    const effectiveCpl = leads > 0 ? revenue / leads : null;

    const dailyCap = Math.max(0, toNumber(row.dailyImpressionCap, 0));
    const capWindow = dailyCap > 0 ? dailyCap * days : null;
    const capUtilization = capWindow && capWindow > 0 ? (impressions / capWindow) * 100 : null;

    return {
      id: toNumber(row.id, 0),
      targetType: String(row.targetType),
      targetId: toNumber(row.targetId, 0),
      locationType: String(row.locationType),
      locationId: toNumber(row.locationId, 0),
      ranking: toNumber(row.ranking, 0),
      status: String(row.status),
      dailyImpressionCap: dailyCap,
      totalImpressionCap: Math.max(0, toNumber(row.totalImpressionCap, 0)),
      pacingMinutes: Math.max(0, toNumber(row.pacingMinutes, 0)),
      opportunities,
      eligiblePasses,
      blockedSchedule,
      blockedDailyCap,
      blockedTotalCap,
      blockedPacing,
      impressions,
      clicks,
      leads,
      expectedImpressions,
      actualImpressions: impressions,
      deliveryGap,
      ctr: Number(ctr.toFixed(2)),
      qualifiedLeadRate: Number(qualifiedLeadRate.toFixed(2)),
      clickToLeadRate: Number(clickToLeadRate.toFixed(2)),
      eligibilityRate: Number(eligibilityRate.toFixed(2)),
      pacingBlockRate: Number(pacingBlockRate.toFixed(2)),
      capUtilization: capUtilization === null ? null : Number(capUtilization.toFixed(2)),
      revenue: Number(revenue.toFixed(2)),
      effectiveCpm: Number(effectiveCpm.toFixed(2)),
      effectiveCpl: effectiveCpl === null ? null : Number(effectiveCpl.toFixed(2)),
      pacingHealth:
        blockedPacing === 0 ? 'healthy' : pacingBlockRate >= 10 ? 'constrained' : 'watch',
      servedConsistencyDelta: Math.max(0, impressions - Math.max(0, toNumber(row.servedFromStats, 0))),
    };
  });

  const totalsRaw = rules.reduce(
    (acc, row) => {
      acc.opportunities += row.opportunities;
      acc.eligiblePasses += row.eligiblePasses;
      acc.blockedSchedule += row.blockedSchedule;
      acc.blockedDailyCap += row.blockedDailyCap;
      acc.blockedTotalCap += row.blockedTotalCap;
      acc.blockedPacing += row.blockedPacing;
      acc.impressions += row.impressions;
      acc.clicks += row.clicks;
      acc.leads += row.leads;
      acc.expectedImpressions += row.expectedImpressions;
      acc.deliveryGap += row.deliveryGap;
      acc.revenue += row.revenue;
      return acc;
    },
    {
      opportunities: 0,
      eligiblePasses: 0,
      blockedSchedule: 0,
      blockedDailyCap: 0,
      blockedTotalCap: 0,
      blockedPacing: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      expectedImpressions: 0,
      deliveryGap: 0,
      revenue: 0,
    },
  );

  const totals = {
    opportunities: totalsRaw.opportunities,
    eligiblePasses: totalsRaw.eligiblePasses,
    blockedSchedule: totalsRaw.blockedSchedule,
    blockedDailyCap: totalsRaw.blockedDailyCap,
    blockedTotalCap: totalsRaw.blockedTotalCap,
    blockedPacing: totalsRaw.blockedPacing,
    impressions: totalsRaw.impressions,
    clicks: totalsRaw.clicks,
    leads: totalsRaw.leads,
    expectedImpressions: totalsRaw.expectedImpressions,
    actualImpressions: totalsRaw.impressions,
    deliveryGap: totalsRaw.deliveryGap,
    ctr:
      totalsRaw.impressions > 0
        ? Number(((totalsRaw.clicks / totalsRaw.impressions) * 100).toFixed(2))
        : 0,
    qualifiedLeadRate:
      totalsRaw.impressions > 0
        ? Number(((totalsRaw.leads / totalsRaw.impressions) * 100).toFixed(2))
        : 0,
    clickToLeadRate:
      totalsRaw.clicks > 0 ? Number(((totalsRaw.leads / totalsRaw.clicks) * 100).toFixed(2)) : 0,
    revenue: Number(totalsRaw.revenue.toFixed(2)),
    effectiveCpm:
      totalsRaw.impressions > 0
        ? Number((totalsRaw.revenue / (totalsRaw.impressions / 1000)).toFixed(2))
        : 0,
    effectiveCpl:
      totalsRaw.leads > 0 ? Number((totalsRaw.revenue / totalsRaw.leads).toFixed(2)) : null,
  };

  return {
    from: fromDate,
    to: toDate,
    days,
    totals,
    rules,
  };
}

export async function getSurfaceDemandBaseline(input?: {
  from?: string;
  to?: string;
  surfaceType?: EventContextType;
  locationType?: LocationType;
  locationId?: number;
}) {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') {
    return {
      from: null,
      to: null,
      days: 0,
      totals: null,
      rows: [],
    };
  }
  await ensureTables(db);

  const fromDate =
    input?.from && !Number.isNaN(new Date(input.from).getTime())
      ? utcDateOnly(new Date(input.from))
      : utcDateOnly(new Date(Date.now() - 30 * 86400000));
  const toDate =
    input?.to && !Number.isNaN(new Date(input.to).getTime())
      ? utcDateOnly(new Date(input.to))
      : utcDateOnly(new Date());
  const days = Math.max(
    1,
    Math.floor((new Date(`${toDate}T00:00:00Z`).getTime() - new Date(`${fromDate}T00:00:00Z`).getTime()) / 86400000) +
      1,
  );

  const whereSurface = input?.surfaceType ? sql`AND surface_type = ${input.surfaceType}` : sql``;
  const whereLocationType = input?.locationType ? sql`AND location_type = ${input.locationType}` : sql``;
  const whereLocationId =
    typeof input?.locationId === 'number' && Number.isFinite(input.locationId)
      ? sql`AND location_id = ${input.locationId}`
      : sql``;

  const result = await db.execute(sql`
    SELECT
      metric_date AS metricDate,
      surface_type AS surfaceType,
      target_type AS targetType,
      location_type AS locationType,
      location_id AS locationId,
      SUM(requests) AS requests,
      SUM(opportunity_slots) AS opportunitySlots,
      SUM(inventory_slots) AS inventorySlots,
      SUM(eligible_slots) AS eligibleSlots,
      SUM(served_slots) AS servedSlots,
      SUM(blocked_config_slots) AS blockedConfigSlots,
      SUM(unfilled_slots) AS unfilledSlots
    FROM opportunities_by_surface_by_day
    WHERE metric_date >= ${fromDate}
      AND metric_date <= ${toDate}
      ${whereSurface}
      ${whereLocationType}
      ${whereLocationId}
    GROUP BY metric_date, surface_type, target_type, location_type, location_id
    ORDER BY metric_date DESC, surface_type ASC, target_type ASC
    LIMIT 5000
  `);

  const rows = extractRows(result).map((row: any) => {
    const opportunitySlots = Math.max(0, toNumber(row.opportunitySlots, 0));
    const inventorySlots = Math.max(0, toNumber(row.inventorySlots, 0));
    const eligibleSlots = Math.max(0, toNumber(row.eligibleSlots, 0));
    const servedSlots = Math.max(0, toNumber(row.servedSlots, 0));
    const blockedConfigSlots = Math.max(0, toNumber(row.blockedConfigSlots, 0));
    const unfilledSlots = Math.max(0, toNumber(row.unfilledSlots, 0));
    const requests = Math.max(0, toNumber(row.requests, 0));
    const demandCeilingSlots = opportunitySlots;
    const inventoryCeilingSlots = Math.max(0, opportunitySlots - unfilledSlots);
    const configUnlockedCeilingSlots = Math.max(0, inventoryCeilingSlots);
    const deliveryRate = demandCeilingSlots > 0 ? (servedSlots / demandCeilingSlots) * 100 : 0;
    const inventoryFillRate =
      inventoryCeilingSlots > 0 ? (servedSlots / inventoryCeilingSlots) * 100 : 0;
    const configLossRate =
      demandCeilingSlots > 0 ? (blockedConfigSlots / demandCeilingSlots) * 100 : 0;

    return {
      metricDate: String(row.metricDate),
      surfaceType: String(row.surfaceType),
      targetType: String(row.targetType),
      locationType: String(row.locationType),
      locationId: toNumber(row.locationId, 0),
      requests,
      opportunitySlots,
      inventorySlots,
      eligibleSlots,
      servedSlots,
      blockedConfigSlots,
      unfilledSlots,
      demandCeilingSlots,
      inventoryCeilingSlots,
      configUnlockedCeilingSlots,
      deliveryRate: Number(deliveryRate.toFixed(2)),
      inventoryFillRate: Number(inventoryFillRate.toFixed(2)),
      configLossRate: Number(configLossRate.toFixed(2)),
    };
  });

  const totalsRaw = rows.reduce(
    (acc, row) => {
      acc.requests += row.requests;
      acc.opportunitySlots += row.opportunitySlots;
      acc.inventorySlots += row.inventorySlots;
      acc.eligibleSlots += row.eligibleSlots;
      acc.servedSlots += row.servedSlots;
      acc.blockedConfigSlots += row.blockedConfigSlots;
      acc.unfilledSlots += row.unfilledSlots;
      return acc;
    },
    {
      requests: 0,
      opportunitySlots: 0,
      inventorySlots: 0,
      eligibleSlots: 0,
      servedSlots: 0,
      blockedConfigSlots: 0,
      unfilledSlots: 0,
    },
  );

  const demandCeilingSlots = totalsRaw.opportunitySlots;
  const inventoryCeilingSlots = Math.max(0, totalsRaw.opportunitySlots - totalsRaw.unfilledSlots);
  const totals = {
    requests: totalsRaw.requests,
    opportunitySlots: totalsRaw.opportunitySlots,
    inventorySlots: totalsRaw.inventorySlots,
    eligibleSlots: totalsRaw.eligibleSlots,
    servedSlots: totalsRaw.servedSlots,
    blockedConfigSlots: totalsRaw.blockedConfigSlots,
    unfilledSlots: totalsRaw.unfilledSlots,
    demandCeilingSlots,
    inventoryCeilingSlots,
    configUnlockedCeilingSlots: inventoryCeilingSlots,
    deliveryRate:
      demandCeilingSlots > 0 ? Number(((totalsRaw.servedSlots / demandCeilingSlots) * 100).toFixed(2)) : 0,
    inventoryFillRate:
      inventoryCeilingSlots > 0 ? Number(((totalsRaw.servedSlots / inventoryCeilingSlots) * 100).toFixed(2)) : 0,
    configLossRate:
      demandCeilingSlots > 0
        ? Number(((totalsRaw.blockedConfigSlots / demandCeilingSlots) * 100).toFixed(2))
        : 0,
  };

  return {
    from: fromDate,
    to: toDate,
    days,
    totals,
    rows,
  };
}

export function buildSessionKeyFromRequest(input: {
  requestId?: string | null;
  userId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return hashSessionKey([input.requestId, input.userId, input.ipAddress, input.userAgent]);
}
