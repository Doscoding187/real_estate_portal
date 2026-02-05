/**
 * Brand Cleanup Service
 *
 * Provides safe cleanup operations for seeded platform-owned brands.
 * Ensures data integrity during cleanup operations.
 *
 * IMPORTANT: Uses Drizzle column references only (no raw SQL column names)
 * to prevent runtime errors from schema drift.
 */

import { db } from '../db';
import {
  developerBrandProfiles,
  developments,
  properties,
  listingMedia,
  developmentDrafts,
  developmentPhases,
  unitTypes,
  leads,
} from '../../drizzle/schema';
import { eq, and, sql, or, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { developerBrandProfileService } from './developerBrandProfileService';

export interface CleanupPlan {
  brandProfileId: number;
  brandName: string;
  canHardDelete: boolean;
  summary: {
    developments: number;
    properties: number;
    leads: number;
    mediaFiles: number;
  };
  impact: {
    publicUrls: string[];
    indexedContent: string[];
  };
  recommendations: string[];
}

export interface CleanupResult {
  success: boolean;
  mode: 'hard' | 'soft';
  deletedItems: {
    developments: number;
    properties: number;
    leads: number;
    mediaFiles: number;
  };
  preservedItems?: {
    brandProfile: boolean; // Soft deleted but preserved for audit
  };
}

class BrandCleanupService {
  /**
   * Analyze what would be affected by brand deletion
   */
  async analyzeCleanupImpact(brandProfileId: number): Promise<CleanupPlan> {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    // Verify brand can be operated on
    const verification = await developerBrandProfileService.verifyBrandOperation(
      'delete',
      brandProfileId,
    );
    if (!verification.canOperate) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: verification.reason || 'Cannot operate on this brand',
      });
    }

    const profile = verification.brandProfile!;

    // Count all related entities using Drizzle column refs
    const [devCount] = await database
      .select({ count: sql<number>`count(*)` })
      .from(developments)
      .where(eq(developments.developerBrandProfileId, brandProfileId));

    const [propCount] = await database
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(eq(properties.developerBrandProfileId, brandProfileId));

    // Count leads using developerBrandProfileId (now confirmed in DB + Drizzle)
    const [leadCount] = await database
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.developerBrandProfileId, brandProfileId));

    // Get development and property IDs for media counting
    const devIds = await database
      .select({ id: developments.id })
      .from(developments)
      .where(eq(developments.developerBrandProfileId, brandProfileId));

    const propIds = await database
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.developerBrandProfileId, brandProfileId));

    // Count media files using proper Drizzle conditions
    let totalMedia = 0;

    if (devIds.length > 0) {
      const [devMediaCount] = await database
        .select({ count: sql<number>`count(*)` })
        .from(listingMedia)
        .where(
          and(
            eq(listingMedia.entityType, 'development'),
            inArray(
              listingMedia.entityId,
              devIds.map(d => d.id),
            ),
          ),
        );
      totalMedia += devMediaCount?.count || 0;
    }

    if (propIds.length > 0) {
      const [propMediaCount] = await database
        .select({ count: sql<number>`count(*)` })
        .from(listingMedia)
        .where(
          and(
            eq(listingMedia.entityType, 'property'),
            inArray(
              listingMedia.entityId,
              propIds.map(p => p.id),
            ),
          ),
        );
      totalMedia += propMediaCount?.count || 0;
    }

    // Determine if hard delete is safe
    const hasDependencies =
      (devCount?.count || 0) > 0 || (propCount?.count || 0) > 0 || (leadCount?.count || 0) > 0;

    // Get public URLs that would be affected
    const publicUrls: string[] = [];
    if (devCount && devCount.count > 0) {
      publicUrls.push(`/developers/${profile.slug}`);
      publicUrls.push(`/brand/${profile.slug}`);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (devCount && devCount.count > 0) {
      recommendations.push(`Archive ${devCount.count} development data for future reference`);
    }
    if (totalMedia > 0) {
      recommendations.push(`Back up ${totalMedia} media files to external storage`);
    }

    return {
      brandProfileId,
      brandName: profile.brandName,
      canHardDelete: !hasDependencies,
      summary: {
        developments: devCount?.count || 0,
        properties: propCount?.count || 0,
        leads: leadCount?.count || 0,
        mediaFiles: totalMedia,
      },
      impact: {
        publicUrls,
        indexedContent: publicUrls,
      },
      recommendations,
    };
  }

  /**
   * Perform safe brand cleanup with proper cascade handling
   *
   * Uses precomputed IDs and Drizzle column references (no raw SQL column names)
   * to ensure schema drift is caught at compile time.
   */
  async executeCleanup(brandProfileId: number, confirm: boolean = false): Promise<CleanupResult> {
    if (!confirm) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cleanup must be confirmed. Set confirm=true to proceed.',
      });
    }

    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    // Verify brand can be operated on
    const verification = await developerBrandProfileService.verifyBrandOperation(
      'delete',
      brandProfileId,
    );
    if (!verification.canOperate) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: verification.reason || 'Cannot operate on this brand',
      });
    }

    const profile = verification.brandProfile!;
    const impact = await this.analyzeCleanupImpact(brandProfileId);

    // Begin transaction
    const deletedItems = {
      developments: 0,
      properties: 0,
      leads: 0,
      mediaFiles: 0,
    };

    try {
      await database.transaction(async tx => {
        // Precompute IDs once (stable + reusable)
        const devIdsRows = await tx
          .select({ id: developments.id })
          .from(developments)
          .where(eq(developments.developerBrandProfileId, brandProfileId));

        const devIds = devIdsRows.map(r => r.id);

        const propIdsRows = await tx
          .select({ id: properties.id })
          .from(properties)
          .where(eq(properties.developerBrandProfileId, brandProfileId));

        const propIds = propIdsRows.map(r => r.id);

        // 1. Delete media files (SAFE pairing with entityType + entityId)
        if (impact.summary.mediaFiles > 0) {
          const clauses = [];

          if (devIds.length) {
            clauses.push(
              and(
                eq(listingMedia.entityType, 'development'),
                inArray(listingMedia.entityId, devIds),
              ),
            );
          }
          if (propIds.length) {
            clauses.push(
              and(eq(listingMedia.entityType, 'property'), inArray(listingMedia.entityId, propIds)),
            );
          }

          if (clauses.length) {
            await tx.delete(listingMedia).where(or(...clauses));
          }
          deletedItems.mediaFiles = impact.summary.mediaFiles;
        }

        // 2. Delete properties
        if (propIds.length) {
          await tx.delete(properties).where(inArray(properties.id, propIds));
          deletedItems.properties = propIds.length;
        }

        // 3. Delete development children then developments
        if (devIds.length) {
          await tx
            .delete(developmentPhases)
            .where(inArray(developmentPhases.developmentId, devIds));
          await tx.delete(unitTypes).where(inArray(unitTypes.developmentId, devIds));
          await tx
            .delete(developmentDrafts)
            .where(inArray(developmentDrafts.developmentId, devIds));
          await tx.delete(developments).where(inArray(developments.id, devIds));
          deletedItems.developments = devIds.length;
        }

        // 4. Delete leads by developerBrandProfileId (column now confirmed in DB + Drizzle)
        await tx.delete(leads).where(eq(leads.developerBrandProfileId, brandProfileId));
        deletedItems.leads = impact.summary.leads;

        // 5. Handle brand profile based on whether hard delete is safe
        if (impact.canHardDelete) {
          await tx
            .delete(developerBrandProfiles)
            .where(eq(developerBrandProfiles.id, brandProfileId));
        } else {
          // Soft delete - hide and rename for audit trail
          await tx
            .update(developerBrandProfiles)
            .set({
              isVisible: 0,
              brandName: `${profile.brandName} (Deleted ${new Date().toISOString().split('T')[0]})`,
              slug: `deleted-${brandProfileId}-${Date.now()}`,
            })
            .where(eq(developerBrandProfiles.id, brandProfileId));
        }
      });

      return {
        success: true,
        mode: impact.canHardDelete ? 'hard' : 'soft',
        deletedItems,
        preservedItems: impact.canHardDelete
          ? undefined
          : {
              brandProfile: true,
            },
      };
    } catch (error) {
      console.error('Brand cleanup transaction failed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Cleanup operation failed. Database has been rolled back.',
      });
    }
  }

  /**
   * Export brand data before deletion
   */
  async exportBrandData(brandProfileId: number): Promise<{
    profile: any;
    developments: any[];
    properties: any[];
  }> {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    // Verify brand can be operated on
    const verification = await developerBrandProfileService.verifyBrandOperation(
      'export',
      brandProfileId,
    );
    if (!verification.canOperate) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: verification.reason || 'Cannot operate on this brand',
      });
    }

    const profile = verification.brandProfile;

    const devs = await database
      .select()
      .from(developments)
      .where(eq(developments.developerBrandProfileId, brandProfileId));

    const props = await database
      .select()
      .from(properties)
      .where(eq(properties.developerBrandProfileId, brandProfileId));

    return {
      profile,
      developments: devs,
      properties: props,
    };
  }
}

export const brandCleanupService = new BrandCleanupService();
