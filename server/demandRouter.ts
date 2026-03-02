import { z } from 'zod';
import { agentProcedure, protectedProcedure, router } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  captureDemandLeadFromCampaign,
  createDemandCampaign,
  getAgentCampaignLeadSummary,
  listDemandCampaignsForOwner,
} from './services/demandEngineService';
import { requireUser } from './_core/requireUser';
import { getRuntimeSchemaCapabilities, warnSchemaCapabilityOnce } from './services/runtimeSchemaCapabilities';

const propertyTypeSchema = z.enum([
  'apartment',
  'house',
  'villa',
  'plot',
  'commercial',
  'townhouse',
  'cluster_home',
  'farm',
  'shared_living',
]);

const criteriaSchema = z
  .object({
    city: z.string().trim().min(1).max(100).optional(),
    suburb: z.string().trim().min(1).max(100).optional(),
    province: z.string().trim().min(1).max(100).optional(),
    propertyType: propertyTypeSchema.optional(),
    minBedrooms: z.number().int().min(0).max(20).optional(),
    maxPrice: z.number().int().min(0).max(5_000_000_000).optional(),
    minPrice: z.number().int().min(0).max(5_000_000_000).optional(),
  })
  .partial();

function getCampaignOwnerContext(user: { id: number; role?: string | null; agencyId?: number | null }) {
  if (user.role === 'agency_admin' && user.agencyId) {
    return {
      ownerType: 'agency' as const,
      ownerId: Number(user.agencyId),
    };
  }

  return {
    ownerType: 'agent' as const,
    ownerId: Number(user.id),
  };
}

export const demandRouter = router({
  createCampaign: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(255),
        sourceChannel: z.enum(['google', 'meta', 'tiktok', 'internal', 'manual']).optional(),
        status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
        distributionMode: z.enum(['shared', 'exclusive', 'mixed']).optional(),
        sharedRecipientCount: z.number().int().min(1).max(3).optional(),
        criteria: criteriaSchema.optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const capabilities = await getRuntimeSchemaCapabilities();
      if (!capabilities.demandEngineReady) {
        warnSchemaCapabilityOnce(
          'demand-createCampaign-schema-not-ready',
          '[demand.createCampaign] Demand schema not ready. Blocking mutation.',
          capabilities.demandEngineDetails,
        );
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Demand routing schema is not ready. Apply demand migrations before creating campaigns.',
        });
      }

      const user = requireUser(ctx);
      const owner = getCampaignOwnerContext(user);
      const campaign = await createDemandCampaign({
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        createdBy: user.id,
        name: input.name,
        sourceChannel: input.sourceChannel,
        status: input.status,
        distributionMode: input.distributionMode,
        sharedRecipientCount: input.sharedRecipientCount,
        criteria: input.criteria,
        metadata: input.metadata || null,
      });

      return campaign;
    }),

  listMyCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const capabilities = await getRuntimeSchemaCapabilities();
    if (!capabilities.demandEngineReady) {
      warnSchemaCapabilityOnce(
        'demand-listMyCampaigns-schema-not-ready',
        '[demand.listMyCampaigns] Demand schema not ready. Returning empty list.',
        capabilities.demandEngineDetails,
      );
      return [];
    }

    const user = requireUser(ctx);
    const owner = getCampaignOwnerContext(user);
    try {
      return listDemandCampaignsForOwner(owner.ownerType, owner.ownerId);
    } catch (error) {
      console.warn('[demand.listMyCampaigns] Returning empty campaigns due to error:', error);
      return [];
    }
  }),

  captureLead: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
        name: z.string().trim().min(2).max(200),
        email: z.string().trim().email().max(320),
        phone: z.string().trim().min(5).max(50).optional(),
        message: z.string().trim().max(3000).optional(),
        budgetMax: z.number().int().min(0).max(5_000_000_000).optional(),
        timeline: z.string().trim().max(120).optional(),
        preApproved: z.boolean().optional(),
        criteria: criteriaSchema.optional(),
        utmSource: z.string().trim().max(100).optional(),
        utmMedium: z.string().trim().max(100).optional(),
        utmCampaign: z.string().trim().max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const capabilities = await getRuntimeSchemaCapabilities();
      if (!capabilities.demandEngineReady) {
        warnSchemaCapabilityOnce(
          'demand-captureLead-schema-not-ready',
          '[demand.captureLead] Demand schema not ready. Blocking mutation.',
          capabilities.demandEngineDetails,
        );
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Demand routing schema is not ready. Apply demand migrations before capturing leads.',
        });
      }

      return captureDemandLeadFromCampaign({
        campaignId: input.campaignId,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        message: input.message || null,
        budgetMax: input.budgetMax ?? null,
        timeline: input.timeline || null,
        preApproved: input.preApproved ?? null,
        criteria: input.criteria || null,
        utmSource: input.utmSource || null,
        utmMedium: input.utmMedium || null,
        utmCampaign: input.utmCampaign || null,
      });
    }),

  myLeadSummary: agentProcedure.query(async ({ ctx }) => {
    const capabilities = await getRuntimeSchemaCapabilities();
    if (!capabilities.demandEngineReady) {
      warnSchemaCapabilityOnce(
        'demand-myLeadSummary-schema-not-ready',
        '[demand.myLeadSummary] Demand schema not ready. Returning safe defaults.',
        capabilities.demandEngineDetails,
      );
      return {
        assignedThisWeek: 0,
        activeCampaigns: 0,
        campaignLeadsBySource: [] as Array<{ source: string; count: number }>,
      };
    }

    const user = requireUser(ctx);
    try {
      return getAgentCampaignLeadSummary(user.id);
    } catch (error) {
      console.warn('[demand.myLeadSummary] Returning safe defaults due to error:', error);
      return {
        assignedThisWeek: 0,
        activeCampaigns: 0,
        campaignLeadsBySource: [] as Array<{ source: string; count: number }>,
      };
    }
  }),
});
