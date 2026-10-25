/**
 * Governed, disposable-target correction overlay for Gauteng city scopes.
 *
 * The admitted Gauteng package asserts all 63 Johannesburg metro-city scopes as
 * `town` or `city`. Forty-eight are sub places, not main places. `canonicalPlaces`
 * correctly refuses to reclassify an identity-bearing field, and `placeRelease`
 * only inserts package-pending rows, so neither can perform the correction.
 *
 * This adapter applies a reviewed, digest-pinned correction package in one
 * bounded transaction. It is deliberately an overlay, not a new admission
 * authority: after a successful apply, the canonical package must be rebuilt
 * before `db:places:verify` or the release preview can pass again.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import {
  assertAuthorizedDatabaseOperation,
  type AuthorizedDatabaseOperation,
} from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  queryRows,
  requireAcceptedMigrationHead,
  requireReferenceAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
} from './common';

export const PLACE_SCOPE_CORRECTION_VERSION = 'gauteng-city-scope-correction-v0.1';
export const PLACE_SCOPE_CORRECTION_PACKAGE_DIGEST =
  '36efde72f920b9c990aadfa8c81ce2069b4c8cf962f6678772dd411f680910e2';

const PACKAGE_DIR = 'data/gauteng-city-scope-correction-v0.1';
const MANIFEST_PATH = `${PACKAGE_DIR}/manifest.json`;
const PLACE_ID_PATTERN = /^pl-place-01-[a-f0-9]{24}$/;
const LOCK_NAME = 'property-listify:canonical-places:scope-correction';

const EXPECTED_COUNTS = Object.freeze({
  place_corrections: 48,
  target_type_suburb: 41,
  target_type_locality: 7,
  settlement_within_edges: 351,
  existing_locality_edges: 312,
  demoted_scope_edges: 39,
  high_confidence_edges: 268,
  medium_confidence_edges: 83,
  parents: 8,
  retained_places: 13,
  held_places: 2,
  demoted_without_edge: 9,
});

export const PLACE_SCOPE_CORRECTION_EXPECTED = Object.freeze({
  ...EXPECTED_COUNTS,
  targetInvariants: Object.freeze({
    administratively_contains: 17655,
    settlement_within_before: 0,
    search_scope_authorized_before: 0,
    properties_assigned_to_63: 0,
    listings_assigned_to_63: 0,
  }),
});

export const PLACE_SCOPE_CORRECTION_DIGEST = stableDigest({
  adapter: 'canonical-places-scope-correction',
  version: PLACE_SCOPE_CORRECTION_VERSION,
  packageDigest: PLACE_SCOPE_CORRECTION_PACKAGE_DIGEST,
  counts: PLACE_SCOPE_CORRECTION_EXPECTED,
  writes: ['place.place_type', 'place.search_scope', 'place_relationship.settlement_within'],
  preserves: [
    'publication_eligible',
    'search_eligible',
    'administratively_contains',
    'properties',
    'listings',
  ],
  /* The rebuild exists: gauteng-source-authority-v0.3 / gauteng-place-admission-v0.2
   * derive the same 48 type corrections and 351 membership edges from a
   * digest-pinned reviewed artifact, so the correction package no longer carries a
   * forward-only delta against canonical admission. */
  canonicalPackageRebuildRequired: false,
});

type Identity = {
  place_type: string;
  place_classification: string;
  verification_status: string;
  lifecycle_status: string;
  publication_eligible: number;
  search_eligible: number;
  search_scope: string | null;
  licensing_classification: string | null;
};

export type PlaceScopeCorrectionRow = {
  place_id: string;
  name: string;
  expected_identity: Identity;
  target_identity: { place_type: 'suburb' | 'locality'; search_scope: 'locality' };
  type_basis: string;
  type_evidence: string;
  confidence: 'high' | 'medium';
  edge_present: boolean;
  reason: string;
};

export type SettlementWithinEdge = {
  child_place_id: string;
  child_name: string;
  parent_place_id: string;
  parent_name: string;
  relationship_type: 'settlement_within';
  search_scope_authorized: 0;
  evidence_source: string;
  child_disposition: 'existing_locality' | 'demoted_scope';
  membership_confidence: 'high' | 'medium';
  source: {
    title: string;
    url: string;
    scope: 'sub_place_to_main_place' | 'point_in_main_place';
    vintage: string;
    licence: string;
  };
  notes: string;
};

