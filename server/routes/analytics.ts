/**
 * server/routes/analytics.ts
 * ---------------------------------------------
 * Analytics Tracking Router
 * Boot-safe, production-ready Express router
 * ---------------------------------------------
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /health
 * Health check for router loader + deployment verification
 */
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    router: 'analytics',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /track
 * Track analytics events from the frontend
 */
router.post('/track', async (req, res) => {
  try {
    const event = req.body;

    // Basic validation (boot-safe, non-blocking)
    if (!event || !event.eventType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid analytics payload',
      });
    }

    // Structured logging (prod-safe)
    console.log('[Analytics Event]', {
      type: event.eventType,
      page: event.page ?? null,
      deviceType: event.deviceType ?? null,
      userId: event.userId ?? null,
      sessionId: event.sessionId ?? null,
      timestamp: event.timestamp ?? Date.now(),
      meta: event.meta ?? {},
    });

    // Future-ready hook (DB / Queue / Kafka / Segment / GA / internal pipeline)
    // await analyticsService.track(event)

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Analytics] Track Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track analytics event',
    });
  }
});

export default router;
export { router };