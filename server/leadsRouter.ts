import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { capturePublicLead } from './services/publicLeadCaptureService';
import { PUBLIC_LEAD_INPUT_LIMITS } from './services/publicLeadInputContract';
import { publisherLeadService } from './services/publisherLeadService';
import { developerIdentityService } from './services/developerIdentityService';
import { getDb } from './db';
import { agents, agencies, developments, leads } from '../drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { requireUser } from './_core/requireUser';
import {
  checkPublicLeadRateLimit,
  getPublicLeadClientIp,
} from './services/publicLeadRateLimitService';

const affordabilityDataSchema = z
  .object({
    monthlyIncome: z.number().optional(),
    monthlyExpenses: z.number().optional(),
    monthlyDebts: z.number().optional(),
    availableDeposit: z.number().optional(),
    maxAffordable: z.number().optional(),
    calculatedAt: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.calculatedAt).optional(),
  })
  .optional();

const leadConsentSchema = z.object({
  accepted: z.literal(true),
  version: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.consentVersion).trim().min(1),
  source: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.consentSource).trim().optional(),
});

type LeadOwnerType =
  | 'catalogue_publisher'
  | 'development'
  | 'property'
  | 'agency'
  | 'agent'
  | 'unknown';

function getRequestId(ctx: any): string {
  const requestId = ctx?.requestId;
  if (typeof requestId === 'string' && requestId.trim().length > 0) {
    return requestId;
  }
  return 'unknown';
}

function resolveOwner(input: {
  cataloguePublisherId?: number;
  developmentId?: number;
  propertyId?: number;
  agencyId?: number;
  agentId?: number;
}): { ownerType: LeadOwnerType; ownerId: number | null } {
  if (input.propertyId) {
    return { ownerType: 'property', ownerId: input.propertyId };
  }
  if (input.developmentId) {
    return { ownerType: 'development', ownerId: input.developmentId };
  }
  if (input.cataloguePublisherId) {
    return { ownerType: 'catalogue_publisher', ownerId: input.cataloguePublisherId };
  }
  if (input.agencyId) {
    return { ownerType: 'agency', ownerId: input.agencyId };
  }
  if (input.agentId) {
    return { ownerType: 'agent', ownerId: input.agentId };
  }
  return { ownerType: 'unknown', ownerId: null };
}

function logLeadEvent(
  event: 'honeypot_trigger' | 'rate_limit_trigger' | 'lead_accepted',
  payload: Record<string, unknown>,
) {
  console.info(`[LeadCapture] ${JSON.stringify({ event, ...payload })}`);
}

