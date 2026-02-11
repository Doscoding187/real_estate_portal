import { Router } from 'express';
import type { Request, Response } from 'express';
import { exploreFeedService } from '../services/exploreFeedService';
import { exploreInteractionService } from '../services/exploreInteractionService';

const router = Router();

/**
 * Explore Shorts API Router (BOOT-SAFE)
 *
 * Important:
 * - We DO NOT import any tables from ../../drizzle/schema here.
 * - Missing schema exports (like exploreHighlightTags) must never crash server boot.
 */

// Middleware to check authentication (optional for some endpoints)
const optionalAuth = (req: Request, res: Response, next: Function) => {
  // User ID will be available if authenticated, otherwise null
  // This allows both authenticated and guest users to browse
  next();
};

// Middleware to require authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Rate limiting middleware (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: Function) => {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const userLimit = rateLimitMap.get(identifier);

    if (!userLimit || now > userLimit.resetTime) {
      rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
    }

    userLimit.count++;
    next();
  };
};

/**
 * GET /api/explore
 * Canonical Explore feed (Phase 1): alias to /recommended
 */
router.get('/', optionalAuth, rateLimit(100, 60000), async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user?.id;

    const result = await exploreFeedService.getRecommendedFeed({
      userId,
      limit: Number(limit),
      offset: Number(offset),
    });

    res.json(result);
  } catch (err) {
    console.error('[Explore API] Failed to fetch recommended feed:', err);

    res.status(500).json({
      error: 'Failed to fetch feed',
      details:
        process.env.NODE_ENV !== 'production'
          ? err instanceof Error
            ? err.message
            : String(err)
          : undefined,
    });
  }
});

router.get(
  '/recommended',
  optionalAuth,
  rateLimit(100, 60000),
  async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const userId = req.user?.id;

      const result = await exploreFeedService.getRecommendedFeed({
        userId,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json(result);
    } catch (err) {
      console.error('[Explore API] Failed to fetch recommended feed:', err);

      res.status(500).json({
        error: 'Failed to fetch feed',
        details:
          process.env.NODE_ENV !== 'production'
            ? err instanceof Error
              ? err.message
              : String(err)
            : undefined,
      });
    }
  },
);

/**
 * GET /api/explore/by-area
 * Get properties from specific area
 */
router.get('/by-area', optionalAuth, rateLimit(100, 60000), async (req: Request, res: Response) => {
  try {
    const { location, limit = 20, offset = 0 } = req.query;

    if (!location) {
      return res.status(400).json({ error: 'Location parameter required' });
    }

    const result = await exploreFeedService.getAreaFeed({
      location: String(location),
      limit: Number(limit),
      offset: Number(offset),
    });

    res.json(result);
  } catch (err) {
    console.error('[Explore API] Failed to fetch area feed:', err);

    res.status(500).json({
      error: 'Failed to fetch feed',
      details:
        process.env.NODE_ENV !== 'production'
          ? err instanceof Error
            ? err.message
            : String(err)
          : undefined,
    });
  }
});

/**
 * GET /api/explore/by-category
 * Boot-safe stub (the feed service currently does not implement getCategoryFeed)
 */
router.get(
  '/by-category',
  optionalAuth,
  rateLimit(100, 60000),
  async (_req: Request, res: Response) => {
    return res.status(501).json({
      error: 'Not implemented',
      message: 'Category feed is not available yet.',
    });
  },
);

/**
 * GET /api/explore/agent-feed/:id
 */
router.get(
  '/agent-feed/:id',
  optionalAuth,
  rateLimit(100, 60000),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const result = await exploreFeedService.getAgentFeed({
        agentId: Number(id),
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json(result);
    } catch (err) {
      console.error('[Explore API] Failed to fetch agent feed:', err);

      res.status(500).json({
        error: 'Failed to fetch feed',
        details:
          process.env.NODE_ENV !== 'production'
            ? err instanceof Error
              ? err.message
              : String(err)
            : undefined,
      });
    }
  },
);

/**
 * GET /api/explore/developer-feed/:id
 */
router.get(
  '/developer-feed/:id',
  optionalAuth,
  rateLimit(100, 60000),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const result = await exploreFeedService.getDeveloperFeed({
        developerId: Number(id),
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json(result);
    } catch (err) {
      console.error('[Explore API] Failed to fetch developer feed:', err);

      res.status(500).json({
        error: 'Failed to fetch feed',
        details:
          process.env.NODE_ENV !== 'production'
            ? err instanceof Error
              ? err.message
              : String(err)
            : undefined,
      });
    }
  },
);

/**
 * POST /api/explore/interaction
 * Record user interaction with a short
 */
router.post(
  '/interaction',
  optionalAuth,
  rateLimit(500, 60000),
  async (req: Request, res: Response) => {
    try {
      const { shortId, interactionType, duration, feedType, feedContext, deviceType } = req.body;

      if (!shortId || !interactionType || !feedType || !deviceType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const sessionId = (req as any).sessionID || `guest-${Date.now()}-${Math.random()}`;

      await exploreInteractionService.recordInteraction({
        contentId: shortId, // Pass the shortId as contentId
        userId: req.user?.id,
        sessionId,
        interactionType,
        duration,
        feedType,
        feedContext,
        deviceType,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
      } as any);

      res.json({ success: true });
    } catch (err) {
      console.error('[Explore API] Failed to record interaction:', err);

      res.status(500).json({
        error: 'Failed to record interaction',
        details:
          process.env.NODE_ENV !== 'production'
            ? err instanceof Error
              ? err.message
              : String(err)
            : undefined,
      });
    }
  },
);

/**
 * POST /api/explore/save/:propertyId
 * Save property to favorites (best-effort)
 */
router.post(
  '/save/:propertyId',
  requireAuth,
  rateLimit(100, 60000),
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const userId = req.user!.id;

      await exploreInteractionService.saveProperty(Number(propertyId), userId);

      res.json({ success: true, propertyId: Number(propertyId) });
    } catch (err) {
      console.error('[Explore API] Failed to save property:', err);

      res.status(500).json({
        error: 'Failed to save property',
        details:
          process.env.NODE_ENV !== 'production'
            ? err instanceof Error
              ? err.message
              : String(err)
            : undefined,
      });
    }
  },
);

/**
 * POST /api/explore/share/:propertyId
 */
router.post(
  '/share/:propertyId',
  optionalAuth,
  rateLimit(100, 60000),
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const { platform } = req.body;
      const sessionId = (req as any).sessionID || `guest-${Date.now()}-${Math.random()}`;

      await exploreInteractionService.shareProperty(
        Number(propertyId),
        req.user?.id,
        sessionId,
        platform,
      );

      res.json({ success: true, propertyId: Number(propertyId), platform });
    } catch (err) {
      console.error('[Explore API] Failed to record share:', err);

      res.status(500).json({
        error: 'Failed to record share',
        details:
          process.env.NODE_ENV !== 'production'
            ? err instanceof Error
              ? err.message
              : String(err)
            : undefined,
      });
    }
  },
);

/**
 * GET /api/explore/highlight-tags
 * Boot-safe stub (exploreHighlightTags is not exported in schema)
 */
router.get('/highlight-tags', rateLimit(50, 60000), async (_req: Request, res: Response) => {
  return res.json({ tags: [] });
});

export default router;
