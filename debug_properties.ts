
import 'dotenv/config';
import { db, getDb } from './server/db';
import { properties, cities, suburbs } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function listProperties() {
  try {
    const database = await getDb(); // Initialize connection
    if (!database) throw new Error('Failed to connect to DB');

    const allProperties = await database.select().from(properties);
    console.log(`Found ${allProperties.length} properties.`);
    
    allProperties.forEach(p => {
        console.log('--- Property ---');
        console.log(`ID: ${p.id}`);
        console.log(`Title: ${p.title}`);
        console.log(`Type: ${p.propertyType}`);
        console.log(`Listing Type: ${p.listingType}`);
        console.log(`Status: ${p.status}`);
        console.log(`Approval Status: ${p.approvalStatus}`);
        console.log(`Location: ${p.address}, ${p.city}, ${p.province}`);
        console.log(`Images: ${p.images ? 'Has images' : 'No images'}`);
    });

    console.log('\n--- Location Lookup ---');
    const citiesResult = await database.select().from(cities).where(eq(cities.name, 'Alberton'));
    console.log('Alberton City:', citiesResult);

    // Schema mismatch prevention
    // const suburbsResult = await database.select().from(suburbs).where(eq(suburbs.name, 'Sky City'));
    // console.log('Sky City Suburb:', suburbsResult);
    
    process.exit(0);
  } catch (error) {
    console.error('Error listing properties:', error);
    process.exit(1);
  }
}

listProperties();
