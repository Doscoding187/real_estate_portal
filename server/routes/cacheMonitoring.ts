/**
 * Cache Monitoring Routes
 * Task 17: Performance Optimization
 *
 * Provides cache statistics and management endpoints
 */

import { Router } from 'express';
import { redisCache } from '../lib/redis';
import { getCacheStats } from '../services/cacheIntegrationService';

const router = Router();

/**
 * Get cache statistics
 * GET /api/cache/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getCacheStats();

    res.json({
      success: true,
      stats: {
        connected: stats.connected,
        totalKeys: stats.keys,
        memory: stats.memory || 'N/A',
        backend: stats.connected ? 'Redis' : 'In-Memory Fallback',
      },
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache statistics',
    });
  }
});

/**
 * Clear all cache (admin only)
 * POST /api/cache/clear
 */
router.post('/clear', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware

    await redisCache.delByPattern('explore:*');

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

/**
 * Clear specific cache pattern (admin only)
 * POST /api/cache/clear/:pattern
 */
router.post('/clear/:pattern', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware

    const { pattern } = req.params;
    await redisCache.delByPattern(`explore:${pattern}:*`);

    res.json({
      success: true,
      message: `Cache pattern 'explore:${pattern}:*' cleared successfully`,
    });
  } catch (error) {
    console.error('Error clearing cache pattern:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache pattern',
    });
  }
});

/**
 * Health check for cache connection
 * GET /api/cache/health
 */
router.get('/health', async (req, res) => {
  try {
    const stats = await getCacheStats();

    res.json({
      success: true,
      healthy: true,
      connected: stats.connected,
      backend: stats.connected ? 'Redis' : 'In-Memory Fallback',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      healthy: false,
      error: 'Cache service unavailable',
    });
  }
});

export default router;
