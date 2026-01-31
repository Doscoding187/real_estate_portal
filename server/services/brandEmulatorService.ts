/**
 * Brand Emulator Service
 *
 * Handles super admin brand emulator mode with proper identity resolution.
 * Replaces the problematic developer.getProfile calls with brand context.
 */

import { TRPCError } from '@trpc/server';
import { brandContextService } from './brandContextService';
import { db } from '../db';
import {
  developments,
  properties,
  listingMedia,
  leads,
  developerBrandProfiles,
  unitTypes,
} from '../../drizzle/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import type { BrandContext } from './brandContextService';

export type EmulatorOperation = {
  type: 'create' | 'update' | 'delete' | 'read';
  entityType: 'development' | 'property' | 'unit' | 'media' | 'lead';
  brandProfileId: number;
  data?: any;
  entityId?: number;
};

export type SeedingResult = {
  success: boolean;
  entityIds: number[];
  totalEntities: number;
  brandProfileId: number;
  brandProfileName: string;
  operation: string;
};

class BrandEmulatorService {
  /**
   * Get brand identity for emulator operations
   * This replaces developer.getProfile in emulator mode
   */
  async getBrandIdentity(brandProfileId: number): Promise<{
    id: number;
    name: string;
    type: 'developer' | 'marketing_agency' | 'hybrid';
    tier: 'national' | 'regional' | 'boutique';
    ownerType: 'platform';
  }> {
    const context = await brandContextService.verifyBrandContext(brandProfileId);

    return {
      id: context.brandProfileId,
      name: context.brandName,
      type: context.identityType,
      tier: context.brandTier,
      ownerType: context.ownerType,
    };
  }

