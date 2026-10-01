#!/usr/bin/env node
/* global console, process */
/**
 * Place Admission builder (Place Authority Slice 2, Phase 3 territory-neutral).
 *
 * Transforms a reproducible, digest-pinned source authority into an admitted
 * canonical Place dataset. This builder is **territory-neutral**: it contains no
 * knowledge of any province. Every territory-specific fact — where the source
 * authority lives, what its artifacts are called, what the admission version is,
 * and where the admitted package is written — is read from the committed
 * admission territory registry.
 *
 * Admitting a second province must therefore be a new registry entry plus its
 * governed source evidence. It must never require a second engine.
 *
 * This is an identity-admission tool, not a three-level projection repair. Its
 * central job is the step the old pipeline never performed: deciding how many
 * canonical Places the source identities actually represent.
 *
 * A source identity is NOT a Place. Reconciliation at the source level already
 * grouped source *records* into identities, but two accepted identities can still
 * describe one real-world referent that sources classified differently, and two
 * identities that share a name can be genuinely distinct places. Adjudication
 * therefore runs as a separate, evidence-based step, and every source identity
 * and candidate receives an explicit disposition either way.
 *
 * Determinism contract: the package regenerates byte-identically from the
 * governed inputs and the committed Place-ID registry. The only non-deterministic
 * act is the first-time assignment of a Place ID, which is recorded in the
 * registry and reused forever after. A rerun never mints a new ID for an
 * already-adjudicated identity, and never remaps an existing ID.
 *
 * Usage:
 *   tsx tools/place-admission/build-place-admission.mjs                     # build default territory
 *   tsx tools/place-admission/build-place-admission.mjs --check             # verify determinism
 *   tsx tools/place-admission/build-place-admission.mjs --territory <id>  # explicit territory
 *   tsx tools/place-admission/build-place-admission.mjs --registry <path>   # alternate registry
 */

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  loadPlaceAdmissionTerritoryRegistry,
  readVerifiedPlaceAdmissionArtifact,
  resolvePlaceAdmissionCoverageBaselinePaths,
  resolvePlaceAdmissionPackagePaths,
  resolvePlaceAdmissionSourcePaths,
  selectPlaceAdmissionTerritory,
  PLACE_ADMISSION_TERRITORY_REGISTRY_PATH,
} from '../../shared/placeAdmissionTerritories.ts';

const ROOT = process.cwd();

const argv = process.argv.slice(2);
const flagValue = (name, fallback) => {
  const index = argv.indexOf(name);
  return index === -1 || index === argv.length - 1 ? fallback : argv[index + 1];
};
const CHECK_ONLY = argv.includes('--check');
const TERRITORY_ID = flagValue('--territory', undefined);
const REGISTRY_PATH = flagValue('--registry', PLACE_ADMISSION_TERRITORY_REGISTRY_PATH);

/**
 * Resolve the governed territory record. Nothing below this point may name a
 * province: the source directory, artifact filenames, admission version and
 * output directory all come from here.
 */
const registryLoad = loadPlaceAdmissionTerritoryRegistry(ROOT, REGISTRY_PATH);
const territory = selectPlaceAdmissionTerritory(registryLoad.registry, TERRITORY_ID);
const ADMISSION_VERSION = territory.admissionVersion;
const sourcePaths = resolvePlaceAdmissionSourcePaths(territory);
const packagePaths = resolvePlaceAdmissionPackagePaths(territory);
const coverageBaselinePaths = resolvePlaceAdmissionCoverageBaselinePaths(territory);

/* ------------------------------------------------------------------ *
 * Governed admission policy. Every constant here is a recorded decision,
 * not a tuning parameter. Changing one changes the admission outcome and
 * must be reviewed as a contract change.
 * ------------------------------------------------------------------ */

/**
 * Administrative container types. A province or municipality is a unique
 * administrative container within a territory: there is exactly one province,
 * one district municipality, one local municipality per name. Two records
 * claiming the same container name are therefore the same referent by
 * construction, so a source that emitted one province identity twice under
 * differing representative points still admits as a single Place.
 */
const CONTAINER_TYPES = new Set(['province', 'district_municipality', 'local_municipality']);

/**
 * Settlement types are merged only on evidence: same normalized name, the same
 * admitted administrative context, and representative points within this
 * distance. Source classification disagreement alone never blocks a merge and
 * never creates a second Place, because providers label the same referent
 * differently (one source may call a settlement a suburb where another calls it
 * a populated place).
 */
const SETTLEMENT_MERGE_MAX_KM = 15;

/** Name role mapping from the v0.2 name-assertion vocabulary to the V1 model. */
const NAME_ROLE_MAP = {
  preferred_common: 'preferred_public',
  official: 'official',
  historical: 'historical',
  alias: 'common',
};

/** Identifier-like labels stay non-searchable provenance (contract D8). */
const IDENTIFIER_LIKE = /^(?:q\d+|[a-z]{2,6}\d[a-z0-9]*|https?:\/\/.*)$/i;

/**
 * Governed surface-form normalization (contract D8): an extension may be written
 * `Ext N`, `Ext. N` or `Extension N`. This generates *names* for an already
 * admitted Place. It never generates a Place identity: a name that matches this
 * pattern is only varied when a source already admitted the referent, so no
 * identity is ever created from a name pattern.
 */
const EXTENSION_NAME_PATTERN = /^(.*\S)\s+Ext(?:ension)?\.?\s+(\d{1,3})$/i;
const extensionSurfaceForms = name => {
  const match = EXTENSION_NAME_PATTERN.exec(name);
  if (!match) return [];
  const base = match[1].trim();
  const number = match[2];
  return [`${base} Extension ${number}`, `${base} Ext ${number}`, `${base} Ext. ${number}`];
};

/** Successor (most restrictive) licensing wins when identities merge. */
const LICENSING_RESTRICTIVENESS = [
  'permissive_supported',
  'mixed_odbl_supported',
  'osm_only_odbl_provisional',
];

/* ------------------------------------------------------------------ *
 * Governed helpers
 * ------------------------------------------------------------------ */

const readJson = path => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
const readJsonl = path =>
  readFileSync(resolve(ROOT, path), 'utf8')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line));
const sha256 = path =>
  createHash('sha256').update(readFileSync(resolve(ROOT, path))).digest('hex');
const writeIfChanged = (path, content) => {
  const full = resolve(ROOT, path);
  if (existsSync(full) && readFileSync(full, 'utf8') === content) return false;
  if (CHECK_ONLY) {
    throw new Error(`determinism check failed: ${path} would change; regenerate the artifact`);
  }
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  return true;
};
const writeJsonl = (path, rows) => writeIfChanged(path, rows.map(r => JSON.stringify(r)).join('\n') + '\n');

const EARTH_RADIUS_KM = 6371;
const haversineKm = (a, b) => {
  if (a.representative_latitude == null || b.representative_latitude == null) return null;
  const t = Math.PI / 180;
  const dLat = (b.representative_latitude - a.representative_latitude) * t;
  const dLon = (b.representative_longitude - a.representative_longitude) * t;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.representative_latitude * t) * Math.cos(b.representative_latitude * t) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
};
const byId = (rows, key) => new Map(rows.map(r => [r[key], r]));
const normalizedName = value => String(value ?? '').trim().toLowerCase();
const adm2Of = identity => identity.administrative_context?.adm2?.[0]?.name ?? null;
const provinceOf = identity => identity.administrative_context?.province?.name ?? null;
const isContainer = identity => CONTAINER_TYPES.has(identity.canonical_type);

/** Sort comparator that is total and input-order independent. */
const byIdLex = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/* ------------------------------------------------------------------ *
 * 1. Load the governed source and verify every digest
 * ------------------------------------------------------------------ */

