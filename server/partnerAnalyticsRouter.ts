/**
 * Partner Analytics Router
 * API endpoints for partner analytics dashboard
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { Router } from 'express';
import { partnerAnalyticsService } from './services/partnerAnalyticsService';

const router = Router();

/**
 * GET /api/partner-analytics/:partnerId/summary
 * Get partner analytics summary
 * Requirement 13.1: Display total views, engagement rate, and lead conversions
 */
router.get('/:partnerId/summary', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const summary = await partnerAnalyticsService.getPartnerAnalyticsSummary(partnerId, start, end);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching partner analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics summary',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/trends
 * Get performance trends over time
 * Requirement 13.2: Show daily, weekly, monthly performance trends
 */
router.get('/:partnerId/trends', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { period = 'daily', startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    if (!['daily', 'weekly', 'monthly'].includes(period as string)) {
      return res.status(400).json({
        success: false,
        error: 'period must be daily, weekly, or monthly',
      });
    }

    const trends = await partnerAnalyticsService.getPerformanceTrends(
      partnerId,
      period as 'daily' | 'weekly' | 'monthly',
      new Date(startDate as string),
      new Date(endDate as string),
    );

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error('Error fetching performance trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance trends',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/top-content
 * Get content ranked by performance
 * Requirement 13.3: Rank partner's content pieces by engagement
 */
router.get('/:partnerId/top-content', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { limit = '10' } = req.query;

    const topContent = await partnerAnalyticsService.getContentRankedByPerformance(
      partnerId,
      parseInt(limit as string, 10),
    );

    res.json({
      success: true,
      data: topContent,
    });
  } catch (error) {
    console.error('Error fetching top content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top content',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/funnel
 * Get conversion funnel analytics
 * Requirement 13.4: Track view → engagement → lead funnel
 */
router.get('/:partnerId/funnel', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const funnel = await partnerAnalyticsService.getConversionFunnel(partnerId, start, end);

    res.json({
      success: true,
      data: funnel,
    });
  } catch (error) {
    console.error('Error fetching conversion funnel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion funnel',
    });
  }
});

/**
 * GET /api/partner-analytics/benchmarks
 * Get tier benchmark comparisons
 * Requirement 13.5: Compare partner performance to tier averages
 */
router.get('/benchmarks', async (req, res) => {
  try {
    const benchmarks = await partnerAnalyticsService.getTierBenchmarks();

    res.json({
      success: true,
      data: benchmarks,
    });
  } catch (error) {
    console.error('Error fetching tier benchmarks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tier benchmarks',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/boost-roi
 * Get boost campaign ROI metrics
 * Requirement 13.6: Calculate ROI for each boost campaign
 */
router.get('/:partnerId/boost-roi', async (req, res) => {
  try {
    const { partnerId } = req.params;

    const roiData = await partnerAnalyticsService.getBoostCampaignROI(partnerId);

    res.json({
      success: true,
      data: roiData,
    });
  } catch (error) {
    console.error('Error fetching boost ROI:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch boost ROI',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/dashboard
 * Get complete analytics dashboard data
 * Combines all analytics for a comprehensive dashboard view
 */
router.get('/:partnerId/dashboard', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { period = 'weekly', startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    // Fetch all analytics in parallel
    const [summary, trends, topContent, funnel, benchmarks, boostROI] = await Promise.all([
      partnerAnalyticsService.getPartnerAnalyticsSummary(partnerId, start, end),
      start && end
        ? partnerAnalyticsService.getPerformanceTrends(
            partnerId,
            period as 'daily' | 'weekly' | 'monthly',
            start,
            end,
          )
        : Promise.resolve([]),
      partnerAnalyticsService.getContentRankedByPerformance(partnerId, 5),
      partnerAnalyticsService.getConversionFunnel(partnerId, start, end),
      partnerAnalyticsService.getTierBenchmarks(),
      partnerAnalyticsService.getBoostCampaignROI(partnerId),
    ]);

    res.json({
      success: true,
      data: {
        summary,
        trends,
        topContent,
        funnel,
        benchmarks,
        boostROI,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics dashboard',
    });
  }
});

export default router;
