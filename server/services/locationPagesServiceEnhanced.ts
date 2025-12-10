/**
 * Enhanced Location Pages Service with Google Places Integration
 * 
 * This service extends the existing locationPagesService with Google Places integration
 * to support automatic location record creation and hierarchy management.
 * 
 * Requirements:
 * - 16.1-16.5: Automatic location record creation from listings
 * - 27.1-27.5: SEO-friendly slugs and static content generation
 */

import { getDb } from '../db';
import { locations, provinces, cities, suburbs } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { PlaceDetails, extractHierarchy, LocationHierarchy } from './googlePlacesService';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface LocationInput {
  name: string;
  type: 'province' | 'city' | 'suburb' | 'neighborhood';
  parentId?: number;
  placeId?: string;
  latitude?: string;
  longitude?: string;
  viewportNeLat?: number;
  viewportNeLng?: number;
  viewportSwLat?: number;
  viewportSwLng?: number;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  heroImage?: string;
}

export interface Location {
  id: number;
  name: string;
  slug: string;
  type: 'province' | 'city' | 'suburb' | 'neighborhood';
  parentId: number | null;
  placeId: string | null;
  description: string | null;
  latitude: string | null;
  longitude: string | null;
  viewportNeLat: string | null;
  viewportNeLng: string | null;
  viewportSwLat: string | null;
  viewportSwLng: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroImage: string | null;
  propertyCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SEOContent {
  title: string;
  description: string;
  heroImage?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate SEO-friendly slug from location name
 * Requirements 27.2: Generate unique SEO-friendly slug in kebab-case format
 * 
 * Property 34: Slug generation format
 * For any location name, the generated slug should be in kebab-case format
 * (lowercase with hyphens replacing spaces and special characters removed)
 * 
 * @param name - Location name
 * @returns Kebab-case slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate SEO content for a location
 * Requirements 27.3, 27.4: Generate static description and SEO metadata
 * 
 * @param location - Location data
 * @param hierarchy - Optional hierarchy information
 * @returns SEO content (title, description, hero image)
 */
export function generateSEOContent(
  location: LocationInput,
  hierarchy?: { province?: string; city?: string }
): SEOContent {
  const { name, type } = location;
  
  // Generate title based on location type
  let title: string;
  let description: string;
  
  switch (type) {
    case 'province':
      title = `Properties for Sale & Rent in ${name} | Property Listify`;
      description = `Discover properties for sale and rent in ${name}. Browse houses, apartments, and new developments across ${name}'s cities and suburbs. Find your dream property today.`;
      break;
      
    case 'city':
      const provinceName = hierarchy?.province || name;
      title = `${name} Properties for Sale & Rent | ${provinceName}`;
      description = `Explore properties in ${name}, ${provinceName}. Find houses, apartments, and new developments in ${name}'s best suburbs. View listings, prices, and market insights.`;
      break;
      
    case 'suburb':
    case 'neighborhood':
      const cityName = hierarchy?.city || 'the area';
      const provinceContext = hierarchy?.province ? `, ${hierarchy.province}` : '';
      title = `${name} Properties for Sale & Rent | ${cityName}${provinceContext}`;
      description = `Find properties in ${name}, ${cityName}. Browse houses, apartments, and new developments in ${name}. View current listings, average prices, and neighborhood insights.`;
      break;
      
    default:
      title = `${name} Properties | Property Listify`;
      description = `Discover properties in ${name}. Browse listings, view prices, and explore the area.`;
  }
  
  return {
    title,
    description,
    heroImage: location.heroImage,
  };
}

// ============================================================================
// Enhanced Location Pages Service
// ============================================================================

export const locationPagesServiceEnhanced = {
  
  /**
   * Find or create a location record
   * Requirements 16.2: Automatically create location record with static SEO content
   * 
   * Property 19: Location record creation
   * For any new suburb added via listing, a location record should be created
   * with name, slug, type, and coordinates
   * 
   * @param input - Location input data
   * @returns Created or existing location record
   */
  async findOrCreateLocation(input: LocationInput): Promise<Location> {
    const db = await getDb();
    
    // Check if location already exists by Place ID (if provided)
    if (input.placeId) {
      const [existing] = await db
        .select()
        .from(locations)
        .where(eq(locations.placeId, input.placeId))
        .limit(1);
      
      if (existing) {
        console.log(`[LocationPagesEnhanced] Found existing location by Place ID: ${existing.name}`);
        return existing as Location;
      }
    }
    
    // Generate slug
    const slug = generateSlug(input.name);
    
    // Check if slug already exists within the same parent
    // Property 39: Slug uniqueness within parent
    const existingBySlug = await db
      .select()
      .from(locations)
      .where(
        input.parentId
          ? and(eq(locations.slug, slug), eq(locations.parentId, input.parentId))
          : eq(locations.slug, slug)
      )
      .limit(1);
    
    if (existingBySlug.length > 0) {
      console.log(`[LocationPagesEnhanced] Found existing location by slug: ${existingBySlug[0].name}`);
      return existingBySlug[0] as Location;
    }
    
    // Generate SEO content
    const seoContent = generateSEOContent(input);
    
    // Create new location record
    const [newLocation] = await db
      .insert(locations)
      .values({
        name: input.name,
        slug,
        type: input.type,
        parentId: input.parentId || null,
        placeId: input.placeId || null,
        description: input.description || seoContent.description,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        viewportNeLat: input.viewportNeLat ? input.viewportNeLat.toString() : null,
        viewportNeLng: input.viewportNeLng ? input.viewportNeLng.toString() : null,
        viewportSwLat: input.viewportSwLat ? input.viewportSwLat.toString() : null,
        viewportSwLng: input.viewportSwLng ? input.viewportSwLng.toString() : null,
        seoTitle: input.seoTitle || seoContent.title,
        seoDescription: input.seoDescription || seoContent.description,
        heroImage: input.heroImage || seoContent.heroImage || null,
        propertyCount: 0,
      })
      .$returningId();
    
    // Fetch the created location
    const [created] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, newLocation.id))
      .limit(1);
    
    console.log(`[LocationPagesEnhanced] Created new location: ${created.name} (${created.type})`);
    
    return created as Location;
  },
  
