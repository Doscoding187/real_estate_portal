/**
 * Brand Emulator Router
 *
 * Enables super admins to operate as platform-owned brand profiles.
 * Replaces the broken developer.getProfile approach with proper brand context.
 */

import { z } from 'zod';
import { router, superAdminProcedure } from './_core/trpc';
import { brandContextService, type BrandContext } from './services/brandContextService';
import { brandEmulatorService } from './services/brandEmulatorService';
import { TRPCError } from '@trpc/server';
import { developerBrandProfileService } from './services/developerBrandProfileService';
import { developmentService } from './services/developmentService';

export const brandEmulatorRouter = router({
  // ==========================================================================
  // Brand Context Management
  // ==========================================================================

  /**
   * List all available platform-owned brand profiles for emulator mode
   */
  listAvailableBrands: superAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ input }) => {
      return await brandContextService.getPlatformBrandProfiles({
        search: input.search,
        limit: input.limit,
      });
    }),

  /**
   * Get detailed brand context for emulator operations
   * This replaces developer.getProfile for emulator mode
   */
  getBrandContext: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
      }),
    )
    .query(async ({ input }) => {
      return await brandContextService.verifyBrandContext(input.brandProfileId);
    }),

  /**
   * Switch emulator context to a specific brand
   */
  switchToBrand: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const brandContext = await brandContextService.verifyBrandContext(input.brandProfileId);

      // In a real implementation, you might store this in session or context
      // For now, we return the context for the frontend to manage

      return {
        success: true,
        brandContext,
        message: `Now operating as ${brandContext.brandName}`,
      };
    }),

  // ==========================================================================
  // Brand-Scoped Operations (Context-Aware)
  // ==========================================================================

  /**
   * Get brand profile details with full context
   */
  getBrandProfile: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
      }),
    )
    .query(async ({ input }) => {
      // Verify brand context first
      await brandContextService.verifyBrandContext(input.brandProfileId);

      // Get full brand profile details
      const profile = await developerBrandProfileService.getBrandProfileById(input.brandProfileId);

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Brand profile not found',
        });
      }

      return profile;
    }),

  /**
   * Get brand statistics and metrics
   */
  getBrandStats: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
      }),
    )
    .query(async ({ input }) => {
      // Verify brand context first
      await brandContextService.verifyBrandContext(input.brandProfileId);

      // Get brand statistics
      return await developerBrandProfileService.getBrandLeadStats(input.brandProfileId);
    }),

  /**
   * Get developments for this brand
   */
  getBrandDevelopments: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
        status: z.enum(['all', 'draft', 'pending', 'approved', 'rejected', 'published']).optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      // Verify brand context first
      await brandContextService.verifyBrandContext(input.brandProfileId);

      // Get developments for this brand
      return await developerBrandProfileService.getBrandDevelopments(input.brandProfileId);
    }),

  /**
   * Create a development under this brand context
   */
  createDevelopment: superAdminProcedure
    .input(
      z
        .object({
          brandProfileId: z.number().int(),
        })
        .passthrough(),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify brand context first
      const brandContext = await brandContextService.verifyBrandContext(input.brandProfileId);

      // Create development with proper platform ownership
      const metadata = {
        ownerType: 'platform' as const,
        brandProfileId: input.brandProfileId,
      };

      const development = await developmentService.createDevelopment(
        ctx.user.id,
        input as any,
        metadata,
      );

      return {
        id: development.id,
        development,
        brandContext,
        message: `Development created under ${brandContext.brandName}`,
      };
    }),

  // ==========================================================================
  // Advanced Seeding Operations
  // ==========================================================================

  /**
   * Seed development under brand profile
   */
  seedDevelopment: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int().positive(),
        developmentData: z.object({
          name: z.string().min(2, 'Development name is required'),
          slug: z.string().optional(),
          description: z.string().optional(),
          developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'land']),
          transactionType: z.enum(['for_sale', 'for_rent', 'shared_ownership']),
          status: z.enum(['draft', 'published', 'archived']).default('draft'),
          location: z.object({
            address: z.string(),
            city: z.string(),
            province: z.string(),
            postalCode: z.string().optional(),
            latitude: z.number().optional(),
            longitude: z.number().optional(),
          }),
          media: z
            .object({
              heroImage: z
                .object({
                  url: z.string().url(),
                  alt: z.string().optional(),
                })
                .optional(),
              gallery: z
                .array(
                  z.object({
                    url: z.string().url(),
                    alt: z.string().optional(),
                  }),
                )
                .optional(),
            })
            .optional(),
          unitTypes: z
            .array(
              z.object({
                name: z.string(),
                bedrooms: z.number().int().min(0),
                bathrooms: z.number().min(0),
                unitSize: z.number().positive(),
                basePriceFrom: z.number().positive(),
                parkingType: z.enum(['none', 'open', 'covered', 'carport', 'garage']),
                parkingBays: z.number().int().min(0),
                totalUnits: z.number().int().min(0),
                availableUnits: z.number().int().min(0),
              }),
            )
            .optional(),
          amenities: z.array(z.string()).optional(),
          completionDate: z.string().optional(),
          marketingDescription: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      // Verify brand context first
      await brandContextService.verifyBrandContext(input.brandProfileId);

      return await brandEmulatorService.seedDevelopment(
        input.brandProfileId,
        input.developmentData,
      );
    }),

  /**
   * Seed property under brand profile
   */
  seedProperty: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int().positive(),
        propertyData: z.object({
          title: z.string().min(5, 'Title must be at least 5 characters'),
          description: z.string().min(10, 'Description must be at least 10 characters'),
          propertyType: z.enum([
            'apartment',
            'house',
            'villa',
            'plot',
            'commercial',
            'townhouse',
            'cluster_home',
            'farm',
            'shared_living',
          ]),
          listingType: z.enum(['sale', 'rent', 'rent_to_buy', 'auction', 'shared_living']),
          askingPrice: z.number().positive().optional(),
          monthlyRent: z.number().positive().optional(),
          location: z.object({
            address: z.string(),
            city: z.string(),
            province: z.string(),
            postalCode: z.string().optional(),
            latitude: z.number().optional(),
            longitude: z.number().optional(),
          }),
          propertyDetails: z.object({
            bedrooms: z.number().int().min(0),
            bathrooms: z.number().min(0),
            erfSizeM2: z.number().positive().optional(),
            unitSizeM2: z.number().positive().optional(),
            parkingType: z.enum(['none', 'open', 'covered', 'carport', 'garage']),
            parkingBays: z.number().int().min(0),
            amenities: z.array(z.string()).optional(),
            propertyHighlights: z.array(z.string()).optional(),
          }),
          mediaUrls: z.array(z.string().url()).min(1, 'At least one image is required'),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      // Verify brand context first
      await brandContextService.verifyBrandContext(input.brandProfileId);

      return await brandEmulatorService.seedProperty(input.brandProfileId, input.propertyData);
    }),

  /**
   * Generate lead for brand profile
   */
  generateLead: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int().positive(),
        leadData: z.object({
          name: z.string().min(1, 'Name is required'),
          email: z.string().email('Valid email is required'),
          phone: z.string().optional(),
          message: z.string().optional(),
          leadType: z.enum(['development_inquiry', 'property_inquiry', 'general']),
          budget: z.number().positive().optional(),
          preferredContact: z.enum(['email', 'phone', 'both']).default('email'),
          source: z.string().optional(),
          utmSource: z.string().optional(),
          utmMedium: z.string().optional(),
          utmCampaign: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      // Verify brand context first
      await brandContextService.verifyBrandContext(input.brandProfileId);

      return await brandEmulatorService.generateLead(input.brandProfileId, input.leadData);
    }),

  /**
   * Get all entities for a brand profile
   */
  getBrandEntities: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      // Verify brand context first
      await brandContextService.verifyBrandContext(input.brandProfileId);

      return await brandEmulatorService.getBrandEntities(input.brandProfileId);
    }),

  /**
   * Cleanup all entities for a brand profile
   */
  cleanupBrandEntities: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int().positive(),
        confirm: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.confirm) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Confirmation required. Set confirm=true to proceed with cleanup.',
        });
      }

      // Verify brand context first
      await brandContextService.verifyBrandContext(input.brandProfileId);

      return await brandEmulatorService.cleanupBrandEntities(input.brandProfileId);
    }),

  // ==========================================================================
  // Cleanup Operations
  // ==========================================================================

  /**
   * Delete a brand and all associated content
   * Safe cleanup that maintains data integrity
   */
  deleteBrandWithContent: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
        confirm: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.confirm) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must confirm deletion to proceed',
        });
      }

      // Verify this is a platform-owned brand
      const brandContext = await brandContextService.verifyBrandContext(input.brandProfileId);

      if (brandContext.ownerType !== 'platform') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Can only delete platform-owned brands',
        });
      }

      // Use the service's safe delete method
      const result = await developerBrandProfileService.deleteBrandProfile(input.brandProfileId);

      return {
        success: true,
        deletedBrand: brandContext.brandName,
        result,
        message: `Successfully deleted ${brandContext.brandName} and all associated content`,
      };
    }),
});
