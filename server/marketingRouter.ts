import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { getDb } from './db';
import {
  marketingCampaigns,
  campaignTargeting,
  campaignBudgets,
  campaignSchedules,
  campaignChannels,
  campaignCreatives,
  campaignPerformance,
  campaignLeads,
} from '../drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export const marketingRouter = router({
  /**
   * Create a new campaign (Draft)
   */
  createCampaign: protectedProcedure
    .input(
      z.object({
        campaignName: z.string(),
        campaignType: z.enum(['listing_boost', 'lead_generation', 'brand_awareness', 'development_launch', 'agent_promotion']),
        ownerType: z.enum(['agent', 'developer', 'agency']),
        ownerId: z.number(),
        targetType: z.enum(['listing', 'development', 'agent_profile', 'agency_page']),
        targetId: z.number(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create the campaign
      const [result] = await db.insert(marketingCampaigns).values({
        ...input,
        status: 'draft',
      });

      const campaignId = result.insertId;

      // Initialize related tables with defaults
      await Promise.all([
        db.insert(campaignTargeting).values({ campaignId }),
        db.insert(campaignBudgets).values({ 
            campaignId, 
            budgetType: 'daily', 
            budgetAmount: '0.00', 
            billingMethod: 'ppc' 
        }),
        db.insert(campaignSchedules).values({ 
            campaignId, 
            startDate: new Date().toISOString(),
            frequency: 'one_time'
        }),
        db.insert(campaignChannels).values({ 
            campaignId, 
            type: 'feed', 
            enabled: false 
        }),
        db.insert(campaignCreatives).values({ campaignId }),
      ]);

      return { campaignId };
    }),

  /**
   * Get full campaign details
   */
  getCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const campaign = await db.query.marketingCampaigns.findFirst({
        where: eq(marketingCampaigns.id, input.campaignId),
      });

      if (!campaign) throw new Error('Campaign not found');

      // Fetch related data
      const [targeting, budget, schedule, channels, creative, performance] = await Promise.all([
        db.query.campaignTargeting.findFirst({ where: eq(campaignTargeting.campaignId, input.campaignId) }),
        db.query.campaignBudgets.findFirst({ where: eq(campaignBudgets.campaignId, input.campaignId) }),
        db.query.campaignSchedules.findFirst({ where: eq(campaignSchedules.campaignId, input.campaignId) }),
        db.query.campaignChannels.findMany({ where: eq(campaignChannels.campaignId, input.campaignId) }),
        db.query.campaignCreatives.findFirst({ where: eq(campaignCreatives.campaignId, input.campaignId) }),
        db.query.campaignPerformance.findMany({ where: eq(campaignPerformance.campaignId, input.campaignId) }),
      ]);

      return {
        campaign,
        targeting,
        budget,
        schedule,
        channels,
        creative,
        performance,
      };
    }),

  /**
   * List campaigns for an owner (or all for admin)
   */
  listCampaigns: protectedProcedure
    .input(
      z.object({
        ownerType: z.enum(['agent', 'developer', 'agency']).optional(),
        ownerId: z.number().optional(),
        status: z.enum(['draft', 'active', 'paused', 'completed', 'scheduled']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conditions = [];

      // If owner filters are provided, use them. 
      // Otherwise, if user is NOT admin, force filter by their own ID (security check)
      // For now, we trust the input logic from frontend, but in production we should verify ctx.user.role
      if (input.ownerType && input.ownerId) {
        conditions.push(eq(marketingCampaigns.ownerType, input.ownerType));
        conditions.push(eq(marketingCampaigns.ownerId, input.ownerId));
      }

      if (input.status) {
        conditions.push(eq(marketingCampaigns.status, input.status));
      }

      const campaigns = await db
        .select()
        .from(marketingCampaigns)
        .where(and(...conditions))
        .orderBy(desc(marketingCampaigns.createdAt));

      return campaigns;
    }),

  /**
   * Update campaign details
   */
  updateCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        data: z.object({
          campaignName: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(['draft', 'active', 'paused', 'completed', 'scheduled']).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .update(marketingCampaigns)
        .set(input.data)
        .where(eq(marketingCampaigns.id, input.campaignId));

      return { success: true };
    }),

  /**
   * Update Targeting
   */
  updateTargeting: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        targeting: z.object({
          locationTargeting: z.array(z.string()).optional(),
          buyerProfile: z.array(z.string()).optional(),
          priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
          propertyType: z.array(z.string()).optional(),
          customTags: z.array(z.string()).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .update(campaignTargeting)
        .set(input.targeting)
        .where(eq(campaignTargeting.campaignId, input.campaignId));

      return { success: true };
    }),

    /**
     * Update Budget
     */
    updateBudget: protectedProcedure
      .input(
        z.object({
          campaignId: z.number(),
          budget: z.object({
            budgetType: z.enum(['daily', 'lifetime', 'subscription']).optional(),
            budgetAmount: z.number().optional(),
            billingMethod: z.enum(['ppc', 'ppv', 'per_lead', 'per_boost', 'flat_fee']).optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Convert number to string for decimal column
        const updateData: any = { ...input.budget };
        if (input.budget.budgetAmount !== undefined) {
            updateData.budgetAmount = input.budget.budgetAmount.toString();
        }

        await db
          .update(campaignBudgets)
          .set(updateData)
          .where(eq(campaignBudgets.campaignId, input.campaignId));

        return { success: true };
      }),

    /**
     * Update Schedule
     */
    updateSchedule: protectedProcedure
      .input(
        z.object({
          campaignId: z.number(),
          schedule: z.object({
            startDate: z.string().optional(),
            endDate: z.string().optional().nullable(),
            autoPace: z.boolean().optional(),
            frequency: z.enum(['one_time', 'weekly', 'monthly']).optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db
          .update(campaignSchedules)
          .set(input.schedule)
          .where(eq(campaignSchedules.campaignId, input.campaignId));

        return { success: true };
      }),

    /**
     * Update Channels
     */
    updateChannels: protectedProcedure
      .input(
        z.object({
          campaignId: z.number(),
          channels: z.array(z.object({
            type: z.enum(['feed', 'search', 'carousel', 'email', 'push', 'showcase', 'retargeting']),
            enabled: z.boolean(),
          })),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Upsert channels
        for (const channel of input.channels) {
            // Check if exists
            const existing = await db.query.campaignChannels.findFirst({
                where: and(
                    eq(campaignChannels.campaignId, input.campaignId),
                    eq(campaignChannels.type, channel.type)
                )
            });

            if (existing) {
                await db.update(campaignChannels)
                    .set({ enabled: channel.enabled })
                    .where(eq(campaignChannels.id, existing.id));
            } else {
                await db.insert(campaignChannels).values({
                    campaignId: input.campaignId,
                    type: channel.type,
                    enabled: channel.enabled
                });
            }
        }

        return { success: true };
      }),

    /**
     * Update Creative
     */
    updateCreative: protectedProcedure
      .input(
        z.object({
          campaignId: z.number(),
          creative: z.object({
            images: z.array(z.string()).optional(),
            videos: z.array(z.string()).optional(),
            headlines: z.array(z.string()).optional(),
            descriptions: z.array(z.string()).optional(),
            cta: z.enum(['view_listing', 'book_viewing', 'contact_agent', 'download_brochure', 'pre_qualify']).optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db
          .update(campaignCreatives)
          .set(input.creative)
          .where(eq(campaignCreatives.campaignId, input.campaignId));

        return { success: true };
      }),
    /**
     * Launch Campaign (Process Payment & Activate)
     */
    launchCampaign: protectedProcedure
      .input(
        z.object({
          campaignId: z.number(),
          paymentMethodId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const campaign = await db.query.marketingCampaigns.findFirst({
          where: eq(marketingCampaigns.id, input.campaignId),
        });

        if (!campaign) throw new Error('Campaign not found');

        // Verify ownership (simplified for now)
        // In production, check if ctx.user.id matches ownerId or has admin rights

        // Mock Payment Processing
        // In production, integrate with Stripe using paymentMethodId

        // Update status to active (or scheduled if start date is future)
        const schedule = await db.query.campaignSchedules.findFirst({
            where: eq(campaignSchedules.campaignId, input.campaignId)
        });

        let newStatus = 'active';
        if (schedule?.startDate && new Date(schedule.startDate) > new Date()) {
            newStatus = 'scheduled';
        }

        await db
          .update(marketingCampaigns)
          .set({ status: newStatus as any })
          .where(eq(marketingCampaigns.id, input.campaignId));

        // Sync to Revenue Center (Mocked)
        try {
            const { recordCampaignTransaction } = await import('./revenueCenterSync');
            
            // Get budget amount
            const budget = await db.query.campaignBudgets.findFirst({
                where: eq(campaignBudgets.campaignId, input.campaignId)
            });

            if (budget && Number(budget.budgetAmount) > 0) {
                // Determine agency ID
                let agencyId = 0;
                if (campaign.ownerType === 'agency') agencyId = campaign.ownerId;
                
                await recordCampaignTransaction({
                    campaignId: campaign.id,
                    agencyId: agencyId,
                    amount: Number(budget.budgetAmount) * 100, // Convert to cents if budget is in currency
                    description: `Campaign Launch: ${campaign.campaignName}`,
                    metadata: { mockPayment: true, paymentMethodId: input.paymentMethodId }
                });
            }
        } catch (err) {
            console.error('Failed to sync campaign launch to Revenue Center:', err);
        }

        return { success: true, status: newStatus };
      }),
});
