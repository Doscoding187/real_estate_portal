/**
 * Partner Feature Access Middleware
 *
 * Provides middleware and utilities for checking partner subscription
 * feature access throughout the application.
 *
 * Requirements: 7.1, 7.2, 7.3
 *
 * @module partnerFeatureAccess
 */

import type { Request, Response, NextFunction } from 'express';
import {
  getPartnerSubscription,
  checkFeatureAccess,
  getFeatureValue,
  canPerformAction,
  type SubscriptionFeatures,
} from '../services/partnerSubscriptionService';

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Middleware to check if partner has access to a specific feature
 *
 * Usage:
 * ```typescript
 * router.post('/content',
 *   requirePartnerFeature('max_monthly_content'),
 *   async (req, res) => { ... }
 * );
 * ```
 */
export function requirePartnerFeature(feature: keyof SubscriptionFeatures) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partnerId = req.body.partner_id || req.params.partnerId;

      if (!partnerId) {
        return res.status(400).json({
          error: 'Partner ID required',
        });
      }

      const hasAccess = await checkFeatureAccess(partnerId, feature);

      if (!hasAccess) {
        const subscription = await getPartnerSubscription(partnerId);
        const currentTier = subscription?.tier || 'free';

        return res.status(403).json({
          error: 'Feature not available',
          message: `This feature requires a higher subscription tier`,
          current_tier: currentTier,
          feature_required: feature,
          upgrade_required: true,
        });
      }

      next();
    } catch (error) {
      console.error('Feature access check failed:', error);
      res.status(500).json({ error: 'Failed to check feature access' });
    }
  };
}

/**
 * Middleware to check if partner can perform a specific action
 *
 * Usage:
 * ```typescript
 * router.post('/content',
 *   requirePartnerAction('create_content'),
 *   async (req, res) => { ... }
 * );
 * ```
 */
export function requirePartnerAction(
  action: 'create_content' | 'boost_content' | 'view_analytics' | 'contact_support',
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partnerId = req.body.partner_id || req.params.partnerId;

      if (!partnerId) {
        return res.status(400).json({
          error: 'Partner ID required',
        });
      }

      const result = await canPerformAction(partnerId, action);

      if (!result.allowed) {
        return res.status(403).json({
          error: 'Action not allowed',
          message: result.reason || 'You do not have permission to perform this action',
          action,
        });
      }

      next();
    } catch (error) {
      console.error('Action permission check failed:', error);
      res.status(500).json({ error: 'Failed to check action permission' });
    }
  };
}

/**
 * Middleware to attach partner subscription info to request
 *
 * Usage:
 * ```typescript
 * router.get('/dashboard',
 *   attachPartnerSubscription,
 *   async (req, res) => {
 *     const subscription = req.partnerSubscription;
 *     // ...
 *   }
 * );
 * ```
 */
export async function attachPartnerSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const partnerId = req.body.partner_id || req.params.partnerId || req.query.partnerId;

    if (!partnerId) {
      return next();
    }

    const subscription = await getPartnerSubscription(partnerId as string);
    (req as any).partnerSubscription = subscription;

    next();
  } catch (error) {
    console.error('Failed to attach subscription:', error);
    next();
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check feature access and return detailed response
 */
export async function checkFeatureAccessWithDetails(
  partnerId: string,
  feature: keyof SubscriptionFeatures,
): Promise<{
  allowed: boolean;
  current_tier: string;
  feature_value: any;
  upgrade_required: boolean;
}> {
  const subscription = await getPartnerSubscription(partnerId);
  const currentTier = subscription?.tier || 'free';
  const hasAccess = await checkFeatureAccess(partnerId, feature);
  const featureValue = await getFeatureValue(partnerId, feature);

  return {
    allowed: hasAccess,
    current_tier: currentTier,
    feature_value: featureValue,
    upgrade_required: !hasAccess,
  };
}

/**
 * Get all feature access for a partner (for dashboard display)
 */
export async function getPartnerFeatureAccess(partnerId: string): Promise<{
  tier: string;
  features: SubscriptionFeatures;
  actions: {
    create_content: { allowed: boolean; reason?: string };
    boost_content: { allowed: boolean; reason?: string };
    view_analytics: { allowed: boolean; reason?: string };
    contact_support: { allowed: boolean; reason?: string };
  };
}> {
  const subscription = await getPartnerSubscription(partnerId);
  const tier = subscription?.tier || 'free';
  const features = subscription?.features || {
    profile_type: 'standard',
    analytics_level: 'basic',
    support_level: 'community',
    organic_reach_multiplier: 0.5,
    max_monthly_content: 5,
    boost_discount_percent: 0,
  };

  const actions = {
    create_content: await canPerformAction(partnerId, 'create_content'),
    boost_content: await canPerformAction(partnerId, 'boost_content'),
    view_analytics: await canPerformAction(partnerId, 'view_analytics'),
    contact_support: await canPerformAction(partnerId, 'contact_support'),
  };

  return {
    tier,
    features,
    actions,
  };
}

/**
 * Validate subscription tier upgrade/downgrade
 */
export function validateTierTransition(
  currentTier: string,
  newTier: string,
): { valid: boolean; reason?: string } {
  const validTiers = ['free', 'basic', 'premium', 'featured'];

  if (!validTiers.includes(currentTier)) {
    return { valid: false, reason: 'Invalid current tier' };
  }

  if (!validTiers.includes(newTier)) {
    return { valid: false, reason: 'Invalid new tier' };
  }

  // Can't "upgrade" to free
  if (newTier === 'free') {
    return { valid: false, reason: 'Cannot upgrade to free tier' };
  }

  return { valid: true };
}

// =====================================================
// TYPE EXTENSIONS
// =====================================================

declare global {
  namespace Express {
    interface Request {
      partnerSubscription?: {
        id: string;
        partner_id: string;
        tier: string;
        features: SubscriptionFeatures;
      };
    }
  }
}