export type PlaceScopeCorrectionPackage = {
  manifest: {
    correction_version: string;
    purpose: string;
    counts: Record<string, number>;
    held_place_ids: string[];
    parent_place_ids: string[];
    retained_place_ids: string[];
    policy: Record<string, unknown>;
    target_invariants: Record<string, number>;
    source_artifacts: Array<{ label: string; sha256: string }>;
    outputs: Record<string, { path: string; sha256: string }>;
    package_digest: string;
  };
  corrections: PlaceScopeCorrectionRow[];
  relationships: SettlementWithinEdge[];
  verifiedDigest: string;
};

const IDENTITY_FIELDS = [
  'place_type',
  'place_classification',
  'verification_status',
  'lifecycle_status',
  'publication_eligible',
  'search_eligible',
  'search_scope',
  'licensing_classification',
] as const;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .map(key => [key, canonicalize((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

function canonicalDigest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function sha256OfFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readJsonl<T>(path: string): T[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        throw new Error(
          `place-scope-correction refused: ${path} line ${index + 1} is not valid JSON`,
        );
      }
    });
}

function assertPackagePath(packageRoot: string, path: string): string {
  const resolved = resolve(packageRoot, path);
  const rel = relative(packageRoot, resolved);
  if (rel.startsWith('..') || rel.includes('..')) {
    throw new Error(`place-scope-correction refused: output path ${path} escapes the package`);
  }
  return resolved;
}

function packageDigestContent(manifest: PlaceScopeCorrectionPackage['manifest']) {
  return {
    correction_version: manifest.correction_version,
    counts: manifest.counts,
    held_place_ids: manifest.held_place_ids,
    parent_place_ids: manifest.parent_place_ids,
    retained_place_ids: manifest.retained_place_ids,
    policy: manifest.policy,
    source_artifacts: manifest.source_artifacts,
    target_invariants: manifest.target_invariants,
    outputs: manifest.outputs,
  };
}

function identityKey(identity: Identity): string {
  return JSON.stringify(IDENTITY_FIELDS.map(field => identity[field] ?? null));
}

function identityFromRow(row: Record<string, unknown>): Identity {
  return {
    place_type: String(rowValue(row, 'place_type') ?? ''),
    place_classification: String(rowValue(row, 'place_classification') ?? ''),
    verification_status: String(rowValue(row, 'verification_status') ?? ''),
    lifecycle_status: String(rowValue(row, 'lifecycle_status') ?? ''),
    publication_eligible: Number(rowValue(row, 'publication_eligible') ?? -1),
    search_eligible: Number(rowValue(row, 'search_eligible') ?? -1),
    search_scope:
      rowValue(row, 'search_scope') === null || rowValue(row, 'search_scope') === undefined
        ? null
        : String(rowValue(row, 'search_scope')),
    licensing_classification:
      rowValue(row, 'licensing_classification') === null ||
      rowValue(row, 'licensing_classification') === undefined
        ? null
        : String(rowValue(row, 'licensing_classification')),
  };
}

function edgeKey(edge: {
  child_place_id: string;
  parent_place_id: string;
  relationship_type: string;
}) {
  return `${edge.child_place_id}\u0000${edge.parent_place_id}\u0000${edge.relationship_type}`;
}

const placeholders = (count: number) => Array(count).fill('?').join(',');

function validatePackage(pkg: PlaceScopeCorrectionPackage): void {
  const { manifest, corrections, relationships } = pkg;
  if (manifest.correction_version !== PLACE_SCOPE_CORRECTION_VERSION) {
    throw new Error(
      `place-scope-correction refused: version ${manifest.correction_version} is not ${PLACE_SCOPE_CORRECTION_VERSION}`,
    );
  }
  if (manifest.package_digest !== PLACE_SCOPE_CORRECTION_PACKAGE_DIGEST) {
    throw new Error('place-scope-correction refused: package digest is not the reviewed digest');
  }
  if (canonicalDigest(packageDigestContent(manifest)) !== PLACE_SCOPE_CORRECTION_PACKAGE_DIGEST) {
    throw new Error('place-scope-correction refused: manifest content digest drift');
  }
  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (Number(manifest.counts[key]) !== expected) {
      throw new Error(
        `place-scope-correction refused: manifest count ${key} ${manifest.counts[key]} != ${expected}`,
      );
    }
  }

  if (corrections.length !== EXPECTED_COUNTS.place_corrections) {
    throw new Error(
      `place-scope-correction refused: ${corrections.length} corrections != ${EXPECTED_COUNTS.place_corrections}`,
    );
  }
  if (relationships.length !== EXPECTED_COUNTS.settlement_within_edges) {
    throw new Error(
      `place-scope-correction refused: ${relationships.length} relationships != ${EXPECTED_COUNTS.settlement_within_edges}`,
    );
  }
  if (manifest.held_place_ids.length !== EXPECTED_COUNTS.held_places) {
    throw new Error('place-scope-correction refused: held-place inventory is incomplete');
  }
  if (manifest.retained_place_ids.length !== EXPECTED_COUNTS.retained_places) {
    throw new Error('place-scope-correction refused: retained-place inventory is incomplete');
  }
  if (manifest.parent_place_ids.length !== EXPECTED_COUNTS.parents) {
    throw new Error('place-scope-correction refused: parent inventory is incomplete');
  }

  const correctionIds = new Set<string>();
  for (const correction of corrections) {
    if (!PLACE_ID_PATTERN.test(correction.place_id)) {
      throw new Error(`place-scope-correction refused: invalid Place ID ${correction.place_id}`);
    }
    if (correctionIds.has(correction.place_id)) {
      throw new Error(
        `place-scope-correction refused: duplicate correction ${correction.place_id}`,
      );
    }
    correctionIds.add(correction.place_id);
    if (manifest.held_place_ids.includes(correction.place_id)) {
      throw new Error(
        `place-scope-correction refused: held Place ${correction.place_id} is corrected`,
      );
    }
    if (manifest.retained_place_ids.includes(correction.place_id)) {
      throw new Error(
        `place-scope-correction refused: retained Place ${correction.place_id} is corrected`,
      );
    }
    if (!['town', 'city'].includes(correction.expected_identity.place_type)) {
      throw new Error(
        `place-scope-correction refused: ${correction.place_id} does not start as a city/town scope`,
      );
    }
    if (
      correction.expected_identity.search_scope !== 'metro_city' ||
      correction.expected_identity.search_eligible !== 1 ||
      correction.expected_identity.lifecycle_status !== 'active'
    ) {
      throw new Error(
        `place-scope-correction refused: ${correction.place_id} is not an active metro-city scope`,
      );
    }
    if (
      !['suburb', 'locality'].includes(correction.target_identity.place_type) ||
      correction.target_identity.search_scope !== 'locality'
    ) {
      throw new Error(
        `place-scope-correction refused: invalid target identity for ${correction.place_id}`,
      );
    }
    if (correction.target_identity.place_type === correction.expected_identity.place_type) {
      throw new Error(
        `place-scope-correction refused: ${correction.place_id} target type is unchanged`,
      );
    }
    if (typeof correction.edge_present !== 'boolean') {
      throw new Error(
        `place-scope-correction refused: ${correction.place_id} edge_present is invalid`,
      );
    }
    if (!['high', 'medium'].includes(correction.confidence)) {
      throw new Error(
        `place-scope-correction refused: ${correction.place_id} confidence is invalid`,
      );
    }
  }
  if (
    corrections.filter(c => c.target_identity.place_type === 'suburb').length !==
      EXPECTED_COUNTS.target_type_suburb ||
    corrections.filter(c => c.target_identity.place_type === 'locality').length !==
      EXPECTED_COUNTS.target_type_locality
  ) {
    throw new Error('place-scope-correction refused: target type counts differ from the review');
  }

  const parentIds = new Set(manifest.parent_place_ids);
  const edgeKeys = new Set<string>();
  const edgeByChild = new Map<string, SettlementWithinEdge>();
  for (const edge of relationships) {
    if (
      !PLACE_ID_PATTERN.test(edge.child_place_id) ||
      !PLACE_ID_PATTERN.test(edge.parent_place_id)
    ) {
      throw new Error('place-scope-correction refused: relationship has an invalid Place ID');
    }
    if (edge.child_place_id === edge.parent_place_id) {
      throw new Error('place-scope-correction refused: self settlement edge');
    }
    if (edge.relationship_type !== 'settlement_within' || edge.search_scope_authorized !== 0) {
      throw new Error('place-scope-correction refused: relationship type/authorization is invalid');
    }
    if (!edge.evidence_source || edge.evidence_source.length > 64) {
      throw new Error('place-scope-correction refused: relationship evidence source is invalid');
    }
    const key = edgeKey(edge);
    if (edgeKeys.has(key)) {
      throw new Error(`place-scope-correction refused: duplicate relationship ${key}`);
    }
    edgeKeys.add(key);
    if (edgeByChild.has(edge.child_place_id)) {
      throw new Error(
        `place-scope-correction refused: child ${edge.child_place_id} has more than one settlement parent`,
      );
    }
    edgeByChild.set(edge.child_place_id, edge);
    if (!parentIds.has(edge.parent_place_id)) {
      throw new Error(
        `place-scope-correction refused: parent ${edge.parent_place_id} is not in the reviewed parent set`,
      );
    }
    if (correctionIds.has(edge.parent_place_id)) {
      throw new Error(
        `place-scope-correction refused: corrected Place ${edge.parent_place_id} is a parent`,
      );
    }
    const correction = correctionIds.has(edge.child_place_id)
      ? corrections.find(c => c.place_id === edge.child_place_id)
      : undefined;
    if (correction) {
      if (correction.edge_present !== true || edge.child_disposition !== 'demoted_scope') {
        throw new Error(
          `place-scope-correction refused: ${edge.child_place_id} edge disposition disagrees with its correction`,
        );
      }
      if (correction.name !== edge.child_name) {
        throw new Error(
          `place-scope-correction refused: child name mismatch for ${edge.child_place_id}`,
        );
      }
    } else if (edge.child_disposition !== 'existing_locality') {
      throw new Error(
        `place-scope-correction refused: non-corrected child ${edge.child_place_id} is not an existing locality`,
      );
    }
  }

  for (const correction of corrections) {
    const edge = edgeByChild.get(correction.place_id);
    if (correction.edge_present !== Boolean(edge)) {
      throw new Error(
        `place-scope-correction refused: ${correction.place_id} edge_present disagrees with the relationship package`,
      );
    }
  }

  if (
    relationships.filter(e => e.child_disposition === 'existing_locality').length !==
      EXPECTED_COUNTS.existing_locality_edges ||
    relationships.filter(e => e.child_disposition === 'demoted_scope').length !==
      EXPECTED_COUNTS.demoted_scope_edges
  ) {
    throw new Error(
      'place-scope-correction refused: edge disposition counts differ from the review',
    );
  }
  if (
    relationships.filter(e => e.membership_confidence === 'high').length !==
      EXPECTED_COUNTS.high_confidence_edges ||
    relationships.filter(e => e.membership_confidence === 'medium').length !==
      EXPECTED_COUNTS.medium_confidence_edges
  ) {
    throw new Error('place-scope-correction refused: confidence counts differ from the review');
  }
  if (corrections.filter(c => !c.edge_present).length !== EXPECTED_COUNTS.demoted_without_edge) {
    throw new Error(
      'place-scope-correction refused: demoted-without-edge count differs from the review',
    );
  }
  if (new Set(relationships.map(e => e.parent_place_id)).size !== EXPECTED_COUNTS.parents) {
    throw new Error('place-scope-correction refused: parent count differs from the review');
  }
}

