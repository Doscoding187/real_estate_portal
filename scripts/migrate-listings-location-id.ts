/**
 * Script: Migrate existing listings to use location_id (Optional)
 * Task: 19. Create data migration and sync scripts
 * 
 * This script migrates existing listings to link them to the unified locations table
 * using location_id foreign key. This is optional and can be done gradually.
 */

import { drizzle } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";
import { properties, developments, locations, suburbs, cities, provinces } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

async function migrateListingsLocationId() {
  const isProduction = process.env.NODE_ENV === 'production';
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: isProduction,
    },
  });
  const db = drizzle(connection);

  console.log("🔄 Starting migration of listings to use location_id...\n");

  try {
    // 1. Migrate properties table
    console.log("🏠 Migrating properties...");
    
    // Get all properties without location_id
    const propertiesWithoutLocationId = await db
      .select()
      .from(properties)
      .where(isNull(properties.locationId))
      .limit(1000); // Process in batches

    let propertyCount = 0;
    let propertySkipped = 0;

    for (const property of propertiesWithoutLocationId) {
      let locationId: number | null = null;

      // Try to find location by suburb first (most specific)
      if (property.suburbId) {
        const suburb = await db
          .select()
          .from(suburbs)
          .where(eq(suburbs.id, property.suburbId))
          .limit(1);

        if (suburb.length > 0 && suburb[0].placeId) {
          const location = await db
            .select()
            .from(locations)
            .where(eq(locations.placeId, suburb[0].placeId))
            .limit(1);

          if (location.length > 0) {
            locationId = location[0].id;
          }
        }
      }

      // If no suburb match, try city
      if (!locationId && property.cityId) {
        const city = await db
          .select()
          .from(cities)
          .where(eq(cities.id, property.cityId))
          .limit(1);

        if (city.length > 0 && city[0].placeId) {
          const location = await db
            .select()
            .from(locations)
            .where(eq(locations.placeId, city[0].placeId))
            .limit(1);

          if (location.length > 0) {
            locationId = location[0].id;
          }
        }
      }

      // If no city match, try province
      if (!locationId && property.provinceId) {
        const province = await db
          .select()
          .from(provinces)
          .where(eq(provinces.id, property.provinceId))
          .limit(1);

        if (province.length > 0 && province[0].placeId) {
          const location = await db
            .select()
            .from(locations)
            .where(eq(locations.placeId, province[0].placeId))
            .limit(1);

          if (location.length > 0) {
            locationId = location[0].id;
          }
        }
      }

      // Update property with location_id
      if (locationId) {
        await db
          .update(properties)
          .set({ locationId })
          .where(eq(properties.id, property.id));

        propertyCount++;
        if (propertyCount % 100 === 0) {
          console.log(`  ✓ Processed ${propertyCount} properties...`);
        }
      } else {
        propertySkipped++;
      }
    }

    console.log(`✅ Migrated ${propertyCount} properties`);
    if (propertySkipped > 0) {
      console.log(`⚠️  Skipped ${propertySkipped} properties (no matching location found)\n`);
    }

    // 2. Migrate developments table
    console.log("🏗️  Migrating developments...");
    
    // Get all developments without location_id
    const developmentsWithoutLocationId = await db
      .select()
      .from(developments)
      .where(isNull(developments.locationId))
      .limit(1000); // Process in batches

    let developmentCount = 0;
    let developmentSkipped = 0;

    for (const development of developmentsWithoutLocationId) {
      let locationId: number | null = null;

      // Try to find location by suburb name (text field)
      if (development.suburb) {
        const suburb = await db
          .select()
          .from(suburbs)
          .where(eq(suburbs.name, development.suburb))
          .limit(1);

        if (suburb.length > 0 && suburb[0].placeId) {
          const location = await db
            .select()
            .from(locations)
            .where(eq(locations.placeId, suburb[0].placeId))
            .limit(1);

          if (location.length > 0) {
            locationId = location[0].id;
          }
        }
      }

      // If no suburb match, try city name
      if (!locationId && development.city) {
        const city = await db
          .select()
          .from(cities)
          .where(eq(cities.name, development.city))
          .limit(1);

        if (city.length > 0 && city[0].placeId) {
          const location = await db
            .select()
            .from(locations)
            .where(eq(locations.placeId, city[0].placeId))
            .limit(1);

          if (location.length > 0) {
            locationId = location[0].id;
          }
        }
      }

      // If no city match, try province name
      if (!locationId && development.province) {
        const province = await db
          .select()
          .from(provinces)
          .where(eq(provinces.name, development.province))
          .limit(1);

        if (province.length > 0 && province[0].placeId) {
          const location = await db
            .select()
            .from(locations)
            .where(eq(locations.placeId, province[0].placeId))
            .limit(1);

          if (location.length > 0) {
            locationId = location[0].id;
          }
        }
      }

      // Update development with location_id
      if (locationId) {
        await db
          .update(developments)
          .set({ locationId })
          .where(eq(developments.id, development.id));

        developmentCount++;
        if (developmentCount % 50 === 0) {
          console.log(`  ✓ Processed ${developmentCount} developments...`);
        }
      } else {
        developmentSkipped++;
      }
    }

    console.log(`✅ Migrated ${developmentCount} developments`);
    if (developmentSkipped > 0) {
      console.log(`⚠️  Skipped ${developmentSkipped} developments (no matching location found)\n`);
    }

    console.log(`
╔════════════════════════════════════════╗
║   Listing Migration Complete! 🎉       ║
╠════════════════════════════════════════╣
║  Properties:   ${String(propertyCount).padEnd(23)}║
║  Developments: ${String(developmentCount).padEnd(23)}║
║  Total:        ${String(propertyCount + developmentCount).padEnd(23)}║
╠════════════════════════════════════════╣
║  Skipped:      ${String(propertySkipped + developmentSkipped).padEnd(23)}║
╚════════════════════════════════════════╝

Note: This migration is optional and can be run multiple times.
Legacy location fields (province, city, suburb) are maintained for
backward compatibility.
    `);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the script
migrateListingsLocationId();
