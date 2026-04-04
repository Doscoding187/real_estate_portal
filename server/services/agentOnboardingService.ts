import { and, eq, ne } from 'drizzle-orm';
import { agents, users } from '../../drizzle/schema';
import { createAgentProfile, getDb } from '../db';
import {
  calculateAgentProfileCompletion,
  getAgentEntitlementsForUserId,
} from './agentEntitlementService';
import {
  getPlanAccessProjectionForUserId,
  getPlanByName,
  setSubscriptionPlanForOwner,
} from './planAccessService';
import { nowAsDbTimestamp } from '../utils/dbTypeUtils';

export const AGENT_ONBOARDING_TIER_VALUES = ['free', 'starter', 'professional', 'elite'] as const;
export const AGENT_ONBOARDING_STATUS_VALUES = ['trial', 'active', 'expired', 'cancelled'] as const;

export type AgentOnboardingTier = (typeof AGENT_ONBOARDING_TIER_VALUES)[number];
export type AgentOnboardingStatus = (typeof AGENT_ONBOARDING_STATUS_VALUES)[number];

const AGENT_PLAN_NAME_CANDIDATES: Record<AgentOnboardingTier, string[]> = {
  free: ['agent_free', 'free'],
  starter: ['agent_starter', 'starter', 'agent_free', 'free'],
  professional: ['agent_professional', 'professional', 'agent_pro', 'pro'],
  elite: ['agent_elite', 'elite'],
};
const AGENT_TRIAL_DAYS = 90;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function splitCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseJsonRecord(value: string | null | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(
          ([, item]) => typeof item === 'string',
        ),
      ) as Record<string, string>;
    }
  } catch {
    // no-op
  }
  return {};
}

async function resolvePlanForTier(tier: AgentOnboardingTier) {
  const planNames = AGENT_PLAN_NAME_CANDIDATES[tier] || [];

  for (const planName of planNames) {
    const plan = await getPlanByName(planName);
    if (plan) {
      return plan;
    }
  }

  return null;
}

function isPlanAlignedWithTier(
  tier: AgentOnboardingTier,
  planName: string | null | undefined,
): boolean {
  if (!planName) return false;
  return (AGENT_PLAN_NAME_CANDIDATES[tier] || []).includes(planName);
}

function buildOnboardingState(
  user: typeof users.$inferSelect,
  agent: typeof agents.$inferSelect | null,
) {
  const completion = calculateAgentProfileCompletion(agent);
  const packageSelected =
    Boolean(user.trialStartedAt) ||
    user.plan === 'paid' ||
    user.subscriptionStatus === 'active' ||
    user.subscriptionStatus === 'expired' ||
    user.subscriptionStatus === 'cancelled';

  let onboardingStep = packageSelected ? Math.max(Number(user.onboardingStep || 0), 1) : 0;
  if (packageSelected && completion.score >= 25) onboardingStep = Math.max(onboardingStep, 2);
  if (packageSelected && completion.score >= 50) onboardingStep = Math.max(onboardingStep, 3);
  if (packageSelected && completion.score >= 80 && completion.hasPhoto && completion.hasAreas) {
    onboardingStep = Math.max(onboardingStep, 4);
  }

  const onboardingComplete =
    packageSelected &&
    (onboardingStep >= 4 || (user.onboardingComplete === 1 && completion.score >= 80));

  return {
    packageSelected,
    onboardingStep,
    onboardingComplete,
    profileCompletionScore: completion.score,
    profileCompletionFlags: completion.flags,
    dashboardUnlocked: packageSelected && onboardingStep >= 3,
    fullFeaturesUnlocked: onboardingComplete,
    recommendedNextStep: !packageSelected
      ? 'select_package'
      : onboardingComplete
        ? 'dashboard'
        : onboardingStep <= 2
          ? 'complete_profile_basics'
          : onboardingStep === 3
            ? 'publish_profile'
            : 'dashboard',
  };
}

function toPublicAgentProfile(agent: typeof agents.$inferSelect | null) {
  if (!agent) return null;

  return {
    id: agent.id,
    displayName: agent.displayName || `${agent.firstName} ${agent.lastName}`.trim(),
    phone: agent.phone || '',
    whatsapp: agent.whatsapp || '',
    bio: agent.bio || '',
    profileImage: agent.profileImage || '',
    licenseNumber: agent.licenseNumber || '',
    yearsExperience: agent.yearsExperience || 0,
    focus: agent.focus || null,
    slug: agent.slug || '',
    agencyId: agent.agencyId || null,
    areasServed: splitCsv(agent.areasServed),
    specializations: splitCsv(agent.specialization),
    propertyTypes: splitCsv(agent.propertyTypes),
    languages: splitCsv(agent.languages),
    socialLinks: parseJsonRecord(agent.socialLinks),
  };
}

