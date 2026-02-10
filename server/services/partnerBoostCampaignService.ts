/**
 * Partner Boost Campaign Service
 * Manages paid promotion campaigns for partner content in Explore
 *
 * BOOT-SAFE:
 * - Do NOT hard-import `topics` from drizzle/schema (it may not exist)
 * - Validate topic via dynamic import when available, else raw SQL fallback
 */

import { db } from '../db';
import { boostCampaigns, explorePartners, exploreContent } from '../../drizzle/schema';
import { eq, and, sql, lte } from 'drizzle-orm';
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
   * BOOT-SAFE topic existence check
   * 1) If schema exports `topics`, use it.
   * 2) Else try raw SQL against `topics` table.
   * 3) Else skip validation (log + allow) so boot never breaks.
   */
  private async topicExists(topicId: string): Promise<boolean> {
    // 1) Try schema export (dynamic)
    try {
      const schema: any = await import('../../drizzle/schema');
      const topicsTable = schema?.topics;

      if (topicsTable) {
        const row = await db.query.topics.findFirst({
          where: eq(topicsTable.id, topicId),
        });
        return !!row;
      }
    } catch {
      // ignore and fall back
    }

    // 2) Raw SQL fallback
    try {
      const r = await db.execute(sql`
        SELECT 1
        FROM topics
        WHERE id = ${topicId}
        LIMIT 1
      `);
      const row = (r as any).rows?.[0];
      return !!row;
    } catch (e: any) {
      console.warn(
        '[PartnerBoostCampaign] topicExists() skipped: topics table/export not available:',
        e?.message,
      );
      // 3) Boot-safe: do not block
      return true;
    }
  }

  /**
   * Create a new boost campaign
   */
  async createCampaign(data: BoostCampaignCreate): Promise<BoostCampaign> {
    // Validate topic exists (boot-safe)
    const okTopic = await this.topicExists(data.topicId);
    if (!okTopic) {
      throw new Error('Topic not found. Topic selection is required for boost campaigns.');
    }

    // Validate partner exists
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, data.partnerId),
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Validate content eligibility
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
    } as any);

    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign) {
      throw new Error('Failed to create campaign');
    }

    return campaign as BoostCampaign;
  }

  async activateCampaign(campaignId: string): Promise<void> {
    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign) throw new Error('Campaign not found');

    const spent = parseFloat(campaign.spent || '0');
    const budget = parseFloat(campaign.budget);

    if (spent >= budget) throw new Error('Cannot activate campaign: budget depleted');

    if (campaign.endDate) {
      const endDate = new Date(campaign.endDate);
      if (new Date() > endDate) throw new Error('Cannot activate campaign: campaign has expired');
    }

    await db
      .update(boostCampaigns)
      .set({ status: 'active' })
      .where(eq(boostCampaigns.id, campaignId));
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    await db
      .update(boostCampaigns)
      .set({ status: 'paused' })
      .where(eq(boostCampaigns.id, campaignId));
  }

  async recordImpression(campaignId: string): Promise<void> {
    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign || campaign.status !== 'active') return;

    const spent = parseFloat(campaign.spent || '0');
    const budget = parseFloat(campaign.budget);
    const costPerImpression = parseFloat(campaign.costPerImpression || '0.10');

    const newSpent = spent + costPerImpression;
    const newImpressions = (campaign.impressions || 0) + 1;
    const shouldDeplete = newSpent >= budget;

    await db
      .update(boostCampaigns)
      .set({
        impressions: newImpressions,
        spent: newSpent.toString(),
        status: shouldDeplete ? 'depleted' : 'active',
      })
      .where(eq(boostCampaigns.id, campaignId));
  }

  async recordClick(campaignId: string): Promise<void> {
    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign || campaign.status !== 'active') return;

    await db
      .update(boostCampaigns)
      .set({
        clicks: (campaign.clicks || 0) + 1,
      })
      .where(eq(boostCampaigns.id, campaignId));
  }

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

  async getCampaignAnalytics(campaignId: string): Promise<BoostAnalytics> {
    const campaign = await db.query.boostCampaigns.findFirst({
      where: eq(boostCampaigns.id, campaignId),
    });

    if (!campaign) throw new Error('Campaign not found');

    const spent = parseFloat(campaign.spent || '0');
    const budget = parseFloat(campaign.budget);
    const impressions = campaign.impressions || 0;
    const clicks = campaign.clicks || 0;
    const costPerImpression = parseFloat(campaign.costPerImpression || '0.10');

    const remainingBudget = budget - spent;
    const clickThroughRate = impressions > 0 ? (clicks / impressions) * 100 : 0;

    let daysRemaining = 0;
    if (campaign.endDate) {
      daysRemaining = Math.max(
        0,
        Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
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

  async validateBoostEligibility(contentId: string): Promise<ValidationResult> {
    const content = await db.query.exploreContent.findFirst({
      where: eq(exploreContent.id, parseInt(contentId, 10)),
    });

    // Boot-safe: explore_shorts may not exist
    let short: any = null;
    try {
      const r = await db.execute(sql`
        SELECT *
        FROM explore_shorts
        WHERE id = ${parseInt(contentId, 10)}
        LIMIT 1
      `);
      short = (r as any).rows?.[0] ?? null;
    } catch {
      short = null;
    }

    if (!content && !short) return { isValid: false, reason: 'Content not found' };

    const contentCategory = content?.contentCategory || short?.contentCategory;
    if (contentCategory === 'tertiary') {
      return {
        isValid: false,
        reason:
          'Tertiary content cannot be boosted. Only primary and secondary content can be boosted.',
      };
    }

    const existingBoost = await this.isContentBoosted(contentId);
    if (existingBoost.isBoosted) {
      return {
        isValid: false,
        reason: 'Content is already being boosted by an active campaign.',
      };
    }

    const partnerId = content?.partnerId || short?.partnerId;
    if (!partnerId) return { isValid: false, reason: 'Content must be associated with a partner' };

    return { isValid: true };
  }

  async isContentBoosted(
    contentId: string,
  ): Promise<{ isBoosted: boolean; campaignId?: string; partnerId?: string }> {
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
    return { isBoosted: false };
  }
}

export const partnerBoostCampaignService = new PartnerBoostCampaignService();
