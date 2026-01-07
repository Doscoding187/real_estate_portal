import 'dotenv/config';
import { getDb } from '../server/db';
import { developments, properties, listings, developmentDrafts, developerSubscriptionUsage } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

async function resetInventory() {
  console.log('Starting full inventory reset...');
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  try {
    // 1. Delete Properties (Secondary market + units)
    console.log('Deleting all properties...');
    await db.delete(properties);

    // 2. Delete Listings (Alternative table)
    console.log('Deleting all listings...');
    await db.delete(listings);

    // 3. Delete Developments (Cascades to phases, units)
    console.log('Deleting all developments...');
    await db.delete(developments);

    // 4. Delete Development Drafts
    console.log('Deleting development drafts...');
    await db.delete(developmentDrafts);

    // 5. Reset Subscription Usage
    console.log('Resetting developer subscription usage...');
    await db.update(developerSubscriptionUsage)
      .set({ developmentsCount: 0 });

    console.log('Inventory reset complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during reset:', error);
    process.exit(1);
  }
}

resetInventory();
