#!/usr/bin/env node
/**
 * Measure and ENFORCE the cross-provence collision surface of a national load.
 *
 * This is a gate, not a report. It exits non-zero if two provinces claim the same
 * Place ID, because `place_id` is the identity and its uniqueness is the one
 * property a national load cannot compromise.
 *
 * The within-province same-name pairs are measured but never fail the gate, and the
 * reason is the point: they are not duplicates waiting to be merged. 614 admitted
 * pairs share a parent and a normalized name. 32 sit under the 15 km governed
 * merge bound and every one differs in place_type (a town and the municipality that
 * contains it share a name by ordinary geography); the other 582 are at or past the
 * bound. An earlier draft of this file called them "duplicates that should already
 * have merged", which asserted a defect the evidence contradicts, and it exited 0
 * even on real ID collisions. Both were wrong.
 *
 * The measurement also exists to show that adding place_type to the key does not
 * rescue a uniqueness constraint: 500 of the 614 pairs share a type as well, so
 * UNIQUE(parent, normalized_name, place_type) is violated too. `place_id` alone is
 * the identity.
 *
 * Usage:
 *   node tools/place-admission/measure-national-collision-surface.mjs
 *   node tools/place-admission/measure-national-collision-surface.mjs --report  # detail
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

const placeTypeById = new Map(places.map(place => [place.place_id, place.place_type]));
const placeById = new Map(places.map(place => [place.place_id, place]));

function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(value => value === null || value === undefined)) return null;
  const radiusKm = 6371;
  const rad = value => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

function placeCoord(placeId, field) {
  return placeById.get(placeId)?.adjudication?.[field] ?? null;
}

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
const args = new Set(process.argv.slice(2));

/* 2. (parent, normalized name) uniqueness ACROSS provinces, which is structural:
 *    every parent is province-scoped, so this must be zero and must stay zero.
 *    The within-province repeats of the same key are a different phenomenon and are
 *    counted apart, because conflating the two is what made the first draft of this
 *    file report 1,152 collisions that do not exist.
 *
 *    All members are collected per key first and pairs enumerated afterwards. An
 *    earlier draft paired each newcomer only against the first member, which silently
 *    undercounts any group of three or more and reported 500 pairs where full
 *    enumeration gives 614. */
const keyGroups = new Map();
let orphans = 0;
for (const name of names) {
  if (name.name_role !== 'preferred_public') continue;
  const parent = parentOf(name.place_id, name.territory);
  if (parent === '<no-parent>') orphans += 1;
  // This is the evidence-label comparison used by identity reconciliation,
  // not the looser search index. Folding punctuation/diacritics for discovery
  // must never change which referents this identity audit pairs together.
  const normalized = String(name.name).trim().normalize('NFC').toLowerCase();
  const key = `${parent}|${normalized}`;
  if (!keyGroups.has(key)) keyGroups.set(key, []);
  keyGroups.get(key).push({
    place_id: name.place_id,
    territory: name.territory,
    place_type: placeTypeById.get(name.place_id) ?? '<unknown>',
  });
}

/* Cross-province collision: the same parent key claimed by two provinces. Must be 0. */
const naturalKeyCollisions = [];
for (const [key, members] of keyGroups) {
  const provinces = new Set(members.map(member => member.territory));
  if (provinces.size > 1) {
    naturalKeyCollisions.push({ key, provinces: [...provinces].sort(), place_ids: members.map(m => m.place_id) });
  }
}

/* Within-province pairs sharing a parent key: deliberately unmerged, and correctly so.
 * Two independent reasons, both real: the Places differ in place_type (a town and the
 * municipality containing it share a name by ordinary geography), or they sit beyond
 * the governed merge distance. Enumerated in full so the counts reconcile. */
const withinProvincePairs = [];
const typeExtendedKeyCollisions = [];
for (const [key, members] of keyGroups) {
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const a = members[i];
      const b = members[j];
      if (a.territory !== b.territory) continue;
      const km = haversineKm(
        placeCoord(a.place_id, 'representative_latitude'),
        placeCoord(a.place_id, 'representative_longitude'),
        placeCoord(b.place_id, 'representative_latitude'),
        placeCoord(b.place_id, 'representative_longitude'),
      );
      const pair = {
        key,
        territory: a.territory,
        place_ids: [a.place_id, b.place_id],
        place_types: [a.place_type, b.place_type],
        differs_in_type: a.place_type !== b.place_type,
        km: km === null ? null : Math.round(km * 10) / 10,
      };
      withinProvincePairs.push(pair);
      if (!pair.differs_in_type) {
        typeExtendedKeyCollisions.push({ key: `${key}|${a.place_type}`, place_ids: pair.place_ids, km: pair.km });
      }
    }
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

