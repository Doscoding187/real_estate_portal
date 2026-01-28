import { Router } from 'express';
import { db } from '../db';
import {
  exploreShorts,
  exploreInteractions,
  exploreHighlightTags,
  exploreUserPreferences,
} from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { exploreFeedService } from '../services/exploreFeedService';
import { exploreInteractionService } from '../services/exploreInteractionService';

const router = Router();

/**
 * Explore Shorts API Router
 *
 * Handles all API endpoints for the Property Explore Shorts feature
 * including feed generation, interaction tracking, and content management.
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
      rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
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
 * GET /api/explore/recommended
 * Get personalized recommended feed
 */
router.get(
  '/recommended',
  optionalAuth,
  rateLimit(100, 60000), // 100 requests per minute
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
    } catch (error) {
      console.error('Error fetching recommended feed:', error);
      res.status(500).json({ error: 'Failed to fetch feed' });
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
  } catch (error) {
    console.error('Error fetching area feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

/**
 * GET /api/explore/by-category
 * Get properties by category
 */
router.get(
  '/by-category',
  optionalAuth,
  rateLimit(100, 60000),
  async (req: Request, res: Response) => {
    try {
      const { category, limit = 20, offset = 0 } = req.query;

      if (!category) {
        return res.status(400).json({ error: 'Category parameter required' });
      }

      const result = await exploreFeedService.getCategoryFeed({
        category: String(category),
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching category feed:', error);
      res.status(500).json({ error: 'Failed to fetch feed' });
    }
  },
);

/**
 * GET /api/explore/agent-feed/:id
 * Get all properties from specific agent
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
    } catch (error) {
      console.error('Error fetching agent feed:', error);
      res.status(500).json({ error: 'Failed to fetch feed' });
    }
  },
);

/**
 * GET /api/explore/developer-feed/:id
 * Get all properties from specific developer
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
    } catch (error) {
      console.error('Error fetching developer feed:', error);
      res.status(500).json({ error: 'Failed to fetch feed' });
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
  rateLimit(500, 60000), // 500 requests per minute for interactions
  async (req: Request, res: Response) => {
    try {
      const { shortId, interactionType, duration, feedType, feedContext, deviceType } = req.body;

      if (!shortId || !interactionType || !feedType || !deviceType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Generate session ID if not provided
      const sessionId = req.sessionID || `guest-${Date.now()}-${Math.random()}`;

      await exploreInteractionService.recordInteraction({
        shortId,
        userId: req.user?.id,
        sessionId,
        interactionType,
        duration,
        feedType,
        feedContext,
        deviceType,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  },
);

/**
 * POST /api/explore/save/:propertyId
 * Save property to favorites
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
    } catch (error) {
      console.error('Error saving property:', error);
      res.status(500).json({ error: 'Failed to save property' });
    }
  },
);

/**
 * POST /api/explore/share/:propertyId
 * Record property share
 */
router.post(
  '/share/:propertyId',
  optionalAuth,
  rateLimit(100, 60000),
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const { platform } = req.body;
      const sessionId = req.sessionID || `guest-${Date.now()}-${Math.random()}`;

      await exploreInteractionService.shareProperty(
        Number(propertyId),
        req.user?.id,
        sessionId,
        platform,
      );

      res.json({ success: true, propertyId: Number(propertyId), platform });
    } catch (error) {
      console.error('Error recording share:', error);
      res.status(500).json({ error: 'Failed to record share' });
    }
  },
);

/**
 * GET /api/explore/highlight-tags
 * Get all available highlight tags
 */
router.get('/highlight-tags', rateLimit(50, 60000), async (req: Request, res: Response) => {
  try {
    const tags = await db
      .select()
      .from(exploreHighlightTags)
      .where(eq(exploreHighlightTags.isActive, 1))
      .orderBy(exploreHighlightTags.displayOrder);

    res.json({ tags });
  } catch (error) {
    console.error('Error fetching highlight tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

export default router;
