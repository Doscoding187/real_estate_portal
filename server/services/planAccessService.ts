import { and, asc, eq } from 'drizzle-orm';
import {
  agencies,
  plans,
  planEntitlements,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db';

export type PlanSegment = 'agent' | 'agency' | 'enterprise' | 'developer';
export type SubscriptionOwnerType = 'agent' | 'agency';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';
export type EntitlementValue = boolean | number | string | null;
export type EntitlementMap = Record<string, EntitlementValue>;

export const DEFAULT_FEATURE_ENTITLEMENTS: EntitlementMap = {
  max_active_listings: 0,
  has_ai_insights: false,
  has_area_intelligence: false,
  has_commission_tracking: false,
  has_team_dashboard: false,
  has_recruitment_funnel: false,
  has_benchmarking: false,
  has_priority_exposure: false,
  has_lead_routing: false,
  has_managed_mode: false,
  has_revenue_dashboard: false,
};

export type PlanSnapshot = {
  id: number;
  name: string;
  displayName: string;
  segment: PlanSegment;
  priceMonthly: number;
  trialDays: number;
  metadata: Record<string, unknown> | null;
};

export type PlanCatalogEntry = PlanSnapshot & {
  entitlements: EntitlementMap;
};

export type SubscriptionSnapshot = {
  id: number;
  ownerType: SubscriptionOwnerType;
  ownerId: number;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  billingCycleAnchor: string | null;
  metadata: Record<string, unknown> | null;
};

export type PlanAccessProjection = {
  ownerType: SubscriptionOwnerType;
  ownerId: number;
  currentPlan: PlanSnapshot | null;
  subscription: SubscriptionSnapshot | null;
  entitlements: EntitlementMap;
  trialStatus: 'active' | 'expired' | 'none';
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
};

type DbHandle = Awaited<ReturnType<typeof getDb>>;
type SubscriptionRow = typeof subscriptions.$inferSelect;
type UserRow = typeof users.$inferSelect;

const DEFAULT_AGENT_PLAN = 'agent_starter';
const DEFAULT_AGENCY_PLAN = 'agency_growth';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isPricingGovernanceSchemaError(error: unknown): boolean {
  const code = String((error as any)?.code ?? '');
  const message = String((error as any)?.message ?? '');
  const normalizedMessage = message.toLowerCase();
  const touchesPricingTables =
    normalizedMessage.includes('subscriptions') ||
    normalizedMessage.includes('plan_entitlements') ||
    normalizedMessage.includes('owner_type') ||
    normalizedMessage.includes('owner_id') ||
    normalizedMessage.includes('segment') ||
    normalizedMessage.includes('trial_days') ||
    normalizedMessage.includes('price_monthly');

  if (code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_FIELD_ERROR') {
    return true;
  }

  // Some DB drivers wrap schema errors as "Failed query: ... from `subscriptions` ..."
  // without surfacing the underlying SQL error code/message. Treat these as recoverable
  // pricing-governance mismatches so auth/session flows can continue on legacy fallback.
  if (normalizedMessage.includes('failed query:') && touchesPricingTables) {
    return true;
  }

  return (
    (normalizedMessage.includes("doesn't exist") || normalizedMessage.includes('unknown column')) &&
    touchesPricingTables
  );
}

function buildLegacyProjectionForUser(user: UserRow): PlanAccessProjection {
  const { ownerType, ownerId } = getOwnerContextForUser(user);
  const normalizedTrialEnd = user.trialEndsAt || null;
  const trialStatus: 'active' | 'expired' | 'none' =
    user.trialStatus === 'expired'
      ? 'expired'
      : normalizedTrialEnd && new Date(normalizedTrialEnd).getTime() <= Date.now()
        ? 'expired'
        : 'active';

  const trialDaysRemaining =
    normalizedTrialEnd && trialStatus === 'active'
      ? Math.max(0, Math.ceil((new Date(normalizedTrialEnd).getTime() - Date.now()) / MS_PER_DAY))
      : trialStatus === 'expired'
        ? 0
        : null;

  const hasPaidPlan = user.plan === 'paid';
  const maxActiveListings = hasPaidPlan || trialStatus === 'active' ? 25 : 0;

  return {
    ownerType,
    ownerId,
    currentPlan: null,
    subscription: null,
    entitlements: {
      ...DEFAULT_FEATURE_ENTITLEMENTS,
      max_active_listings: maxActiveListings,
      has_ai_insights: hasPaidPlan,
      has_area_intelligence: hasPaidPlan,
      has_commission_tracking: hasPaidPlan || trialStatus === 'active',
      has_revenue_dashboard: hasPaidPlan,
    },
    trialStatus,
    trialEndsAt: normalizedTrialEnd,
    trialDaysRemaining,
  };
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

function parseEntitlementValue(value: unknown): EntitlementValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function toPlanSnapshot(row: typeof plans.$inferSelect): PlanSnapshot {
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    segment: (row.segment || 'agent') as PlanSegment,
    priceMonthly: Number(row.priceMonthly || row.price || 0),
    trialDays: Number(row.trialDays || 0),
    metadata: parseJsonRecord(row.metadata),
  };
}

function toSubscriptionSnapshot(row: SubscriptionRow): SubscriptionSnapshot {
  return {
    id: row.id,
    ownerType: row.ownerType as SubscriptionOwnerType,
    ownerId: Number(row.ownerId),
    status: row.status as SubscriptionStatus,
    trialEndsAt: row.trialEndsAt || null,
    billingCycleAnchor: row.billingCycleAnchor || null,
    metadata: parseJsonRecord(row.metadata),
  };
}

function deriveTrialState(
  status: SubscriptionStatus | null,
  trialEndsAt: string | null,
): Pick<PlanAccessProjection, 'trialStatus' | 'trialEndsAt' | 'trialDaysRemaining'> {
  if (!status || !trialEndsAt) {
    return {
      trialStatus: 'none',
      trialEndsAt: null,
      trialDaysRemaining: null,
    };
  }

  const trialEndDate = new Date(trialEndsAt);
  if (Number.isNaN(trialEndDate.getTime())) {
    return {
      trialStatus: status === 'trial' ? 'active' : status === 'expired' ? 'expired' : 'none',
      trialEndsAt: trialEndsAt || null,
      trialDaysRemaining: null,
    };
  }

  const now = Date.now();
  const rawDays = Math.ceil((trialEndDate.getTime() - now) / MS_PER_DAY);
  const expired = rawDays <= 0 || status === 'expired' || status === 'cancelled';

  if (status !== 'trial' && !expired) {
    return {
      trialStatus: 'none',
      trialEndsAt: trialEndsAt || null,
      trialDaysRemaining: null,
    };
  }

  return {
    trialStatus: expired ? 'expired' : 'active',
    trialEndsAt: trialEndsAt || null,
    trialDaysRemaining: expired ? 0 : rawDays,
  };
}

function getOwnerContextForUser(user: UserRow): {
  ownerType: SubscriptionOwnerType;
  ownerId: number;
} {
  if (user.role === 'agency_admin' && user.agencyId) {
    return {
      ownerType: 'agency',
      ownerId: Number(user.agencyId),
    };
  }

  return {
    ownerType: 'agent',
    ownerId: user.id,
  };
}

async function getStarterPlan(db: DbHandle, ownerType: SubscriptionOwnerType) {
  if (!db) throw new Error('Database not available');

  if (ownerType === 'agent') {
    const [named] = await db.select().from(plans).where(eq(plans.name, DEFAULT_AGENT_PLAN)).limit(1);
    if (named) return named;

    const [segmentFallback] = await db
      .select()
      .from(plans)
      .where(eq(plans.segment, 'agent'))
      .orderBy(asc(plans.sortOrder))
      .limit(1);
    return segmentFallback || null;
  }

  const [named] = await db.select().from(plans).where(eq(plans.name, DEFAULT_AGENCY_PLAN)).limit(1);
  if (named) return named;

  const [segmentFallback] = await db
    .select()
    .from(plans)
    .where(eq(plans.segment, 'agency'))
    .orderBy(asc(plans.sortOrder))
    .limit(1);
  return segmentFallback || null;
}

async function ensureDefaultSubscriptionForUser(user: UserRow): Promise<SubscriptionRow | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const { ownerType, ownerId } = getOwnerContextForUser(user);
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.ownerType, ownerType), eq(subscriptions.ownerId, ownerId)))
    .limit(1);

  if (existing) return existing;

  const fallbackPlan = await getStarterPlan(db, ownerType);
  if (!fallbackPlan) return null;

  const trialDays = Math.max(1, Number(fallbackPlan.trialDays || 30));
  const fallbackTrialEnd = new Date(Date.now() + trialDays * MS_PER_DAY)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  const trialEndsAt = ownerType === 'agent' ? user.trialEndsAt || fallbackTrialEnd : fallbackTrialEnd;
  const status: SubscriptionStatus =
    ownerType === 'agent' && user.plan === 'paid'
      ? 'active'
      : ownerType === 'agent' && user.trialStatus === 'expired'
        ? 'expired'
        : 'trial';

  await db.insert(subscriptions).values({
    ownerType,
    ownerId,
    planId: fallbackPlan.id,
    status,
    trialEndsAt,
    billingCycleAnchor: trialEndsAt,
    metadata: {
      source: 'plan_access_service_default',
      owner_role: user.role,
    },
  });

  const [created] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.ownerType, ownerType), eq(subscriptions.ownerId, ownerId)))
    .limit(1);

  return created || null;
}

