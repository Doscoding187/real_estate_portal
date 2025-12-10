import { db } from '../server/db';
import { provinces, cities, suburbs } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

async function fixLocationPages() {
  console.log('🔧 Fixing Location Pages System...\n');
  
  try {
    // Step 1: Check if data exists
    console.log('Step 1: Checking existing data...');
    const [provinceCount] = await db.execute(sql`SELECT COUNT(*) as count FROM provinces`);
    const [cityCount] = await db.execute(sql`SELECT COUNT(*) as count FROM cities`);
    const [suburbCount] = await db.execute(sql`SELECT COUNT(*) as count FROM suburbs`);
    
    console.log(`  Provinces: ${provinceCount.count}`);
    console.log(`  Cities: ${cityCount.count}`);
    console.log(`  Suburbs: ${suburbCount.count}`);
    
    if (provinceCount.count === 0) {
      console.log('\n❌ No location data found!');
      console.log('   Please run: mysql -u user -p database < migrations/create-location-hierarchy.sql');
      console.log('   Or check if the migration has been applied to your database.');
      return;
    }
    
    console.log('✅ Location data exists\n');
    
    // Step 2: Add slug columns if they don't exist
    console.log('Step 2: Adding slug columns...');
    try {
      await db.execute(sql`ALTER TABLE provinces ADD COLUMN slug VARCHAR(100)`);
      console.log('  ✅ Added slug column to provinces');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column')) {
        console.log('  ℹ️  Slug column already exists in provinces');
      } else {
        console.log('  ⚠️  Error adding slug to provinces:', error.message);
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE cities ADD COLUMN slug VARCHAR(100)`);
      console.log('  ✅ Added slug column to cities');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column')) {
        console.log('  ℹ️  Slug column already exists in cities');
      } else {
        console.log('  ⚠️  Error adding slug to cities:', error.message);
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE suburbs ADD COLUMN slug VARCHAR(100)`);
      console.log('  ✅ Added slug column to suburbs');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column')) {
        console.log('  ℹ️  Slug column already exists in suburbs');
      } else {
        console.log('  ⚠️  Error adding slug to suburbs:', error.message);
      }
    }
    
    // Step 3: Generate slugs from names
    console.log('\nStep 3: Generating slugs...');
    await db.execute(sql`UPDATE provinces SET slug = LOWER(REPLACE(name, ' ', '-'))`);
    console.log('  ✅ Generated slugs for provinces');
    
    await db.execute(sql`UPDATE cities SET slug = LOWER(REPLACE(name, ' ', '-'))`);
    console.log('  ✅ Generated slugs for cities');
    
    await db.execute(sql`UPDATE suburbs SET slug = LOWER(REPLACE(name, ' ', '-'))`);
    console.log('  ✅ Generated slugs for suburbs');
    
    // Step 4: Create indexes for better performance
    console.log('\nStep 4: Creating indexes...');
    try {
      await db.execute(sql`CREATE INDEX idx_province_slug ON provinces(slug)`);
      console.log('  ✅ Created index on provinces.slug');
    } catch (error: any) {
      if (error.message?.includes('Duplicate key')) {
        console.log('  ℹ️  Index already exists on provinces.slug');
      } else {
        console.log('  ⚠️  Error creating index on provinces:', error.message);
      }
    }
    
    try {
      await db.execute(sql`CREATE INDEX idx_city_slug ON cities(slug)`);
      console.log('  ✅ Created index on cities.slug');
    } catch (error: any) {
      if (error.message?.includes('Duplicate key')) {
        console.log('  ℹ️  Index already exists on cities.slug');
      } else {
        console.log('  ⚠️  Error creating index on cities:', error.message);
      }
    }
    
    try {
      await db.execute(sql`CREATE INDEX idx_suburb_slug ON suburbs(slug)`);
      console.log('  ✅ Created index on suburbs.slug');
    } catch (error: any) {
      if (error.message?.includes('Duplicate key')) {
        console.log('  ℹ️  Index already exists on suburbs.slug');
      } else {
        console.log('  ⚠️  Error creating index on suburbs:', error.message);
      }
    }
    
    // Step 5: Verify the fix
    console.log('\nStep 5: Verifying slug generation...');
    const sampleProvinces = await db.execute(sql`SELECT name, slug FROM provinces LIMIT 3`);
    console.log('  Sample provinces:');
    sampleProvinces.rows.forEach((row: any) => {
      console.log(`    ${row.name} -> ${row.slug}`);
    });
    
    const sampleCities = await db.execute(sql`SELECT name, slug FROM cities LIMIT 3`);
    console.log('  Sample cities:');
    sampleCities.rows.forEach((row: any) => {
      console.log(`    ${row.name} -> ${row.slug}`);
    });
    
    const sampleSuburbs = await db.execute(sql`SELECT name, slug FROM suburbs LIMIT 3`);
    console.log('  Sample suburbs:');
    sampleSuburbs.rows.forEach((row: any) => {
      console.log(`    ${row.name} -> ${row.slug}`);
    });
    
    console.log('\n✅ Location pages system fixed!');
    console.log('\nNext steps:');
    console.log('1. Update locationPagesService.ts to use slug columns');
    console.log('2. Test these URLs:');
    console.log('   - /gauteng');
    console.log('   - /western-cape');
    console.log('   - /gauteng/johannesburg');
    console.log('   - /gauteng/johannesburg/sandton');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fixing location pages:', error);
    process.exit(1);
  }
}

fixLocationPages();
