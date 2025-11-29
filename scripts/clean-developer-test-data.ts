/**
 * Script to clean test/placeholder data for a developer account
 * Run with: pnpm exec tsx scripts/clean-developer-test-data.ts
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function cleanDeveloperTestData() {
  const email = 'bluespacepools@gmail.com';
  console.log(`🧹 Cleaning test data for developer: ${email}\n`);

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

    // Get user ID
    const [users]: any = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.error(`❌ User ${email} not found`);
      process.exit(1);
    }

    const userId = users[0].id;
    console.log(`👤 User ID: ${userId}\n`);

    // Get developer ID
    const [developers]: any = await connection.execute(
      'SELECT id FROM developers WHERE userId = ?',
      [userId]
    );

    if (developers.length === 0) {
      console.log('ℹ️  No developer profile found - nothing to clean');
      return;
    }

    const developerId = developers[0].id;
    console.log(`🏢 Developer ID: ${developerId}\n`);

    // Check what data exists
    console.log('📊 Checking existing data...\n');

    const [developments]: any = await connection.execute(
      'SELECT COUNT(*) as count FROM developments WHERE developer_id = ?',
      [developerId]
    );
    console.log(`   Developments: ${developments[0].count}`);

    const [units]: any = await connection.execute(
      'SELECT COUNT(*) as count FROM development_units WHERE development_id IN (SELECT id FROM developments WHERE developer_id = ?)',
      [developerId]
    );
    console.log(`   Units: ${units[0].count}`);

    const [leads]: any = await connection.execute(
      'SELECT COUNT(*) as count FROM leads WHERE developerId = ?',
      [developerId]
    );
    console.log(`   Leads: ${leads[0].count}`);

    const [subscriptions]: any = await connection.execute(
      'SELECT COUNT(*) as count FROM developer_subscriptions WHERE developer_id = ?',
      [developerId]
    );
    console.log(`   Subscriptions: ${subscriptions[0].count}\n`);

    // Ask for confirmation
    console.log('⚠️  This will delete:');
    console.log(`   - ${developments[0].count} development(s)`);
    console.log(`   - ${units[0].count} unit(s)`);
    console.log(`   - ${leads[0].count} lead(s)`);
    console.log(`   - ${subscriptions[0].count} subscription(s)`);
    console.log('\n🔄 Proceeding with cleanup...\n');

    // Delete in correct order (respecting foreign keys)
    
    // 1. Delete units (depends on developments)
    if (units[0].count > 0) {
      await connection.execute(
        'DELETE FROM development_units WHERE development_id IN (SELECT id FROM developments WHERE developer_id = ?)',
        [developerId]
      );
      console.log(`✅ Deleted ${units[0].count} unit(s)`);
    }

    // 2. Delete development phases (depends on developments)
    const [phases]: any = await connection.execute(
      'DELETE FROM development_phases WHERE development_id IN (SELECT id FROM developments WHERE developer_id = ?)',
      [developerId]
    );
    if (phases.affectedRows > 0) {
      console.log(`✅ Deleted ${phases.affectedRows} development phase(s)`);
    }

    // 3. Delete leads
    if (leads[0].count > 0) {
      await connection.execute(
        'DELETE FROM leads WHERE developerId = ?',
        [developerId]
      );
      console.log(`✅ Deleted ${leads[0].count} lead(s)`);
    }

    // 4. Delete developments
    if (developments[0].count > 0) {
      await connection.execute(
        'DELETE FROM developments WHERE developer_id = ?',
        [developerId]
      );
      console.log(`✅ Deleted ${developments[0].count} development(s)`);
    }

    // 5. Delete subscription usage and limits
    await connection.execute(
      'DELETE FROM developer_subscription_usage WHERE subscription_id IN (SELECT id FROM developer_subscriptions WHERE developer_id = ?)',
      [developerId]
    );
    await connection.execute(
      'DELETE FROM developer_subscription_limits WHERE subscription_id IN (SELECT id FROM developer_subscriptions WHERE developer_id = ?)',
      [developerId]
    );

    // 6. Delete subscriptions
    if (subscriptions[0].count > 0) {
      await connection.execute(
        'DELETE FROM developer_subscriptions WHERE developer_id = ?',
        [developerId]
      );
      console.log(`✅ Deleted ${subscriptions[0].count} subscription(s)`);
    }

    console.log('\n✅ Cleanup complete! Your developer dashboard is now fresh and ready.\n');
    console.log('💡 Next steps:');
    console.log('   1. Create your first development');
    console.log('   2. Add units to your development');
    console.log('   3. Start capturing leads!\n');

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

cleanDeveloperTestData();
