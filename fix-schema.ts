import mysql from 'mysql2/promise';

async function fixSchema() {
  const connection = await mysql.createConnection(
    'mysql://app_user:AppPassword123@localhost:3307/real_estate_portal'
  );

  try {
    console.log('🔍 Checking properties table schema...\n');

    // Check current columns
    const [columns] = await connection.query('DESCRIBE properties');
    const columnNames = (columns as any[]).map((c: any) => c.Field);
    
    console.log('Current columns:', columnNames.join(', '));

    // Check and add missing columns
    const missingColumns = [];
    
    if (!columnNames.includes('enquiries')) {
      missingColumns.push('enquiries');
      console.log('\n❌ Missing enquiries column. Adding it now...');
      await connection.query(
        'ALTER TABLE properties ADD COLUMN enquiries INT NOT NULL DEFAULT 0 AFTER views'
      );
      console.log('✅ Added enquiries column');
    }
    
    if (!columnNames.includes('mainImage')) {
      missingColumns.push('mainImage');
      console.log('\n❌ Missing mainImage column. Adding it now...');
      await connection.query(
        'ALTER TABLE properties ADD COLUMN mainImage VARCHAR(1024) AFTER ratesAndTaxes'
      );
      console.log('✅ Added mainImage column');
    }
    
    if (missingColumns.length === 0) {
      console.log('\n✅ All required columns exist');
    }

    // Check properties count
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM properties');
    const count = (countResult as any[])[0].count;
    console.log(`\n📊 Total properties: ${count}`);

    if (count > 0) {
      // Show properties by province
      const [byProvince] = await connection.query(
        'SELECT province, COUNT(*) as count FROM properties GROUP BY province'
      );
      console.log('\nProperties by province:');
      (byProvince as any[]).forEach((row: any) => {
        console.log(`  ${row.province}: ${row.count}`);
      });

      // Show sample properties
      const [samples] = await connection.query(
        'SELECT id, title, city, province, status FROM properties LIMIT 5'
      );
      console.log('\nSample properties:');
      (samples as any[]).forEach((prop: any) => {
        console.log(`  - ${prop.title} (${prop.city}, ${prop.province}) - ${prop.status}`);
      });
    } else {
      console.log('\n❌ No properties found in database!');
      console.log('\n💡 You need to run a seed script to add sample data:');
      console.log('   npx tsx seed-data.ts');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

fixSchema();
