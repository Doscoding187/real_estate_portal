/**
 * Partner Boost Campaign Router
 * API endpoints for managing partner boost campaigns
 * 
 * Requirements:
 * - 8.1: Require topic selection for targeting
 * - 8.2: Display "Sponsored" label on boosted content
 * - 8.4: Provide real-time performance analytics
 * - 8.5: Auto-pause when budget depleted
 * - 8.6: Reject boosts that violate content hierarchy
 */

import { Router } from 'express';
import { partnerBoostCampaignService } from './services/partnerBoostCampaignService';

const router = Router();

/**
 * Create a new boost campaign
 * POST /api/partner-boost-campaigns
 * Requirement 8.1: Require topic selection for targeting
 */
router.post('/', async (req, res) => {
  try {
    const { partnerId, contentId, topicId, budget, startDate, endDate, costPerImpression } = req.body;

    // Validate required fields
    if (!partnerId || !contentId || !topicId || !budget || !startDate) {
      return res.status(400).json({
        error: 'Missing required fields: partnerId, contentId, topicId, budget, startDate',
      });
    }

    // Validate topic is provided (Requirement 8.1)
    if (!topicId) {
      return res.status(400).json({
        error: 'Topic selection is required for boost campaigns',
      });
    }

    const campaign = await partnerBoostCampaignService.createCampaign({
      partnerId,
      contentId,
      topicId,
      budget: parseFloat(budget),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      costPerImpression: costPerImpression ? parseFloat(costPerImpression) : undefined,
    });

    res.status(201).json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Create campaign error:', error);
    res.status(400).json({
      error: error.message || 'Failed to create boost campaign',
    });
  }
});

/**
 * Activate a boost campaign
 * PUT /api/partner-boost-campaigns/:id/activate
 * Requirement 8.5: Auto-pause when budget depleted
 */
router.put('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    await partnerBoostCampaignService.activateCampaign(id);

    res.json({
      success: true,
      message: 'Campaign activated successfully',
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Activate campaign error:', error);
    res.status(400).json({
      error: error.message || 'Failed to activate campaign',
    });
  }
});

/**
 * Pause a boost campaign
 * PUT /api/partner-boost-campaigns/:id/pause
 */
router.put('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    await partnerBoostCampaignService.pauseCampaign(id);

    res.json({
      success: true,
      message: 'Campaign paused successfully',
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Pause campaign error:', error);
    res.status(400).json({
      error: error.message || 'Failed to pause campaign',
    });
  }
});

/**
 * Get campaign analytics
 * GET /api/partner-boost-campaigns/:id/analytics
 * Requirement 8.4: Provide real-time performance analytics
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;

    const analytics = await partnerBoostCampaignService.getCampaignAnalytics(id);

    res.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Get analytics error:', error);
    res.status(404).json({
      error: error.message || 'Campaign not found',
    });
  }
});

/**
 * Get budget status for a campaign
 * GET /api/partner-boost-campaigns/:id/budget
 */
router.get('/:id/budget', async (req, res) => {
  try {
    const { id } = req.params;

    const budgetStatus = await partnerBoostCampaignService.getBudgetStatus(id);

    res.json({
      success: true,
      budget: budgetStatus,
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Get budget status error:', error);
    res.status(404).json({
      error: error.message || 'Campaign not found',
    });
  }
});

/**
 * Get all campaigns for a partner
 * GET /api/partner-boost-campaigns/partner/:partnerId
 */
router.get('/partner/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;

    const campaigns = await partnerBoostCampaignService.getPartnerCampaigns(partnerId);

    res.json({
      success: true,
      campaigns,
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Get partner campaigns error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch campaigns',
    });
  }
});

/**
 * Get active campaigns for a topic
 * GET /api/partner-boost-campaigns/topic/:topicId/active
 */
router.get('/topic/:topicId/active', async (req, res) => {
  try {
    const { topicId } = req.params;

    const campaigns = await partnerBoostCampaignService.getActiveCampaignsForTopic(topicId);

    res.json({
      success: true,
      campaigns,
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Get active campaigns error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch active campaigns',
    });
  }
});

/**
 * Check if content is boosted
 * GET /api/partner-boost-campaigns/content/:contentId/boosted
 * Requirement 8.2: Display "Sponsored" label on boosted content
 */
router.get('/content/:contentId/boosted', async (req, res) => {
  try {
    const { contentId } = req.params;

    const boostStatus = await partnerBoostCampaignService.isContentBoosted(contentId);

    res.json({
      success: true,
      ...boostStatus,
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Check boosted status error:', error);
    res.status(500).json({
      error: error.message || 'Failed to check boost status',
    });
  }
});

/**
 * Get sponsored label for content
 * GET /api/partner-boost-campaigns/content/:contentId/sponsored-label
 * Requirement 8.2: Add "Sponsored" label to boosted content
 */
router.get('/content/:contentId/sponsored-label', async (req, res) => {
  try {
    const { contentId } = req.params;

    const label = await partnerBoostCampaignService.getSponsoredLabel(contentId);

    res.json({
      success: true,
      label,
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Get sponsored label error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get sponsored label',
    });
  }
});

/**
 * Validate boost eligibility
 * POST /api/partner-boost-campaigns/validate-eligibility
 * Requirement 8.6: Reject boosts that violate content hierarchy
 */
router.post('/validate-eligibility', async (req, res) => {
  try {
    const { contentId } = req.body;

    if (!contentId) {
      return res.status(400).json({
        error: 'contentId is required',
      });
    }

    const validation = await partnerBoostCampaignService.validateBoostEligibility(contentId);

    res.json({
      success: true,
      ...validation,
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Validate eligibility error:', error);
    res.status(500).json({
      error: error.message || 'Failed to validate eligibility',
    });
  }
});

/**
 * Record impression
 * POST /api/partner-boost-campaigns/:id/impression
 */
router.post('/:id/impression', async (req, res) => {
  try {
    const { id } = req.params;

    await partnerBoostCampaignService.recordImpression(id);

    res.json({
      success: true,
      message: 'Impression recorded',
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Record impression error:', error);
    res.status(500).json({
      error: error.message || 'Failed to record impression',
    });
  }
});

/**
 * Record click
 * POST /api/partner-boost-campaigns/:id/click
 */
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;

    await partnerBoostCampaignService.recordClick(id);

    res.json({
      success: true,
      message: 'Click recorded',
    });
  } catch (error: any) {
    console.error('[PartnerBoostCampaignRouter] Record click error:', error);
    res.status(500).json({
      error: error.message || 'Failed to record click',
    });
  }
});

export default router;
