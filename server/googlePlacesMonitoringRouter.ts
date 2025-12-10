/**
 * Google Places API Monitoring Router
 * 
 * Provides endpoints for monitoring Google Places API usage
 * Requirements: 26.4 - Create monitoring dashboard
 */

import { Router } from 'express';
import { googlePlacesApiMonitoring } from './services/googlePlacesApiMonitoring';

const router = Router();

/**
 * GET /api/google-places-monitoring/statistics
 * Get comprehensive usage statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const statistics = await googlePlacesApiMonitoring.getUsageStatistics();
    res.json(statistics);
  } catch (error) {
    console.error('Failed to get usage statistics:', error);
    res.status(500).json({
      error: 'Failed to retrieve usage statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/google-places-monitoring/alerts
 * Get active alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await googlePlacesApiMonitoring.getActiveAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Failed to get alerts:', error);
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/google-places-monitoring/alerts/:id/resolve
 * Resolve an alert
 */
router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    const alertId = parseInt(req.params.id, 10);
    
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    await googlePlacesApiMonitoring.resolveAlert(alertId);
    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    console.error('Failed to resolve alert:', error);
    res.status(500).json({
      error: 'Failed to resolve alert',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/google-places-monitoring/config
 * Get monitoring configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = await googlePlacesApiMonitoring.getConfig();
    res.json(config);
  } catch (error) {
    console.error('Failed to get config:', error);
    res.status(500).json({
      error: 'Failed to retrieve configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/google-places-monitoring/config
 * Update monitoring configuration
 */
router.put('/config', async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate updates
    const validKeys = [
      'dailyRequestLimit',
      'usageAlertThreshold',
      'errorRateThreshold',
      'responseTimeThreshold',
      'costAlertThreshold',
      'autocompleteCostPer1000',
      'placeDetailsCostPer1000',
      'geocodeCostPer1000',
    ];

    const invalidKeys = Object.keys(updates).filter(key => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        error: 'Invalid configuration keys',
        invalidKeys,
      });
    }

    await googlePlacesApiMonitoring.updateConfig(updates);
    res.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
    console.error('Failed to update config:', error);
    res.status(500).json({
      error: 'Failed to update configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/google-places-monitoring/historical
 * Get historical data for charts
 */
router.get('/historical', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 30;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter',
        message: 'Days must be between 1 and 365',
      });
    }

    const historicalData = await googlePlacesApiMonitoring.getHistoricalData(days);
    res.json(historicalData);
  } catch (error) {
    console.error('Failed to get historical data:', error);
    res.status(500).json({
      error: 'Failed to retrieve historical data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/google-places-monitoring/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const statistics = await googlePlacesApiMonitoring.getUsageStatistics();
    const config = await googlePlacesApiMonitoring.getConfig();
    
    const usagePercentage = (statistics.today.totalRequests / config.dailyRequestLimit) * 100;
    const errorRate = statistics.today.errorRate;
    
    const health = {
      status: 'healthy',
      checks: {
        usageWithinLimit: usagePercentage < config.usageAlertThreshold * 100,
        errorRateAcceptable: errorRate < config.errorRateThreshold * 100,
        responseTimeAcceptable: statistics.currentHour.averageResponseTime < config.responseTimeThreshold,
      },
      metrics: {
        usagePercentage: usagePercentage.toFixed(2),
        errorRate: errorRate.toFixed(2),
        averageResponseTime: statistics.currentHour.averageResponseTime,
      },
    };

    // Determine overall health status
    const allChecksPass = Object.values(health.checks).every(check => check);
    health.status = allChecksPass ? 'healthy' : 'degraded';

    res.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
