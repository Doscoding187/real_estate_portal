/**
 * Feed Ranking Service
 * 
 * Implements the weighted ranking algorithm for feed generation with 5 factors:
 * - User Interest (35%)
 * - Content Quality (25%)
 * - Local Relevance (20%)
 * - Recency (10%)
 * - Partner Trust (10%)
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 8.3
 */

import { db } from "../db";
import { exploreContent, exploreShorts, explorePartners, boostCampaigns, contentQualityScores } from "../../drizzle/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface RankingWeights {
  userInterest: number;    // 0.35
  contentQuality: number;  // 0.25
  localRelevance: number;  // 0.20
  recency: number;         // 0.10
  partnerTrust: number;    // 0.10
}

export interface RankingFactors {
  userInterestScore: number;   // Based on user behavior signals (0-100)
  qualityScore: number;        // From QualityService (0-100)
  localRelevanceScore: number; // Distance/location match (0-100)
  recencyScore: number;        // Time decay function (0-100)
  trustScore: number;          // Partner trust score (0-100)
  boostMultiplier: number;     // 1.0 for organic, >1.0 for boosted
}

export interface RankedContent {
  id: number;
  contentId: string;
  rankingScore: number;
  isBoosted: boolean;
  boostCampaignId?: string;
  [key: string]: any;
}

export interface BoostCampaign {
  id: string;
  partnerId: string;
  contentId: string;
  topicId: string;
  budget: number;
  spent: number;
  status: string;
  impressions: number;
  clicks: number;
  costPerImpression: number;
}

// ============================================================================
// Configuration
// ============================================================================

// Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
const DEFAULT_WEIGHTS: RankingWeights = {
  userInterest: 0.35,
  contentQuality: 0.25,
  localRelevance: 0.20,
  recency: 0.10,
  partnerTrust: 0.10
};

// Boost multiplier configuration
// Requirements: 10.6
const BOOST_MULTIPLIER_RANGE = {
  min: 1.2,  // Minimum boost effect
  max: 2.0   // Maximum boost effect (prevents domination)
};

// Boost ratio limit: 1 boosted per 10 organic
// Requirements: 8.3
const BOOST_RATIO_LIMIT = 0.1; // 10%

// Recency decay configuration (exponential decay)
const RECENCY_DECAY_DAYS = 7; // Content loses 50% recency score after 7 days
const RECENCY_HALF_LIFE = 7;

// ============================================================================
// Feed Ranking Service
// ============================================================================

export class FeedRankingService {
  private weights: RankingWeights;

