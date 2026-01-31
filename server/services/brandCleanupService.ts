/**
 * Brand Cleanup Service
 *
 * Provides safe cleanup operations for seeded platform-owned brands.
 * Ensures data integrity during cleanup operations.
 */

import { db } from '../db';
import {
  developerBrandProfiles,
  developments,
  leads,
  properties,
  listingMedia,
  developmentDrafts,
  developmentPhases,
  unitTypes,
  locations,
} from '../../drizzle/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
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

    // Count all related entities
    const [devCount] = await database
      .select({ count: sql<number>`count(*)` })
      .from(developments)
      .where(eq(developments.developerBrandProfileId, brandProfileId));

    const [propCount] = await database
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(eq(properties.developerBrandProfileId, brandProfileId));

    const [leadCount] = await database
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.developerBrandProfileId, brandProfileId));

    // Count media files (development and property media)
    const devMediaCount = await database
      .select({ count: sql<number>`count(*)` })
      .from(listingMedia)
      .where(
        and(
          eq(listingMedia.entityType, 'development'),
          sql`${listingMedia.entityId} IN (SELECT id FROM developments WHERE developer_brand_profile_id = ${brandProfileId})`,
        ),
      );

    const propMediaCount = await database
      .select({ count: sql<number>`count(*)` })
      .from(listingMedia)
      .where(
        and(
          eq(listingMedia.entityType, 'property'),
          sql`${listingMedia.entityId} IN (SELECT id FROM properties WHERE developer_brand_profile_id = ${brandProfileId})`,
        ),
      );

    const totalMedia = (devMediaCount[0]?.count || 0) + (propMediaCount[0]?.count || 0);

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
    if (leadCount && leadCount.count > 0) {
      recommendations.push(`Export ${leadCount.count} leads before deletion for CRM records`);
    }
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
        indexedContent: publicUrls, // Simplified - could include search engine indexed content
      },
      recommendations,
    };
  }

  /**
   * Perform safe brand cleanup with proper cascade handling
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
        // 1. Delete media files first (foreign key dependencies)
        if (impact.summary.mediaFiles > 0) {
          await tx.delete(listingMedia).where(
            sql`entity_type IN ('development', 'property') AND entity_id IN (
                SELECT id FROM developments WHERE developer_brand_profile_id = ${brandProfileId}
                UNION
                SELECT id FROM properties WHERE developer_brand_profile_id = ${brandProfileId}
              )`,
          );
          deletedItems.mediaFiles = impact.summary.mediaFiles;
        }

        // 2. Delete properties (if any)
        if (impact.summary.properties > 0) {
          const result = await tx
            .delete(properties)
            .where(eq(properties.developerBrandProfileId, brandProfileId));
          deletedItems.properties = impact.summary.properties;
        }

        // 3. Delete development-related entities
        if (impact.summary.developments > 0) {
          // Delete development phases
          await tx
            .delete(developmentPhases)
            .where(
              sql`development_id IN (SELECT id FROM developments WHERE developer_brand_profile_id = ${brandProfileId})`,
            );

          // Delete unit types
          await tx
            .delete(unitTypes)
            .where(
              sql`development_id IN (SELECT id FROM developments WHERE developer_brand_profile_id = ${brandProfileId})`,
            );

          // Delete development drafts
          await tx
            .delete(developmentDrafts)
            .where(
              sql`development_id IN (SELECT id FROM developments WHERE developer_brand_profile_id = ${brandProfileId})`,
            );

          // Delete the developments themselves
          await tx
            .delete(developments)
            .where(eq(developments.developerBrandProfileId, brandProfileId));
          deletedItems.developments = impact.summary.developments;
        }

        // 4. Delete leads
        if (impact.summary.leads > 0) {
          await tx.delete(leads).where(eq(leads.developerBrandProfileId, brandProfileId));
          deletedItems.leads = impact.summary.leads;
        }

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
  async exportBrandData(brandProfileId: number): Promise<any> {
    // This would generate a comprehensive export of all brand data
    // Implementation could include:
    // - Development details and media
    // - Property listings and media
    // - Lead information (anonymized if needed)
    // - Analytics data
    // - Audit trail

    const impact = await this.analyzeCleanupImpact(brandProfileId);

    return {
      exportedAt: new Date().toISOString(),
      brandProfileId,
      summary: impact.summary,
      // Implementation would include actual data export
      data: {
        // Comprehensive export data
      },
    };
  }
}

export const brandCleanupService = new BrandCleanupService();
