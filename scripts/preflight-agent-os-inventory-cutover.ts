import 'dotenv/config';
import { and, desc, inArray, sql } from 'drizzle-orm';
import { getDb, getPlatformSetting } from '../server/db';
import { listings, showings } from '../drizzle/schema';
import {
  getInventoryBridgeSchemaCapabilities,
  resolvePropertiesForListings,
} from '../server/services/inventoryLinkResolver';

async function main() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const nodeEnv = process.env.NODE_ENV || 'development';

  console.log('Agent OS inventory cutover preflight');
  console.log(`NODE_ENV=${nodeEnv}`);
  console.log(`DATABASE_URL=${hasDatabaseUrl ? 'set' : 'missing'}`);

  if (!hasDatabaseUrl) {
    console.error('DATABASE_URL is missing. Refusing to run rollout checks against an unknown target.');
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error('Database not available.');
    process.exit(1);
  }

  const capabilities = await getInventoryBridgeSchemaCapabilities(db, { forceRefresh: true });
  const fallbackSetting = await getPlatformSetting('agent_os_allow_legacy_scheduling_inventory');

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
      updatedAt: listings.updatedAt,
    })
    .from(listings)
    .where(inArray(listings.status, ['approved', 'published', 'pending_review', 'draft']))
    .orderBy(desc(listings.updatedAt));

  const resolvedMap = await resolvePropertiesForListings(db, candidateListings);
  const unresolvedListingIds = candidateListings
    .filter(listing => (resolvedMap.get(listing.id)?.propertyId ?? null) == null)
    .map(listing => listing.id);

  let unresolvedShowings = 0;
  if (unresolvedListingIds.length > 0) {
    const counts = await db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(showings)
      .where(inArray(showings.listingId, unresolvedListingIds));

    unresolvedShowings = Number(counts[0]?.total || 0);
  }

  const resolvedListings = candidateListings.length - unresolvedListingIds.length;
  const resolutionRate =
    candidateListings.length > 0 ? resolvedListings / candidateListings.length : 0;

  console.log('');
  console.log('Schema capabilities');
  console.log(
    JSON.stringify(
      {
        propertiesSourceListingIdColumn: capabilities.propertiesSourceListingIdColumn,
        showingsPropertyIdColumn: capabilities.showingsPropertyIdColumn,
        showingsLeadIdColumn: capabilities.showingsLeadIdColumn,
      },
      null,
      2,
    ),
  );

  console.log('');
  console.log('Platform setting');
  console.log(
    JSON.stringify(
      {
        agent_os_allow_legacy_scheduling_inventory:
          fallbackSetting?.settingValue ?? '(not set, defaults to true in app)',
      },
      null,
      2,
    ),
  );

  console.log('');
  console.log('Boundary summary');
  console.log(
    JSON.stringify(
      {
        totalListings: candidateListings.length,
        resolvedListings,
        unresolvedListings: unresolvedListingIds.length,
        unresolvedShowings,
        resolutionRate,
      },
      null,
      2,
    ),
  );

  if (!capabilities.propertiesSourceListingIdColumn || !capabilities.showingsPropertyIdColumn) {
    console.error('');
    console.error('Migration is not fully applied. Run `pnpm migration:sql` before cutover.');
    process.exit(1);
  }

  if (unresolvedListingIds.length > 0) {
    console.error('');
    console.error(
      'Boundary is not clean. Run `pnpm tsx scripts/backfill-agent-os-inventory-bridge.ts` and re-check before disabling legacy fallback.',
    );
    process.exit(2);
  }

  console.log('');
  console.log('Preflight passed. The inventory boundary is clean enough for legacy scheduling cutover.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
