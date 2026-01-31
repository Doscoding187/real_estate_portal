import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Load PRODUCTION environment variables
dotenv.config({ path: '.env.production', override: true });

console.log('🔍 PRODUCTION DATABASE CHECK');
console.log('==============================\n');

async function checkProductionData() {
  let connection: mysql.Connection | null = null;

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found in .env.production');
    }

    const dbUrl = new URL(process.env.DATABASE_URL);

    console.log(`📊 Connecting to: ${dbUrl.hostname}`);
    console.log(`📊 Database: ${dbUrl.pathname.slice(1)}\n`);

    connection = await mysql.createConnection({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
      ssl: { rejectUnauthorized: true },
    });

    console.log('✅ Connected to production database\n');

    // Check key tables
    const tablesToCheck = [
      'users',
      'developers',
      'agencies',
      'agents',
      'listings',
      'properties',
      'developments',
      'developer_subscriptions',
      'agency_subscriptions',
      'billing_transactions',
    ];

    console.log('📋 PRODUCTION DATA COUNTS:\n');
    for (const table of tablesToCheck) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
        const count = (rows as any[])[0].count;
        if (Number(count) > 0) {
          console.log(`  ⚠️  ${table}: ${Number(count)} rows`);
        } else {
          console.log(`  ✅ ${table}: 0 rows`);
        }
      } catch (error) {
        console.log(`  ❓ ${table}: Error checking`);
      }
    }

    // Check super admin
    try {
      const [admins] = await connection.execute(
        "SELECT id, email, role FROM users WHERE email = 'enetechsa@gmail.com'",
      );
      console.log(`\n👑 Super Admin Status:\n`);
      if ((admins as any[]).length > 0) {
        (admins as any[]).forEach(admin => {
          console.log(`  ✅ Found: ${admin.email} (Role: ${admin.role})`);
        });
      } else {
        console.log(`  ❌ Super admin not found!`);
      }
    } catch (error) {
      console.log('\n⚠️  Could not check super admin');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkProductionData().catch(console.error);
