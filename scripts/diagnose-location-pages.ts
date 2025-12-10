import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { provinces, cities, suburbs } from '../drizzle/schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

/**
 * Diagnostic script to check location pages database state
 * Run with: npx tsx scripts/diagnose-location-pages.ts
 */

async function diagnose() {
  console.log('🔍 Diagnosing Location Pages System...\n');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file');
    console.log('\n💡 Please ensure DATABASE_URL is set in your .env file');
    return;
  }
  
  console.log('✅ DATABASE_URL found in .env\n');
  
  try {
    // Parse DATABASE_URL and create connection with proper SSL config
    const dbUrl = process.env.DATABASE_URL!;
    const connection = await mysql.createConnection({
      uri: dbUrl.replace('?ssl=true', ''),
      ssl: {
        rejectUnauthorized: true
      }
    });
    const db = drizzle(connection);
    
    // Check if tables exist and have data
    console.log('📊 Checking table data counts...');
    
    const [provincesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(provinces);
    
    const [citiesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cities);
    
    const [suburbsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(suburbs);
    
    console.log(`\n✅ Table Counts:`);
    console.log(`   Provinces: ${provincesCount.count}`);
    console.log(`   Cities: ${citiesCount.count}`);
    console.log(`   Suburbs: ${suburbsCount.count}`);
    
    // Check if slug columns exist
    console.log(`\n🔍 Checking for slug columns...`);
    
    try {
      const sampleProvinces = await db
        .select()
        .from(provinces)
        .limit(3);
      
      const hasSlug = sampleProvinces.length > 0 && 'slug' in sampleProvinces[0];
      console.log(`   Slug columns exist: ${hasSlug ? '✅ YES' : '❌ NO'}`);
      
      if (sampleProvinces.length > 0) {
        console.log(`\n📋 Sample provinces:`);
        sampleProvinces.forEach(p => {
          console.log(`   - ${p.name}${hasSlug ? ` (slug: ${(p as any).slug})` : ''}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error checking slug columns: ${error.message}`);
    }
    
    // Diagnosis summary
    console.log(`\n\n📋 DIAGNOSIS SUMMARY:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    if (provincesCount.count === 0) {
      console.log(`\n❌ ISSUE: No location data found in database`);
      console.log(`\n💡 SOLUTION:`);
      console.log(`   1. Run the migration SQL in your database console:`);
      console.log(`      File: migrations/create-location-hierarchy.sql`);
      console.log(`\n   2. Or use your database GUI to execute the SQL file`);
      console.log(`\n   3. Expected data after migration:`);
      console.log(`      - 9 provinces`);
      console.log(`      - 20+ cities`);
      console.log(`      - 12+ suburbs`);
    } else {
      console.log(`\n✅ Location data exists!`);
      
      // Check if slug columns exist
      const sampleProvinces = await db.select().from(provinces).limit(1);
      const hasSlug = sampleProvinces.length > 0 && 'slug' in sampleProvinces[0];
      
      if (!hasSlug) {
        console.log(`\n⚠️  ISSUE: Slug columns missing`);
        console.log(`\n💡 SOLUTION:`);
        console.log(`   Run this SQL in your database console:`);
        console.log(`\n   -- Add slug columns`);
        console.log(`   ALTER TABLE provinces ADD COLUMN slug VARCHAR(100);`);
        console.log(`   ALTER TABLE cities ADD COLUMN slug VARCHAR(100);`);
        console.log(`   ALTER TABLE suburbs ADD COLUMN slug VARCHAR(100);`);
        console.log(`\n   -- Generate slugs`);
        console.log(`   UPDATE provinces SET slug = LOWER(REPLACE(name, ' ', '-'));`);
        console.log(`   UPDATE cities SET slug = LOWER(REPLACE(name, ' ', '-'));`);
        console.log(`   UPDATE suburbs SET slug = LOWER(REPLACE(name, ' ', '-'));`);
        console.log(`\n   -- Add indexes`);
        console.log(`   CREATE INDEX idx_province_slug ON provinces(slug);`);
        console.log(`   CREATE INDEX idx_city_slug ON cities(slug);`);
        console.log(`   CREATE INDEX idx_suburb_slug ON suburbs(slug);`);
      } else {
        console.log(`\n✅ Slug columns exist!`);
        console.log(`\n💡 NEXT STEP:`);
        console.log(`   Replace the service file with the improved version:`);
        console.log(`   1. Backup: copy server\\services\\locationPagesService.ts server\\services\\locationPagesService.backup.ts`);
        console.log(`   2. Replace: copy server\\services\\locationPagesService.improved.ts server\\services\\locationPagesService.ts`);
        console.log(`   3. Restart your dev server`);
      }
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // Close connection
    await connection.end();
    
  } catch (error: any) {
    console.error('❌ Error during diagnosis:', error.message);
    console.log('\n💡 This might mean:');
    console.log('   - Database connection issue');
    console.log('   - Tables don\'t exist yet');
    console.log('   - Invalid DATABASE_URL format');
  }
}

diagnose()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
