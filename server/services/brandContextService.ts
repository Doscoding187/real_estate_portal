/**
 * Brand Context Service
 *
 * Handles brand context switching for emulator mode.
 * Allows super admins to operate as platform-owned brand profiles.
 */

import { db } from '../db';
import { developerBrandProfiles } from '../../drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export type BrandContext = {
  brandProfileId: number;
  brandName: string;
  ownerType: 'platform' | 'developer';
  identityType: 'developer' | 'marketing_agency' | 'hybrid';
  brandTier: 'national' | 'regional' | 'boutique';
  isOperatingAs: boolean;
};

class BrandContextService {
  /**
   * Get all available platform-owned brand profiles for emulator mode
   */
  async getPlatformBrandProfiles(
    options: {
      search?: string;
      limit?: number;
    } = {},
  ): Promise<BrandContext[]> {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    let query = database
      .select({
        brandProfileId: developerBrandProfiles.id,
        brandName: developerBrandProfiles.brandName,
        ownerType: developerBrandProfiles.ownerType,
        identityType: developerBrandProfiles.identityType,
        brandTier: developerBrandProfiles.brandTier,
        isOperatingAs: developerBrandProfiles.linkedDeveloperAccountId, // Use as placeholder
      })
      .from(developerBrandProfiles)
      .where(
        and(
          eq(developerBrandProfiles.ownerType, 'platform'),
          eq(developerBrandProfiles.isVisible, 1),
          isNull(developerBrandProfiles.linkedDeveloperAccountId), // Not claimed by real developer
        ),
      )
      .limit(options.limit || 50);

    if (options.search) {
      query = query.where(
        and(
          eq(developerBrandProfiles.ownerType, 'platform'),
          eq(developerBrandProfiles.isVisible, 1),
          isNull(developerBrandProfiles.linkedDeveloperAccountId),
        ),
      );
    }

    const profiles = await query;

    return profiles.map(profile => ({
      ...profile,
      isOperatingAs: false,
    }));
  }

  /**
   * Get brand context by ID for emulator operations
   */
  async getBrandContext(brandProfileId: number): Promise<BrandContext> {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    const [profile] = await database
      .select({
        brandProfileId: developerBrandProfiles.id,
        brandName: developerBrandProfiles.brandName,
        ownerType: developerBrandProfiles.ownerType,
        identityType: developerBrandProfiles.identityType,
        brandTier: developerBrandProfiles.brandTier,
        isOperatingAs: developerBrandProfiles.linkedDeveloperAccountId,
      })
      .from(developerBrandProfiles)
      .where(
        and(
          eq(developerBrandProfiles.id, brandProfileId),
          eq(developerBrandProfiles.ownerType, 'platform'),
          eq(developerBrandProfiles.isVisible, 1),
        ),
      );

    if (!profile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Platform brand profile not found or not accessible',
      });
    }

    return {
      ...profile,
      isOperatingAs: true,
    };
  }

  /**
   * Verify brand context for super admin operations
   * This replaces the need for developer.getProfile in emulator mode
   */
  async verifyBrandContext(brandProfileId: number): Promise<BrandContext> {
    return await this.getBrandContext(brandProfileId);
  }

  /**
   * Check if a brand profile is platform-owned and available for emulator mode
   */
  async isPlatformBrandAvailable(brandProfileId: number): Promise<boolean> {
    try {
      const context = await this.getBrandContext(brandProfileId);
      return context.ownerType === 'platform' && !context.isOperatingAs;
    } catch {
      return false;
    }
  }
}

export const brandContextService = new BrandContextService();
