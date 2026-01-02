/**
 * Clean Up Duplicate Cosmopolitan Data
 * 
 * Actions:
 * 1. Delete brand profile 60001 (duplicate with 0 developments)
 * 2. Delete draft developments 240001 and 240002
 * 3. Keep brand profile 1 and published development 240003
 * 
 * Run: npx tsx scripts/perform-cleanup.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function performCleanup() {
  console.log('🧹 Starting cleanup...\n');

  const dbUrl = process.env.DATABASE_URL!;
  const url = new URL(dbUrl);
  
  const config = {
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: url.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: true } : undefined,
  };

  const connection = await mysql.createConnection(config);

  try {
    // ===== STEP 1: Delete draft developments =====
    console.log('📌 STEP 1: Deleting draft developments (240001, 240002)...\n');
    
    // First delete related records (unit_types, if any)
    console.log('  Deleting related unit_types...');
    await connection.query(`DELETE FROM unit_types WHERE development_id IN (240001, 240002)`);
    console.log('  ✅ Unit types deleted');

    // Delete from development_approval_queue
    console.log('  Deleting approval queue entries...');
    await connection.query(`DELETE FROM development_approval_queue WHERE development_id IN (240001, 240002)`);
    console.log('  ✅ Approval queue entries deleted');

    // Delete the developments
    console.log('  Deleting developments...');
    const [delResult] = await connection.query<any>(`DELETE FROM developments WHERE id IN (240001, 240002)`);
    console.log(`  ✅ Deleted ${delResult.affectedRows} development(s)`);

    // ===== STEP 2: Delete duplicate brand profile =====
    console.log('\n📌 STEP 2: Deleting duplicate brand profile (ID 60001)...\n');
    
    const [bpResult] = await connection.query<any>(`DELETE FROM developer_brand_profiles WHERE id = 60001`);
    console.log(`  ✅ Deleted ${bpResult.affectedRows} brand profile(s)`);

    // ===== VERIFICATION =====
    console.log('\n📌 VERIFICATION: Checking remaining data...\n');
    
    // Check remaining brand profiles
    const [remainingBP] = await connection.query<any[]>(`
      SELECT id, brand_name FROM developer_brand_profiles 
      WHERE brand_name LIKE '%Cosmopolitan%'
    `);
    console.log(`  Remaining Cosmopolitan brand profiles: ${remainingBP.length}`);
    remainingBP.forEach((bp: any) => console.log(`    - ID ${bp.id}: ${bp.brand_name}`));

    // Check remaining developments
    const [remainingDev] = await connection.query<any[]>(`
      SELECT id, name, isPublished, approval_status 
      FROM developments 
      WHERE developer_brand_profile_id = 1
    `);
    console.log(`  Remaining developments for brand profile 1: ${remainingDev.length}`);
    remainingDev.forEach((d: any) => console.log(`    - ID ${d.id}: ${d.name} (published: ${d.isPublished})`));

    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

performCleanup()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });
