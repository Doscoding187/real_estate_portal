import { db } from '../db.ts';
import {
  developerSubscriptions,
  developerSubscriptionLimits,
  developerSubscriptionUsage,
  developers,
  developments,
} from '../../drizzle/schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import {
  DeveloperSubscription,
  DeveloperSubscriptionLimits,
  DeveloperSubscriptionUsage,
  DeveloperSubscriptionWithDetails,
  SubscriptionTier,
  SUBSCRIPTION_TIER_LIMITS,
} from '../../shared/types.ts';

export class DeveloperSubscriptionService {
  /**
   * Create a new developer subscription with free trial tier
   * Validates: Requirements 1.1, 1.2
   */
  async createSubscription(developerId: number): Promise<DeveloperSubscriptionWithDetails> {
    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create subscription with free_trial tier
    const subscriptionResult = await db.insert(developerSubscriptions).values({
      developerId,
      tier: 'free_trial',
      status: 'active',
      trialEndsAt: trialEndsAt.toISOString(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: trialEndsAt.toISOString(),
    });

    const subscriptionId = subscriptionResult[0].insertId;

    // Create limits based on free_trial tier
    const tierLimits = SUBSCRIPTION_TIER_LIMITS.free_trial;
    const limitsResult = await db.insert(developerSubscriptionLimits).values({
      subscriptionId,
      ...tierLimits,
    });

    const limitsId = limitsResult[0].insertId;

    // Create usage tracking
    const usageResult = await db.insert(developerSubscriptionUsage).values({
      subscriptionId,
      developmentsCount: 0,
      leadsThisMonth: 0,
      teamMembersCount: 0,
      lastResetAt: new Date().toISOString(),
    });

    const usageId = usageResult[0].insertId;

    // Fetch the created records
    const subscription = await db.query.developerSubscriptions.findFirst({
      where: eq(developerSubscriptions.id, subscriptionId),
    });

    const limits = await db.query.developerSubscriptionLimits.findFirst({
      where: eq(developerSubscriptionLimits.id, limitsId),
    });

    const usage = await db.query.developerSubscriptionUsage.findFirst({
      where: eq(developerSubscriptionUsage.id, usageId),
    });

    if (!subscription || !limits || !usage) {
      throw new Error('Failed to create subscription');
    }

    return {
      ...subscription,
      limits,
      usage,
    };
  }

  /**
   * Get subscription details for a developer
   */
  async getSubscription(developerId: number): Promise<DeveloperSubscriptionWithDetails | null> {
    const rows = await db
      .select({
        subscription: developerSubscriptions,
        limits: developerSubscriptionLimits,
        usage: developerSubscriptionUsage,
      })
      .from(developerSubscriptions)
      .leftJoin(
        developerSubscriptionLimits,
        eq(developerSubscriptionLimits.subscriptionId, developerSubscriptions.id),
      )
      .leftJoin(
        developerSubscriptionUsage,
        eq(developerSubscriptionUsage.subscriptionId, developerSubscriptions.id),
      )
      .where(eq(developerSubscriptions.developerId, developerId))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    if (!row.limits || !row.usage) {
      // Should not happen for active subscriptions, but handle gracefully
      return null;
    }

    return {
      ...row.subscription,
      limits: row.limits,
      usage: row.usage,
    };
  }

  /**
   * Update subscription tier
   * Validates: Requirements 1.4, 13.5
   */
  async updateTier(
    developerId: number,
    newTier: SubscriptionTier,
  ): Promise<DeveloperSubscriptionWithDetails> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Update subscription tier
    await db
      .update(developerSubscriptions)
      .set({
        tier: newTier,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(developerSubscriptions.id, subscription.id));

    // Update limits based on new tier
    const newLimits = SUBSCRIPTION_TIER_LIMITS[newTier];
    await db
      .update(developerSubscriptionLimits)
      .set({
        ...newLimits,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(developerSubscriptionLimits.subscriptionId, subscription.id));

    // Return updated subscription
    return this.getSubscription(developerId) as Promise<DeveloperSubscriptionWithDetails>;
  }

  /**
   * Check if developer can perform an action based on tier limits
   * Validates: Requirements 13.1, 13.4
   */
  async checkLimit(
    developerId: number,
    limitType: 'developments' | 'leads' | 'teamMembers',
  ): Promise<{ allowed: boolean; current: number; max: number; tier: SubscriptionTier }> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    let current: number;
    let max: number;

    switch (limitType) {
      case 'developments':
        current = subscription.usage.developmentsCount;
        max = subscription.limits.maxDevelopments;
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
      allowed: current < max,
      current,
      max,
      tier: subscription.tier,
    };
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(
    developerId: number,
    usageType: 'developments' | 'leads' | 'teamMembers',
  ): Promise<void> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updates: Partial<DeveloperSubscriptionUsage> = {
      updatedAt: new Date(),
    };

    switch (usageType) {
      case 'developments':
        updates.developmentsCount = subscription.usage.developmentsCount + 1;
        break;
      case 'leads':
        updates.leadsThisMonth = subscription.usage.leadsThisMonth + 1;
        break;
      case 'teamMembers':
        updates.teamMembersCount = subscription.usage.teamMembersCount + 1;
        break;
    }

    await db
      .update(developerSubscriptionUsage)
      .set(updates)
      .where(eq(developerSubscriptionUsage.subscriptionId, subscription.id));
  }

  /**
   * Decrement usage counter
   */
  async decrementUsage(
    developerId: number,
    usageType: 'developments' | 'leads' | 'teamMembers',
  ): Promise<void> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updates: Partial<DeveloperSubscriptionUsage> = {
      updatedAt: new Date(),
    };

    switch (usageType) {
      case 'developments':
        updates.developmentsCount = Math.max(0, subscription.usage.developmentsCount - 1);
        break;
      case 'leads':
        updates.leadsThisMonth = Math.max(0, subscription.usage.leadsThisMonth - 1);
        break;
      case 'teamMembers':
        updates.teamMembersCount = Math.max(0, subscription.usage.teamMembersCount - 1);
        break;
    }

    await db
      .update(developerSubscriptionUsage)
      .set(updates)
      .where(eq(developerSubscriptionUsage.subscriptionId, subscription.id));
  }

