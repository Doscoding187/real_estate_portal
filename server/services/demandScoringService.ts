/**
 * Demand Scoring Service (STUBBED)
 *
 * Disabled: References locationAnalyticsEvents which is not exported from schema.
 * This service will be re-enabled once the table is properly added via migration.
 */

// import { db } from '../db';
// import { developments, locationAnalyticsEvents } from '../../drizzle/schema';

/**
 * Service to calculate demand scores and identify hot-selling developments
 * Based on analytics data (views, inquiries) + recent activity
 *
 * STUBBED: Analytics table not available
 */
export class DemandScoringService {
  /**
   * Run a batch update of demand scores for all active developments
   * STUBBED: Returns immediately without doing anything
   */
  static async updateAllScores() {
    console.debug(
      '[DemandScoring] updateAllScores called but disabled (no locationAnalyticsEvents table)',
    );
    // No-op: Table not available
    return;
  }

  /**
   * Calculate score (0-100)
   * Formula: (Views * 0.5) + (Inquiries * 5.0)
   * Cap at 100
   */
  private static calculateScore(views: number, inquiries: number): number {
    const rawScore = views * 0.5 + inquiries * 5.0;
    return Math.min(Math.round(rawScore), 100);
  }
}
