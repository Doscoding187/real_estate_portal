/**
 * Utility: Extract location data from legacy fields
 * Task: 19. Create data migration and sync scripts
 * 
 * This utility provides functions to extract and normalize location data
 * from legacy text fields in properties and developments tables.
 */

import { drizzle } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";
import { properties, developments, provinces, cities, suburbs, locations } from "../drizzle/schema";
import { eq, like, or, and } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

interface ExtractedLocation {
  province?: string;
  city?: string;
  suburb?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

interface LocationMatch {
  locationId?: number;
  confidence: 'high' | 'medium' | 'low';
  matchedBy: 'place_id' | 'suburb' | 'city' | 'province' | 'coordinates' | 'none';
  location?: any;
}

/**
 * Normalize location name for matching
 */
function normalizeLocationName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Extract location data from a property or development record
 */
function extractLocationData(record: any): ExtractedLocation {
  return {
    province: record.province || undefined,
    city: record.city || undefined,
    suburb: record.suburb || undefined,
    address: record.address || undefined,
    latitude: record.latitude || undefined,
    longitude: record.longitude || undefined,
  };
}

/**
 * Find matching location in the locations table
 */
async function findMatchingLocation(
  db: any,
  extracted: ExtractedLocation,
  placeId?: string
): Promise<LocationMatch> {
  // 1. Try exact match by Place ID (highest confidence)
  if (placeId) {
    const locationByPlaceId = await db
      .select()
      .from(locations)
      .where(eq(locations.placeId, placeId))
      .limit(1);

    if (locationByPlaceId.length > 0) {
      return {
        locationId: locationByPlaceId[0].id,
        confidence: 'high',
        matchedBy: 'place_id',
        location: locationByPlaceId[0],
      };
    }
  }

  // 2. Try match by suburb name (high confidence)
  if (extracted.suburb) {
    const normalizedSuburb = normalizeLocationName(extracted.suburb);
    
    const suburbMatch = await db
      .select()
      .from(suburbs)
      .where(eq(suburbs.name, extracted.suburb))
      .limit(1);

    if (suburbMatch.length > 0 && suburbMatch[0].placeId) {
      const location = await db
        .select()
        .from(locations)
        .where(eq(locations.placeId, suburbMatch[0].placeId))
        .limit(1);

      if (location.length > 0) {
        return {
          locationId: location[0].id,
          confidence: 'high',
          matchedBy: 'suburb',
          location: location[0],
        };
      }
    }
  }

  // 3. Try match by city name (medium confidence)
  if (extracted.city) {
    const cityMatch = await db
      .select()
      .from(cities)
      .where(eq(cities.name, extracted.city))
      .limit(1);

    if (cityMatch.length > 0 && cityMatch[0].placeId) {
      const location = await db
        .select()
        .from(locations)
        .where(eq(locations.placeId, cityMatch[0].placeId))
        .limit(1);

      if (location.length > 0) {
        return {
          locationId: location[0].id,
          confidence: 'medium',
          matchedBy: 'city',
          location: location[0],
        };
      }
    }
  }

  // 4. Try match by province name (low confidence)
  if (extracted.province) {
    const provinceMatch = await db
      .select()
      .from(provinces)
      .where(eq(provinces.name, extracted.province))
      .limit(1);

    if (provinceMatch.length > 0 && provinceMatch[0].placeId) {
      const location = await db
        .select()
        .from(locations)
        .where(eq(locations.placeId, provinceMatch[0].placeId))
        .limit(1);

      if (location.length > 0) {
        return {
          locationId: location[0].id,
          confidence: 'low',
          matchedBy: 'province',
          location: location[0],
        };
      }
    }
  }

  // 5. Try match by coordinates (medium confidence)
  if (extracted.latitude && extracted.longitude) {
    // Find nearest location within 5km radius
    // This is a simplified version - in production you'd use spatial queries
    const nearbyLocations = await db
      .select()
      .from(locations)
      .where(
        and(
          // Rough bounding box (±0.05 degrees ≈ 5km)
          locations.latitude >= String(parseFloat(extracted.latitude) - 0.05),
          locations.latitude <= String(parseFloat(extracted.latitude) + 0.05),
          locations.longitude >= String(parseFloat(extracted.longitude) - 0.05),
          locations.longitude <= String(parseFloat(extracted.longitude) + 0.05)
        )
      )
      .limit(1);

    if (nearbyLocations.length > 0) {
      return {
        locationId: nearbyLocations[0].id,
        confidence: 'medium',
        matchedBy: 'coordinates',
        location: nearbyLocations[0],
      };
    }
  }

  // No match found
  return {
    confidence: 'low',
    matchedBy: 'none',
  };
}

/**
 * Main extraction and analysis function
 */
async function analyzeLegacyLocationData() {
  const isProduction = process.env.NODE_ENV === 'production';
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: isProduction,
    },
  });
  const db = drizzle(connection);

  console.log("🔍 Analyzing legacy location data...\n");

  try {
    // Analyze properties
    console.log("📊 Analyzing properties table...");
    const sampleProperties = await db
      .select()
      .from(properties)
      .limit(100);

    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;
    let noMatch = 0;

    for (const property of sampleProperties) {
      const extracted = extractLocationData(property);
      const match = await findMatchingLocation(db, extracted, property.placeId || undefined);

      if (match.confidence === 'high') highConfidence++;
      else if (match.confidence === 'medium') mediumConfidence++;
      else if (match.confidence === 'low') lowConfidence++;
      else noMatch++;
    }

    console.log(`
  Sample Analysis (100 properties):
  ✓ High confidence matches:   ${highConfidence}
  ~ Medium confidence matches: ${mediumConfidence}
  ⚠ Low confidence matches:    ${lowConfidence}
  ✗ No matches:                ${noMatch}
    `);

    // Analyze developments
    console.log("📊 Analyzing developments table...");
    const sampleDevelopments = await db
      .select()
      .from(developments)
      .limit(50);

    let devHighConfidence = 0;
    let devMediumConfidence = 0;
    let devLowConfidence = 0;
    let devNoMatch = 0;

    for (const development of sampleDevelopments) {
      const extracted = extractLocationData(development);
      const match = await findMatchingLocation(db, extracted);

      if (match.confidence === 'high') devHighConfidence++;
      else if (match.confidence === 'medium') devMediumConfidence++;
      else if (match.confidence === 'low') devLowConfidence++;
      else devNoMatch++;
    }

    console.log(`
  Sample Analysis (50 developments):
  ✓ High confidence matches:   ${devHighConfidence}
  ~ Medium confidence matches: ${devMediumConfidence}
  ⚠ Low confidence matches:    ${devLowConfidence}
  ✗ No matches:                ${devNoMatch}
    `);

    console.log(`
╔════════════════════════════════════════╗
║   Legacy Data Analysis Complete! 📊    ║
╠════════════════════════════════════════╣
║  This analysis shows how well existing ║
║  location data can be matched to the   ║
║  unified locations table.              ║
║                                        ║
║  High confidence: Exact suburb match   ║
║  Medium: City or coordinate match      ║
║  Low: Province-level match only        ║
║  No match: Unable to find location     ║
╚════════════════════════════════════════╝
    `);

  } catch (error) {
    console.error("❌ Analysis failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Export utility functions
export {
  extractLocationData,
  findMatchingLocation,
  normalizeLocationName,
  ExtractedLocation,
  LocationMatch,
};

// Run analysis if executed directly
if (require.main === module) {
  analyzeLegacyLocationData();
}
