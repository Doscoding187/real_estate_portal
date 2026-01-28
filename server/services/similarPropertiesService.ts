/**
 * Similar Properties Service
 * Calculates property similarity based on price, location, and features
 * Requirements: 15.1, 15.3, 15.4, 15.5
 */

import { db } from '../db';
import { exploreContent, properties } from '../../drizzle/schema';
import { eq, and, gte, lte, sql, ne, inArray } from 'drizzle-orm';

interface SimilarProperty {
  contentId: number;
  propertyId: number;
  title: string;
  price: number;
  location: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  thumbnailUrl?: string;
  similarityScore: number;
  matchReasons: string[];
}

interface SimilarityWeights {
  priceMatch: number;
  locationMatch: number;
  propertyTypeMatch: number;
  bedroomsMatch: number;
  bathroomsMatch: number;
  areaMatch: number;
}

export class SimilarPropertiesService {
  // Default similarity weights
  private readonly defaultWeights: SimilarityWeights = {
    priceMatch: 0.35, // 35% weight
    locationMatch: 0.25, // 25% weight
    propertyTypeMatch: 0.2, // 20% weight
    bedroomsMatch: 0.1, // 10% weight
    bathroomsMatch: 0.05, // 5% weight
    areaMatch: 0.05, // 5% weight
  };

  /**
   * Find similar properties based on a reference property
   * Requirement 15.1: Generate list of similar properties
   * Requirement 15.3: Consider price range (±20%), location, and features
   */
  async findSimilarProperties(
    propertyId: number,
    limit: number = 10,
    weights?: Partial<SimilarityWeights>,
  ): Promise<SimilarProperty[]> {
    // Get reference property
    const referenceProperty = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!referenceProperty[0]) {
      throw new Error('Reference property not found');
    }

    const ref = referenceProperty[0];

    // Calculate price range (±20%)
    const priceMin = ref.price ? ref.price * 0.8 : 0;
    const priceMax = ref.price ? ref.price * 1.2 : Number.MAX_SAFE_INTEGER;

    // Get candidate properties
    // Start with properties in similar price range
    let candidates = await db
      .select({
        id: properties.id,
        title: properties.title,
        price: properties.price,
        city: properties.city,
        province: properties.province,
        suburbId: properties.suburbId,
        propertyType: properties.propertyType,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        area: properties.area,
        latitude: properties.latitude,
        longitude: properties.longitude,
      })
      .from(properties)
      .where(
        and(
          ne(properties.id, propertyId), // Exclude reference property
          eq(properties.status, 'available'),
          gte(properties.price, priceMin),
          lte(properties.price, priceMax),
        ),
      )
      .limit(100); // Get more candidates for better filtering

    // If not enough candidates, expand search
    if (candidates.length < limit) {
      candidates = await this.expandSearch(ref, propertyId, limit * 2);
    }

    // Calculate similarity scores
    const mergedWeights = { ...this.defaultWeights, ...weights };
    const scoredProperties = candidates.map((candidate: any) => {
      const score = this.calculateSimilarityScore(ref, candidate, mergedWeights);
      const reasons = this.getMatchReasons(ref, candidate);

      return {
        contentId: 0, // Will be populated from explore_content if available
        propertyId: candidate.id,
        title: candidate.title,
        price: candidate.price || 0,
        location: `${candidate.city}, ${candidate.province}`,
        propertyType: candidate.propertyType,
        bedrooms: candidate.bedrooms || undefined,
        bathrooms: candidate.bathrooms || undefined,
        area: candidate.area || undefined,
        thumbnailUrl: undefined, // Will be populated from explore_content if available
        similarityScore: score,
        matchReasons: reasons,
      };
    });

    // Sort by similarity score and return top results
    const sortedProperties = scoredProperties
      .sort((a: any, b: any) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    // Try to populate explore content data if available
    const propertyIds = sortedProperties.map((p: any) => p.propertyId);
    const exploreData = await db
      .select({
        propertyId: exploreContent.id,
        contentId: exploreContent.id,
        thumbnailUrl: exploreContent.thumbnailUrl,
      })
      .from(exploreContent)
      .where(
        and(inArray(exploreContent.id, propertyIds), eq(exploreContent.contentType, 'property')),
      );

    // Merge explore data
    const exploreMap = new Map(exploreData.map((e: any) => [e.propertyId, e]));
    sortedProperties.forEach((prop: any) => {
      const exploreInfo: any = exploreMap.get(prop.propertyId);
      if (exploreInfo) {
        prop.contentId = exploreInfo.contentId;
        prop.thumbnailUrl = exploreInfo.thumbnailUrl || undefined;
      }
    });

    return sortedProperties;
  }

  /**
   * Calculate similarity score between two properties
   * Returns a score between 0 and 100
   */
  private calculateSimilarityScore(
    reference: any,
    candidate: any,
    weights: SimilarityWeights,
  ): number {
    let totalScore = 0;

    // Price similarity (±20% = 100%, beyond that decreases)
    if (reference.price && candidate.price) {
      const priceDiff = Math.abs(reference.price - candidate.price) / reference.price;
      const priceScore = Math.max(0, 100 - priceDiff * 500); // 20% diff = 0 score
      totalScore += priceScore * weights.priceMatch;
    }

    // Location similarity
    const locationScore = this.calculateLocationScore(reference, candidate);
    totalScore += locationScore * weights.locationMatch;

    // Property type match
    if (reference.propertyType === candidate.propertyType) {
      totalScore += 100 * weights.propertyTypeMatch;
    }

    // Bedrooms match
    if (reference.bedrooms && candidate.bedrooms) {
      const bedroomDiff = Math.abs(reference.bedrooms - candidate.bedrooms);
      const bedroomScore = Math.max(0, 100 - bedroomDiff * 25); // 1 diff = 75, 2 diff = 50, etc.
      totalScore += bedroomScore * weights.bedroomsMatch;
    }

    // Bathrooms match
    if (reference.bathrooms && candidate.bathrooms) {
      const bathroomDiff = Math.abs(reference.bathrooms - candidate.bathrooms);
      const bathroomScore = Math.max(0, 100 - bathroomDiff * 25);
      totalScore += bathroomScore * weights.bathroomsMatch;
    }

    // Area match (±20% = 100%)
    if (reference.area && candidate.area) {
      const areaDiff = Math.abs(reference.area - candidate.area) / reference.area;
      const areaScore = Math.max(0, 100 - areaDiff * 500);
      totalScore += areaScore * weights.areaMatch;
    }

    return Math.round(totalScore);
  }

