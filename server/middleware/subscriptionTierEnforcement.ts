import { Request, Response, NextFunction } from 'express';
import { developerSubscriptionService } from '../services/developerSubscriptionService';
import { getDeveloperByUserId } from '../services/developerService';

/**
 * Helper to get developer ID ONLY from authenticated user context.
 * NEVER trusts req.body, req.params, or any client-controlled input.
 */
async function getAuthedDeveloperId(req: Request): Promise<number | null> {
  const userId = Number(req.user?.id);
  if (!Number.isFinite(userId) || userId <= 0) return null;

  const profile = await getDeveloperByUserId(userId);
  return profile ? Number(profile.id) : null;
}

/**
 * Middleware to check if developer can create a development based on tier limits
 * Validates: Requirements 13.1, 13.4
 */
export async function checkDevelopmentLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const developerId = await getAuthedDeveloperId(req);

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
          message: `Development limit reached. Your ${limitCheck.tier} plan allows ${limitCheck.max} development(s). Please request a canonical plan change to create more developments.`,
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
    const developerId = await getAuthedDeveloperId(req);

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
          message: `Monthly lead limit reached. Your ${limitCheck.tier} plan allows ${limitCheck.max} leads per month. Please request a canonical plan change for more leads.`,
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
    const developerId = await getAuthedDeveloperId(req);

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
          message: `Team member limit reached. Your ${limitCheck.tier} plan allows ${limitCheck.max} team member(s). Please request a canonical plan change to add more team members.`,
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
      const developerId = await getAuthedDeveloperId(req);

      if (!developerId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHENTICATED_DEVELOPER',
            message: 'Developer authentication required',
          },
        });
      }

      const access = await developerSubscriptionService.checkFeatureAccess(developerId, feature);

      if (access.planName === 'Unavailable') {
        return res.status(404).json({
          error: {
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: 'Subscription not found',
          },
        });
      }

      let featureName = '';

      switch (feature) {
        case 'crm':
          featureName = 'CRM Integration';
          break;
        case 'advanced_analytics':
          featureName = 'Advanced Analytics';
          break;
        case 'bond_integration':
          featureName = 'Bond Originator Integration';
          break;
      }

      if (!access.allowed) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            message: `${featureName} is not available on your ${access.planName} plan. Please request a canonical plan change to access this feature.`,
            details: {
              plan: access.planName,
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