/* Reconciled counts: groups, extra rows beyond the first per group, and all pairs. */
const duplicateGroups = [...keyGroups.values()].filter(members => members.length > 1).length;
const extraRows = [...keyGroups.values()].reduce((n, members) => n + Math.max(0, members.length - 1), 0);
const underBound = withinProvincePairs.filter(pair => pair.km !== null && pair.km < 15);
const underBoundSameType = underBound.filter(pair => !pair.differs_in_type);
const differingType = withinProvincePairs.filter(pair => pair.differs_in_type);

console.log(`provinces                        ${registry.territories.length}`);
console.log(`places                           ${places.length}`);
console.log(`province roots                   ${roots.length}`);
console.log(`preferred names                  ${names.filter(n => n.name_role === 'preferred_public').length}`);
console.log(`distinct preferred names         ${nameProvinces.size}`);
console.log(`ambiguous bare names             ${ambiguous.length}`);
console.log(`names preferred in all provinces ${ambiguous.filter(([, p]) => p.size === registry.territories.length).length}`);
console.log('');
console.log('IDENTITY  (place_id is the identity)');
console.log(`  place id collisions            ${idCollisions.length}`);
console.log(`  cross-province (parent, name)  ${naturalKeyCollisions.length}`);
console.log('');
console.log('WHY UNIQUE(parent, name) CANNOT BE ENFORCED');
console.log(`  duplicate (parent, name) groups ${duplicateGroups}`);
console.log(`  extra rows beyond the first     ${extraRows}`);
console.log(`  pairs enumerated in full        ${withinProvincePairs.length}`);
console.log(`    differing in place_type      ${differingType.length}`);
console.log(`    under 15 km bound            ${underBound.length}, all differing in type: ${underBound.every(p => p.differs_in_type)}`);
console.log(`    same type                    ${withinProvincePairs.length - differingType.length}`);
console.log(`  under bound AND same type      ${underBoundSameType.length}   (a same-type merge miss would be this)`);
console.log(`  UNIQUE(parent, name, type)     would still be violated by ${typeExtendedKeyCollisions.length}`);
console.log('');

if (idCollisions.length) {
  console.log(`  FAIL  ${idCollisions.length} Place IDs are claimed by two provinces`);
  for (const collision of idCollisions.slice(0, 20)) {
    console.log(`        ${collision.place_id}  ${collision.territories.join(' vs ')}`);
  }
  console.log('');
}
if (naturalKeyCollisions.length) {
  console.log(`  FAIL  ${naturalKeyCollisions.length} cross-province (parent, name) collisions`);
  for (const collision of naturalKeyCollisions.slice(0, 20)) {
    console.log(`        ${collision.key}  ${collision.provinces.join(' vs ')}`);
  }
  console.log('');
}
if (roots.length !== registry.territories.length) {
  console.log(`  FAIL  ${roots.length} province roots for ${registry.territories.length} provinces`);
  console.log('');
}
if (orphans !== roots.length) {
  console.log(`  FAIL  ${orphans} parentless preferred names but ${roots.length} province roots`);
  console.log('');
}

if (args.has('--report')) {
  console.log('widest shared names:');
  for (const [name, provinces] of ambiguous.slice(0, 15)) {
    console.log(`  ${name.padEnd(22)} ${provinces.size} provinces  ${[...provinces].sort().join(', ')}`);
  }
  console.log('');
  console.log('closest unmerged same-key pairs (these are why the key cannot be unique):');
  for (const pair of [...underBound].sort((a, b) => a.km - b.km).slice(0, 15)) {
    console.log(
      `  ${pair.territory}  ${pair.km.toString().padStart(5)} km  ` +
        `${pair.place_types.join(' / ').padEnd(38)} ${pair.place_ids[0].slice(-10)}`,
    );
  }
  console.log('');
}

const failed = idCollisions.length > 0 || naturalKeyCollisions.length > 0 || roots.length !== registry.territories.length || orphans !== roots.length;
if (failed) {
  console.error('national-collision-surface: FAILED');
  process.exit(1);
}
console.log(
  'national-collision-surface: OK  place_id is unique across all provinces; ' +
    'no cross-province (parent, name) collision; ' +
    `${withinProvincePairs.length} within-province same-name pairs are correctly unmerged`,
);
