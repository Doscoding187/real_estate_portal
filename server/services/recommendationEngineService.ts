/**
 * Recommendation Engine Service
 * Intelligent personalization and content ranking (PARTIALLY STUBBED)
 *
 * NOTE: exploreEngagements and exploreBoostCampaigns are not exported from schema.
 * Boost injection functionality is disabled.
 */

import { db } from '../db';
import { exploreContent, exploreUserPreferencesNew } from '../../drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';

interface UserContext {
  userId: number;
  sessionHistory?: number[];
  location?: { lat: number; lng: number };
}

interface UserProfile {
  userId: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  preferredLocations: string[];
  preferredPropertyTypes: string[];
  preferredLifestyleCategories: string[];
  followedNeighbourhoods: number[];
  followedCreators: number[];
}

class RecommendationEngineService {
  /**
   * Get user profile for personalization
   */
  async getUserProfile(userId: number): Promise<UserProfile> {
    const profile = await db
      .select()
      .from(exploreUserPreferencesNew)
      .where(eq(exploreUserPreferencesNew.userId, userId))
      .limit(1);

    if (!profile[0]) {
      // Return default profile
      return {
        userId,
        preferredLocations: [],
        preferredPropertyTypes: [],
        preferredLifestyleCategories: [],
        followedNeighbourhoods: [],
        followedCreators: [],
      };
    }

    return {
      userId,
      priceRangeMin: profile[0].priceRangeMin || undefined,
      priceRangeMax: profile[0].priceRangeMax || undefined,
      preferredLocations: profile[0].preferredLocations || [],
      preferredPropertyTypes: profile[0].preferredPropertyTypes || [],
      preferredLifestyleCategories: profile[0].preferredLifestyleCategories || [],
      followedNeighbourhoods: profile[0].followedNeighbourhoods || [],
      followedCreators: profile[0].followedCreators || [],
    };
  }

  /**
   * Get recommendations for a user
   */
  async getRecommendations(userId: number | null, limit: number = 10): Promise<any[]> {
    try {
      // Get recent content
      const content = await db
        .select()
        .from(exploreContent)
        .where(eq(exploreContent.isActive, 1))
        .orderBy(desc(exploreContent.engagementScore), desc(exploreContent.createdAt))
        .limit(limit);

      return content;
    } catch (error) {
      console.error('[RecommendationEngine] getRecommendations error:', error);
      return [];
    }
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
      personalizedScore: this.calculatePersonalizedScore(item, userProfile, context),
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
    context: UserContext,
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

    // Location proximity bonus (0-5 points)
    if (context.location && content.locationLat && content.locationLng) {
      const distance = this.calculateDistance(
        context.location.lat,
        context.location.lng,
        content.locationLat,
        content.locationLng,
      );
      if (distance < 50) {
        // Within 50km
        score += 5 * (1 - distance / 50);
      }
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
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
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
