import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('🧹 SIMPLE CLEANUP TEST');
console.log('=======================');

async function simpleCleanup() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('\n🔗 Connecting to database...');

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }
    const dbUrl = new URL(process.env.DATABASE_URL);

    connection = await mysql.createConnection({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
    });

    console.log('✅ Connected to database');

    // Get list of all tables
    const [tables] = await connection.execute('SHOW TABLES');
    const tableList = (tables as any[]).map(t => Object.values(t)[0]);

    console.log(`\n📋 Found ${tableList.length} tables:`);

    // Show tables with row counts
    for (const tableName of tableList.slice(0, 20)) {
      // Show first 20
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const count = (rows as any[])[0].count;
        if (Number(count) > 0) {
          console.log(`  📊 ${tableName}: ${Number(count).toLocaleString()} rows`);
        }
      } catch (error) {
        console.log(`  ❌ ${tableName}: Error - ${error}`);
      }
    }

    // Identify what would be cleaned (preserve super admins and reference data)
    console.log('\n🎯 CLEANUP PLAN (DRY RUN):');
    console.log('=============================');

    const preserveTables = ['users', 'locations', 'unit_types', 'platform_settings'];
    const tablesToClean = tableList.filter(t => !preserveTables.includes(t));

    console.log(
      `✅ Will preserve ${preserveTables.length} critical tables: ${preserveTables.join(', ')}`,
    );
    console.log(`🗑️  Would clean ${tablesToClean.length} tables`);

    // Show super admin preservation
    try {
      const [admins] = await connection.execute(
        "SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'",
      );
      const adminCount = (admins as any[])[0].count;
      console.log(`👑 Will preserve ${adminCount} super admin accounts`);
    } catch (error) {
      console.log(`⚠️  Could not check super admins: ${error}`);
    }

    console.log('\n✅ DRY RUN COMPLETE - No changes made');
    console.log('🚀 To execute: node --import tsx/esm cleanup-production-data.ts --execute');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

simpleCleanup().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