export const leadsRouter = router({
  create: publicProcedure
    .input(
      z
        .object({
          listingId: z.number().int().positive().optional(),
          commercialAvailabilityId: z.number().int().positive().optional(),
          propertyId: z.number().int().positive().optional(),
          developmentId: z.number().int().positive().optional(),
          cataloguePublisherId: z.number().int().positive().optional(),
          agencyId: z.number().int().positive().optional(),
          agentId: z.number().int().positive().optional(),
          unitId: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.unitId).trim().optional(),
          unitName: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.unitName).trim().optional(),
          unitPriceFrom: z.number().nonnegative().optional(),
          unitBedrooms: z.number().int().nonnegative().optional(),
          unitBathrooms: z.number().nonnegative().optional(),
          name: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.name).trim().min(1),
          email: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.email).trim().email(),
          phone: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.phone).trim().optional(),
          message: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.message).trim().optional(),
          leadType: z.enum(['inquiry', 'viewing_request', 'offer', 'callback']).optional(),
          source: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.source).trim().optional(),
          leadSource: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.source).trim().optional(),
          sourceSurface: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.source).trim().optional(),
          referrerUrl: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.referrerUrl).trim().optional(),
          utmSource: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.utm).trim().optional(),
          utmMedium: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.utm).trim().optional(),
          utmCampaign: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.utm).trim().optional(),
          website: z.string().max(PUBLIC_LEAD_INPUT_LIMITS.honeypot).optional(), // honeypot (must remain empty)
          affordabilityData: affordabilityDataSchema,
          captureRequestId: z
            .string()
            .max(PUBLIC_LEAD_INPUT_LIMITS.captureRequestId)
            .trim()
            .min(PUBLIC_LEAD_INPUT_LIMITS.captureRequestIdMin)
            .optional(),
          consent: leadConsentSchema.optional(),
        })
        .superRefine((input, refinementContext) => {
          if (input.commercialAvailabilityId && !input.listingId) {
            refinementContext.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['listingId'],
              message: 'Commercial enquiries require the matching marketing listing.',
            });
          }
          if ((input.listingId || input.propertyId || input.developmentId) && !input.captureRequestId) {
            refinementContext.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['captureRequestId'],
              message: 'A stable enquiry request ID is required.',
            });
          }
          if ((input.listingId || input.propertyId || input.developmentId) && !input.consent) {
            refinementContext.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['consent'],
              message: 'Consent is required before submitting an enquiry.',
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const requestId = getRequestId(ctx);
      const ip = getPublicLeadClientIp(ctx);
      const { ownerType, ownerId } = resolveOwner(input);

      // Silent drop for obvious bots filling hidden field
      if (input.website && input.website.trim().length > 0) {
        logLeadEvent('honeypot_trigger', {
          requestId,
          ip,
          ownerType,
          ownerId,
          developmentId: input.developmentId ?? null,
          propertyId: input.propertyId ?? null,
        });

        return {
          success: true as const,
          ignored: true as const,
          leadId: 0,
          route: 'direct' as const,
          message: 'Request received',
        };
      }

      if (!checkPublicLeadRateLimit(ip)) {
        logLeadEvent('rate_limit_trigger', {
          requestId,
          ip,
          ownerType,
          ownerId,
          developmentId: input.developmentId ?? null,
          propertyId: input.propertyId ?? null,
        });

        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many lead submissions. Please try again in a minute.',
        });
      }

      const result = await capturePublicLead({
        ...input,
        authenticatedUserId: ctx.user?.id,
      });

      logLeadEvent('lead_accepted', {
        requestId,
        ip,
        ownerType,
        ownerId,
        developmentId: input.developmentId ?? null,
        propertyId: input.propertyId ?? null,
        leadId: result.leadId,
        route: result.route,
      });

      return result;
    }),

  retryDelivery: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const user = requireUser(ctx);
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found.' });

      let authorized = user.role === 'super_admin';

      if (!authorized && lead.agentId) {
        const [agent] = await db
          .select({ userId: agents.userId, agencyId: agents.agencyId, status: agents.status })
          .from(agents)
          .where(eq(agents.id, lead.agentId))
          .limit(1);
        authorized =
          agent?.status === 'approved' &&
          (agent.userId === user.id ||
            (user.role === 'agency_admin' &&
              !!user.agencyId &&
              Number(agent.agencyId || 0) === Number(user.agencyId)));
      }

      if (!authorized && user.role === 'agency_admin' && user.agencyId && lead.agencyId) {
        const [agency] = await db
          .select({ isVerified: agencies.isVerified })
          .from(agencies)
          .where(eq(agencies.id, user.agencyId))
          .limit(1);
        authorized =
          Number(agency?.isVerified || 0) === 1 && Number(user.agencyId) === Number(lead.agencyId);
      }

      if (!authorized && lead.developmentId) {
        const identity = await developerIdentityService.getDeveloperByUserId(user.id);
        if (identity && Number(lead.cataloguePublisherId || 0) === Number(identity.publisherId)) {
          const [ownedDevelopment] = await db
            .select({ id: developments.id })
            .from(developments)
            .where(
              and(
                eq(developments.id, lead.developmentId),
                eq(developments.cataloguePublisherId, identity.publisherId),
              ),
            )
            .limit(1);
          authorized = !!ownedDevelopment;
        }
      }

      if (!authorized) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to retry delivery for this lead.',
        });
      }

      return await publisherLeadService.retryPublisherLeadDelivery(input.leadId);
    }),
});
