/**
 * Monetization Router
 *
 * Live: getRecommendedAgents (public "professionals serving this area"
 * resolver). Remaining procedures intentionally return 501 Not Implemented;
 * no monetized placement product is authorized (CRA Commercial Non-Goals).
 */

import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getDb } from './db-connection';
import { findAgentsServingLocation } from './services/agentPublicProfileService';

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
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }
      try {
        return await findAgentsServingLocation(db, input.locationType, input.locationId);
      } catch (error) {
        console.error('[monetizationRouter] getRecommendedAgents failed closed', error);
        return [];
      }
    }),
});
