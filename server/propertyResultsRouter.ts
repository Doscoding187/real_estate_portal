/**
 * Property Results Router
 * tRPC endpoints for property search results page optimization
 * Requirements: 4.1, 4.2, 4.3, 11.1, 11.3
 *
 * NOTE: Analytics tracking (searchAnalytics, propertyClicks) is STUBBED.
 * These tables are not exported from schema.ts.
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from './db';
import { savedSearches } from '../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { propertySearchService } from './services/propertySearchService';
import type { PropertyFilters, SortOption } from '../shared/types';

// Validation schemas
const propertyFiltersSchema = z.object({
  province: z.string().optional(),
  city: z.string().optional(),
  suburb: z.array(z.string()).optional(),
  propertyType: z
    .array(z.enum(['house', 'apartment', 'townhouse', 'plot', 'commercial']))
    .optional(),
  listingType: z.enum(['sale', 'rent']).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minBedrooms: z.number().optional(),
  maxBedrooms: z.number().optional(),
  minBathrooms: z.number().optional(),
  minErfSize: z.number().optional(),
  maxErfSize: z.number().optional(),
  minFloorSize: z.number().optional(),
  maxFloorSize: z.number().optional(),
  titleType: z.array(z.enum(['freehold', 'sectional'])).optional(),
  maxLevy: z.number().optional(),
  securityEstate: z.boolean().optional(),
  petFriendly: z.boolean().optional(),
  fibreReady: z.boolean().optional(),
  loadSheddingSolutions: z.array(z.enum(['solar', 'generator', 'inverter', 'none'])).optional(),
  status: z.array(z.enum(['available', 'under_offer', 'sold', 'let'])).optional(),
  bounds: z
    .object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number(),
    })
    .optional(),
});

const sortOptionSchema = z.enum([
  'price_asc',
  'price_desc',
  'date_desc',
  'date_asc',
  'suburb_asc',
  'suburb_desc',
]);

export const propertyResultsRouter = router({
  /**
   * Search properties with filters and pagination
   * Requirement 4.1: Search endpoint with filter and pagination params
   */
  search: publicProcedure
    .input(
      z.object({
        filters: propertyFiltersSchema,
        sortOption: sortOptionSchema.default('date_desc'),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(12),
      }),
    )
    .query(async ({ input }) => {
      try {
        const results = await propertySearchService.searchProperties(
          input.filters as PropertyFilters,
          input.sortOption as SortOption,
          input.page,
          input.pageSize,
        );

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        console.error('[PropertyResults] Search error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search properties',
        });
      }
    }),

  /**
   * Get filter counts for preview
   * Requirement 7.3: Show count before applying filter
   */
  getFilterCounts: publicProcedure
    .input(
      z.object({
        filters: propertyFiltersSchema,
      }),
    )
    .query(async ({ input }) => {
      try {
        const counts = await propertySearchService.getFilterCounts(
          input.filters as PropertyFilters,
        );

        return {
          success: true,
          data: counts,
        };
      } catch (error) {
        console.error('[PropertyResults] Filter counts error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get filter counts',
        });
      }
    }),

  /**
   * Saved Searches
   */
  savedSearches: router({
    /**
     * Create a saved search
     * Requirement 4.1: Store filter criteria with notification options
     */
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          filters: propertyFiltersSchema,
          notificationMethod: z.enum(['email', 'whatsapp', 'both', 'none']).default('none'),
          notificationFrequency: z.enum(['instant', 'daily', 'weekly']).default('weekly'),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database not available',
          });
        }

        try {
          const result = await db.insert(savedSearches).values({
            userId: ctx.user.id,
            name: input.name,
            filters: input.filters as any,
            notificationMethod: input.notificationMethod,
            notificationFrequency: input.notificationFrequency,
            isActive: 1,
          });

          return {
            success: true,
            data: {
              id: Number(result[0].insertId),
            },
          };
        } catch (error) {
          console.error('[PropertyResults] Create saved search error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create saved search',
          });
        }
      }),

    /**
     * List user's saved searches
     * Requirement 4.2: Display list with search names, suburbs, and result counts
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const searches = await db
          .select()
          .from(savedSearches)
          .where(and(eq(savedSearches.userId, ctx.user.id), eq(savedSearches.isActive, 1)))
          .orderBy(desc(savedSearches.createdAt));

        // Get result counts for each saved search
        const searchesWithCounts = await Promise.all(
          searches.map(async (search: any) => {
            try {
              const filters = search.filters as PropertyFilters;
              const counts = await propertySearchService.getFilterCounts(filters);

              // Extract location info from filters
              const location = [filters.suburb?.join(', '), filters.city, filters.province]
                .filter(Boolean)
                .join(', ');

              return {
                id: search.id,
                name: search.name,
                filters: search.filters,
                location,
                resultCount: counts.total,
                notificationMethod: search.notificationMethod,
                notificationFrequency: search.notificationFrequency,
                createdAt: search.createdAt,
                lastNotified: search.lastNotified,
              };
            } catch (error) {
              console.error(
                `[PropertyResults] Error getting counts for search ${search.id}:`,
                error,
              );
              return {
                id: search.id,
                name: search.name,
                filters: search.filters,
                location: '',
                resultCount: 0,
                notificationMethod: search.notificationMethod,
                notificationFrequency: search.notificationFrequency,
                createdAt: search.createdAt,
                lastNotified: search.lastNotified,
              };
            }
          }),
        );

        return {
          success: true,
          data: searchesWithCounts,
        };
      } catch (error) {
        console.error('[PropertyResults] List saved searches error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list saved searches',
        });
      }
    }),

    /**
     * Load a saved search
     * Requirement 4.3: Navigate to results with saved filters applied
     */
    load: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database not available',
          });
        }

        try {
          const search = await db
            .select()
            .from(savedSearches)
            .where(
              and(
                eq(savedSearches.id, input.id),
                eq(savedSearches.userId, ctx.user.id),
                eq(savedSearches.isActive, 1),
              ),
            )
            .limit(1);

          if (search.length === 0) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Saved search not found',
            });
          }

          return {
            success: true,
            data: {
              id: search[0].id,
              name: search[0].name,
              filters: search[0].filters as PropertyFilters,
              notificationMethod: search[0].notificationMethod,
              notificationFrequency: search[0].notificationFrequency,
            },
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error('[PropertyResults] Load saved search error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to load saved search',
          });
        }
      }),

    /**
     * Delete a saved search
     */
    delete: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database not available',
          });
        }

        try {
          // Verify ownership
          const search = await db
            .select()
            .from(savedSearches)
            .where(and(eq(savedSearches.id, input.id), eq(savedSearches.userId, ctx.user.id)))
            .limit(1);

          if (search.length === 0) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Saved search not found',
            });
          }

          // Soft delete by setting isActive to false
          await db.update(savedSearches).set({ isActive: 0 }).where(eq(savedSearches.id, input.id));

          return {
            success: true,
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error('[PropertyResults] Delete saved search error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete saved search',
          });
        }
      }),
  }),

  /**
   * Analytics tracking (STUBBED)
   * Tables searchAnalytics and propertyClicks are not exported from schema.
   */
  analytics: router({
    /**
     * Track search event - STUBBED
     */
    trackSearch: publicProcedure
      .input(
        z.object({
          filters: propertyFiltersSchema,
          resultCount: z.number().int().nonnegative(),
          sortOrder: sortOptionSchema,
          viewMode: z.enum(['list', 'grid', 'map']),
          sessionId: z.string(),
        }),
      )
      .mutation(async () => {
        // STUB: Analytics tracking disabled - table not available
        console.debug(
          '[PropertyResults] trackSearch called but disabled (no searchAnalytics table)',
        );
        return { success: true };
      }),

    /**
     * Track property click - STUBBED
     */
    trackClick: publicProcedure
      .input(
        z.object({
          propertyId: z.number().int().positive(),
          position: z.number().int().nonnegative(),
          searchFilters: propertyFiltersSchema,
          sessionId: z.string(),
        }),
      )
      .mutation(async () => {
        // STUB: Analytics tracking disabled - table not available
        console.debug('[PropertyResults] trackClick called but disabled (no propertyClicks table)');
        return { success: true };
      }),
  }),
});
