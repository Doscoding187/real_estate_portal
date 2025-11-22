import 'dotenv/config';
import { getDb } from '../server/db';
import { approveListing } from '../server/db';
import { listings } from '../drizzle/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  // Get the latest listing
  const [latestListing] = await db
    .select()
    .from(listings)
    .orderBy(desc(listings.createdAt))
    .limit(1);

  if (!latestListing) {
    console.error('No listings found');
    process.exit(1);
  }

  console.log(`Found latest listing: ${latestListing.id} - ${latestListing.title}`);
  console.log(`Current status: ${latestListing.status}`);

  if (latestListing.status === 'published') {
    console.log('Listing is already published');
    process.exit(0);
  }

  console.log('Approving listing...');
  // Use a dummy admin ID (e.g., 1)
  await approveListing(latestListing.id, 1, 'Auto-approved by verification script');
  
  console.log('Listing approved successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
