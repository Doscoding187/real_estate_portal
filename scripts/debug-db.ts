
import 'dotenv/config';
import { getDb } from '../server/db-connection';
import { developments, developers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function debugInsert() {
  const db = await getDb();
  if (!db) process.exit(1);

  // Find Developer
  const [dev] = await db.select().from(developers).limit(1);
  if (!dev) {
    console.error('No developer found');
    process.exit(1);
  }
  console.log('Using Developer:', dev.id);

  try {
    console.log('Attempting Raw Insert...');
    await db.insert(developments).values({
      developerId: dev.id,
      name: `Debug Dev ${Date.now()}`,
      slug: `debug-dev-${Date.now()}`,
      shortCode: `DBG-${Math.floor(Math.random() * 1000)}`,
      status: 'draft',
      // Required fields based on previous payload
      tagline: 'Debug Tagline',
      description: 'Debug Desc',
      websiteUrl: 'https://example.com',
      developmentType: 'residential',
      floors: 'double-storey', // Testing the new field specifically
      ownershipType: 'sectional-title'
    });
    console.log('✅ Insert Success!');
  } catch (e: any) {
    console.error('❌ Insert Failed Raw:', e);
    console.error('Message:', e.message);
    console.error('Code:', e.code);
    console.error('Keys:', Object.keys(e));
    if (e.cause) console.error('Cause:', e.cause);
  }
  process.exit(0);
}

debugInsert();
