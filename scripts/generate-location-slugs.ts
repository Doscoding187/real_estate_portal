/**
 * Script: Generate slugs for existing provinces, cities, and suburbs
 * Task: 19. Create data migration and sync scripts
 * 
 * This script generates SEO-friendly slugs for all existing location records
 * that don't already have slugs.
 */

import { drizzle } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";
import { provinces, cities, suburbs } from "../drizzle/schema";
import { eq, isNull, or } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

/**
 * Generate a kebab-case slug from a location name
 * Removes special characters, converts to lowercase, replaces spaces with hyphens
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove special characters except spaces and hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Replace spaces with hyphens
    .replace(/\s/g, '-')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate SEO title for a location
 */
function generateSEOTitle(name: string, type: 'province' | 'city' | 'suburb', parentName?: string): string {
  if (type === 'province') {
    return `Properties for Sale & Rent in ${name} | Property Listify`;
  } else if (type === 'city') {
    return `${name} Properties for Sale & Rent${parentName ? ` | ${parentName}` : ''} | Property Listify`;
  } else {
    return `${name} Properties${parentName ? ` | ${parentName}` : ''} | Property Listify`;
  }
}

/**
 * Generate SEO description for a location
 */
function generateSEODescription(name: string, type: 'province' | 'city' | 'suburb'): string {
  if (type === 'province') {
    return `Explore properties for sale and rent in ${name}. Browse houses, apartments, and new developments across ${name}'s top suburbs and cities.`;
  } else if (type === 'city') {
    return `Find your dream property in ${name}. Browse the latest listings for sale and rent, including houses, apartments, and new developments in ${name}.`;
  } else {
    return `Discover properties for sale and rent in ${name}. View the latest listings, market trends, and property insights for ${name}.`;
  }
}

async function generateLocationSlugs() {
  const isProduction = process.env.NODE_ENV === 'production';
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: isProduction,
    },
  });
  const db = drizzle(connection);

  console.log("🔄 Starting slug generation for existing locations...\n");

  try {
    // 1. Generate slugs for provinces
    console.log("📍 Processing provinces...");
    const provincesWithoutSlugs = await db
      .select()
      .from(provinces)
      .where(or(isNull(provinces.slug), eq(provinces.slug, '')));

    let provinceCount = 0;
    for (const province of provincesWithoutSlugs) {
      const slug = generateSlug(province.name);
      const seoTitle = generateSEOTitle(province.name, 'province');
      const seoDescription = generateSEODescription(province.name, 'province');

      await db
        .update(provinces)
        .set({
          slug,
          seoTitle,
          seoDescription,
        })
        .where(eq(provinces.id, province.id));

      console.log(`  ✓ ${province.name} → ${slug}`);
      provinceCount++;
    }
    console.log(`✅ Updated ${provinceCount} provinces\n`);

    // 2. Generate slugs for cities
    console.log("🏙️  Processing cities...");
    const citiesWithoutSlugs = await db
      .select({
        city: cities,
        province: provinces,
      })
      .from(cities)
      .leftJoin(provinces, eq(cities.provinceId, provinces.id))
      .where(or(isNull(cities.slug), eq(cities.slug, '')));

    let cityCount = 0;
    for (const { city, province } of citiesWithoutSlugs) {
      const slug = generateSlug(city.name);
      const seoTitle = generateSEOTitle(city.name, 'city', province?.name);
      const seoDescription = generateSEODescription(city.name, 'city');

      await db
        .update(cities)
        .set({
          slug,
          seoTitle,
          seoDescription,
        })
        .where(eq(cities.id, city.id));

      console.log(`  ✓ ${city.name} → ${slug}`);
      cityCount++;
    }
    console.log(`✅ Updated ${cityCount} cities\n`);

    // 3. Generate slugs for suburbs
    console.log("🏘️  Processing suburbs...");
    const suburbsWithoutSlugs = await db
      .select({
        suburb: suburbs,
        city: cities,
      })
      .from(suburbs)
      .leftJoin(cities, eq(suburbs.cityId, cities.id))
      .where(or(isNull(suburbs.slug), eq(suburbs.slug, '')));

    let suburbCount = 0;
    for (const { suburb, city } of suburbsWithoutSlugs) {
      const slug = generateSlug(suburb.name);
      const seoTitle = generateSEOTitle(suburb.name, 'suburb', city?.name);
      const seoDescription = generateSEODescription(suburb.name, 'suburb');

      await db
        .update(suburbs)
        .set({
          slug,
          seoTitle,
          seoDescription,
        })
        .where(eq(suburbs.id, suburb.id));

      console.log(`  ✓ ${suburb.name} → ${slug}`);
      suburbCount++;
    }
    console.log(`✅ Updated ${suburbCount} suburbs\n`);

    console.log(`
╔════════════════════════════════════════╗
║     Slug Generation Complete! 🎉       ║
╠════════════════════════════════════════╣
║  Provinces: ${String(provinceCount).padEnd(27)}║
║  Cities:    ${String(cityCount).padEnd(27)}║
║  Suburbs:   ${String(suburbCount).padEnd(27)}║
╚════════════════════════════════════════╝
    `);

  } catch (error) {
    console.error("❌ Slug generation failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the script
generateLocationSlugs();
