/**
 * Script: Sync existing provinces, cities, and suburbs to locations table
 * Task: 19. Create data migration and sync scripts
 * 
 * This script creates location records in the unified locations table
 * from existing provinces, cities, and suburbs tables.
 */

import { drizzle } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";
import { provinces, cities, suburbs, locations } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

interface LocationRecord {
  name: string;
  slug: string;
  type: 'province' | 'city' | 'suburb';
  parentId?: number;
  placeId?: string | null;
  description?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

async function syncLocationsTable() {
  const isProduction = process.env.NODE_ENV === 'production';
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: isProduction,
    },
  });
  const db = drizzle(connection);

  console.log("🔄 Starting sync to locations table...\n");

  // Track created location IDs for parent relationships
  const provinceLocationMap = new Map<number, number>(); // old province ID -> new location ID
  const cityLocationMap = new Map<number, number>(); // old city ID -> new location ID

  try {
    // 1. Sync provinces to locations table
    console.log("📍 Syncing provinces...");
    const allProvinces = await db.select().from(provinces);
    
    let provinceCount = 0;
    for (const province of allProvinces) {
      // Check if location already exists for this province
      const existingLocation = await db
        .select()
        .from(locations)
        .where(eq(locations.placeId, province.placeId || ''))
        .limit(1);

      let locationId: number;

      if (existingLocation.length > 0 && province.placeId) {
        // Update existing location
        locationId = existingLocation[0].id;
        await db
          .update(locations)
          .set({
            name: province.name,
            slug: province.slug || province.name.toLowerCase().replace(/\s+/g, '-'),
            type: 'province',
            latitude: province.latitude,
            longitude: province.longitude,
            seoTitle: province.seoTitle,
            seoDescription: province.seoDescription,
          })
          .where(eq(locations.id, locationId));
        
        console.log(`  ↻ Updated: ${province.name}`);
      } else {
        // Create new location
        const result = await db.insert(locations).values({
          name: province.name,
          slug: province.slug || province.name.toLowerCase().replace(/\s+/g, '-'),
          type: 'province',
          parentId: null, // Provinces have no parent
          placeId: province.placeId,
          description: `Explore properties for sale and rent in ${province.name}.`,
          latitude: province.latitude,
          longitude: province.longitude,
          seoTitle: province.seoTitle,
          seoDescription: province.seoDescription,
        });

        locationId = Number(result[0].insertId);
        console.log(`  ✓ Created: ${province.name}`);
      }

      provinceLocationMap.set(province.id, locationId);
      provinceCount++;
    }
    console.log(`✅ Synced ${provinceCount} provinces\n`);

    // 2. Sync cities to locations table
    console.log("🏙️  Syncing cities...");
    const allCities = await db
      .select({
        city: cities,
        province: provinces,
      })
      .from(cities)
      .leftJoin(provinces, eq(cities.provinceId, provinces.id));

    let cityCount = 0;
    for (const { city, province } of allCities) {
      const parentLocationId = province ? provinceLocationMap.get(province.id) : undefined;

      // Check if location already exists for this city
      const existingLocation = await db
        .select()
        .from(locations)
        .where(eq(locations.placeId, city.placeId || ''))
        .limit(1);

      let locationId: number;

      if (existingLocation.length > 0 && city.placeId) {
        // Update existing location
        locationId = existingLocation[0].id;
        await db
          .update(locations)
          .set({
            name: city.name,
            slug: city.slug || city.name.toLowerCase().replace(/\s+/g, '-'),
            type: 'city',
            parentId: parentLocationId,
            latitude: city.latitude,
            longitude: city.longitude,
            seoTitle: city.seoTitle,
            seoDescription: city.seoDescription,
          })
          .where(eq(locations.id, locationId));
        
        console.log(`  ↻ Updated: ${city.name}${province ? ` (${province.name})` : ''}`);
      } else {
        // Create new location
        const result = await db.insert(locations).values({
          name: city.name,
          slug: city.slug || city.name.toLowerCase().replace(/\s+/g, '-'),
          type: 'city',
          parentId: parentLocationId,
          placeId: city.placeId,
          description: `Find properties for sale and rent in ${city.name}.`,
          latitude: city.latitude,
          longitude: city.longitude,
          seoTitle: city.seoTitle,
          seoDescription: city.seoDescription,
        });

        locationId = Number(result[0].insertId);
        console.log(`  ✓ Created: ${city.name}${province ? ` (${province.name})` : ''}`);
      }

      cityLocationMap.set(city.id, locationId);
      cityCount++;
    }
    console.log(`✅ Synced ${cityCount} cities\n`);

    // 3. Sync suburbs to locations table
    console.log("🏘️  Syncing suburbs...");
    const allSuburbs = await db
      .select({
        suburb: suburbs,
        city: cities,
      })
      .from(suburbs)
      .leftJoin(cities, eq(suburbs.cityId, cities.id));

    let suburbCount = 0;
    for (const { suburb, city } of allSuburbs) {
      const parentLocationId = city ? cityLocationMap.get(city.id) : undefined;

      // Check if location already exists for this suburb
      const existingLocation = await db
        .select()
        .from(locations)
        .where(eq(locations.placeId, suburb.placeId || ''))
        .limit(1);

      if (existingLocation.length > 0 && suburb.placeId) {
        // Update existing location
        await db
          .update(locations)
          .set({
            name: suburb.name,
            slug: suburb.slug || suburb.name.toLowerCase().replace(/\s+/g, '-'),
            type: 'suburb',
            parentId: parentLocationId,
            latitude: suburb.latitude,
            longitude: suburb.longitude,
            seoTitle: suburb.seoTitle,
            seoDescription: suburb.seoDescription,
          })
          .where(eq(locations.id, existingLocation[0].id));
        
        console.log(`  ↻ Updated: ${suburb.name}${city ? ` (${city.name})` : ''}`);
      } else {
        // Create new location
        await db.insert(locations).values({
          name: suburb.name,
          slug: suburb.slug || suburb.name.toLowerCase().replace(/\s+/g, '-'),
          type: 'suburb',
          parentId: parentLocationId,
          placeId: suburb.placeId,
          description: `Discover properties for sale and rent in ${suburb.name}.`,
          latitude: suburb.latitude,
          longitude: suburb.longitude,
          seoTitle: suburb.seoTitle,
          seoDescription: suburb.seoDescription,
        });

        console.log(`  ✓ Created: ${suburb.name}${city ? ` (${city.name})` : ''}`);
      }

      suburbCount++;
    }
    console.log(`✅ Synced ${suburbCount} suburbs\n`);

    console.log(`
╔════════════════════════════════════════╗
║   Locations Table Sync Complete! 🎉    ║
╠════════════════════════════════════════╣
║  Provinces: ${String(provinceCount).padEnd(27)}║
║  Cities:    ${String(cityCount).padEnd(27)}║
║  Suburbs:   ${String(suburbCount).padEnd(27)}║
║  Total:     ${String(provinceCount + cityCount + suburbCount).padEnd(27)}║
╚════════════════════════════════════════╝
    `);

  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the script
syncLocationsTable();
