/**
 * Script to add KPI caching fields to developers table
 * Run with: pnpm exec tsx scripts/run-kpi-caching-migration.ts
 */
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runKPICachingMigration() {
  console.log('🚀 Running KPI caching migration for developers table...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined');
    process.exit(1);
  }

  let connection;
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const sslParam = dbUrl.searchParams.get('ssl');
    dbUrl.searchParams.delete('ssl');

    connection = await createConnection({
        uri: dbUrl.toString(),
        ssl: sslParam === 'true' || sslParam === '{"rejectUnauthorized":true}' 
          ? { rejectUnauthorized: true } 
          : { rejectUnauthorized: false }
    });

    console.log('✅ Connected to database\n');

    // Check if kpi_cache column already exists
    console.log('🔍 Checking if KPI caching fields exist...');
    const [columns]: any = await connection.execute("SHOW COLUMNS FROM developers LIKE 'kpi_cache'");
    
    if (columns.length > 0) {
      console.log('⚠️  KPI caching fields already exist');
      console.log('📋 Current developers table structure:');
      const [allColumns]: any = await connection.execute('DESCRIBE developers');
      allColumns.forEach((col: any) => {
        console.log(`   ${col.Field} (${col.Type})`);
      });
      return;
    }

    console.log('📝 Adding KPI caching fields to developers table...\n');

    // Add kpi_cache column
    await connection.execute(`
      ALTER TABLE \`developers\` 
      ADD COLUMN \`kpi_cache\` json NULL COMMENT 'Cached KPI data for mission control dashboard'
    `);
    console.log('✅ Added kpi_cache column');

    // Add last_kpi_calculation column
    await connection.execute(`
      ALTER TABLE \`developers\` 
      ADD COLUMN \`last_kpi_calculation\` timestamp NULL COMMENT 'Timestamp of last KPI calculation for cache invalidation'
    `);
    console.log('✅ Added last_kpi_calculation column');

    // Create index
    console.log('📊 Creating index...');
    await connection.execute('CREATE INDEX `idx_developers_last_kpi_calculation` ON `developers`(`last_kpi_calculation`)');
    console.log('   ✅ Created idx_developers_last_kpi_calculation');

    console.log('\n✅ KPI caching migration completed successfully!');

    // Verify table structure
    console.log('\n📋 Updated developers table structure:');
    const [finalColumns]: any = await connection.execute('DESCRIBE developers');
    finalColumns.forEach((col: any) => {
      console.log(`   ${col.Field} (${col.Type})`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runKPICachingMigration();
