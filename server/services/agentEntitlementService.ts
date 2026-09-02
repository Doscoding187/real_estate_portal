import { eq } from 'drizzle-orm';
import { agents, users } from '../../drizzle/schema';
import { getDb } from '../db';
import {
  DEFAULT_FEATURE_ENTITLEMENTS,
  getEntitlementBoolean,
  getEntitlementNumber,
  getPlanAccessProjectionForUserId,
  isPaidSubscriptionEntitled,
  isSubscriptionEntitled,
  type EntitlementMap,
  type PlanAccessProjection,
  type PlanSnapshot,
  type SubscriptionSnapshot,
} from './planAccessService';

export type AgentEntitlements = {
  plan: 'trial' | 'paid';
  trialStatus: 'active' | 'expired' | 'none';
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialExpired: boolean;
  emailVerified: boolean;
  profileCompletionScore: number;
  profileCompletionFlags: string[];
  canPublishListings: boolean;
  canReceiveLeads: boolean;
  canAppearInDirectory: boolean;
  currentPlan: PlanSnapshot | null;
  subscription: SubscriptionSnapshot | null;
  trialStatusDetail: {
    status: 'active' | 'expired' | 'none';
    trialEndsAt: string | null;
    daysRemaining: number | null;
  };
  rawEntitlements: EntitlementMap;
  featureFlags: EntitlementMap & {
    maxActiveListings: number;
    hasAiInsights: boolean;
    hasAreaIntelligence: boolean;
    hasCommissionTracking: boolean;
    hasRevenueDashboard: boolean;
    hasTeamDashboard: boolean;
    hasRecruitmentFunnel: boolean;
    hasBenchmarking: boolean;
    hasPriorityExposure: boolean;
  };
};

export type ProfileCompletionResult = {
  score: number;
  flags: string[];
  hasPhoto: boolean;
  hasAreas: boolean;
  hasPhone: boolean;
};

function hasValue(value: unknown): boolean {
  if (typeof value !== 'string') return Boolean(value);
  return value.trim().length > 0;
}

function parseFlags(value: unknown): string[] {
  if (!hasValue(value)) return [];
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // no-op
    }
  }

  return [];
}

function buildFallbackPlanAccess(user: typeof users.$inferSelect): PlanAccessProjection {
  const ownerType = user.role === 'agency_admin' && user.agencyId ? 'agency' : 'agent';
  const ownerId = ownerType === 'agency' ? Number(user.agencyId) : Number(user.id);

  return {
    ownerType,
    ownerId,
    currentPlan: null,
    subscription: null,
    entitlements: { ...DEFAULT_FEATURE_ENTITLEMENTS },
    trialStatus: 'none',
    trialEndsAt: null,
    trialDaysRemaining: null,
  };
}

export function calculateAgentProfileCompletion(
  agent: typeof agents.$inferSelect | null,
): ProfileCompletionResult {
  if (!agent) {
    return {
      score: 0,
      flags: ['missing_profile'],
      hasPhoto: false,
      hasAreas: false,
      hasPhone: false,
    };
  }

  const hasPhoto = hasValue(agent.profileImage);
  const hasAreas = hasValue(agent.areasServed);
  const hasBio = hasValue(agent.bio);
  const hasPhone = hasValue(agent.phone);
  const hasFocus = hasValue(agent.focus) || hasValue(agent.specialization);
  const hasPropertyTypes = hasValue(agent.propertyTypes);

  const checks = [
    { key: 'missing_photo', ok: hasPhoto, weight: 20 },
    { key: 'missing_areas', ok: hasAreas, weight: 20 },
    { key: 'missing_bio', ok: hasBio, weight: 15 },
    { key: 'missing_phone', ok: hasPhone, weight: 15 },
    { key: 'missing_focus', ok: hasFocus, weight: 15 },
    { key: 'missing_property_types', ok: hasPropertyTypes, weight: 15 },
  ];

  const score = checks.reduce((sum, item) => (item.ok ? sum + item.weight : sum), 0);
  const flags = checks.filter(item => !item.ok).map(item => item.key);

  return {
    score,
    flags,
    hasPhoto,
    hasAreas,
    hasPhone,
  };
}