  constructor(weights?: Partial<RankingWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    
    // Validate weights sum to 1.0
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new Error(`Ranking weights must sum to 1.0, got ${sum}`);
    }
  }

  /**
   * Calculate ranking score with 5 weighted factors
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   */
  calculateRankingScore(factors: RankingFactors): number {
    // Normalize all scores to 0-1 range
    const normalizedFactors = {
      userInterest: factors.userInterestScore / 100,
      quality: factors.qualityScore / 100,
      localRelevance: factors.localRelevanceScore / 100,
      recency: factors.recencyScore / 100,
      trust: factors.trustScore / 100
    };

    // Calculate weighted sum
    const baseScore = 
      (normalizedFactors.userInterest * this.weights.userInterest) +
      (normalizedFactors.quality * this.weights.contentQuality) +
      (normalizedFactors.localRelevance * this.weights.localRelevance) +
      (normalizedFactors.recency * this.weights.recency) +
      (normalizedFactors.trust * this.weights.partnerTrust);

    // Apply boost multiplier if present
    // Requirements: 10.6
    const finalScore = baseScore * factors.boostMultiplier;

    // Return score in 0-100 range
    return Math.min(finalScore * 100, 100);
  }

  /**
   * Calculate recency score using exponential decay
   * Requirements: 10.4
   */
  calculateRecencyScore(createdAt: Date): number {
    const now = new Date();
    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: score = 100 * (0.5 ^ (age / half_life))
    const score = 100 * Math.pow(0.5, ageInDays / RECENCY_HALF_LIFE);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate local relevance score based on distance
   * Requirements: 10.3
   */
  calculateLocalRelevanceScore(
    userLocation?: { lat: number; lng: number },
    contentLocation?: { lat: number; lng: number }
  ): number {
    // If no location data, return neutral score
    if (!userLocation || !contentLocation) {
      return 50;
    }

    // Calculate distance using Haversine formula
    const distance = this.calculateDistance(
      userLocation.lat,
      userLocation.lng,
      contentLocation.lat,
      contentLocation.lng
    );

    // Score decreases with distance
    // 0-5km: 100 points
    // 5-20km: 80 points
    // 20-50km: 60 points
    // 50-100km: 40 points
    // 100+km: 20 points
    if (distance <= 5) return 100;
    if (distance <= 20) return 80;
    if (distance <= 50) return 60;
    if (distance <= 100) return 40;
    return 20;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Apply boost multiplier to ranking scores
   * Ensure boosted content doesn't dominate
   * Requirements: 10.6
   */
  applyBoostMultiplier(baseScore: number, boost?: BoostCampaign): number {
    if (!boost || boost.status !== 'active') {
      return 1.0; // No boost
    }

    // Calculate boost multiplier based on budget spent
    // Higher budget = higher multiplier, but capped
    const budgetFactor = Math.min(boost.budget / 1000, 1.0); // Normalize to 0-1
    const multiplier = BOOST_MULTIPLIER_RANGE.min + 
      (budgetFactor * (BOOST_MULTIPLIER_RANGE.max - BOOST_MULTIPLIER_RANGE.min));

    return multiplier;
  }

  /**
   * Rank feed items with weighted scoring
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
   */
  async rankFeedItems(
    items: any[],
    userId: string,
    userLocation?: { lat: number; lng: number },
    topicId?: string
  ): Promise<RankedContent[]> {
    if (items.length === 0) {
      return [];
    }

    // Get active boost campaigns for this topic
    const activeCampaigns = topicId 
      ? await this.getActiveCampaignsForTopic(topicId)
      : [];

    // Get quality scores for all content
    const contentIds = items.map(item => item.id.toString());
    const qualityScores = await this.getQualityScores(contentIds);

    // Get partner trust scores
    const partnerIds = items
      .filter(item => item.partnerId)
      .map(item => item.partnerId);
    const trustScores = await this.getPartnerTrustScores(partnerIds);

    // Get user interest scores (simplified - would use ML model in production)
    const userInterestScores = await this.getUserInterestScores(userId, items);

    // Calculate ranking score for each item
    const rankedItems: RankedContent[] = items.map(item => {
      const contentId = item.id.toString();
      const partnerId = item.partnerId;

      // Find boost campaign for this content
      const boostCampaign = activeCampaigns.find(c => c.contentId === contentId);

      // Build ranking factors
      const factors: RankingFactors = {
        userInterestScore: userInterestScores[contentId] || 50,
        qualityScore: qualityScores[contentId] || 50,
        localRelevanceScore: this.calculateLocalRelevanceScore(
          userLocation,
          item.location ? { lat: item.location.lat, lng: item.location.lng } : undefined
        ),
        recencyScore: this.calculateRecencyScore(new Date(item.createdAt)),
        trustScore: partnerId ? (trustScores[partnerId] || 50) : 50,
        boostMultiplier: this.applyBoostMultiplier(0, boostCampaign)
      };

      // Calculate final ranking score
      const rankingScore = this.calculateRankingScore(factors);

      return {
        ...item,
        contentId,
        rankingScore,
        isBoosted: !!boostCampaign,
        boostCampaignId: boostCampaign?.id
      };
    });

    // Sort by ranking score (descending)
    rankedItems.sort((a, b) => b.rankingScore - a.rankingScore);

    return rankedItems;
  }

  /**
   * Enforce boost ratio limit: max 1 boosted per 10 organic items
   * Requirements: 8.3
   */
  ensureBoostLimit(items: RankedContent[]): RankedContent[] {
    if (items.length === 0) {
      return items;
    }

    const result: RankedContent[] = [];
    let boostedCount = 0;
    let organicCount = 0;

    for (const item of items) {
      if (item.isBoosted) {
        // Check if we can add another boosted item
        const currentRatio = organicCount > 0 ? boostedCount / organicCount : 0;
        
        if (currentRatio < BOOST_RATIO_LIMIT || organicCount === 0) {
          // Can add boosted item
          result.push(item);
          boostedCount++;
        } else {
          // Skip this boosted item, convert to organic
          result.push({
            ...item,
            isBoosted: false,
            boostCampaignId: undefined,
            rankingScore: item.rankingScore / item.boostMultiplier // Remove boost effect
          });
          organicCount++;
        }
      } else {
        // Organic item, always add
        result.push(item);
        organicCount++;
      }
    }

    return result;
  }

  /**
   * Get active boost campaigns for a topic
   */
  private async getActiveCampaignsForTopic(topicId: string): Promise<BoostCampaign[]> {
    try {
      const campaigns = await db
        .select()
        .from(boostCampaigns)
        .where(
          and(
            eq(boostCampaigns.topicId, topicId),
            eq(boostCampaigns.status, 'active')
          )
        );

      return campaigns as BoostCampaign[];
    } catch (error) {
      console.error('Error fetching boost campaigns:', error);
      return [];
    }
  }

  /**
   * Get quality scores for content items
   */
  private async getQualityScores(contentIds: string[]): Promise<Record<string, number>> {
    if (contentIds.length === 0) {
      return {};
    }

    try {
      const scores = await db
        .select()
        .from(contentQualityScores)
        .where(inArray(contentQualityScores.contentId, contentIds));

      const scoreMap: Record<string, number> = {};
      for (const score of scores) {
        scoreMap[score.contentId] = Number(score.overallScore);
      }

      return scoreMap;
    } catch (error) {
      console.error('Error fetching quality scores:', error);
      return {};
    }
  }

  /**
   * Get partner trust scores
   */
  private async getPartnerTrustScores(partnerIds: string[]): Promise<Record<string, number>> {
    if (partnerIds.length === 0) {
      return {};
    }

    try {
      const partners = await db
        .select()
        .from(explorePartners)
        .where(inArray(explorePartners.id, partnerIds));

      const trustMap: Record<string, number> = {};
      for (const partner of partners) {
        trustMap[partner.id] = Number(partner.trustScore);
      }

      return trustMap;
    } catch (error) {
      console.error('Error fetching partner trust scores:', error);
      return {};
    }
  }

  /**
   * Get user interest scores (simplified implementation)
   * In production, this would use ML model based on user behavior
   * Requirements: 10.1
   */
  private async getUserInterestScores(
    userId: string,
    items: any[]
  ): Promise<Record<string, number>> {
    // Simplified implementation: return neutral scores
    // In production, this would:
    // 1. Fetch user's interaction history
    // 2. Analyze content preferences
    // 3. Use collaborative filtering
    // 4. Apply ML model for personalization
    
    const scores: Record<string, number> = {};
    for (const item of items) {
      scores[item.id.toString()] = 50; // Neutral score
    }

    return scores;
  }

  /**
   * Get current ranking weights
   */
  getWeights(): RankingWeights {
    return { ...this.weights };
  }

  /**
   * Validate that weights sum to 1.0
   */
  static validateWeights(weights: RankingWeights): boolean {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1.0) < 0.001;
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const feedRankingService = new FeedRankingService();
