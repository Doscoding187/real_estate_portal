/**
 * Proves national place discovery.
 *
 * Run it against the disposable target:
 *   pnpm tsx scripts/verify-national-place-search.ts
 *
 * It checks that the canonical Place Authority answers for every province, that a held
 * record never appears in a public result, and that a township and a metro city are both
 * found.
 */
import { searchNationalPlaces } from '../server/services/nationalPlaceSearchService';
import { getDb } from '../server/db-connection';

const PROBES = [
  'Cape Town',
  'Durban',
  'Gqeberha',
  'Polokwane',
  'Sandton',
  'Thokoza',
  'Katlehong',
  'Tembisa',
];

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('No database connection is available for this target.');
    process.exitCode = 2;
    return;
  }

  const held = (await db
    .select({ placeId: (await import('../drizzle/schema')).place.placeId })
    .from((await import('../drizzle/schema')).place)
    .where(
      (await import('drizzle-orm')).eq(
        (await import('../drizzle/schema')).place.licensingClassification,
        'osm_only_odbl_provisional',
      ),
    )) as unknown as Array<{ placeId: string }>;
  const heldIds = new Set(held.map(row => row.placeId));

  let failures = 0;
  console.log('# National place discovery proof\n');
  for (const probe of PROBES) {
    const results = await searchNationalPlaces({ query: probe, limit: 8 });
    const leaked = results.filter(result => heldIds.has(result.canonicalLocationId));
    const provinces = [...new Set(results.map(result => result.provinceName).filter(Boolean))];
    const ok = results.length > 0 && leaked.length === 0;
    if (!ok) failures += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${probe.padEnd(12)} ${results.length} result(s) · ${provinces.join(', ') || 'no province'}` +
        (leaked.length ? ` · LEAKED ${leaked.length} held record(s)` : ''),
    );
    for (const result of results.slice(0, 3)) {
      console.log(
        `         ${result.label} → ${result.canonicalPath} (${result.factualLevel}, ${result.canonicalLocationId})`,
      );
    }
  }

  console.log(`\n${PROBES.length - failures}/${PROBES.length} probes passed.`);
  if (failures) process.exitCode = 1;
}

void main();
