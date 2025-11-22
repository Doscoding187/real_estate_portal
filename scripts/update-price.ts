import 'dotenv/config';
import { getDb } from '../server/db';
import { properties } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  console.log('Updating test house price...\n');

  // Update the property price
  await db.update(properties).set({
    price: 3500000
  }).where(eq(properties.id, 60003));

  console.log('✅ Updated price to R3,500,000');
  console.log('\n🔄 Refresh http://localhost:3000/properties to see the correct price!');

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