const sourceManifest = JSON.parse(
  readVerifiedPlaceAdmissionArtifact(ROOT, territory.sourceAuthority.manifest).toString('utf8'),
);
if (sourceManifest.authority_version !== territory.sourceAuthority.authorityVersion) {
  throw new Error(
    `source authority version ${sourceManifest.authority_version} does not match the registry's ` +
      `${territory.sourceAuthority.authorityVersion} for territory ${territory.territoryId}`,
  );
}
const sourceDigestMismatches = [];
for (const artifact of sourceManifest.compact_artifacts ?? []) {
  const actual = sha256(artifact.path);
  if (actual !== artifact.sha256) {
    sourceDigestMismatches.push(`${artifact.path}: expected ${artifact.sha256}, actual ${actual}`);
  }
}
if (sourceDigestMismatches.length) {
  throw new Error(`source authority digest verification failed:\n  ${sourceDigestMismatches.join('\n  ')}`);
}

const identities = readJsonl(sourcePaths.artifacts.geography);
const nameAssertions = readJsonl(sourcePaths.artifacts.names);
const sourceLinks = readJsonl(sourcePaths.artifacts.source_links);
const candidates = readJsonl(sourcePaths.artifacts.candidate_dispositions);

const identityIndex = byId(identities, 'canonical_location_id');
const namesByIdentity = new Map();
for (const assertion of nameAssertions) {
  const list = namesByIdentity.get(assertion.canonical_location_id) ?? [];
  list.push(assertion);
  namesByIdentity.set(assertion.canonical_location_id, list);
}
const linksByIdentity = new Map();
for (const link of sourceLinks) {
  const list = linksByIdentity.get(link.canonical_location_id) ?? [];
  list.push(link);
  linksByIdentity.set(link.canonical_location_id, list);
}

/* ------------------------------------------------------------------ *
 * 2. Identity adjudication: source identities -> Places
 * ------------------------------------------------------------------ */

/**
 * Group accepted identities into equivalence groups. The group key is the sorted
 * member identity id list, so grouping is a pure function of the source and is
 * stable under any input ordering.
 */
function adjudicateGroups() {
  const groups = [];
  const assigned = new Set();

  // Container referents first: unique administrative containers merge on name.
  const containerByName = new Map();
  for (const identity of identities.filter(isContainer)) {
    const key = normalizedName(identity.preferred_name);
    const list = containerByName.get(key) ?? [];
    list.push(identity);
    containerByName.set(key, list);
  }
  for (const [name, members] of [...containerByName].sort((a, b) => byIdLex(a[0], b[0]))) {
    members.sort((a, b) => byIdLex(a.canonical_location_id, b.canonical_location_id));
    for (const member of members) assigned.add(member.canonical_location_id);
    groups.push({ kind: 'administrative_container', name, members });
  }

  // Settlements: merge on name, admitted context, and proximity.
  const settlementByName = new Map();
  for (const identity of identities) {
    if (isContainer(identity)) continue;
    const key = normalizedName(identity.preferred_name);
    const list = settlementByName.get(key) ?? [];
    list.push(identity);
    settlementByName.set(key, list);
  }
  for (const [name, members] of [...settlementByName].sort((a, b) => byIdLex(a[0], b[0]))) {
    members.sort((a, b) => byIdLex(a.canonical_location_id, b.canonical_location_id));
    if (members.length === 1) {
      groups.push({ kind: 'single_identity', name, members });
      assigned.add(members[0].canonical_location_id);
      continue;
    }
    // Greedy clustering under the governed rule, anchored on the first member so
    // the outcome does not depend on input order.
    const clusters = [];
    for (const member of members) {
      const cluster = clusters.find(candidate => {
        const anchor = candidate[0];
        if (adm2Of(anchor) !== adm2Of(member)) return false;
        const distance = haversineKm(anchor, member);
        return distance == null || distance <= SETTLEMENT_MERGE_MAX_KM;
      });
      if (cluster) cluster.push(member);
      else clusters.push([member]);
    }
    for (const cluster of clusters) {
      for (const member of cluster) assigned.add(member.canonical_location_id);
      groups.push({
        kind: cluster.length > 1 ? 'merged_same_referent' : 'single_identity',
        name,
        members: cluster,
      });
    }
  }

  if (assigned.size !== identities.length) {
    const missing = identities.filter(i => !assigned.has(i.canonical_location_id));
    throw new Error(`adjudication left ${missing.length} identities unassigned`);
  }
  return groups;
}

const groups = adjudicateGroups();
const groupOfIdentity = new Map();
groups.forEach((group, index) => {
  for (const member of group.members) groupOfIdentity.set(member.canonical_location_id, index);
});

/**
 * Choose the primary source identity for a Place. Governed rule, not input
 * order: the identity carrying the most independent source evidence wins, and
 * ties are broken by source coverage then by identity id, so the result is total
 * and reproducible.
 */
function choosePrimary(members) {
  return [...members].sort((a, b) => {
    const sources = (b.source_count ?? 0) - (a.source_count ?? 0);
    if (sources !== 0) return sources;
    const links = (linksByIdentity.get(b.canonical_location_id)?.length ?? 0) -
      (linksByIdentity.get(a.canonical_location_id)?.length ?? 0);
    if (links !== 0) return links;
    return byIdLex(a.canonical_location_id, b.canonical_location_id);
  })[0];
}

/** Governed type choice when member identities disagree on classification. */
function chooseType(members, primary) {
  const chosen = new Map();
  for (const member of members) {
    const list = chosen.get(member.canonical_type) ?? [];
    list.push(member);
    chosen.set(member.canonical_type, list);
  }
  // Prefer the primary's own classification when it is a majority or the sole one;
  // otherwise prefer the most corroborated classification. Never invent a type.
  const ordered = [...chosen.entries()].sort((a, b) => {
    const aPrimary = a[1].some(m => m.canonical_location_id === primary.canonical_location_id) ? 1 : 0;
    const bPrimary = b[1].some(m => m.canonical_location_id === primary.canonical_location_id) ? 1 : 0;
    if (aPrimary !== bPrimary) return bPrimary - aPrimary;
    const aWeight = a[1].reduce((sum, m) => sum + (m.source_count ?? 0), 0);
    const bWeight = b[1].reduce((sum, m) => sum + (m.source_count ?? 0), 0);
    if (aWeight !== bWeight) return bWeight - aWeight;
    return byIdLex(a[0], b[0]);
  });
  return { type: ordered[0][0], alternatives: ordered.map(([type, list]) => ({ type, identity_ids: list.map(m => m.canonical_location_id).sort(byIdLex) })) };
}

/**
 * Verification status. The source already separates "automatically promotable"
 * from "promotable with provisional attributes"; a Place is only fully verified
 * when its evidence, its type, its spatial confidence, its licence and its
 * boundary all agree. Anything else is Tier B provisional and stays selectable
 * but unpublishable (contract D2).
 */
function verificationOf(members, licensing) {
  const isVerified =
    members.length === 1 &&
    members[0].promotion_class === 'auto_promotable_factual_identity' &&
    members[0].type_state === 'supported' &&
    members[0].identity_confidence === 'high' &&
    members[0].spatial_confidence === 'supported' &&
    members[0].boundary_conflict === false &&
    licensing !== 'osm_only_odbl_provisional';
  return isVerified ? 'verified' : 'provisional';
}

/** Most restrictive licensing across the merged evidence set. */
function licensingOf(members) {
  let worst = 'permissive_supported';
  for (const member of members) {
    const value = member.licensing_classification ?? 'permissive_supported';
    if (LICENSING_RESTRICTIVENESS.indexOf(value) > LICENSING_RESTRICTIVENESS.indexOf(worst)) worst = value;
  }
  return worst;
}

