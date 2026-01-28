
import 'dotenv/config';
import { getDb } from './server/db-connection';
import { developers, locations } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkReferences() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to DB');
    return;
  }

  console.log('Checking developerId 1...');
  const developer = await db.select({ id: developers.id }).from(developers).where(eq(developers.id, 1)).limit(1);
  console.log('Developer 1 exists:', developer.length > 0);
  if (developer.length > 0) {
      console.log('Developer details:', developer[0]);
  }

  console.log('Checking locationId 2198...');
  // Note: locations table not fully visible in previous schema dump but referenced.
  // Assuming it exists and adheres to schema.
  try {
      const location = await db.select({ id: locations.id }).from(locations).where(eq(locations.id, 2198)).limit(1);
      console.log('Location 2198 exists:', location.length > 0);
      
      const allLocations = await db.select({ id: locations.id }).from(locations).limit(5);
      console.log('First 5 locations:', allLocations);
  } catch (e) {
      console.error('Error querying locations table:', e);
  }
  
  process.exit(0);
}

checkReferences();