export function loadPlaceScopeCorrectionPackage(root = process.cwd()): PlaceScopeCorrectionPackage {
  const packageRoot = resolve(root, PACKAGE_DIR);
  const manifestPath = resolve(root, MANIFEST_PATH);
  const manifest = JSON.parse(
    readFileSync(manifestPath, 'utf8'),
  ) as PlaceScopeCorrectionPackage['manifest'];
  if (manifest.package_digest !== PLACE_SCOPE_CORRECTION_PACKAGE_DIGEST) {
    throw new Error('place-scope-correction refused: package digest is not the reviewed digest');
  }
  for (const output of Object.values(manifest.outputs)) {
    const path = assertPackagePath(packageRoot, output.path);
    const actual = sha256OfFile(path);
    if (actual !== output.sha256) {
      throw new Error(`place-scope-correction refused: artifact ${output.path} digest drift`);
    }
  }
  const corrections = readJsonl<PlaceScopeCorrectionRow>(
    assertPackagePath(packageRoot, manifest.outputs.place_corrections.path),
  );
  const relationships = readJsonl<SettlementWithinEdge>(
    assertPackagePath(packageRoot, manifest.outputs.settlement_within_relationships.path),
  );
  const pkg: PlaceScopeCorrectionPackage = {
    manifest,
    corrections,
    relationships,
    verifiedDigest: PLACE_SCOPE_CORRECTION_PACKAGE_DIGEST,
  };
  validatePackage(pkg);
  return pkg;
}

