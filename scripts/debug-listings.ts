import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, like, desc } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

async function debugListings() {
  console.log('Connecting to database...');
  
  // Parse DATABASE_URL and add SSL
  const dbUrl = process.env.DATABASE_URL || '';
  const connection = await mysql.createConnection({
    uri: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  const db = drizzle(connection, { schema, mode: 'default' });
  
  // Check all listings and their status
  console.log('\n=== All Listings (Latest 10) ===');
  const allListings = await db.select({
    id: schema.listings.id,
    title: schema.listings.title,
    city: schema.listings.city,
    status: schema.listings.status,
    approvalStatus: schema.listings.approvalStatus,
    propertyType: schema.listings.propertyType,
  })
  .from(schema.listings)
  .orderBy(desc(schema.listings.id))
  .limit(10);
  
  console.table(allListings);
  
  // Check for Alberton listings specifically
  console.log('\n=== Alberton Listings ===');
  const albertonListings = await db.select({
    id: schema.listings.id,
    title: schema.listings.title,
    city: schema.listings.city,
    status: schema.listings.status,
    approvalStatus: schema.listings.approvalStatus,
  })
  .from(schema.listings)
  .where(like(schema.listings.city, '%Alberton%'));
  
  console.table(albertonListings);
  
  // Check published listings
  console.log('\n=== Published Listings ===');
  const publishedListings = await db.select({
    id: schema.listings.id,
    title: schema.listings.title,
    city: schema.listings.city,
    status: schema.listings.status,
  })
  .from(schema.listings)
  .where(eq(schema.listings.status, 'published' as any));
  
  console.table(publishedListings);

  // Check approved listings
  console.log('\n=== Approved (approvalStatus) Listings ===');
  const approvedListings = await db.select({
    id: schema.listings.id,
    title: schema.listings.title,
    city: schema.listings.city,
    status: schema.listings.status,
    approvalStatus: schema.listings.approvalStatus,
  })
  .from(schema.listings)
  .where(eq(schema.listings.approvalStatus, 'approved' as any));
  
  console.table(approvedListings);
  
  await connection.end();
  console.log('\nDone!');
}

debugListings().catch(console.error);