export async function getAgentEntitlementsForUserId(
  userId: number,
): Promise<AgentEntitlements | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const [agent] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);

  let planAccess: PlanAccessProjection | null = null;
  try {
    planAccess = await getPlanAccessProjectionForUserId(userId);
  } catch (error) {
    console.warn('[AgentEntitlements] Plan access projection failed; using fallback projection.', {
      userId,
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
  }

  const effectivePlanAccess = planAccess || buildFallbackPlanAccess(user);

  // Commercial access is projected exclusively from canonical subscriptions
  // and plan_entitlements. The legacy users.plan/subscription fields are
  // intentionally not read or synchronized here.
  const entitlements = effectivePlanAccess.entitlements;
  const trialStatus = effectivePlanAccess.trialStatus;

  const completion = calculateAgentProfileCompletion(agent || null);
  const persistedFlags = parseFlags(agent?.profileCompletionFlags);
  const shouldSyncCompletion =
    Boolean(agent) &&
    (agent!.profileCompletionScore !== completion.score ||
      JSON.stringify(persistedFlags) !== JSON.stringify(completion.flags));

  if (agent && shouldSyncCompletion) {
    await db
      .update(agents)
      .set({
        profileCompletionScore: completion.score,
        profileCompletionFlags: JSON.stringify(completion.flags),
      })
      .where(eq(agents.id, agent.id));
  }

  const emailVerified = user.emailVerified === 1;
  const paidSubscriptionEntitled = isPaidSubscriptionEntitled(
    effectivePlanAccess.subscription?.status,
  );
  const hasActivePaidPlan = paidSubscriptionEntitled;
  const hasCommercialAccess = isSubscriptionEntitled(effectivePlanAccess.subscription?.status);
  const trialExpired = !hasActivePaidPlan && trialStatus === 'expired';
  const profileCompletionScore = completion.score;
  const agentApproved = agent?.status === 'approved';
  const maxActiveListings = getEntitlementNumber(entitlements, 'max_active_listings', 0);
  const hasAiInsights = getEntitlementBoolean(entitlements, 'has_ai_insights');
  const hasAreaIntelligence = getEntitlementBoolean(entitlements, 'has_area_intelligence');
  const hasCommissionTracking = getEntitlementBoolean(entitlements, 'has_commission_tracking');
  const hasRevenueDashboard = getEntitlementBoolean(entitlements, 'has_revenue_dashboard');
  const hasTeamDashboard = getEntitlementBoolean(entitlements, 'has_team_dashboard');
  const hasRecruitmentFunnel = getEntitlementBoolean(entitlements, 'has_recruitment_funnel');
  const hasBenchmarking = getEntitlementBoolean(entitlements, 'has_benchmarking');
  const hasPriorityExposure = getEntitlementBoolean(entitlements, 'has_priority_exposure');
  const planMode: 'trial' | 'paid' = hasActivePaidPlan ? 'paid' : 'trial';

  const canPublishByPlan = maxActiveListings > 0;
  const canPublishListings =
    hasCommercialAccess &&
    emailVerified &&
    agentApproved &&
    !trialExpired &&
    profileCompletionScore >= 70 &&
    canPublishByPlan;
  const canReceiveLeads =
    hasCommercialAccess &&
    emailVerified &&
    agentApproved &&
    !trialExpired &&
    hasValue(agent?.phone);
  const canAppearInDirectory =
    profileCompletionScore >= 80 &&
    completion.hasPhoto &&
    completion.hasAreas &&
    // Approval is the public identity gate. `isVerified` is an optional trust
    // badge used by specific discovery surfaces (for example Explore), not a
    // prerequisite for the canonical approved-agent directory or for the
    // commercial listing/lead journey.
    agentApproved;

  return {
    plan: planMode,
    trialStatus,
    trialStartedAt:
      effectivePlanAccess.subscription && trialStatus !== 'none'
        ? effectivePlanAccess.subscription.createdAt
        : null,
    trialEndsAt: effectivePlanAccess.trialEndsAt || null,
    trialExpired,
    emailVerified,
    profileCompletionScore,
    profileCompletionFlags: completion.flags,
    canPublishListings,
    canReceiveLeads,
    canAppearInDirectory,
    currentPlan: effectivePlanAccess.currentPlan,
    subscription: effectivePlanAccess.subscription,
    trialStatusDetail: {
      status: effectivePlanAccess.trialStatus,
      trialEndsAt: effectivePlanAccess.trialEndsAt,
      daysRemaining: effectivePlanAccess.trialDaysRemaining,
    },
    rawEntitlements: entitlements,
    featureFlags: {
      ...entitlements,
      maxActiveListings,
      hasAiInsights,
      hasAreaIntelligence,
      hasCommissionTracking,
      hasRevenueDashboard,
      hasTeamDashboard,
      hasRecruitmentFunnel,
      hasBenchmarking,
      hasPriorityExposure,
    },
  };
}