type CorrectionState = 'pending' | 'applied';
type EdgeState = 'pending' | 'observed';

type Inspection = {
  corrections: Array<{ place_id: string; name: string; state: CorrectionState }>;
  relationships: Array<{
    key: string;
    child_place_id: string;
    parent_place_id: string;
    state: EdgeState;
  }>;
  state: {
    pendingCorrections: number;
    appliedCorrections: number;
    pendingEdges: number;
    observedEdges: number;
  };
  counts: {
    administratively_contains: number;
    settlement_within: number;
    search_scope_authorized: number;
    properties_assigned_to_63: number;
    listings_assigned_to_63: number;
  };
  head: string;
  planDigest: string;
};

function detailsFor(identity: Identity): string {
  return JSON.stringify(identity);
}

async function inspect(input: {
  authority: ResolvedDatabaseAuthority;
  connection: AuthoritySqlConnection;
  pkg: PlaceScopeCorrectionPackage;
}): Promise<Inspection> {
  const { authority, connection, pkg } = input;
  const head = await requireAcceptedMigrationHead({ authority, connection });
  const correctionIds = pkg.corrections.map(c => c.place_id);
  const childIds = [...new Set(pkg.relationships.map(e => e.child_place_id))];
  const parentIds = pkg.manifest.parent_place_ids;
  const scopeIds = [
    ...new Set([
      ...correctionIds,
      ...pkg.manifest.retained_place_ids,
      ...pkg.manifest.held_place_ids,
    ]),
  ];
  const allIds = [...new Set([...scopeIds, ...childIds, ...parentIds])];

  const placeRows = await queryRows(
    connection,
    `SELECT place_id, place_type, place_classification, verification_status, lifecycle_status,
            publication_eligible, search_eligible, search_scope, licensing_classification
       FROM \`place\`
      WHERE place_id IN (${placeholders(allIds.length)})`,
    allIds,
  );
  const placeById = new Map(placeRows.map(row => [String(rowValue(row, 'place_id')), row]));
  const nameRows = await queryRows(
    connection,
    `SELECT place_id, name FROM \`place_name\`
      WHERE place_id IN (${placeholders(allIds.length)})
        AND name_role = 'preferred_public' AND name_state = 'active'`,
    allIds,
  );
  const nameById = new Map<string, string>();
  for (const row of nameRows) {
    const id = String(rowValue(row, 'place_id'));
    if (nameById.has(id)) {
      throw new Error(
        `place-scope-correction refused: ${id} has more than one active preferred-public name`,
      );
    }
    nameById.set(id, String(rowValue(row, 'name')));
  }

  const problems: string[] = [];
  for (const id of allIds) {
    if (!placeById.has(id)) problems.push(`missing Place ${id}`);
    if (!nameById.has(id)) problems.push(`missing preferred name for ${id}`);
  }

  const parentNameById = new Map<string, string>();
  for (const edge of pkg.relationships) {
    const previous = parentNameById.get(edge.parent_place_id);
    if (previous && previous !== edge.parent_name) {
      problems.push(`parent ${edge.parent_place_id} has conflicting names`);
    }
    parentNameById.set(edge.parent_place_id, edge.parent_name);
  }
  for (const parentId of parentIds) {
    const row = placeById.get(parentId);
    if (!row) continue;
    const expectedName = parentNameById.get(parentId);
    if (nameById.get(parentId) !== expectedName) {
      problems.push(`parent ${parentId} name differs from ${expectedName}`);
    }
    if (
      !['city', 'town'].includes(String(rowValue(row, 'place_type'))) ||
      String(rowValue(row, 'search_scope')) !== 'metro_city' ||
      Number(rowValue(row, 'search_eligible')) !== 1 ||
      String(rowValue(row, 'lifecycle_status')) !== 'active'
    ) {
      problems.push(`parent ${parentId} is not an active/searchable city or town scope`);
    }
  }

  const correctionStates: Inspection['corrections'] = [];
  for (const correction of pkg.corrections) {
    const row = placeById.get(correction.place_id);
    if (!row) continue;
    if (nameById.get(correction.place_id) !== correction.name) {
      problems.push(`correction ${correction.place_id} name differs from ${correction.name}`);
      continue;
    }
    const current = identityFromRow(row);
    const targetIdentity: Identity = {
      ...correction.expected_identity,
      place_type: correction.target_identity.place_type,
      search_scope: correction.target_identity.search_scope,
    };
    if (identityKey(current) === identityKey(correction.expected_identity)) {
      correctionStates.push({
        place_id: correction.place_id,
        name: correction.name,
        state: 'pending',
      });
    } else if (identityKey(current) === identityKey(targetIdentity)) {
      correctionStates.push({
        place_id: correction.place_id,
        name: correction.name,
        state: 'applied',
      });
    } else {
      problems.push(
        `correction ${correction.place_id} is neither pending nor applied: current ${detailsFor(current)}`,
      );
    }
  }

  const settlementRows = await queryRows(
    connection,
    `SELECT from_place_id, to_place_id, relationship_type, search_scope_authorized, evidence_source
       FROM \`place_relationship\`
      WHERE relationship_type = 'settlement_within'
        AND (from_place_id IN (${placeholders(childIds.length)})
          OR to_place_id IN (${placeholders(parentIds.length)}))`,
    [...childIds, ...parentIds],
  );
  const storedEdges = new Map(
    settlementRows.map(row => [
      edgeKey({
        child_place_id: String(rowValue(row, 'from_place_id')),
        parent_place_id: String(rowValue(row, 'to_place_id')),
        relationship_type: String(rowValue(row, 'relationship_type')),
      }),
      row,
    ]),
  );
  const edgeStates: Inspection['relationships'] = [];
  for (const edge of pkg.relationships) {
    const key = edgeKey(edge);
    const stored = storedEdges.get(key);
    const correctionState = correctionStates.find(c => c.place_id === edge.child_place_id)?.state;
    if (stored && correctionState === 'pending') {
      problems.push(`settlement edge exists before correction for ${edge.child_place_id}`);
    }
    if (!stored) {
      edgeStates.push({
        key,
        child_place_id: edge.child_place_id,
        parent_place_id: edge.parent_place_id,
        state: 'pending',
      });
      continue;
    }
    if (Number(rowValue(stored, 'search_scope_authorized')) !== 0) {
      problems.push(`settlement edge ${key} is search-authorized`);
    }
    if (String(rowValue(stored, 'evidence_source')) !== edge.evidence_source) {
      problems.push(`settlement edge ${key} has a different evidence source`);
    }
    edgeStates.push({
      key,
      child_place_id: edge.child_place_id,
      parent_place_id: edge.parent_place_id,
      state: 'observed',
    });
  }
  const packageEdgeKeys = new Set(pkg.relationships.map(edgeKey));
  for (const key of storedEdges.keys()) {
    if (!packageEdgeKeys.has(key)) problems.push(`foreign settlement edge ${key}`);
  }

  const childOrCorrection = new Set([...childIds, ...correctionIds]);
  for (const id of childOrCorrection) {
    const row = placeById.get(id);
    if (!row) continue;
    if (
      String(rowValue(row, 'lifecycle_status')) !== 'active' ||
      Number(rowValue(row, 'search_eligible')) !== 1
    ) {
      problems.push(`child ${id} is not active/searchable`);
    }
    const state = correctionStates.find(c => c.place_id === id)?.state;
    const scope = String(rowValue(row, 'search_scope'));
    if (state === 'pending' && scope !== 'metro_city') {
      problems.push(`pending child ${id} is not a metro_city scope`);
    }
    if (state === 'applied' && scope !== 'locality') {
      problems.push(`applied child ${id} is not a locality scope`);
    }
    if (!state && scope !== 'locality') {
      problems.push(`existing child ${id} is not a locality scope`);
    }
  }

  const countsRows = await queryRows(
    connection,
    `SELECT
       (SELECT COUNT(*) FROM \`place_relationship\` WHERE relationship_type='settlement_within') AS settlement_within,
       (SELECT COUNT(*) FROM \`place_relationship\` WHERE relationship_type='settlement_within' AND search_scope_authorized=1) AS search_scope_authorized,
       (SELECT COUNT(*) FROM \`place_relationship\` WHERE relationship_type='administratively_contains') AS administratively_contains,
       (SELECT COUNT(*) FROM \`properties\` WHERE canonical_place_id IN (${placeholders(scopeIds.length)})) AS properties_assigned_to_63,
       (SELECT COUNT(*) FROM \`listings\` WHERE canonical_place_id IN (${placeholders(scopeIds.length)})) AS listings_assigned_to_63`,
    [...scopeIds, ...scopeIds],
  );
  const counts = {
    administratively_contains: Number(rowValue(countsRows[0] ?? {}, 'administratively_contains')),
    settlement_within: Number(rowValue(countsRows[0] ?? {}, 'settlement_within')),
    search_scope_authorized: Number(rowValue(countsRows[0] ?? {}, 'search_scope_authorized')),
    properties_assigned_to_63: Number(rowValue(countsRows[0] ?? {}, 'properties_assigned_to_63')),
    listings_assigned_to_63: Number(rowValue(countsRows[0] ?? {}, 'listings_assigned_to_63')),
  };
  if (
    counts.administratively_contains !==
    PLACE_SCOPE_CORRECTION_EXPECTED.targetInvariants.administratively_contains
  ) {
    problems.push(
      `administratively_contains ${counts.administratively_contains} != ${PLACE_SCOPE_CORRECTION_EXPECTED.targetInvariants.administratively_contains}`,
    );
  }
  if (counts.search_scope_authorized !== 0) problems.push('settlement edges are search-authorized');
  if (counts.properties_assigned_to_63 !== 0) {
    problems.push(`${counts.properties_assigned_to_63} properties are assigned to the 63 scopes`);
  }
  if (counts.listings_assigned_to_63 !== 0) {
    problems.push(`${counts.listings_assigned_to_63} listings are assigned to the 63 scopes`);
  }
  const pendingEdges = edgeStates.filter(edge => edge.state === 'pending').length;
  const observedEdges = edgeStates.length - pendingEdges;
  if (counts.settlement_within !== observedEdges) {
    problems.push(
      `settlement_within ${counts.settlement_within} does not match ${observedEdges} reviewed edges`,
    );
  }

  if (problems.length) {
    throw new Error(
      `place-scope-correction refused: ${problems.length} target problem(s):\n  ${problems
        .slice(0, 20)
        .join('\n  ')}`,
    );
  }

  const state = {
    pendingCorrections: correctionStates.filter(c => c.state === 'pending').length,
    appliedCorrections: correctionStates.filter(c => c.state === 'applied').length,
    pendingEdges,
    observedEdges,
  };
  const planDigest = canonicalDigest({
    version: PLACE_SCOPE_CORRECTION_VERSION,
    packageDigest: PLACE_SCOPE_CORRECTION_PACKAGE_DIGEST,
    targetFingerprintHash: authority.context.targetFingerprintHash,
    head: head.document.expectedHead,
    correctionStates,
    edgeStates,
    counts,
    state,
  });
  return {
    corrections: correctionStates,
    relationships: edgeStates,
    state,
    counts,
    head: head.document.expectedHead,
    planDigest,
  };
}