const D1_SCOPE_BY_TYPE = {
  province: 'province',
  city: 'metro_city',
  town: 'metro_city',
  township: 'locality',
  suburb: 'locality',
  neighbourhood: 'locality',
  locality: 'locality',
  village: 'locality',
};

/* ------------------------------------------------------------------ *
 * 3. Place-ID allocation
 *
 * IDs are assigned, never derived from a name, slug, coordinate, parent,
 * classification, natural key or source identity. A committed ID is never
 * remapped: a group that gains a member keeps the ID already recorded for any
 * of its members, so a merge or a reclassification can never silently move a
 * Place.
 * ------------------------------------------------------------------ */

const PLACE_ID_REGISTRY_PATH = packagePaths.placeIdRegistry;
const registry = existsSync(resolve(ROOT, PLACE_ID_REGISTRY_PATH))
  ? readJson(PLACE_ID_REGISTRY_PATH)
  : { registry_version: ADMISSION_VERSION, allocated: {}, allocation_sequence: 0, namespace: 'pl-place-01' };

const allocatedIds = new Set(Object.values(registry.allocated));
let minted = 0;
let reused = 0;

function placeIdFor(group) {
  const memberIds = group.members.map(m => m.canonical_location_id).sort(byIdLex);
  // Reuse from the primary first, then any member, in deterministic order.
  const primary = choosePrimary(group.members);
  for (const key of [primary.canonical_location_id, ...memberIds]) {
    const existing = registry.allocated[key];
    if (existing) {
      reused += 1;
      return existing;
    }
  }
  if (CHECK_ONLY) {
    throw new Error(
      `determinism check failed: no allocated Place ID for group ${memberIds.join(',')}`,
    );
  }
  let candidate;
  do {
    candidate = `pl-place-01-${randomBytes(12).toString('hex')}`;
  } while (allocatedIds.has(candidate));
  allocatedIds.add(candidate);
  registry.allocated[primary.canonical_location_id] = candidate;
  registry.allocation_sequence += 1;
  minted += 1;
  return candidate;
}

/* ------------------------------------------------------------------ *
 * 4. Admit Places
 * ------------------------------------------------------------------ */

const placeRows = [];
const placeIdByIdentity = new Map();
const groupRecords = [];

for (const group of groups) {
  const primary = choosePrimary(group.members);
  const placeId = placeIdFor(group);
  for (const member of group.members) placeIdByIdentity.set(member.canonical_location_id, placeId);

  const licensing = licensingOf(group.members);
  const { type, alternatives } = chooseType(group.members, primary);
  const verificationStatus = verificationOf(group.members, licensing);
  const searchScope = D1_SCOPE_BY_TYPE[type] ?? null;

  // A container is administrative context, never a searchable scope (D1).
  const searchEligible = verificationStatus !== 'candidate' && searchScope != null ? 1 : 0;
  // Tier B is search-only until promoted; an OSM-only licence is never
  // publishable before the founder ODbL gate clears (D2, D3). Publication is
  // strictly a subset of search: a context-only container is never published,
  // so a verified municipality cannot become a public page.
  const publicationEligible =
    verificationStatus === 'verified' &&
    licensing !== 'osm_only_odbl_provisional' &&
    searchEligible === 1
      ? 1
      : 0;

  const record = {
    admission_version: ADMISSION_VERSION,
    place_id: placeId,
    place_type: type,
    place_classification: 'statutory',
    verification_status: verificationStatus,
    lifecycle_status: 'active',
    publication_eligible: publicationEligible,
    search_eligible: searchEligible,
    search_scope: searchScope,
    licensing_classification: licensing,
    // Provenance back to the source identities that were adjudicated into this
    // Place. The Place is the identity; these are the evidence anchors.
    primary_source_identity_id: primary.canonical_location_id,
    source_identity_ids: group.members.map(m => m.canonical_location_id).sort(byIdLex),
    adjudication: {
      group_kind: group.kind,
      basis:
        group.kind === 'merged_same_referent'
          ? 'same_normalized_name_same_administrative_context_within_governed_distance'
          : group.kind === 'administrative_container'
            ? 'unique_administrative_container_name'
            : 'single_source_identity',
      governed_max_merge_km: group.kind === 'merged_same_referent' ? SETTLEMENT_MERGE_MAX_KM : null,
      member_count: group.members.length,
      type_alternatives: alternatives,
      administrative_context: adm2Of(primary) ?? provinceOf(primary),
      province_context: provinceOf(primary),
      representative_latitude: primary.representative_latitude,
      representative_longitude: primary.representative_longitude,
    },
  };
  placeRows.push(record);
  groupRecords.push({ group, record, primary, type, licensing, verificationStatus });
}

placeRows.sort((a, b) => byIdLex(a.place_id, b.place_id));

/* ------------------------------------------------------------------ *
 * 5. Place names, governed preferred-public selection
 * ------------------------------------------------------------------ */

const nameRows = [];
const nameKeySeen = new Set();
/**
 * Normalized names that a source assertion already gives to some Place. A
 * generated surface form may never claim one of these, so normalization can
 * never manufacture a second Place competing for the same query.
 */
const preferredNamesTaken = new Set();

for (const placeRow of placeRows) {
  const assertions = [];
  for (const identityId of placeRow.source_identity_ids) {
    for (const assertion of namesByIdentity.get(identityId) ?? []) assertions.push(assertion);
  }

  // Governed selection policy (contract D8). An official name wins; otherwise a
  // name the source marks as the common preference wins. Within a class the most
  // independently sourced assertion wins, ties broken by text, so the outcome is
  // never input-order dependent.
  const score = assertion => {
    const roles = assertion.name_roles ?? [];
    if (roles.includes('official')) return 3;
    if (roles.includes('preferred_common')) return 2;
    if (roles.includes('historical')) return 1;
    return 0;
  };
  const searchable = assertion =>
    assertion.searchable === true &&
    assertion.status === 'active' &&
    !IDENTIFIER_LIKE.test(assertion.name);
  const ranked = [...assertions].sort((a, b) => {
    const s = score(b) - score(a);
    if (s !== 0) return s;
    const sa = (a.source_names?.length ?? 0) - (b.source_names?.length ?? 0);
    if (sa !== 0) return sa;
    return byIdLex(a.name, b.name);
  });
  const preferred = ranked.find(searchable) ?? null;

  for (const assertion of assertions) {
    const roles = assertion.name_roles ?? [];
    let role = null;
    if (assertion === preferred) role = 'preferred_public';
    else if (roles.includes('official')) role = 'official';
    else if (roles.includes('historical')) role = 'historical';
    else if (roles.includes('preferred_common')) role = 'common';
    else role = NAME_ROLE_MAP.alias;

    // A former name is still an active, true statement about the Place's naming
    // history; "historical" is a role, not a retraction. Retraction is
    // 'superseded'/'withdrawn', which the database forbids being searchable.
    const nameState = 'active';
    const isSearchable = searchable(assertion) ? 1 : 0;
    const key = `${placeRow.place_id}|${role}|${assertion.name}`;
    if (nameKeySeen.has(key)) continue;
    nameKeySeen.add(key);
    if (assertion === preferred) preferredNamesTaken.add(normalizedName(assertion.name));
    nameRows.push({
      admission_version: ADMISSION_VERSION,
      place_id: placeRow.place_id,
      name: assertion.name,
      normalized_name: normalizedName(assertion.name),
      name_role: role,
      name_state: nameState,
      is_searchable: isSearchable,
      evidence_source: (assertion.source_names ?? ['unknown']).slice().sort(byIdLex).join('+'),
      valid_from: null,
      valid_to: null,
      source_name_assertion_id: assertion.name_assertion_id,
      source_identity_id: assertion.canonical_location_id,
      is_preferred_public: assertion === preferred ? 1 : 0,
    });
  }

  // Governed surface-form normalization for admitted extension Places. This adds
  // names only. A surface form that another admitted Place already owns as a
  // preferred public name is skipped, so normalization can never create a second
  // Place that competes with a real one for the same query.
  const preferredName = preferred?.name ?? null;
  for (const form of preferredName ? extensionSurfaceForms(preferredName) : []) {
    if (form === preferredName) continue;
    if (IDENTIFIER_LIKE.test(form)) continue;
    const key = `${placeRow.place_id}|alternate_spelling|${form}`;
    if (nameKeySeen.has(key)) continue;
    if (preferredNamesTaken.has(normalizedName(form))) continue;
    nameKeySeen.add(key);
    nameRows.push({
      admission_version: ADMISSION_VERSION,
      place_id: placeRow.place_id,
      name: form,
      normalized_name: normalizedName(form),
      name_role: 'alternate_spelling',
      name_state: 'active',
      is_searchable: 1,
      evidence_source: 'governed_name_normalization',
      valid_from: null,
      valid_to: null,
      source_name_assertion_id: null,
      source_identity_id: null,
      is_preferred_public: 0,
      generated_by: 'extension_surface_form_pattern',
    });
  }
}
nameRows.sort(
  (a, b) =>
    byIdLex(a.place_id, b.place_id) ||
    b.is_preferred_public - a.is_preferred_public ||
    byIdLex(a.name_role, b.name_role) ||
    byIdLex(a.name, b.name),
);

