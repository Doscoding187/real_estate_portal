import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

async function debugListingDetails() {
  console.log('Connecting to database...');
  console.log('CLOUDFRONT_URL:', process.env.CLOUDFRONT_URL);
  console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
  console.log('AWS_REGION:', process.env.AWS_REGION);
  
  const dbUrl = process.env.DATABASE_URL || '';
  const connection = await mysql.createConnection({
    uri: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  const db = drizzle(connection, { schema, mode: 'default' });
  
  // Get Alberton published listings
  const listings = await db.select()
    .from(schema.listings)
    .where(sql`LOWER(${schema.listings.city}) LIKE '%alberton%' AND ${schema.listings.status} = 'published'`);
    
  console.log(`\nFound ${listings.length} listings in Alberton.`);
  
  for (const listing of listings) {
    console.log(`\n=== Listing ID: ${listing.id} ===`);
    console.log('Title:', listing.title);
    
    // Inspect Property Details
    const details = listing.propertyDetails as any || {};
    console.log('Property Details (JSON):');
    console.log('  unitSizeM2:', details.unitSizeM2);
    console.log('  erfSizeM2:', details.erfSizeM2);
    console.log('  landSizeM2OrHa:', details.landSizeM2OrHa);
    console.log('  bedrooms:', details.bedrooms);
    console.log('  amenitiesFeatures (Highlights):', details.amenitiesFeatures);
    
    // Inspect Media
    const media = await db.select()
      .from(schema.listingMedia)
      .where(eq(schema.listingMedia.listingId, listing.id))
      .orderBy(schema.listingMedia.displayOrder);
      
    console.log(`Media (${media.length} items):`);
    media.forEach((m: any, i) => {
      console.log(`  [${i}] Type: ${m.mediaType}, URL: ${m.mediaUrl}`);
    });
  }
  
  await connection.end();
  console.log('\nDone!');
}

debugListingDetails().catch(console.error);
