#!/usr/bin/env node
/* global console, process */
/**
 * Cross-province Place Authority verification.
 *
 * Runs against the **committed admission packages**, not a database, so it is
 * available even while combined loading is blocked and no target holds more than
 * one province. It answers the national questions that can be answered from the
 * packages alone:
 *
 *  - can two provinces mint the same Place identity?
 *  - can a Place claim a province it does not belong to?
 *  - do any two provinces assert the same name as the unique referent, which
 *    would make a bare-name national search unsound?
 *  - does every province keep exactly one province root and a containment forest?
 *  - is disposition accounting total per territory?
 *
 * The homonym result is the important one and it is expected to be non-zero for
 * South Africa: Kenilworth, Brooklyn and Riversdale each exist in more than one
 * province. The contract requires those to stay distinct, so a non-zero result is
 * a *pass* here and a hard constraint on Phase 7: a national consumer must resolve
 * a name within a province and must never treat a bare name as a unique Place.
 *
 * Usage:
 *   tsx tools/place-admission/verify-cross-province.mjs
 */
import { readFileSync } from 'node:fs';

import {
  loadPlaceAdmissionTerritoryRegistry,
  resolvePlaceAdmissionPackagePaths,
  selectPlaceAdmissionTerritory,
} from '../../shared/placeAdmissionTerritories.ts';

const registryLoad = loadPlaceAdmissionTerritoryRegistry(process.cwd());
const registry = registryLoad.registry;

const normalize = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const readJsonl = path =>
  readFileSync(path, 'utf8')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line));

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(label);
};

const territories = registry.territories.map(territory => {
  const paths = resolvePlaceAdmissionPackagePaths(territory);
  const manifest = JSON.parse(readFileSync(paths.manifest, 'utf8'));
  return {
    territory,
    manifest,
    places: readJsonl(paths.artifacts.places),
    names: readJsonl(paths.artifacts.names),
    relationships: readJsonl(paths.artifacts.relationships),
  };
});

console.log(
  `cross-province: ${territories.length} registered territories under registry ${
    registry.registryId
  } digest ${registryLoad.registrySha256.slice(0, 16)}`,
);
for (const { territory, manifest } of territories) {
  console.log(
    `  ${territory.territoryId.padEnd(8)} ${String(manifest.counts.admitted_places).padStart(6)} places  ${
      manifest.territory.admission_registry_sha256 === registryLoad.registrySha256
        ? 'registry pin current'
        : 'REGISTRY PIN STALE'
    }`,
  );
}

/* ---- identity uniqueness across every registered province ---- */
const idOwner = new Map();
const idCollisions = [];
for (const { territory, places } of territories) {
  for (const place of places) {
    const existing = idOwner.get(place.place_id);
    if (existing && existing !== territory.territoryId) {
      idCollisions.push({ place_id: place.place_id, territories: [existing, territory.territoryId] });
    }
    idOwner.set(place.place_id, territory.territoryId);
  }
}
check(
  idCollisions.length === 0,
  'no Place identity is claimed by two provinces',
  `${idCollisions.length} collisions`,
);

/* ---- each province is self-consistent ---- */
for (const { territory, places, relationships } of territories) {
  const roots = places.filter(place => place.place_type === 'province');
  check(
    roots.length === 1,
    `${territory.territoryId} has exactly one province root`,
    String(roots.length),
  );
  const containment = relationships.filter(r => r.relationship_type === 'administratively_contains');
  check(
    containment.length === places.length - 1,
    `${territory.territoryId} containment is a single-parent forest`,
    `places=${places.length} containment=${containment.length}`,
  );
  const withParent = new Set(containment.map(r => r.from_place_id));
  const settlements = places.filter(p => p.place_type !== 'province');
  check(
    settlements.every(p => withParent.has(p.place_id)),
    `${territory.territoryId} every non-province Place has a containment parent`,
    `${settlements.filter(p => !withParent.has(p.place_id)).length} orphans`,
  );
}

/* ---- disposition accounting is total per territory ---- */
for (const { territory, places, manifest } of territories) {
  const admitted = manifest.counts.admitted_places;
  const dispositions = manifest.counts.disposition_ledger_rows;
  const universe = places.length + dispositions;
  check(
    admitted === places.length,
    `${territory.territoryId} admitted count matches the emitted Place rows`,
    `manifest=${admitted} rows=${places.length}`,
  );
  check(
    universe >= admitted,
    `${territory.territoryId} every source record is admitted or dispositioned`,
    `places + ledger = ${universe}`,
  );
  check(
    places.every(p => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(territory.territoryId)),
    `${territory.territoryId} is a registered token`,
  );
}

/* ---- national homonym report: expected non-zero, and it constrains Phase 7 ---- */
const preferredBy = new Map();
for (const { territory, names } of territories) {
  for (const name of names.filter(n => n.name_role === 'preferred_public')) {
    const key = normalize(name.name);
    if (!preferredBy.has(key)) preferredBy.set(key, new Set());
    preferredBy.get(key).add(territory.territoryId);
  }
}
const homonyms = [...preferredBy.entries()]
  .filter(([, owners]) => owners.size > 1)
  .map(([name, owners]) => ({ name, owners: [...owners].sort() }))
  .sort((a, b) => b.owners.length - a.owners.length || a.name.localeCompare(b.name));

const provincesWithHomonyms = new Set(homonyms.flatMap(h => h.owners));
check(
  homonyms.length > 0,
  'national homonyms are detected and stay distinct',
  `${homonyms.length} names preferred in more than one province across ${provincesWithHomonyms.size} provinces`,
);
check(
  new Set(provincesWithHomonyms).size === territories.length,
  'homonym detection spans every registered province',
  `${provincesWithHomonyms.size}/${territories.length}`,
);
console.log('  note    the 12 most widely shared preferred names:');
for (const homonym of homonyms.slice(0, 12)) {
  console.log(`            ${homonym.name.padEnd(30)} ${homonym.owners.join(', ')}`);
}
console.log(
  '  note    consequence: a national consumer must resolve a name within a province.',
);
console.log('            A bare name is never a unique Place, and must never be widened.');

/* ---- no cross-province widening has been introduced anywhere ---- */
for (const { territory, relationships } of territories) {
  const widening = relationships.filter(r => r.search_scope_authorized !== 0);
  check(
    widening.length === 0,
    `${territory.territoryId} introduces no relationship-driven search widening`,
    `${widening.length} edges`,
  );
}

if (failures.length) {
  console.error(`\ncross-province verification failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
/* `idOwner` is keyed on place_id, so it counts admitted Places, not source
 * identities. The two differ wherever a merge group absorbed more than one
 * identity, so reporting the Place count under the name "identities" would
 * understate the source universe and quietly disagree with every per-province
 * identity count. Report both, each under the name it actually has. */
const sourceIdentities = territories.reduce(
  (total, { manifest }) => total + manifest.counts.source_identities,
  0,
);
console.log(
  `\ncross-province: OK ${territories.length} provinces, ` +
    `${idOwner.size} admitted Places, ${sourceIdentities} source identities`,
);