function evidenceBase(input: {
  authority: ResolvedDatabaseAuthority;
  pkg: PlaceScopeCorrectionPackage;
  inspection: Inspection;
  transactionOutcome: 'not-applied' | 'committed';
}) {
  return {
    adapter: 'canonical-places-scope-correction',
    version: PLACE_SCOPE_CORRECTION_VERSION,
    digest: PLACE_SCOPE_CORRECTION_DIGEST,
    packageDigest: input.pkg.verifiedDigest,
    targetFingerprintHash: input.authority.context.targetFingerprintHash,
    databaseName: input.authority.context.databaseName,
    targetClass: input.authority.context.targetClass,
    head: input.inspection.head,
    expected: PLACE_SCOPE_CORRECTION_EXPECTED,
    state: input.inspection.state,
    counts: input.inspection.counts,
    planDigest: input.inspection.planDigest,
    transactionOutcome: input.transactionOutcome,
    /* With gauteng-place-admission-v0.2 committed, the canonical package itself
     * reproduces this correction from a digest-pinned reviewed artifact, so the
     * correction package is an applied-and-retired delta, not a pending one. */
    canonicalAdmissionCompatible: true,
    canonicalPackageRebuildRequired: false,
    searchAuthorizationChanged: false,
    publicationChanged: false,
    schemaMutation: false,
    providerWrites: false,
    propertyWrites: false,
  };
}

