import { Request, Response, NextFunction } from 'express';
import { developerSubscriptionService } from '../services/developerSubscriptionService';

/**
 * Helper to get developer ID ONLY from authenticated user context.
 * NEVER trusts req.body, req.params, or any client-controlled input.
 */
function getAuthedDeveloperId(req: Request): number | null {
  // Adjust these paths to match your actual auth middleware payload
  // Common variations — pick / combine the ones that exist in your req.user
  const possibleIds = [
    req.user?.developerProfileId,
    req.user?.developerId,
    req.user?.developer?.id,
    req.user?.id, // sometimes the developer row ID is the user ID
    req.user?.profile?.developerId,
  ];

  for (const id of possibleIds) {
    if (id != null) {
      const parsed = typeof id === 'string' ? parseInt(id, 10) : Number(id);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Middleware to check if developer can create a development based on tier limits
 * Validates: Requirements 13.1, 13.4
 */
export async function checkDevelopmentLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const developerId = getAuthedDeveloperId(req);

    if (!developerId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED_DEVELOPER',
          message: 'Developer authentication required',
        },
      });
    }

    const limitCheck = await developerSubscriptionService.checkLimit(developerId, 'developments');

    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: {
          code: 'TIER_LIMIT_EXCEEDED',
          message: `Development limit reached. Your ${limitCheck.tier} tier allows ${limitCheck.max} development(s). Please upgrade to create more developments.`,
          details: {
            current: limitCheck.current,
            max: limitCheck.max,
            tier: limitCheck.tier,
          },
        },
      });
    }

    next();
  } catch (error) {
    console.error('Error checking development limit:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check development limit',
      },
    });
  }
}

/**
 * Middleware to check if developer can capture a lead based on tier limits
 * Validates: Requirements 13.1, 13.4
 */
export async function checkLeadLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const developerId = getAuthedDeveloperId(req);

    if (!developerId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED_DEVELOPER',
          message: 'Developer authentication required',
        },
      });
    }

    const limitCheck = await developerSubscriptionService.checkLimit(developerId, 'leads');

    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: {
          code: 'TIER_LIMIT_EXCEEDED',
          message: `Monthly lead limit reached. Your ${limitCheck.tier} tier allows ${limitCheck.max} leads per month. Please upgrade for more leads.`,
          details: {
            current: limitCheck.current,
            max: limitCheck.max,
            tier: limitCheck.tier,
          },
        },
      });
    }

    next();
  } catch (error) {
    console.error('Error checking lead limit:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check lead limit',
      },
    });
  }
}

/**
 * Middleware to check if developer can add a team member based on tier limits
 * Validates: Requirements 13.1, 13.4
 */
export async function checkTeamMemberLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const developerId = getAuthedDeveloperId(req);

    if (!developerId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED_DEVELOPER',
          message: 'Developer authentication required',
        },
      });
    }

    const limitCheck = await developerSubscriptionService.checkLimit(developerId, 'teamMembers');

    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: {
          code: 'TIER_LIMIT_EXCEEDED',
          message: `Team member limit reached. Your ${limitCheck.tier} tier allows ${limitCheck.max} team member(s). Please upgrade to add more team members.`,
          details: {
            current: limitCheck.current,
            max: limitCheck.max,
            tier: limitCheck.tier,
          },
        },
      });
    }

    next();
  } catch (error) {
    console.error('Error checking team member limit:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check team member limit',
      },
    });
  }
}

/**
 * Middleware factory to check access to premium features based on tier
 */
export function checkFeatureAccess(feature: 'crm' | 'advanced_analytics' | 'bond_integration') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const developerId = getAuthedDeveloperId(req);

      if (!developerId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHENTICATED_DEVELOPER',
            message: 'Developer authentication required',
          },
        });
      }

      const subscription = await developerSubscriptionService.getSubscription(developerId);

      if (!subscription) {
        return res.status(404).json({
          error: {
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: 'Subscription not found',
          },
        });
      }

      let hasAccess = false;
      let featureName = '';

      switch (feature) {
        case 'crm':
          hasAccess = subscription.limits.crmIntegrationEnabled ?? false;
          featureName = 'CRM Integration';
          break;
        case 'advanced_analytics':
          hasAccess = subscription.limits.advancedAnalyticsEnabled ?? false;
          featureName = 'Advanced Analytics';
          break;
        case 'bond_integration':
          hasAccess = subscription.limits.bondIntegrationEnabled ?? false;
          featureName = 'Bond Originator Integration';
          break;
      }

      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            message: `${featureName} is not available on your ${subscription.tier} tier. Please upgrade to access this feature.`,
            details: {
              tier: subscription.tier,
              feature: featureName,
            },
          },
        });
      }

      next();
    } catch (error) {
      console.error('Error checking feature access:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check feature access',
        },
      });
    }
  };
}
