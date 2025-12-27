import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, like, desc, and } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

async function testSearch() {
  console.log('Connecting to database...');
  
  const dbUrl = process.env.DATABASE_URL || '';
  const connection = await mysql.createConnection({
    uri: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  const db = drizzle(connection, { schema, mode: 'default' });
  
  // Test with lowercase (slug) - simulating frontend call
  console.log('\n=== Search with lowercase city (slug): "alberton" ===');
  const results1 = await db.select({
    id: schema.listings.id,
    title: schema.listings.title,
    city: schema.listings.city,
    status: schema.listings.status,
    propertyType: schema.listings.propertyType,
  })
  .from(schema.listings)
  .where(
    and(
      eq(schema.listings.status, 'published' as any),
      like(schema.listings.city, '%alberton%')
    )
  );
  
  console.log(`Found ${results1.length} results:`);
  console.table(results1);
  
  // Test with propertyType filter too
  console.log('\n=== Search with city + propertyType ===');
  const results2 = await db.select({
    id: schema.listings.id,
    title: schema.listings.title,
    city: schema.listings.city,
    propertyType: schema.listings.propertyType,
  })
  .from(schema.listings)
  .where(
    and(
      eq(schema.listings.status, 'published' as any),
      like(schema.listings.city, '%alberton%'),
      eq(schema.listings.propertyType, 'house' as any)
    )
  );
  
  console.log(`Found ${results2.length} results:`);
  console.table(results2);
  
  await connection.end();
  console.log('\nDone!');
}

testSearch().catch(console.error);
