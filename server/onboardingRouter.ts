/**
 * Onboarding Router
 *
 * API endpoints for user onboarding and progressive disclosure.
 * Implements Requirements 14.1, 14.2, 14.3, 14.4, 16.7, 16.8, 16.9, 16.10, 16.11, 16.12
 */

import { Router } from 'express';
import { onboardingService } from './services/onboardingService';
import { requireAuth } from './middleware/auth';

const router = Router();

/**
 * GET /api/onboarding/state
 * Get user's onboarding state
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
router.get('/state', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const state = await onboardingService.getOnboardingState(userId);
    res.json(state);
  } catch (error: any) {
    console.error('Error fetching onboarding state:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/onboarding/welcome/show
 * Mark welcome overlay as shown
 * Requirement: 16.7
 */
router.post('/welcome/show', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    await onboardingService.showWelcomeOverlay(userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error showing welcome overlay:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/onboarding/welcome/dismiss
 * Dismiss welcome overlay
 * Requirement: 16.12
 */
router.post('/welcome/dismiss', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    await onboardingService.dismissWelcomeOverlay(userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error dismissing welcome overlay:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/onboarding/suggested-topics
 * Get suggested topics for user
 * Requirement: 16.8
 */
router.get('/suggested-topics', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const topics = await onboardingService.getSuggestedTopicsForUser(userId);
    res.json(topics);
  } catch (error: any) {
    console.error('Error fetching suggested topics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/onboarding/tooltip/show
 * Mark tooltip as shown
 * Requirements: 16.10, 16.11
 */
router.post('/tooltip/show', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { tooltipId } = req.body;

    if (!tooltipId) {
      return res.status(400).json({ error: 'tooltipId is required' });
    }

    await onboardingService.showTooltip(userId, tooltipId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error showing tooltip:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/onboarding/tooltip/dismiss
 * Dismiss tooltip
 * Requirement: 16.12
 */
router.post('/tooltip/dismiss', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { tooltipId } = req.body;

    if (!tooltipId) {
      return res.status(400).json({ error: 'tooltipId is required' });
    }

    await onboardingService.dismissTooltip(userId, tooltipId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error dismissing tooltip:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/onboarding/feature-unlocks
 * Check which features should be unlocked
 * Requirements: 14.2, 14.3, 14.4
 */
router.get('/feature-unlocks', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const unlocks = await onboardingService.checkFeatureUnlock(userId);
    res.json(unlocks);
  } catch (error: any) {
    console.error('Error checking feature unlocks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/onboarding/unlock-feature
 * Manually unlock a feature
 * Requirements: 14.2, 14.3, 14.4
 */
router.post('/unlock-feature', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { feature } = req.body;

    if (!feature) {
      return res.status(400).json({ error: 'feature is required' });
    }

    await onboardingService.unlockFeature(userId, feature);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error unlocking feature:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/onboarding/track
 * Track onboarding event
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
router.post('/track', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { type, metadata } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }

    await onboardingService.trackOnboardingEvent(userId, { type, metadata });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking onboarding event:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/onboarding/should-show-welcome
 * Check if welcome overlay should be shown
 * Requirement: 16.7
 */
router.get('/should-show-welcome', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const shouldShow = await onboardingService.shouldShowWelcomeOverlay(userId);
    res.json({ shouldShow });
  } catch (error: any) {
    console.error('Error checking welcome overlay:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/onboarding/should-show-tooltip/:tooltipId
 * Check if tooltip should be shown
 * Requirements: 16.10, 16.11
 */
router.get('/should-show-tooltip/:tooltipId', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { tooltipId } = req.params;

    const shouldShow = await onboardingService.shouldShowTooltip(userId, tooltipId);
    res.json({ shouldShow });
  } catch (error: any) {
    console.error('Error checking tooltip:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/onboarding/tooltip-config/:tooltipId
 * Get tooltip configuration
 * Requirements: 16.10, 16.11
 */
router.get('/tooltip-config/:tooltipId', async (req, res) => {
  try {
    const { tooltipId } = req.params;
    const config = onboardingService.getTooltipConfig(tooltipId);

    if (!config) {
      return res.status(404).json({ error: 'Tooltip not found' });
    }

    res.json(config);
  } catch (error: any) {
    console.error('Error fetching tooltip config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/onboarding/reset
 * Reset onboarding state (for testing)
 */
router.delete('/reset', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    await onboardingService.resetOnboardingState(userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error resetting onboarding state:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