async function fetchEntitlementsForPlan(planId: number): Promise<EntitlementMap> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const rows = await db
    .select({
      featureKey: planEntitlements.featureKey,
      valueJson: planEntitlements.valueJson,
    })
    .from(planEntitlements)
    .where(eq(planEntitlements.planId, planId));

  const out: EntitlementMap = { ...DEFAULT_FEATURE_ENTITLEMENTS };
  for (const row of rows) {
    out[row.featureKey] = parseEntitlementValue(row.valueJson);
  }

  return out;
}

export async function getEntitlementsForPlanId(planId: number): Promise<EntitlementMap> {
  return fetchEntitlementsForPlan(planId);
}

export function getEntitlementBoolean(
  entitlements: EntitlementMap,
  key: string,
  defaultValue = false,
): boolean {
  const value = entitlements[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return defaultValue;
}

export function getEntitlementNumber(
  entitlements: EntitlementMap,
  key: string,
  defaultValue = 0,
): number {
  const value = entitlements[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return defaultValue;
}

export async function getPlanCatalog(segment?: PlanSegment): Promise<PlanCatalogEntry[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const rows = segment
    ? await db
        .select()
        .from(plans)
        .where(and(eq(plans.segment, segment), eq(plans.isActive, 1)))
        .orderBy(asc(plans.sortOrder))
    : await db.select().from(plans).where(eq(plans.isActive, 1)).orderBy(asc(plans.sortOrder));

  const snapshots = rows.map(toPlanSnapshot);
  const entitlements = await Promise.all(
    snapshots.map(async plan => ({
      planId: plan.id,
      entitlements: await fetchEntitlementsForPlan(plan.id),
    })),
  );

  const entitlementByPlanId = new Map(entitlements.map(entry => [entry.planId, entry.entitlements]));

  return snapshots.map(plan => ({
    ...plan,
    entitlements: entitlementByPlanId.get(plan.id) || { ...DEFAULT_FEATURE_ENTITLEMENTS },
  }));
}

export async function getPlanById(planId: number): Promise<PlanSnapshot | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
  return row ? toPlanSnapshot(row) : null;
}

export async function getPlanByName(name: string): Promise<PlanSnapshot | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db.select().from(plans).where(eq(plans.name, name)).limit(1);
  return row ? toPlanSnapshot(row) : null;
}