  /**
   * Calculate location similarity score
   * Same suburb = 100, same city = 70, same province = 40, different = 0
   */
  private calculateLocationScore(reference: any, candidate: any): number {
    // Same suburb (best match)
    if (reference.suburbId && candidate.suburbId && reference.suburbId === candidate.suburbId) {
      return 100;
    }

    // Same city (good match)
    if (reference.city && candidate.city && reference.city === candidate.city) {
      return 70;
    }

    // Same province (okay match)
    if (reference.province && candidate.province && reference.province === candidate.province) {
      return 40;
    }

    // If we have coordinates, calculate distance
    if (reference.latitude && reference.longitude && candidate.latitude && candidate.longitude) {
      const distance = this.calculateDistance(
        reference.latitude,
        reference.longitude,
        candidate.latitude,
        candidate.longitude,
      );

      // Within 5km = 90, 10km = 70, 20km = 50, 50km = 20, beyond = 0
      if (distance <= 5) return 90;
      if (distance <= 10) return 70;
      if (distance <= 20) return 50;
      if (distance <= 50) return 20;
    }

    return 0;
  }

  /**
   * Calculate distance between two coordinates in kilometers
   * Using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Get human-readable match reasons
   */
  private getMatchReasons(reference: any, candidate: any): string[] {
    const reasons: string[] = [];

    // Price match
    if (reference.price && candidate.price) {
      const priceDiff = Math.abs(reference.price - candidate.price) / reference.price;
      if (priceDiff <= 0.1) {
        reasons.push('Similar price');
      } else if (priceDiff <= 0.2) {
        reasons.push('Comparable price');
      }
    }

    // Location match
    if (reference.suburbId === candidate.suburbId && reference.suburbId) {
      reasons.push('Same suburb');
    } else if (reference.city === candidate.city) {
      reasons.push('Same city');
    } else if (reference.province === candidate.province) {
      reasons.push('Same province');
    }

    // Property type match
    if (reference.propertyType === candidate.propertyType) {
      reasons.push('Same property type');
    }

    // Bedrooms match
    if (reference.bedrooms === candidate.bedrooms) {
      reasons.push('Same bedrooms');
    }

    // Bathrooms match
    if (reference.bathrooms === candidate.bathrooms) {
      reasons.push('Same bathrooms');
    }

    // Area match
    if (reference.area && candidate.area) {
      const areaDiff = Math.abs(reference.area - candidate.area) / reference.area;
      if (areaDiff <= 0.1) {
        reasons.push('Similar size');
      }
    }

    return reasons;
  }

  /**
   * Expand search when not enough similar properties found
   * Requirement 15.5: Expand search radius and adjust price range
   */
  private async expandSearch(reference: any, excludeId: number, limit: number): Promise<any[]> {
    // Expand price range to ±40%
    const priceMin = reference.price ? reference.price * 0.6 : 0;
    const priceMax = reference.price ? reference.price * 1.4 : Number.MAX_SAFE_INTEGER;

    // Get properties with expanded criteria
    const expanded = await db
      .select({
        id: properties.id,
        title: properties.title,
        price: properties.price,
        city: properties.city,
        province: properties.province,
        suburbId: properties.suburbId,
        propertyType: properties.propertyType,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        area: properties.area,
        latitude: properties.latitude,
        longitude: properties.longitude,
      })
      .from(properties)
      .where(
        and(
          ne(properties.id, excludeId),
          eq(properties.status, 'available'),
          gte(properties.price, priceMin),
          lte(properties.price, priceMax),
        ),
      )
      .limit(limit);

    return expanded;
  }

  /**
   * Track which similar properties get engagement
   * Requirement 15.4: Adjust similarity weights based on interactions
   */
  async recordSimilarPropertyEngagement(
    referencePropertyId: number,
    similarPropertyId: number,
    engagementType: 'view' | 'save' | 'click',
  ): Promise<void> {
    // TODO: Store engagement data for algorithm refinement
    // This can be used to adjust weights over time
    // For now, just log it
    console.log(
      `Similar property engagement: ${referencePropertyId} -> ${similarPropertyId} (${engagementType})`,
    );

    // In production, you would:
    // 1. Store this in a tracking table
    // 2. Periodically analyze which similarities lead to engagement
    // 3. Adjust weights accordingly
    // 4. Use machine learning to optimize similarity algorithm
  }

  /**
   * Get refined weights based on user engagement history
   * Requirement 15.4: Algorithm refinement
   */
  async getRefinedWeights(userId: number): Promise<SimilarityWeights> {
    // TODO: Implement ML-based weight refinement
    // For now, return default weights
    // In production, analyze user's engagement patterns and adjust weights

    return this.defaultWeights;
  }
}

export const similarPropertiesService = new SimilarPropertiesService();
