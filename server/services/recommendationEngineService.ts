/**
 * Recommendation Engine Service
 * Handles personalized content recommendations based on user behavior and preferences
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.3, 7.4
 */

import { db } from '../db';
import {
  exploreContent,
  exploreDiscoveryVideos,
  exploreUserPreferencesNew,
  exploreEngagements,
  exploreFeedSessions,
  properties,
  developments,
} from '../../drizzle/schema';
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm';

export interface UserContext {
  userId: number;
  location?: { lat: number; lng: number };
  sessionHistory: number[]; // Content IDs viewed in this session
  activeFilters?: FilterSet;
  deviceInfo?: DeviceInfo;
}

export interface FilterSet {
  propertyTypes?: string[];
  priceRange?: { min: number; max: number };
  lifestyleCategories?: string[];
  locations?: string[];
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os?: string;
  browser?: string;
}

export interface EngagementSignal {
  contentId: number;
  engagementType: 'view' | 'save' | 'share' | 'click' | 'skip' | 'complete';
  watchTime?: number; // seconds
  completed?: boolean;
  timestamp: Date;
}

export interface UserProfile {
  userId: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  preferredLocations: string[];
  preferredPropertyTypes: string[];
  preferredLifestyleCategories: string[];
  followedNeighbourhoods: number[];
  followedCreators: number[];
  engagementHistory: EngagementSignal[];
  lastActive: Date;
}

export interface RecommendedContent {
  id: number;
  contentType: string;
  title: string;
  thumbnailUrl: string;
  videoUrl?: string;
  score: number; // Recommendation score
  reason: string; // Why this was recommended
}

/**
 * Record engagement signal
 * Requirements 2.3, 2.4: Track completion and skip signals
 */
export async function recordEngagement(
  userId: number,
  contentId: number,
  engagement: EngagementSignal,
  sessionId?: number,
): Promise<void> {
  try {
    // Record engagement in database
    await db.insert(exploreEngagements).values({
      userId,
      contentId,
      engagementType: engagement.engagementType,
      watchTime: engagement.watchTime || null,
      completed: engagement.completed || false,
      sessionId: sessionId || null,
    });

    console.log(`[RecommendationEngine] Recorded ${engagement.engagementType} for user ${userId}, content ${contentId}`);

    // Update user profile asynchronously
    updateUserProfileFromEngagement(userId, contentId, engagement).catch((error) => {
      console.error('[RecommendationEngine] Failed to update user profile:', error);
    });
  } catch (error: any) {
    console.error('[RecommendationEngine] Failed to record engagement:', error);
    throw new Error(`Failed to record engagement: ${error.message}`);
  }
}

/**
 * Update user profile based on engagement
 * Requirements 2.1, 2.2, 2.5: Learn from price range, neighbourhood, and property type interactions
 */
