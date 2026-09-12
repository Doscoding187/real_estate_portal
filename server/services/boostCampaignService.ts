/**
 * Boost Campaign Service (STUBBED)
 *
 * Disabled: References exploreBoostCampaigns and exploreEngagements which are not exported from schema.
 * All methods return stub values until tables are properly added via migration.
 */

// import { db } from '../db';
// import { exploreBoostCampaigns, exploreContent, exploreEngagements } from '../../drizzle/schema';

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
  private unavailable(): never {
    throw new Error(
      'Boost campaigns are unavailable until a canonical campaign and billing authority is approved.',
    );
  }

  /**
   * Create a new boost campaign - STUBBED
   */
  async createBoostCampaign(
    creatorId: number,
    contentId: number,
    campaignName: string,
    config: BoostConfig,
  ): Promise<BoostCampaign> {
    console.debug(
      '[BoostCampaignService] createBoostCampaign called but disabled (no exploreBoostCampaigns table)',
    );
    throw new Error('Boost campaigns temporarily disabled');
  }

  /**
   * Get boost campaign analytics - STUBBED
   */
  async getBoostAnalytics(campaignId: number): Promise<BoostAnalytics> {
    void campaignId;
    return this.unavailable();
  }

  /**
   * Deactivate a boost campaign - STUBBED
   */
  async deactivateBoost(campaignId: number, creatorId: number): Promise<void> {
    void campaignId;
    void creatorId;
    return this.unavailable();
  }

  /**
   * Reactivate a paused boost campaign - STUBBED
   */
  async reactivateBoost(campaignId: number, creatorId: number): Promise<void> {
    void campaignId;
    void creatorId;
    return this.unavailable();
  }

  /**
   * Get all campaigns for a creator - STUBBED
   */
  async getCreatorCampaigns(creatorId: number): Promise<BoostCampaign[]> {
    void creatorId;
    return this.unavailable();
  }

  /**
   * Get active campaigns for content injection - STUBBED
   */
  async getActiveCampaigns(): Promise<BoostCampaign[]> {
    return this.unavailable();
  }

  /**
   * Record impression for a boosted content - STUBBED
   */
  async recordImpression(campaignId: number, cost: number = 0.01): Promise<void> {
    void campaignId;
    void cost;
    return this.unavailable();
  }

  /**
   * Record click for a boosted content - STUBBED
   */
  async recordClick(campaignId: number, cost: number = 0.1): Promise<void> {
    void campaignId;
    void cost;
    return this.unavailable();
  }

  /**
   * Record conversion for a boosted content - STUBBED
   */
  async recordConversion(campaignId: number): Promise<void> {
    void campaignId;
    return this.unavailable();
  }

  /**
   * Check and update expired campaigns - STUBBED
   */
  async updateExpiredCampaigns(): Promise<number> {
    return this.unavailable();
  }
}

export const boostCampaignService = new BoostCampaignService();
