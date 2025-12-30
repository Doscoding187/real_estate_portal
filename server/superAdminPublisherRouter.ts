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
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return await developerBrandProfileService.listBrandProfiles({
        search: input.search,
        limit: input.limit,
        // We want all profiles including platform-owned ones
      });
    }),

  /**
   * Get full details of a specific brand profile for context hydration
   */
  getBrandContext: superAdminProcedure
    .input(z.object({
      brandProfileId: z.number().int(),
    }))
    .query(async ({ input }) => {
      return await developerBrandProfileService.getBrandProfileWithStats(input.brandProfileId);
    }),

  // ==========================================================================
  // Development Management (Context-Aware)
  // ==========================================================================

  /**
   * List developments for the selected brand context
   */
  getDevelopments: superAdminProcedure
    .input(z.object({
      brandProfileId: z.number().int(),
      status: z.enum(['all', 'draft', 'pending', 'approved', 'rejected', 'published']).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      // Use service to get developments specifically linked to this brand profile
      return await developerBrandProfileService.getBrandDevelopments(input.brandProfileId);
    }),

  /**
   * Create a development under the selected brand context
   */
  createDevelopment: superAdminProcedure
    .input(z.object({
      brandProfileId: z.number().int(),
      name: z.string().min(2),
      description: z.string().optional(),
      city: z.string(),
      province: z.string(),
      developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'estate', 'complex']),
    }))
    .mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error('Database not available');

      // Create development with explicit brand profile link and PLATFORM ownership
      const [result] = await dbConn.insert(developments).values({
        name: input.name,
        description: input.description,
        city: input.city,
        province: input.province,
        developmentType: input.developmentType,
        developerBrandProfileId: input.brandProfileId,
        devOwnerType: 'platform', // Crucial: distinct from subscriber-owned
        // Default platform-safe values
        isPublished: 0,
        approvalStatus: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        isFeatured: 0,
        slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4),
      });

      return { 
        id: result.insertId, 
        message: 'Development created under brand context' 
      };
    }),

  /**
   * Update a development (must check brand context ownership)
   */
  updateDevelopment: superAdminProcedure
    .input(z.object({
      brandProfileId: z.number().int(),
      developmentId: z.number().int(),
      data: z.any(), // Flexible partial update, validating ownership first
    }))
    .mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error('Database not available');

      // Verify ownership by brand profile
      const [dev] = await dbConn
        .select()
        .from(developments)
        .where(and(
          eq(developments.id, input.developmentId),
          eq(developments.developerBrandProfileId, input.brandProfileId)
        ));

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
    .input(z.object({
      brandProfileId: z.number().int(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
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
   * Get aggregated metrics for this brand
   */
  getBrandMetrics: superAdminProcedure
    .input(z.object({
      brandProfileId: z.number().int(),
    }))
    .query(async ({ input }) => {
      // Reuse the service's lead stats which aggregates leads, views, etc.
      return await developerBrandProfileService.getBrandLeadStats(input.brandProfileId);
    }),

});