async function updateUserProfileFromEngagement(
  userId: number,
  contentId: number,
  engagement: EngagementSignal,
): Promise<void> {
  try {
    // Get content details
    const content = await db
      .select()
      .from(exploreContent)
      .where(eq(exploreContent.id, contentId))
      .limit(1);

    if (!content[0]) {
      console.warn(`[RecommendationEngine] Content ${contentId} not found`);
      return;
    }

    const contentData = content[0];

    // Get or create user preferences
    let userPrefs = await db
      .select()
      .from(exploreUserPreferencesNew)
      .where(eq(exploreUserPreferencesNew.userId, userId))
      .limit(1);

    if (!userPrefs[0]) {
      // Create new preferences
      await db.insert(exploreUserPreferencesNew).values({
        userId,
        priceRangeMin: null,
        priceRangeMax: null,
        preferredLocations: JSON.stringify([]),
        preferredPropertyTypes: JSON.stringify([]),
        preferredLifestyleCategories: JSON.stringify([]),
        followedNeighbourhoods: JSON.stringify([]),
        followedCreators: JSON.stringify([]),
        engagementHistory: JSON.stringify([]),
        lastActive: new Date(),
      });

      userPrefs = await db
        .select()
        .from(exploreUserPreferencesNew)
        .where(eq(exploreUserPreferencesNew.userId, userId))
        .limit(1);
    }

    const prefs = userPrefs[0];

    // Parse existing preferences
    const preferredLocations = JSON.parse(prefs.preferredLocations as string || '[]') as string[];
    const preferredPropertyTypes = JSON.parse(prefs.preferredPropertyTypes as string || '[]') as string[];
    const preferredCategories = JSON.parse(prefs.preferredLifestyleCategories as string || '[]') as string[];
    const engagementHistory = JSON.parse(prefs.engagementHistory as string || '[]') as EngagementSignal[];

    // Update based on engagement type
    if (engagement.engagementType === 'complete' || engagement.engagementType === 'save') {
      // Positive signals - learn preferences

      // Requirement 2.1: Learn price range
      if (contentData.priceMin && contentData.priceMax) {
        const currentMin = prefs.priceRangeMin || contentData.priceMin;
        const currentMax = prefs.priceRangeMax || contentData.priceMax;

        // Adjust price range to include this content
        const newMin = Math.min(currentMin, contentData.priceMin);
        const newMax = Math.max(currentMax, contentData.priceMax);

        await db
          .update(exploreUserPreferencesNew)
          .set({
            priceRangeMin: newMin,
            priceRangeMax: newMax,
          })
          .where(eq(exploreUserPreferencesNew.userId, userId));
      }

      // Requirement 2.5: Learn property type preferences
      if (contentData.metadata) {
        const metadata = JSON.parse(contentData.metadata as string || '{}');
        if (metadata.propertyType && !preferredPropertyTypes.includes(metadata.propertyType)) {
          preferredPropertyTypes.push(metadata.propertyType);
        }
      }

      // Learn lifestyle categories
      if (contentData.lifestyleCategories) {
        const categories = JSON.parse(contentData.lifestyleCategories as string || '[]') as string[];
        for (const category of categories) {
          if (!preferredCategories.includes(category)) {
            preferredCategories.push(category);
          }
        }
      }
    }

    // Add to engagement history (keep last 100)
    engagementHistory.unshift(engagement);
    if (engagementHistory.length > 100) {
      engagementHistory.pop();
    }

    // Update preferences
    await db
      .update(exploreUserPreferencesNew)
      .set({
        preferredPropertyTypes: JSON.stringify(preferredPropertyTypes),
        preferredLifestyleCategories: JSON.stringify(preferredCategories),
        engagementHistory: JSON.stringify(engagementHistory),
        lastActive: new Date(),
      })
      .where(eq(exploreUserPreferencesNew.userId, userId));

    console.log(`[RecommendationEngine] Updated user profile for user ${userId}`);
  } catch (error: any) {
    console.error('[RecommendationEngine] Failed to update user profile:', error);
    throw error;
  }
}

/**
 * Get user profile
 * Requirements 2.6: Consider user location, budget signals, property type preferences, and watch time patterns
 */
export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  try {
    const prefs = await db
      .select()
      .from(exploreUserPreferencesNew)
      .where(eq(exploreUserPreferencesNew.userId, userId))
      .limit(1);

    if (!prefs[0]) {
      return null;
    }

    const pref = prefs[0];

    return {
      userId,
      priceRangeMin: pref.priceRangeMin || undefined,
      priceRangeMax: pref.priceRangeMax || undefined,
      preferredLocations: JSON.parse(pref.preferredLocations as string || '[]'),
      preferredPropertyTypes: JSON.parse(pref.preferredPropertyTypes as string || '[]'),
      preferredLifestyleCategories: JSON.parse(pref.preferredLifestyleCategories as string || '[]'),
      followedNeighbourhoods: JSON.parse(pref.followedNeighbourhoods as string || '[]'),
      followedCreators: JSON.parse(pref.followedCreators as string || '[]'),
      engagementHistory: JSON.parse(pref.engagementHistory as string || '[]'),
      lastActive: pref.lastActive || new Date(),
    };
  } catch (error: any) {
    console.error('[RecommendationEngine] Failed to get user profile:', error);
    return null;
  }
}

/**
 * Calculate preference score for content
 * Requirements 2.6: Multi-factor recommendation
 */
