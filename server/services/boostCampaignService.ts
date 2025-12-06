/**
 * Boost Campaign Service
 * Manages paid promotion campaigns for Explore content
 * Requirements: 9.1, 9.2, 9.4, 9.5
 */

import { db } from '../db';
import { 
  exploreBoostCampaigns, 
  exploreContent,
  exploreEngagements 
} from '../../drizzle/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export interface BoostConfig {
  duration: number; // days
  budget: number;
  targetAudience: {
    locations?: string[];
    priceRange?: { min: number; max: number };
    propertyTypes?: string[];
  };
}

export interface BoostCampaign {
  id: number;
  creatorId: number;
  contentId: number;
  campaignName: string;
  budget: number;
  spent: number;
  durationDays: number;
  startDate: Date;
  endDate: Date;
  targetAudience: any;
  status: 'active' | 'paused' | 'completed';
  impressions: number;
  clicks: number;
  conversions: number;
  costPerClick: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoostAnalytics {
  campaignId: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spent: number;
  budget: number;
  costPerClick: number;
  costPerImpression: number;
  clickThroughRate: number;
  conversionRate: number;
  remainingBudget: number;
  daysRemaining: number;
  status: string;
}

export class BoostCampaignService {
  /**
   * Create a new boost campaign
   * Requirement 9.1: Display boost options including duration, budget, and target audience
   */
  async createBoostCampaign(
    creatorId: number,
    contentId: number,
    campaignName: string,
    config: BoostConfig
  ): Promise<BoostCampaign> {
    // Verify content exists and belongs to creator
    const content = await db.query.exploreContent.findFirst({
      where: and(
        eq(exploreContent.id, contentId),
        eq(exploreContent.creatorId, creatorId)
      ),
    });

    if (!content) {
      throw new Error('Content not found or does not belong to creator');
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + config.duration);

    // Create campaign
    const [campaign] = await db.insert(exploreBoostCampaigns).values({
      creatorId,
      contentId,
      campaignName,
      budget: config.budget,
      spent: 0,
      durationDays: config.duration,
      startDate,
      endDate,
      targetAudience: config.targetAudience,
      status: 'active',
      impressions: 0,
      clicks: 0,
      conversions: 0,
      costPerClick: 0,
    }).returning();

    return campaign as BoostCampaign;
  }

  /**
   * Get boost campaign analytics
   * Requirement 9.4: Provide real-time analytics on impressions, engagement, and cost per interaction
   */
  async getBoostAnalytics(campaignId: number): Promise<BoostAnalytics> {
    const campaign = await db.query.exploreBoostCampaigns.findFirst({
      where: eq(exploreBoostCampaigns.id, campaignId),
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Calculate metrics
    const costPerClick = campaign.clicks > 0 ? campaign.spent / campaign.clicks : 0;
    const costPerImpression = campaign.impressions > 0 ? campaign.spent / campaign.impressions : 0;
    const clickThroughRate = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
    const conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;
    const remainingBudget = campaign.budget - campaign.spent;

    // Calculate days remaining
    const now = new Date();
    const endDate = new Date(campaign.endDate);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      campaignId: campaign.id,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      spent: campaign.spent,
      budget: campaign.budget,
      costPerClick,
      costPerImpression,
      clickThroughRate,
      conversionRate,
      remainingBudget,
      daysRemaining,
      status: campaign.status,
    };
  }

  /**
   * Deactivate a boost campaign
   */
  async deactivateBoost(campaignId: number, creatorId: number): Promise<void> {
    const campaign = await db.query.exploreBoostCampaigns.findFirst({
      where: and(
        eq(exploreBoostCampaigns.id, campaignId),
        eq(exploreBoostCampaigns.creatorId, creatorId)
      ),
    });

    if (!campaign) {
      throw new Error('Campaign not found or does not belong to creator');
    }

    await db.update(exploreBoostCampaigns)
      .set({ 
        status: 'paused',
        updatedAt: new Date()
      })
      .where(eq(exploreBoostCampaigns.id, campaignId));
  }

  /**
   * Reactivate a paused boost campaign
   */
  async reactivateBoost(campaignId: number, creatorId: number): Promise<void> {
    const campaign = await db.query.exploreBoostCampaigns.findFirst({
      where: and(
        eq(exploreBoostCampaigns.id, campaignId),
        eq(exploreBoostCampaigns.creatorId, creatorId)
      ),
    });

    if (!campaign) {
      throw new Error('Campaign not found or does not belong to creator');
    }

    // Check if budget is depleted
    if (campaign.spent >= campaign.budget) {
      throw new Error('Cannot reactivate campaign: budget depleted');
    }

    // Check if campaign has expired
    const now = new Date();
    const endDate = new Date(campaign.endDate);
    if (now > endDate) {
      throw new Error('Cannot reactivate campaign: campaign has expired');
    }

    await db.update(exploreBoostCampaigns)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(exploreBoostCampaigns.id, campaignId));
  }

