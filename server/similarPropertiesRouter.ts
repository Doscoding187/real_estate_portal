/**
 * Similar Properties Router (tRPC)
 * API endpoints for finding and displaying similar properties
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { similarPropertiesService } from './services/similarPropertiesService';
import { requireUser } from './_core/requireUser';

function getUserId(ctx: { user: { id: number } | null }) {
  return requireUser(ctx).id;
}

export const similarPropertiesRouter = router({
  /**
   * Find similar properties
   * Requirement 15.1: Generate list of similar properties
   * Requirement 15.3: Consider price range (±20%), location, and features
   */
  findSimilar: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        limit: z.number().min(1).max(50).default(10),
        weights: z
          .object({
            priceMatch: z.number().min(0).max(1).optional(),
            locationMatch: z.number().min(0).max(1).optional(),
            propertyTypeMatch: z.number().min(0).max(1).optional(),
            bedroomsMatch: z.number().min(0).max(1).optional(),
            bathroomsMatch: z.number().min(0).max(1).optional(),
            areaMatch: z.number().min(0).max(1).optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const similarProperties = await similarPropertiesService.findSimilarProperties(
        input.propertyId,
        input.limit,
        input.weights,
      );

      return {
        success: true,
        data: {
          properties: similarProperties,
          total: similarProperties.length,
        },
      };
    }),

  /**
   * Get similar properties for Explore feed
   * Requirement 15.2: Display in "Similar to What You Viewed" section
   */
  getSimilarForFeed: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        limit: z.number().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      // The personalized feed is not implemented until recent-view facts,
      // recommendation ranking, and retention semantics are admitted as one
      // canonical authority. Do not acknowledge a fabricated empty feed.
      void getUserId(ctx);
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Personalized similar-property history is not available until its canonical workflow is approved.',
      });
    }),

  /**
   * Get similar properties based on viewing history
   * Requirement 15.2: Display similar properties based on history
   */
  getSimilarFromHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Similar-property history is not available until recent-view ranking is implemented.',
      });
    }),

  /**
   * Record engagement with similar property
   * Requirement 15.4: Track which similar properties get engagement
   */
  recordEngagement: protectedProcedure
    .input(
      z.object({
        referencePropertyId: z.number(),
        similarPropertyId: z.number(),
        engagementType: z.enum(['view', 'save', 'click']),
      }),
    )
    .mutation(async ({ input }) => {
      await similarPropertiesService.recordSimilarPropertyEngagement(
        input.referencePropertyId,
        input.similarPropertyId,
        input.engagementType,
      );

      return {
        success: true,
        message: 'Engagement recorded',
      };
    }),

  /**
   * Get similarity explanation
   * Shows why properties are considered similar
   */
  getExplanation: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        similarPropertyId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      // Find the similar property and get its match reasons
      const similar = await similarPropertiesService.findSimilarProperties(
        input.propertyId,
        50, // Get more to find the specific one
      );

      const match = similar.find(p => p.propertyId === input.similarPropertyId);

      if (!match) {
        return {
          success: false,
          error: 'Properties not found or not similar enough',
        };
      }

      return {
        success: true,
        data: {
          similarityScore: match.similarityScore,
          matchReasons: match.matchReasons,
          explanation: `This property matches ${match.similarityScore}% based on: ${match.matchReasons.join(', ')}`,
        },
      };
    }),
});
