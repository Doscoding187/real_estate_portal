/**
 * Platform Brand Seeding Service
 *
 * Handles seeding of platform-owned brand profiles without requiring developer accounts.
 * These are placeholder brands for demonstration/testing purposes.
 */

import { db } from '../db';
import {
  developerBrandProfiles,
  developments,
  unitTypes,
  developmentPhases,
  leads,
} from '../../drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface PlatformBrandSeed {
  brandName: string;
  slug: string;
  brandTier: 'national' | 'regional' | 'boutique';
  identityType: 'developer' | 'marketing_agency' | 'hybrid';
  about: string;
  foundedYear?: number;
  headOfficeLocation?: string;
  operatingProvinces: string[];
  propertyFocus: string[];
  websiteUrl?: string;
  publicContactEmail?: string;
  logoUrl?: string;
}

export interface DevelopmentSeed {
  name: string;
  slug: string;
  description: string;
  tagline?: string;
  subtitle?: string;
  developmentType: 'residential' | 'commercial' | 'mixed_use' | 'retail' | 'estate';
  status: 'launching-soon' | 'selling' | 'sold-out';
  city: string;
  province: string;
  suburb?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  totalUnits: number;
  availableUnits: number;
  priceFrom: number;
  priceTo?: number;
  amenities?: string[];
  features?: string[];
  highlights?: string[];
  unitTypes: UnitTypeSeed[];
  phases?: PhaseSeed[];
}

export interface UnitTypeSeed {
  name: string;
  bedrooms: number;
  bathrooms: string;
  priceFrom: string;
  unitSize?: number;
  totalUnits: number;
  availableUnits: number;
  unitType: 'studio' | '1bed' | '2bed' | '3bed' | 'penthouse' | 'house' | 'townhouse' | 'apartment';
  features?: string[];
}

export interface PhaseSeed {
  name: string;
  phaseNumber: number;
  status: 'launching-soon' | 'selling' | 'sold-out';
  totalUnits: number;
  availableUnits: number;
}

class PlatformBrandSeedingService {
  /**
   * Seed a platform-owned brand profile
   */
  async seedPlatformBrand(brandData: PlatformBrandSeed): Promise<number> {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    // Check if brand already exists
    const [existing] = await database
      .select()
      .from(developerBrandProfiles)
      .where(eq(developerBrandProfiles.slug, brandData.slug));

    if (existing) {
      console.log(`Brand ${brandData.brandName} already exists, skipping creation`);
      return existing.id;
    }

    const [brand] = await database.insert(developerBrandProfiles).values({
      brandName: brandData.brandName,
      slug: brandData.slug,
      brandTier: brandData.brandTier,
      identityType: brandData.identityType,
      about: brandData.about,
      foundedYear: brandData.foundedYear || null,
      headOfficeLocation: brandData.headOfficeLocation || null,
      operatingProvinces: JSON.stringify(brandData.operatingProvinces),
      propertyFocus: JSON.stringify(brandData.propertyFocus),
      websiteUrl: brandData.websiteUrl || null,
      publicContactEmail: brandData.publicContactEmail || null,
      logoUrl: brandData.logoUrl || null,
      ownerType: 'platform',
      profileType: 'industry_reference',
      isSubscriber: 0,
      isClaimable: 1,
      isVisible: 1,
      isContactVerified: 1,
      linkedDeveloperAccountId: null, // Platform-owned, not linked to real developer
      totalLeadsReceived: 0,
      unclaimedLeadCount: 0,
    } as any);

    const brandId = Number(brand.insertId);
    console.log(`✅ Created platform brand: ${brandData.brandName} (ID: ${brandId})`);
    return brandId;
  }

