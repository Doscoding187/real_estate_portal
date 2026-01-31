import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('🔍 QUICK DATABASE CHECK');
console.log('========================');

// Check if DATABASE_URL is configured
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not configured');
  process.exit(1);
}

console.log('✅ DATABASE_URL found');
console.log(`📊 Database: ${process.env.DATABASE_URL.split('/')[3]?.split('?')[0] || 'unknown'}`);

async function testConnection() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('\n🔗 Testing database connection...');

    // Parse DATABASE_URL to get connection details
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

    // Test basic query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database connection successful');

    // Get table count
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📋 Found ${(tables as any[]).length} tables in database`);

    // Check for critical tables
    const criticalTables = ['users', 'properties', 'agencies', 'locations'];
    console.log('\n🔍 Checking critical tables:');

    for (const table of criticalTables) {
      try {
        const [exists] = await connection.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = DATABASE() AND table_name = '${table}'`,
        );
        const existsCount = (exists as any[])[0].count;

        if (existsCount > 0) {
          const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
          const count = (rows as any[])[0].count;
          console.log(`  ✅ ${table}: ${Number(count).toLocaleString()} rows`);
        } else {
          console.log(`  ❌ ${table}: Table does not exist`);
        }
      } catch (error) {
        console.log(`  ⚠️  ${table}: Error checking - ${error}`);
      }
    }

    // Check for super admins
    try {
      const [admins] = await connection.execute(
        "SELECT id, email, firstName, lastName FROM users WHERE role = 'super_admin'",
      );
      console.log(`\n👑 Super Admins: ${(admins as any[]).length} found`);
      (admins as any[]).forEach(admin => {
        console.log(`  👤 ${admin.email} (${admin.firstName} ${admin.lastName})`);
      });
    } catch (error) {
      console.log(`\n⚠️  Could not check super admins: ${error}`);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Check backup directory
const { existsSync, mkdirSync } = await import('fs');
if (!existsSync('./backups')) {
  mkdirSync('./backups', { recursive: true });
  console.log('✅ Created backups directory');
} else {
  console.log('✅ Backups directory exists');
}

testConnection()
  .then(() => {
    console.log('\n🎯 READY FOR CLEANUP');
    console.log('==================');
    console.log('To proceed with DRY RUN:');
    console.log('  node --import tsx/esm cleanup-production-data.ts');
    console.log('\nTo EXECUTE actual cleanup:');
    console.log('  node --import tsx/esm cleanup-production-data.ts --execute');
    console.log('\nTo VERIFY after cleanup:');
    console.log('  node --import tsx/esm verify-cleanup.ts');
  })
  .catch(error => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
