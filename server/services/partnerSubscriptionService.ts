/**
 * Partner Subscription Service
 * 
 * Manages partner subscription tiers, feature access control, and state transitions
 * for the Explore Partner Marketplace system.
 * 
 * Subscription Tiers:
 * - Free: Limited features, reduced visibility
 * - Basic (R500/month): Standard profile, basic analytics, organic reach
 * - Premium (R2000/month): Enhanced profile, detailed analytics, priority support, increased reach
 * - Featured (R5000/month): Premium placement, advanced analytics, dedicated support, maximum reach
 * 
 * @module partnerSubscriptionService
 */

import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// TYPES
// =====================================================

export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'featured';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface PartnerSubscription {
  id: string;
  partner_id: string;
  tier: SubscriptionTier;
  price_monthly: number;
  start_date: Date;
  end_date?: Date;
  status: SubscriptionStatus;
  features: SubscriptionFeatures;
  created_at: Date;
}

export interface SubscriptionFeatures {
  profile_type: 'standard' | 'enhanced' | 'premium';
  analytics_level: 'basic' | 'detailed' | 'advanced';
  support_level: 'community' | 'priority' | 'dedicated';
  organic_reach_multiplier: number;
  max_monthly_content: number;
  boost_discount_percent: number;
}

export interface SubscriptionTierPricing {
  tier: SubscriptionTier;
  price_monthly: number;
  features: SubscriptionFeatures;
  display_name: string;
  description: string;
}

// =====================================================
// TIER CONFIGURATION
// =====================================================

const TIER_PRICING: Record<SubscriptionTier, SubscriptionTierPricing> = {
  free: {
    tier: 'free',
    price_monthly: 0,
    display_name: 'Free',
    description: 'Limited features with reduced visibility',
    features: {
      profile_type: 'standard',
      analytics_level: 'basic',
      support_level: 'community',
      organic_reach_multiplier: 0.5,
      max_monthly_content: 5,
      boost_discount_percent: 0,
    },
  },
  basic: {
    tier: 'basic',
    price_monthly: 500,
    display_name: 'Basic',
    description: 'Standard profile with basic analytics and organic reach',
    features: {
      profile_type: 'standard',
      analytics_level: 'basic',
      support_level: 'community',
      organic_reach_multiplier: 1.0,
      max_monthly_content: 20,
      boost_discount_percent: 0,
    },
  },
  premium: {
    tier: 'premium',
    price_monthly: 2000,
    display_name: 'Premium',
    description: 'Enhanced profile with detailed analytics and priority support',
    features: {
      profile_type: 'enhanced',
      analytics_level: 'detailed',
      support_level: 'priority',
      organic_reach_multiplier: 1.5,
      max_monthly_content: 50,
      boost_discount_percent: 10,
    },
  },
  featured: {
    tier: 'featured',
    price_monthly: 5000,
    display_name: 'Featured',
    description: 'Premium placement with advanced analytics and dedicated support',
    features: {
      profile_type: 'premium',
      analytics_level: 'advanced',
      support_level: 'dedicated',
      organic_reach_multiplier: 2.0,
      max_monthly_content: 100,
      boost_discount_percent: 20,
    },
  },
};

// =====================================================
// SUBSCRIPTION RETRIEVAL
// =====================================================

/**
 * Get subscription tier pricing information
 */
export function getSubscriptionTierPricing(): SubscriptionTierPricing[] {
  return Object.values(TIER_PRICING);
}

/**
 * Get pricing for a specific tier
 */
export function getTierPricing(tier: SubscriptionTier): SubscriptionTierPricing {
  return TIER_PRICING[tier];
}

/**
 * Get partner's current subscription
 */