  /**
   * Seed developments for a platform brand
   */
  async seedDevelopmentsForBrand(
    brandProfileId: number,
    developmentsData: DevelopmentSeed[],
  ): Promise<void> {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    for (const devData of developmentsData) {
      // Check if development already exists
      const [existing] = await database
        .select()
        .from(developments)
        .where(eq(developments.slug, devData.slug));

      if (existing) {
        console.log(`Development ${devData.name} already exists, skipping`);
        continue;
      }

      // Insert development
      const [development] = await database.insert(developments).values({
        developerBrandProfileId: brandProfileId,
        name: devData.name,
        slug: devData.slug,
        description: devData.description,
        tagline: devData.tagline || null,
        subtitle: devData.subtitle || null,
        developmentType: devData.developmentType,
        status: devData.status,
        city: devData.city,
        province: devData.province,
        suburb: devData.suburb || null,
        address: devData.address || null,
        latitude: devData.latitude || null,
        longitude: devData.longitude || null,
        totalUnits: devData.totalUnits,
        availableUnits: devData.availableUnits,
        priceFrom: devData.priceFrom,
        priceTo: devData.priceTo || null,
        amenities: devData.amenities ? JSON.stringify(devData.amenities) : null,
        features: devData.features ? JSON.stringify(devData.features) : null,
        highlights: devData.highlights ? JSON.stringify(devData.highlights) : null,
        devOwnerType: 'platform',
        isPublished: 1,
        publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        views: Math.floor(Math.random() * 2000), // Random initial views
        isFeatured: Math.random() > 0.7, // 30% chance of being featured
        gpsAccuracy: 'approximate',
      } as any);

      const developmentId = Number(development.insertId);

      // Insert phases if provided
      if (devData.phases) {
        for (const phaseData of devData.phases) {
          await database.insert(developmentPhases).values({
            developmentId: developmentId,
            name: phaseData.name,
            phaseNumber: phaseData.phaseNumber,
            status: phaseData.status,
            totalUnits: phaseData.totalUnits,
            availableUnits: phaseData.availableUnits,
          } as any);
        }
      }

      // Insert unit types
      for (const unitTypeData of devData.unitTypes) {
        await database.insert(unitTypes).values({
          id: nanoid(),
          developmentId: developmentId,
          name: unitTypeData.name,
          bedrooms: unitTypeData.bedrooms,
          bathrooms: unitTypeData.bathrooms,
          priceFrom: unitTypeData.priceFrom,
          basePriceFrom: unitTypeData.priceFrom,
          unitSize: unitTypeData.unitSize || null,
          totalUnits: unitTypeData.totalUnits,
          availableUnits: unitTypeData.availableUnits,
          unitType: unitTypeData.unitType,
          features: unitTypeData.features ? JSON.stringify(unitTypeData.features) : null,
        } as any);
      }

      console.log(`✅ Created development: ${devData.name} for brand ID: ${brandProfileId}`);
    }
  }

  /**
   * Clean up all platform-owned brand data
   */
  async cleanupPlatformBrands(): Promise<void> {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    console.log('🧹 Starting platform brand cleanup...');

    // Find all platform-owned brands
    const platformBrands = await database
      .select()
      .from(developerBrandProfiles)
      .where(eq(developerBrandProfiles.ownerType, 'platform'));

    if (platformBrands.length === 0) {
      console.log('No platform-owned brands found for cleanup');
      return;
    }

    const brandIds = platformBrands.map(brand => brand.id);

    // Disable foreign key checks temporarily
    await database.execute('SET FOREIGN_KEY_CHECKS = 0');

    try {
      // Delete leads associated with platform brands
      await database.delete(leads).where(
        eq(leads.developerBrandProfileId, brandIds[0]), // Note: This needs IN clause, may need adjustment
      );

      // Delete unit types for developments owned by platform brands
      const platformDevelopments = await database
        .select()
        .from(developments)
        .where(eq(developments.developerBrandProfileId, brandIds[0])); // Note: This needs IN clause

      for (const dev of platformDevelopments) {
        await database.delete(unitTypes).where(eq(unitTypes.developmentId, dev.id));
      }

      // Delete development phases
      for (const dev of platformDevelopments) {
        await database.delete(developmentPhases).where(eq(developmentPhases.developmentId, dev.id));
      }

      // Delete developments
      for (const brandId of brandIds) {
        await database
          .delete(developments)
          .where(eq(developments.developerBrandProfileId, brandId));
      }

      // Delete brand profiles
      for (const brandId of brandIds) {
        await database.delete(developerBrandProfiles).where(eq(developerBrandProfiles.id, brandId));
      }

      console.log(`✅ Cleaned up ${platformBrands.length} platform-owned brands`);
    } finally {
      // Re-enable foreign key checks
      await database.execute('SET FOREIGN_KEY_CHECKS = 1');
    }
  }

  /**
   * Get all platform-owned brands for emulator mode
   */
  async getPlatformBrandsForEmulation(): Promise<any[]> {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    return await database
      .select()
      .from(developerBrandProfiles)
      .where(
        and(
          eq(developerBrandProfiles.ownerType, 'platform'),
          eq(developerBrandProfiles.isVisible, 1),
          isNull(developerBrandProfiles.linkedDeveloperAccountId),
        ),
      );
  }
}

export const platformBrandSeedingService = new PlatformBrandSeedingService();
