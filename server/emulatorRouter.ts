/**
 * Emulator Router
 * Handles super admin emulator mode operations with brand context switching
 */

import { z } from 'zod';
import { router, protectedProcedure, superAdminProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  isEmulatorMode,
  getEffectiveBrandId,
  type EnhancedTRPCContext,
} from './_core/brandContext';
import { developerBrandProfileService } from './services/developerBrandProfileService';

// ============================================================================
// Input Schemas
// ============================================================================

const switchBrandSchema = z.object({
  brandProfileId: z.number().int().positive(),
});

const createSeededBrandSchema = z.object({
  brandName: z.string().min(2, 'Brand name must be at least 2 characters'),
  brandTier: z.enum(['national', 'regional', 'boutique']).default('boutique'),
  province: z.string().min(2, 'Province is required'),
  city: z.string().min(2, 'City is required'),
  specializations: z.array(z.string()).default([]),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  about: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
});

// ============================================================================
// Router
// ============================================================================

export const emulatorRouter = router({
  /**
   * Get current brand context for emulator mode
   * Returns operating-as brand info or real developer profile
   */
  getBrandContext: protectedProcedure.query(async ({ ctx }) => {
    // If in emulator mode, return the operating-as context
    if (isEmulatorMode(ctx as EnhancedTRPCContext)) {
      return {
        isEmulator: true,
        brandProfileId: ctx.operatingAs.brandProfileId,
        brandName: ctx.operatingAs.brandName,
        brandType: ctx.operatingAs.brandType,
        originalUserId: ctx.operatingAs.originalUserId,
      };
    }

    // Normal mode: get real developer profile
    const { getDeveloperByUserId } = await import('./services/developerService');
    const developerProfile = await getDeveloperByUserId(ctx.user.id);

    if (!developerProfile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Developer profile not found',
      });
    }

    // Get associated brand profile
    let brandProfile = null;
    if (developerProfile.brandProfileId) {
      brandProfile = await developerBrandProfileService.getBrandProfileById(
        developerProfile.brandProfileId,
      );
    }

    return {
      isEmulator: false,
      developerProfile,
      brandProfile,
    };
  }),

  /**
   * List available seeded brands for emulator mode
   */
  listSeededBrands: superAdminProcedure.query(async () => {
    const brands = await developerBrandProfileService.listBrandProfiles({
      isVisible: true,
      ownerType: 'platform', // Only platform-owned (seeded) brands
    });

    return brands.map(brand => ({
      id: brand.id,
      brandName: brand.brandName,
      brandTier: brand.brandTier,
      headOfficeLocation: brand.headOfficeLocation,
      operatingProvinces: brand.operatingProvinces,
      isSeeded: brand.ownerType === 'platform',
    }));
  }),

  /**
   * Create a new seeded brand for emulator mode
   */
  createSeededBrand: superAdminProcedure
    .input(createSeededBrandSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Create the brand profile with platform ownership
        const brandProfile = await developerBrandProfileService.createBrandProfile({
          brandName: input.brandName,
          slug: input.brandName.toLowerCase().replace(/\s+/g, '-'),
          logoUrl: null,
          about: input.about || null,
          foundedYear: null,
          headOfficeLocation: `${input.city}, ${input.province}`,
          operatingProvinces: [input.province],
          propertyFocus: input.specializations,
          websiteUrl: input.websiteUrl || null,
          publicContactEmail: input.contactEmail || null,
          brandTier: input.brandTier,
          identityType: 'developer',
          sourceAttribution: 'Emulator Mode Seeding',
          isVisible: true,
          isContactVerified: false,
          createdBy: ctx.user.id,
        });

        // Mark as platform-owned (seeded)
        await developerBrandProfileService.updateBrandProfile(brandProfile.id, {
          ownerType: 'platform',
          isSubscriber: false,
          isClaimable: true,
        });

        return {
          success: true,
          brandProfile: {
            id: brandProfile.id,
            brandName: brandProfile.brandName,
            brandTier: brandProfile.brandTier,
            isSeeded: true,
          },
        };
      } catch (error) {
        console.error('[Emulator] Failed to create seeded brand:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create seeded brand',
          cause: error,
        });
      }
    }),

  /**
   * Switch to operate as a specific brand
   * This is handled by middleware, but we provide a validation endpoint
   */
  validateBrandSwitch: superAdminProcedure.input(switchBrandSchema).query(async ({ input }) => {
    const brandProfile = await developerBrandProfileService.getBrandProfileById(
      input.brandProfileId,
    );

    if (!brandProfile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Brand profile ${input.brandProfileId} not found`,
      });
    }

    return {
      valid: true,
      brandProfile: {
        id: brandProfile.id,
        brandName: brandProfile.brandName,
        brandTier: brandProfile.brandTier,
        ownerType: brandProfile.ownerType,
      },
    };
  }),

  /**
   * Get brand-scoped developments
   * Returns developments for the current operating brand or user's own brand
   */
  getBrandDevelopments: protectedProcedure.query(async ({ ctx }) => {
    const brandId = await getEffectiveBrandId(ctx as EnhancedTRPCContext);

    const { developmentService } = await import('./services/developmentService');

    try {
      const developments = await developmentService.getDevelopmentsByBrandId(brandId);
      return developments;
    } catch (error) {
      console.error('[Emulator] Failed to get brand developments:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve brand developments',
        cause: error,
      });
    }
  }),

  /**
   * Delete a seeded brand and all its associated content
   * Only works for platform-owned (seeded) brands
   */
  deleteSeededBrand: superAdminProcedure
    .input(z.object({ brandProfileId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      try {
        // Verify this is a seeded (platform-owned) brand
        const brandProfile = await developerBrandProfileService.getBrandProfileById(
          input.brandProfileId,
        );

        if (!brandProfile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Brand profile not found',
          });
        }

        if (brandProfile.ownerType !== 'platform') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only seeded (platform-owned) brands can be deleted via emulator',
          });
        }

        // TODO: Implement cascade delete for all associated content
        // This should include: developments, properties, media, leads, etc.
        await developerBrandProfileService.deleteBrandProfile(input.brandProfileId);

        return {
          success: true,
          message: `Seeded brand "${brandProfile.brandName}" deleted successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('[Emulator] Failed to delete seeded brand:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete seeded brand',
          cause: error,
        });
      }
    }),

  /**
   * Get emulator usage statistics
   */
  getEmulatorStats: superAdminProcedure.query(async () => {
    const brands = await developerBrandProfileService.listBrandProfiles({
      ownerType: 'platform',
    });

    // TODO: Add more detailed stats about seeded content
    return {
      totalSeededBrands: brands.length,
      activeBrands: brands.filter(b => b.isVisible).length,
      brandTiers: {
        national: brands.filter(b => b.brandTier === 'national').length,
        regional: brands.filter(b => b.brandTier === 'regional').length,
        boutique: brands.filter(b => b.brandTier === 'boutique').length,
      },
    };
  }),
});