export async function getPartnerSubscription(
  partnerId: string
): Promise<PartnerSubscription | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [rows] = await db.execute(
    `SELECT * FROM partner_subscriptions 
     WHERE partner_id = ? AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [partnerId]
  );

  const subscriptions = rows as any[];
  if (subscriptions.length === 0) return null;

  return parseSubscription(subscriptions[0]);
}

/**
 * Get all subscriptions for a partner (including historical)
 */
export async function getPartnerSubscriptionHistory(
  partnerId: string
): Promise<PartnerSubscription[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [rows] = await db.execute(
    `SELECT * FROM partner_subscriptions 
     WHERE partner_id = ?
     ORDER BY created_at DESC`,
    [partnerId]
  );

  return (rows as any[]).map(parseSubscription);
}

// =====================================================
// SUBSCRIPTION CREATION
// =====================================================

/**
 * Create a new subscription for a partner
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.6
 */
export async function createSubscription(
  partnerId: string,
  tier: SubscriptionTier
): Promise<PartnerSubscription> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Validate tier
  if (!TIER_PRICING[tier]) {
    throw new Error(`Invalid subscription tier: ${tier}`);
  }

  const pricing = TIER_PRICING[tier];
  const id = uuidv4();
  const startDate = new Date();

  await db.execute(
    `INSERT INTO partner_subscriptions 
     (id, partner_id, tier, price_monthly, start_date, status, features)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`,
    [
      id,
      partnerId,
      tier,
      pricing.price_monthly,
      startDate,
      JSON.stringify(pricing.features),
    ]
  );

  const subscription = await getPartnerSubscription(partnerId);
  if (!subscription) {
    throw new Error('Failed to create subscription');
  }

  return subscription;
}

// =====================================================
// SUBSCRIPTION STATE TRANSITIONS
// =====================================================

/**
 * Upgrade partner subscription with immediate benefit application
 * 
 * Requirements: 7.4
 */
export async function upgradeSubscription(
  subscriptionId: string,
  newTier: SubscriptionTier
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Validate tier
  if (!TIER_PRICING[newTier]) {
    throw new Error(`Invalid subscription tier: ${newTier}`);
  }

  const pricing = TIER_PRICING[newTier];

  // Update subscription with immediate effect
  await db.execute(
    `UPDATE partner_subscriptions 
     SET tier = ?, 
         price_monthly = ?, 
         features = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'active'`,
    [newTier, pricing.price_monthly, JSON.stringify(pricing.features), subscriptionId]
  );
}

/**
 * Cancel subscription and downgrade to basic tier
 * 
 * Requirements: 7.5
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get current subscription
  const [rows] = await db.execute(
    `SELECT partner_id FROM partner_subscriptions WHERE id = ?`,
    [subscriptionId]
  );

  const subscriptions = rows as any[];
  if (subscriptions.length === 0) {
    throw new Error('Subscription not found');
  }

  const partnerId = subscriptions[0].partner_id;

  // Mark current subscription as cancelled
  await db.execute(
    `UPDATE partner_subscriptions 
     SET status = 'cancelled', 
         end_date = CURRENT_DATE,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [subscriptionId]
  );

  // Create new basic tier subscription (downgrade)
  await createSubscription(partnerId, 'basic');
}

/**
 * Handle subscription expiration and downgrade to basic
 * 
 * Requirements: 7.4, 7.5
 */