  /**
   * Resolve location hierarchy from Google Places data
   * Requirements 16.5: Maintain hierarchical relationships (suburb → city → province)
   * 
   * Property 20: Hierarchical integrity
   * For any location record with a parent_id, the parent location should exist
   * 
   * @param placeDetails - Place details from Google Places API
   * @returns Location hierarchy with IDs
   */
  async resolveLocationHierarchy(placeDetails: PlaceDetails): Promise<{
    province: Location | null;
    city: Location | null;
    suburb: Location | null;
  }> {
    const hierarchy = extractHierarchy(placeDetails);
    
    let provinceLocation: Location | null = null;
    let cityLocation: Location | null = null;
    let suburbLocation: Location | null = null;
    
    // Create/find province
    if (hierarchy.province) {
      provinceLocation = await this.findOrCreateLocation({
        name: hierarchy.province,
        type: 'province',
        placeId: undefined, // Province doesn't have a specific Place ID from this call
        latitude: hierarchy.coordinates.lat.toString(),
        longitude: hierarchy.coordinates.lng.toString(),
      });
    }
    
    // Create/find city
    if (hierarchy.city && provinceLocation) {
      cityLocation = await this.findOrCreateLocation({
        name: hierarchy.city,
        type: 'city',
        parentId: provinceLocation.id,
        placeId: undefined, // City doesn't have a specific Place ID from this call
        latitude: hierarchy.coordinates.lat.toString(),
        longitude: hierarchy.coordinates.lng.toString(),
      });
    }
    
    // Create/find suburb
    if (hierarchy.suburb && cityLocation) {
      suburbLocation = await this.findOrCreateLocation({
        name: hierarchy.suburb,
        type: 'suburb',
        parentId: cityLocation.id,
        placeId: placeDetails.placeId,
        latitude: hierarchy.coordinates.lat.toString(),
        longitude: hierarchy.coordinates.lng.toString(),
        viewportNeLat: hierarchy.viewport?.northeast.lat,
        viewportNeLng: hierarchy.viewport?.northeast.lng,
        viewportSwLat: hierarchy.viewport?.southwest.lat,
        viewportSwLng: hierarchy.viewport?.southwest.lng,
      });
    }
    
    return {
      province: provinceLocation,
      city: cityLocation,
      suburb: suburbLocation,
    };
  },
  
