/**
 * Marketplace Bundle API Router
 * 
 * Provides endpoints for managing and displaying marketplace bundles.
 * Bundles group curated partners by category (e.g., First-Time Buyer Bundle).
 * 
 * Endpoints:
 * - GET /api/bundles - Get all active bundles
 * - GET /api/bundles/:slug - Get bundle with partners by slug
 * - GET /api/bundles/:bundleId/partners - Get bundle partners
 * - GET /api/bundles/:bundleId/category/:category - Get partners by category
 * - POST /api/bundles - Create new bundle (admin)
 * - POST /api/bundles/:bundleId/partners - Add partner to bundle (admin)
 * - DELETE /api/bundles/:bundleId/partners/:partnerId - Remove partner (admin)
 * - PUT /api/bundles/:bundleId/partners/:partnerId/performance - Update performance (admin)
 */

import { Router, Request, Response } from 'express';
import { marketplaceBundleService } from './services/marketplaceBundleService';

const router = Router();

// ============================================================================
// Public Endpoints
// ============================================================================

/**
 * GET /api/bundles
 * Get all active marketplace bundles
 */
router.get('/bundles', async (req: Request, res: Response) => {
  try {
    const bundles = await marketplaceBundleService.getActiveBundles();
    res.json(bundles);
  } catch (error) {
    console.error('Error fetching bundles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bundles',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bundles/:slug
 * Get bundle with full partner information by slug
 * Includes partner ratings and verification status
 */
router.get('/bundles/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const bundle = await marketplaceBundleService.getBundleWithPartnersBySlug(slug);
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    res.json(bundle);
  } catch (error) {
    console.error('Error fetching bundle:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bundle',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bundles/:bundleId/partners
 * Get all partners in a bundle with their information
 */
router.get('/bundles/:bundleId/partners', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const bundle = await marketplaceBundleService.getBundleWithPartners(bundleId);
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    res.json(bundle.partners);
  } catch (error) {
    console.error('Error fetching bundle partners:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bundle partners',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bundles/:bundleId/category/:category
 * Get partners in a specific category within a bundle
 */
router.get('/bundles/:bundleId/category/:category', async (req: Request, res: Response) => {
  try {
    const { bundleId, category } = req.params;
    const partners = await marketplaceBundleService.getPartnersByCategory(bundleId, category);
    
    res.json(partners);
  } catch (error) {
    console.error('Error fetching partners by category:', error);
    res.status(500).json({ 
      error: 'Failed to fetch partners by category',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Admin Endpoints
// ============================================================================

/**
 * POST /api/bundles
 * Create a new marketplace bundle
 * Admin only
 */
router.post('/bundles', async (req: Request, res: Response) => {
  try {
    const { slug, name, description, targetAudience, displayOrder } = req.body;

    // Validation
    if (!slug || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['slug', 'name']
      });
    }

    // Check if slug already exists
    const existing = await marketplaceBundleService.getBundleBySlug(slug);
    if (existing) {
      return res.status(409).json({ error: 'Bundle with this slug already exists' });
    }

    const bundle = await marketplaceBundleService.createBundle({
      slug,
      name,
      description,
      targetAudience,
      displayOrder
    });

    res.status(201).json(bundle);
  } catch (error) {
    console.error('Error creating bundle:', error);
    res.status(500).json({ 
      error: 'Failed to create bundle',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bundles/:bundleId/partners
 * Add a partner to a bundle
 * Admin only
 */
router.post('/bundles/:bundleId/partners', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const { partnerId, category, displayOrder, inclusionFee } = req.body;

    // Validation
    if (!partnerId || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['partnerId', 'category']
      });
    }

    await marketplaceBundleService.addPartnerToBundle({
      bundleId,
      partnerId,
      category,
      displayOrder,
      inclusionFee
    });

    res.status(201).json({ message: 'Partner added to bundle successfully' });
  } catch (error) {
    console.error('Error adding partner to bundle:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ 
      error: 'Failed to add partner to bundle',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/bundles/:bundleId/partners/:partnerId
 * Remove a partner from a bundle
 * Admin only
 */
router.delete('/bundles/:bundleId/partners/:partnerId', async (req: Request, res: Response) => {
  try {
    const { bundleId, partnerId } = req.params;

    await marketplaceBundleService.removePartnerFromBundle(bundleId, partnerId);

    res.json({ message: 'Partner removed from bundle successfully' });
  } catch (error) {
    console.error('Error removing partner from bundle:', error);
    res.status(500).json({ 
      error: 'Failed to remove partner from bundle',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/bundles/:bundleId/partners/:partnerId/performance
 * Update partner performance score in bundle
 * Admin only
 */
router.put('/bundles/:bundleId/partners/:partnerId/performance', async (req: Request, res: Response) => {
  try {
    const { bundleId, partnerId } = req.params;
    const { performanceScore } = req.body;

    // Validation
    if (performanceScore === undefined || performanceScore === null) {
      return res.status(400).json({ 
        error: 'Missing required field: performanceScore'
      });
    }

    if (performanceScore < 0 || performanceScore > 100) {
      return res.status(400).json({ 
        error: 'Performance score must be between 0 and 100'
      });
    }

    await marketplaceBundleService.updatePartnerPerformance(
      bundleId,
      partnerId,
      performanceScore
    );

    res.json({ message: 'Partner performance updated successfully' });
  } catch (error) {
    console.error('Error updating partner performance:', error);
    res.status(500).json({ 
      error: 'Failed to update partner performance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bundles/:bundleId/underperforming
 * Get underperforming partners in a bundle
 * Admin only
 */
router.get('/bundles/:bundleId/underperforming', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 40;

    const partners = await marketplaceBundleService.getUnderperformingPartners(
      bundleId,
      threshold
    );

    res.json(partners);
  } catch (error) {
    console.error('Error fetching underperforming partners:', error);
    res.status(500).json({ 
      error: 'Failed to fetch underperforming partners',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/bundles/:bundleId/status
 * Update bundle active status
 * Admin only
 */
router.put('/bundles/:bundleId/status', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined || isActive === null) {
      return res.status(400).json({ 
        error: 'Missing required field: isActive'
      });
    }

    await marketplaceBundleService.updateBundleStatus(bundleId, isActive);

    res.json({ message: 'Bundle status updated successfully' });
  } catch (error) {
    console.error('Error updating bundle status:', error);
    res.status(500).json({ 
      error: 'Failed to update bundle status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/bundles/:bundleId
 * Delete a bundle
 * Admin only
 */
router.delete('/bundles/:bundleId', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;

    await marketplaceBundleService.deleteBundle(bundleId);

    res.json({ message: 'Bundle deleted successfully' });
  } catch (error) {
    console.error('Error deleting bundle:', error);
    res.status(500).json({ 
      error: 'Failed to delete bundle',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bundles/:bundleId/validate
 * Validate bundle has required categories
 * Admin only
 */
router.post('/bundles/:bundleId/validate', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const { requiredCategories } = req.body;

    if (!requiredCategories || !Array.isArray(requiredCategories)) {
      return res.status(400).json({ 
        error: 'Missing or invalid required field: requiredCategories (must be array)'
      });
    }

    const validation = await marketplaceBundleService.validateBundleCategories(
      bundleId,
      requiredCategories
    );

    res.json(validation);
  } catch (error) {
    console.error('Error validating bundle:', error);
    res.status(500).json({ 
      error: 'Failed to validate bundle',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

// ============================================================================
// Bundle Attribution Tracking Endpoints
// ============================================================================

import { bundleAttributionService } from './services/bundleAttributionService';

/**
 * POST /api/bundles/:bundleId/track/view
 * Track bundle view
 */
router.post('/bundles/:bundleId/track/view', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const { userId, metadata } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    await bundleAttributionService.trackBundleView({
      bundleId,
      userId,
      metadata
    });

    res.status(201).json({ message: 'Bundle view tracked successfully' });
  } catch (error) {
    console.error('Error tracking bundle view:', error);
    res.status(500).json({ 
      error: 'Failed to track bundle view',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bundles/:bundleId/track/partner-engagement
 * Track partner engagement from bundle
 */
router.post('/bundles/:bundleId/track/partner-engagement', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const { partnerId, userId, eventType, contentId, metadata } = req.body;

    if (!partnerId || !userId || !eventType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['partnerId', 'userId', 'eventType']
      });
    }

    if (!['partner_click', 'profile_view'].includes(eventType)) {
      return res.status(400).json({ 
        error: 'Invalid eventType. Must be "partner_click" or "profile_view"'
      });
    }

    await bundleAttributionService.trackPartnerEngagement({
      bundleId,
      partnerId,
      userId,
      eventType,
      contentId,
      metadata
    });

    res.status(201).json({ message: 'Partner engagement tracked successfully' });
  } catch (error) {
    console.error('Error tracking partner engagement:', error);
    res.status(500).json({ 
      error: 'Failed to track partner engagement',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bundles/:bundleId/track/lead
 * Track lead attribution to bundle
 */
router.post('/bundles/:bundleId/track/lead', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const { partnerId, userId, leadId, eventType, metadata } = req.body;

    if (!partnerId || !userId || !leadId || !eventType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['partnerId', 'userId', 'leadId', 'eventType']
      });
    }

    if (!['lead_generated', 'lead_converted'].includes(eventType)) {
      return res.status(400).json({ 
        error: 'Invalid eventType. Must be "lead_generated" or "lead_converted"'
      });
    }

    await bundleAttributionService.trackLeadAttribution({
      bundleId,
      partnerId,
      userId,
      leadId,
      eventType,
      metadata
    });

    res.status(201).json({ message: 'Lead attribution tracked successfully' });
  } catch (error) {
    console.error('Error tracking lead attribution:', error);
    res.status(500).json({ 
      error: 'Failed to track lead attribution',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bundles/:bundleId/metrics
 * Get bundle attribution metrics
 */
router.get('/bundles/:bundleId/metrics', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const metrics = await bundleAttributionService.getBundleMetrics(bundleId);

    if (!metrics) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching bundle metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bundle metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/partners/:partnerId/bundle-metrics
 * Get partner metrics across all bundles
 */
router.get('/partners/:partnerId/bundle-metrics', async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const metrics = await bundleAttributionService.getPartnerMetricsAcrossBundles(partnerId);

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching partner bundle metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch partner bundle metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/users/:userId/bundle-history
 * Get user's bundle engagement history
 */
router.get('/users/:userId/bundle-history', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const history = await bundleAttributionService.getUserBundleHistory(userId);

    res.json(history);
  } catch (error) {
    console.error('Error fetching user bundle history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user bundle history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bundles/top-performing
 * Get top performing bundles by conversion rate
 */
router.get('/bundles-analytics/top-performing', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const bundles = await bundleAttributionService.getTopPerformingBundles(limit);

    res.json(bundles);
  } catch (error) {
    console.error('Error fetching top performing bundles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch top performing bundles',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
