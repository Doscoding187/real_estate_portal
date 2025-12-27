import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';
import * as dbLib from '../server/db.js'; // Import the actual db functions if possible, or replicate the logic

// Since I cannot easily import the server/db.ts file due to it being a module with potentially complex imports, 
// I will replicate the transform logic exactly as it is in the current file to test it against the real DB data.

async function debugSearchApi() {
  console.log('Connecting to database...');
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
    
  console.log(`\nFound ${listings.length} listings.`);
  
  if (listings.length > 0) {
    const listing = listings[0];
    console.log(`Processing Listing: ${listing.title}`);
    
    const details = listing.propertyDetails as any || {};
    
    // REPLICATE THE NEW TRANSFORMATION LOGIC FROM server/db.ts
    const amenities = [
      ...(Array.isArray(details.amenities) ? details.amenities : []),
      ...(Array.isArray(details.amenitiesFeatures) ? details.amenitiesFeatures : []),
      ...(Array.isArray(details.securityFeatures) ? details.securityFeatures : []),
      ...(Array.isArray(details.kitchenFeatures) ? details.kitchenFeatures : []),
      ...(Array.isArray(details.outdoorFeatures) ? details.outdoorFeatures : []),
      ...(Array.isArray(details.energyFeatures) ? details.energyFeatures : []),
      details.waterHeating,
      details.waterSupply
    ].filter(Boolean).flat();

    const features = amenities; // Same logic
    
    console.log('--- Transformation Logic Check ---');
    console.log('details keys:', Object.keys(details));
    console.log('details.securityFeatures:', details.securityFeatures);
    console.log('details.waterHeating:', details.waterHeating);
    console.log('Calculated amenities:', amenities);
    if (Array.isArray(features)) {
      console.log('Length:', features.length);
      console.log('Item 0 type:', typeof features[0]);
    }
  }
  
  await connection.end();
}

debugSearchApi().catch(console.error);