export async function getPlanAccessProjectionForUserId(userId: number): Promise<PlanAccessProjection | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  try {
    const { ownerType, ownerId } = getOwnerContextForUser(user);

    let [subscriptionRow] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.ownerType, ownerType), eq(subscriptions.ownerId, ownerId)))
      .limit(1);

    const shouldAutoProvision =
      user.role === 'agent' || (user.role === 'agency_admin' && ownerType === 'agency');

    if (!subscriptionRow && shouldAutoProvision) {
      subscriptionRow = await ensureDefaultSubscriptionForUser(user);
    }

    let planRow: typeof plans.$inferSelect | null = null;
    if (subscriptionRow?.planId) {
      const [selectedPlan] = await db.select().from(plans).where(eq(plans.id, subscriptionRow.planId)).limit(1);
      planRow = selectedPlan || null;
    }

    if (!planRow) {
      const fallback = await getStarterPlan(db, ownerType);
      planRow = fallback || null;
    }

    const entitlementMap = planRow
      ? await fetchEntitlementsForPlan(planRow.id)
      : { ...DEFAULT_FEATURE_ENTITLEMENTS };

    if (subscriptionRow?.status === 'trial' && subscriptionRow.trialEndsAt) {
      const trialEndTs = new Date(subscriptionRow.trialEndsAt).getTime();
      if (Number.isFinite(trialEndTs) && trialEndTs <= Date.now()) {
        await db
          .update(subscriptions)
          .set({
            status: 'expired',
          })
          .where(eq(subscriptions.id, subscriptionRow.id));
        subscriptionRow.status = 'expired';
      }
    }

    const trialState = deriveTrialState(
      (subscriptionRow?.status as SubscriptionStatus | null) || null,
      subscriptionRow?.trialEndsAt || null,
    );

    return {
      ownerType,
      ownerId,
      currentPlan: planRow ? toPlanSnapshot(planRow) : null,
      subscription: subscriptionRow ? toSubscriptionSnapshot(subscriptionRow) : null,
      entitlements: entitlementMap,
      ...trialState,
    };
  } catch (error) {
    if (!isPricingGovernanceSchemaError(error)) {
      throw error;
    }

    console.warn(
      '[PlanAccess] Pricing governance schema missing or outdated. Falling back to legacy projection.',
      {
        userId,
        code: (error as any)?.code,
        message: (error as any)?.message,
      },
    );

    return buildLegacyProjectionForUser(user);
  }
}

