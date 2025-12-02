/**
 * Subscription Service
 * Handles subscription business logic, state transitions, and feature access
 */

import { getDb } from '../db';
import type {
  SubscriptionPlan,
  UserSubscription,
  SubscriptionStatus,
  PlanCategory,
  FeatureAccess,
  LimitCheck,
  PlanPermissions,
  UpgradePrompt,
} from '../../shared/subscription-types';

// =====================================================
// SUBSCRIPTION STATE MACHINE
// =====================================================

const VALID_STATE_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  trial_active: ['trial_expired', 'active_paid', 'cancelled'],
  trial_expired: ['active_paid', 'downgraded', 'cancelled'],
  active_paid: ['active_paid', 'past_due', 'cancelled', 'downgraded'],
  past_due: ['active_paid', 'cancelled', 'grace_period'],
  cancelled: [],
  downgraded: ['active_paid', 'cancelled'],
  grace_period: ['active_paid', 'cancelled'],
};

export function canTransition(
  currentStatus: SubscriptionStatus,
  newStatus: SubscriptionStatus,
): boolean {
  return VALID_STATE_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}

// =====================================================
// PLAN RETRIEVAL
// =====================================================

export async function getAllPlans(category?: PlanCategory): Promise<SubscriptionPlan[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  let query = 'SELECT * FROM subscription_plans WHERE is_active = 1';
  const params: any[] = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY sort_order ASC';

  const [rows] = await db.execute(query, params);
  return (rows as any[]).map(parseSubscriptionPlan);
}

export async function getPlanByPlanId(planId: string): Promise<SubscriptionPlan | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [rows] = await db.execute('SELECT * FROM subscription_plans WHERE plan_id = ?', [planId]);
  const plans = rows as any[];
  return plans.length > 0 ? parseSubscriptionPlan(plans[0]) : null;
}

export async function getTrialPlan(category: PlanCategory): Promise<SubscriptionPlan | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [rows] = await db.execute(
    'SELECT * FROM subscription_plans WHERE category = ? AND is_trial_plan = 1 AND is_active = 1',
    [category],
  );
  const plans = rows as any[];
  return plans.length > 0 ? parseSubscriptionPlan(plans[0]) : null;
}

// =====================================================
// USER SUBSCRIPTION
// =====================================================

export async function getUserSubscription(userId: number): Promise<UserSubscription | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [rows] = await db.execute('SELECT * FROM user_subscriptions WHERE user_id = ?', [userId]);
  const subscriptions = rows as any[];
  return subscriptions.length > 0 ? parseUserSubscription(subscriptions[0]) : null;
}

export async function getUserSubscriptionWithPlan(userId: number) {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return null;

  const plan = await getPlanByPlanId(subscription.plan_id);
  return { subscription, plan };
}

// =====================================================
// TRIAL MANAGEMENT
// =====================================================

export async function startTrial(userId: number, category: PlanCategory): Promise<UserSubscription> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Check if user already used trial
  const existing = await getUserSubscription(userId);
  if (existing?.trial_used) {
    throw new Error('Trial already used');
  }

  // Get trial plan
  const trialPlan = await getTrialPlan(category);
  if (!trialPlan) {
    throw new Error('No trial plan available for this category');
  }

  const trialStartsAt = new Date();
  const trialEndsAt = new Date(trialStartsAt.getTime() + trialPlan.trial_days * 24 * 60 * 60 * 1000);

  // Create or update subscription
  if (existing) {
    await db.execute(
      `UPDATE user_subscriptions 
       SET plan_id = ?, status = 'trial_active', trial_started_at = ?, trial_ends_at = ?, trial_used = 1, updated_at = NOW()
       WHERE user_id = ?`,
      [trialPlan.plan_id, trialStartsAt, trialEndsAt, userId],
    );
  } else {
    await db.execute(
      `INSERT INTO user_subscriptions 
       (user_id, plan_id, status, trial_started_at, trial_ends_at, trial_used)
       VALUES (?, ?, 'trial_active', ?, ?, 1)`,
      [userId, trialPlan.plan_id, trialStartsAt, trialEndsAt],
    );
  }

  // Log event
  await logSubscriptionEvent(userId, 'trial_started', {
    plan_id: trialPlan.plan_id,
    trial_ends_at: trialEndsAt,
  });

  // Initialize boost credits if applicable
  if (trialPlan.permissions.boost_credits && trialPlan.permissions.boost_credits > 0) {
    await initializeBoostCredits(userId, trialPlan.permissions.boost_credits);
  }

  const subscription = await getUserSubscription(userId);
  if (!subscription) throw new Error('Failed to create subscription');
  
  return subscription;
}

