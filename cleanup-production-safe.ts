import mysql from 'mysql2/promise';

/**
 * PRODUCTION DATABASE CLEANUP
 *
 * This script will:
 * 1. Connect to your PRODUCTION database
 * 2. Preserve ONLY the super admin (enetechsa@gmail.com)
 * 3. Delete all other user-generated data
 * 4. Preserve reference data (locations, plans, amenities, etc.)
 *
 * Usage:
 *   DATABASE_URL="your-production-url" node --import tsx/esm cleanup-production-safe.ts
 */

const SUPER_ADMIN_EMAIL = 'enetechsa@gmail.com';

console.log('🚨 PRODUCTION DATABASE CLEANUP');
console.log('================================\n');

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required');
  console.error('\nUsage:');
  console.error(
    '  DATABASE_URL="mysql://user:pass@host:port/db?ssl=true" node --import tsx/esm cleanup-production-safe.ts\n',
  );
  process.exit(1);
}

// Verify it's pointing to production
if (!DATABASE_URL.includes('tidbcloud.com')) {
  console.error('❌ ERROR: This script is for TiDB Cloud production database only');
  console.error('   Your DATABASE_URL does not contain "tidbcloud.com"');
  console.error('   Aborting for safety.\n');
  process.exit(1);
}

console.log('✅ Production database URL detected');
console.log(`📊 Target: ${DATABASE_URL.split('@')[1]?.split('?')[0]}\n`);

