/**
 * Partner Subscription Router
 *
 * API endpoints for managing partner subscriptions, upgrades, downgrades,
 * and feature access checks.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 *
 * @module partnerSubscriptionRouter
 */

import express from 'express';
import {
  getPartnerSubscription,
  getPartnerSubscriptionHistory,
  createSubscription,
  upgradeSubscription,
  cancelSubscription,
  getSubscriptionTierPricing,
  getTierPricing,
  checkFeatureAccess,
  getFeatureValue,
  canPerformAction,
  type SubscriptionTier,
} from './services/partnerSubscriptionService';
import {
  requirePartnerAction,
  attachPartnerSubscription,
  getPartnerFeatureAccess,
  validateTierTransition,
} from './middleware/partnerFeatureAccess';

const router = express.Router();

// =====================================================
// SUBSCRIPTION RETRIEVAL
// =====================================================

/**
 * GET /api/subscriptions/pricing
 * Get all subscription tier pricing information
 */
router.get('/pricing', async (req, res) => {
  try {
    const pricing = getSubscriptionTierPricing();
    res.json(pricing);
  } catch (error) {
    console.error('Failed to get pricing:', error);
    res.status(500).json({ error: 'Failed to retrieve pricing information' });
  }
});

/**
 * GET /api/subscriptions/pricing/:tier
 * Get pricing for a specific tier
 */
router.get('/pricing/:tier', async (req, res) => {
  try {
    const tier = req.params.tier as SubscriptionTier;
    const pricing = getTierPricing(tier);

    if (!pricing) {
      return res.status(404).json({ error: 'Tier not found' });
    }

    res.json(pricing);
  } catch (error) {
    console.error('Failed to get tier pricing:', error);
    res.status(500).json({ error: 'Failed to retrieve tier pricing' });
  }
});

/**
 * GET /api/subscriptions/partner/:partnerId
 * Get partner's current subscription
 */
router.get('/partner/:partnerId', attachPartnerSubscription, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const subscription = await getPartnerSubscription(partnerId);

    if (!subscription) {
      return res.status(404).json({
        error: 'No active subscription found',
        message: 'Partner is on free tier',
      });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Failed to get subscription:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription' });
  }
});

/**
 * GET /api/subscriptions/partner/:partnerId/history
 * Get partner's subscription history
 */
router.get('/partner/:partnerId/history', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const history = await getPartnerSubscriptionHistory(partnerId);
    res.json(history);
  } catch (error) {
    console.error('Failed to get subscription history:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription history' });
  }
});

/**
 * GET /api/subscriptions/partner/:partnerId/features
 * Get partner's feature access details
 */
router.get('/partner/:partnerId/features', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const features = await getPartnerFeatureAccess(partnerId);
    res.json(features);
  } catch (error) {
    console.error('Failed to get feature access:', error);
    res.status(500).json({ error: 'Failed to retrieve feature access' });
  }
});

// =====================================================
// SUBSCRIPTION CREATION
// =====================================================

/**
 * POST /api/subscriptions
 * Create a new subscription for a partner
 *
 * Requirements: 7.1, 7.2, 7.3, 7.6
 *
 * Body:
 * {
 *   "partner_id": "uuid",
 *   "tier": "basic" | "premium" | "featured"
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { partner_id, tier } = req.body;

    if (!partner_id || !tier) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['partner_id', 'tier'],
      });
    }

    // Validate tier
    const validTiers: SubscriptionTier[] = ['basic', 'premium', 'featured'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        error: 'Invalid tier',
        message: 'Tier must be one of: basic, premium, featured',
        valid_tiers: validTiers,
      });
    }

    // Check if partner already has an active subscription
    const existing = await getPartnerSubscription(partner_id);
    if (existing) {
      return res.status(409).json({
        error: 'Subscription already exists',
        message: 'Use upgrade endpoint to change subscription tier',
        current_subscription: existing,
      });
    }

    const subscription = await createSubscription(partner_id, tier);

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription,
    });
  } catch (error) {
    console.error('Failed to create subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// =====================================================
// SUBSCRIPTION UPGRADES
// =====================================================

/**
 * PUT /api/subscriptions/:id/upgrade
 * Upgrade subscription to a higher tier
 *
 * Requirements: 7.4
 *
 * Body:
 * {
 *   "new_tier": "premium" | "featured"
 * }
 */
