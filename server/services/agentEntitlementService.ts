import { eq } from 'drizzle-orm';
import { agents, users } from '../../drizzle/schema';
import { getDb } from '../db';
import {
  DEFAULT_FEATURE_ENTITLEMENTS,
  getEntitlementBoolean,
  getEntitlementNumber,
  getPlanAccessProjectionForUserId,
  type EntitlementMap,
  type PlanAccessProjection,
  type PlanSnapshot,
  type SubscriptionSnapshot,
} from './planAccessService';

export type AgentEntitlements = {
  plan: 'trial' | 'paid';
  trialStatus: 'active' | 'expired';
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
};

type AgentTier = 'free' | 'starter' | 'professional' | 'elite';

function normalizeAgentTier(value: string | null | undefined): AgentTier | null {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

  if (!normalized) return null;

  if (normalized === 'free' || normalized === 'agentfree') return 'free';
  if (normalized === 'starter' || normalized === 'agentstarter') return 'starter';
  if (normalized === 'professional' || normalized === 'agentprofessional') return 'professional';
  if (normalized === 'elite' || normalized === 'agentelite') return 'elite';

  if (normalized === 'growth' || normalized === 'agentgrowth') return 'professional';
  if (normalized === 'pro' || normalized === 'agentpro') return 'professional';
  if (normalized === 'launch' || normalized === 'agentlaunch') return 'starter';
  if (normalized === 'dominance' || normalized === 'agentdominance') return 'elite';

  return null;
}

function getTierMinimumEntitlements(tier: AgentTier | null): EntitlementMap {
  switch (tier) {
    case 'elite':
      return {
        ...DEFAULT_FEATURE_ENTITLEMENTS,
        max_active_listings: 999,
        has_ai_insights: true,
        has_area_intelligence: true,
        has_commission_tracking: true,
        has_revenue_dashboard: true,
        has_priority_exposure: true,
        has_benchmarking: true,
      };
    case 'professional':
      return {
        ...DEFAULT_FEATURE_ENTITLEMENTS,
        max_active_listings: 40,
        has_ai_insights: true,
        has_commission_tracking: true,
        has_revenue_dashboard: true,
        has_priority_exposure: true,
      };
    case 'starter':
      return {
        ...DEFAULT_FEATURE_ENTITLEMENTS,
        max_active_listings: 20,
      };
    case 'free':
      return {
        ...DEFAULT_FEATURE_ENTITLEMENTS,
      };
    default:
      return {
        ...DEFAULT_FEATURE_ENTITLEMENTS,
      };
  }
}

function applyTierEntitlementMinimums(
  base: EntitlementMap,
  tier: AgentTier | null,
): EntitlementMap {
  if (!tier) return base;
  const minimums = getTierMinimumEntitlements(tier);
  const merged: EntitlementMap = { ...base };

  for (const [key, value] of Object.entries(minimums)) {
    if (typeof value === 'boolean') {
      if (value && !getEntitlementBoolean(base, key)) {
        merged[key] = true;
      }
      continue;
    }

    if (typeof value === 'number') {
      const current = getEntitlementNumber(base, key, 0);
      if (value > 0 && current <= 0) {
        merged[key] = value;
      }
      continue;
    }
  }

  return merged;
}

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

function normalizeTrialStatus(user: typeof users.$inferSelect | null): 'active' | 'expired' {
  if (!user) return 'expired';

  const now = Date.now();
  const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt).getTime() : null;

  if (trialEnd && Number.isFinite(trialEnd)) {
    return trialEnd > now ? 'active' : 'expired';
  }

  return user.trialStatus === 'expired' ? 'expired' : 'active';
}

