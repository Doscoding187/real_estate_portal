/**
 * Update Brand Profiles with Operating Provinces
 * 
 * Sets operatingProvinces based on the provinces of their developments.
 * 
 * Run: npx tsx scripts/update-brand-provinces.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

async function updateBrandProvinces() {
  console.log('🏗️ Updating Brand Profiles with Operating Provinces...\n');

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
    // Get all brand profiles
    console.log('📌 Fetching brand profiles...');
    const [brands] = await connection.query<any[]>(`
      SELECT id, brand_name, operating_provinces, head_office_location FROM developer_brand_profiles
    `);
    
    console.log(`Found ${brands.length} brand profiles\n`);

    for (const brand of brands) {
      console.log(`\n🔍 Processing: ${brand.brand_name} (ID: ${brand.id})`);
      
      // Get provinces from developments linked to this brand
      const [devProvinces] = await connection.query<any[]>(`
        SELECT DISTINCT province FROM developments 
        WHERE developer_brand_profile_id = ? OR marketing_brand_profile_id = ?
      `, [brand.id, brand.id]);
      
      const provinces = devProvinces
        .map((d: any) => d.province?.trim())
        .filter((p: string) => p && SA_PROVINCES.some(sp => sp.toLowerCase() === p.toLowerCase()));

      // Normalize province names
      const normalizedProvinces = provinces.map((p: string) => {
        return SA_PROVINCES.find(sp => sp.toLowerCase() === p.toLowerCase()) || p;
      });

      // Get unique provinces
      const uniqueProvinces = [...new Set(normalizedProvinces)];

      // Also try to infer from head office location
      if (uniqueProvinces.length === 0 && brand.head_office_location) {
        const matchedProvince = SA_PROVINCES.find(
          p => brand.head_office_location.toLowerCase().includes(p.toLowerCase())
        );
        if (matchedProvince) {
          uniqueProvinces.push(matchedProvince);
        }
      }

      console.log(`  Developments in provinces: ${uniqueProvinces.join(', ') || 'None found'}`);

      if (uniqueProvinces.length > 0) {
        // Update the brand profile
        await connection.query(`
          UPDATE developer_brand_profiles 
          SET operating_provinces = ? 
          WHERE id = ?
        `, [JSON.stringify(uniqueProvinces), brand.id]);
        console.log(`  ✅ Updated with: ${uniqueProvinces.join(', ')}`);
      } else {
        console.log(`  ⚠️ No provinces found - you may need to set manually`);
      }
    }

    console.log('\n\n✅ Brand profiles updated!');
    console.log('Reload the Super Admin Publisher to see brands in province tabs.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

updateBrandProvinces();
