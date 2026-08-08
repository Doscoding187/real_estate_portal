import { and, asc, eq } from 'drizzle-orm';
import {
  agencies,
  developers,
  plans,
  planEntitlements,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db';
import {
  calculateCommercialTermEnd,
  getCommercialProductKey,
  getConfiguredLaunchFeeMinor,
  isPaidCommercialTermExpired,
  parseCommercialMetadata,
  resolveCommercialTerm,
  validatePaidLaunchAccessPayment,
} from './commercialTerm';

export type PlanSegment = 'agent' | 'agency' | 'enterprise' | 'developer';
export type SubscriptionOwnerType = 'agent' | 'agency' | 'developer';
export type SubscriptionStatus =
  | 'trial'
  | 'pending_payment'
  | 'payment_under_review'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'expired';
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
  createdAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
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

const DEFAULT_AGENCY_PLAN = 'agency_growth';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

export function parseEntitlementValue(value: unknown): EntitlementValue {
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
    createdAt: row.createdAt || null,
    trialEndsAt: row.trialEndsAt || null,
    currentPeriodStart: row.currentPeriodStart || null,
    currentPeriodEnd: row.currentPeriodEnd || null,
    graceEndsAt: row.graceEndsAt || null,
    cancelAtPeriodEnd: Boolean(row.cancelAtPeriodEnd),
    cancelledAt: row.cancelledAt || null,
    billingCycleAnchor: row.billingCycleAnchor || null,
    metadata: parseJsonRecord(row.metadata),
  };
}

export function isSubscriptionEntitled(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'trial' || status === 'active' || status === 'grace_period';
}

export function isPaidSubscriptionEntitled(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'active' || status === 'grace_period';
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

async function getOwnerContextForUser(
  db: DbHandle,
  user: UserRow,
): Promise<{
  ownerType: SubscriptionOwnerType;
  ownerId: number;
} | null> {
  if (user.role === 'agency_admin' && user.agencyId) {
    return {
      ownerType: 'agency',
      ownerId: Number(user.agencyId),
    };
  }

  if (user.role === 'property_developer') {
    const [developer] = await db
      .select({ id: developers.id })
      .from(developers)
      .where(eq(developers.userId, user.id))
      .limit(1);

    // A developer subscription is owned by the developer profile, not the
    // login row. Do not fall back to user.id: that would create a second,
    // ambiguous owner identity for canonical subscriptions.
    if (!developer) return null;

    return {
      ownerType: 'developer',
      ownerId: Number(developer.id),
    };
  }

  return {
    ownerType: 'agent',
    ownerId: user.id,
  };
}

async function getStarterPlan(db: DbHandle, ownerType: SubscriptionOwnerType) {
  if (!db) throw new Error('Database not available');

  // Independent agents must explicitly select a canonical product. Automatic
  // plan provisioning is retained only for the existing agency bootstrap path.
  if (ownerType !== 'agency') return null;

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

  const ownerContext = await getOwnerContextForUser(db, user);
  if (!ownerContext || ownerContext.ownerType !== 'agency') return null;
  const { ownerType, ownerId } = ownerContext;
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
  const trialEndsAt = fallbackTrialEnd;
  const status: SubscriptionStatus = 'trial';

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

  const entitlementByPlanId = new Map(
    entitlements.map(entry => [entry.planId, entry.entitlements]),
  );

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

export async function getPlanAccessProjectionForUserId(
  userId: number,
): Promise<PlanAccessProjection | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) return null;

  const ownerContext = await getOwnerContextForUser(db, user);
  if (!ownerContext) return null;
  const { ownerType, ownerId } = ownerContext;

  let [subscriptionRow] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.ownerType, ownerType), eq(subscriptions.ownerId, ownerId)))
    .limit(1);

  const shouldAutoProvision = user.role === 'agency_admin' && ownerType === 'agency';

  if (!subscriptionRow && shouldAutoProvision) {
    subscriptionRow = await ensureDefaultSubscriptionForUser(user);
  }

  let planRow: typeof plans.$inferSelect | null = null;

  if (subscriptionRow?.planId) {
    const [selectedPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, subscriptionRow.planId))
      .limit(1);

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

  const commercialTerm = planRow ? resolveCommercialTerm(planRow) : null;
  const paidLaunchExpired = Boolean(
    commercialTerm &&
    isPaidCommercialTermExpired(
      commercialTerm,
      subscriptionRow?.status,
      subscriptionRow?.currentPeriodEnd,
    ),
  );

  // A paid fixed-term entitlement expires from its canonical period end. It
  // is deliberately not treated as a free trial, and recurring subscriptions
  // retain their existing lifecycle semantics.
  if (paidLaunchExpired && subscriptionRow) {
    await db
      .update(subscriptions)
      .set({ status: 'expired' })
      .where(eq(subscriptions.id, subscriptionRow.id));

    subscriptionRow.status = 'expired';
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
}

