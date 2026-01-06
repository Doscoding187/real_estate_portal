import 'dotenv/config';
import { getDb } from '../server/db';
import { developments, properties, developerSubscriptionUsage } from '../drizzle/schema';
import { isNotNull, sql } from 'drizzle-orm';

async function resetDevelopments() {
  console.log('Starting development reset...');
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  try {
    // 1. Delete Linked Properties (Unit listings created as properties)
    console.log('Deleting linked properties...');
    await db.delete(properties).where(isNotNull(properties.developmentId));

    // 2. Delete Developments (Cascades to phases, units, approval queue)
    console.log('Deleting developments...');
    await db.delete(developments);

    // 3. Reset Subscription Usage
    console.log('Resetting developer subscription usage...');
    await db.update(developerSubscriptionUsage)
      .set({ developmentsCount: 0 });

    console.log('Development reset complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during reset:', error);
    process.exit(1);
  }
}

resetDevelopments();
