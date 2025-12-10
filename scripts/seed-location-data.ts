import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env
dotenv.config();

/**
 * Automated script to seed location data
 * Run with: npx tsx scripts/seed-location-data.ts
 */

async function seedLocationData() {
  console.log('🌍 Starting Location Data Seeding...\n');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file');
    console.log('\n💡 Please ensure DATABASE_URL is set in your .env file');
    return;
  }
  
  console.log('✅ DATABASE_URL found in .env\n');
  
  let connection: mysql.Connection | null = null;
  
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL!;
    console.log('🔌 Connecting to database...');
    
    // Create connection without SSL in the URL
    const cleanUrl = dbUrl.replace('?ssl=true', '').replace('&ssl=true', '');
    
    connection = await mysql.createConnection({
      uri: cleanUrl,
      ssl: {
        rejectUnauthorized: false // TiDB Cloud requires this
      },
      connectTimeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Connected to database\n');
    
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', 'create-location-hierarchy.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      return;
    }
    
    console.log('📄 Reading migration file...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements\n`);
    console.log('⚙️  Executing migration...\n');
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Show progress for important statements
        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/)?.[1];
          console.log(`   Creating table: ${tableName}...`);
        } else if (statement.includes('INSERT INTO provinces')) {
          console.log(`   Inserting provinces data...`);
        } else if (statement.includes('INSERT INTO cities')) {
          console.log(`   Inserting cities data...`);
        } else if (statement.includes('INSERT INTO suburbs')) {
          console.log(`   Inserting suburbs data...`);
        } else if (statement.includes('ALTER TABLE')) {
          const tableName = statement.match(/ALTER TABLE (\w+)/)?.[1];
          console.log(`   Altering table: ${tableName}...`);
        }
        
        await connection.execute(statement);
        successCount++;
      } catch (error: any) {
        // Skip errors for things that already exist
        if (error.message.includes('already exists') || 
            error.message.includes('Duplicate') ||
            error.message.includes('duplicate key')) {
          skipCount++;
        } else {
          console.error(`   ⚠️  Error executing statement ${i + 1}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Executed: ${successCount} statements`);
    console.log(`   Skipped: ${skipCount} statements (already exist)\n`);
    
    // Now add slug columns
    console.log('🏷️  Adding slug columns...\n');
    
    const slugStatements = [
      'ALTER TABLE provinces ADD COLUMN IF NOT EXISTS slug VARCHAR(100)',
      'ALTER TABLE cities ADD COLUMN IF NOT EXISTS slug VARCHAR(100)',
      'ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS slug VARCHAR(100)',
      "UPDATE provinces SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL OR slug = ''",
      "UPDATE cities SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL OR slug = ''",
      "UPDATE suburbs SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL OR slug = ''",
      'CREATE INDEX IF NOT EXISTS idx_province_slug ON provinces(slug)',
      'CREATE INDEX IF NOT EXISTS idx_city_slug ON cities(slug)',
      'CREATE INDEX IF NOT EXISTS idx_suburb_slug ON suburbs(slug)'
    ];
    
    for (const statement of slugStatements) {
      try {
        if (statement.includes('ALTER TABLE')) {
          const tableName = statement.match(/ALTER TABLE (\w+)/)?.[1];
          console.log(`   Adding slug column to ${tableName}...`);
        } else if (statement.includes('UPDATE')) {
          const tableName = statement.match(/UPDATE (\w+)/)?.[1];
          console.log(`   Generating slugs for ${tableName}...`);
        } else if (statement.includes('CREATE INDEX')) {
          const indexName = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/)?.[1];
          console.log(`   Creating index: ${indexName}...`);
        }
        
        await connection.execute(statement);
      } catch (error: any) {
        if (!error.message.includes('already exists') && 
            !error.message.includes('Duplicate')) {
          console.error(`   ⚠️  Error:`, error.message);
        }
      }
    }
    
    console.log('\n✅ Slug columns added!\n');
    
    // Verify the data
    console.log('🔍 Verifying data...\n');
    
    const [provinces] = await connection.execute('SELECT COUNT(*) as count FROM provinces');
    const [cities] = await connection.execute('SELECT COUNT(*) as count FROM cities');
    const [suburbs] = await connection.execute('SELECT COUNT(*) as count FROM suburbs');
    
    const provincesCount = (provinces as any)[0].count;
    const citiesCount = (cities as any)[0].count;
    const suburbsCount = (suburbs as any)[0].count;
    
    console.log('📊 Data Summary:');
    console.log(`   Provinces: ${provincesCount}`);
    console.log(`   Cities: ${citiesCount}`);
    console.log(`   Suburbs: ${suburbsCount}\n`);
    
    if (provincesCount >= 9 && citiesCount >= 20 && suburbsCount >= 12) {
      console.log('✅ All data seeded successfully!\n');
      
      // Show sample data
      console.log('📋 Sample provinces:');
      const [sampleProvinces] = await connection.execute('SELECT name, slug FROM provinces LIMIT 3');
      (sampleProvinces as any[]).forEach((p: any) => {
        console.log(`   - ${p.name} (slug: ${p.slug})`);
      });
      
      console.log('\n📋 Sample cities:');
      const [sampleCities] = await connection.execute('SELECT name, slug FROM cities LIMIT 3');
      (sampleCities as any[]).forEach((c: any) => {
        console.log(`   - ${c.name} (slug: ${c.slug})`);
      });
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n✨ SUCCESS! Location data is ready.\n');
      console.log('📝 Next steps:');
      console.log('   1. Replace the service file:');
      console.log('      copy server\\services\\locationPagesService.improved.ts server\\services\\locationPagesService.ts');
      console.log('   2. Restart your dev server');
      console.log('   3. Test: http://localhost:5000/gauteng\n');
    } else {
      console.log('⚠️  Warning: Data counts are lower than expected');
      console.log('   Expected: 9 provinces, 20+ cities, 12+ suburbs');
      console.log('   You may need to run the migration again\n');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection issue detected. Try these solutions:');
      console.log('   1. Check if your TiDB cluster is running');
      console.log('   2. Verify DATABASE_URL in .env is correct');
      console.log('   3. Check your firewall/network settings');
      console.log('   4. Try running the SQL manually in TiDB console');
      console.log('      (See: .kiro/specs/location-pages-system/MANUAL_FIX_STEPS.md)');
    } else if (error.message.includes('Access denied')) {
      console.log('\n💡 Authentication issue:');
      console.log('   - Verify your database credentials in .env');
      console.log('   - Check if the user has proper permissions');
    } else {
      console.log('\n💡 For manual fix instructions, see:');
      console.log('   .kiro/specs/location-pages-system/MANUAL_FIX_STEPS.md');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

seedLocationData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