/* ------------------------------------------------------------------ *
 * 6. Relationships — nearest admitted administrative ancestor only
 *
 * One containment parent per Place, forming a forest. This is what prevents
 * duplicate primary containment and cycles. The evidence is the source's own
 * geoBoundaries administrative context, not the v0.1 researched parent edges
 * (see section 8 for why those are not promoted to containment).
 * ------------------------------------------------------------------ */

const placeByName = new Map();
for (const identity of identities.filter(isContainer)) {
  const key = `${identity.canonical_type}|${normalizedName(identity.preferred_name)}`;
  if (!placeByName.has(key)) placeByName.set(key, identity);
}
const placeRowById = new Map(placeRows.map(p => [p.place_id, p]));
const admittedContextNames = new Map();
for (const placeRow of placeRows) {
  const context = placeRow.adjudication.administrative_context;
  if (context) admittedContextNames.set(context, placeRow);
}

const relationshipRows = [];
const relationshipKeys = new Set();
const containmentParent = new Map();

function addRelationship(row) {
  const key = `${row.from_place_id}|${row.to_place_id}|${row.relationship_type}`;
  if (relationshipKeys.has(key)) return;
  relationshipKeys.add(key);
  relationshipRows.push(row);
}

for (const placeRow of placeRows) {
  const primary = identityIndex.get(placeRow.primary_source_identity_id);
  if (!primary) continue;
  const isProvincePlace = placeRow.place_type === 'province';
  if (isProvincePlace) continue; // the root of the forest

  const contextName = adm2Of(primary);
  const containerIdentity =
    (contextName && (placeByName.get(`district_municipality|${normalizedName(contextName)}`) ??
      placeByName.get(`local_municipality|${normalizedName(contextName)}`))) || null;
  const contextPlace = containerIdentity ? placeIdByIdentity.get(containerIdentity.canonical_location_id) : null;
  const contextIsSelf =
    contextPlace != null &&
    contextPlace === placeIdByIdentity.get(primary.canonical_location_id);

  let parentPlaceId = contextPlace && !contextIsSelf ? contextPlace : null;
  let parentBasis = parentPlaceId
    ? 'source_administrative_context_adm2'
    : null;
  if (!parentPlaceId) {
    // No admitted container carries this administrative context. Sedibeng and
    // West Rand are adm2 values used by settlements that have no admitted
    // municipality identity, so there is no Place to attach to. Fall back to the
    // province, which every identity carries as evidenced context. The parent is
    // never invented: if neither exists, no edge is emitted.
    const provincePlaceId = placeRows.find(candidate => candidate.place_type === 'province')?.place_id;
    if (provincePlaceId && provincePlaceId !== placeRow.place_id) {
      parentPlaceId = provincePlaceId;
      parentBasis = 'source_administrative_context_province_fallback';
    }
  }
  if (!parentPlaceId) continue;
  containmentParent.set(placeRow.place_id, parentPlaceId);
  addRelationship({
    admission_version: ADMISSION_VERSION,
    from_place_id: placeRow.place_id,
    to_place_id: parentPlaceId,
    relationship_type: 'administratively_contains',
    // Slice 2 authorizes no new relationship-driven search widening.
    search_scope_authorized: 0,
    evidence_source: 'geoboundaries_administrative_context',
    valid_from: null,
    valid_to: null,
    basis: parentBasis,
  });
}
relationshipRows.sort(
  (a, b) =>
    byIdLex(a.from_place_id, b.from_place_id) ||
    byIdLex(a.relationship_type, b.relationship_type) ||
    byIdLex(a.to_place_id, b.to_place_id),
);

/* ------------------------------------------------------------------ *
 * 4b. Governed scope establishment (D1), resolved after the hierarchy
 * ------------------------------------------------------------------ */

/**
 * A `search_scope` states which product-search granularity a Place can
 * represent. `D1_SCOPE_BY_TYPE` says which scope a *type* may carry; it does not
 * decide whether that scope is *established*. Establishment is resolved here,
 * once the hierarchy is known, and it is deliberately weaker than a
 * three-tier ancestry requirement.
 *
 * province / metro_city / locality are derived search-scope **categories**, not
 * mandatory levels in the canonical containment hierarchy. The canonical shape is
 *
 *   <province> (province) -> <municipality> (municipality) -> <suburb> (locality)
 *
 * A suburb is a legitimate locality scope with no city Place anywhere above it.
 * Requiring a metro_city ancestor would force a fake city node into good
 * geography purely so the search abstraction would have three tiers, which is
 * exactly the flattening Place Authority exists to eliminate. The administrative
 * context of a Place is its containment chain; the scope is a category applied to
 * it. Those are different facts and are not required to coincide.
 *
 * The binding requirement is therefore only that a scoped Place has an
 * **evidenced administrative chain to the province**. A scope that cannot reach a
 * province is not executable, because a search with no provincial bound is
 * unbounded.
 *
 * A container carrying no scope (a district or local municipality) is skipped and
 * never promoted. It is factual context, not a search level, and a municipality
 * is never re-typed as a city to complete a hierarchy.
 *
 * A Place whose chain does not reach a province keeps its identity and loses its
 * scope: an absent scope is the contract's own encoding of "not executable",
 * because `chk_place_scope_requires_searchable` forbids a scope without
 * searchability and `chk_place_search_scope_derived_from_type` forbids a
 * municipality from carrying a scope at all.
 */
// A scope category requires an evidenced province context, not a fixed depth.
const REQUIRED_COARSER_SCOPES = {
  province: [],
  metro_city: ['province'],
  locality: ['province'],
};

/** Scoped ancestors of a Place, root first, following containment only. */
function evidencedScopedAncestors(placeId) {
  const scopes = [];
  const seen = new Set([placeId]);
  let cursor = containmentParent.get(placeId) ?? null;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const scope = placeRows.find(row => row.place_id === cursor)?.search_scope ?? null;
    if (scope) scopes.push(scope);
    cursor = containmentParent.get(cursor) ?? null;
  }
  return scopes.reverse();
}

const scopeEstablishment = { established: 0, not_established: 0, by_scope: {} };