export async function setSubscriptionPlanForOwner(input: {
  ownerType: SubscriptionOwnerType;
  ownerId: number;
  planId: number;
  status?: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  billingCycleAnchor?: string | null;
  metadata?: Record<string, unknown> | null;
  actorUserId?: number;
  /**
   * Required when this low-level writer is used to activate a paid fixed-term
   * Launch Access plan. Normal trial and recurring-plan writes do not need
   * this context; paid Launch Access must come from verified billing state.
   */
  verifiedPayment?: VerifiedCommercialPayment;
  /**
   * A pending Launch Access subscription is safe to create before payment;
   * it carries no entitlement until the canonical finance review activates it.
   */
  allowPendingPayment?: boolean;
  /**
   * Optional caller-owned database handle. Bootstrap flows use this to keep
   * the commercial subscription in the same transaction as its owner.
   */
  db?: any;
}): Promise<SubscriptionSnapshot | null> {
  const db = input.db || (await getDb());
  if (!db) throw new Error('Database not available');

  const [planRow] = await db.select().from(plans).where(eq(plans.id, input.planId)).limit(1);
  if (!planRow) {
    throw new Error('Plan not found');
  }

  if (planRow.segment !== input.ownerType) {
    throw new Error('Plan is not eligible for this commercial owner');
  }

  const nextStatus = input.status || 'active';
  const term = resolveCommercialTerm(planRow);
  if (term.kind === 'paid_launch_access') {
    if (nextStatus === 'pending_payment' && input.allowPendingPayment) {
      // Pending payment is intentionally non-entitled. Activation still
      // requires the verified payment branch below.
    } else if (nextStatus !== 'active' || !input.verifiedPayment) {
      throw new Error('Paid Launch Access requires activation through verified billing authority.');
    } else {
      const activationError = validatePaidLaunchAccessPayment(
        term,
        getConfiguredLaunchFeeMinor(planRow),
        input.verifiedPayment,
      );
      if (activationError) {
        throw new Error(activationError);
      }
    }
  }

  const nowTs = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const trialDays = Math.max(0, Number(planRow.trialDays || 0));
  const computedTrialEnd =
    trialDays > 0
      ? new Date(Date.now() + trialDays * MS_PER_DAY).toISOString().slice(0, 19).replace('T', ' ')
      : null;

  const trialEndsAt = input.trialEndsAt ?? (nextStatus === 'trial' ? computedTrialEnd : null);
  const billingCycleAnchor =
    input.billingCycleAnchor ?? (nextStatus === 'trial' ? trialEndsAt : nowTs);

  const insertValues: typeof subscriptions.$inferInsert = {
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    planId: input.planId,
    status: nextStatus,
    trialEndsAt: trialEndsAt || null,
    billingCycleAnchor: billingCycleAnchor || null,
    metadata: input.metadata || null,
    updatedBy: input.actorUserId || null,
    createdBy: input.actorUserId || null,
  };
  const updateSet: Partial<typeof subscriptions.$inferInsert> = {
    planId: input.planId,
    status: nextStatus,
    trialEndsAt: trialEndsAt || null,
    billingCycleAnchor: billingCycleAnchor || null,
    metadata: input.metadata || null,
    updatedBy: input.actorUserId || null,
  };

  if (input.currentPeriodStart !== undefined) {
    insertValues.currentPeriodStart = input.currentPeriodStart;
    updateSet.currentPeriodStart = input.currentPeriodStart;
  }
  if (input.currentPeriodEnd !== undefined) {
    insertValues.currentPeriodEnd = input.currentPeriodEnd;
    updateSet.currentPeriodEnd = input.currentPeriodEnd;
  }
  if (input.cancelAtPeriodEnd !== undefined) {
    insertValues.cancelAtPeriodEnd = input.cancelAtPeriodEnd ? 1 : 0;
    updateSet.cancelAtPeriodEnd = input.cancelAtPeriodEnd ? 1 : 0;
  }

  await db.insert(subscriptions).values(insertValues).onDuplicateKeyUpdate({ set: updateSet });

  const [row] = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.ownerType, input.ownerType), eq(subscriptions.ownerId, input.ownerId)),
    )
    .limit(1);

  return row ? toSubscriptionSnapshot(row) : null;
}