export class AgentOnboardingService {
  async getOnboardingStatus(userId: number) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error('User not found');
    if (user.role !== 'agent') throw new Error('Agent onboarding is only available to agents');

    const [agent] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);
    const onboardingState = buildOnboardingState(user, agent || null);

    if (
      Number(user.onboardingStep || 0) !== onboardingState.onboardingStep ||
      Number(user.onboardingComplete || 0) !== (onboardingState.onboardingComplete ? 1 : 0)
    ) {
      await db
        .update(users)
        .set({
          onboardingStep: onboardingState.onboardingStep,
          onboardingComplete: onboardingState.onboardingComplete ? 1 : 0,
        })
        .where(eq(users.id, userId));
    }

    if (onboardingState.packageSelected) {
      const selectedTier = user.subscriptionTier as AgentOnboardingTier;
      const selectedPlan = await resolvePlanForTier(selectedTier);
      if (selectedPlan) {
        const currentProjection = await getPlanAccessProjectionForUserId(userId);
        const currentPlanName = currentProjection?.currentPlan?.name || null;

        if (!isPlanAlignedWithTier(selectedTier, currentPlanName)) {
          const effectiveStatus =
            user.subscriptionStatus === 'active' ||
            user.subscriptionStatus === 'expired' ||
            user.subscriptionStatus === 'cancelled'
              ? user.subscriptionStatus
              : 'trial';
          const billingAnchor =
            effectiveStatus === 'trial'
              ? user.trialEndsAt || nowAsDbTimestamp()
              : nowAsDbTimestamp();

          await setSubscriptionPlanForOwner({
            ownerType: 'agent',
            ownerId: userId,
            planId: selectedPlan.id,
            status: effectiveStatus,
            trialEndsAt: effectiveStatus === 'trial' ? user.trialEndsAt || null : null,
            billingCycleAnchor: billingAnchor,
            metadata: {
              source: 'agent_onboarding_status_sync',
              selected_package_tier: selectedTier,
              selected_plan_name: selectedPlan.name,
            },
            actorUserId: userId,
          });
        }
      }
    }

    const entitlements = await getAgentEntitlementsForUserId(userId);

    return {
      role: user.role,
      packageSelected: onboardingState.packageSelected,
      onboardingComplete: onboardingState.onboardingComplete,
      onboardingStep: onboardingState.onboardingStep,
      dashboardUnlocked: onboardingState.dashboardUnlocked,
      fullFeaturesUnlocked: onboardingState.fullFeaturesUnlocked,
      recommendedNextStep: onboardingState.recommendedNextStep,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      trialStartedAt: user.trialStartedAt || null,
      trialEndsAt: user.trialEndsAt || null,
      profile: toPublicAgentProfile(agent || null),
      profileCompletionScore: onboardingState.profileCompletionScore,
      profileCompletionFlags: onboardingState.profileCompletionFlags,
      entitlements,
    };
  }

  async selectPackage(userId: number, tier: AgentOnboardingTier) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error('User not found');
    if (user.role !== 'agent') throw new Error('Package selection is only available to agents');

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + AGENT_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const trialStartedAtValue = nowAsDbTimestamp();
    const trialEndsAtValue = trialEndsAt.toISOString();

    await db
      .update(users)
      .set({
        onboardingStep: Math.max(Number(user.onboardingStep || 0), 1),
        onboardingComplete: 0,
        plan: 'trial',
        trialStatus: 'active',
        trialStartedAt: trialStartedAtValue,
        trialEndsAt: trialEndsAtValue,
        subscriptionTier: tier,
        subscriptionStatus: 'trial',
      })
      .where(eq(users.id, userId));

    const selectedPlan = await resolvePlanForTier(tier);
    if (selectedPlan) {
      await setSubscriptionPlanForOwner({
        ownerType: 'agent',
        ownerId: userId,
        planId: selectedPlan.id,
        status: 'trial',
        trialEndsAt: trialEndsAtValue,
        billingCycleAnchor: trialEndsAtValue,
        metadata: {
          source: 'agent_select_package',
          selected_package_tier: tier,
          selected_plan_name: selectedPlan.name,
        },
        actorUserId: userId,
      });
    }

    return this.getOnboardingStatus(userId);
  }

  async saveProfile(
    userId: number,
    input: {
      displayName?: string;
      phone?: string;
      whatsapp?: string;
      bio?: string;
      profileImage?: string;
      profilePhoto?: string;
      licenseNumber?: string;
      yearsExperience?: number;
      focus?: 'sales' | 'rentals' | 'both';
      areasServed?: string[];
      specializations?: string[];
      propertyTypes?: string[];
      languages?: string[];
      socialLinks?: Record<string, string>;
      slug?: string;
      agencyId?: number | null;
      onboardingStep?: number;
    },
  ) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error('User not found');
    if (user.role !== 'agent') throw new Error('Agent onboarding is only available to agents');

    let [agent] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);

    if (!agent) {
      const fallbackDisplayName =
        input.displayName?.trim() || user.name || user.email?.split('@')[0] || 'Agent';
      const fallbackPhone = input.phone?.trim() || input.whatsapp?.trim() || '';
      if (!fallbackPhone) {
        throw new Error('Phone number is required to create an agent profile');
      }

      await createAgentProfile({
        userId,
        displayName: fallbackDisplayName,
        phone: fallbackPhone,
        bio: input.bio,
        profilePhoto: input.profilePhoto || input.profileImage,
        licenseNumber: input.licenseNumber,
        specializations: input.specializations,
      });

      [agent] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);
    }

    if (!agent) throw new Error('Agent profile not found');

    let normalizedSlug: string | undefined;
    if (typeof input.slug === 'string') {
      normalizedSlug = slugify(input.slug);
      if (normalizedSlug.length < 3) {
        throw new Error('Profile slug must be at least 3 URL-safe characters');
      }

      const [slugConflict] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.slug, normalizedSlug), ne(agents.id, agent.id)))
        .limit(1);

      if (slugConflict) {
        throw new Error('This profile URL is already taken');
      }
    }

    const profileImage = input.profileImage ?? input.profilePhoto;
    const updates: Record<string, unknown> = {
      updatedAt: nowAsDbTimestamp(),
    };

    if (input.displayName !== undefined) {
      const displayName = input.displayName.trim();
      updates.displayName = displayName;
      const [firstNameRaw, ...rest] = displayName.split(/\s+/).filter(Boolean);
      updates.firstName = firstNameRaw || displayName;
      updates.lastName = rest.join(' ') || '-';
    }
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.whatsapp !== undefined) updates.whatsapp = input.whatsapp;
    if (input.bio !== undefined) updates.bio = input.bio;
    if (profileImage !== undefined) updates.profileImage = profileImage;
    if (input.licenseNumber !== undefined) updates.licenseNumber = input.licenseNumber;
    if (input.yearsExperience !== undefined) updates.yearsExperience = input.yearsExperience;
    if (input.focus !== undefined) updates.focus = input.focus;
    if (input.areasServed !== undefined) updates.areasServed = input.areasServed.join(', ');
    if (input.specializations !== undefined) {
      updates.specialization = input.specializations.join(', ');
    }
    if (input.propertyTypes !== undefined) updates.propertyTypes = input.propertyTypes.join(', ');
    if (input.languages !== undefined) updates.languages = input.languages.join(', ');
    if (input.socialLinks !== undefined) updates.socialLinks = JSON.stringify(input.socialLinks);
    if (normalizedSlug !== undefined) updates.slug = normalizedSlug;
    if (input.agencyId !== undefined) updates.agencyId = input.agencyId;

    await db
      .update(agents)
      .set(updates as any)
      .where(eq(agents.id, agent.id));

    const [updatedAgent] = await db.select().from(agents).where(eq(agents.id, agent.id)).limit(1);
    const onboardingState = buildOnboardingState(
      {
        ...user,
        onboardingStep: Math.max(
          Number(user.onboardingStep || 0),
          Number(input.onboardingStep || 0),
        ),
      } as typeof users.$inferSelect,
      updatedAgent || null,
    );

    await db
      .update(agents)
      .set({
        profileCompletionScore: onboardingState.profileCompletionScore,
        profileCompletionFlags: JSON.stringify(onboardingState.profileCompletionFlags),
        updatedAt: nowAsDbTimestamp(),
      })
      .where(eq(agents.id, agent.id));

    await db
      .update(users)
      .set({
        onboardingStep: onboardingState.onboardingStep,
        onboardingComplete: onboardingState.onboardingComplete ? 1 : 0,
      })
      .where(eq(users.id, userId));

    const entitlements = await getAgentEntitlementsForUserId(userId);

    return {
      success: true,
      onboardingComplete: onboardingState.onboardingComplete,
      onboardingStep: onboardingState.onboardingStep,
      dashboardUnlocked: onboardingState.dashboardUnlocked,
      fullFeaturesUnlocked: onboardingState.fullFeaturesUnlocked,
      profile: toPublicAgentProfile(updatedAgent || null),
      profileCompletionScore: onboardingState.profileCompletionScore,
      profileCompletionFlags: onboardingState.profileCompletionFlags,
      entitlements,
    };
  }
}

export const agentOnboardingService = new AgentOnboardingService();