for (const row of placeRows) {
  const scope = row.search_scope;
  if (scope == null) {
    scopeEstablishment.not_established += 1;
    continue;
  }
  const required = REQUIRED_COARSER_SCOPES[scope];
  const evidenced = evidencedScopedAncestors(row.place_id);
  const established = required.every((level, depth) => evidenced[depth] === level);

  const tally = (scopeEstablishment.by_scope[scope] ??= { established: 0, not_established: 0 });
  if (established) {
    tally.established += 1;
    scopeEstablishment.established += 1;
    row.scope_establishment = {
      established: true,
      required_coarser_scopes: required,
      evidenced_scoped_ancestors: evidenced,
    };
    continue;
  }

  // No governed executable scope. The Place stays admitted as an identity and
  // stops being executable. Publication is a strict subset of search, so it is
  // withdrawn with the scope.
  tally.not_established += 1;
  scopeEstablishment.not_established += 1;
  row.scope_establishment = {
    established: false,
    required_coarser_scopes: required,
    evidenced_scoped_ancestors: evidenced,
    missing_coarser_scopes: required.filter((level, depth) => evidenced[depth] !== level),
    reason:
      'no_governed_executable_scope: the containment path does not evidence every ' +
      'coarser search scope this level requires, and a context-only container is ' +
      'never promoted to a search level',
  };
  row.search_scope = null;
  row.search_eligible = 0;
  row.publication_eligible = 0;
}

/* ------------------------------------------------------------------ *
 * 7. Evidence and external mappings
 * ------------------------------------------------------------------ */

const evidenceRows = [];
const evidenceKeys = new Set();
function addEvidence(row) {
  const key = `${row.place_id ?? 'none'}|${row.evidence_kind}|${row.subject ?? ''}|${row.evidence_source ?? ''}`;
  if (evidenceKeys.has(key)) return;
  evidenceKeys.add(key);
  evidenceRows.push(row);
}

// Why each admitted Place exists.
for (const { record, primary } of groupRecords) {
  addEvidence({
    admission_version: ADMISSION_VERSION,
    place_id: record.place_id,
    evidence_kind: 'source_record',
    evidence_state: record.verification_status === 'verified' ? 'accepted' : 'under_review',
    subject: primary.preferred_name,
    provider: primary.source_names.slice().sort(byIdLex).join('+'),
    // A single anchor source record. Per-record traceability for every
    // contributing source is materialised in place_external_mapping, and the
    // complete set is also carried in the note, so nothing is lost here and no
    // value can exceed the governed column width.
    provider_record_id: (primary.source_record_ids ?? []).slice().sort(byIdLex)[0] ?? null,
    source_record_count: (primary.source_record_ids ?? []).length,
    research_priority: 0,
    note:
      `identity_admitted:${record.adjudication.basis};` +
      `type=${record.place_type};licensing=${record.licensing_classification};` +
      `identity_confidence=${primary.identity_confidence};type_state=${primary.type_state};` +
      `spatial_confidence=${primary.spatial_confidence};boundary_conflict=${primary.boundary_conflict};` +
      `source_record_count=${(primary.source_record_ids ?? []).length};` +
      `all_source_records=${(record.source_identity_ids ?? [])
        .flatMap(id => identityIndex.get(id)?.source_record_ids ?? [])
        .slice()
        .sort(byIdLex)
        .join('|')}`,
  });
}

// Why two source identities were merged rather than kept as separate Places.
for (const { group, record } of groupRecords) {
  if (group.members.length < 2) continue;
  const primaryId = record.primary_source_identity_id;
  for (const member of group.members) {
    if (member.canonical_location_id === primaryId) continue;
    addEvidence({
      admission_version: ADMISSION_VERSION,
      place_id: record.place_id,
      evidence_kind: 'continuity_decision',
      evidence_state: 'accepted',
      subject: member.preferred_name,
      provider: member.source_names.slice().sort(byIdLex).join('+'),
      provider_record_id: member.canonical_location_id,
      research_priority: 0,
      note:
        `equivalence_merged:source_identity ${member.canonical_location_id} (${member.canonical_type}) ` +
        `merged into place ${record.place_id} via ${record.adjudication.basis};` +
        `distance_km=${(haversineKm(member, group.members.find(m => m.canonical_location_id === primaryId)) ?? 0).toFixed(3)};` +
        `same_context=${adm2Of(member) === adm2Of(group.members.find(m => m.canonical_location_id === primaryId))}`,
    });
  }
}

const externalMappingRows = [];
const mappingKeys = new Set();
for (const link of sourceLinks) {
  const placeId = placeIdByIdentity.get(link.canonical_location_id);
  if (!placeId) continue;
  const key = `${link.source}|${link.source_record_id}`;
  if (mappingKeys.has(key)) continue;
  mappingKeys.add(key);
  externalMappingRows.push({
    admission_version: ADMISSION_VERSION,
    place_id: placeId,
    provider: link.source,
    provider_record_id: link.source_record_id,
    provider_label: link.exact_source_name ?? null,
    normalized_alias: normalizedName(link.exact_source_name ?? ''),
    observed_at: link.retrieved_at ? String(link.retrieved_at).slice(0, 19).replace('T', ' ') : null,
    source_identity_id: link.canonical_location_id,
    source_link_id: link.source_link_id,
    licence_class: link.licence_class ?? null,
  });
}
externalMappingRows.sort((a, b) => byIdLex(a.place_id, b.place_id) || byIdLex(a.provider, b.provider) || byIdLex(a.provider_record_id, b.provider_record_id));

/* ------------------------------------------------------------------ *
 * 8. Disposition ledger: every source candidate and identity
 * ------------------------------------------------------------------ */

const PROMOTABLE = new Set(['auto_promotable_factual_identity', 'promotable_with_provisional_attributes']);
const ledgerRows = [];
for (const candidate of candidates) {
  const candidateId = candidate.candidate_location_id;
  const isAdmittedIdentity = PROMOTABLE.has(candidate.promotion_class);
  const placeId = placeIdByIdentity.get(candidateId) ?? null;
  let disposition;
  let dispositionReason;
  if (isAdmittedIdentity && placeId) {
    const isPrimary = placeRowById.get(placeId)?.primary_source_identity_id === candidateId;
    disposition = isPrimary ? 'admitted_as_place_primary' : 'admitted_merged_into_place';
    dispositionReason = isPrimary
      ? 'source identity selected as the primary evidence anchor for its adjudicated Place'
      : 'source identity adjudicated as the same real-world referent as the Place primary';
  } else if (isAdmittedIdentity) {
    disposition = 'admitted_unplaced';
    dispositionReason = 'accepted source identity with no Place assignment';
  } else if (candidate.promotion_class === 'rejected_non_independent') {
    disposition = 'rejected_non_independent';
    dispositionReason = (candidate.promotion_reasons ?? []).join('; ') || 'source object is not independent evidence';
  } else {
    disposition = 'quarantined_candidate';
    dispositionReason =
      (candidate.promotion_reasons ?? []).join('; ') ||
      'evidence below the governed independent-identity threshold';
  }
  ledgerRows.push({
    admission_version: ADMISSION_VERSION,
    source_identity_id: candidateId,
    candidate_id: candidateId,
    preferred_name: candidate.preferred_name,
    normalized_name: normalizedName(candidate.preferred_name),
    candidate_type: candidate.candidate_type,
    assessed_candidate_type: candidate.assessed_candidate_type,
    source_promotion_class: candidate.promotion_class,
    is_accepted_source_identity: isAdmittedIdentity ? 1 : 0,
    place_id: placeId,
    disposition,
    disposition_reason: dispositionReason,
    licensing_classification: candidate.licence_state ?? null,
    osm_only: candidate.osm_only ? 1 : 0,
    human_review_required: candidate.human_review_required ? 1 : 0,
    priority_probe_review: candidate.priority_probe_review ? 1 : 0,
    source_names: (candidate.source_support?.sources ?? []).slice().sort(byIdLex),
  });

  if (!placeId) {
    addEvidence({
      admission_version: ADMISSION_VERSION,
      place_id: null,
      evidence_kind:
        candidate.promotion_class === 'rejected_non_independent'
          ? 'source_record'
          : 'unresolved_query',
      evidence_state: 'recorded',
      subject: candidate.preferred_name,
      provider: (candidate.source_support?.sources ?? []).slice().sort(byIdLex).join('+') || null,
      provider_record_id: candidateId,
      research_priority: candidate.priority_probe_review ? 1 : 0,
      note: `${disposition}: ${dispositionReason}`,
    });
  }
}
ledgerRows.sort((a, b) => byIdLex(a.source_identity_id, b.source_identity_id));

