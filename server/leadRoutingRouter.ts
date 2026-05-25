import { z } from 'zod';
import { adminProcedure, publicProcedure, router } from './_core/trpc';
import {
  startLeadFunnelSession,
  getLeadFunnelSessionByToken,
} from './services/leadRoutingSessionService';
import { saveQualificationProfile } from './services/leadRoutingQualificationService';
import { captureBuyerLead } from './services/leadRoutingLeadCaptureService';
import { createLeadRoutingDecision } from './services/leadRoutingDecisionService';
import { recordLeadDevelopmentMatches } from './services/leadRoutingMatchPersistenceService';
import { importBuyerLeads } from './services/leadRoutingImportService';
import { getLeadReviewDetail, listLeadReviewItems } from './services/leadRoutingReviewService';
import {
  BuyerLeadStatusSchema,
  CaptureBuyerLeadInputSchema,
  LeadImportBatchInputSchema,
  RecordLeadDevelopmentMatchesInputSchema,
  ContactMethodSchema,
  CreditReportStatusSchema,
  LeadRoutingOutcomeSchema,
  LeadSourceTypeSchema,
  SaveQualificationProfileInputSchema,
} from '../shared/leadRouting';

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
  ttlHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 90)
    .optional(),
});

const createRoutingDecisionInputSchema = z.object({
  buyerLeadId: z.number().int().positive(),
  sessionId: z.number().int().positive().nullable().optional(),
  campaignId: z.number().int().positive().nullable().optional(),
  sourceType: LeadSourceTypeSchema.nullable().optional(),
  preferredContactMethod: ContactMethodSchema.nullable().optional(),
  creditReportStatus: CreditReportStatusSchema.nullable().optional(),
  assignedUserId: z.number().int().positive().nullable().optional(),
  ownerId: z.number().int().positive().nullable().optional(),
  match: z
    .object({
      selectedMatchId: z.number().int().positive().nullable().optional(),
      developmentId: z.number().int().positive().nullable().optional(),
      distributionReady: z.boolean().optional(),
      submissionAllowed: z.boolean().optional(),
      matchLabel: z.string().trim().max(80).nullable().optional(),
    })
    .nullable()
    .optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

const leadReviewListInputSchema = z.object({
  status: BuyerLeadStatusSchema.nullable().optional(),
  sourceType: LeadSourceTypeSchema.nullable().optional(),
  routingOutcome: LeadRoutingOutcomeSchema.nullable().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
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

  saveQualificationProfile: publicProcedure
    .input(SaveQualificationProfileInputSchema)
    .mutation(async ({ input }) => {
      return saveQualificationProfile(input);
    }),

  captureBuyerLead: publicProcedure
    .input(CaptureBuyerLeadInputSchema)
    .mutation(async ({ input }) => {
      return captureBuyerLead(input);
    }),

  recordDevelopmentMatches: publicProcedure
    .input(RecordLeadDevelopmentMatchesInputSchema)
    .mutation(async ({ input }) => {
      return recordLeadDevelopmentMatches(input);
    }),

  createRoutingDecision: publicProcedure
    .input(createRoutingDecisionInputSchema)
    .mutation(async ({ input }) => {
      return createLeadRoutingDecision(input as Parameters<typeof createLeadRoutingDecision>[0]);
    }),

  importBuyerLeads: adminProcedure.input(LeadImportBatchInputSchema).mutation(async ({ input }) => {
    return importBuyerLeads(input);
  }),

  listLeadReviewItems: adminProcedure.input(leadReviewListInputSchema).query(async ({ input }) => {
    return listLeadReviewItems(input);
  }),

  getLeadReviewDetail: adminProcedure
    .input(z.object({ buyerLeadId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return getLeadReviewDetail(input.buyerLeadId);
    }),
});
