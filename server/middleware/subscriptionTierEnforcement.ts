import { Request, Response, NextFunction } from 'express';
import { developerSubscriptionService } from '../services/developerSubscriptionService';

/**
 * Middleware to check if developer can create a development based on tier limits
 * Validates: Requirements 13.1, 13.4
 */
export async function checkDevelopmentLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const developerId = parseInt(req.body.developerId || req.params.developerId);

    if (!developerId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_DEVELOPER_ID',
          message: 'Developer ID is required',
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
    const developerId = parseInt(req.body.developerId || req.params.developerId);

    if (!developerId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_DEVELOPER_ID',
          message: 'Developer ID is required',
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
    const developerId = parseInt(req.body.developerId || req.params.developerId);

    if (!developerId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_DEVELOPER_ID',
          message: 'Developer ID is required',
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
 * Middleware to check if developer has access to a feature based on tier
 */
export async function checkFeatureAccess(
  feature: 'crm' | 'advanced_analytics' | 'bond_integration',
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const developerId = parseInt(req.body.developerId || req.params.developerId);

      if (!developerId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_DEVELOPER_ID',
            message: 'Developer ID is required',
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
          hasAccess = subscription.limits.crmIntegrationEnabled;
          featureName = 'CRM Integration';
          break;
        case 'advanced_analytics':
          hasAccess = subscription.limits.advancedAnalyticsEnabled;
          featureName = 'Advanced Analytics';
          break;
        case 'bond_integration':
          hasAccess = subscription.limits.bondIntegrationEnabled;
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
