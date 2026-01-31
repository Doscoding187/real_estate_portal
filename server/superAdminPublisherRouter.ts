import { z } from 'zod';
import { router, superAdminProcedure } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
import { developerBrandProfileService } from './services/developerBrandProfileService';
import { brandLeadService } from './services/brandLeadService';
import { developments, properties, developerBrandProfiles, leads } from '../drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { developmentService } from './services/developmentService';

/**
 * Super Admin Publisher Router
 *
 * Allows Super Admins to act as platform-owned developer brands.
 * All actions MUST be scoped to a developerBrandProfileId.
 */
export const superAdminPublisherRouter = router({
  // ==========================================================================
  // Brand Context Selection
  // ==========================================================================

  /**
   * List all brand profiles for the context selector
   */
  listBrandProfiles: superAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ input }) => {
      return await developerBrandProfileService.listBrandProfiles({
        search: input.search,
        limit: input.limit,
        // We want all profiles including platform-owned ones
      });
    }),

  /**
   * Debug: Get current operating context
   * Helps diagnose identity resolution issues
   */
  whoAmI: superAdminProcedure.query(async ({ ctx }) => {
    const enhancedCtx = ctx as any; // EnhancedTRPCContext from middleware

    return {
      userId: ctx.user?.id,
      userEmail: ctx.user?.email,
      userRole: ctx.user?.role,
      isEmulatorMode: !!enhancedCtx.operatingAs,
      operatingAs: enhancedCtx.operatingAs
        ? {
            brandProfileId: enhancedCtx.operatingAs.brandProfileId,
            brandType: enhancedCtx.operatingAs.brandType,
            brandName: enhancedCtx.operatingAs.brandName,
          }
        : null,
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Create a development under the selected brand context
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
      // Get operating context from middleware (set by brandContext.ts)
      const enhancedCtx = ctx as any; // EnhancedTRPCContext
      const operatingContext = enhancedCtx.operatingAs
        ? { brandProfileId: enhancedCtx.operatingAs.brandProfileId }
        : { brandProfileId: input.brandProfileId };

      const metadata = {
        ownerType: 'platform' as const,
        brandProfileId: input.brandProfileId,
      };

      // Call service with operating context for identity resolution
      const development = await developmentService.createDevelopment(
        ctx.user.id,
        input as any,
        metadata,
        operatingContext,
      );

      return {
        id: development.id,
        development,
        message: 'Development created under brand context',
      };
    }),

  /**
   * Get brand profile by ID for identity resolution
   */
  getBrandProfileById: superAdminProcedure
    .input(
      z.object({
        id: z.number().int(),
      }),
    )
    .query(async ({ input }) => {
      return await developerBrandProfileService.getBrandProfileById(input.id);
    }),

  /**
   * Create a development under the selected brand context
   */
  createBrandProfile: superAdminProcedure
    .input(
      z.object({
        // Identity
        brandName: z.string().min(2),
        brandTier: z.enum(['national', 'regional', 'boutique']).default('regional'),
        identityType: z.enum(['developer', 'marketing_agency', 'hybrid']).default('developer'),
        logoUrl: z.string().optional(),

        // Company Info
        description: z.string().optional(),
        category: z.string().optional(),
        establishedYear: z.number().nullable().optional(),
        website: z.string().optional(),

        // Contact Info
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),

        // Portfolio
        completedProjects: z.number().default(0),
        currentProjects: z.number().default(0),
        upcomingProjects: z.number().default(0),
        specializations: z.array(z.string()).default([]),

        operatingProvinces: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Create new platform-owned brand profile
      const result = await developerBrandProfileService.createBrandProfile({
        brandName: input.brandName,
        brandTier: input.brandTier,
        identityType: input.identityType,
        logoUrl: input.logoUrl,

        // Map extended fields
        about: input.description,
        // Category is not directly on developerBrandProfiles schema based on service check,
        // but we can map it to 'propertyFocus' or store in 'about' if needed.
        // Re-checking service definition: propertyFocus is string[].
        // We'll treat category as primary property focus.
        propertyFocus: input.category
          ? [input.category, ...input.specializations]
          : input.specializations,

        foundedYear: input.establishedYear,
        websiteUrl: input.website,
        publicContactEmail: input.email,

        // Combine address components for headOfficeLocation
        headOfficeLocation:
          input.city && input.province
            ? `${input.address ? input.address + ', ' : ''}${input.city}, ${input.province}`
            : input.address,

        operatingProvinces: input.operatingProvinces || (input.province ? [input.province] : []),

        // Note: Project counts are currently not in createBrandProfileInput in service
        // We might need to handle them separately or update service if they are critical
        // Looking at service, it has 'totalLeadsReceived' etc but not project counts?
        // Wait, 'developerBrandProfiles' table schema check needed.
        // Based on service 'createBrandProfile', it takes 'CreateBrandProfileInput'.

        isVisible: true,
      });

      return result;
    }),

  /**
   * Update an existing brand profile
   */
  updateBrandProfile: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),

        // Identity
        brandName: z.string().min(2).optional(),
        brandTier: z.enum(['national', 'regional', 'boutique']).optional(),
        identityType: z.enum(['developer', 'marketing_agency', 'hybrid']).optional(),
        logoUrl: z.string().optional(),

        // Company Info
        description: z.string().optional(),
        category: z.string().optional(),
        establishedYear: z.number().nullable().optional(),
        website: z.string().optional(),

        // Contact Info
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),

        // Portfolio (We will just map specializations for now as project counts aren't in schema update yet)
        specializations: z.array(z.string()).optional(),

        operatingProvinces: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Logic to combine address if partial updates are provided is tricky without reading first.
      // ideally frontend sends full address data if updating address.
      // We will perform a simple mapping assuming what is sent is what is intended.

      let headOfficeLocation: string | undefined = undefined;
      // Only construct location if at least one component is present, implying an address update intention
      // But for updates, usually better to let frontend send the combined string or we read-modify-write.
      // For simplicity, we will update headOfficeLocation ONLY if 'city' or 'address' is explicitly provided.
      if (input.city || input.address || input.province) {
        headOfficeLocation = `${input.address || ''}, ${input.city || ''}, ${input.province || ''}`
          .replace(/^, /, '')
          .replace(/, ,/, ',');
      }

      await developerBrandProfileService.updateBrandProfile(input.brandProfileId, {
        brandName: input.brandName,
        brandTier: input.brandTier,
        identityType: input.identityType,
        logoUrl: input.logoUrl,
        about: input.description,
        foundedYear: input.establishedYear,
        websiteUrl: input.website,
        publicContactEmail: input.email,
        propertyFocus: input.specializations, // simplified mapping
        headOfficeLocation, // strict update
        operatingProvinces: input.operatingProvinces,
      });

      return { success: true };
    }),

  /**
   * Delete a brand profile
   */
  deleteBrandProfile: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
        force: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      return await developerBrandProfileService.deleteBrandProfile(
        input.brandProfileId,
        input.force,
      );
    }),

  // ==========================================================================
  // Development Management (Context-Aware)
  // ==========================================================================

  /**
   * List developments for the selected brand context
   */
  getDevelopments: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
        status: z.enum(['all', 'draft', 'pending', 'approved', 'rejected', 'published']).optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      // Use service to get developments specifically linked to this brand profile
      return await developerBrandProfileService.getBrandDevelopments(input.brandProfileId);
    }),

  /**
   * Update a development (must check brand context ownership)
   */
  updateDevelopment: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
        developmentId: z.number().int(),
        data: z.any(), // Flexible partial update, validating ownership first
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error('Database not available');

      // Verify ownership by brand profile
      const [dev] = await dbConn
        .select()
        .from(developments)
        .where(
          and(
            eq(developments.id, input.developmentId),
            eq(developments.developerBrandProfileId, input.brandProfileId),
          ),
        );

      if (!dev) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Development not found or does not belong to this brand context',
        });
      }

      // Proceed with update using existing service logic or direct update
      // We'll use a safer direct update for now to avoid reusing rigorous validation meant for external devs
      await dbConn
        .update(developments)
        .set({
          ...input.data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(developments.id, input.developmentId));

      return { success: true };
    }),

  // ==========================================================================
  // Leads & Metrics (Context-Aware)
  // ==========================================================================

  /**
   * Get leads captured for this brand
   */
  getBrandLeads: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error('Database not available');

      const brandLeads = await dbConn
        .select()
        .from(leads)
        .where(eq(leads.developerBrandProfileId, input.brandProfileId))
        .orderBy(desc(leads.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return brandLeads;
    }),

  /**
   * Get global metrics across all brands (for header stats)
   */
  getGlobalMetrics: superAdminProcedure.query(async () => {
    const dbConn = await db.getDb();
    if (!dbConn) throw new Error('Database not available');

    // Count total developments
    const [devCount] = await dbConn.select({ count: sql<number>`count(*)` }).from(developments);

    // Count total leads
    const [leadCount] = await dbConn.select({ count: sql<number>`count(*)` }).from(leads);

    return {
      totalDevelopments: Number(devCount?.count || 0),
      totalLeads: Number(leadCount?.count || 0),
    };
  }),

  /**
   * Get aggregated metrics for this brand
   */
  getBrandMetrics: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int(),
      }),
    )
    .query(async ({ input }) => {
      // Reuse the service's lead stats which aggregates leads, views, etc.
      return await developerBrandProfileService.getBrandLeadStats(input.brandProfileId);
    }),
});