  /**
   * Get all campaigns for a creator
   */
  async getCreatorCampaigns(creatorId: number): Promise<BoostCampaign[]> {
    const campaigns = await db.query.exploreBoostCampaigns.findMany({
      where: eq(exploreBoostCampaigns.creatorId, creatorId),
      orderBy: (campaigns, { desc }) => [desc(campaigns.createdAt)],
    });

    return campaigns as BoostCampaign[];
  }

  /**
   * Get active campaigns for content injection
   * Requirement 9.2: Increase content's appearance frequency in relevant user feeds
   */
  async getActiveCampaigns(): Promise<BoostCampaign[]> {
    const now = new Date();
    
    const campaigns = await db.query.exploreBoostCampaigns.findMany({
      where: and(
        eq(exploreBoostCampaigns.status, 'active'),
        lte(exploreBoostCampaigns.startDate, now),
        gte(exploreBoostCampaigns.endDate, now),
        sql`${exploreBoostCampaigns.spent} < ${exploreBoostCampaigns.budget}`
      ),
    });

    return campaigns as BoostCampaign[];
  }

  /**
   * Record impression for a boosted content
   * Updates campaign metrics and checks budget
   * Requirement 9.5: Auto-stop when budget depleted
   */
  async recordImpression(campaignId: number, cost: number = 0.01): Promise<void> {
    const campaign = await db.query.exploreBoostCampaigns.findFirst({
      where: eq(exploreBoostCampaigns.id, campaignId),
    });

    if (!campaign) {
      return;
    }

    const newSpent = campaign.spent + cost;
    const newImpressions = campaign.impressions + 1;

    // Check if budget will be depleted
    const shouldPause = newSpent >= campaign.budget;

    await db.update(exploreBoostCampaigns)
      .set({
        impressions: newImpressions,
        spent: newSpent,
        status: shouldPause ? 'completed' : campaign.status,
        updatedAt: new Date(),
      })
      .where(eq(exploreBoostCampaigns.id, campaignId));

    // TODO: Send notification to creator if budget depleted
    if (shouldPause) {
      console.log(`Campaign ${campaignId} budget depleted. Pausing campaign.`);
    }
  }

  /**
   * Record click for a boosted content
   */
  async recordClick(campaignId: number, cost: number = 0.10): Promise<void> {
    const campaign = await db.query.exploreBoostCampaigns.findFirst({
      where: eq(exploreBoostCampaigns.id, campaignId),
    });

    if (!campaign) {
      return;
    }

    const newSpent = campaign.spent + cost;
    const newClicks = campaign.clicks + 1;
    const newCostPerClick = newSpent / newClicks;

    // Check if budget will be depleted
    const shouldPause = newSpent >= campaign.budget;

    await db.update(exploreBoostCampaigns)
      .set({
        clicks: newClicks,
        spent: newSpent,
        costPerClick: newCostPerClick,
        status: shouldPause ? 'completed' : campaign.status,
        updatedAt: new Date(),
      })
      .where(eq(exploreBoostCampaigns.id, campaignId));

    if (shouldPause) {
      console.log(`Campaign ${campaignId} budget depleted. Pausing campaign.`);
    }
  }

  /**
   * Record conversion for a boosted content
   */
  async recordConversion(campaignId: number): Promise<void> {
    await db.update(exploreBoostCampaigns)
      .set({
        conversions: sql`${exploreBoostCampaigns.conversions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(exploreBoostCampaigns.id, campaignId));
  }

  /**
   * Check and update expired campaigns
   * Should be run periodically (e.g., via cron job)
   */
  async updateExpiredCampaigns(): Promise<number> {
    const now = new Date();
    
    const result = await db.update(exploreBoostCampaigns)
      .set({ 
        status: 'completed',
        updatedAt: now
      })
      .where(and(
        eq(exploreBoostCampaigns.status, 'active'),
        lte(exploreBoostCampaigns.endDate, now)
      ));

    return result.rowsAffected || 0;
  }
}

export const boostCampaignService = new BoostCampaignService();
