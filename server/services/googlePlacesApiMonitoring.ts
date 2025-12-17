/**
 * Google Places API Monitoring Service
 * 
 * Requirements:
 * - 26.1: Log autocomplete requests with session tokens
 * - 26.2: Log Place Details requests with response times
 * - 26.3: Log API errors with context
 * - 26.4: Provide monitoring dashboard with API call counts
 * - 26.5: Alert administrators when usage exceeds 80% of limit
 */

import { db, getDb } from '../db';
import { sql } from 'drizzle-orm';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface APIUsageLog {
  timestamp: Date;
  requestType: 'autocomplete' | 'place_details' | 'geocode' | 'reverse_geocode';
  sessionToken?: string;
  success: boolean;
  responseTime: number;
  error?: string;
  userId?: number;
  ipAddress?: string;
}

export interface DailySummary {
  date: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  autocompleteRequests: number;
  placeDetailsRequests: number;
  geocodeRequests: number;
  reverseGeocodeRequests: number;
  averageResponseTime: number;
  totalCost: number;
  errorRate: number;
}

export interface UsageStatistics {
  today: DailySummary;
  last7Days: DailySummary;
  last30Days: DailySummary;
  currentHour: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
  };
  topErrors: Array<{
    error: string;
    count: number;
    lastOccurrence: Date;
  }>;
  costProjection: {
    dailyProjected: number;
    monthlyProjected: number;
  };
}

export interface Alert {
  id: number;
  alertType: 'usage_threshold' | 'error_rate' | 'cost_threshold' | 'response_time';
  thresholdValue: number;
  currentValue: number;
  triggeredAt: Date;
  resolvedAt: Date | null;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  notified: boolean;
}

export interface MonitoringConfig {
  dailyRequestLimit: number;
  usageAlertThreshold: number; // 0.8 = 80%
  errorRateThreshold: number; // 0.05 = 5%
  responseTimeThreshold: number; // milliseconds
  costAlertThreshold: number; // USD
  autocompleteCostPer1000: number;
  placeDetailsCostPer1000: number;
  geocodeCostPer1000: number;
}

// ============================================================================
// Google Places API Monitoring Service
// ============================================================================

export class GooglePlacesApiMonitoringService {
  private config: MonitoringConfig | null = null;
  private configLoadedAt: Date | null = null;
  private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Log an API request
   * Requirements 26.1, 26.2, 26.3: Log all API requests with context
   */
  async logAPIRequest(log: APIUsageLog): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;
      
      await db.execute(sql`
        INSERT INTO google_places_api_logs (
          timestamp,
          request_type,
          session_token,
          success,
          response_time_ms,
          error_message,
          user_id,
          ip_address
        ) VALUES (
          ${log.timestamp},
          ${log.requestType},
          ${log.sessionToken || null},
          ${log.success},
          ${log.responseTime},
          ${log.error || null},
          ${log.userId || null},
          ${log.ipAddress || null}
        )
      `);

      // Update daily summary
      await this.updateDailySummary(log);