  /**
   * Get emulated developer profile (bypasses developer.getProfile)
   * This is used by the developer router when in emulation mode
   */
  async getEmulatedDeveloperProfile(
    brandProfileId: number,
    actualUser: {
      id: number;
      email: string;
      name: string;
      role: string;
    },
  ): Promise<any> {
    const brandIdentity = await this.getBrandIdentity(brandProfileId);
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    // Get full brand profile details
    const [brandProfile] = await database
      .select()
      .from(developerBrandProfiles)
      .where(eq(developerBrandProfiles.id, brandProfileId));

    if (!brandProfile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Platform brand profile not found',
      });
    }

    // Transform brand profile to match developer profile structure
    return {
      id: brandProfileId,
      userId: actualUser.id, // Use super admin's user ID for context
      companyName: brandProfile.brandName,
      brandProfileId: brandProfile.id,
      logoUrl: brandProfile.logoUrl,
      about: brandProfile.about,
      websiteUrl: brandProfile.websiteUrl,
      foundedYear: brandProfile.foundedYear,
      headOfficeLocation: brandProfile.headOfficeLocation,
      operatingProvinces: brandProfile.operatingProvinces
        ? JSON.parse(brandProfile.operatingProvinces as string)
        : [],
      propertyFocus: brandProfile.propertyFocus
        ? JSON.parse(brandProfile.propertyFocus as string)
        : [],
      // Emulation-specific fields
      isEmulation: true,
      emulationType: 'developer',
      actualUser: actualUser,
      // Developer profile compatibility fields
      name: brandProfile.brandName,
      slug: brandProfile.slug,
      description: brandProfile.about,
      email: brandProfile.publicContactEmail,
      status: 'approved',
      isVerified: 1,
      city: brandProfile.headOfficeLocation,
      province: brandProfile.operatingProvinces
        ? JSON.parse(brandProfile.operatingProvinces as string)[0] || 'Gauteng'
        : 'Gauteng',
    };
  }

  /**
   * Seed development under brand profile
   */
  async seedDevelopment(brandProfileId: number, developmentData: any): Promise<SeedingResult> {
    const brandIdentity = await this.getBrandIdentity(brandProfileId);
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    try {
      // Insert development with brand profile attribution
      const [development] = await database
        .insert(developments)
        .values({
          ...developmentData,
          developerBrandProfileId: brandProfileId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .$returningId();

      // If unit types are included, seed them too
      let unitIds: number[] = [];
      if (developmentData.unitTypes && Array.isArray(developmentData.unitTypes)) {
        for (const unitType of developmentData.unitTypes) {
          const [unit] = await database
            .insert(unitTypes)
            .values({
              ...unitType,
              developmentId: development.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .$returningId();
          unitIds.push(unit.id);
        }
      }

      return {
        success: true,
        entityIds: [development.id, ...unitIds],
        totalEntities: 1 + unitIds.length,
        brandProfileId,
        brandProfileName: brandIdentity.name,
        operation: 'seed_development',
      };
    } catch (error) {
      console.error('[BrandEmulator] Failed to seed development:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to seed development under brand profile',
      });
    }
  }

  /**
   * Seed property under brand profile
   */
  async seedProperty(brandProfileId: number, propertyData: any): Promise<SeedingResult> {
    const brandIdentity = await this.getBrandIdentity(brandProfileId);
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    try {
      // Insert property with brand profile attribution
      const [property] = await database
        .insert(properties)
        .values({
          ...propertyData,
          developerBrandProfileId: brandProfileId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .$returningId();

      // If media URLs are included, seed them too
      let mediaIds: number[] = [];
      if (propertyData.mediaUrls && Array.isArray(propertyData.mediaUrls)) {
        for (let i = 0; i < propertyData.mediaUrls.length; i++) {
          const [media] = await database
            .insert(listingMedia)
            .values({
              propertyId: property.id,
              originalUrl: propertyData.mediaUrls[i],
              isPrimary: i === 0 ? 1 : 0,
              displayOrder: i,
              createdAt: new Date(),
            })
            .$returningId();
          mediaIds.push(media.id);
        }
      }

      return {
        success: true,
        entityIds: [property.id, ...mediaIds],
        totalEntities: 1 + mediaIds.length,
        brandProfileId,
        brandProfileName: brandIdentity.name,
        operation: 'seed_property',
      };
    } catch (error) {
      console.error('[BrandEmulator] Failed to seed property:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to seed property under brand profile',
      });
    }
  }

  /**
   * Generate lead for brand profile (simulated inquiry)
   */
  async generateLead(brandProfileId: number, leadData: any): Promise<SeedingResult> {
    const brandIdentity = await this.getBrandIdentity(brandProfileId);
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    try {
      const [lead] = await database
        .insert(leads)
        .values({
          ...leadData,
          developerBrandProfileId: brandProfileId,
          status: 'new',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .$returningId();

      // Increment lead count on brand profile
      await database
        .update(developerBrandProfiles)
        .set({
          totalLeadsReceived: sql`${developerBrandProfiles.totalLeadsReceived} + 1`,
          unclaimedLeadCount: sql`${developerBrandProfiles.unclaimedLeadCount} + 1`,
          lastLeadDate: new Date(),
        })
        .where(eq(developerBrandProfiles.id, brandProfileId));

      return {
        success: true,
        entityIds: [lead.id],
        totalEntities: 1,
        brandProfileId,
        brandProfileName: brandIdentity.name,
        operation: 'generate_lead',
      };
    } catch (error) {
      console.error('[BrandEmulator] Failed to generate lead:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate lead for brand profile',
      });
    }
  }

  /**
   * Get all entities associated with a brand profile
   */
  async getBrandEntities(brandProfileId: number): Promise<{
    developments: any[];
    properties: any[];
    leads: any[];
    totalEntities: number;
  }> {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    const [developments, properties, leads] = await Promise.all([
      database
        .select()
        .from(developments)
        .where(eq(developments.developerBrandProfileId, brandProfileId)),

      database
        .select()
        .from(properties)
        .where(eq(properties.developerBrandProfileId, brandProfileId)),

      database
        .select()
        .from(leads)
        .where(eq(leads.developerBrandProfileId, brandProfileId))
        .orderBy(desc(leads.createdAt)),
    ]);

    return {
      developments,
      properties,
      leads,
      totalEntities: developments.length + properties.length + leads.length,
    };
  }

  /**
   * Cleanup all entities associated with a brand profile
   * This is the critical cleanup function for demo data
   */
  async cleanupBrandEntities(brandProfileId: number): Promise<{
    deletedCounts: {
      developments: number;
      properties: number;
      leads: number;
      media: number;
      units: number;
    };
    success: boolean;
  }> {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    const deletedCounts = {
      developments: 0,
      properties: 0,
      leads: 0,
      media: 0,
      units: 0,
    };

    try {
      // Get all development IDs for this brand
      const brandDevelopments = await database
        .select({ id: developments.id })
        .from(developments)
        .where(eq(developments.developerBrandProfileId, brandProfileId));

      const developmentIds = brandDevelopments.map(d => d.id);

      if (developmentIds.length > 0) {
        // Delete unit types for these developments
        const deletedUnits = await database
          .delete(unitTypes)
          .where(eq(unitTypes.developmentId, developmentIds[0]));
        deletedCounts.units = deletedUnits.rowsAffected || 0;

        // Delete developments
        const deletedDevs = await database
          .delete(developments)
          .where(eq(developments.developerBrandProfileId, brandProfileId));
        deletedCounts.developments = deletedDevs.rowsAffected || 0;
      }

      // Get all property IDs for this brand
      const brandProperties = await database
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.developerBrandProfileId, brandProfileId));

      const propertyIds = brandProperties.map(p => p.id);

      if (propertyIds.length > 0) {
        // Delete media for these properties
        const deletedMedia = await database
          .delete(listingMedia)
          .where(eq(listingMedia.propertyId, propertyIds[0]));
        deletedCounts.media = deletedMedia.rowsAffected || 0;

        // Delete properties
        const deletedProps = await database
          .delete(properties)
          .where(eq(properties.developerBrandProfileId, brandProfileId));
        deletedCounts.properties = deletedProps.rowsAffected || 0;
      }

      // Delete leads
      const deletedLeadsResult = await database
        .delete(leads)
        .where(eq(leads.developerBrandProfileId, brandProfileId));
      deletedCounts.leads = deletedLeadsResult.rowsAffected || 0;

      // Reset brand profile stats
      await database
        .update(developerBrandProfiles)
        .set({
          totalLeadsReceived: 0,
          unclaimedLeadCount: 0,
          lastLeadDate: null,
        })
        .where(eq(developerBrandProfiles.id, brandProfileId));

      return {
        deletedCounts,
        success: true,
      };
    } catch (error) {
      console.error('[BrandEmulator] Cleanup failed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to cleanup brand entities',
      });
    }
  }

  /**
   * Verify brand context and return operating identity
   * This is the replacement for developer.getProfile in emulator mode
   */
  async verifyOperatingIdentity(brandProfileId: number): Promise<{
    developerId: number;
    brandProfileId: number;
    operatingMode: 'emulator';
    brandName: string;
  }> {
    const brandIdentity = await this.getBrandIdentity(brandProfileId);

    // In emulator mode, brandProfileId acts as developerId for ownership checks
    return {
      developerId: brandProfileId,
      brandProfileId,
      operatingMode: 'emulator',
      brandName: brandIdentity.name,
    };
  }
}

export const brandEmulatorService = new BrandEmulatorService();
