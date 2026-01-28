/**
 * Read-only helper to inspect a development and its unit types.
 * Run: npx tsx server/scripts/inspect-dev-units.ts [developmentId]
 */
import 'dotenv/config';
import { getDb } from '../db-connection';
import { developments, unitTypes } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to DB');
    return;
  }

  const idArg = process.argv[2];
  let id = idArg ? Number(idArg) : 0;

  if (!id) {
    console.log('No ID provided. Listing last 5 developments:');
    const recent = await db
      .select({ id: developments.id, name: developments.name, slug: developments.slug })
      .from(developments)
      .orderBy(desc(developments.id))
      .limit(5);

    console.table(recent);
    if (recent.length > 0) {
      id = recent[0].id; // Default to latest
      console.log(`\nInspecting latest development ID: ${id}`);
    } else {
      return;
    }
  }

  const dev = await db.select().from(developments).where(eq(developments.id, id)).limit(1);
  const units = await db.select().from(unitTypes).where(eq(unitTypes.developmentId, id));

  if (!dev[0]) {
    console.log(`Development ${id} not found.`);
    return;
  }

  console.log('\n=== DEVELOPMENT METADATA ===');
  console.log('ID:', dev[0].id);
  console.log('Name:', dev[0].name);
  console.log(
    'Estate Specs (Raw):',
    dev[0].estateSpecs
      ? typeof dev[0].estateSpecs === 'string'
        ? dev[0].estateSpecs.slice(0, 100)
        : JSON.stringify(dev[0].estateSpecs).slice(0, 100)
      : 'NULL',
  );

  console.log('\n=== UNIT TYPES ===');
  console.log('Total Units:', units.length);

  const mappedUnits = units.map(u => ({
    id: u.id,
    bedrooms: u.bedrooms,
    basePriceFrom: u.basePriceFrom,
    baseMediaType: u.baseMedia ? typeof u.baseMedia : 'undefined',
    // Safe snippet of baseMedia
    baseMediaSnippet: u.baseMedia ? JSON.stringify(u.baseMedia).slice(0, 120) : 'NULL',
    ownershipType: u.ownershipType,
    structuralType: u.structuralType,
  }));

  console.table(mappedUnits);
}

main().catch(console.error);
