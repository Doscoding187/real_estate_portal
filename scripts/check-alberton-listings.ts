import { getDb } from '../server/db';
import { properties } from '../drizzle/schema';
import { sql, or, eq } from 'drizzle-orm';

async function checkAlbertonListings() {
  const db = await getDb();
  console.log('\n=== Checking Alberton Listings ===\n');
  
  // Check all listings with alberton in address
  const addressCheck = await db
    .select({
      id: properties.id,
      title: properties.title,
      address: properties.address,
      city: properties.city,
      province: properties.province,
      propertyType: properties.propertyType,
      status: properties.status,
    })
    .from(properties)
    .where(sql`${properties.address} LIKE ${'%alberton%'}`)
    .limit(10);
  
  console.log(`Found ${addressCheck.length} listings with 'alberton' in address:`);
  addressCheck.forEach(listing => {
    console.log(`- ID: ${listing.id}, Type: ${listing.propertyType}, Status: ${listing.status}`);
    console.log(`  Address: ${listing.address}`);
    console.log(`  City: ${listing.city}, Province: ${listing.province}`);
  });
  
  // Check published/available listings
  console.log('\n=== Checking Published/Available Listings ===\n');
  const publishedCheck = await db
    .select({
      id: properties.id,
      title: properties.title,
      address: properties.address,
      status: properties.status,
      propertyType: properties.propertyType,
    })
    .from(properties)
    .where(
      sql`${properties.address} LIKE ${'%alberton%'} AND (${properties.status} = 'published' OR ${properties.status} = 'available')`
    )
    .limit(10);
  
  console.log(`Found ${publishedCheck.length} published/available listings in Alberton:`);
  publishedCheck.forEach(listing => {
    console.log(`- ID: ${listing.id}, Type: ${listing.propertyType}, Status: ${listing.status}`);
  });
  
  process.exit(0);
}

checkAlbertonListings().catch(console.error);