export type VerifiedCommercialPayment = {
  invoiceId: number;
  paymentId: number;
  amountMinor: number;
  state: 'verified';
};

function toDbDateTime(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Activate a generic paid fixed-term commercial product after a canonical
 * finance authority has verified payment. The caller must supply the
 * verified payment context; no public onboarding or catalog read can call
 * this function successfully by itself.
 */
export async function activatePaidLaunchAccessForOwner(input: {
  ownerType: SubscriptionOwnerType;
  ownerId: number;
  planId: number;
  verifiedPayment: VerifiedCommercialPayment;
  actorUserId?: number;
  activatedAt?: Date;
  metadata?: Record<string, unknown> | null;
  db?: any;
}): Promise<SubscriptionSnapshot | null> {
  const db = input.db || (await getDb());
  if (!db) throw new Error('Database not available');

  const [planRow] = await db.select().from(plans).where(eq(plans.id, input.planId)).limit(1);
  if (!planRow) throw new Error('Plan not found');
  if (planRow.segment !== input.ownerType) {
    throw new Error('Plan is not eligible for this commercial owner.');
  }

  const term = resolveCommercialTerm(planRow);
  const configuredFee = getConfiguredLaunchFeeMinor(planRow);
  const activationError = validatePaidLaunchAccessPayment(
    term,
    configuredFee,
    input.verifiedPayment,
  );
  if (activationError) {
    throw new Error(activationError);
  }

  const start = input.activatedAt || new Date();
  const end = calculateCommercialTermEnd(start, term);
  if (!end) throw new Error('Paid Launch Access has no valid duration.');
  const metadata = parseCommercialMetadata(planRow.metadata);

  return setSubscriptionPlanForOwner({
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    planId: input.planId,
    status: 'active',
    trialEndsAt: null,
    currentPeriodStart: toDbDateTime(start),
    currentPeriodEnd: toDbDateTime(end),
    cancelAtPeriodEnd: false,
    billingCycleAnchor: toDbDateTime(end),
    metadata: {
      ...metadata,
      ...(input.metadata || {}),
      commercial_product_key: getCommercialProductKey(planRow),
      commercial_term_kind: 'paid_launch_access',
      commercial_access_activated: true,
      commercial_requires_verified_payment: true,
      commercial_auto_renews: false,
      billing_provider: 'manual_eft',
      verified_invoice_id: input.verifiedPayment.invoiceId,
      verified_payment_id: input.verifiedPayment.paymentId,
      verified_payment_amount_minor: input.verifiedPayment.amountMinor,
      activated_at: toDbDateTime(start),
    },
    actorUserId: input.actorUserId,
    verifiedPayment: input.verifiedPayment,
    db,
  });
}

export async function getAgencyOwnerIdForUser(userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.agencyId) return null;

  const [agency] = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(eq(agencies.id, user.agencyId))
    .limit(1);
  return agency ? Number(agency.id) : null;
}

export async function getDeveloperUserId(developerId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [developer] = await db
    .select({ userId: developers.userId })
    .from(developers)
    .where(eq(developers.id, developerId))
    .limit(1);

  return developer ? Number(developer.userId) : null;
}

export async function getPlanAccessProjectionForDeveloperId(
  developerId: number,
): Promise<PlanAccessProjection | null> {
  const userId = await getDeveloperUserId(developerId);
  return userId ? getPlanAccessProjectionForUserId(userId) : null;
}

export function isTrialState(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'trial';
}

export function toSubscriptionTableStatus(
  status: SubscriptionStatus | null | undefined,
): SubscriptionStatus {
  if (
    status === 'trial' ||
    status === 'pending_payment' ||
    status === 'payment_under_review' ||
    status === 'active' ||
    status === 'past_due' ||
    status === 'grace_period' ||
    status === 'suspended' ||
    status === 'cancelled' ||
    status === 'expired'
  ) {
    return status;
  }
  return 'active';
}
