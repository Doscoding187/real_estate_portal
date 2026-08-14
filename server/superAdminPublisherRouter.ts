import { z } from 'zod';
import { router, superAdminProcedure } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
import { cataloguePublisherService } from './services/cataloguePublisherService';
import { developments, properties, cataloguePublishers, leads } from '../drizzle/schema';
import { eq, desc, and, isNull, sql } from 'drizzle-orm';
import { developmentService } from './services/developmentService';
import { resolveOperatingIdentity } from './_core/identityResolver';
import type { EnhancedTRPCContext } from './_core/publisherContext';

async function requireActivePublisherContext(ctx: EnhancedTRPCContext, cataloguePublisherId: number) {
  const identity = await resolveOperatingIdentity(ctx, {
    mode: 'platform_curator',
    cataloguePublisherId,
  });

  if (identity.mode !== 'platform_curator') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'A platform-curator identity is required for publisher operations.',
    });
  }

  return { cataloguePublisherId: identity.cataloguePublisherId };
}

/**
 * Super Admin Publisher Router
 *
 * Allows Super Admins to act as platform-owned developer brands.
 * All actions MUST be scoped to a cataloguePublisherId.
 */
export const superAdminPublisherRouter = router({
  // ==========================================================================
  // Brand Context Selection
  // ==========================================================================

  /**
   * List all Catalogue Publishers for the context selector
   */
  listPublishers: superAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().default(50),
        emulatorOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ input }) => {
      const profiles = await cataloguePublisherService.listPublishers({
        search: input.search,
        limit: input.limit,
        authorityKind: input.emulatorOnly ? 'platform_reference' : undefined,
      });

      if (!input.emulatorOnly) return profiles;

      // Emulator context must only expose immutable platform-reference publishers.
      return profiles.filter(profile => profile.authorityKind === 'platform_reference');
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
      isPlatformCuratorMode: !!enhancedCtx.operatingAs,
      operatingAs: enhancedCtx.operatingAs
        ? {
          cataloguePublisherId: enhancedCtx.operatingAs.cataloguePublisherId,
            publisherType: enhancedCtx.operatingAs.publisherType,
            publisherName: enhancedCtx.operatingAs.publisherName,
          }
        : null,
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Create a development under the selected publisher context
   */
  createDevelopment: superAdminProcedure
    .input(
      z
        .object({
          cataloguePublisherId: z.number().int(),
        })
        .passthrough(),
    )
    .mutation(async ({ input, ctx }) => {
      const selectedBrand = await cataloguePublisherService.getPublisherById(
        input.cataloguePublisherId,
      );
      if (!selectedBrand) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Catalogue Publisher ${input.cataloguePublisherId} not found`,
        });
      }
      if (selectedBrand.authorityKind !== 'platform_reference') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Publisher emulator can only create content for platform-reference publishers.',
        });
      }

      const operatingContext = await requireActivePublisherContext(ctx, input.cataloguePublisherId);

      const metadata = {
        ownerType: 'platform' as const,
        cataloguePublisherId: input.cataloguePublisherId,
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
        message: 'Development created under publisher context',
      };
    }),

  /**
   * Get Catalogue Publisher by ID for identity resolution
   */
  getPublisherById: superAdminProcedure
    .input(
      z.object({
        id: z.number().int(),
        emulatorOnly: z.boolean().default(true),
      }),
    )
    .query(async ({ input }) => {
      const profile = await cataloguePublisherService.getPublisherById(input.id);
      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Catalogue Publisher ${input.id} not found`,
        });
      }

      if (input.emulatorOnly) {
        if (profile.authorityKind !== 'platform_reference') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Publisher emulator only supports platform-owned Catalogue Publishers.',
          });
        }
      }

      return profile;
    }),

  /**
   * Create a development under the selected publisher context
   */
  createPlatformReferencePublisher: superAdminProcedure
    .input(
      z.object({
        // Identity
        brandName: z.string().min(2),
        brandTier: z.enum(['national', 'regional', 'boutique']).default('regional'),
        identityType: z.enum(['developer', 'marketing_agency', 'hybrid']).default('developer'),
        logoUrl: z.string().optional(),

        // Company Info
        description: z.string().optional(),
        sourceAttribution: z.string().min(3).optional(),
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
      }).strict(),
    )
    .mutation(async ({ input }) => {
      // Create a new platform-reference catalogue publisher.
      const result = await cataloguePublisherService.createPlatformReferencePublisher({
        brandName: input.brandName,
        brandTier: input.brandTier,
        identityType: input.identityType,
        logoUrl: input.logoUrl,

        // Map extended fields
        about: input.description,
        sourceAttribution: input.sourceAttribution,
        // Category is represented in the publisher's allowlisted property-focus
        // projection until publisher taxonomy is split into its own authority.
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

        // Project counts are derived elsewhere; they are not publisher write
        // authority and are intentionally not persisted here.

        isVisible: true,
      });

      return result;
    }),

  /**
   * Update an existing Catalogue Publisher
   */
  updatePublisher: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),

        // Identity
        brandName: z.string().min(2).optional(),
        brandTier: z.enum(['national', 'regional', 'boutique']).optional(),
        logoUrl: z.string().optional(),

        // Company Info
        description: z.string().optional(),
        sourceAttribution: z.string().min(3).optional(),
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
      }).strict(),
    )
    .mutation(async ({ input, ctx }) => {
      await requireActivePublisherContext(ctx, input.cataloguePublisherId);
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

      await cataloguePublisherService.updatePublisher(input.cataloguePublisherId, {
        brandName: input.brandName,
        brandTier: input.brandTier,
        logoUrl: input.logoUrl,
        about: input.description,
        sourceAttribution: input.sourceAttribution,
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
   * Delete a Catalogue Publisher
   */
  hidePublisher: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
        force: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      return await cataloguePublisherService.hidePublisher(
        input.cataloguePublisherId,
        input.force,
      );
    }),

  // ==========================================================================
  // Development Management (Context-Aware)
  // ==========================================================================

  /**
   * List developments for the selected publisher context
   */
  getDevelopments: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
        status: z.enum(['all', 'draft', 'pending', 'approved', 'rejected', 'published']).optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      try {
        // Use service to get developments specifically linked to this Catalogue Publisher
        return await cataloguePublisherService.getPublisherDevelopments(input.cataloguePublisherId);
      } catch (error) {
        console.warn(
          '[superAdminPublisher.getDevelopments] Returning empty list due to error:',
          error,
        );
        return [];
      }
    }),

  /**
   * Get one development for the selected publisher context.
   */
  getDevelopmentById: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
        developmentId: z.number().int(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      const dev = await developmentService.getDevelopmentWithPhases(input.developmentId);
      if (!dev || Number(dev.cataloguePublisherId || 0) !== Number(input.cataloguePublisherId)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Development not found or does not belong to this publisher context',
        });
      }

      return dev;
    }),

  /**
   * Update a development (must check publisher context ownership)
   */
  updateDevelopment: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
        developmentId: z.number().int(),
        data: z.any(), // Flexible partial update, validating ownership first
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const operatingContext = await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      const updated = await developmentService.updateDevelopment(
        input.developmentId,
        ctx.user.id,
        input.data as any,
        operatingContext,
      );

      return { success: true, development: updated };
    }),

  /**
   * Publish one development for the selected publisher context.
   */
  publishDevelopment: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
        developmentId: z.number().int(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const operatingContext = await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      const development = await developmentService.publishPlatformCuratedDevelopment(
        input.developmentId,
        ctx.user.id,
        operatingContext,
      );

      return { success: true, development };
    }),

  // ==========================================================================
  // Leads & Metrics (Context-Aware)
  // ==========================================================================

  /**
   * Get leads captured for this brand
   */
  getPublisherLeads: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      try {
        const dbConn = await db.getDb();
        if (!dbConn) return [];

        const publisherLeads = await dbConn
          .select()
          .from(leads)
          .where(eq(leads.cataloguePublisherId, input.cataloguePublisherId))
          .orderBy(desc(leads.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return publisherLeads;
      } catch (error) {
        console.warn(
          '[superAdminPublisher.getPublisherLeads] Returning empty list due to error:',
          error,
        );
        return [];
      }
    }),

  /**
   * Platform custody queue. This is deliberately super-admin-only: a
   * platform-curated lead has no customer organization recipient until an
   * explicit verified relationship exists.
   */
  getPlatformManagedLeads: superAdminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];

      const rows = await dbConn
        .select({
          lead: leads,
          property: properties,
          development: developments,
          brand: cataloguePublishers,
        })
        .from(leads)
        .leftJoin(properties, eq(leads.propertyId, properties.id))
        .leftJoin(developments, eq(leads.developmentId, developments.id))
        .leftJoin(cataloguePublishers, eq(leads.cataloguePublisherId, cataloguePublishers.id))
        .where(
          and(
            eq(leads.deliveryStatus, 'attention_required'),
            isNull(leads.agentId),
            isNull(leads.agencyId),
          ),
        )
        .orderBy(desc(leads.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows.map(row => ({
        ...row.lead,
        property: row.property,
        development: row.development,
        brand: row.brand,
      }));
    }),

  /**
   * Get global metrics across all brands (for header stats)
   */
  getGlobalMetrics: superAdminProcedure.query(async () => {
    try {
      const dbConn = await db.getDb();
      if (!dbConn) return { totalDevelopments: 0, totalLeads: 0 };

      // Count total developments
      const [devCount] = await dbConn.select({ count: sql<number>`count(*)` }).from(developments);

      // Count total leads
      const [leadCount] = await dbConn.select({ count: sql<number>`count(*)` }).from(leads);

      return {
        totalDevelopments: Number(devCount?.count || 0),
        totalLeads: Number(leadCount?.count || 0),
      };
    } catch (error) {
      console.warn(
        '[superAdminPublisher.getGlobalMetrics] Returning safe defaults due to error:',
        error,
      );
      return { totalDevelopments: 0, totalLeads: 0 };
    }
  }),

  /**
   * Get aggregated metrics for this brand
   */
  getPublisherMetrics: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      // Reuse the service's lead stats which aggregates leads, views, etc.
      return await cataloguePublisherService.getPublisherLeadStats(input.cataloguePublisherId);
    }),
});
