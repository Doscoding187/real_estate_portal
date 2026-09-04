import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { exploreFeedService } from '../services/exploreFeedService';

const router = Router();

/**
 * Explore Shorts API Router (BOOT-SAFE)
 *
 * Important:
 * - We DO NOT import any tables from ../../drizzle/schema here.
 * - Missing schema exports (like exploreHighlightTags) must never crash server boot.
 */

// Middleware to check authentication (optional for some endpoints)
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // User ID will be available if authenticated, otherwise null
  // This allows both authenticated and guest users to browse
  next();
};

// Middleware to require authentication
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Rate limiting middleware (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
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
 * Legacy engagement boundary. Browser-originated ranking signals are owned by
 * the governed discovery.engage workflow.
 */
router.post('/interaction', optionalAuth, rateLimit(500, 60000), (_req: Request, res: Response) => {
  return res.status(410).json({
    error: 'Explore interaction tracking is unavailable in the legacy workflow.',
    code: 'CAPABILITY_UNAVAILABLE',
    message: 'Use the governed discovery.engage workflow.',
  });
});

/**
 * POST /api/explore/save/:propertyId
 * Legacy save boundary. Property saves are owned by properties.toggleFavorite.
 */
router.post(
  '/save/:propertyId',
  requireAuth,
  rateLimit(100, 60000),
  async (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'Explore property saves are unavailable in the legacy workflow.',
      code: 'CAPABILITY_UNAVAILABLE',
      message: 'Use the canonical properties.toggleFavorite workflow.',
    });
  },
);

/**
 * Legacy share boundary. Browser-originated ranking signals are owned by the
 * governed discovery.engage workflow.
 */
router.post(
  '/share/:propertyId',
  optionalAuth,
  rateLimit(100, 60000),
  (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'Explore sharing is unavailable in the legacy workflow.',
      code: 'CAPABILITY_UNAVAILABLE',
      message: 'Use the governed discovery.engage workflow.',
    });
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
