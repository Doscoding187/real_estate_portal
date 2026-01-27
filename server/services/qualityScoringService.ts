/**
 * Quality Scoring Service
 *
 * Calculates and updates content quality scores based on multiple signals:
 * - Metadata completeness (20%)
 * - Engagement metrics (40%)
 * - Production quality (25%)
 * - Negative signals (15% penalty)
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.6
 */

import { db } from '../db';
import { eq, and, lt } from 'drizzle-orm';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface QualityScore {
  contentId: string;
  overallScore: number; // 0-100
  metadataScore: number; // Completeness of metadata
  engagementScore: number; // Watch time, saves, clicks
  productionScore: number; // Video/image quality
  negativeSignals: number; // Quick skips, reports
  lastCalculatedAt: Date;
}

export interface QualityWeights {
  metadata: number; // 0.20
  engagement: number; // 0.40
  production: number; // 0.25
  negativeSignals: number; // 0.15 (subtracted)
}

export interface EngagementData {
  watchTime?: number; // seconds
  totalDuration?: number; // seconds
  saves?: number;
  shares?: number;
  clickThroughs?: number;
  quickSkips?: number; // watched < 3 seconds
  reports?: number;
}

export interface ContentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  location?: string;
  thumbnailUrl?: string;
  category?: string;
}

// Default quality weights
const DEFAULT_WEIGHTS: QualityWeights = {
  metadata: 0.2,
  engagement: 0.4,
  production: 0.25,
  negativeSignals: 0.15,
};

// Quality thresholds
const LOW_QUALITY_THRESHOLD = 40.0;
const UNDERPERFORMANCE_THRESHOLD = 35.0;

// ============================================================================
// Quality Scoring Service
// ============================================================================

export class QualityScoringService {
  private weights: QualityWeights;

