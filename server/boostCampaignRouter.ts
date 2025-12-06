/**
 * Boost Campaign Router
 * tRPC endpoints for managing boost campaigns
 * Requirements: 9.1, 9.2, 9.4, 9.5
 */

import { z } from 'zod';
import { router, protectedProcedure } from './trpc';
import { boostCampaignService } from './services/boostCampaignService';

const targetAudienceSchema = z.object({
  locations: z.array(z.string()).optional(),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  propertyTypes: z.array(z.string()).optional(),
});

const boostConfigSchema = z.object({
  duration: z.number().min(1).max(90), // 1-90 days
  budget: z.number().min(10).max(100000), // R10 - R100,000
  targetAudience: targetAudienceSchema,
});

export const boostCampaignRouter = router({
  /**
   * Create a new boost campaign
   * Requirement 9.1: Display boost options including duration, budget, and target audience
   */
  createCampaign: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      campaignName: z.string().min(1).max(255),
      config: boostConfigSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await boostCampaignService.createBoostCampaign(
        ctx.user.id,
        input.contentId,
        input.campaignName,
        input.config
      );

      return {
        success: true,
        campaign,
      };
    }),

  /**
   * Get campaign analytics
   * Requirement 9.4: Provide real-time analytics on impressions, engagement, and cost per interaction
   */
  getCampaignAnalytics: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
    }))
    .query(async ({ input }) => {
      const analytics = await boostCampaignService.getBoostAnalytics(input.campaignId);
      return analytics;
    }),

  /**
   * Get all campaigns for the authenticated creator
   */
  getMyCampaigns: protectedProcedure
    .query(async ({ ctx }) => {
      const campaigns = await boostCampaignService.getCreatorCampaigns(ctx.user.id);
      return campaigns;
    }),

  /**
   * Deactivate (pause) a campaign
   */
  deactivateCampaign: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await boostCampaignService.deactivateBoost(input.campaignId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Reactivate a paused campaign
   */
  reactivateCampaign: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await boostCampaignService.reactivateBoost(input.campaignId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Record impression for analytics
   * Called when boosted content is displayed
   */
  recordImpression: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await boostCampaignService.recordImpression(input.campaignId);
      return { success: true };
    }),

  /**
   * Record click for analytics
   * Called when user clicks on boosted content
   */
  recordClick: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await boostCampaignService.recordClick(input.campaignId);
      return { success: true };
    }),

  /**
   * Record conversion for analytics
   * Called when user takes desired action (e.g., contacts agent)
   */
  recordConversion: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await boostCampaignService.recordConversion(input.campaignId);
      return { success: true };
    }),
});