export async function handleExpiredSubscription(subscriptionId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get current subscription
  const [rows] = await db.execute(
    `SELECT partner_id FROM partner_subscriptions WHERE id = ?`,
    [subscriptionId]
  );

  const subscriptions = rows as any[];
  if (subscriptions.length === 0) {
    throw new Error('Subscription not found');
  }

  const partnerId = subscriptions[0].partner_id;

  // Mark as expired
  await db.execute(
    `UPDATE partner_subscriptions 
     SET status = 'expired',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [subscriptionId]
  );

  // Downgrade to basic tier
  await createSubscription(partnerId, 'basic');
}

/**
 * Process all expired subscriptions (cron job)
 */
export async function processExpiredSubscriptions(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Find subscriptions that have passed their end date
  const [rows] = await db.execute(
    `SELECT id FROM partner_subscriptions 
     WHERE status = 'active' 
     AND end_date IS NOT NULL 
     AND end_date < CURRENT_DATE`
  );

  const expiredSubscriptions = rows as any[];

  for (const sub of expiredSubscriptions) {
    try {
      await handleExpiredSubscription(sub.id);
    } catch (error) {
      console.error(`Failed to process expired subscription ${sub.id}:`, error);
    }
  }
}

// =====================================================
// FEATURE ACCESS CONTROL
// =====================================================

/**
 * Check if partner has access to a specific feature
 * 
 * Requirements: 7.1, 7.2, 7.3
 */
export async function checkFeatureAccess(
  partnerId: string,
  feature: keyof SubscriptionFeatures
): Promise<boolean> {
  const subscription = await getPartnerSubscription(partnerId);

  // No subscription = free tier
  if (!subscription) {
    const freeTier = TIER_PRICING.free;
    return freeTier.features[feature] !== undefined;
  }

  return subscription.features[feature] !== undefined;
}

/**
 * Get feature value for a partner
 */
export async function getFeatureValue<K extends keyof SubscriptionFeatures>(
  partnerId: string,
  feature: K
): Promise<SubscriptionFeatures[K]> {
  const subscription = await getPartnerSubscription(partnerId);

  // No subscription = free tier
  if (!subscription) {
    return TIER_PRICING.free.features[feature];
  }

  return subscription.features[feature];
}

/**
 * Check if partner can perform an action based on their tier
 */
export async function canPerformAction(
  partnerId: string,
  action: 'create_content' | 'boost_content' | 'view_analytics' | 'contact_support'
): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getPartnerSubscription(partnerId);
  const tier = subscription?.tier || 'free';
  const features = subscription?.features || TIER_PRICING.free.features;

  switch (action) {
    case 'create_content':
      // Check monthly content limit
      const contentCount = await getMonthlyContentCount(partnerId);
      if (contentCount >= features.max_monthly_content) {
        return {
          allowed: false,
          reason: `Monthly content limit reached (${features.max_monthly_content})`,
        };
      }
      return { allowed: true };

    case 'boost_content':
      // All tiers can boost, but with different discounts
      return { allowed: true };

    case 'view_analytics':
      // All tiers have some level of analytics
      return { allowed: true };

    case 'contact_support':
      // Support level varies by tier
      if (features.support_level === 'community') {
        return {
          allowed: true,
          reason: 'Community support only (forum/docs)',
        };
      }
      return { allowed: true };

    default:
      return { allowed: false, reason: 'Unknown action' };
  }
}

/**
 * Get monthly content count for a partner
 */
async function getMonthlyContentCount(partnerId: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [rows] = await db.execute(
    `SELECT COUNT(*) as count 
     FROM explore_content 
     WHERE partner_id = ? 
     AND MONTH(created_at) = MONTH(CURRENT_DATE)
     AND YEAR(created_at) = YEAR(CURRENT_DATE)`,
    [partnerId]
  );

  const result = rows as any[];
  return result[0]?.count || 0;
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Parse subscription row from database
 */
function parseSubscription(row: any): PartnerSubscription {
  return {
    id: row.id,
    partner_id: row.partner_id,
    tier: row.tier,
    price_monthly: parseFloat(row.price_monthly),
    start_date: new Date(row.start_date),
    end_date: row.end_date ? new Date(row.end_date) : undefined,
    status: row.status,
    features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
    created_at: new Date(row.created_at),
  };
}

/**
 * Get subscription tier hierarchy (for upgrade/downgrade logic)
 */
export function getTierHierarchy(): SubscriptionTier[] {
  return ['free', 'basic', 'premium', 'featured'];
}

/**
 * Check if tier A is higher than tier B
 */
export function isHigherTier(tierA: SubscriptionTier, tierB: SubscriptionTier): boolean {
  const hierarchy = getTierHierarchy();
  return hierarchy.indexOf(tierA) > hierarchy.indexOf(tierB);
}
