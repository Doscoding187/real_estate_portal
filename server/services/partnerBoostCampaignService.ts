/**
 * Partner Boost Campaign Service
 * Manages paid promotion campaigns for partner content in Explore
 *
 * Requirements:
 * - 8.1: Require topic selection for targeting
 * - 8.2: Display "Sponsored" label on boosted content
 * - 8.3: Limit boosted content to 1 per 10 organic items
 * - 8.4: Track budget, spent, impressions, clicks
 * - 8.5: Auto-pause when budget depleted
 * - 8.6: Reject boosts that violate content hierarchy
 */

import { db } from '../db';
import {
  boostCampaigns,
  explorePartners,
  topics,
  exploreContent,
  exploreShorts,
} from '../../drizzle/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface BoostCampaignCreate {
  partnerId: string;
  contentId: string;
  topicId: string;
  budget: number;
  startDate: Date;
  endDate?: Date;
  costPerImpression?: number;
}

export interface BoostCampaign {
  id: string;
  partnerId: string;
  contentId: string;
  topicId: string;
  budget: number;
  spent: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'depleted';
  startDate: string;
  endDate: string | null;
  impressions: number;
  clicks: number;
  costPerImpression: number;
  createdAt: string;
}

export interface BoostAnalytics {
  campaignId: string;
  impressions: number;
  clicks: number;
  spent: number;
  budget: number;
  remainingBudget: number;
  costPerImpression: number;
  clickThroughRate: number;
  status: string;
  daysRemaining: number;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export class PartnerBoostCampaignService {
  /**
   * Create a new boost campaign
   * Requirement 8.1: Require topic selection for targeting
   * Requirement 8.4: Track budget, spent, impressions, clicks
   */
  async createCampaign(data: BoostCampaignCreate): Promise<BoostCampaign> {
    // Validate topic exists
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, data.topicId),
    });

    if (!topic) {
      throw new Error('Topic not found. Topic selection is required for boost campaigns.');
    }

    // Validate partner exists
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, data.partnerId),
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Validate content eligibility (Requirement 8.6)
    const eligibility = await this.validateBoostEligibility(data.contentId);
    if (!eligibility.isValid) {
      throw new Error(`Content not eligible for boost: ${eligibility.reason}`);
    }

    // Create campaign
    const campaignId = nanoid();
    await db.insert(boostCampaigns).values({
      id: campaignId,
      partnerId: data.partnerId,
      contentId: data.contentId,
      topicId: data.topicId,
      budget: data.budget.toString(),
      spent: '0',
      status: 'draft',
      startDate: data.startDate.toISOString(),
      endDate: data.endDate?.toISOString() || null,
      impressions: 0,
      clicks: 0,
      costPerImpression: (data.costPerImpression || 0.1).toString(),
    });

    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign) {
      throw new Error('Failed to create campaign');
    }

    return campaign as BoostCampaign;
  }

  /**
   * Activate a boost campaign
   * Requirement 8.5: Auto-pause when budget depleted
   */
  async activateCampaign(campaignId: string): Promise<void> {
    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Check if budget is already depleted
    const spent = parseFloat(campaign.spent || '0');
    const budget = parseFloat(campaign.budget);

    if (spent >= budget) {
      throw new Error('Cannot activate campaign: budget depleted');
    }

    // Check if campaign has expired
    if (campaign.endDate) {
      const endDate = new Date(campaign.endDate);
      const now = new Date();
      if (now > endDate) {
        throw new Error('Cannot activate campaign: campaign has expired');
      }
    }

    await db
      .update(boostCampaigns)
      .set({ status: 'active' })
      .where(eq(boostCampaigns.id, campaignId));
  }

  /**
   * Pause a boost campaign
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    await db
      .update(boostCampaigns)
      .set({ status: 'paused' })
      .where(eq(boostCampaigns.id, campaignId));
  }

  /**
   * Record impression for a boosted content
   * Requirement 8.4: Track impressions
   * Requirement 8.5: Auto-pause when budget depleted
   */
  async recordImpression(campaignId: string): Promise<void> {
    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign || campaign.status !== 'active') {
      return;
    }

    const spent = parseFloat(campaign.spent || '0');
    const budget = parseFloat(campaign.budget);
    const costPerImpression = parseFloat(campaign.costPerImpression || '0.10');
    const newSpent = spent + costPerImpression;
    const newImpressions = (campaign.impressions || 0) + 1;

    // Check if budget will be depleted
    const shouldDeplete = newSpent >= budget;

    await db
      .update(boostCampaigns)
      .set({
        impressions: newImpressions,
        spent: newSpent.toString(),
        status: shouldDeplete ? 'depleted' : 'active',
      })
      .where(eq(boostCampaigns.id, campaignId));

    // Log budget depletion
    if (shouldDeplete) {
      console.log(
        `[PartnerBoostCampaign] Campaign ${campaignId} budget depleted. Status set to 'depleted'.`,
      );
    }
  }

  /**
   * Record click for a boosted content
   * Requirement 8.4: Track clicks
   */
  async recordClick(campaignId: string): Promise<void> {
    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign || campaign.status !== 'active') {
      return;
    }

    const newClicks = (campaign.clicks || 0) + 1;

    await db
      .update(boostCampaigns)
      .set({
        clicks: newClicks,
      })
      .where(eq(boostCampaigns.id, campaignId));
  }

  /**
   * Get active campaigns for a specific topic
   * Used by feed generation to inject boosted content
   */
  async getActiveCampaignsForTopic(topicId: string): Promise<BoostCampaign[]> {
    const now = new Date().toISOString();

    const campaigns = await db.query.boostCampaigns.findMany({
      where: and(
        eq(boostCampaigns.topicId, topicId),
        eq(boostCampaigns.status, 'active'),
        lte(boostCampaigns.startDate, now),
        sql`(${boostCampaigns.endDate} IS NULL OR ${boostCampaigns.endDate} >= ${now})`,
      ),
    });

    return campaigns as BoostCampaign[];
  }

  /**
   * Get campaign analytics
   * Requirement 8.4: Provide real-time performance analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<BoostAnalytics> {
    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const spent = parseFloat(campaign.spent || '0');
    const budget = parseFloat(campaign.budget);
    const impressions = campaign.impressions || 0;
    const clicks = campaign.clicks || 0;
    const costPerImpression = parseFloat(campaign.costPerImpression || '0.10');

    // Calculate metrics
    const remainingBudget = budget - spent;
    const clickThroughRate = impressions > 0 ? (clicks / impressions) * 100 : 0;

    // Calculate days remaining
    let daysRemaining = 0;
    if (campaign.endDate) {
      const now = new Date();
      const endDate = new Date(campaign.endDate);
      daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );
    }

    return {
      campaignId: campaign.id,
      impressions,
      clicks,
      spent,
      budget,
      remainingBudget,
      costPerImpression,
      clickThroughRate,
      status: campaign.status || 'draft',
      daysRemaining,
    };
  }

  /**
   * Validate boost eligibility
   * Requirement 8.6: Reject boosts that violate content hierarchy
   */
  async validateBoostEligibility(contentId: string): Promise<ValidationResult> {
    // Check if content exists in explore_content
    const content = await db.query.exploreContent.findFirst({
      where: eq(exploreContent.id, parseInt(contentId)),
    });

    // Check if content exists in explore_shorts
    const short = await db.query.exploreShorts.findFirst({
      where: eq(exploreShorts.id, parseInt(contentId)),
    });

    if (!content && !short) {
      return {
        isValid: false,
        reason: 'Content not found',
      };
    }

    // Check content category - only allow primary and secondary content to be boosted
    // Requirement 8.6: Reject boosts that violate content hierarchy
    const contentCategory = content?.contentCategory || short?.contentCategory;

    if (contentCategory === 'tertiary') {
      return {
        isValid: false,
        reason:
          'Tertiary content (inspiration/trends) cannot be boosted to maintain content hierarchy. Only primary (properties) and secondary (services/education) content can be boosted.',
      };
    }

    // Check if content is already being boosted by an active campaign
    const existingBoost = await this.isContentBoosted(contentId);
    if (existingBoost.isBoosted) {
      return {
        isValid: false,
        reason:
          'Content is already being boosted by an active campaign. Only one active boost per content item is allowed.',
      };
    }

    // Additional validation: check if content has partner_id
    const partnerId = content?.partnerId || short?.partnerId;
    if (!partnerId) {
      return {
        isValid: false,
        reason: 'Content must be associated with a partner to be boosted',
      };
    }

    return {
      isValid: true,
    };
  }

  /**
   * Check budget depletion for a campaign
   * Used to determine if campaign should be auto-paused
   */
  async checkBudgetDepletion(campaignId: string): Promise<boolean> {
    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign) {
      return false;
    }

    const spent = parseFloat(campaign.spent || '0');
    const budget = parseFloat(campaign.budget);

    return spent >= budget;
  }

  /**
   * Get all campaigns for a partner
   */
  async getPartnerCampaigns(partnerId: string): Promise<BoostCampaign[]> {
    const campaigns = await db.query.boostCampaigns.findMany({
      where: eq(boostCampaigns.partnerId, partnerId),
    });

    return campaigns as BoostCampaign[];
  }

  /**
   * Update expired campaigns
   * Should be run periodically (e.g., via cron job)
   * Marks campaigns as 'completed' when end date is reached
   */
  async updateExpiredCampaigns(): Promise<number> {
    const now = new Date().toISOString();

    const result = await db
      .update(boostCampaigns)
      .set({ status: 'completed' })
      .where(
        and(
          eq(boostCampaigns.status, 'active'),
          sql`${boostCampaigns.endDate} IS NOT NULL AND ${boostCampaigns.endDate} < ${now}`,
        ),
      );

    return result[0]?.affectedRows || 0;
  }

  /**
   * Check and auto-pause depleted campaigns
   * Should be run periodically to ensure budget limits are enforced
   * Requirement 8.5: Auto-pause when budget depleted
   */
  async checkAndPauseDepletedCampaigns(): Promise<number> {
    // Find active campaigns where spent >= budget
    const campaigns = await db.query.boostCampaigns.findMany({
      where: eq(boostCampaigns.status, 'active'),
    });

    let pausedCount = 0;

    for (const campaign of campaigns) {
      const spent = parseFloat(campaign.spent || '0');
      const budget = parseFloat(campaign.budget);

      if (spent >= budget) {
        await db
          .update(boostCampaigns)
          .set({ status: 'depleted' })
          .where(eq(boostCampaigns.id, campaign.id));

        pausedCount++;
        console.log(
          `[PartnerBoostCampaign] Auto-paused campaign ${campaign.id} due to budget depletion`,
        );
      }
    }

    return pausedCount;
  }

  /**
   * Get budget status for a campaign
   * Returns detailed budget information
   */
  async getBudgetStatus(campaignId: string): Promise<{
    budget: number;
    spent: number;
    remaining: number;
    percentageUsed: number;
    isDepleted: boolean;
  }> {
    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const budget = parseFloat(campaign.budget);
    const spent = parseFloat(campaign.spent || '0');
    const remaining = Math.max(0, budget - spent);
    const percentageUsed = budget > 0 ? (spent / budget) * 100 : 0;
    const isDepleted = spent >= budget;

    return {
      budget,
      spent,
      remaining,
      percentageUsed,
      isDepleted,
    };
  }

  /**
   * Check if content is currently boosted
   * Requirement 8.2: Display "Sponsored" label on boosted content
   * Returns campaign info if content is actively boosted
   */
  async isContentBoosted(contentId: string): Promise<{
    isBoosted: boolean;
    campaignId?: string;
    partnerId?: string;
  }> {
    const now = new Date().toISOString();

    const activeCampaign = await db.query.boostCampaigns.findFirst({
      where: and(
        eq(boostCampaigns.contentId, contentId),
        eq(boostCampaigns.status, 'active'),
        lte(boostCampaigns.startDate, now),
        sql`(${boostCampaigns.endDate} IS NULL OR ${boostCampaigns.endDate} >= ${now})`,
      ),
    });

    if (activeCampaign) {
      return {
        isBoosted: true,
        campaignId: activeCampaign.id,
        partnerId: activeCampaign.partnerId,
      };
    }

    return {
      isBoosted: false,
    };
  }

  /**
   * Get sponsored label data for content
   * Requirement 8.2: Add "Sponsored" label to boosted content
   * Returns label configuration if content is boosted
   */
  async getSponsoredLabel(contentId: string): Promise<{
    showLabel: boolean;
    labelText: string;
    campaignId?: string;
  } | null> {
    const boostStatus = await this.isContentBoosted(contentId);

    if (!boostStatus.isBoosted) {
      return null;
    }

    return {
      showLabel: true,
      labelText: 'Sponsored',
      campaignId: boostStatus.campaignId,
    };
  }

  /**
   * Batch check if multiple content items are boosted
   * Optimized for feed generation
   */
  async getBoostedContentIds(contentIds: string[]): Promise<Set<string>> {
    if (contentIds.length === 0) {
      return new Set();
    }

    const now = new Date().toISOString();

    const activeCampaigns = await db.query.boostCampaigns.findMany({
      where: and(
        sql`${boostCampaigns.contentId} IN (${sql.join(
          contentIds.map(id => sql`${id}`),
          sql`, `,
        )})`,
        eq(boostCampaigns.status, 'active'),
        lte(boostCampaigns.startDate, now),
        sql`(${boostCampaigns.endDate} IS NULL OR ${boostCampaigns.endDate} >= ${now})`,
      ),
    });

    return new Set(activeCampaigns.map(c => c.contentId));
  }
}

export const partnerBoostCampaignService = new PartnerBoostCampaignService();
