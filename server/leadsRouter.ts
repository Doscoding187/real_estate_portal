import { z } from 'zod';
import { router, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { capturePublicLead } from './services/publicLeadCaptureService';

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

function assertNotRateLimited(ip: string) {
  const now = Date.now();
  const windowStart = now - LEAD_RATE_LIMIT_WINDOW_MS;
  const attempts = leadRateLimitStore.get(ip) || [];
  const activeAttempts = attempts.filter(timestamp => timestamp > windowStart);

  if (activeAttempts.length >= LEAD_RATE_LIMIT_MAX_PER_WINDOW) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many lead submissions. Please try again in a minute.',
    });
  }

  activeAttempts.push(now);
  leadRateLimitStore.set(ip, activeAttempts);
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
      // Silent drop for obvious bots filling hidden field
      if (input.website && input.website.trim().length > 0) {
        return {
          success: true as const,
          leadId: 0,
          route: 'direct' as const,
          message: 'Lead captured',
        };
      }

      assertNotRateLimited(getClientIp(ctx));

      return await capturePublicLead(input);
    }),
});