/* ------------------------------------------------------------------ *
 * 9. Classify the 103 governed v0.1 parent-evidence inputs
 *
 * Their existence does not prove an accepted Place relationship. They are
 * classified by what the evidence actually denotes, and none is promoted to
 * administrative containment in Slice 2.
 * ------------------------------------------------------------------ */

const v01Manifest = readJson(coverageBaselinePaths.territoryManifest);
const parentEvidenceInputs = v01Manifest.inputs.researched_parent_edges ?? [];

const NON_GEOGRAPHIC_EVIDENCE_PATTERN =
  /refuse_collection|service_area|tender|load_rotation|load_shedding|water_interruption|water_maintenance|customer_care|transport_and_meter|education_register|facility_address|developer_project|valuation_roll|residential_policy|spatial_development|idp|mdb_ward|cca_|ward_area|neighbourhood_schedule|water_subdistrict|demarcation|spatial_cluster|sdf_area/;
const ADMINISTRATIVE_EVIDENCE_PATTERN = /magisterial_place_index|government_locality_register|osb_administrative|osm_administrative|government_gazette|provincial_planning_gazette|provincial_township_gazette/;
const HISTORICAL_EVIDENCE_PATTERN = /^historical_/;

const parentEvidenceClassification = [];
const parentEvidenceTally = { total_edges: 0, by_class: {}, by_disposition: {} };
for (const file of parentEvidenceInputs) {
  const document = readJson(file);
  for (const edge of document.edges ?? []) {
    const evidenceClass = edge.evidence_class ?? 'unclassified';
    let classification;
    if (HISTORICAL_EVIDENCE_PATTERN.test(evidenceClass)) classification = 'historical_superseded_evidence';
    else if (ADMINISTRATIVE_EVIDENCE_PATTERN.test(evidenceClass)) classification = 'administrative_containment_candidate';
    else if (NON_GEOGRAPHIC_EVIDENCE_PATTERN.test(evidenceClass)) classification = 'non_geographic_relationship';
    else classification = 'insufficient_ambiguous_evidence';

    // Two independent blockers, both recorded:
    //  1. these edges reference v0.1 source identities, and no governed crosswalk
    //     exists from pl-gp-v01-* to an admitted Place;
    //  2. most classes denote service, delivery, planning or procurement areas
    //     rather than administrative containment.
    const disposition = 'not_admitted_in_slice_2';
    const reason =
      classification === 'administrative_containment_candidate'
        ? 'no governed v0.1 identity to Place crosswalk exists; administrative semantics plausible but unresolvable in Slice 2'
        : classification === 'non_geographic_relationship'
          ? 'evidence denotes a service, delivery, planning or procurement area and must not be upgraded to administrative containment'
          : classification === 'historical_superseded_evidence'
            ? 'historical boundary evidence; superseded for current containment'
            : 'evidence class does not establish administrative containment';

    parentEvidenceTally.total_edges += 1;
    parentEvidenceTally.by_class[classification] = (parentEvidenceTally.by_class[classification] ?? 0) + 1;
    parentEvidenceTally.by_disposition[disposition] = (parentEvidenceTally.by_disposition[disposition] ?? 0) + 1;
    parentEvidenceClassification.push({
      admission_version: ADMISSION_VERSION,
      evidence_input: file,
      evidence_input_town: document.town,
      evidence_input_parent: document.parent_natural_key,
      v01_source_identity_id: edge.factual_location_id,
      v01_factual_type: edge.factual_type,
      v01_preferred_name: edge.preferred_name,
      evidence_class: evidenceClass,
      citation: edge.citation ?? null,
      relationship_classification: classification,
      disposition,
      disposition_reason: reason,
      place_id: null,
    });

    addEvidence({
      admission_version: ADMISSION_VERSION,
      place_id: null,
      evidence_kind: 'parent_edge',
      evidence_state: 'recorded',
      subject: edge.preferred_name,
      // A municipal publisher is a citation, not a provider namespace, so it is
      // recorded in the note rather than in `provider`.
      provider: null,
      provider_record_id: edge.factual_location_id,
      research_priority: 0,
      note:
        `parent_evidence_classified:${classification};${disposition};` +
        `evidence_class=${evidenceClass};crosswalk_blocker=v0.1_identity_without_place_mapping;` +
        `publisher=${document.source?.publisher ?? 'unknown'};input=${file}`,
    });
  }
}
parentEvidenceClassification.sort(
  (a, b) => byIdLex(a.v01_source_identity_id, b.v01_source_identity_id) || byIdLex(a.evidence_input, b.evidence_input),
);
evidenceRows.sort(
  (a, b) =>
    (a.place_id ?? '~') .localeCompare(b.place_id ?? '~') ||
    byIdLex(a.evidence_kind, b.evidence_kind) ||
    byIdLex(a.subject ?? '', b.subject ?? ''),
);

/* ------------------------------------------------------------------ *
 * 10. Invariants
 * ------------------------------------------------------------------ */

const problems = [];
const assertInvariant = (condition, message) => { if (!condition) problems.push(message); };

/* Guard the two moves this scope contract explicitly forbids, so a future
 * rebuild cannot quietly reintroduce them to satisfy a search vocabulary. */
{
  const typeById = new Map(placeRows.map(row => [row.place_id, row.place_type]));
  const parents = new Set(
    relationshipRows
      .filter(row => row.relationship_type === 'administratively_contains')
      .map(row => row.to_place_id),
  );
  // No settlement Place may be inserted as a container purely to give a locality
  // a metro_city ancestor.
  const settlementContainers = [...parents].filter(id => typeById.get(id) === 'city' || typeById.get(id) === 'town');
  assertInvariant(
    settlementContainers.length === 0,
    `no artificial settlement parent may be introduced to complete a search hierarchy: ${settlementContainers.length} found`,
  );
  // No municipality may be re-typed as a city or town to occupy the metro tier.
  for (const row of placeRows) {
    assertInvariant(
      row.place_type !== 'city' && row.place_type !== 'town'
        ? true
        : row.scope_establishment?.evidenced_scoped_ancestors?.includes('province') === true,
      `a metro_city scope must be backed by an evidenced province context: ${row.place_id}`,
    );
  }
  // Every scoped Place must have an evidenced province context, which is the only
  // mandatory ancestry requirement.
  for (const row of placeRows) {
    if (row.search_scope == null || row.search_scope === 'province') continue;
    assertInvariant(
      row.scope_establishment?.evidenced_scoped_ancestors?.[0] === 'province',
      `scoped Place ${row.place_id} has no evidenced province context`,
    );
  }
  // Municipalities stay factual context Places and never become search scopes.
  for (const row of placeRows) {
    if (row.place_type !== 'local_municipality' && row.place_type !== 'district_municipality') continue;
    assertInvariant(
      row.search_scope == null && row.search_eligible === 0 && row.publication_eligible === 0,
      `a municipality must remain a context-only Place: ${row.place_id}`,
    );
  }
}

