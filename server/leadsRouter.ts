import { z } from 'zod';
import { router, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { LeadOwnershipResolutionError, capturePublicLead } from './services/publicLeadCaptureService';

const affordabilityDataSchema = z
  .object({
    monthlyIncome: z.number().optional(),
    monthlyExpenses: z.number().optional(),
    monthlyDebts: z.number().optional(),
    availableDeposit: z.number().optional(),
    maxAffordable: z.number().optional(),
    calculatedAt: z.string().optional(),
  })
  .optional();

const LEAD_RATE_LIMIT_WINDOW_MS = 60_000;
const LEAD_RATE_LIMIT_MAX_PER_WINDOW = 12;
const leadRateLimitStore = new Map<string, number[]>();

type LeadOwnerType = 'brand_profile' | 'development' | 'property' | 'agency' | 'agent' | 'unknown';

function getClientIp(ctx: any): string {
  const forwarded = ctx?.req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  const socketIp = ctx?.req?.socket?.remoteAddress;
  if (typeof socketIp === 'string' && socketIp.length > 0) {
    return socketIp;
  }

  const reqIp = ctx?.req?.ip;
  if (typeof reqIp === 'string' && reqIp.length > 0) {
    return reqIp;
  }

  return 'unknown';
}

function getRequestId(ctx: any): string {
  const requestId = ctx?.requestId;
  if (typeof requestId === 'string' && requestId.trim().length > 0) {
    return requestId;
  }
  return 'unknown';
}

function resolveOwner(input: {
  developerBrandProfileId?: number;
  developmentId?: number;
  propertyId?: number;
  agencyId?: number;
  agentId?: number;
}): { ownerType: LeadOwnerType; ownerId: number | null } {
  if (input.developerBrandProfileId) {
    return { ownerType: 'brand_profile', ownerId: input.developerBrandProfileId };
  }
  if (input.developmentId) {
    return { ownerType: 'development', ownerId: input.developmentId };
  }
  if (input.propertyId) {
    return { ownerType: 'property', ownerId: input.propertyId };
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

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - LEAD_RATE_LIMIT_WINDOW_MS;
  const attempts = leadRateLimitStore.get(ip) || [];
  const activeAttempts = attempts.filter(timestamp => timestamp > windowStart);

  if (activeAttempts.length >= LEAD_RATE_LIMIT_MAX_PER_WINDOW) {
    return false;
  }

  activeAttempts.push(now);
  leadRateLimitStore.set(ip, activeAttempts);
  return true;
}

export const leadsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        propertyId: z.number().int().positive().optional(),
        developmentId: z.number().int().positive().optional(),
        developerBrandProfileId: z.number().int().positive().optional(),
        agencyId: z.number().int().positive().optional(),
        agentId: z.number().int().positive().optional(),
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        message: z.string().optional(),
        leadType: z.enum(['inquiry', 'viewing_request', 'offer', 'callback']).optional(),
        source: z.string().optional(),
        leadSource: z.string().optional(),
        referrerUrl: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
        website: z.string().optional(), // honeypot (must remain empty)
        affordabilityData: affordabilityDataSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const requestId = getRequestId(ctx);
      const ip = getClientIp(ctx);
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
          leadId: 0,
          route: 'direct' as const,
          message: 'Lead captured',
        };
      }

      if (!checkRateLimit(ip)) {
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

      let result;
      try {
        result = await capturePublicLead(input);
      } catch (error) {
        if (error instanceof LeadOwnershipResolutionError) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Lead target could not be resolved for this submission.',
          });
        }

        throw error;
      }

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
});
