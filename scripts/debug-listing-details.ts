import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

async function debugListingDetails() {
  console.log('Connecting to database...');
  console.log('ENV VARS CHECK:');
  console.log('  CLOUDFRONT_URL:', process.env.CLOUDFRONT_URL);
  console.log('  S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
  console.log('  AWS_REGION:', process.env.AWS_REGION);
  
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
    
    // Inspect Property Details - Dump ALL keys
    const details = listing.propertyDetails as any || {};
    console.log('Property Details Keys:', Object.keys(details));
    console.log('Full Details JSON:', JSON.stringify(details, null, 2));
    
    // Inspect Media with Correct Columns
    const media = await db.select()
      .from(schema.listingMedia)
      .where(eq(schema.listingMedia.listingId, listing.id))
      .orderBy(schema.listingMedia.displayOrder);
      
    console.log(`Media (${media.length} items):`);
    media.slice(0, 5).forEach((m: any, i) => {
      console.log(`  [${i}] Type: ${m.mediaType}`);
      console.log(`      originalUrl: ${m.originalUrl}`);
      console.log(`      processedUrl: ${m.processedUrl}`);
      console.log(`      thumbnailUrl: ${m.thumbnailUrl}`);
    });
  }
  
  await connection.end();
  console.log('\nDone!');
}

debugListingDetails().catch(console.error);
