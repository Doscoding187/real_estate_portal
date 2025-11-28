import { Router } from 'express';
import { developerSubscriptionService } from '../services/developerSubscriptionService';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Schema for tier update
const updateTierSchema = z.object({
  tier: z.enum(['free_trial', 'basic', 'premium']),
});

/**
 * GET /api/developers/:developerId/subscription
 * Get subscription details for a developer
 * Validates: Requirements 1.5
 */
router.get('/:developerId/subscription', requireAuth, async (req, res) => {
  try {
    const developerId = parseInt(req.params.developerId);

    // Check if user has access to this developer account
    // TODO: Add authorization check

    const subscription = await developerSubscriptionService.getSubscription(developerId);

    if (!subscription) {
      return res.status(404).json({
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: 'Subscription not found for this developer',
        },
      });
    }

    // Check trial expiration
    const trialStatus = await developerSubscriptionService.checkTrialExpiration(developerId);

    res.json({
      subscription,
      trialStatus,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch subscription details',
      },
    });
  }
});

/**
 * POST /api/developers/:developerId/subscription/upgrade
 * Upgrade subscription tier
 * Validates: Requirements 1.4, 13.5
 */
router.post('/:developerId/subscription/upgrade', requireAuth, async (req, res) => {
  try {
    const developerId = parseInt(req.params.developerId);

    // Validate request body
    const validation = updateTierSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid tier specified',
          details: validation.error.errors,
        },
      });
    }

    const { tier } = validation.data;

    // Check if user has access to this developer account
    // TODO: Add authorization check

    const updatedSubscription = await developerSubscriptionService.updateTier(developerId, tier);

    res.json({
      subscription: updatedSubscription,
      message: `Successfully upgraded to ${tier} tier`,
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upgrade subscription',
      },
    });
  }
});

/**
 * GET /api/developers/:developerId/subscription/limits/:limitType
 * Check if developer can perform an action based on limits
 * Validates: Requirements 13.1, 13.4
 */
router.get('/:developerId/subscription/limits/:limitType', requireAuth, async (req, res) => {
  try {
    const developerId = parseInt(req.params.developerId);
    const limitType = req.params.limitType as 'developments' | 'leads' | 'teamMembers';

    if (!['developments', 'leads', 'teamMembers'].includes(limitType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT_TYPE',
          message: 'Invalid limit type. Must be one of: developments, leads, teamMembers',
        },
      });
    }

    // Check if user has access to this developer account
    // TODO: Add authorization check

    const limitCheck = await developerSubscriptionService.checkLimit(developerId, limitType);

    res.json(limitCheck);
  } catch (error) {
    console.error('Error checking limit:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check subscription limit',
      },
    });
  }
});

export default router;
