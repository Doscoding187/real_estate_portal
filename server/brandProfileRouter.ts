/**
 * Brand Profile Router
 *
 * Public and admin endpoints for developer brand profiles.
 * Implements the API routes from the implementation plan.
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { developerBrandProfileService } from './services/developerBrandProfileService';
import { brandLeadService } from './services/brandLeadService';

// ============================================================================
// Input Schemas
// ============================================================================

const createBrandProfileSchema = z.object({
  brandName: z.string().min(2, 'Brand name must be at least 2 characters'),
  slug: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  about: z.string().nullable().optional(),
  foundedYear: z.number().int().min(1800).max(2030).nullable().optional(),
  headOfficeLocation: z.string().nullable().optional(),
  operatingProvinces: z.array(z.string()).optional(),
  propertyFocus: z.array(z.string()).optional(),
  websiteUrl: z.string().url().nullable().optional(),
  publicContactEmail: z.string().email().nullable().optional(),
  brandTier: z.enum(['national', 'regional', 'boutique']).optional(),
  sourceAttribution: z.string().nullable().optional(),
  isVisible: z.boolean().optional(),
  isContactVerified: z.boolean().optional(),
});

const updateBrandProfileSchema = z.object({
  id: z.number().int(),
  data: z.object({
    brandName: z.string().min(2).optional(),
    slug: z.string().optional(),
    logoUrl: z.string().nullable().optional(),
    about: z.string().nullable().optional(),
    foundedYear: z.number().int().nullable().optional(),
    headOfficeLocation: z.string().nullable().optional(),
    operatingProvinces: z.array(z.string()).optional(),
    propertyFocus: z.array(z.string()).optional(),
    websiteUrl: z.string().nullable().optional(),
    publicContactEmail: z.string().nullable().optional(),
    brandTier: z.enum(['national', 'regional', 'boutique']).optional(),
    sourceAttribution: z.string().nullable().optional(),
    profileType: z.enum(['industry_reference', 'verified_partner']).optional(),
    isVisible: z.boolean().optional(),
    isContactVerified: z.boolean().optional(),
  }),
});

const listBrandProfilesSchema = z
  .object({
    brandTier: z.enum(['national', 'regional', 'boutique']).optional(),
    isSubscriber: z.boolean().optional(),
    isVisible: z.boolean().optional(),
    search: z.string().optional(),
    limit: z.number().int().positive().max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .optional();

const captureBrandLeadSchema = z.object({
  developerBrandProfileId: z.number().int(),
  developmentId: z.number().int().optional(),
  propertyId: z.number().int().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  message: z.string().optional(),
  leadSource: z.string().optional(),
  referrerUrl: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const brandProfileRouter = router({
  // ============================================================================
  // PUBLIC ENDPOINTS
  // ============================================================================

  /**
   * Get brand profile by slug (public)
   */
  getBrandProfile: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const profile = await developerBrandProfileService.getBrandProfileBySlug(input.slug);

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer brand not found',
        });
      }

      return profile;
    }),

  /**
   * List brand profiles with filters (public)
   */
  listBrandProfiles: publicProcedure.input(listBrandProfilesSchema).query(async ({ input }) => {
    return await developerBrandProfileService.listBrandProfiles(input || {});
  }),

  /**
   * Get developments for a brand (public)
   */
  getBrandDevelopments: publicProcedure
    .input(z.object({ brandProfileId: z.number().int() }))
    .query(async ({ input }) => {
      return await developerBrandProfileService.getBrandDevelopments(input.brandProfileId);
    }),

  /**
   * Capture lead for brand profile (public)
   * This is the main lead capture endpoint
   */
  captureLead: publicProcedure.input(captureBrandLeadSchema).mutation(async ({ input }) => {
    try {
      const result = await brandLeadService.captureBrandLead(input);
      return result;
    } catch (error) {
      console.error('Lead capture failed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to submit enquiry. Please try again.',
      });
    }
  }),

  // ============================================================================
  // ADMIN ENDPOINTS (Super Admin Only)
  // ============================================================================

  /**
   * Create new brand profile (admin)
   */
  adminCreateBrandProfile: protectedProcedure
    .input(createBrandProfileSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can create brand profiles',
        });
      }

      const result = await developerBrandProfileService.createBrandProfile({
        ...input,
        createdBy: ctx.user.id,
      });

      return result;
    }),

  /**
   * Update brand profile (admin)
   */
  adminUpdateBrandProfile: protectedProcedure
    .input(updateBrandProfileSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can update brand profiles',
        });
      }

      return await developerBrandProfileService.updateBrandProfile(input.id, input.data);
    }),

  /**
   * Toggle profile visibility (admin)
   */
  adminToggleVisibility: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        visible: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can toggle visibility',
        });
      }

      return await developerBrandProfileService.toggleVisibility(input.id, input.visible);
    }),

  /**
   * Attach development to brand (admin)
   */
  adminAttachDevelopment: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int(),
        brandProfileId: z.number().int(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can attach developments',
        });
      }

      return await developerBrandProfileService.attachDevelopmentToBrand(
        input.developmentId,
        input.brandProfileId,
      );
    }),

  /**
   * Detach development from brand (admin)
   */
  adminDetachDevelopment: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can detach developments',
        });
      }

      return await developerBrandProfileService.detachDevelopmentFromBrand(input.developmentId);
    }),

  /**
   * Get brand lead stats (admin)
   */
  adminGetBrandLeadStats: protectedProcedure
    .input(z.object({ brandProfileId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can view lead stats',
        });
      }

      return await developerBrandProfileService.getBrandLeadStats(input.brandProfileId);
    }),

  /**
   * Get all brand profiles with stats (admin only, includes hidden)
   */
  adminListAllBrandProfiles: protectedProcedure
    .input(listBrandProfilesSchema)
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can list all brand profiles',
        });
      }

      // Admin can see hidden profiles
      return await developerBrandProfileService.listBrandProfiles({
        ...input,
        isVisible: undefined, // Show all, including hidden
      });
    }),

  /**
   * Convert brand to subscriber (admin)
   * Links brand profile to developer account after claim approval
   */
  adminConvertToSubscriber: protectedProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
        developerAccountId: z.number().int(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can convert brands to subscribers',
        });
      }

      return await developerBrandProfileService.convertToSubscriber(
        input.brandProfileId,
        input.developerAccountId,
      );
    }),

  /**
   * Get sales pitch stats for outreach (admin)
   */
  adminGetSalesPitchStats: protectedProcedure
    .input(z.object({ brandProfileId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can view sales stats',
        });
      }

      return await brandLeadService.getSalesPitchStats(input.brandProfileId);
    }),
});