      // Check for threshold alerts
      await this.checkThresholds();
    } catch (error) {
      console.error('Failed to log API request:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Update daily summary statistics
   */
  private async updateDailySummary(log: APIUsageLog): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    try {
      const db = await getDb();
      if (!db) return;

      // Get current summary or create new one
      const result = await db.execute(sql`
        SELECT * FROM google_places_api_daily_summary
        WHERE date = ${today}
      `);

      const summary = result.rows[0] as any;

      if (summary) {
        // Update existing summary
        const totalRequests = summary.total_requests + 1;
        const successfulRequests = summary.successful_requests + (log.success ? 1 : 0);
        const failedRequests = summary.failed_requests + (log.success ? 0 : 1);

        // Update request type counters
        const typeColumn = `${log.requestType}_requests`;
        const typeCount = (summary[typeColumn] || 0) + 1;

        // Calculate new average response time
        const totalResponseTime = (summary.average_response_time_ms || 0) * summary.total_requests;
        const newAverageResponseTime = (totalResponseTime + log.responseTime) / totalRequests;

        // Calculate cost
        const config = await this.getConfig();
        const requestCost = this.calculateRequestCost(log.requestType, config);
        const totalCost = (summary.total_cost_usd || 0) + requestCost;

        await db.execute(sql`
          UPDATE google_places_api_daily_summary
          SET
            total_requests = ${totalRequests},
            successful_requests = ${successfulRequests},
            failed_requests = ${failedRequests},
            ${sql.raw(typeColumn)} = ${typeCount},
            average_response_time_ms = ${newAverageResponseTime},
            total_cost_usd = ${totalCost}
          WHERE date = ${today}
        `);
      } else {
        // Create new summary
        const config = await this.getConfig();
        const requestCost = this.calculateRequestCost(log.requestType, config);

        await db.execute(sql`
          INSERT INTO google_places_api_daily_summary (
            date,
            total_requests,
            successful_requests,
            failed_requests,
            autocomplete_requests,
            place_details_requests,
            geocode_requests,
            reverse_geocode_requests,
            average_response_time_ms,
            total_cost_usd
          ) VALUES (
            ${today},
            1,
            ${log.success ? 1 : 0},
            ${log.success ? 0 : 1},
            ${log.requestType === 'autocomplete' ? 1 : 0},
            ${log.requestType === 'place_details' ? 1 : 0},
            ${log.requestType === 'geocode' ? 1 : 0},
            ${log.requestType === 'reverse_geocode' ? 1 : 0},
            ${log.responseTime},
            ${requestCost}
          )
        `);
      }
    } catch (error) {
      console.error('Failed to update daily summary:', error);
    }
  }

  /**
   * Calculate cost for a single request
   */
  private calculateRequestCost(
    requestType: APIUsageLog['requestType'],
    config: MonitoringConfig
  ): number {
    switch (requestType) {
      case 'autocomplete':
        return config.autocompleteCostPer1000 / 1000;
      case 'place_details':
        return config.placeDetailsCostPer1000 / 1000;
      case 'geocode':
      case 'reverse_geocode':
        return config.geocodeCostPer1000 / 1000;
      default:
        return 0;
    }
  }

  /**
   * Check thresholds and create alerts if needed
   * Requirements 26.5: Alert when usage exceeds 80% of limit
   */
  private async checkThresholds(): Promise<void> {
    try {
      const config = await this.getConfig();
      const today = new Date().toISOString().split('T')[0];
      const db = await getDb();
      if (!db) return;

      // Get today's summary
      const result = await db.execute(sql`
        SELECT * FROM google_places_api_daily_summary
        WHERE date = ${today}
      `);

      const summary = result.rows[0] as any;
      if (!summary) return;

      // Check usage threshold (80% of daily limit)
      const usagePercentage = summary.total_requests / config.dailyRequestLimit;
      if (usagePercentage >= config.usageAlertThreshold) {
        await this.createAlert({
          alertType: 'usage_threshold',
          thresholdValue: config.usageAlertThreshold * 100,
          currentValue: usagePercentage * 100,
          severity: usagePercentage >= 0.95 ? 'critical' : 'warning',
          message: `API usage at ${(usagePercentage * 100).toFixed(1)}% of daily limit (${summary.total_requests}/${config.dailyRequestLimit} requests)`,
        });
      }

      // Check error rate threshold (5%)
      const errorRate = summary.failed_requests / summary.total_requests;
      if (errorRate >= config.errorRateThreshold) {
        await this.createAlert({
          alertType: 'error_rate',
          thresholdValue: config.errorRateThreshold * 100,
          currentValue: errorRate * 100,
          severity: errorRate >= 0.1 ? 'critical' : 'warning',
          message: `API error rate at ${(errorRate * 100).toFixed(1)}% (${summary.failed_requests}/${summary.total_requests} requests failed)`,
        });
      }

      // Check response time threshold
      if (summary.average_response_time_ms >= config.responseTimeThreshold) {
        await this.createAlert({
          alertType: 'response_time',
          thresholdValue: config.responseTimeThreshold,
          currentValue: summary.average_response_time_ms,
          severity: summary.average_response_time_ms >= config.responseTimeThreshold * 2 ? 'critical' : 'warning',
          message: `Average API response time at ${summary.average_response_time_ms}ms (threshold: ${config.responseTimeThreshold}ms)`,
        });
      }

      // Check cost threshold
      if (summary.total_cost_usd >= config.costAlertThreshold) {
        await this.createAlert({
          alertType: 'cost_threshold',
          thresholdValue: config.costAlertThreshold,
          currentValue: summary.total_cost_usd,
          severity: 'warning',
          message: `Daily API cost at $${summary.total_cost_usd.toFixed(2)} (threshold: $${config.costAlertThreshold})`,
        });
      }
    } catch (error) {
      console.error('Failed to check thresholds:', error);
    }
  }

  /**
   * Create an alert if one doesn't already exist for today
   */
  private async createAlert(alert: {
    alertType: Alert['alertType'];
    thresholdValue: number;
    currentValue: number;
    severity: Alert['severity'];
    message: string;
  }): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const db = await getDb();
      if (!db) return;

      // Check if alert already exists for today
      const existing = await db.execute(sql`
        SELECT id FROM google_places_api_alerts
        WHERE alert_type = ${alert.alertType}
          AND DATE(triggered_at) = ${today}
          AND resolved_at IS NULL
      `);

      if (existing.rows.length === 0) {
        // Create new alert
        await db.execute(sql`
          INSERT INTO google_places_api_alerts (
            alert_type,
            threshold_value,
            current_value,
            severity,
            message
          ) VALUES (
            ${alert.alertType},
            ${alert.thresholdValue},
            ${alert.currentValue},
            ${alert.severity},
            ${alert.message}
          )
        `);

        // Log to console for immediate visibility
        const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
        console.log(`${emoji} Google Places API Alert [${alert.severity}]: ${alert.message}`);
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }

  /**
   * Get usage statistics for dashboard
   * Requirements 26.4: Provide dashboard showing API call counts
   */
  async getUsageStatistics(): Promise<UsageStatistics> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get today's summary
      const todayResult = await db.execute(sql`
        SELECT * FROM google_places_api_daily_summary
        WHERE date = ${today}
      `);
      const todaySummary = this.formatDailySummary(todayResult.rows[0] as any);

      // Get last 7 days summary
      const last7DaysResult = await db.execute(sql`
        SELECT
          SUM(total_requests) as total_requests,
          SUM(successful_requests) as successful_requests,
          SUM(failed_requests) as failed_requests,
          SUM(autocomplete_requests) as autocomplete_requests,
          SUM(place_details_requests) as place_details_requests,
          SUM(geocode_requests) as geocode_requests,
          SUM(reverse_geocode_requests) as reverse_geocode_requests,
          AVG(average_response_time_ms) as average_response_time_ms,
          SUM(total_cost_usd) as total_cost_usd
        FROM google_places_api_daily_summary
        WHERE date >= ${sevenDaysAgo}
      `);
      const last7DaysSummary = this.formatDailySummary(last7DaysResult.rows[0] as any);

      // Get last 30 days summary
      const last30DaysResult = await db.execute(sql`
        SELECT
          SUM(total_requests) as total_requests,
          SUM(successful_requests) as successful_requests,
          SUM(failed_requests) as failed_requests,
          SUM(autocomplete_requests) as autocomplete_requests,
          SUM(place_details_requests) as place_details_requests,
          SUM(geocode_requests) as geocode_requests,
          SUM(reverse_geocode_requests) as reverse_geocode_requests,
          AVG(average_response_time_ms) as average_response_time_ms,
          SUM(total_cost_usd) as total_cost_usd
        FROM google_places_api_daily_summary
        WHERE date >= ${thirtyDaysAgo}
      `);
      const last30DaysSummary = this.formatDailySummary(last30DaysResult.rows[0] as any);

      // Get current hour statistics
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const currentHourResult = await db.execute(sql`
        SELECT
          COUNT(*) as total_requests,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
          AVG(response_time_ms) as average_response_time_ms
        FROM google_places_api_logs
        WHERE timestamp >= ${oneHourAgo}
      `);
      const currentHourData = currentHourResult.rows[0] as any;

      // Get top errors
      const topErrorsResult = await db.execute(sql`
        SELECT
          error_message as error,
          COUNT(*) as count,
          MAX(timestamp) as last_occurrence
        FROM google_places_api_logs
        WHERE success = 0
          AND error_message IS NOT NULL
          AND timestamp >= ${sevenDaysAgo}
        GROUP BY error_message
        ORDER BY count DESC
        LIMIT 10
      `);

      // Calculate cost projection
      const config = await this.getConfig();
      const hoursElapsed = new Date().getHours() + 1;
      const dailyProjected = todaySummary.totalCost * (24 / hoursElapsed);
      const monthlyProjected = last30DaysSummary.totalCost * (30 / 30); // Already 30 days

      return {
        today: todaySummary,
        last7Days: last7DaysSummary,
        last30Days: last30DaysSummary,
        currentHour: {
          totalRequests: Number(currentHourData?.total_requests || 0),
          successRate: currentHourData?.total_requests > 0
            ? (Number(currentHourData.successful_requests) / Number(currentHourData.total_requests)) * 100
            : 100,
          averageResponseTime: Number(currentHourData?.average_response_time_ms || 0),
        },
        topErrors: (topErrorsResult.rows as any[]).map(row => ({
          error: row.error,
          count: Number(row.count),
          lastOccurrence: new Date(row.last_occurrence),
        })),
        costProjection: {
          dailyProjected,
          monthlyProjected,
        },
      };
    } catch (error) {
      console.error('Failed to get usage statistics:', error);
      throw error;
    }
  }

  /**
   * Format daily summary data
   */
  private formatDailySummary(data: any): DailySummary {
    if (!data) {
      return {
        date: new Date().toISOString().split('T')[0],
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        autocompleteRequests: 0,
        placeDetailsRequests: 0,
        geocodeRequests: 0,
        reverseGeocodeRequests: 0,
        averageResponseTime: 0,
        totalCost: 0,
        errorRate: 0,
      };
    }

    const totalRequests = Number(data.total_requests || 0);
    const failedRequests = Number(data.failed_requests || 0);

    return {
      date: data.date || new Date().toISOString().split('T')[0],
      totalRequests,
      successfulRequests: Number(data.successful_requests || 0),
      failedRequests,
      autocompleteRequests: Number(data.autocomplete_requests || 0),
      placeDetailsRequests: Number(data.place_details_requests || 0),
      geocodeRequests: Number(data.geocode_requests || 0),
      reverseGeocodeRequests: Number(data.reverse_geocode_requests || 0),
      averageResponseTime: Number(data.average_response_time_ms || 0),
      totalCost: Number(data.total_cost_usd || 0),
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
    };
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      const result = await db.execute(sql`
        SELECT * FROM google_places_api_alerts
        WHERE resolved_at IS NULL
        ORDER BY triggered_at DESC
        LIMIT 50
      `);

      return (result.rows as any[]).map(row => ({
        id: row.id,
        alertType: row.alert_type,
        thresholdValue: Number(row.threshold_value),
        currentValue: Number(row.current_value),
        triggeredAt: new Date(row.triggered_at),
        resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
        severity: row.severity,
        message: row.message,
        notified: Boolean(row.notified),
      }));
    } catch (error) {
      console.error('Failed to get active alerts:', error);
      return [];
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: number): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      await db.execute(sql`
        UPDATE google_places_api_alerts
        SET resolved_at = NOW()
        WHERE id = ${alertId}
      `);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw error;
    }
  }

  /**
   * Get monitoring configuration
   */
  async getConfig(): Promise<MonitoringConfig> {
    // Return cached config if still valid
    if (
      this.config &&
      this.configLoadedAt &&
      Date.now() - this.configLoadedAt.getTime() < this.CONFIG_CACHE_TTL
    ) {
      return this.config;
    }

    try {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db.execute(sql`
        SELECT config_key, config_value
        FROM google_places_api_config
      `);

      const configMap = new Map<string, string>();
      for (const row of result.rows as any[]) {
        configMap.set(row.config_key, row.config_value);
      }

      this.config = {
        dailyRequestLimit: Number(configMap.get('daily_request_limit') || 10000),
        usageAlertThreshold: Number(configMap.get('usage_alert_threshold') || 0.8),
        errorRateThreshold: Number(configMap.get('error_rate_threshold') || 0.05),
        responseTimeThreshold: Number(configMap.get('response_time_threshold') || 3000),
        costAlertThreshold: Number(configMap.get('cost_alert_threshold') || 100),
        autocompleteCostPer1000: Number(configMap.get('autocomplete_cost_per_1000') || 2.83),
        placeDetailsCostPer1000: Number(configMap.get('place_details_cost_per_1000') || 17.0),
        geocodeCostPer1000: Number(configMap.get('geocode_cost_per_1000') || 5.0),
      };

      this.configLoadedAt = new Date();
      return this.config;
    } catch (error) {
      console.error('Failed to load monitoring config:', error);
      
      // Return default config
      return {
        dailyRequestLimit: 10000,
        usageAlertThreshold: 0.8,
        errorRateThreshold: 0.05,
        responseTimeThreshold: 3000,
        costAlertThreshold: 100,
        autocompleteCostPer1000: 2.83,
        placeDetailsCostPer1000: 17.0,
        geocodeCostPer1000: 5.0,
      };
    }
  }

  /**
   * Update monitoring configuration
   */
  async updateConfig(updates: Partial<MonitoringConfig>): Promise<void> {
    try {
      const configMap: Record<string, number> = {
        dailyRequestLimit: updates.dailyRequestLimit!,
        usageAlertThreshold: updates.usageAlertThreshold!,
        errorRateThreshold: updates.errorRateThreshold!,
        responseTimeThreshold: updates.responseTimeThreshold!,
        costAlertThreshold: updates.costAlertThreshold!,
        autocompleteCostPer1000: updates.autocompleteCostPer1000!,
        placeDetailsCostPer1000: updates.placeDetailsCostPer1000!,
        geocodeCostPer1000: updates.geocodeCostPer1000!,
      };

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      for (const [key, value] of Object.entries(configMap)) {
        if (value !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          await db.execute(sql`
            UPDATE google_places_api_config
            SET config_value = ${value.toString()}
            WHERE config_key = ${dbKey}
          `);
        }
      }

      // Clear cache to force reload
      this.config = null;
      this.configLoadedAt = null;
    } catch (error) {
      console.error('Failed to update monitoring config:', error);
      throw error;
    }
  }

  /**
   * Get historical data for charts
   */
  async getHistoricalData(days: number = 30): Promise<DailySummary[]> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const db = await getDb();
      if (!db) return [];

      const result = await db.execute(sql`
        SELECT * FROM google_places_api_daily_summary
        WHERE date >= ${startDate}
        ORDER BY date ASC
      `);

      return (result.rows as any[]).map(row => this.formatDailySummary(row));
    } catch (error) {
      console.error('Failed to get historical data:', error);
      return [];
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const googlePlacesApiMonitoring = new GooglePlacesApiMonitoringService();