export async function previewPlaceScopeCorrection(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  root?: string;
}) {
  assertAuthorizedDatabaseOperation(input.authority, input.decision, [
    'reference-seed',
    'verification',
  ]);
  requireReferenceAdapterTarget(input.authority);
  const pkg = loadPlaceScopeCorrectionPackage(input.root ?? process.cwd());
  const inspection = await inspect({ ...input, pkg });
  return evidenceBase({
    authority: input.authority,
    pkg,
    inspection,
    transactionOutcome: 'not-applied',
  });
}

export async function verifyPlaceScopeCorrection(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  root?: string;
}) {
  assertAuthorizedDatabaseOperation(input.authority, input.decision, ['verification']);
  requireReferenceAdapterTarget(input.authority);
  const pkg = loadPlaceScopeCorrectionPackage(input.root ?? process.cwd());
  const inspection = await inspect({ ...input, pkg });
  if (inspection.state.pendingCorrections || inspection.state.pendingEdges) {
    throw new Error(
      `place-scope-correction verification refused: ${inspection.state.pendingCorrections} correction(s) and ${inspection.state.pendingEdges} edge(s) remain pending`,
    );
  }
  return evidenceBase({
    authority: input.authority,
    pkg,
    inspection,
    transactionOutcome: 'not-applied',
  });
}

