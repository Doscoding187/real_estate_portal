import { getDb } from '../db-connection';
import { and, eq, gte, sql } from 'drizzle-orm';
import {
  cataloguePublishers,
  developerOrganisationMemberships,
  developments,
  leads,
} from '../../drizzle/schema.ts';
import {
  DeveloperSubscription,
  DeveloperSubscriptionLimits,
  DeveloperSubscriptionUsage,
  DeveloperSubscriptionWithDetails,
  SubscriptionTier,
} from '../../shared/types.ts';
import {
  getPlanAccessProjectionForDeveloperId,
  getEntitlementBoolean,
  getEntitlementNumber,
  isSubscriptionEntitled,
  type EntitlementMap,
  type PlanAccessProjection,
} from './planAccessService';
import { resolveCommercialTerm } from './commercialTerm';

type DeveloperLimitType = 'developments' | 'leads' | 'teamMembers';

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEntitlementNumberFromKeys(entitlements: EntitlementMap, keys: string[]): number {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(entitlements, key)) continue;
    return Math.max(0, Math.floor(getEntitlementNumber(entitlements, key, 0)));
  }

  // Missing canonical entitlement means no entitlement. Never fall back to
  // the retired developer tier constants here.
  return 0;
}

function getEntitlementBooleanFromKeys(entitlements: EntitlementMap, keys: string[]): boolean {
  return keys.some(key =>
    Object.prototype.hasOwnProperty.call(entitlements, key)
      ? getEntitlementBoolean(entitlements, key, false)
      : false,
  );
}

function getCanonicalLimits(
  anchorId: number,
  entitlements: EntitlementMap,
): DeveloperSubscriptionLimits {
  const now = new Date();

  return {
    id: 0,
    subscriptionId: anchorId,
    developmentPortfolioUnlimited: getEntitlementBooleanFromKeys(entitlements, [
      'unlimited_development_portfolio',
    ]),
    maxDevelopments: getEntitlementNumberFromKeys(entitlements, [
      'max_developments',
      'max_active_developments',
    ]),
    maxLeadsPerMonth: getEntitlementNumberFromKeys(entitlements, [
      'max_leads_per_month',
      'max_monthly_leads',
    ]),
    maxTeamMembers: getEntitlementNumberFromKeys(entitlements, ['max_team_members', 'max_users']),
    analyticsRetentionDays: getEntitlementNumberFromKeys(entitlements, [
      'analytics_retention_days',
    ]),
    crmIntegrationEnabled: getEntitlementBooleanFromKeys(entitlements, [
      'crm_integration_enabled',
      'has_crm_integration',
    ]),
    advancedAnalyticsEnabled: getEntitlementBooleanFromKeys(entitlements, [
      'advanced_analytics_enabled',
      'has_advanced_analytics',
    ]),
    bondIntegrationEnabled: getEntitlementBooleanFromKeys(entitlements, [
      'bond_integration_enabled',
      'has_bond_integration',
    ]),
    createdAt: now,
    updatedAt: now,
  };
}

function toCompatibilityTier(projection: PlanAccessProjection): SubscriptionTier {
  if (
    projection.currentPlan &&
    resolveCommercialTerm(projection.currentPlan).kind === 'paid_launch_access'
  ) {
    return 'launch_access';
  }
  if (projection.subscription?.status === 'trial') return 'free_trial';

  const planName = projection.currentPlan?.name.toLowerCase() || '';
  if (planName.includes('premium') || planName.includes('enterprise')) return 'premium';
  if (planName.includes('basic')) return 'basic';

  // This field exists only for older clients. Canonical consumers must use
  // projection.currentPlan and projection.subscription instead.
  return 'free_trial';
}

function toCompatibilityStatus(
  status: PlanAccessProjection['subscription'] extends infer T
    ? T extends { status: infer S }
      ? S
      : never
    : never,
): DeveloperSubscription['status'] {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'expired' || status === 'suspended') return 'expired';
  return 'active';
}

