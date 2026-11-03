/**
 * Recommendation Engine Service
 * Intelligent personalization and content ranking (PARTIALLY STUBBED)
 *
 * NOTE: exploreEngagements and exploreBoostCampaigns are not exported from schema.
 * Boost injection functionality is disabled.
 */

import { db } from '../db';
import { exploreContent } from '../../drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';

interface UserContext {
  userId: number;
  sessionHistory?: number[];
}

interface UserProfile {
  userId: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  preferredPropertyTypes: string[];
  preferredLifestyleCategories: string[];
  followedCreators: number[];
}

class RecommendationEngineService {
  /**
   * Get user profile for personalization
   */
  async getUserProfile(userId: number): Promise<UserProfile> {
    // Stabilization stub: prefer a safe default profile until explore preferences schema is restored.
    return {
      userId,
      preferredPropertyTypes: [],
      preferredLifestyleCategories: [],
      followedCreators: [],
    };
  }

  /**
   * Get recommendations for a user
   */
  async getRecommendations(userId: number | null, limit: number = 10): Promise<any[]> {
    // Get recent content from the canonical Explore authority. Query failures
    // must reach the router so unavailable state cannot appear as success.
    return await db
      .select()
      .from(exploreContent)
      .where(eq(exploreContent.isActive, 1))
      .orderBy(desc(exploreContent.engagementScore), desc(exploreContent.createdAt))
      .limit(limit);
  }

  /**
   * Generate personalized feed
   * Requirements: 2.1, 2.6, 7.3, 7.4, 12.5
   */
  async generatePersonalizedFeed(context: UserContext, limit: number = 20): Promise<any[]> {
    const userProfile = await this.getUserProfile(context.userId);

    // Get candidate content
    let query = db.select().from(exploreContent).where(eq(exploreContent.isActive, 1));

    // Exclude session history
    if (context.sessionHistory && context.sessionHistory.length > 0) {
      query = query.where(sql`${exploreContent.id} NOT IN (${context.sessionHistory.join(',')})`);
    }

    // Order by engagement score and recency
    query = query.orderBy(desc(exploreContent.engagementScore), desc(exploreContent.createdAt));

    // Get more candidates than needed for scoring
    query = query.limit(limit * 3);

    const candidates = await query;

    // Score and rank candidates
    const scored = candidates.map(item => ({
      ...item,
      personalizedScore: this.calculatePersonalizedScore(item, userProfile),
    }));

    // Sort by personalized score
    scored.sort((a, b) => b.personalizedScore - a.personalizedScore);

    // Return top items
    return scored.slice(0, limit);
  }

  /**
   * Calculate personalized score for content
   * Requirements: 2.6
   */
  private calculatePersonalizedScore(
    content: any,
    profile: UserProfile,
  ): number {
    let score = 0;

    // Base engagement score (0-40 points)
    score += Math.min((content.engagementScore || 0) * 4, 40);

    // Price range match (0-20 points)
    if (profile.priceRangeMin && profile.priceRangeMax && content.priceMin && content.priceMax) {
      const priceOverlap = this.calculatePriceOverlap(
        profile.priceRangeMin,
        profile.priceRangeMax,
        content.priceMin,
        content.priceMax,
      );
      score += priceOverlap * 20;
    }

    // Lifestyle category match (0-15 points)
    if (content.lifestyleCategories && profile.preferredLifestyleCategories.length > 0) {
      const categoryMatch = content.lifestyleCategories.some((cat: string) =>
        profile.preferredLifestyleCategories.includes(cat),
      );
      if (categoryMatch) score += 15;
    }

    // Creator follow bonus (0-10 points)
    if (content.creatorId && profile.followedCreators.includes(content.creatorId)) {
      score += 10;
    }

    // Recency bonus (0-10 points)
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(content.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreation <= 7) {
      score += 10 * (1 - daysSinceCreation / 7);
    }

    return score;
  }

  /**
   * Calculate price range overlap (0-1)
   */
  private calculatePriceOverlap(
    userMin: number,
    userMax: number,
    contentMin: number,
    contentMax: number,
  ): number {
    const overlapMin = Math.max(userMin, contentMin);
    const overlapMax = Math.min(userMax, contentMax);

    if (overlapMin > overlapMax) return 0;

    const overlapRange = overlapMax - overlapMin;
    const userRange = userMax - userMin;

    return overlapRange / userRange;
  }

  /**
   * Inject boosted content into feed - STUBBED
   * exploreBoostCampaigns table not available
   */
  async injectBoostedContent(feed: any[], userProfile: UserProfile): Promise<any[]> {
    // STUB: No boost campaigns available, return feed as-is
    console.debug(
      '[RecommendationEngine] injectBoostedContent called but disabled (no exploreBoostCampaigns table)',
    );
    return feed.map(item => ({
      ...item,
      isSponsored: false,
    }));
  }
}

export const recommendationEngineService = new RecommendationEngineService();
