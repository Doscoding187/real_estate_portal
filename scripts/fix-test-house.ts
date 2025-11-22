import 'dotenv/config';
import { getDb, approveListing } from '../server/db';
import { properties, listings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  console.log('Fixing test house listing...\n');

  // Delete the property (ID: 60002) so we can recreate it
  console.log('Deleting old property...');
  await db.delete(properties).where(eq(properties.id, 60002));
  console.log('✅ Deleted old property');

  // Reset listing status so it can be re-approved
  console.log('Resetting listing status...');
  await db.update(listings).set({
    status: 'pending_review',
    approvalStatus: 'pending',
    publishedAt: null
  }).where(eq(listings.id, 150003));
  console.log('✅ Reset listing status');

  // Re-approve with fixed code
  console.log('\nRe-approving listing with fixed code...');
  await approveListing(150003, 1);
  console.log('✅ Listing re-approved!');

  console.log('\n🔄 Refresh http://localhost:3000/properties to see the updated property card!');

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
