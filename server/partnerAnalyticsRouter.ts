/**
 * Partner Analytics Router (BOOT-SAFE)
 * API endpoints for partner analytics dashboard
 * Requirements: 13.1 - 13.6
 *
 * IMPORTANT:
 * - We lazy-import the service so missing schema exports do NOT crash backend boot.
 * - If service import fails, we return 501 and log a clear warning.
 */

import { Router } from 'express';

const router = Router();

// ---- Boot-safe lazy loader ----
let _service: any | null = null;

async function getPartnerAnalyticsService() {
  if (_service) return _service;

  try {
    // Adjust path if your service file lives elsewhere:
    // Common options:
    // 1) '../services/partnerAnalyticsService'
    // 2) './services/partnerAnalyticsService'
    const mod: any = await import('./services/partnerAnalyticsService');

    const svc = mod?.partnerAnalyticsService ?? mod?.default;
    if (!svc) {
      throw new Error(
        `partnerAnalyticsService not exported. Exports: ${Object.keys(mod ?? {}).join(', ')}`,
      );
    }

    _service = svc;
    return _service;
  } catch (err: any) {
    console.warn(
      '[PartnerAnalyticsRouter] Service unavailable (boot-safe). Reason:',
      err?.message ?? err,
    );
    throw err;
  }
}

function parseDate(d: unknown): Date | undefined {
  if (!d || typeof d !== 'string') return undefined;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

/**
 * GET /api/partner-analytics/benchmarks
 * Get tier benchmark comparisons
 * Requirement 13.5
 */
router.get('/benchmarks', async (_req, res) => {
  try {
    const partnerAnalyticsService = await getPartnerAnalyticsService();
    const benchmarks = await partnerAnalyticsService.getTierBenchmarks();

    res.json({ success: true, data: benchmarks });
  } catch (error) {
    res.status(501).json({
      success: false,
      error: 'Partner analytics service not available yet',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/summary
 * Requirement 13.1
 */
router.get('/:partnerId/summary', async (req, res) => {
  try {
    const partnerAnalyticsService = await getPartnerAnalyticsService();

    const { partnerId } = req.params;
    const start = parseDate(req.query.startDate);
    const end = parseDate(req.query.endDate);

    const summary = await partnerAnalyticsService.getPartnerAnalyticsSummary(partnerId, start, end);

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching partner analytics summary:', error);
    res.status(501).json({
      success: false,
      error: 'Partner analytics service not available yet',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/trends
 * Requirement 13.2
 */
router.get('/:partnerId/trends', async (req, res) => {
  try {
    const partnerAnalyticsService = await getPartnerAnalyticsService();

    const { partnerId } = req.params;
    const period = (req.query.period ?? 'daily') as string;

    const startRaw = req.query.startDate;
    const endRaw = req.query.endDate;

    if (!startRaw || !endRaw) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'period must be daily, weekly, or monthly',
      });
    }

    const start = new Date(startRaw as string);
    const end = new Date(endRaw as string);

    const trends = await partnerAnalyticsService.getPerformanceTrends(
      partnerId,
      period as 'daily' | 'weekly' | 'monthly',
      start,
      end,
    );

    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('Error fetching performance trends:', error);
    res.status(501).json({
      success: false,
      error: 'Partner analytics service not available yet',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/top-content
 * Requirement 13.3
 */
router.get('/:partnerId/top-content', async (req, res) => {
  try {
    const partnerAnalyticsService = await getPartnerAnalyticsService();

    const { partnerId } = req.params;
    const limit = parseInt((req.query.limit ?? '10') as string, 10);

    const topContent = await partnerAnalyticsService.getContentRankedByPerformance(
      partnerId,
      Number.isFinite(limit) ? limit : 10,
    );

    res.json({ success: true, data: topContent });
  } catch (error) {
    console.error('Error fetching top content:', error);
    res.status(501).json({
      success: false,
      error: 'Partner analytics service not available yet',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/funnel
 * Requirement 13.4
 */
router.get('/:partnerId/funnel', async (req, res) => {
  try {
    const partnerAnalyticsService = await getPartnerAnalyticsService();

    const { partnerId } = req.params;
    const start = parseDate(req.query.startDate);
    const end = parseDate(req.query.endDate);

    const funnel = await partnerAnalyticsService.getConversionFunnel(partnerId, start, end);

    res.json({ success: true, data: funnel });
  } catch (error) {
    console.error('Error fetching conversion funnel:', error);
    res.status(501).json({
      success: false,
      error: 'Partner analytics service not available yet',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/boost-roi
 * Requirement 13.6
 */
router.get('/:partnerId/boost-roi', async (req, res) => {
  try {
    const partnerAnalyticsService = await getPartnerAnalyticsService();

    const { partnerId } = req.params;
    const roiData = await partnerAnalyticsService.getBoostCampaignROI(partnerId);

    res.json({ success: true, data: roiData });
  } catch (error) {
    console.error('Error fetching boost ROI:', error);
    res.status(501).json({
      success: false,
      error: 'Partner analytics service not available yet',
    });
  }
});

/**
 * GET /api/partner-analytics/:partnerId/dashboard
 * Combined dashboard endpoint
 */
router.get('/:partnerId/dashboard', async (req, res) => {
  try {
    const partnerAnalyticsService = await getPartnerAnalyticsService();

    const { partnerId } = req.params;
    const period = (req.query.period ?? 'weekly') as string;
    const start = parseDate(req.query.startDate);
    const end = parseDate(req.query.endDate);

    const [summary, trends, topContent, funnel, benchmarks, boostROI] = await Promise.all([
      partnerAnalyticsService.getPartnerAnalyticsSummary(partnerId, start, end),
      start && end
        ? partnerAnalyticsService.getPerformanceTrends(
            partnerId,
            (['daily', 'weekly', 'monthly'].includes(period)
              ? period
              : 'weekly') as 'daily' | 'weekly' | 'monthly',
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
      data: { summary, trends, topContent, funnel, benchmarks, boostROI },
    });
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    res.status(501).json({
      success: false,
      error: 'Partner analytics service not available yet',
    });
  }
});

export default router;

