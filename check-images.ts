import mysql from 'mysql2/promise';

async function checkImages() {
  const connection = await mysql.createConnection(
    'mysql://app_user:AppPassword123@localhost:3307/real_estate_portal'
  );

  try {
    console.log('🔍 Checking property images...\n');

    // Check properties with images
    const [results] = await connection.query(`
      SELECT 
        p.id, 
        p.title, 
        p.city,
        p.province,
        p.mainImage,
        COUNT(pi.id) as image_count
      FROM properties p
      LEFT JOIN propertyImages pi ON p.id = pi.propertyId
      GROUP BY p.id
      ORDER BY p.id
    `);

    console.log('Properties and their images:');
    (results as any[]).forEach((row: any) => {
      const hasImages = row.image_count > 0 || row.mainImage;
      const icon = hasImages ? '✅' : '❌';
      console.log(`${icon} ${row.title}`);
      console.log(`   Location: ${row.city}, ${row.province}`);
      console.log(`   Main Image: ${row.mainImage || 'None'}`);
      console.log(`   Gallery Images: ${row.image_count}`);
      console.log('');
    });

    // Check if any images exist
    const [imageCount] = await connection.query('SELECT COUNT(*) as count FROM propertyImages');
    const totalImages = (imageCount as any[])[0].count;
    
    if (totalImages === 0) {
      console.log('⚠️  WARNING: No property images found in propertyImages table!');
      console.log('   Properties will not display images.');
      console.log('\n💡 Solution: Run a seed script that includes images, or add images manually.');
    } else {
      console.log(`✅ Total images in propertyImages table: ${totalImages}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkImages();
