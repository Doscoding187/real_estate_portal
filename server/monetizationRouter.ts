/**
 * Monetization Router (STUBBED)
 *
 * Disabled: References locationTargeting which is not exported from schema.
 * All endpoints return 501 Not Implemented until table is properly added via migration.
 */

import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const notImplementedError = () => {
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Monetization features temporarily disabled (schema pending)',
  });
};

export const monetizationRouter = router({
  createTargetingRule: protectedProcedure
    .input(
      z.object({
        targetType: z.enum(['hero_ad', 'featured_developer', 'recommended_agent']),
        targetId: z.number(),
        locationType: z.enum(['province', 'city', 'suburb']),
        locationId: z.number(),
        ranking: z.number().default(0),
        status: z.enum(['active', 'scheduled', 'expired', 'paused']).default('scheduled'),
        metadata: z.any(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .mutation(async () => notImplementedError()),

  getAllRules: protectedProcedure.query(async () => {
    // Return empty array instead of throwing
    console.debug(
      '[monetizationRouter] getAllRules called but disabled (no locationTargeting table)',
    );
    return [];
  }),

  getHeroAd: publicProcedure
    .input(
      z.object({
        locationType: z.enum(['province', 'city', 'suburb']),
        locationId: z.number(),
      }),
    )
    .query(async () => {
      // Return null instead of throwing
      console.debug(
        '[monetizationRouter] getHeroAd called but disabled (no locationTargeting table)',
      );
      return null;
    }),

  getFeaturedDevelopers: publicProcedure
    .input(
      z.object({
        locationType: z.enum(['province', 'city', 'suburb']),
        locationId: z.number(),
      }),
    )
    .query(async () => {
      // Return empty array instead of throwing
      console.debug(
        '[monetizationRouter] getFeaturedDevelopers called but disabled (no locationTargeting table)',
      );
      return [];
    }),

  getRecommendedAgents: publicProcedure
    .input(
      z.object({
        locationType: z.enum(['province', 'city', 'suburb']),
        locationId: z.number(),
      }),
    )
    .query(async () => {
      // Return empty array instead of throwing
      console.debug(
        '[monetizationRouter] getRecommendedAgents called but disabled (no locationTargeting table)',
      );
      return [];
    }),
});