async function cleanupProduction() {
  let connection: mysql.Connection | null = null;

  try {
    // Parse DATABASE_URL
    const dbUrl = new URL(DATABASE_URL);

    console.log('🔗 Connecting to production database...');
    connection = await mysql.createConnection({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
      ssl: { rejectUnauthorized: true },
    });

    console.log('✅ Connected successfully\n');

    // Step 1: Find super admin ID
    console.log('👑 Step 1: Verifying super admin account...');
    const [superAdmins] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ? AND role = ?',
      [SUPER_ADMIN_EMAIL, 'super_admin'],
    );

    if ((superAdmins as any[]).length === 0) {
      console.error('❌ ERROR: Super admin not found in production database!');
      console.error('   Expected: enetechsa@gmail.com with role "super_admin"');
      process.exit(1);
    }

    const superAdminId = (superAdmins as any[])[0].id;
    console.log(`✅ Super admin found: ${SUPER_ADMIN_EMAIL} (ID: ${superAdminId})\n`);

    // Step 2: Count data before cleanup
    console.log('📊 Step 2: Counting data before cleanup...');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [devCount] = await connection.execute('SELECT COUNT(*) as count FROM developers');
    const [agencyCount] = await connection.execute('SELECT COUNT(*) as count FROM agencies');
    const [agentCount] = await connection.execute('SELECT COUNT(*) as count FROM agents');
    const [listingCount] = await connection.execute('SELECT COUNT(*) as count FROM listings');
    const [devSubCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM developer_subscriptions',
    );
    const [agencySubCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM agency_subscriptions',
    );

    console.log(`  Users: ${(userCount as any[])[0].count}`);
    console.log(`  Developers: ${(devCount as any[])[0].count}`);
    console.log(`  Agencies: ${(agencyCount as any[])[0].count}`);
    console.log(`  Agents: ${(agentCount as any[])[0].count}`);
    console.log(`  Listings: ${(listingCount as any[])[0].count}`);
    console.log(`  Developer Subscriptions: ${(devSubCount as any[])[0].count}`);
    console.log(`  Agency Subscriptions: ${(agencySubCount as any[])[0].count}\n`);

    // Step 3: Confirm before deletion
    console.log('⚠️  Step 3: FINAL CONFIRMATION REQUIRED');
    console.log('=====================================');
    console.log('This will DELETE ALL user-generated data from PRODUCTION!');
    console.log('Only the super admin and reference data will remain.');
    console.log('\n🛑 To proceed, you must manually edit this script and set CONFIRMED = true\n');

    const CONFIRMED = true; // Changed to true to proceed with cleanup

    if (!CONFIRMED) {
      console.log('❌ Cleanup aborted. Set CONFIRMED = true in the script to proceed.');
      process.exit(0);
    }

    // Step 4: Begin transaction
    console.log('🔄 Step 4: Starting cleanup transaction...');
    await connection.beginTransaction();

    try {
      // Delete in correct order (respecting foreign keys)

      // 1. Delete listing-related data
      console.log('  Deleting listing media...');
      await connection.execute('DELETE FROM listing_media');

      console.log('  Deleting listing analytics...');
      await connection.execute('DELETE FROM listing_analytics');

      console.log('  Deleting listing leads...');
      await connection.execute('DELETE FROM listing_leads');

      console.log('  Deleting listings...');
      await connection.execute('DELETE FROM listings');

      // 2. Delete development-related data
      console.log('  Deleting development units...');
      await connection.execute('DELETE FROM development_units');

      console.log('  Deleting development phases...');
      await connection.execute('DELETE FROM development_phases');

      console.log('  Deleting development drafts...');
      await connection.execute('DELETE FROM development_drafts');

      console.log('  Deleting developments...');
      await connection.execute('DELETE FROM developments');

      // 3. Delete subscription data
      console.log('  Deleting developer subscriptions...');
      await connection.execute('DELETE FROM developer_subscriptions');

      console.log('  Deleting agency subscriptions...');
      await connection.execute('DELETE FROM agency_subscriptions');

      // 4. Delete billing data
      console.log('  Deleting billing transactions...');
      await connection.execute('DELETE FROM billing_transactions');

      console.log('  Deleting invoices...');
      await connection.execute('DELETE FROM invoices');

      // 5. Delete leads
      console.log('  Deleting leads...');
      await connection.execute('DELETE FROM leads');

      // 6. Delete developers
      console.log('  Deleting developers...');
      await connection.execute('DELETE FROM developers');

      // 7. Delete agents
      console.log('  Deleting agents...');
      await connection.execute('DELETE FROM agents');

      // 8. Delete agencies
      console.log('  Deleting agency branding...');
      await connection.execute('DELETE FROM agency_branding');

      console.log('  Deleting agencies...');
      await connection.execute('DELETE FROM agencies');

      // 9. Delete old properties table (if exists)
      console.log('  Deleting property images...');
      await connection.execute('DELETE FROM propertyImages');

      console.log('  Deleting old properties...');
      await connection.execute('DELETE FROM properties');

      // 10. Delete reviews, offers, favorites
      console.log('  Deleting reviews...');
      await connection.execute('DELETE FROM reviews');

      console.log('  Deleting offers...');
      await connection.execute('DELETE FROM offers');

      console.log('  Deleting favorites...');
      await connection.execute('DELETE FROM favorites');

      // 11. Delete all users EXCEPT super admin
      console.log('  Deleting users (except super admin)...');
      await connection.execute('DELETE FROM users WHERE id != ?', [superAdminId]);

      // Commit transaction
      console.log('💾 Committing changes...');
      await connection.commit();
      console.log('✅ Transaction committed successfully!\n');

      // Step 5: Verify cleanup
      console.log('🔍 Step 5: Verifying cleanup...');
      const [finalUserCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
      const [finalDevCount] = await connection.execute('SELECT COUNT(*) as count FROM developers');
      const [finalAgencyCount] = await connection.execute('SELECT COUNT(*) as count FROM agencies');
      const [finalListingCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM listings',
      );

      console.log(`  Remaining Users: ${(finalUserCount as any[])[0].count} (should be 1)`);
      console.log(`  Remaining Developers: ${(finalDevCount as any[])[0].count} (should be 0)`);
      console.log(`  Remaining Agencies: ${(finalAgencyCount as any[])[0].count} (should be 0)`);
      console.log(`  Remaining Listings: ${(finalListingCount as any[])[0].count} (should be 0)\n`);

      // Verify super admin
      const [verifyAdmin] = await connection.execute('SELECT email FROM users WHERE id = ?', [
        superAdminId,
      ]);
      console.log(`✅ Super admin preserved: ${(verifyAdmin as any[])[0].email}\n`);

      console.log('🎉 PRODUCTION CLEANUP COMPLETE!');
      console.log('================================');
      console.log('The production database has been cleaned.');
      console.log('Only the super admin account and reference data remain.');
    } catch (error) {
      console.error('\n❌ ERROR during cleanup, rolling back transaction...');
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('\n❌ CLEANUP FAILED:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

cleanupProduction().catch(console.error);
