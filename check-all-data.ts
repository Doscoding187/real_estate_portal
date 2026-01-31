import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Load LOCAL environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('🔍 COMPREHENSIVE DATA CHECK');
console.log('============================\n');

async function checkAllTables() {
  let connection: mysql.Connection | null = null;

  try {
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

    console.log(`📊 Database: ${dbUrl.pathname.slice(1)}\n`);

    // Check specific tables that might have data
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
      'leads',
      'enquiries',
      'billing_transactions',
    ];

    console.log('📋 TABLE DATA COUNTS:\n');
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

    // List all users
    try {
      const [users] = await connection.execute('SELECT id, email, role FROM users');
      console.log(`\n👥 ALL USERS (${(users as any[]).length}):\n`);
      (users as any[]).forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
      });
    } catch (error) {
      console.log('\n⚠️  Could not fetch users');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAllTables().catch(console.error);
