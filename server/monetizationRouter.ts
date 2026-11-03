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
import { findAgentsServingPlace } from './services/agentPublicProfileService';
import { PLACE_ID_REGEX } from '../shared/placeAuthority';

const notImplementedError = () => {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'Monetized placement is unavailable until its canonical authority is approved',
  });
};

export const monetizationRouter = router({
  createTargetingRule: protectedProcedure
    .input(z.object({}).strict())
    .mutation(async () => notImplementedError()),

  getAllRules: protectedProcedure.query(async () => {
    return notImplementedError();
  }),

  getHeroAd: publicProcedure.input(z.object({}).strict()).query(async () => notImplementedError()),

  getFeaturedDevelopers: publicProcedure
    .input(z.object({}).strict())
    .query(async () => notImplementedError()),

  getRecommendedAgents: publicProcedure
    .input(
      z.object({
        canonicalPlaceId: z.string().regex(PLACE_ID_REGEX),
      }).strict(),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Recommended-agent data is unavailable until the database is connected',
        });
      }
      try {
        return await findAgentsServingPlace(db, input.canonicalPlaceId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Recommended-agent lookup failed',
          cause: error,
        });
      }
    }),
});