export async function expireTrial(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const subscription = await getUserSubscription(userId);
  if (!subscription) return;

  const plan = await getPlanByPlanId(subscription.plan_id);
  if (!plan || !plan.downgrade_to_plan_id) {
    throw new Error('No downgrade plan defined');
  }

  // Downgrade to free/basic plan
  await db.execute(
    `UPDATE user_subscriptions 
     SET plan_id = ?, status = 'trial_expired', previous_plan_id = ?, updated_at = NOW()
     WHERE user_id = ?`,
    [plan.downgrade_to_plan_id, subscription.plan_id, userId],
  );

  // Log event
  await logSubscriptionEvent(userId, 'trial_expired', {
    previous_plan: subscription.plan_id,
    new_plan: plan.downgrade_to_plan_id,
  });

  // Make CRM read-only
  await lockPremiumFeatures(userId);
}

// =====================================================
// SUBSCRIPTION UPGRADES/DOWNGRADES
// =====================================================

export async function upgradeSubscription(
  userId: number,
  newPlanId: string,
  immediate: boolean = true,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const subscription = await getUserSubscription(userId);
  if (!subscription) throw new Error('No active subscription');

  const newPlan = await getPlanByPlanId(newPlanId);
  if (!newPlan) throw new Error('Plan not found');

  if (immediate) {
    await db.execute(
      `UPDATE user_subscriptions 
       SET plan_id = ?, status = 'active_paid', previous_plan_id = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [newPlanId, subscription.plan_id, userId],
    );

    await logSubscriptionEvent(userId, 'subscription_upgraded', {
      from_plan: subscription.plan_id,
      to_plan: newPlanId,
    });

    // Update boost credits
    if (newPlan.permissions.boost_credits) {
      await updateBoostCredits(userId, newPlan.permissions.boost_credits);
    }
  } else {
    // Schedule upgrade at period end
    await db.execute(
      `UPDATE user_subscriptions 
       SET downgrade_scheduled = 0, updated_at = NOW()
       WHERE user_id = ?`,
      [userId],
    );
  }
}

export async function downgradeSubscription(
  userId: number,
  newPlanId: string,
  immediate: boolean = false,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const subscription = await getUserSubscription(userId);
  if (!subscription) throw new Error('No active subscription');

  if (immediate) {
    await db.execute(
      `UPDATE user_subscriptions 
       SET plan_id = ?, status = 'downgraded', previous_plan_id = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [newPlanId, subscription.plan_id, userId],
    );

    await logSubscriptionEvent(userId, 'subscription_downgraded', {
      from_plan: subscription.plan_id,
      to_plan: newPlanId,
    });
  } else {
    // Schedule downgrade at period end
    const effectiveDate = subscription.current_period_end || new Date();
    await db.execute(
      `UPDATE user_subscriptions 
       SET downgrade_scheduled = 1, downgrade_to_plan_id = ?, downgrade_effective_date = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [newPlanId, effectiveDate, userId],
    );
  }
}

// =====================================================
// FEATURE ACCESS CONTROL
// =====================================================

export async function checkFeatureAccess(
  userId: number,
  permission: keyof PlanPermissions,
): Promise<FeatureAccess> {
  const subData = await getUserSubscriptionWithPlan(userId);
  
  if (!subData || !subData.plan) {
    return {
      has_access: false,
      reason: 'No active subscription',
      upgrade_required: true,
    };
  }

  const { plan } = subData;
  const hasPermission = plan.permissions[permission];

  if (!hasPermission) {
    const upgradePlan = plan.upgrade_to_plan_id ? await getPlanByPlanId(plan.upgrade_to_plan_id) : null;
    
    return {
      has_access: false,
      reason: `Feature requires ${upgradePlan?.display_name || 'upgrade'}`,
      upgrade_required: true,
      recommended_plan: upgradePlan?.plan_id,
    };
  }

  return { has_access: true };
}

export async function checkLimit(
  userId: number,
  limitType: 'listings' | 'projects' | 'agents' | 'boosts' | 'crm_contacts',
  currentCount: number,
): Promise<LimitCheck> {
  const subData = await getUserSubscriptionWithPlan(userId);
  
  if (!subData || !subData.plan) {
    return {
      is_allowed: false,
      current_count: currentCount,
      limit: 0,
      remaining: 0,
      is_unlimited: false,
    };
  }

  const limit = subData.plan.limits[limitType] || 0;
  
  // -1 means unlimited
  if (limit === -1) {
    return {
      is_allowed: true,
      current_count: currentCount,
      limit: -1,
      remaining: -1,
      is_unlimited: true,
    };
  }

  const remaining = Math.max(0, limit - currentCount);
  
  return {
    is_allowed: currentCount < limit,
    current_count: currentCount,
    limit,
    remaining,
    is_unlimited: false,
  };
}

// =====================================================
// UPGRADE PROMPTS
// =====================================================

export async function getUpgradePrompt(userId: number, blockedFeature: string): Promise<UpgradePrompt | null> {
  const subData = await getUserSubscriptionWithPlan(userId);
  
  if (!subData || !subData.plan) return null;

  const { plan } = subData;
  const upgradePlanId = plan.upgrade_to_plan_id;
  
  if (!upgradePlanId) return null;

  const upgradePlan = await getPlanByPlanId(upgradePlanId);
  if (!upgradePlan) return null;

  const priceDiff = upgradePlan.price_zar - plan.price_zar;

  return {
    title: `Upgrade to ${upgradePlan.display_name}`,
    message: `Unlock ${blockedFeature} and more premium features`,
    feature_blocked: blockedFeature,
    current_plan: plan.display_name,
    recommended_plan: upgradePlan.display_name,
    price_difference: priceDiff,
    benefits: upgradePlan.features,
    cta: `Upgrade for R${(priceDiff / 100).toFixed(2)}/month`,
  };
}

// =====================================================
// BOOST CREDITS
// =====================================================

async function initializeBoostCredits(userId: number, credits: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1);

  await db.execute(
    `INSERT INTO boost_credits (user_id, total_credits, used_credits, reset_at)
     VALUES (?, ?, 0, ?)
     ON DUPLICATE KEY UPDATE total_credits = ?, used_credits = 0, reset_at = ?`,
    [userId, credits, resetAt, credits, resetAt],
  );
}

async function updateBoostCredits(userId: number, credits: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1);

  await db.execute(
    `UPDATE boost_credits SET total_credits = ?, reset_at = ?, updated_at = NOW()
     WHERE user_id = ?`,
    [credits, resetAt, userId],
  );
}

// =====================================================
// UTILITIES
// =====================================================

async function lockPremiumFeatures(userId: number): Promise<void> {
  // Lock CRM to read-only, remove boosts, etc.
  // This would integrate with your existing feature systems
  console.log(`Locking premium features for user ${userId}`);
}

export async function logSubscriptionEvent(
  userId: number,
  eventType: string,
  eventData?: any,
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const subscription = await getUserSubscription(userId);
  
  await db.execute(
    `INSERT INTO subscription_events (user_id, subscription_id, event_type, event_data)
     VALUES (?, ?, ?, ?)`,
    [userId, subscription?.id || null, eventType, JSON.stringify(eventData || {})],
  );
}

// =====================================================
// PARSING HELPERS
// =====================================================

function parseSubscriptionPlan(row: any): SubscriptionPlan {
  return {
    ...row,
    is_trial_plan: Boolean(row.is_trial_plan),
    is_free_plan: Boolean(row.is_free_plan),
    is_active: Boolean(row.is_active),
    features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
    limits: typeof row.limits === 'string' ? JSON.parse(row.limits) : row.limits,
    permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
  };
}

function parseUserSubscription(row: any): UserSubscription {
  return {
    ...row,
    trial_used: Boolean(row.trial_used),
    downgrade_scheduled: Boolean(row.downgrade_scheduled),
  };
}