function calculatePreferenceScore(
  content: any,
  userProfile: UserProfile,
  context: UserContext,
): number {
  let score = 0;

  // Price range match (0-30 points)
  if (userProfile.priceRangeMin && userProfile.priceRangeMax && content.priceMin && content.priceMax) {
    const userMidpoint = (userProfile.priceRangeMin + userProfile.priceRangeMax) / 2;
    const contentMidpoint = (content.priceMin + content.priceMax) / 2;
    const priceRange = userProfile.priceRangeMax - userProfile.priceRangeMin;

    if (priceRange > 0) {
      const priceDiff = Math.abs(userMidpoint - contentMidpoint);
      const priceScore = Math.max(0, 30 - (priceDiff / priceRange) * 30);
      score += priceScore;
    }
  }

  // Lifestyle category match (0-25 points)
  if (content.lifestyleCategories) {
    const contentCategories = JSON.parse(content.lifestyleCategories || '[]') as string[];
    const matchingCategories = contentCategories.filter((cat: string) =>
      userProfile.preferredLifestyleCategories.includes(cat),
    );
    score += (matchingCategories.length / Math.max(contentCategories.length, 1)) * 25;
  }

  // Property type match (0-20 points)
  if (content.metadata) {
    const metadata = JSON.parse(content.metadata || '{}');
    if (metadata.propertyType && userProfile.preferredPropertyTypes.includes(metadata.propertyType)) {
      score += 20;
    }
  }

  // Creator follow bonus (0-15 points)
  if (content.creatorId && userProfile.followedCreators.includes(content.creatorId)) {
    score += 15;
  }

  // Recency bonus (0-10 points) - Requirement 7.3
  const ageInDays = (Date.now() - new Date(content.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays <= 7) {
    score += 10 * (1 - ageInDays / 7);
  }

  return score;
}

/**
 * Generate personalized feed
 * Requirements 2.1, 2.6, 7.3, 7.4: Personalized recommendations with recency and multi-factor scoring
 */
export async function generatePersonalizedFeed(
  context: UserContext,
  limit: number = 20,
): Promise<RecommendedContent[]> {
  try {
    console.log(`[RecommendationEngine] Generating personalized feed for user ${context.userId}`);

    // Get user profile
    const userProfile = await getUserProfile(context.userId);

    // Get candidate content (active, not in session history)
    let query = db
      .select()
      .from(exploreContent)
      .where(eq(exploreContent.isActive, 1));

    // Exclude already viewed in this session
    if (context.sessionHistory.length > 0) {
      query = query.where(sql`${exploreContent.id} NOT IN (${context.sessionHistory.join(',')})`);
    }

    const candidates = await query.limit(100); // Get more candidates for ranking

    // Score and rank content
    const scoredContent = candidates.map((content: any) => {
      const score = userProfile
        ? calculatePreferenceScore(content, userProfile, context)
        : content.engagementScore || 0;

      return {
        id: content.id,
        contentType: content.contentType,
        title: content.title || '',
        thumbnailUrl: content.thumbnailUrl || '',
        videoUrl: content.videoUrl || undefined,
        score,
        reason: userProfile ? 'Based on your preferences' : 'Popular content',
      };
    });

    // Sort by score and return top results
    scoredContent.sort((a: any, b: any) => b.score - a.score);

    const recommendations = scoredContent.slice(0, limit);

    console.log(`[RecommendationEngine] Generated ${recommendations.length} recommendations`);

    return recommendations;
  } catch (error: any) {
    console.error('[RecommendationEngine] Failed to generate personalized feed:', error);
    throw new Error(`Failed to generate personalized feed: ${error.message}`);
  }
}

/**
 * Create or update feed session
 * Requirements 2.6: Track session duration and interactions
 */
export async function createFeedSession(
  userId: number,
  deviceType?: string,
): Promise<number> {
  try {
    const result = await db.insert(exploreFeedSessions).values({
      userId,
      sessionStart: new Date(),
      sessionEnd: null,
      totalDuration: null,
      videosViewed: 0,
      videosCompleted: 0,
      propertiesSaved: 0,
      clickThroughs: 0,
      deviceType: deviceType || null,
      sessionData: JSON.stringify({}),
    });

    const sessionId = Number(result.insertId);

    console.log(`[RecommendationEngine] Created feed session ${sessionId} for user ${userId}`);

    return sessionId;
  } catch (error: any) {
    console.error('[RecommendationEngine] Failed to create feed session:', error);
    throw new Error(`Failed to create feed session: ${error.message}`);
  }
}

/**
 * Close feed session
 */
export async function closeFeedSession(sessionId: number): Promise<void> {
  try {
    const session = await db
      .select()
      .from(exploreFeedSessions)
      .where(eq(exploreFeedSessions.id, sessionId))
      .limit(1);

    if (!session[0]) {
      console.warn(`[RecommendationEngine] Session ${sessionId} not found`);
      return;
    }

    const sessionStart = new Date(session[0].sessionStart);
    const sessionEnd = new Date();
    const duration = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000); // seconds

    await db
      .update(exploreFeedSessions)
      .set({
        sessionEnd,
        totalDuration: duration,
      })
      .where(eq(exploreFeedSessions.id, sessionId));

    console.log(`[RecommendationEngine] Closed feed session ${sessionId}, duration: ${duration}s`);
  } catch (error: any) {
    console.error('[RecommendationEngine] Failed to close feed session:', error);
    throw new Error(`Failed to close feed session: ${error.message}`);
  }
}

  /**
   * Inject boosted content into feed
   * Requirement 9.2: Increase content's appearance frequency in relevant user feeds
   * Requirement 9.3: Display "Sponsored" label
   * Requirement 9.6: Limit sponsored items to 1 per every 10 organic items
   */
  async injectBoostedContent(
    feed: any[],
    userProfile: UserProfile
  ): Promise<any[]> {
    // Import boost service dynamically to avoid circular dependency
    const { boostCampaignService } = await import('./boostCampaignService');
    
    // Get active campaigns
    const activeCampaigns = await boostCampaignService.getActiveCampaigns();
    
    if (activeCampaigns.length === 0) {
      return feed;
    }

    // Filter campaigns based on user profile and targeting
    const relevantCampaigns = activeCampaigns.filter((campaign) => {
      const targeting = campaign.targetAudience || {};
      
      // Check price range targeting
      if (targeting.priceRange && userProfile.priceRangeMin && userProfile.priceRangeMax) {
        const userAvgPrice = (userProfile.priceRangeMin + userProfile.priceRangeMax) / 2;
        if (userAvgPrice < targeting.priceRange.min || userAvgPrice > targeting.priceRange.max) {
          return false;
        }
      }

      // Check property type targeting
      if (targeting.propertyTypes && targeting.propertyTypes.length > 0) {
        if (!userProfile.preferredPropertyTypes || userProfile.preferredPropertyTypes.length === 0) {
          return true; // Include if user has no preferences
        }
        const hasMatch = targeting.propertyTypes.some((type: string) =>
          userProfile.preferredPropertyTypes?.includes(type)
        );
        if (!hasMatch) {
          return false;
        }
      }

      return true;
    });

    if (relevantCampaigns.length === 0) {
      return feed;
    }

    // Get content for relevant campaigns
    const campaignContentIds = relevantCampaigns.map((c) => c.contentId);
    const boostedContent = await db.query.exploreContent.findMany({
      where: inArray(exploreContent.id, campaignContentIds),
      with: {
        videos: true,
      },
    });

    // Create a map of content ID to campaign ID for tracking
    const contentToCampaignMap = new Map();
    relevantCampaigns.forEach((campaign) => {
      contentToCampaignMap.set(campaign.contentId, campaign.id);
    });

    // Inject boosted content at 1:10 ratio (every 10th item)
    const result = [];
    let organicCount = 0;
    let boostedIndex = 0;

    for (let i = 0; i < feed.length; i++) {
      result.push(feed[i]);
      organicCount++;

      // Every 10 organic items, inject a boosted item
      if (organicCount === 10 && boostedIndex < boostedContent.length) {
        const boosted = boostedContent[boostedIndex];
        const campaignId = contentToCampaignMap.get(boosted.id);
        
        // Mark as sponsored and add campaign ID for tracking
        result.push({
          ...boosted,
          isSponsored: true,
          sponsoredLabel: 'Sponsored',
          campaignId,
        });

        boostedIndex++;
        organicCount = 0; // Reset counter
      }
    }

    return result;
  }
}

export const recommendationEngineService = new RecommendationEngineService();
