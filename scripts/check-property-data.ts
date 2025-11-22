import 'dotenv/config';
import { getDb } from '../server/db';
import { properties } from '../drizzle/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  // Get the latest property
  const [latestProperty] = await db
    .select()
    .from(properties)
    .orderBy(desc(properties.createdAt))
    .limit(1);

  if (!latestProperty) {
    console.error('No properties found');
    process.exit(1);
  }

  console.log('Latest Property Data:');
  console.log('ID:', latestProperty.id);
  console.log('Title:', latestProperty.title);
  console.log('Property Type:', latestProperty.propertyType);
  console.log('Area:', latestProperty.area);
  console.log('\nProperty Settings (JSON):');
  console.log(JSON.stringify(latestProperty.propertySettings, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
