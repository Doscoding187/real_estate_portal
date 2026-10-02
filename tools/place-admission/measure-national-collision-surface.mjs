#!/usr/bin/env node
/**
 * Measure the cross-province collisions a combined national load would have to
 * resolve. This is evidence for the national coverage plan, not an
 * implementation: nothing here changes a package or a Place ID.
 *
 * Three questions, because they are three different hazards:
 *
 *   1. Do two provinces claim the same Place ID?          (must be zero)
 *   2. Does one (parent, normalized name) key appear twice? (structural uniqueness)
 *   3. How often is a bare preferred name ambiguous?       (consumer hazard)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REGISTRY = join(ROOT, 'data/place-admission-territories.v0.1/territory-registry.v0.1.json');

const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));

const places = [];
const names = [];
const parents = new Map();
for (const territory of registry.territories) {
  const dir = join(ROOT, territory.admission_package.directory);
  const read = name =>
    readFileSync(join(dir, territory.admission_package.artifacts[name]), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  for (const place of read('places')) places.push({ ...place, territory: territory.territory_id });
  for (const name of read('names')) names.push({ ...name, territory: territory.territory_id });
  /* Parentage lives in the relationships artifact, not on the name. A name row has
   * no parent column at all, so any natural key built from `name.parent_place_id`
   * silently degenerates to a province-wide bare-name key and reports ordinary
   * homonyms as structural collisions. Build the real map first. */
  for (const edge of read('relationships')) {
    parents.set(`${edge.from_place_id}|${territory.territory_id}`, edge.to_place_id);
  }
}

const parentOf = (placeId, territory) => parents.get(`${placeId}|${territory}`) ?? '<no-parent>';

/* 1. Place ID collisions across provinces. */
const idOwner = new Map();
const idCollisions = [];
for (const place of places) {
  const existing = idOwner.get(place.place_id);
  if (existing && existing !== place.territory) {
    idCollisions.push({ place_id: place.place_id, territories: [existing, place.territory] });
  }
  idOwner.set(place.place_id, place.territory);
}

/* 2. (parent, normalized name) uniqueness. A national `place` table will carry
 *    whatever uniqueness the schema enforces; measure what the data would do
 *    against the natural key the coverage baselines already describe. */
const naturalKey = new Map();
const naturalKeyCollisions = [];
let orphans = 0;
for (const name of names) {
  if (name.name_role !== 'preferred_public') continue;
  const parent = parentOf(name.place_id, name.territory);
  if (parent === '<no-parent>') orphans += 1;
  const key = `${parent}|${String(name.normalized_name ?? name.name).normalize('NFC').toLowerCase()}`;
  const existing = naturalKey.get(key);
  if (existing && existing.territory !== name.territory) {
    naturalKeyCollisions.push({
      key,
      provinces: [existing.territory, name.territory],
      place_ids: [existing.place_id, name.place_id],
    });
  } else if (existing) {
    /* Same province, same parent, same name: a within-province duplicate that
     * admission should already have merged. Counted separately, because it means
     * something different from a cross-province collision. */
    existing.withinProvince += 1;
  } else {
    naturalKey.set(key, { territory: name.territory, place_id: name.place_id, withinProvince: 0 });
  }
}

/* 3. Bare-name ambiguity, which is the consumer-facing hazard. */
const nameProvinces = new Map();
for (const name of names) {
  if (name.name_role !== 'preferred_public') continue;
  const key = String(name.name).normalize('NFC').toLowerCase();
  if (!nameProvinces.has(key)) nameProvinces.set(key, new Set());
  nameProvinces.get(key).add(name.territory);
}
const ambiguous = [...nameProvinces.entries()]
  .filter(([, provinces]) => provinces.size > 1)
  .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));

/* Province roots, because a national table needs exactly nine. */
const roots = places.filter(place => place.place_type === 'province');

console.log(`provinces                 ${places.length ? registry.territories.length : 0}`);
console.log(`places                    ${places.length}`);
console.log(`province roots            ${roots.length}`);
console.log(`place id collisions       ${idCollisions.length}`);
console.log(`natural key collisions    ${naturalKeyCollisions.length}`);
const withinProvinceDuplicates = [...naturalKey.values()].reduce((n, e) => n + e.withinProvince, 0);
console.log(`  of which within-province ${withinProvinceDuplicates}`);
console.log(`names with no parent      ${orphans}`);
console.log(`distinct preferred names  ${nameProvinces.size}`);
console.log(`ambiguous bare names      ${ambiguous.length}`);
console.log(`names in every province   ${ambiguous.filter(([, p]) => p.size === registry.territories.length).length}`);
console.log('');
console.log('widest shared names:');
for (const [name, provinces] of ambiguous.slice(0, 15)) {
  console.log(`  ${name.padEnd(22)} ${provinces.size} provinces  ${[...provinces].sort().join(', ')}`);
}
console.log('');
if (idCollisions.length) {
  console.log('PLACE ID COLLISIONS (must be zero):');
  for (const collision of idCollisions.slice(0, 20)) console.log(`  ${JSON.stringify(collision)}`);
}
if (naturalKeyCollisions.length) {
  console.log(`NATURAL KEY COLLISIONS across provinces (first 20 of ${naturalKeyCollisions.length}):`);
  for (const collision of naturalKeyCollisions.slice(0, 20)) console.log(`  ${collision.key}  ${collision.territories.join(' vs ')}`);
}
process.exit(0);
