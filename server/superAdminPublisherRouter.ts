import { z } from 'zod';
import { router, superAdminProcedure } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
import { cataloguePublisherService } from './services/cataloguePublisherService';
import {
  cataloguePublishers,
  developmentDrafts,
  developments,
  leads,
  properties,
} from '../drizzle/schema';
import { eq, desc, and, isNull, sql } from 'drizzle-orm';
import { developmentService } from './services/developmentService';
import { resolveOperatingIdentity } from './_core/identityResolver';
import type { EnhancedTRPCContext } from './_core/publisherContext';
import { sanitizeDraftData } from './lib/sanitizeDraftData';
import { getDeveloperOperatingHome } from './services/developerOperatingHome';

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

      // Call service with operating context for identity resolution
      const development = await developmentService.createDevelopment(
        ctx.user.id,
        input as any,
        { cataloguePublisherId: input.cataloguePublisherId },
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
        sourceAttribution: z.string().trim().min(3),
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
  getOperatingHome: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
        range: z.enum(['7d', '30d', '90d']).default('30d'),
      }),
    )
    .query(async ({ input, ctx }) => {
      const operatingContext = await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      const home = await getDeveloperOperatingHome({
        scope: {
          mode: 'platform_curator',
          cataloguePublisherId: operatingContext.cataloguePublisherId,
        },
        range: input.range,
      });
      const publisher = await cataloguePublisherService.getPublisherById(
        operatingContext.cataloguePublisherId,
      );
      if (!publisher) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Catalogue Publisher not found in the active platform context.',
        });
      }

      const reviewedAt =
        home.developments
          .map(development => development.lifecycle.latestReview?.reviewedAt)
          .filter((value): value is string => Boolean(value))
          .sort();
      const lastVerifiedAt = reviewedAt[reviewedAt.length - 1] ?? null;

      return {
        ...home,
        publisher: {
          id: publisher.id,
          name: publisher.brandName,
          slug: publisher.slug,
          authorityKind: publisher.authorityKind,
          developerOrganisationId: publisher.developerOrganisationId,
          sourceAttribution: publisher.sourceAttribution,
          websiteUrl: publisher.websiteUrl,
          isVisible: Number(publisher.isVisible) === 1,
        },
        publication: {
          launchAccessRequired: false,
          lastVerifiedAt,
        },
      };
    }),

  saveDraft: superAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        cataloguePublisherId: z.number().int(),
        draftData: z.any(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const operatingContext = await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      const sanitized = sanitizeDraftData(input.draftData ?? {});
      const currentStep = Math.max(0, Number((sanitized as any).currentPhase ?? 0));
      const progress = Math.min(100, Math.max(0, Math.round((currentStep / 11) * 100)));
      const draftName =
        String((sanitized as any).developmentData?.name ?? (sanitized as any).name ?? '').trim() ||
        'Untitled Curated Draft';
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }

      const scope = and(
        eq(developmentDrafts.cataloguePublisherId, operatingContext.cataloguePublisherId),
        isNull(developmentDrafts.developerOrganisationId),
      );

      if (input.id) {
        const [existing] = await database
          .select({ id: developmentDrafts.id })
          .from(developmentDrafts)
          .where(and(eq(developmentDrafts.id, input.id), scope))
          .limit(1);
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Curated draft not found' });
        }

        await database
          .update(developmentDrafts)
          .set({
            draftName,
            draftData: sanitized,
            progress,
            currentStep,
            cataloguePublisherId: operatingContext.cataloguePublisherId,
            developerOrganisationId: null,
          })
          .where(and(eq(developmentDrafts.id, input.id), scope));

        return { id: input.id, success: true, draftData: sanitized };
      }

      const insertResult = await database.insert(developmentDrafts).values({
        developerOrganisationId: null,
        cataloguePublisherId: operatingContext.cataloguePublisherId,
        draftName,
        draftData: sanitized,
        progress,
        currentStep,
      });
      const inserted = Array.isArray(insertResult) ? insertResult[0] : insertResult;
      return {
        id: Number((inserted as any)?.insertId ?? 0),
        success: true,
        draftData: sanitized,
      };
    }),

  getDraft: superAdminProcedure
    .input(z.object({ cataloguePublisherId: z.number().int(), id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const operatingContext = await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }

      const [draft] = await database
        .select()
        .from(developmentDrafts)
        .where(
          and(
            eq(developmentDrafts.id, input.id),
            eq(developmentDrafts.cataloguePublisherId, operatingContext.cataloguePublisherId),
            isNull(developmentDrafts.developerOrganisationId),
          ),
        )
        .limit(1);
      if (!draft) return null;
      return { ...draft, draftData: sanitizeDraftData((draft as any).draftData ?? {}) };
    }),

  getDrafts: superAdminProcedure
    .input(z.object({ cataloguePublisherId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const operatingContext = await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }

      const drafts = await database
        .select()
        .from(developmentDrafts)
        .where(
          and(
            eq(developmentDrafts.cataloguePublisherId, operatingContext.cataloguePublisherId),
            isNull(developmentDrafts.developerOrganisationId),
          ),
        )
        .orderBy(desc(developmentDrafts.lastModified));
      return drafts.map((draft: any) => ({
        ...draft,
        draftData: sanitizeDraftData(draft.draftData ?? {}),
      }));
    }),

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
      return cataloguePublisherService.getPublisherDevelopments(input.cataloguePublisherId);
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

  submitDevelopment: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
        developmentId: z.number().int(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const operatingContext = await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      const development = await developmentService.submitPlatformCuratedDevelopment(
        input.developmentId,
        ctx.user.id,
        operatingContext,
      );
      return { success: true, development };
    }),

  reviewDevelopment: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
        developmentId: z.number().int(),
        decision: z.enum(['approved', 'rejected', 'changes_requested']),
        feedback: z.string().trim().max(2000).optional(),
        complianceChecks: z.record(z.boolean()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const operatingContext = await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      if (input.decision === 'rejected' && !input.feedback?.trim()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Rejection feedback is required when a curated development is rejected.',
        });
      }
      const development = await developmentService.reviewPlatformCuratedDevelopment(
        input.developmentId,
        ctx.user.id,
        operatingContext,
        input.decision,
        input.decision === 'rejected'
          ? { rejectionReason: input.feedback, complianceChecks: input.complianceChecks }
          : { reviewNotes: input.feedback, complianceChecks: input.complianceChecks },
      );
      return { success: true, development };
    }),

  unpublishDevelopment: superAdminProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int(),
        developmentId: z.number().int(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const operatingContext = await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      const development = await developmentService.unpublishPlatformCuratedDevelopment(
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
        developmentId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireActivePublisherContext(ctx, input.cataloguePublisherId);
      const dbConn = await db.getDb();
      if (!dbConn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }

      const publisherLeads = await dbConn
        .select({
          lead: leads,
          development: {
            id: developments.id,
            name: developments.name,
            slug: developments.slug,
          },
        })
        .from(leads)
        .leftJoin(developments, eq(leads.developmentId, developments.id))
        .where(
          and(
            eq(leads.cataloguePublisherId, input.cataloguePublisherId),
            input.developmentId ? eq(leads.developmentId, input.developmentId) : undefined,
          ),
        )
        .orderBy(desc(leads.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return publisherLeads.map(row => ({
        ...row.lead,
        development: row.development,
      }));
    }),

  /**
   * Platform custody queue. This is deliberately super-admin-only: every
   * public lead marked attention_required without an agent/agency recipient
   * must have an explicit monitored Property Listify operations destination.
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
      if (!dbConn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }

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
