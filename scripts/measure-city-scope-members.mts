/**
 * Measures the search-scope question at set level, by canonical identity.
 *
 * Three candidate scope definitions for a city selection are compared:
 *
 *   A  the city place itself                 (the Place Authority scope today)
 *   B  the published city's suburbs          (the published projection scope today)
 *   C  the municipality's localities         (the unproven shortcut)
 *
 * The join is by canonical place identity, through the published-place registry, so no name
 * matching is involved.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDb } from '../server/db-connection';
import { and, eq, inArray } from 'drizzle-orm';
import { place, placeName, placeRelationship } from '../drizzle/schema';

const ROOT = process.cwd();

async function main() {
  const db = await getDb();
  const registry = JSON.parse(
    readFileSync(
      join(ROOT, 'data/geography-coverage-v0.1/output/gauteng_published_place_registry_v0.2.json'),
      'utf8',
    ),
  );
  const placeIdByPath = new Map<string, string>();
  for (const [placeId, entry] of Object.entries(registry.places)) placeIdByPath.set(entry.path, placeId);
  const pathByPlaceId = new Map<string, string>();
  for (const [placeId, entry] of Object.entries(registry.places)) pathByPlaceId.set(placeId, entry.path);

  // Every containment edge.
  const edges = await db
    .select({ from: placeRelationship.fromPlaceId, to: placeRelationship.toPlaceId })
    .from(placeRelationship)
    .where(eq(placeRelationship.relationshipType, 'administratively_contains'));
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, string[]>();
  for (const edge of edges) {
    if (!parentOf.has(edge.from)) parentOf.set(edge.from, edge.to);
    const list = childrenOf.get(edge.to) ?? [];
    list.push(edge.from);
    childrenOf.set(edge.to, list);
  }
  const scopeOf = new Map<string, string | null>();
  const typeOf = new Map<string, string>();
  const placeRows = await db.select({ id: place.placeId, type: place.placeType, scope: place.searchScope }).from(place);
  for (const row of placeRows) {
    scopeOf.set(row.id, row.scope);
    typeOf.set(row.id, row.type);
  }
  const nameRows = await db
    .select({ id: placeName.placeId, name: placeName.name })
    .from(placeName)
    .where(and(eq(placeName.nameRole, 'preferred_public'), eq(placeName.nameState, 'active')));
  const nameById = new Map(nameRows.map(r => [r.id, r.name]));

  // The published city rows, and the canonical place each one binds to.
  const publishedCityPaths = [...placeIdByPath.keys()].filter(p => p.split('/').length === 3);

  interface Comparison {
    city: string;
    place: string;
    container: string;
    published: number;
    containerLocalities: number;
    inBoth: number;
    onlyPublished: string[];
    onlyContainer: string[];
  }
  const comparisons: Comparison[] = [];

  for (const cityPath of publishedCityPaths) {
    const cityPlaceId = placeIdByPath.get(cityPath)!;
    const containerId = parentOf.get(cityPlaceId);
    if (!containerId) continue;

    // B: the published city's published places.
    const publishedPrefix = `${cityPath}/`;
    const publishedSet = new Set<string>();
    for (const [placeId, path] of pathByPlaceId) if (path.startsWith(publishedPrefix)) publishedSet.add(placeId);

    // C: the container's localities.
    const containerSet = new Set<string>();
    for (const childId of childrenOf.get(containerId) ?? []) {
      if (scopeOf.get(childId) === 'locality') containerSet.add(childId);
    }

    const onlyPublished = [...publishedSet].filter(id => !containerSet.has(id));
    const onlyContainer = [...containerSet].filter(id => !publishedSet.has(id));
    comparisons.push({
      city: cityPath,
      place: nameById.get(cityPlaceId) ?? cityPlaceId,
      container: nameById.get(containerId) ?? containerId,
      published: publishedSet.size,
      containerLocalities: containerSet.size,
      inBoth: publishedSet.size - onlyPublished.length,
      onlyPublished: onlyPublished.map(id => pathByPlaceId.get(id) ?? nameById.get(id) ?? id),
      onlyContainer: onlyContainer.map(id => nameById.get(id) ?? id),
    });
  }

  comparisons.sort((a, b) => b.onlyContainer.length - a.onlyContainer.length);

  console.log('# Set-level comparison of the three candidate city scopes\n');
  console.log(`published cities compared: ${comparisons.length}`);
  const totals = comparisons.reduce(
    (acc, c) => ({
      published: acc.published + c.published,
      container: acc.container + c.containerLocalities,
      inBoth: acc.inBoth + c.inBoth,
      onlyPublished: acc.onlyPublished + c.onlyPublished.length,
      onlyContainer: acc.onlyContainer + c.onlyContainer.length,
    }),
    { published: 0, container: 0, inBoth: 0, onlyPublished: 0, onlyContainer: 0 },
  );
  console.log(`  places in the published city's set : ${totals.published}`);
  console.log(`  places in the container's set      : ${totals.container}`);
  console.log(`  in both sets                      : ${totals.inBoth}`);
  console.log(`  only in the published set         : ${totals.onlyPublished}`);
  console.log(`  only in the container set         : ${totals.onlyContainer}`);

  const focus = ['/gauteng/johannesburg', '/gauteng/pretoria', '/gauteng/diepsloot', '/gauteng/alberton', '/gauteng/centurion', '/gauteng/soweto', '/gauteng/randburg'];
  console.log('\n## The published cities that matter, compared with their container');
  console.log('city                          published  container  in-both  only-published  only-container');
  for (const path of focus) {
    const c = comparisons.find(x => x.city === path);
    if (!c) { console.log(`  ${path.padEnd(28)} (no registry binding)`); continue; }
    console.log(`  ${path.padEnd(28)} ${String(c.published).padStart(8)} ${String(c.containerLocalities).padStart(10)} ${String(c.inBoth).padStart(8)} ${String(c.onlyPublished.length).padStart(15)} ${String(c.onlyContainer.length).padStart(15)}`);
  }
  console.log('\n## The published city rows, worst first by extra container members');
  console.log('city                        container                published  container  only-container  only-published');
  for (const c of comparisons.slice(0, 12)) {
    console.log(
      `  ${c.city.padEnd(26)} ${c.container.padEnd(24)} ${String(c.published).padStart(8)} ${String(c.containerLocalities).padStart(10)} ${String(c.onlyContainer.length).padStart(15)} ${String(c.onlyPublished.length).padStart(15)}`,
    );
  }

  console.log('\n## Detail: Johannesburg, and one main place');
  for (const c of comparisons.filter(x => ['/gauteng/johannesburg', '/gauteng/diepsloot'].includes(x.city))) {
    console.log(`\n${c.city}  (${c.place}, container ${c.container})`);
    console.log(`  published members ${c.published}, container members ${c.containerLocalities}, in both ${c.inBoth}`);
    console.log(`  only in container (${c.onlyContainer.length}): ${c.onlyContainer.slice(0, 14).join(', ')}${c.onlyContainer.length > 14 ? ' …' : ''}`);
    console.log(`  only in published (${c.onlyPublished.length}): ${c.onlyPublished.slice(0, 20).join(', ')}${c.onlyPublished.length > 20 ? ' …' : ''}`);
    if (c.onlyPublished.length) console.log(`    (as paths: ${c.onlyPublished.slice(0, 6).map(p => p.startsWith('/') ? p : 'n/a').join(' | ')})`);
  }

  // The national picture: what the municipality scope would mean outside Gauteng.
  console.log('\n## Municipality scope, nationally (container localities vs the city scope itself)');
  const nationalRows: string[] = [];
  for (const [containerId, children] of childrenOf) {
    const containerType = typeOf.get(containerId);
    if (containerType !== 'local_municipality' && containerType !== 'district_municipality') continue;
    const cityScopes = children.filter(id => scopeOf.get(id) === 'metro_city');
    const localities = children.filter(id => scopeOf.get(id) === 'locality');
    if (!cityScopes.length || !localities.length) continue;
    nationalRows.push(
      `  ${(nameById.get(containerId) ?? containerId).padEnd(34)} cityScopes=${String(cityScopes.length).padStart(3)} localities=${String(localities.length).padStart(4)}`,
    );
  }
  console.log(nationalRows.slice(0, 14).join('\n'));
  console.log(`  containers with both city scopes and localities: ${nationalRows.length}`);

  process.exit(0);
}

void main();
