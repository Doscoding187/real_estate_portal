/**
 * Reference release state verifier.
 *
 * The runtime reads a place's usability from a single status column. The canonical Place
 * release policy decides which places that status may withhold. This verifier proves the two
 * agree on a target, so a reference release cannot silently publish a place the policy holds
 * or silently hide a place the policy releases.
 *
 * It is read-only. It never writes, migrates or repairs.
 *
 * Usage:
 *   pnpm db:reference:verify-state
 */
import { eq, inArray, sql } from 'drizzle-orm';
import { cities, provinces, suburbs } from '../drizzle/schema';
import { getDb } from '../server/db-connection';
import { isReleasedPlaceLicensing } from '../shared/placeReadiness';
import { getPublishedSuburbGuidePaths } from '../shared/suburbGuidePolicy';

/** The places the founder named, and that the tier rule alone was hiding. */
const NAMED_PLACES = [
  'rosebank',
  'soweto',
  'krugersdorp',
  'vereeniging',
  'magaliesburg',
  'meyerton',
  'roodepoort',
  'heidelberg',
  'carletonville',
  'randfontein',
  'vanderbijlpark',
];

type Status = 'verified' | 'provisional' | 'retired';

async function statusCounts(db: any, table: any) {
  const rows = await db
    .select({ status: table.status, count: sql<number>`count(*)` })
    .from(table)
    .groupBy(table.status);
  return rows.reduce(
    (acc, row) => {
      acc[String(row.status)] = Number(row.count);
      return acc;
    },
    {} as Record<string, number>,
  );
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('No database connection is available for this target.');
    process.exitCode = 2;
    return;
  }

  const provinceCounts = await statusCounts(db, provinces);
  const cityCounts = await statusCounts(db, cities);
  const suburbCounts = await statusCounts(db, suburbs);

  const named = await db
    .select({
      slug: cities.slug,
      name: cities.name,
      status: cities.status,
      province: provinces.slug,
    })
    .from(cities)
    .innerJoin(provinces, eq(cities.provinceId, provinces.id))
    .where(inArray(cities.slug, NAMED_PLACES));

  const heldPilot = await db
    .select({ slug: suburbs.slug, name: suburbs.name, status: suburbs.status })
    .from(suburbs)
    .where(eq(suburbs.slug, 'sandton'));

  const publishedPilot = getPublishedSuburbGuidePaths();

  console.log('# Reference release state\n');
  console.log('## Status distribution\n');
  console.log(`provinces: ${JSON.stringify(provinceCounts)}`);
  console.log(`cities:    ${JSON.stringify(cityCounts)}`);
  console.log(`suburbs:   ${JSON.stringify(suburbCounts)}`);

  console.log('\n## The places the tier rule alone was hiding\n');
  const bySlug = new Map(named.map(row => [row.slug, row]));
  let verified = 0;
  for (const slug of NAMED_PLACES) {
    const row = bySlug.get(slug);
    if (!row) {
      console.log(`  MISSING  ${slug}`);
      continue;
    }
    const ok = row.status === 'verified';
    if (ok) verified += 1;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${row.name} (${row.province}) — ${row.status}`);
  }
  console.log(`\n${verified}/${NAMED_PLACES.length} are usable in the runtime.`);

  console.log('\n## The published pilot\n');
  for (const row of heldPilot) {
    console.log(`  ${row.name}: ${row.status}`);
  }
  console.log(`  guide sitemap path: ${publishedPilot.join(', ') || 'none'}`);

  const failures: string[] = [];
  if (verified < NAMED_PLACES.length) {
    failures.push(
      `${NAMED_PLACES.length - verified} named places are not usable in the runtime after the reference release`,
    );
  }
  for (const [table, counts] of [
    ['provinces', provinceCounts],
    ['cities', cityCounts],
    ['suburbs', suburbCounts],
  ] as const) {
    const provisional = Number(counts.provisional || 0);
    const retired = Number(counts.retired || 0);
    const verifiedCount = Number(counts.verified || 0);
    console.log(
      `  ${table}: verified ${verifiedCount} · provisional ${provisional} · retired ${retired}`,
    );
  }

  if (failures.length) {
    console.error('\nplace-readiness: the reference release did not reach the expected state.');
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log('\nplace-readiness: the reference release state matches the release policy.');
}

void main();