function getUsageDefaults(anchorId: number): DeveloperSubscriptionUsage {
  const now = new Date();
  return {
    id: 0,
    subscriptionId: anchorId,
    developmentsCount: 0,
    leadsThisMonth: 0,
    teamMembersCount: 0,
    lastResetAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function evaluateDeveloperLimitAccess(input: {
  entitled: boolean;
  current: number;
  max: number | null;
  unlimited: boolean;
}): boolean {
  return input.entitled && (input.unlimited || (input.max !== null && input.current < input.max));
}

export class DeveloperSubscriptionService {
  /**
   * Reads the canonical developer commercial state. Developer onboarding is
   * not a free-trial activation path: Launch Access begins only after a
   * verified canonical payment activates the subscription.
   */
  async ensureSubscription(developerId: number): Promise<DeveloperSubscriptionWithDetails | null> {
    return this.getSubscription(developerId);
  }

  /**
   * Retained only as an explicit compatibility failure. A developer product
   * selection or onboarding call must never create a free trial or active paid
   * state as a side effect.
   */
  async createSubscription(_developerId: number): Promise<never> {
    throw new Error(
      'Developer free-trial provisioning is retired; activate Launch Access only from verified canonical payment.',
    );
  }

  /**
 * Return canonical commercial state plus usage derived from the current
 * organisation-owned facts. No historical developer subscription or usage
 * table is created or consulted by the new identity authority.
  */
  async getSubscription(developerId: number): Promise<DeveloperSubscriptionWithDetails | null> {
    const projection = await getPlanAccessProjectionForDeveloperId(developerId);
    if (
      !projection ||
      projection.ownerType !== 'developer' ||
      !projection.subscription ||
      !projection.currentPlan
    ) {
      return null;
    }

    const database = await getDb();
    if (!database) throw new Error('Database not available');
    const usage = await this.getDerivedUsage(database, developerId, projection.subscription.id);
    const now = new Date();
    const canonicalStatus = projection.subscription.status;

    return {
      id: Number(projection.subscription.id),
      developerId,
      planId: projection.currentPlan.id,
      tier: toCompatibilityTier(projection),
      status: toCompatibilityStatus(canonicalStatus),
      trialEndsAt: toDate(projection.subscription.trialEndsAt),
      currentPeriodStart: toDate(projection.subscription.currentPeriodStart),
      currentPeriodEnd: toDate(projection.subscription.currentPeriodEnd),
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      createdAt: toDate(projection.subscription.createdAt) || now,
      updatedAt: toDate(projection.subscription.createdAt) || now,
      limits: getCanonicalLimits(Number(projection.subscription.id), projection.entitlements),
      usage,
      commercial: {
        ownerType: 'developer',
        ownerId: projection.ownerId,
        subscriptionId: projection.subscription.id,
        planId: projection.currentPlan.id,
        planName: projection.currentPlan.name,
        planDisplayName: projection.currentPlan.displayName,
        status: canonicalStatus,
        entitled: isSubscriptionEntitled(canonicalStatus),
        commercialTerm: resolveCommercialTerm(projection.currentPlan),
        trialStatus: projection.trialStatus,
        trialEndsAt: projection.trialEndsAt,
        trialDaysRemaining: projection.trialDaysRemaining,
        entitlements: projection.entitlements,
      },
    };
  }

  /**
   * Legacy tier mutation is retired. Paid developer state must come from a
   * verified canonical billing path, never from this compatibility method.
   */
  async updateTier(_developerId: number, _newTier: SubscriptionTier): Promise<never> {
    throw new Error(
      'Legacy developer tier updates are retired; request a canonical developer invoice instead.',
    );
  }

  async checkLimit(
    developerId: number,
    limitType: DeveloperLimitType,
  ): Promise<{
    allowed: boolean;
    current: number;
    max: number | null;
    unlimited: boolean;
    tier: string;
  }> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) {
      return { allowed: false, current: 0, max: 0, unlimited: false, tier: 'unavailable' };
    }

    let current: number;
    let max: number | null;
    let unlimited = false;

    switch (limitType) {
      case 'developments':
        current = subscription.usage.developmentsCount;
        unlimited = subscription.limits.developmentPortfolioUnlimited;
        max = unlimited ? null : subscription.limits.maxDevelopments;
        break;
      case 'leads':
        current = subscription.usage.leadsThisMonth;
        max = subscription.limits.maxLeadsPerMonth;
        break;
      case 'teamMembers':
        current = subscription.usage.teamMembersCount;
        max = subscription.limits.maxTeamMembers;
        break;
    }

    return {
      allowed: evaluateDeveloperLimitAccess({
        entitled: subscription.commercial.entitled,
        current,
        max,
        unlimited,
      }),
      current,
      max,
      unlimited,
      tier: subscription.commercial.planDisplayName,
    };
  }

  async checkFeatureAccess(
    developerId: number,
    feature: 'crm' | 'advanced_analytics' | 'bond_integration',
  ): Promise<{ allowed: boolean; planName: string }> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) return { allowed: false, planName: 'Unavailable' };

    const allowed =
      subscription.commercial.entitled &&
      (feature === 'crm'
        ? subscription.limits.crmIntegrationEnabled
        : feature === 'advanced_analytics'
          ? subscription.limits.advancedAnalyticsEnabled
          : subscription.limits.bondIntegrationEnabled);

    return {
      allowed,
      planName: subscription.commercial.planDisplayName,
    };
  }

  async incrementUsage(developerId: number, usageType: DeveloperLimitType): Promise<void> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) throw new Error('Canonical developer subscription not found');
    void usageType;
    // Usage is a projection of organisation-owned facts. Mutation callers are
    // retained for API compatibility, but there is no mutable meter to drift.
  }

  async decrementUsage(developerId: number, usageType: DeveloperLimitType): Promise<void> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) throw new Error('Canonical developer subscription not found');
    void usageType;
  }

  async resetMonthlyLeadCount(developerId: number): Promise<void> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) throw new Error('Canonical developer subscription not found');
  }

  /** Trial state is read from canonical subscriptions; this method is now a
   * compatibility projection and never mutates legacy developer state. */
  async checkTrialExpiration(
    developerId: number,
  ): Promise<{ expired: boolean; daysRemaining: number }> {
    const projection = await getPlanAccessProjectionForDeveloperId(developerId);
    if (!projection?.subscription) return { expired: true, daysRemaining: 0 };

    return {
      expired: projection.subscription.status === 'expired' || projection.trialStatus === 'expired',
      daysRemaining: Math.max(0, projection.trialDaysRemaining || 0),
    };
  }

  async resetDevelopmentCount(developerId: number): Promise<{ newCount: number }> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) throw new Error('Canonical developer subscription not found');
    return { newCount: subscription.usage.developmentsCount };
  }

  private async getDerivedUsage(
    database: any,
    organisationId: number,
    subscriptionId: number,
  ): Promise<DeveloperSubscriptionUsage> {
    const [publisher] = await database
      .select({ id: cataloguePublishers.id })
      .from(cataloguePublishers)
      .where(
        and(
          eq(cataloguePublishers.developerOrganisationId, organisationId),
          eq(cataloguePublishers.authorityKind, 'developer_first_party'),
        ),
      )
      .limit(1);

    const publisherId = publisher?.id ?? 0;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthStartValue = monthStart.toISOString().slice(0, 19).replace('T', ' ');
    const [developmentResult] = publisherId
      ? await database
          .select({ count: sql<number>`COUNT(*)` })
          .from(developments)
          .where(eq(developments.cataloguePublisherId, publisherId))
      : [{ count: 0 }];
    const [leadResult] = publisherId
      ? await database
          .select({ count: sql<number>`COUNT(*)` })
          .from(leads)
          .where(
            and(
              eq(leads.cataloguePublisherId, publisherId),
              gte(leads.createdAt, monthStartValue),
            ),
          )
      : [{ count: 0 }];
    const [memberResult] = await database
      .select({ count: sql<number>`COUNT(*)` })
      .from(developerOrganisationMemberships)
      .where(
        and(
          eq(developerOrganisationMemberships.organisationId, organisationId),
          eq(developerOrganisationMemberships.status, 'active'),
        ),
      );
    const now = new Date();
    return {
      id: 0,
      subscriptionId,
      developmentsCount: Number(developmentResult?.count ?? 0),
      leadsThisMonth: Number(leadResult?.count ?? 0),
      teamMembersCount: Number(memberResult?.count ?? 0),
      lastResetAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }
}

export const developerSubscriptionService = new DeveloperSubscriptionService();