const admittedPlaces = new Set(placeRows.map(p => p.place_id));
assertInvariant(placeIdByIdentity.size === identities.length, 'every source identity maps to a Place');
assertInvariant(
  new Set(placeIdByIdentity.values()).size === placeRows.length,
  'Place count equals distinct assigned ids',
);
for (const row of placeRows) {
  assertInvariant(admittedPlaces.has(row.place_id), 'place id is unique');
  assertInvariant(
    row.source_identity_ids.includes(row.primary_source_identity_id),
    'primary identity is a member of its own group',
  );
  // The database CHECK forbids these; assert before materializing.
  if (row.search_scope == null) {
    assertInvariant(
      ['district_municipality', 'local_municipality', 'estate', 'precinct', 'development', 'other'].includes(row.place_type) ||
        row.search_eligible === 0,
      `non-scoped Place ${row.place_id} must not be searchable`,
    );
  }
  assertInvariant(
    row.verification_status !== 'candidate' || (row.publication_eligible === 0 && row.search_eligible === 0),
    'candidate Places carry no authority',
  );
  assertInvariant(
    row.place_classification !== 'non_statutory' || row.verification_status === 'verified',
    'non-statutory Places must be verified',
  );
  assertInvariant(
    row.publication_eligible === 0 || row.search_eligible === 1,
    'publication implies search eligibility',
  );
  assertInvariant(
    row.lifecycle_status !== 'retired' || (row.publication_eligible === 0 && row.search_eligible === 0),
    'retired Places carry no eligibility',
  );
  if (row.search_scope != null) {
    assertInvariant(row.search_eligible === 1 && row.lifecycle_status === 'active', 'scope requires an active searchable Place');
  }
}

// Containment must be a forest: one parent, no cycles.
for (const [child, parent] of containmentParent) {
  assertInvariant(child !== parent, 'containment is not self-referential');
  assertInvariant(
    parent != null && admittedPlaces.has(parent),
    'containment parent is an admitted Place',
  );
  let cursor = parent;
  const seen = new Set([child]);
  while (cursor != null) {
    assertInvariant(!seen.has(cursor), `containment cycle detected at ${cursor}`);
    if (seen.has(cursor)) break;
    seen.add(cursor);
    cursor = containmentParent.get(cursor) ?? null;
  }
}

for (const row of relationshipRows) {
  assertInvariant(admittedPlaces.has(row.from_place_id), 'relationship source is an admitted Place');
  assertInvariant(admittedPlaces.has(row.to_place_id), 'relationship target is an admitted Place');
  assertInvariant(row.from_place_id !== row.to_place_id, 'relationship is not self-referential');
  assertInvariant(row.evidence_source != null && row.evidence_source !== '', 'relationship has evidence');
  // Slice 2 authorizes no search widening.
  assertInvariant(row.search_scope_authorized === 0, 'no relationship-driven search widening in Slice 2');
}

// Every ledger row accounts for a real source candidate.
const candidateIds = new Set(candidates.map(c => c.candidate_location_id));
for (const row of ledgerRows) {
  assertInvariant(candidateIds.has(row.source_identity_id), 'ledger row refers to a real source candidate');
  assertInvariant(row.disposition != null, 'ledger row has a disposition');
  if (row.place_id) assertInvariant(admittedPlaces.has(row.place_id), 'ledger Place is admitted');
}
assertInvariant(ledgerRows.length === candidates.length, 'ledger covers every source candidate');

// Orphan checks against the emitted dataset.
const admittedIds = new Set(placeRows.map(p => p.place_id));
for (const row of nameRows) assertInvariant(admittedIds.has(row.place_id), 'name belongs to an admitted Place');
for (const row of externalMappingRows) assertInvariant(admittedIds.has(row.place_id), 'external mapping belongs to an admitted Place');
for (const row of evidenceRows) {
  if (row.place_id) assertInvariant(admittedIds.has(row.place_id), 'evidence belongs to an admitted Place');
}

// Exactly one preferred public name per Place.
const preferredCount = new Map();
for (const row of nameRows) {
  if (row.name_role !== 'preferred_public') continue;
  preferredCount.set(row.place_id, (preferredCount.get(row.place_id) ?? 0) + 1);
}
for (const [placeId, count] of preferredCount) {
  assertInvariant(count === 1, `Place ${placeId} has ${count} preferred public names`);
}
// Every admitted Place must actually *have* one. The loop above only visits
// Places that already have a preferred public name, so a Place whose source
// identity carried no name assertion would pass with none at all.
for (const row of placeRows) {
  assertInvariant(
    preferredCount.get(row.place_id) === 1,
    `Place ${row.place_id} has no preferred public name`,
  );
}

// Column-width guard. The builder must never emit a value the physical schema
// cannot hold; a silent overflow would surface only at materialization time.
const NARROW_COLUMNS = {
  place_evidence: { provider: 64, evidence_kind: 64, subject: 500, provider_record_id: 255 },
  place_relationship: { evidence_source: 64, relationship_type: 64 },
  place_external_mapping: { provider: 64, provider_record_id: 255, provider_label: 255, normalized_alias: 255 },
  place_name: { evidence_source: 64, name: 255, normalized_name: 255, name_role: 32, name_state: 32 },
};
const widthIssues = [];
const checkWidths = (table, rows) => {
  for (const row of rows) {
    for (const [column, limit] of Object.entries(NARROW_COLUMNS[table] ?? {})) {
      const value = row[column];
      if (value == null) continue;
      if (String(value).length > limit) {
        widthIssues.push(`${table}.${column} exceeds ${limit} chars for ${JSON.stringify(String(value).slice(0, 60))}`);
      }
    }
  }
};
checkWidths('place_evidence', evidenceRows);
checkWidths('place_relationship', relationshipRows);
checkWidths('place_external_mapping', externalMappingRows);
checkWidths('place_name', nameRows);
problems.push(...widthIssues);

if (problems.length) {
  throw new Error(`admission invariants failed:\n  - ${problems.slice(0, 25).join('\n  - ')}`);
}

/* ------------------------------------------------------------------ *
 * 11. Emit
 * ------------------------------------------------------------------ */

const dispositionTally = ledgerRows.reduce((acc, row) => {
  acc[row.disposition] = (acc[row.disposition] ?? 0) + 1;
  return acc;
}, {});
const nameRoleTally = nameRows.reduce((acc, row) => {
  acc[row.name_role] = (acc[row.name_role] ?? 0) + 1;
  return acc;
}, {});
const relationshipTally = relationshipRows.reduce((acc, row) => {
  acc[row.relationship_type] = (acc[row.relationship_type] ?? 0) + 1;
  return acc;
}, {});
const verificationTally = placeRows.reduce((acc, row) => {
  acc[row.verification_status] = (acc[row.verification_status] ?? 0) + 1;
  return acc;
}, {});
const licensingTally = placeRows.reduce((acc, row) => {
  acc[row.licensing_classification] = (acc[row.licensing_classification] ?? 0) + 1;
  return acc;
}, {});
const groupKindTally = groupRecords.reduce((acc, item) => {
  acc[item.group.kind] = (acc[item.group.kind] ?? 0) + 1;
  return acc;
}, {});

