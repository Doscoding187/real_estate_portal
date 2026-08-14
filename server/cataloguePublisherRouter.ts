/**
 * Catalogue Publisher Router
 *
 * Public and platform-curator endpoints for governed Catalogue Publishers.
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { cataloguePublisherService } from './services/cataloguePublisherService';
import { publisherLeadService } from './services/publisherLeadService';
import { capturePublicLead } from './services/publicLeadCaptureService';
import {
  checkPublicLeadRateLimit,
  getPublicLeadClientIp,
} from './services/publicLeadRateLimitService';
import { developmentService } from './services/developmentService';
import { requireUser } from './_core/requireUser';

// ============================================================================
// Input Schemas
// ============================================================================

const createPlatformReferencePublisherSchema = z.object({
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
  sourceAttribution: z.string().trim().min(1).max(255),
  isVisible: z.boolean().optional(),
  isContactVerified: z.boolean().optional(),
});

const updatePublisherSchema = z.object({
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
    sourceAttribution: z.string().trim().min(1).max(255).optional(),
    isVisible: z.boolean().optional(),
    isContactVerified: z.boolean().optional(),
  }).strict(),
}).strict();

const listPublishersSchema = z
  .object({
    brandTier: z.enum(['national', 'regional', 'boutique']).optional(),
    authorityKind: z.enum(['platform_reference', 'developer_first_party']).optional(),
    isVisible: z.boolean().optional(),
    search: z.string().optional(),
    limit: z.number().int().positive().max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .optional();

const capturePublisherLeadSchema = z.object({
  cataloguePublisherId: z.number().int(),
  developmentId: z.number().int().optional(),
  propertyId: z.number().int().optional(),
  unitId: z.string().trim().max(36).optional(),
  unitName: z.string().trim().max(255).optional(),
  unitPriceFrom: z.number().nonnegative().optional(),
  unitBedrooms: z.number().int().nonnegative().optional(),
  unitBathrooms: z.number().nonnegative().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  message: z.string().optional(),
  sourceSurface: z.string().optional(),
  leadSource: z.string().optional(),
  referrerUrl: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  affordabilityData: z
    .object({
      monthlyIncome: z.number().optional(),
      monthlyExpenses: z.number().optional(),
      monthlyDebts: z.number().optional(),
      availableDeposit: z.number().optional(),
      maxAffordable: z.number().optional(),
      calculatedAt: z.string().optional(),
    })
    .optional(),
  captureRequestId: z.string().trim().min(8).max(128),
  consent: z.object({
    accepted: z.literal(true),
    version: z.string().trim().min(1).max(64),
    source: z.string().trim().max(100).optional(),
  }),
});

// ============================================================================
// Router
// ============================================================================

export const cataloguePublisherRouter = router({
  // ============================================================================
  // PUBLIC ENDPOINTS
  // ============================================================================

  /**
   * Get a publisher by slug (public)
   */
  getPublisher: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const profile = await cataloguePublisherService.getPublicPublisherBySlug(input.slug);

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Catalogue Publisher not found',
        });
      }

      return profile;
    }),

  /**
   * List public publishers with filters.
   */
  listPublishers: publicProcedure.input(listPublishersSchema).query(async ({ input }) => {
    return await cataloguePublisherService.listPublicPublishers(input || {});
  }),

  /**
   * Get developments for a publisher (public).
   */
  getPublisherDevelopments: publicProcedure
    .input(z.object({ cataloguePublisherId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const profile = await cataloguePublisherService.getPublicPublisherById(
        input.cataloguePublisherId,
      );
      if (!profile || Number(profile.isVisible) !== 1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Catalogue Publisher not found' });
      }

      return developmentService.listPublicDevelopments({
        cataloguePublisherId: input.cataloguePublisherId,
      });
    }),

  /**
   * Capture an enquiry attributed to a Catalogue Publisher.
   */
  captureLead: publicProcedure.input(capturePublisherLeadSchema).mutation(async ({ input, ctx }) => {
    try {
      if (!checkPublicLeadRateLimit(getPublicLeadClientIp(ctx))) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many lead submissions. Please try again in a minute.',
        });
      }

      return await capturePublicLead({
        ...input,
        leadType: 'inquiry',
        source: input.sourceSurface || input.leadSource || 'catalogue_publisher',
        sourceSurface: input.sourceSurface || 'catalogue_publisher',
        leadSource: input.leadSource || 'catalogue_publisher',
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
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
   * Create a platform-reference publisher (admin).
   */
  adminCreatePublisher: protectedProcedure
    .input(createPlatformReferencePublisherSchema)
    .mutation(async ({ input, ctx }) => {
      const user = requireUser(ctx);
      if (user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can create Catalogue Publishers',
        });
      }

      const result = await cataloguePublisherService.createPlatformReferencePublisher({
        ...input,
        createdBy: user.id,
      });

      return result;
    }),

  /**
   * Update editable publisher content (admin).
   */
  adminUpdatePublisher: protectedProcedure
    .input(updatePublisherSchema)
    .mutation(async ({ input, ctx }) => {
      const user = requireUser(ctx);
      if (user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can update Catalogue Publishers',
        });
      }

      return await cataloguePublisherService.updatePublisher(input.id, input.data);
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
      const user = requireUser(ctx);
      if (user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can toggle visibility',
        });
      }

      return await cataloguePublisherService.toggleVisibility(input.id, input.visible);
    }),

  /**
   * Get brand lead stats (admin)
   */
  adminGetPublisherLeadStats: protectedProcedure
    .input(z.object({ cataloguePublisherId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const user = requireUser(ctx);
      if (user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can view lead stats',
        });
      }

      return await cataloguePublisherService.getPublisherLeadStats(input.cataloguePublisherId);
    }),

  /**
   * Get all publishers (admin only, includes hidden).
   */
  adminListAllPublishers: protectedProcedure
    .input(listPublishersSchema)
    .query(async ({ input, ctx }) => {
      const user = requireUser(ctx);
      if (user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can list all Catalogue Publishers',
        });
      }

      // Admin can see hidden profiles
      return await cataloguePublisherService.listPublishers({
        ...input,
        isVisible: undefined, // Show all, including hidden
      });
    }),

  /**
   * Get sales pitch stats for outreach (admin)
   */
  adminGetSalesPitchStats: protectedProcedure
    .input(z.object({ cataloguePublisherId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const user = requireUser(ctx);
      if (user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can view sales stats',
        });
      }

      return await publisherLeadService.getSalesPitchStats(input.cataloguePublisherId);
    }),
});
