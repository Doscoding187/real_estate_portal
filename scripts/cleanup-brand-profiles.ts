/**
 * Investigate and Clean Up Duplicate Brand Profiles
 * 
 * This script will:
 * 1. List all brand profiles with "Cosmopolitan" in the name
 * 2. Show developments linked to each
 * 3. Allow cleanup of duplicates
 * 
 * Run: npx tsx scripts/cleanup-brand-profiles.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function investigateBrandProfiles() {
  console.log('🔍 Investigating brand profiles...\n');

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
    // 1. List all Cosmopolitan-related brand profiles
    console.log('📌 STEP 1: Finding Cosmopolitan brand profiles...\n');
    
    const [brandProfiles] = await connection.query<any[]>(`
      SELECT id, brand_name, logo_url, created_at
      FROM developer_brand_profiles
      WHERE brand_name LIKE '%Cosmopolitan%' OR brand_name LIKE '%cosmopolitan%'
      ORDER BY created_at
    `);

    console.log(`Found ${brandProfiles.length} Cosmopolitan brand profile(s):\n`);
    brandProfiles.forEach((bp: any) => {
      console.log(`  ID: ${bp.id}`);
      console.log(`  Name: ${bp.brand_name}`);
      console.log(`  Created: ${bp.created_at}`);
      console.log('  ---');
    });

    // 2. For each brand profile, show linked developments
    console.log('\n📌 STEP 2: Checking developments linked to each brand profile...\n');
    
    for (const bp of brandProfiles) {
      const [devs] = await connection.query<any[]>(`
        SELECT id, name, approval_status, isPublished, developer_id, developer_brand_profile_id, dev_owner_type
        FROM developments
        WHERE developer_brand_profile_id = ?
        ORDER BY id
      `, [bp.id]);

      console.log(`Brand Profile ID ${bp.id} (${bp.brand_name}):`);
      console.log(`  Linked developments: ${devs.length}`);
      
      if (devs.length > 0) {
        devs.forEach((d: any) => {
          console.log(`    - ID ${d.id}: ${d.name} (published: ${d.isPublished}, status: ${d.approval_status}, owner_type: ${d.dev_owner_type})`);
        });
      }
      console.log('');
    }

    // 3. List ALL developments with their ownership info
    console.log('📌 STEP 3: All developments with ownership info...\n');
    
    const [allDevs] = await connection.query<any[]>(`
      SELECT 
        d.id, 
        d.name, 
        d.approval_status, 
        d.isPublished,
        d.developer_id,
        d.developer_brand_profile_id,
        d.dev_owner_type,
        bp.name as brand_name
      FROM developments d
      LEFT JOIN developer_brand_profiles bp ON d.developer_brand_profile_id = bp.id
      ORDER BY d.id DESC
      LIMIT 20
    `);

    console.log('Recent 20 developments:');
    allDevs.forEach((d: any) => {
      console.log(`  ID ${d.id}: "${d.name}"`);
      console.log(`    developer_id: ${d.developer_id || 'NULL'}`);
      console.log(`    brand_profile_id: ${d.developer_brand_profile_id || 'NULL'} (${d.brand_name || 'no brand'})`);
      console.log(`    owner_type: ${d.dev_owner_type || 'NULL'}`);
      console.log(`    published: ${d.isPublished}, status: ${d.approval_status}`);
      console.log('');
    });

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`  Total Cosmopolitan brand profiles: ${brandProfiles.length}`);
    
    if (brandProfiles.length > 1) {
      console.log('\n⚠️  DUPLICATE DETECTED!');
      console.log('  To clean up, we need to:');
      console.log('  1. Identify which brand profile to KEEP (the one with the published development)');
      console.log('  2. Reassign any developments from the duplicate to the correct one');
      console.log('  3. Delete the duplicate brand profile');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

investigateBrandProfiles()
  .then(() => {
    console.log('\n✅ Investigation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
