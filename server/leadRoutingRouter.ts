import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { startLeadFunnelSession, getLeadFunnelSessionByToken } from './services/leadRoutingSessionService';
import { LeadSourceTypeSchema } from '../shared/leadRouting';

const attributionInputSchema = z.object({
  campaignId: z.number().int().positive().nullable().optional(),
  campaignSlug: z.string().trim().max(160).nullable().optional(),
  sourceType: LeadSourceTypeSchema.nullable().optional(),
  utmSource: z.string().trim().max(100).nullable().optional(),
  utmMedium: z.string().trim().max(100).nullable().optional(),
  utmCampaign: z.string().trim().max(150).nullable().optional(),
  utmContent: z.string().trim().max(150).nullable().optional(),
  utmTerm: z.string().trim().max(150).nullable().optional(),
  fbclid: z.string().trim().max(255).nullable().optional(),
  gclid: z.string().trim().max(255).nullable().optional(),
  referrerUrl: z.string().trim().max(2048).nullable().optional(),
  landingPageUrl: z.string().trim().max(2048).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  ttlHours: z.number().int().min(1).max(24 * 90).optional(),
});

export const leadRoutingRouter = router({
  startSession: publicProcedure.input(attributionInputSchema).mutation(async ({ input }) => {
    return startLeadFunnelSession(input);
  }),

  getSession: publicProcedure
    .input(
      z.object({
        sessionToken: z.string().trim().min(20).max(96),
      }),
    )
    .query(async ({ input }) => {
      const session = await getLeadFunnelSessionByToken(input.sessionToken);
      if (!session) return null;

      return {
        id: session.id,
        campaignId: session.campaignId,
        sessionToken: session.sessionToken,
        sourceType: session.sourceType,
        status: session.status,
        expiresAt: session.expiresAt,
      };
    }),
});