router.put('/:id/upgrade', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_tier } = req.body;

    if (!new_tier) {
      return res.status(400).json({
        error: 'Missing required field: new_tier',
      });
    }

    // Get current subscription
    const [rows] = await (await import('./db'))
      .getDb()
      .then(db =>
        db!.execute('SELECT tier, partner_id FROM partner_subscriptions WHERE id = ?', [id]),
      );
    const subscriptions = rows as any[];

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const currentTier = subscriptions[0].tier;

    // Validate transition
    const validation = validateTierTransition(currentTier, new_tier);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid tier transition',
        message: validation.reason,
        current_tier: currentTier,
        requested_tier: new_tier,
      });
    }

    // Perform upgrade
    await upgradeSubscription(id, new_tier);

    // Get updated subscription
    const partnerId = subscriptions[0].partner_id;
    const updated = await getPartnerSubscription(partnerId);

    res.json({
      message: 'Subscription upgraded successfully',
      subscription: updated,
      benefits_applied: 'immediately',
    });
  } catch (error) {
    console.error('Failed to upgrade subscription:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// =====================================================
// SUBSCRIPTION CANCELLATION
// =====================================================

/**
 * DELETE /api/subscriptions/:id
 * Cancel subscription and downgrade to basic tier
 *
 * Requirements: 7.5
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get subscription before cancellation
    const [rows] = await (await import('./db'))
      .getDb()
      .then(db =>
        db!.execute('SELECT partner_id, tier FROM partner_subscriptions WHERE id = ?', [id]),
      );
    const subscriptions = rows as any[];

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const partnerId = subscriptions[0].partner_id;
    const previousTier = subscriptions[0].tier;

    // Cancel subscription (automatically downgrades to basic)
    await cancelSubscription(id);

    // Get new subscription
    const newSubscription = await getPartnerSubscription(partnerId);

    res.json({
      message: 'Subscription cancelled successfully',
      previous_tier: previousTier,
      new_subscription: newSubscription,
      downgrade_applied: 'immediately',
    });
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// =====================================================
// FEATURE ACCESS CHECKS
// =====================================================

/**
 * POST /api/subscriptions/check-feature
 * Check if partner has access to a specific feature
 *
 * Requirements: 7.1, 7.2, 7.3
 *
 * Body:
 * {
 *   "partner_id": "uuid",
 *   "feature": "profile_type" | "analytics_level" | etc.
 * }
 */
router.post('/check-feature', async (req, res) => {
  try {
    const { partner_id, feature } = req.body;

    if (!partner_id || !feature) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['partner_id', 'feature'],
      });
    }

    const hasAccess = await checkFeatureAccess(partner_id, feature);
    const featureValue = await getFeatureValue(partner_id, feature);
    const subscription = await getPartnerSubscription(partner_id);

    res.json({
      has_access: hasAccess,
      feature,
      feature_value: featureValue,
      current_tier: subscription?.tier || 'free',
    });
  } catch (error) {
    console.error('Failed to check feature access:', error);
    res.status(500).json({ error: 'Failed to check feature access' });
  }
});

/**
 * POST /api/subscriptions/check-action
 * Check if partner can perform a specific action
 *
 * Body:
 * {
 *   "partner_id": "uuid",
 *   "action": "create_content" | "boost_content" | "view_analytics" | "contact_support"
 * }
 */
router.post('/check-action', async (req, res) => {
  try {
    const { partner_id, action } = req.body;

    if (!partner_id || !action) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['partner_id', 'action'],
      });
    }

    const result = await canPerformAction(partner_id, action);
    const subscription = await getPartnerSubscription(partner_id);

    res.json({
      allowed: result.allowed,
      action,
      reason: result.reason,
      current_tier: subscription?.tier || 'free',
    });
  } catch (error) {
    console.error('Failed to check action permission:', error);
    res.status(500).json({ error: 'Failed to check action permission' });
  }
});

export default router;