export async function setSubscriptionPlanForOwner(input: {
  ownerType: SubscriptionOwnerType;
  ownerId: number;
  planId: number;
  status?: SubscriptionStatus;
  trialEndsAt?: string | null;
  billingCycleAnchor?: string | null;
  metadata?: Record<string, unknown> | null;
  actorUserId?: number;
}): Promise<SubscriptionSnapshot | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [planRow] = await db.select().from(plans).where(eq(plans.id, input.planId)).limit(1);
  if (!planRow) {
    throw new Error('Plan not found');
  }

  const nowTs = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const trialDays = Math.max(0, Number(planRow.trialDays || 0));
  const computedTrialEnd =
    trialDays > 0 ? new Date(Date.now() + trialDays * MS_PER_DAY).toISOString().slice(0, 19).replace('T', ' ') : null;

  const nextStatus = input.status || 'active';
  const trialEndsAt = input.trialEndsAt ?? (nextStatus === 'trial' ? computedTrialEnd : null);
  const billingCycleAnchor =
    input.billingCycleAnchor ?? (nextStatus === 'trial' ? trialEndsAt : nowTs);

  await db
    .insert(subscriptions)
    .values({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      planId: input.planId,
      status: nextStatus,
      trialEndsAt: trialEndsAt || null,
      billingCycleAnchor: billingCycleAnchor || null,
      metadata: input.metadata || null,
      updatedBy: input.actorUserId || null,
      createdBy: input.actorUserId || null,
    })
    .onDuplicateKeyUpdate({
      set: {
        planId: input.planId,
        status: nextStatus,
        trialEndsAt: trialEndsAt || null,
        billingCycleAnchor: billingCycleAnchor || null,
        metadata: input.metadata || null,
        updatedBy: input.actorUserId || null,
      },
    });

  const [row] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.ownerType, input.ownerType), eq(subscriptions.ownerId, input.ownerId)))
    .limit(1);

  return row ? toSubscriptionSnapshot(row) : null;
}

export async function initializeAgentStarterTrial(userId: number): Promise<SubscriptionSnapshot | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const [planRow] = await db.select().from(plans).where(eq(plans.name, DEFAULT_AGENT_PLAN)).limit(1);
  if (!planRow) return null;

  const trialDays = Math.max(1, Number(planRow.trialDays || 30));
  const trialEnd = new Date(Date.now() + trialDays * MS_PER_DAY).toISOString().slice(0, 19).replace('T', ' ');

  return await setSubscriptionPlanForOwner({
    ownerType: 'agent',
    ownerId: userId,
    planId: planRow.id,
    status: 'trial',
    trialEndsAt: user.trialEndsAt || trialEnd,
    billingCycleAnchor: user.trialEndsAt || trialEnd,
    metadata: {
      source: 'auth_register',
      onboarding_plan: DEFAULT_AGENT_PLAN,
    },
    actorUserId: userId,
  });
}

export async function getAgencyOwnerIdForUser(userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.agencyId) return null;

  const [agency] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.id, user.agencyId)).limit(1);
  return agency ? Number(agency.id) : null;
}

export function isTrialState(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'trial';
}

export function toSubscriptionTableStatus(
  status: SubscriptionStatus | null | undefined,
): SubscriptionStatus {
  if (status === 'trial' || status === 'active' || status === 'expired' || status === 'cancelled') {
    return status;
  }
  return 'active';
}