function buildFallbackPlanAccess(user: typeof users.$inferSelect): PlanAccessProjection {
  const ownerType = user.role === 'agency_admin' && user.agencyId ? 'agency' : 'agent';
  const ownerId = ownerType === 'agency' ? Number(user.agencyId) : Number(user.id);
  const trialStatus = normalizeTrialStatus(user);
  const trialEndsAt = user.trialEndsAt || null;
  const selectedTier = normalizeAgentTier(user.subscriptionTier);
  const hasFallbackAccess =
    user.plan === 'paid' ||
    trialStatus === 'active' ||
    user.subscriptionStatus === 'active' ||
    user.subscriptionStatus === 'trial';

  let fallbackEntitlements: EntitlementMap = {
    ...DEFAULT_FEATURE_ENTITLEMENTS,
  };

  if (hasFallbackAccess) {
    switch (selectedTier) {
      case 'elite':
        fallbackEntitlements = {
          ...DEFAULT_FEATURE_ENTITLEMENTS,
          max_active_listings: 999,
          has_ai_insights: true,
          has_area_intelligence: true,
          has_commission_tracking: true,
          has_revenue_dashboard: true,
          has_priority_exposure: true,
          has_benchmarking: true,
        };
        break;
      case 'professional':
        fallbackEntitlements = {
          ...DEFAULT_FEATURE_ENTITLEMENTS,
          max_active_listings: 40,
          has_ai_insights: true,
          has_commission_tracking: true,
          has_revenue_dashboard: true,
          has_priority_exposure: true,
        };
        break;
      case 'starter':
        fallbackEntitlements = {
          ...DEFAULT_FEATURE_ENTITLEMENTS,
          max_active_listings: 20,
        };
        break;
      case 'free':
        fallbackEntitlements = {
          ...DEFAULT_FEATURE_ENTITLEMENTS,
        };
        break;
      default: {
        const hasPaidPlan = user.plan === 'paid';
        fallbackEntitlements = {
          ...DEFAULT_FEATURE_ENTITLEMENTS,
          max_active_listings: hasPaidPlan || trialStatus === 'active' ? 25 : 0,
          has_ai_insights: hasPaidPlan,
          has_area_intelligence: hasPaidPlan,
          has_commission_tracking: hasPaidPlan || trialStatus === 'active',
          has_revenue_dashboard: hasPaidPlan,
          has_priority_exposure: hasPaidPlan,
        };
      }
    }
  }

  return {
    ownerType,
    ownerId,
    currentPlan: null,
    subscription: null,
    entitlements: fallbackEntitlements,
    trialStatus,
    trialEndsAt,
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

  const tierFromSubscription = normalizeAgentTier(user.subscriptionTier);
  const tierFromPlan =
    normalizeAgentTier(effectivePlanAccess.currentPlan?.name) ||
    normalizeAgentTier(effectivePlanAccess.currentPlan?.displayName);
  const effectiveTier = tierFromSubscription || tierFromPlan;
  const entitlementsWithTier = applyTierEntitlementMinimums(
    effectivePlanAccess.entitlements,
    effectiveTier,
  );

  const normalizedTrialStatus = normalizeTrialStatus(user);
  const trialStatusFromPlan =
    effectivePlanAccess.trialStatus === 'active' || effectivePlanAccess.trialStatus === 'expired'
      ? effectivePlanAccess.trialStatus
      : normalizedTrialStatus;
  const trialStatus = trialStatusFromPlan;

  if (user.trialStatus !== trialStatus) {
    await db.update(users).set({ trialStatus }).where(eq(users.id, userId));
  }

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
  const hasActivePaidPlan =
    user.plan === 'paid' ||
    effectivePlanAccess.subscription?.status === 'active' ||
    effectivePlanAccess.ownerType === 'agency';
  const trialExpired = !hasActivePaidPlan && trialStatus === 'expired';
  const profileCompletionScore = completion.score;
  const maxActiveListings = getEntitlementNumber(entitlementsWithTier, 'max_active_listings', 0);
  const hasAiInsights = getEntitlementBoolean(entitlementsWithTier, 'has_ai_insights');
  const hasAreaIntelligence = getEntitlementBoolean(entitlementsWithTier, 'has_area_intelligence');
  const hasCommissionTracking = getEntitlementBoolean(
    entitlementsWithTier,
    'has_commission_tracking',
  );
  const hasRevenueDashboard = getEntitlementBoolean(entitlementsWithTier, 'has_revenue_dashboard');
  const hasTeamDashboard = getEntitlementBoolean(entitlementsWithTier, 'has_team_dashboard');
  const hasRecruitmentFunnel = getEntitlementBoolean(
    entitlementsWithTier,
    'has_recruitment_funnel',
  );
  const hasBenchmarking = getEntitlementBoolean(entitlementsWithTier, 'has_benchmarking');
  const hasPriorityExposure = getEntitlementBoolean(entitlementsWithTier, 'has_priority_exposure');
  const planMode: 'trial' | 'paid' =
    effectivePlanAccess.subscription?.status === 'trial' ||
    (!hasActivePaidPlan && user.plan !== 'paid')
      ? 'trial'
      : 'paid';

  const canPublishByPlan = maxActiveListings !== 0;
  const canPublishListings =
    emailVerified && !trialExpired && profileCompletionScore >= 70 && canPublishByPlan;
  const canReceiveLeads = emailVerified && !trialExpired && hasValue(agent?.phone);
  const canAppearInDirectory =
    profileCompletionScore >= 80 &&
    completion.hasPhoto &&
    completion.hasAreas &&
    agent?.status !== 'suspended';

  return {
    plan: planMode,
    trialStatus,
    trialStartedAt: user.trialStartedAt || null,
    trialEndsAt: effectivePlanAccess.trialEndsAt || user.trialEndsAt || null,
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
    rawEntitlements: entitlementsWithTier,
    featureFlags: {
      ...entitlementsWithTier,
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
