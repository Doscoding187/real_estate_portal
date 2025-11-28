import { describe, expect, beforeEach, afterEach } from 'vitest';
import { it, fc } from '@fast-check/vitest';
import { developerSubscriptionService } from '../developerSubscriptionService';
import { db } from '../../db';
import { developers, developerSubscriptions, developerSubscriptionLimits, developerSubscriptionUsage } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Property-Based Tests for Developer Subscription Service
 * Feature: developer-lead-management
 */

describe('Developer Subscription Service - Property Tests', () => {
  // Helper function to create a test developer
  async function createTestDeveloper(userId: number) {
    const [developer] = await db.insert(developers).values({
      userId,
      name: `Test Developer ${userId}`,
      email: `test${userId}@example.com`,
      category: 'residential',
      isVerified: 0,
      status: 'pending',
    }).returning();
    return developer;
  }

  // Helper function to cleanup test data
  async function cleanupTestData(developerId: number) {
    // Delete in correct order due to foreign keys
    await db.delete(developerSubscriptionUsage).where(
      eq(developerSubscriptionUsage.subscriptionId, 
        db.select({ id: developerSubscriptions.id })
          .from(developerSubscriptions)
          .where(eq(developerSubscriptions.developerId, developerId))
      )
    );
    await db.delete(developerSubscriptionLimits).where(
      eq(developerSubscriptionLimits.subscriptionId,
        db.select({ id: developerSubscriptions.id })
          .from(developerSubscriptions)
          .where(eq(developerSubscriptions.developerId, developerId))
      )
    );
    await db.delete(developerSubscriptions).where(eq(developerSubscriptions.developerId, developerId));
    await db.delete(developers).where(eq(developers.id, developerId));
  }

  /**
   * Property 1: Developer Account Creation Assigns Valid Tier
   * Feature: developer-lead-management, Property 1
   * Validates: Requirements 1.1, 1.2
   * 
   * For any new developer registration, the created account should have a subscription tier
   * that is one of the three valid values (Free Trial, Basic, Premium), with Free Trial as the default.
   */
  it.prop([fc.integer({ min: 1, max: 10000 })])(
    'Property 1: New developer accounts are assigned a valid subscription tier (free_trial by default)',
    async (userId) => {
      let developerId: number | null = null;

      try {
        // Create a test developer
        const developer = await createTestDeveloper(userId);
        developerId = developer.id;

        // Create subscription
        const subscription = await developerSubscriptionService.createSubscription(developer.id);

        // Property: Subscription tier must be one of the valid values
        const validTiers = ['free_trial', 'basic', 'premium'];
        expect(validTiers).toContain(subscription.tier);

        // Property: Default tier should be free_trial
        expect(subscription.tier).toBe('free_trial');

        // Property: Subscription must have limits assigned
        expect(subscription.limits).toBeDefined();
        expect(subscription.limits.maxDevelopments).toBeGreaterThan(0);

        // Property: Subscription must have usage tracking initialized
        expect(subscription.usage).toBeDefined();
        expect(subscription.usage.developmentsCount).toBe(0);
        expect(subscription.usage.leadsThisMonth).toBe(0);
        expect(subscription.usage.teamMembersCount).toBe(0);
      } finally {
        // Cleanup
        if (developerId) {
          await cleanupTestData(developerId);
        }
      }
    }
  );

  /**
   * Property 31: Subscription Tier Limit Enforcement
   * Feature: developer-lead-management, Property 31
   * Validates: Requirements 13.1, 13.4
   * 
   * For any developer on Free Trial tier attempting to create a second development,
   * the platform should prevent the creation and display an upgrade prompt.
   */
  it.prop([fc.integer({ min: 1, max: 10000 })])(
    'Property 31: Free trial tier enforces development limit of 1',
    async (userId) => {
      let developerId: number | null = null;

      try {
        // Create a test developer with subscription
        const developer = await createTestDeveloper(userId);
        developerId = developer.id;
        await developerSubscriptionService.createSubscription(developer.id);

        // Check limit before any developments
        const initialCheck = await developerSubscriptionService.checkLimit(developer.id, 'developments');
        expect(initialCheck.allowed).toBe(true);
        expect(initialCheck.max).toBe(1);
        expect(initialCheck.current).toBe(0);
        expect(initialCheck.tier).toBe('free_trial');

        // Increment usage to simulate creating a development
        await developerSubscriptionService.incrementUsage(developer.id, 'developments');

        // Check limit after one development
        const afterOneCheck = await developerSubscriptionService.checkLimit(developer.id, 'developments');
        expect(afterOneCheck.allowed).toBe(false); // Should not allow second development
        expect(afterOneCheck.current).toBe(1);
        expect(afterOneCheck.max).toBe(1);

        // Property: Attempting to create another development should be blocked
        // (This would be enforced by middleware in actual API calls)
      } finally {
        // Cleanup
        if (developerId) {
          await cleanupTestData(developerId);
        }
      }
    }
  );

  /**
   * Property 2: Subscription Tier Changes Apply Immediately
   * Property 32: Tier Upgrade Unlocks Features Immediately
   * Feature: developer-lead-management, Properties 2 & 32
   * Validates: Requirements 1.4, 13.5
   * 
   * For any developer account and any valid tier upgrade or downgrade,
   * the new feature access limits and capabilities should be applied immediately.
   */
  it.prop([
    fc.integer({ min: 1, max: 10000 }),
    fc.constantFrom('basic', 'premium'),
  ])(
    'Properties 2 & 32: Tier upgrades apply new limits immediately',
    async (userId, newTier) => {
      let developerId: number | null = null;

      try {
        // Create a test developer with free trial subscription
        const developer = await createTestDeveloper(userId);
        developerId = developer.id;
        const initialSubscription = await developerSubscriptionService.createSubscription(developer.id);

        // Verify initial state
        expect(initialSubscription.tier).toBe('free_trial');
        expect(initialSubscription.limits.maxDevelopments).toBe(1);

        // Upgrade to new tier
        const upgradedSubscription = await developerSubscriptionService.updateTier(developer.id, newTier);

        // Property: Tier should be updated immediately
        expect(upgradedSubscription.tier).toBe(newTier);

        // Property: Limits should be updated immediately based on new tier
        if (newTier === 'basic') {
          expect(upgradedSubscription.limits.maxDevelopments).toBe(5);
          expect(upgradedSubscription.limits.maxLeadsPerMonth).toBe(200);
          expect(upgradedSubscription.limits.advancedAnalyticsEnabled).toBe(true);
        } else if (newTier === 'premium') {
          expect(upgradedSubscription.limits.maxDevelopments).toBe(999999); // Effectively unlimited
          expect(upgradedSubscription.limits.maxLeadsPerMonth).toBe(999999);
          expect(upgradedSubscription.limits.crmIntegrationEnabled).toBe(true);
        }

        // Property: Check limit should reflect new tier immediately
        const limitCheck = await developerSubscriptionService.checkLimit(developer.id, 'developments');
        expect(limitCheck.tier).toBe(newTier);
        expect(limitCheck.max).toBe(upgradedSubscription.limits.maxDevelopments);

        // Property: Usage should be preserved after upgrade
        expect(upgradedSubscription.usage.developmentsCount).toBe(initialSubscription.usage.developmentsCount);
      } finally {
        // Cleanup
        if (developerId) {
          await cleanupTestData(developerId);
        }
      }
    }
  );

  /**
   * Additional property test: Trial expiration detection
   * Validates: Requirements 1.3
   */
  it.prop([fc.integer({ min: 1, max: 10000 })])(
    'Trial expiration is correctly detected',
    async (userId) => {
      let developerId: number | null = null;

      try {
        // Create a test developer with subscription
        const developer = await createTestDeveloper(userId);
        developerId = developer.id;
        const subscription = await developerSubscriptionService.createSubscription(developer.id);

        // Check trial status for new subscription
        const trialStatus = await developerSubscriptionService.checkTrialExpiration(developer.id);

        // Property: New trial should not be expired
        expect(trialStatus.expired).toBe(false);
        expect(trialStatus.daysRemaining).toBeGreaterThan(0);
        expect(trialStatus.daysRemaining).toBeLessThanOrEqual(14);
      } finally {
        // Cleanup
        if (developerId) {
          await cleanupTestData(developerId);
        }
      }
    }
  );
});