  /**
   * Reset monthly lead counter (should be run monthly via cron job)
   */
  async resetMonthlyLeadCount(developerId: number): Promise<void> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await db
      .update(developerSubscriptionUsage)
      .set({
        leadsThisMonth: 0,
        lastResetAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(developerSubscriptionUsage.subscriptionId, subscription.id));
  }

  /**
   * Check if trial has expired and update status
   * Validates: Requirements 1.3
   */
  async checkTrialExpiration(
    developerId: number,
  ): Promise<{ expired: boolean; daysRemaining: number }> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription || subscription.tier !== 'free_trial') {
      return { expired: false, daysRemaining: 0 };
    }

    if (!subscription.trialEndsAt) {
      return { expired: false, daysRemaining: 0 };
    }

    const now = new Date();
    const trialEnd = new Date(subscription.trialEndsAt);
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      // Trial expired, update status
      await db
        .update(developerSubscriptions)
        .set({
          status: 'expired',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(developerSubscriptions.id, subscription.id));

      return { expired: true, daysRemaining: 0 };
    }

    return { expired: false, daysRemaining };
  }

  /**
   * Reset development count to actual count in database (for fixing discrepancies)
   */
  async resetDevelopmentCount(developerId: number): Promise<{ newCount: number }> {
    const subscription = await this.getSubscription(developerId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Count actual developments in database
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(developments)
      .where(eq(developments.developerId, developerId));

    const actualCount = result?.count || 0;

    // Update the usage counter to match actual count
    await db
      .update(developerSubscriptionUsage)
      .set({
        developmentsCount: actualCount,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(developerSubscriptionUsage.subscriptionId, subscription.id));

    return { newCount: actualCount };
  }
}

export const developerSubscriptionService = new DeveloperSubscriptionService();