  constructor(weights: QualityWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Calculate initial quality score based on metadata completeness
   * Requirements: 11.1
   */
  async calculateInitialScore(contentId: string, metadata: ContentMetadata): Promise<number> {
    const metadataScore = this.calculateMetadataScore(metadata);

    // Initial score is based only on metadata (production score estimated at 50)
    const initialScore =
      metadataScore * this.weights.metadata +
      50 * this.weights.production +
      50 * this.weights.engagement;

    // Store in database
    await db.execute(
      `
      INSERT INTO content_quality_scores (
        content_id, 
        overall_score, 
        metadata_score, 
        engagement_score, 
        production_score,
        negative_signals,
        last_calculated_at
      ) VALUES (?, ?, ?, 50, 50, 0, NOW())
      ON DUPLICATE KEY UPDATE
        overall_score = VALUES(overall_score),
        metadata_score = VALUES(metadata_score),
        last_calculated_at = NOW()
    `,
      [contentId, initialScore, metadataScore],
    );

    return initialScore;
  }

  /**
   * Calculate metadata completeness score (0-100)
   */
  private calculateMetadataScore(metadata: ContentMetadata): number {
    let score = 0;
    let maxScore = 0;

    // Title (20 points)
    maxScore += 20;
    if (metadata.title && metadata.title.length >= 10) {
      score += 20;
    } else if (metadata.title && metadata.title.length >= 5) {
      score += 10;
    }

    // Description (25 points)
    maxScore += 25;
    if (metadata.description && metadata.description.length >= 100) {
      score += 25;
    } else if (metadata.description && metadata.description.length >= 50) {
      score += 15;
    } else if (metadata.description && metadata.description.length >= 20) {
      score += 8;
    }

    // Tags (20 points)
    maxScore += 20;
    if (metadata.tags && metadata.tags.length >= 5) {
      score += 20;
    } else if (metadata.tags && metadata.tags.length >= 3) {
      score += 12;
    } else if (metadata.tags && metadata.tags.length >= 1) {
      score += 6;
    }

    // Location (15 points)
    maxScore += 15;
    if (metadata.location) {
      score += 15;
    }

    // Thumbnail (10 points)
    maxScore += 10;
    if (metadata.thumbnailUrl) {
      score += 10;
    }

    // Category (10 points)
    maxScore += 10;
    if (metadata.category) {
      score += 10;
    }

    return (score / maxScore) * 100;
  }

  /**
   * Update quality score based on engagement data
   * Requirements: 11.2, 11.3
   */
  async updateScoreFromEngagement(contentId: string, engagement: EngagementData): Promise<void> {
    // Get current scores
    const current = await this.getQualityScore(contentId);
    if (!current) {
      throw new Error(`Quality score not found for content ${contentId}`);
    }

    // Calculate new engagement score
    const engagementScore = this.calculateEngagementScore(engagement);

    // Update engagement score (weighted average with existing)
    const newEngagementScore = current.engagementScore * 0.7 + engagementScore * 0.3;

    // Recalculate overall score
    const overallScore = this.calculateOverallScore(
      current.metadataScore,
      newEngagementScore,
      current.productionScore,
      current.negativeSignals,
    );

    // Update database
    await db.execute(
      `
      UPDATE content_quality_scores
      SET 
        overall_score = ?,
        engagement_score = ?,
        last_calculated_at = NOW()
      WHERE content_id = ?
    `,
      [overallScore, newEngagementScore, contentId],
    );
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(engagement: EngagementData): number {
    let score = 0;

    // Watch time completion rate (40 points)
    if (engagement.watchTime && engagement.totalDuration) {
      const completionRate = Math.min(engagement.watchTime / engagement.totalDuration, 1);
      score += completionRate * 40;
    }

    // Saves (30 points)
    if (engagement.saves) {
      score += Math.min(engagement.saves * 3, 30);
    }

    // Shares (20 points)
    if (engagement.shares) {
      score += Math.min(engagement.shares * 5, 20);
    }

    // Click-throughs (10 points)
    if (engagement.clickThroughs) {
      score += Math.min(engagement.clickThroughs * 2, 10);
    }

    return Math.min(score, 100);
  }

  /**
   * Record negative signal (quick skip or report)
   * Requirements: 11.3
   */
  async recordNegativeSignal(
    contentId: string,
    signalType: 'quick_skip' | 'report',
  ): Promise<void> {
    const current = await this.getQualityScore(contentId);
    if (!current) {
      throw new Error(`Quality score not found for content ${contentId}`);
    }

    // Increment negative signals
    const newNegativeSignals = current.negativeSignals + (signalType === 'report' ? 5 : 1);

    // Recalculate overall score
    const overallScore = this.calculateOverallScore(
      current.metadataScore,
      current.engagementScore,
      current.productionScore,
      newNegativeSignals,
    );

    // Update database
    await db.execute(
      `
      UPDATE content_quality_scores
      SET 
        overall_score = ?,
        negative_signals = ?,
        last_calculated_at = NOW()
      WHERE content_id = ?
    `,
      [overallScore, newNegativeSignals, contentId],
    );
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(
    metadataScore: number,
    engagementScore: number,
    productionScore: number,
    negativeSignals: number,
  ): number {
    const baseScore =
      metadataScore * this.weights.metadata +
      engagementScore * this.weights.engagement +
      productionScore * this.weights.production;

    // Apply negative signal penalty (each signal reduces score)
    const penalty = Math.min(negativeSignals * this.weights.negativeSignals * 10, 50);

    return Math.max(baseScore - penalty, 0);
  }

  /**
   * Get quality score for content
   */
  async getQualityScore(contentId: string): Promise<QualityScore | null> {
    const result = await db.execute(
      `
      SELECT 
        content_id as contentId,
        overall_score as overallScore,
        metadata_score as metadataScore,
        engagement_score as engagementScore,
        production_score as productionScore,
        negative_signals as negativeSignals,
        last_calculated_at as lastCalculatedAt
      FROM content_quality_scores
      WHERE content_id = ?
    `,
      [contentId],
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as QualityScore;
  }

  /**
   * Get underperforming content for a partner
   * Requirements: 11.6
   */
  async getUnderperformingContent(partnerId: string): Promise<string[]> {
    const result = await db.execute(
      `
      SELECT cqs.content_id
      FROM content_quality_scores cqs
      INNER JOIN explore_content ec ON cqs.content_id = ec.id
      WHERE ec.partner_id = ?
        AND cqs.overall_score < ?
      ORDER BY cqs.overall_score ASC
    `,
      [partnerId, UNDERPERFORMANCE_THRESHOLD],
    );

    return result.rows.map((row: any) => row.content_id);
  }

  /**
   * Notify partner of consistently underperforming content
   * Requirements: 11.6
   */
  async notifyPartnerOfLowQuality(partnerId: string, contentIds: string[]): Promise<void> {
    // In a real implementation, this would send an email or dashboard notification
    // For now, we'll log it
    console.log(
      `[Quality Alert] Partner ${partnerId} has ${contentIds.length} underperforming content pieces:`,
      contentIds,
    );

    // TODO: Integrate with notification service
    // await notificationService.send({
    //   partnerId,
    //   type: 'quality_alert',
    //   data: { contentIds }
    // });
  }

  /**
   * Get visibility multiplier based on quality score
   * Requirements: 11.4
   */
  getVisibilityMultiplier(qualityScore: number): number {
    if (qualityScore >= 70) {
      return 1.0; // Full visibility
    } else if (qualityScore >= 50) {
      return 0.8; // Slightly reduced
    } else if (qualityScore >= LOW_QUALITY_THRESHOLD) {
      return 0.5; // Significantly reduced
    } else {
      return 0.2; // Minimal visibility
    }
  }

  /**
   * Apply visibility reduction to content based on quality score
   * Requirements: 11.4
   *
   * This method applies the visibility multiplier to content's feed ranking.
   * Content with low quality scores will appear less frequently in feeds.
   */
  async applyVisibilityReduction(contentId: string): Promise<number> {
    const qualityScore = await this.getQualityScore(contentId);
    if (!qualityScore) {
      // If no quality score exists, return default multiplier
      return 1.0;
    }

    return this.getVisibilityMultiplier(qualityScore.overallScore);
  }

  /**
   * Batch update production scores (would be called by video processing service)
   */
  async updateProductionScore(contentId: string, productionScore: number): Promise<void> {
    const current = await this.getQualityScore(contentId);
    if (!current) {
      throw new Error(`Quality score not found for content ${contentId}`);
    }

    // Recalculate overall score
    const overallScore = this.calculateOverallScore(
      current.metadataScore,
      current.engagementScore,
      productionScore,
      current.negativeSignals,
    );

    // Update database
    await db.execute(
      `
      UPDATE content_quality_scores
      SET 
        overall_score = ?,
        production_score = ?,
        last_calculated_at = NOW()
      WHERE content_id = ?
    `,
      [overallScore, productionScore, contentId],
    );
  }
}

// Export singleton instance
export const qualityScoringService = new QualityScoringService();
