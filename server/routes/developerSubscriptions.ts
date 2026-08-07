import { Request, Router } from 'express';
import { developerSubscriptionService } from '../services/developerSubscriptionService';
import { getDeveloperByUserId } from '../services/developerService';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const updateTierSchema = z.object({
  // Retained only so old clients receive an explicit assisted handoff rather
  // than a breaking validation error. It never mutates commercial state.
  tier: z.enum(['free_trial', 'basic', 'premium']),
});

async function canAccessDeveloper(req: Request, developerId: number): Promise<boolean> {
  const user = req.user;
  if (!user?.id) return false;
  if (user.role === 'super_admin') return true;

  const profile = await getDeveloperByUserId(Number(user.id));
  return Boolean(profile && Number(profile.id) === developerId);
}

function parseDeveloperId(value: string): number | null {
  const developerId = Number.parseInt(value, 10);
  return Number.isFinite(developerId) && developerId > 0 ? developerId : null;
}

router.get('/:developerId/subscription', requireAuth, async (req, res) => {
  try {
    const developerId = parseDeveloperId(req.params.developerId);
    if (!developerId) {
      return res.status(400).json({
        error: { code: 'INVALID_DEVELOPER_ID', message: 'A valid developer id is required.' },
      });
    }

    if (!(await canAccessDeveloper(req, developerId))) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You cannot access this developer subscription.' },
      });
    }

    const subscription = await developerSubscriptionService.getSubscription(developerId);
    if (!subscription) {
      return res.status(404).json({
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: 'No canonical developer product or subscription is configured.',
        },
      });
    }

    const trialStatus = await developerSubscriptionService.checkTrialExpiration(developerId);
    return res.json({ subscription, trialStatus });
  } catch (error) {
    console.error('Error fetching developer subscription:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscription details' },
    });
  }
});

router.post('/:developerId/subscription/upgrade', requireAuth, async (req, res) => {
  try {
    const developerId = parseDeveloperId(req.params.developerId);
    if (!developerId) {
      return res.status(400).json({
        error: { code: 'INVALID_DEVELOPER_ID', message: 'A valid developer id is required.' },
      });
    }

    const validation = updateTierSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid legacy tier request.',
          details: validation.error.errors,
        },
      });
    }

    if (!(await canAccessDeveloper(req, developerId))) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You cannot change this developer subscription.' },
      });
    }

    const subscription = await developerSubscriptionService.getSubscription(developerId);
    return res.status(409).json({
      error: {
        code: 'CANONICAL_PLAN_CHANGE_REQUIRED',
        message:
          'Legacy tier changes are retired. Developer plan changes require an assisted canonical invoice and verified payment.',
      },
      subscription,
      requestedTier: validation.data.tier,
      status: 'sales_assisted',
    });
  } catch (error) {
    console.error('Error handling developer subscription upgrade:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to request a subscription change' },
    });
  }
});

router.get('/:developerId/subscription/limits/:limitType', requireAuth, async (req, res) => {
  try {
    const developerId = parseDeveloperId(req.params.developerId);
    const limitType = req.params.limitType as 'developments' | 'leads' | 'teamMembers';

    if (!developerId) {
      return res.status(400).json({
        error: { code: 'INVALID_DEVELOPER_ID', message: 'A valid developer id is required.' },
      });
    }

    if (!['developments', 'leads', 'teamMembers'].includes(limitType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT_TYPE',
          message: 'Invalid limit type. Must be one of: developments, leads, teamMembers',
        },
      });
    }

    if (!(await canAccessDeveloper(req, developerId))) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You cannot access this developer subscription.' },
      });
    }

    const limitCheck = await developerSubscriptionService.checkLimit(developerId, limitType);
    return res.json(limitCheck);
  } catch (error) {
    console.error('Error checking developer subscription limit:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to check subscription limit' },
    });
  }
});

export default router;