  /**
   * Sync provinces/cities/suburbs tables with locations table
   * Requirements 16.1: Store location data in structured format
   * 
   * This method ensures that the legacy provinces/cities/suburbs tables
   * are kept in sync with the new locations table for backward compatibility.
   * 
   * @param locationId - Location ID to sync
   */
  async syncLegacyTables(locationId: number): Promise<void> {
    const db = await getDb();
    
    // Get the location
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1);
    
    if (!location) {
      console.warn(`[LocationPagesEnhanced] Location ${locationId} not found for sync`);
      return;
    }
    
    // Sync based on location type
    switch (location.type) {
      case 'province':
        // Check if province exists
        const [existingProvince] = await db
          .select()
          .from(provinces)
          .where(eq(provinces.name, location.name))
          .limit(1);
        
        if (!existingProvince) {
          await db.insert(provinces).values({
            name: location.name,
            slug: location.slug,
            placeId: location.placeId,
            seoTitle: location.seoTitle,
            seoDescription: location.seoDescription,
          });
          console.log(`[LocationPagesEnhanced] Synced province: ${location.name}`);
        }
        break;
      
      case 'city':
        // Get parent province
        if (location.parentId) {
          const [parentLocation] = await db
            .select()
            .from(locations)
            .where(eq(locations.id, location.parentId))
            .limit(1);
          
          if (parentLocation) {
            const [province] = await db
              .select()
              .from(provinces)
              .where(eq(provinces.name, parentLocation.name))
              .limit(1);
            
            if (province) {
              // Check if city exists
              const [existingCity] = await db
                .select()
                .from(cities)
                .where(and(
                  eq(cities.name, location.name),
                  eq(cities.provinceId, province.id)
                ))
                .limit(1);
              
              if (!existingCity) {
                await db.insert(cities).values({
                  name: location.name,
                  slug: location.slug,
                  provinceId: province.id,
                  placeId: location.placeId,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  seoTitle: location.seoTitle,
                  seoDescription: location.seoDescription,
                  isMetro: 0,
                });
                console.log(`[LocationPagesEnhanced] Synced city: ${location.name}`);
              }
            }
          }
        }
        break;
      
      case 'suburb':
        // Get parent city
        if (location.parentId) {
          const [parentLocation] = await db
            .select()
            .from(locations)
            .where(eq(locations.id, location.parentId))
            .limit(1);
          
          if (parentLocation) {
            const [city] = await db
              .select()
              .from(cities)
              .where(eq(cities.name, parentLocation.name))
              .limit(1);
            
            if (city) {
              // Check if suburb exists
              const [existingSuburb] = await db
                .select()
                .from(suburbs)
                .where(and(
                  eq(suburbs.name, location.name),
                  eq(suburbs.cityId, city.id)
                ))
                .limit(1);
              
              if (!existingSuburb) {
                await db.insert(suburbs).values({
                  name: location.name,
                  slug: location.slug,
                  cityId: city.id,
                  placeId: location.placeId,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  seoTitle: location.seoTitle,
                  seoDescription: location.seoDescription,
                });
                console.log(`[LocationPagesEnhanced] Synced suburb: ${location.name}`);
              }
            }
          }
        }
        break;
    }
  },
  
  /**
   * Get location by hierarchical path
   * Requirements 29.1-29.3: Support hierarchical URL patterns
   * 
   * @param province - Province slug
   * @param city - City slug (optional)
   * @param suburb - Suburb slug (optional)
   * @returns Location record
   */
  async getLocationByPath(
    province: string,
    city?: string,
    suburb?: string
  ): Promise<Location | null> {
    const db = await getDb();
    
    // If suburb is provided, find it
    if (suburb) {
      const [location] = await db
        .select()
        .from(locations)
        .where(and(
          eq(locations.slug, suburb),
          eq(locations.type, 'suburb')
        ))
        .limit(1);
      
      return location as Location || null;
    }
    
    // If city is provided, find it
    if (city) {
      const [location] = await db
        .select()
        .from(locations)
        .where(and(
          eq(locations.slug, city),
          eq(locations.type, 'city')
        ))
        .limit(1);
      
      return location as Location || null;
    }
    
    // Otherwise, find province
    const [location] = await db
      .select()
      .from(locations)
      .where(and(
        eq(locations.slug, province),
        eq(locations.type, 'province')
      ))
      .limit(1);
    
    return location as Location || null;
  },
  
  /**
   * Resolve location from Place ID or location data
   * Requirements 16.1-16.5: Link listings to locations via location_id
   * Requirements 25.1: Store Place ID with listing data
   * 
   * This is the main integration point for listing/development creation.
   * It takes location data from the autocomplete and creates/finds the
   * appropriate location record with full hierarchy.
   * 
   * Property 32: Place ID storage on selection
   * For any location selected from autocomplete, the Place ID should be stored
   * 
   * @param locationData - Location data from autocomplete or manual entry
   * @returns Location record with ID for foreign key reference
   */
  async resolveLocation(locationData: {
    placeId?: string;
    address: string;
    latitude: number;
    longitude: number;
    city: string;
    suburb?: string;
    province: string;
    postalCode?: string;
  }): Promise<Location> {
    console.log('[LocationPagesEnhanced] Resolving location:', locationData);
    
    // If we have a Place ID, try to fetch full details from Google Places
    if (locationData.placeId) {
      try {
        const { googlePlacesService } = await import('./googlePlacesService');
        const placeDetails = await googlePlacesService.getPlaceDetails(locationData.placeId);
        
        // Resolve full hierarchy from Place Details
        const hierarchy = await this.resolveLocationHierarchy(placeDetails);
        
        // Return the most specific location (suburb > city > province)
        const targetLocation = hierarchy.suburb || hierarchy.city || hierarchy.province;
        
        if (targetLocation) {
          // Sync to legacy tables
          await this.syncLegacyTables(targetLocation.id);
          return targetLocation;
        }
      } catch (error) {
        console.warn('[LocationPagesEnhanced] Failed to fetch Place Details, falling back to manual data:', error);
        // Fall through to manual creation
      }
    }
    
    // Fallback: Create location from manual data
    // This handles cases where Place ID is not available or API call failed
    
    let provinceLocation: Location | null = null;
    let cityLocation: Location | null = null;
    let suburbLocation: Location | null = null;
    
    // Create/find province
    if (locationData.province) {
      provinceLocation = await this.findOrCreateLocation({
        name: locationData.province,
        type: 'province',
        latitude: locationData.latitude.toString(),
        longitude: locationData.longitude.toString(),
      });
      
      await this.syncLegacyTables(provinceLocation.id);
    }
    
    // Create/find city
    if (locationData.city && provinceLocation) {
      cityLocation = await this.findOrCreateLocation({
        name: locationData.city,
        type: 'city',
        parentId: provinceLocation.id,
        latitude: locationData.latitude.toString(),
        longitude: locationData.longitude.toString(),
      });
      
      await this.syncLegacyTables(cityLocation.id);
    }
    
    // Create/find suburb (if provided)
    if (locationData.suburb && cityLocation) {
      suburbLocation = await this.findOrCreateLocation({
        name: locationData.suburb,
        type: 'suburb',
        parentId: cityLocation.id,
        placeId: locationData.placeId,
        latitude: locationData.latitude.toString(),
        longitude: locationData.longitude.toString(),
      });
      
      await this.syncLegacyTables(suburbLocation.id);
    }
    
    // Return the most specific location
    const targetLocation = suburbLocation || cityLocation || provinceLocation;
    
    if (!targetLocation) {
      throw new Error('Failed to create or find location record');
    }
    
    console.log('[LocationPagesEnhanced] Resolved location:', targetLocation.name, `(ID: ${targetLocation.id})`);
    
    return targetLocation;
  },
};
