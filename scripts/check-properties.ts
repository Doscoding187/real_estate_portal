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

  // Get the latest 5 properties
  const latestProperties = await db
    .select()
    .from(properties)
    .orderBy(desc(properties.createdAt))
    .limit(5);

  console.log(`Found ${latestProperties.length} recent properties:\n`);
  
  latestProperties.forEach((prop, index) => {
    console.log(`${index + 1}. ID: ${prop.id}`);
    console.log(`   Title: ${prop.title}`);
    console.log(`   Status: ${prop.status}`);
    console.log(`   Price: R${prop.price}`);
    console.log(`   Created: ${prop.createdAt}`);
    console.log(`   Image: ${prop.mainImage || 'No image'}`);
    console.log('');
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
