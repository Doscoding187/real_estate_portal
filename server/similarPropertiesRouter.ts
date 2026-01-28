/**
 * Similar Properties Router (tRPC)
 * API endpoints for finding and displaying similar properties
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { similarPropertiesService } from './services/similarPropertiesService';

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
      // Get user's refined weights if available
      const weights = await similarPropertiesService.getRefinedWeights(ctx.user.id);

      const similarProperties = await similarPropertiesService.findSimilarProperties(
        input.propertyId,
        input.limit,
        weights,
      );

      return {
        success: true,
        data: {
          sectionTitle: 'Similar to What You Viewed',
          properties: similarProperties,
          referencePropertyId: input.propertyId,
        },
      };
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
      // TODO: Get user's recent viewing history
      // For now, return empty array
      // In production, you would:
      // 1. Get user's recently viewed properties
      // 2. Find similar properties for each
      // 3. Deduplicate and rank by relevance
      // 4. Return top N results

      return {
        success: true,
        data: {
          sectionTitle: 'Based on Your Recent Views',
          properties: [],
          message: 'Start viewing properties to see personalized recommendations',
        },
      };
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
