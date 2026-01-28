
import * as dotenv from 'dotenv';
dotenv.config();

import { db, getDb } from '../server/db';
import { developers, developerBrandProfiles, locations } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkIds() {
  const dbConn = await getDb();
  if (!dbConn) {
    console.error('No DB connection');
    return;
  }

  // Check Developer ID 1
  const dev1 = await dbConn.select().from(developers).where(eq(developers.id, 1));
  console.log('Developer ID 1:', dev1.length > 0 ? 'Exists' : 'MISSING');

  // Check Brand Profile ID 1
  const brand1 = await dbConn.select().from(developerBrandProfiles).where(eq(developerBrandProfiles.id, 1));
  console.log('BrandProfile ID 1:', brand1.length > 0 ? 'Exists' : 'MISSING');

  // Check a sample location if possibe - currently we don't know the location ID causing trouble if any
}

checkIds().then(() => process.exit(0)).catch(e => console.error(e));