const manifest = {
  admission_version: ADMISSION_VERSION,
  territory: {
    territory_id: territory.territoryId,
    display_name: territory.displayName,
    admission_registry_path: registryLoad.registryPath,
    admission_registry_sha256: registryLoad.registrySha256,
  },
  generated_from: {
    source_authority_version: sourceManifest.authority_version,
    source_snapshot_id: sourceManifest.source_snapshot_id,
    source_manifest_path: sourcePaths.manifest,
    source_manifest_sha256: sha256(sourcePaths.manifest),
    compact_artifacts: (sourceManifest.compact_artifacts ?? []).map(artifact => ({
      path: artifact.path,
      sha256: artifact.sha256,
      size_bytes: artifact.size_bytes,
    })),
    comparison_baseline: {
      note: 'The v0.1 committed artifacts are retained as comparison and regression evidence only. Their factual source JSONLs are unrecoverable and were not used as forward authority.',
      catalogue: coverageBaselinePaths.territoryCatalog,
      catalogue_sha256: sha256(coverageBaselinePaths.territoryCatalog),
      ...territory.coverageBaseline.counts,
      parent_evidence_inputs: parentEvidenceInputs.length,
    },
  },
  governed_policy: {
    container_types: [...CONTAINER_TYPES].sort(byIdLex),
    settlement_merge_max_km: SETTLEMENT_MERGE_MAX_KM,
    merge_requires_same_administrative_context: true,
    type_disagreement_never_blocks_merge: true,
    preferred_public_name_selection: 'official role, then source preferred_common; within a class the most independently sourced assertion wins, ties broken by text',
    one_containment_parent_per_place: true,
    search_scope_authorization_in_slice_2: 0,
    place_id_allocation: 'assigned from a committed registry; never derived from name, slug, coordinates, parent, classification, natural key or source identity',
  },
  counts: {
    source_identities: identities.length,
    source_name_assertions: nameAssertions.length,
    source_links: sourceLinks.length,
    source_candidates: candidates.length,
    admitted_places: placeRows.length,
    merged_equivalence_groups: groupRecords.filter(item => item.group.members.length > 1).length,
    absorbed_source_identities: identities.length - placeRows.length,
    single_identity_places: groupRecords.filter(item => item.group.members.length === 1).length,
    group_kinds: groupKindTally,
    verification: verificationTally,
    licensing: licensingTally,
    scope_establishment: scopeEstablishment,
    executable_places: placeRows.filter(row => row.search_eligible === 1).length,
    executable_by_scope: Object.fromEntries(
      Object.entries(
        placeRows
          .filter(row => row.search_eligible === 1)
          .reduce((tally, row) => {
            tally[row.search_scope] = (tally[row.search_scope] ?? 0) + 1;
            return tally;
          }, {}),
      ).sort(([a], [b]) => byIdLex(a, b)),
    ),
    admitted_without_executable_scope: placeRows.filter(row => row.search_eligible === 0).length,
    names: nameRows.length,
    name_roles: nameRoleTally,
    searchable_names: nameRows.filter(r => r.is_searchable === 1).length,
    preferred_public_names: nameRows.filter(r => r.name_role === 'preferred_public').length,
    relationships: relationshipRows.length,
    relationship_types: relationshipTally,
    containment_parent_count: containmentParent.size,
    evidence_rows: evidenceRows.length,
    external_mappings: externalMappingRows.length,
    disposition_ledger_rows: ledgerRows.length,
    dispositions: dispositionTally,
    parent_evidence_inputs: parentEvidenceInputs.length,
    parent_evidence_classification: parentEvidenceTally,
  },
  place_id_registry: {
    path: PLACE_ID_REGISTRY_PATH,
    allocated_ids: Object.keys(registry.allocated).length,
    allocation_sequence: registry.allocation_sequence,
  },
  invariants_asserted: [
    'every source identity maps to exactly one admitted Place',
    'place count equals distinct assigned ids',
    'one preferred public name per Place',
    'every name, relationship and evidence row references an admitted Place',
    'every relationship has evidence and is not self-referential',
    'containment is a forest: one parent, no cycles',
    'no relationship-driven search widening in Slice 2',
    'scope, eligibility and classification combinations satisfy the database invariants',
    'every scoped Place has an evidenced province context, the only mandatory ancestry requirement',
    'no artificial settlement parent is introduced to complete a search hierarchy',
    'no municipality is re-typed or promoted into the metro_city search tier',
    'a Place without a governed executable scope stays admitted but is neither searchable nor publishable',
    'the disposition ledger covers every source candidate',
  ],
outputs: {
    places: packagePaths.artifacts.places,
    names: packagePaths.artifacts.names,
    relationships: packagePaths.artifacts.relationships,
    evidence: packagePaths.artifacts.evidence,
    external_mappings: packagePaths.artifacts.external_mappings,
    disposition_ledger: packagePaths.artifacts.disposition_ledger,
    parent_evidence_classification: packagePaths.artifacts.parent_evidence_classification,
  },
};

/**
 * The registry holds reviewed expected counts for this territory. A produced
 * package that disagrees is refused here, so a changed admission outcome is a
 * reviewed registry diff rather than a silently committed artifact.
 */
const expectedCountMismatches = Object.entries(territory.expectedCounts)
  .filter(([key, expected]) => manifest.counts[key] !== expected)
  .map(([key, expected]) => `${key}: registry expects ${expected}, produced ${manifest.counts[key]}`);
if (expectedCountMismatches.length) {
  throw new Error(
    `place-admission refused: territory ${territory.territoryId} produced counts that disagree with ` +
      `the committed admission registry:\n  ${expectedCountMismatches.join('\n  ')}`,
  );
}

if (!CHECK_ONLY) {
  registry.provenance = {
    admission_version: ADMISSION_VERSION,
    territory_id: territory.territoryId,
    source_snapshot_id: sourceManifest.source_snapshot_id,
    note: 'Assigned canonical Place identities. Reused verbatim on every regeneration. Never remap an id.',
  };
  writeIfChanged(PLACE_ID_REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
}
writeJsonl(manifest.outputs.places, placeRows);
writeJsonl(manifest.outputs.names, nameRows);
writeJsonl(manifest.outputs.relationships, relationshipRows);
writeJsonl(manifest.outputs.evidence, evidenceRows);
writeJsonl(manifest.outputs.external_mappings, externalMappingRows);
writeJsonl(manifest.outputs.disposition_ledger, ledgerRows);
writeIfChanged(
  packagePaths.artifacts.parent_evidence_classification,
  JSON.stringify(
    {
      admission_version: ADMISSION_VERSION,
      territory_id: territory.territoryId,
      source_manifest: coverageBaselinePaths.territoryManifest,
      governed_input_count: parentEvidenceInputs.length,
      note: 'A file existing does not prove an accepted Place relationship. Every edge is classified by what its evidence denotes and none is promoted to administrative containment in Slice 2.',
      tally: parentEvidenceTally,
      edges: parentEvidenceClassification,
    },
    null,
    2,
  ) + '\n',
);
writeIfChanged(packagePaths.manifest, JSON.stringify(manifest, null, 2) + '\n');

/**
 * Every path this manifest advertises must exist and must be the path the
 * registry resolved. A manifest that names a file nobody wrote is how an
 * artifact silently stops being reproducible, so it is asserted rather than
 * trusted.
 */
const advertisedPaths = [
  ...Object.values(manifest.outputs),
  manifest.place_id_registry.path,
  manifest.generated_from.source_manifest_path,
  manifest.generated_from.comparison_baseline.catalogue,
];
const unresolvable = advertisedPaths.filter(path => !existsSync(resolve(ROOT, path)));
if (unresolvable.length) {
  throw new Error(
    `place-admission refused: the admission manifest advertises paths that do not exist:\n  ${unresolvable.join('\n  ')}`,
  );
}

if (CHECK_ONLY) {
  console.log(
    `place-admission:check OK territory=${territory.territoryId} ` +
      `admission_version=${ADMISSION_VERSION} places=${placeRows.length}`,
  );
} else {
  console.log(
    `place-admission:built territory=${territory.territoryId} admission_version=${ADMISSION_VERSION} ` +
      `identities=${identities.length} places=${placeRows.length} merged_groups=${manifest.counts.merged_equivalence_groups} ` +
      `names=${nameRows.length} relationships=${relationshipRows.length} evidence=${evidenceRows.length} ` +
      `mappings=${externalMappingRows.length} ledger=${ledgerRows.length} minted=${minted} reused=${reused}`,
  );
}