export async function applyPlaceScopeCorrection(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  root?: string;
  expectedPlanDigest: string;
}) {
  assertAuthorizedDatabaseOperation(input.authority, input.decision, ['reference-seed']);
  requireReferenceAdapterTarget(input.authority);
  if (!/^[a-f0-9]{64}$/.test(input.expectedPlanDigest)) {
    throw new Error('place-scope-correction refused: reviewed exact plan digest required');
  }
  const pkg = loadPlaceScopeCorrectionPackage(input.root ?? process.cwd());
  const lock = await queryRows(input.connection, 'SELECT GET_LOCK(?, 30) AS acquired', [LOCK_NAME]);
  if (Number(lock[0]?.acquired) !== 1) {
    throw new Error('place-scope-correction refused: correction lock unavailable');
  }
  let operationError: unknown;
  let cleanupError: unknown;
  let result:
    | { inspection: Inspection; writtenCorrections: number; writtenEdges: number }
    | undefined;
  try {
    result = await withTransaction(input.connection, async () => {
      const before = await inspect({ ...input, pkg });
      if (before.planDigest !== input.expectedPlanDigest) {
        throw new Error(
          'place-scope-correction refused: target/source plan changed; review a fresh preview',
        );
      }
      const correctionById = new Map(pkg.corrections.map(c => [c.place_id, c]));
      for (const state of before.corrections) {
        if (state.state !== 'pending') continue;
        const correction = correctionById.get(state.place_id)!;
        const expected = correction.expected_identity;
        const [resultHeader] = (await input.connection.execute(
          `UPDATE \`place\`
              SET place_type = ?, search_scope = ?
            WHERE place_id = ?
              AND place_type = ?
              AND place_classification = ?
              AND verification_status = ?
              AND lifecycle_status = ?
              AND publication_eligible = ?
              AND search_eligible = ?
              AND search_scope = ?
              AND (licensing_classification <=> ?)`,
          [
            correction.target_identity.place_type,
            correction.target_identity.search_scope,
            correction.place_id,
            expected.place_type,
            expected.place_classification,
            expected.verification_status,
            expected.lifecycle_status,
            expected.publication_eligible,
            expected.search_eligible,
            expected.search_scope,
            expected.licensing_classification,
          ],
        )) as unknown as Array<{ affectedRows?: number }>;
        if (Number(resultHeader?.affectedRows) !== 1) {
          throw new Error(
            `place-scope-correction refused: correction precondition changed for ${correction.place_id}`,
          );
        }
      }
      const relationshipByKey = new Map(pkg.relationships.map(edge => [edgeKey(edge), edge]));
      for (const state of before.relationships) {
        if (state.state !== 'pending') continue;
        const edge = relationshipByKey.get(state.key)!;
        await input.connection.execute(
          `INSERT INTO \`place_relationship\`
             (from_place_id, to_place_id, relationship_type, search_scope_authorized, evidence_source, valid_from, valid_to)
           VALUES (?,?,?,?,?,NULL,NULL)
           ON DUPLICATE KEY UPDATE from_place_id = from_place_id`,
          [
            edge.child_place_id,
            edge.parent_place_id,
            edge.relationship_type,
            edge.search_scope_authorized,
            edge.evidence_source,
          ],
        );
      }
      const after = await inspect({ ...input, pkg });
      if (after.state.pendingCorrections || after.state.pendingEdges) {
        throw new Error(
          `place-scope-correction refused: post-write state is incomplete (${after.state.pendingCorrections} corrections, ${after.state.pendingEdges} edges pending)`,
        );
      }
      if (after.counts.settlement_within !== 351) {
        throw new Error(
          `place-scope-correction refused: post-write settlement count ${after.counts.settlement_within} != 351`,
        );
      }
      return {
        inspection: after,
        writtenCorrections: before.state.pendingCorrections,
        writtenEdges: before.state.pendingEdges,
      };
    });
  } catch (error) {
    operationError = error;
  }
  try {
    const released = await queryRows(input.connection, 'SELECT RELEASE_LOCK(?) AS released', [
      LOCK_NAME,
    ]);
    if (Number(released[0]?.released) !== 1) {
      throw new Error('place-scope-correction lock cleanup unsuccessful');
    }
  } catch (error) {
    cleanupError = error;
  }
  if (operationError || cleanupError) {
    const primary = operationError ?? cleanupError;
    const detail =
      operationError && cleanupError
        ? `; lock cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
        : '';
    throw new Error(`${primary instanceof Error ? primary.message : String(primary)}${detail}`, {
      cause: primary,
    });
  }
  if (!result) throw new Error('place-scope-correction refused: no transaction result');
  return {
    ...evidenceBase({
      authority: input.authority,
      pkg,
      inspection: result.inspection,
      transactionOutcome: 'committed',
    }),
    writtenCorrections: result.writtenCorrections,
    writtenEdges: result.writtenEdges,
  };
}
