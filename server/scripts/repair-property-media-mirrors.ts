import 'dotenv/config';
import { inArray } from 'drizzle-orm';
import { listings } from '../../drizzle/schema';
import { getDb, syncPublishedListingMediaToPropertyMirror } from '../db';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available.');
    process.exit(1);
  }

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      status: listings.status,
    })
    .from(listings)
    .where(inArray(listings.status, ['published', 'approved'] as any[]));

  console.log(`Found ${rows.length} published/approved listings to check.`);

  let synced = 0;
  let skipped = 0;
  const reasons: Record<string, number> = {};

  for (const row of rows) {
    const result = await syncPublishedListingMediaToPropertyMirror(Number(row.id));
    if ((result as any).synced) {
      synced += 1;
      continue;
    }

    skipped += 1;
    const reason = String((result as any).reason || 'unknown');
    reasons[reason] = (reasons[reason] || 0) + 1;
  }

  console.log(`Synced: ${synced}`);
  console.log(`Skipped: ${skipped}`);
  if (Object.keys(reasons).length > 0) {
    console.log('Skip reasons:', reasons);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('repair-property-media-mirrors failed:', error);
    process.exit(1);
  });

