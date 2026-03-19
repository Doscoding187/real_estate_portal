import 'dotenv/config';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '../server/db';
import { listings, properties, showings } from '../drizzle/schema';
import {
  getInventoryBridgeSchemaCapabilities,
  resolvePropertyForListing,
} from '../server/services/inventoryLinkResolver';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  const capabilities = await getInventoryBridgeSchemaCapabilities(db, { forceRefresh: true });
  if (!capabilities.propertiesSourceListingIdColumn) {
    console.error('Missing properties.sourceListingId. Run the migration first.');
    process.exit(1);
  }

  const candidateListings = await db
    .select({
      id: listings.id,
      ownerId: listings.ownerId,
      agentId: listings.agentId,
      title: listings.title,
      address: listings.address,
      city: listings.city,
      province: listings.province,
      status: listings.status,
    })
    .from(listings)
    .where(inArray(listings.status, ['approved', 'published', 'pending_review', 'draft']));

  let linkedProperties = 0;
  let updatedShowings = 0;

  for (const listing of candidateListings) {
    const resolved = await resolvePropertyForListing(db, listing);
    if (!resolved.propertyId) continue;

    const propertyUpdate = await db
      .update(properties)
      .set({ sourceListingId: listing.id })
      .where(and(eq(properties.id, resolved.propertyId), isNull(properties.sourceListingId)));

    linkedProperties += Number((propertyUpdate as any)?.[0]?.affectedRows || 0);

    if (capabilities.showingsPropertyIdColumn) {
      const showingUpdate = await db
        .update(showings)
        .set({ propertyId: resolved.propertyId })
        .where(and(eq(showings.listingId, listing.id), isNull(showings.propertyId)));

      updatedShowings += Number((showingUpdate as any)?.[0]?.affectedRows || 0);
    }
  }

  console.log(`Linked properties: ${linkedProperties}`);
  console.log(`Backfilled showings.propertyId: ${updatedShowings}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
