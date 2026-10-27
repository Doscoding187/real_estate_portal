#!/usr/bin/env node
/* global console, process */
/**
 * Derive the reviewed-corrections source authority for the Johannesburg city
 * scope correction (Place Authority v0.3 over v0.2).
 *
 * This is a one-time, deterministic derivation from two committed authorities:
 *
 *   1. `data/gauteng-source-authority-v0.2` — the digest-pinned factual source
 *      authority for Gauteng. Its four compact artifacts are carried forward
 *      BYTE-IDENTICALLY; nothing factual is re-derived or rewritten here.
 *   2. `data/gauteng-city-scope-correction-v0.1` — the committed reviewed
 *      correction package (48 reviewed type corrections, 351 reviewed
 *      `settlement_within` relationships, 13 retained and 2 held Places).
 *
 * The output is a NEW authority version directory that adds two reviewed
 * provenance artifacts to the fact set. Applying them is the admission builder's
 * job (see `build-place-admission.mjs`); re-running the builder is what turns
 * these into a regenerated canonical Place package. This tool never touches the
 * correction package, the v0.2 directory, or the Place-ID registry.
 *
 * Every row the adapter carries is reproduced from the correction package's own
 * fields, with Place references resolved to their *source identity* anchors so
 * the artifacts stay identity-level, like the rest of the compact authority. A
 * reviewed assertion is attached to an identity only if the committed package
 * and the Place-ID registry agree on exactly one identity anchor for the Place;
 * any disagreement stops the derivation instead of being resolved silently.
 */

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = process.cwd();

const V2_DIR = 'data/gauteng-source-authority-v0.2';
const V3_DIR = 'data/gauteng-source-authority-v0.3';
const PACKAGE_V2 = 'data/place-admission-territories.v0.1/territory-registry.v0.1.json';

const CORRECTION_DIR = 'data/gauteng-city-scope-correction-v0.1';
const CORRECTION_MANIFEST = join(CORRECTION_DIR, 'manifest.json');
const CORRECTION_TYPES = join(CORRECTION_DIR, 'place_corrections.jsonl');
const CORRECTION_EDGES = join(CORRECTION_DIR, 'settlement_within_relationships.jsonl');

const OLD_PACKAGE = 'data/gauteng-place-admission-v0.1';
const OLD_PLACES = join(OLD_PACKAGE, 'gauteng_place_admission_v0.1.jsonl');
const OLD_REGISTRY = join(OLD_PACKAGE, 'gauteng_place_id_registry.v0.1.json');

const sha256Of = path =>
  createHash('sha256').update(readFileSync(resolve(ROOT, path))).digest('hex');

const readJson = path => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
const readJsonl = path =>
  readFileSync(resolve(ROOT, path), 'utf8')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line));

const fatal = message => {
  console.error(`derive-source-authority-v0.3 refused: ${message}`);
  process.exit(1);
};

/* ------------------------------------------------------------------ *
 * 0. Load and verify the committed inputs.
 * ------------------------------------------------------------------ */

if (existsSync(resolve(ROOT, V3_DIR))) {
  fatal(`${V3_DIR} already exists. This derivation is one-time; delete the stale output first.`);
}

const correctionManifest = readJson(CORRECTION_MANIFEST);
const correctionManifestSha = sha256Of(CORRECTION_MANIFEST);

/** Same canonical digest the correction adapter pins: sorted-key JSON, sha256. */
const canonicalize = value => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
};
const canonicalDigest = value =>
  createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
const packageDigestContent = manifest => ({
  correction_version: manifest.correction_version,
  counts: manifest.counts,
  held_place_ids: manifest.held_place_ids,
  parent_place_ids: manifest.parent_place_ids,
  retained_place_ids: manifest.retained_place_ids,
  policy: manifest.policy,
  source_artifacts: manifest.source_artifacts,
  target_invariants: manifest.target_invariants,
  outputs: manifest.outputs,
});
if (canonicalDigest(packageDigestContent(correctionManifest)) !== correctionManifest.package_digest) {
  fatal(
    `scope correction manifest content digest does not match the reviewed package digest ` +
      `${correctionManifest.package_digest} recorded inside it (outside-of-repo hash: ${correctionManifestSha})`,
  );
}

for (const entry of Object.values(correctionManifest.outputs ?? {})) {
  const artifactPath = entry.path.includes('/') ? entry.path : join(CORRECTION_DIR, entry.path);
  const actual = sha256Of(artifactPath);
  if (actual !== entry.sha256) {
    fatal(`scope correction artifact ${artifactPath} digest drift: ${actual} != ${entry.sha256}`);
  }
}

const provinceRegistry = readJson(PACKAGE_V2);
const territory = (provinceRegistry.territories ?? []).find(t => t.territory_id === 'za-gp');
if (!territory) fatal('the admission territory registry has no za-gp territory');
const oldManifestPath = territory.source_authority.manifest.path;
const oldManifestSha = sha256Of(oldManifestPath);
if (oldManifestSha !== territory.source_authority.manifest.sha256) {
  fatal(`source authority v0.2 manifest digest drift: ${oldManifestSha}`);
}

const sourceManifest = readJson(territory.source_authority.manifest.path);
if (sourceManifest.authority_version !== territory.source_authority.authority_version) {
  fatal('source authority version does not match the registry');
}

const places = readJsonl(OLD_PLACES);
const placeByPlaceId = new Map(places.map(place => [place.place_id, place]));
const idRegistry = readJson(OLD_REGISTRY);
const registryAllocation = idRegistry.allocated ?? {};

/**
 * Resolve one committed Place to a deterministic source identity anchor.
 *
 * The reviewed assertions in the correction package are made about Places; the
 * artifacts they become here are identity-level. The anchor is the Place's
 * primary source identity, and the Place-ID registry must map that identity
 * back to the same Place, so the anchor is independently verifiable. A merged
 * Place is still resolved the same way — its builder-side mapping sends any
 * member identity to the Place, and the primary identity keeps the anchor
 * deterministic instead of chosen by input order.
 */
const identityOfPlace = placeId => {
  const place = placeByPlaceId.get(placeId);
  if (!place) fatal(`Place ${placeId} is not in the committed admission package`);
  if (!place.source_identity_ids.includes(place.primary_source_identity_id)) {
    fatal(`Place ${placeId} primary identity is not among its source identities`);
  }
  const identity = place.primary_source_identity_id;
  if (registryAllocation[identity] !== placeId) {
    fatal(
      `Place-ID registry maps ${identity} to ${registryAllocation[identity] ? 'another Place' : 'nothing'}, ` +
        `not ${placeId}`,
    );
  }
  return identity;
};

/* Resolve every referenced Place anchors first, so a failure stops the run. */
const correctionRows = readJsonl(CORRECTION_TYPES);
const correctionTypeRows = correctionRows.map(row => ({
  identity_anchor: identityOfPlace(row.place_id),
  corrected_type: row.target_identity.place_type,
  reviewed_search_scope: row.target_identity.search_scope,
  type_basis: row.type_basis,
  type_evidence: row.type_evidence,
  reason: row.reason,
  confidence: row.confidence,
  edge_present: row.edge_present,
}));

const edgeRows = readJsonl(CORRECTION_EDGES);
const settlementRows = edgeRows.map(row => ({
  child_canonical_location_id: identityOfPlace(row.child_place_id),
  parent_canonical_location_id: identityOfPlace(row.parent_place_id),
  child_name: row.child_name,
  parent_name: row.parent_name,
  relationship_type: row.relationship_type,
  evidence_source: row.evidence_source,
  membership_confidence: row.membership_confidence,
  child_disposition: row.child_disposition,
  source: row.source,
  notes: row.notes,
}));

/* ------------------------------------------------------------------ *
 * 1. Carry the four v0.2 compact artifacts forward byte-identically.
 * ------------------------------------------------------------------ */

mkdirSync(resolve(ROOT, V3_DIR), { recursive: true });
const carriedForward = [];
for (const artifact of sourceManifest.compact_artifacts) {
  const targetFile = artifact.path.split('/').pop();
  if (!targetFile) fatal(`source artifact ${artifact.path} has no filename`);
  copyFileSync(resolve(ROOT, artifact.path), resolve(ROOT, V3_DIR, targetFile));
  const copiedSha = sha256Of(join(V3_DIR, targetFile));
  if (copiedSha !== artifact.sha256) {
    fatal(`carried artifact ${targetFile} drifted during copy: ${copiedSha} != ${artifact.sha256}`);
  }
  carriedForward.push(targetFile);
}

/* ------------------------------------------------------------------ *
 * 2. Write the two reviewed artifacts.
 * ------------------------------------------------------------------ */

const correctionsArtifact = join(
  V3_DIR,
  'gauteng_factual_canonical_reviewed_type_corrections_v0.3.jsonl',
);
const settlementArtifact = join(
  V3_DIR,
  'gauteng_factual_canonical_reviewed_settlement_membership_v0.3.jsonl',
);

const writeJsonl = (path, rows) => {
  const body = rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
  writeFileSync(resolve(ROOT, path), body, 'utf8');
  return createHash('sha256').update(body).digest('hex');
};

const correctionsSha = writeJsonl(correctionsArtifact, correctionTypeRows);
const settlementSha = writeJsonl(settlementArtifact, settlementRows);

/* ------------------------------------------------------------------ *
 * 3. Manifest and build summary.
 * ------------------------------------------------------------------ */

const buildSummary = {
  authority_version: 'gauteng-source-authority-v0.3',
  source_snapshot_id: sourceManifest.source_snapshot_id,
  source_manifest: {
    path: `${V3_DIR}/gauteng_source_manifest_v0.3.json`,
    note: 'digest recorded when the manifest is written',
  },
  compact_artifacts: [],
  derived_input_digests: {
    reviewed_corrections_source: {
      path: CORRECTION_MANIFEST,
      sha256: correctionManifestSha,
      note: 'committed reviewed scope-correction package (place_corrections + settlement_within_relationships)',
    },
    correction_package_types: {
      path: CORRECTION_TYPES,
      sha256: sha256Of(CORRECTION_TYPES),
      size_bytes: readFileSync(resolve(ROOT, CORRECTION_TYPES)).length,
    },
    correction_package_edges: {
      path: CORRECTION_EDGES,
      sha256: sha256Of(CORRECTION_EDGES),
      size_bytes: readFileSync(resolve(ROOT, CORRECTION_EDGES)).length,
    },
    prior_package: {
      path: OLD_PLACES,
      sha256: sha256Of(OLD_PLACES),
      note: 'committed gauteng-place-admission-v0.1 package used only to resolve Place -> identity anchors',
    },
  },
  style: 'reviewed corrections derived from the committed scope-correction package; factual artifacts carried byte-identically from v0.2',
};
mkdirSync(dirname(resolve(ROOT, buildSummary.source_manifest.path)), { recursive: true });
writeFileSync(
  resolve(ROOT, buildSummary.source_manifest.path),
  JSON.stringify(buildSummary, null, 2) + '\n',
);

const manifest = {
  ...sourceManifest,
  authority_version: 'gauteng-source-authority-v0.3',
  manifest_version: '0.3',
  generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  scope: `${sourceManifest.scope}; carries the reviewed Johannesburg city-scope correction as governed provenance artifacts`,
  supersedes: {
    authority_version: 'gauteng-source-authority-v0.2',
    status: 'superseded_by_reviewed_corrections',
    exact_source_status: 'exact_source_recoverable_carried_forward',
    prior_manifest: {
      path: territory.source_authority.manifest.path,
      sha256: territory.source_authority.manifest.sha256,
    },
  },
  provenance_review: {
    package: CORRECTION_DIR,
    package_digest: correctionManifest.package_digest,
    manifest_sha256: correctionManifestSha,
    purpose: correctionManifest.purpose,
    counts: correctionManifest.counts,
    policy: correctionManifest.policy,
    target_invariants: correctionManifest.target_invariants,
    retained_place_ids: correctionManifest.retained_place_ids,
    held_place_ids: correctionManifest.held_place_ids,
    parent_place_ids: correctionManifest.parent_place_ids,
    note: 'The reviewed correction package stays the audit record of the review that produced these artifacts, including the 13 retained and 2 held Places that change nothing here.',
  },
  compact_artifacts: [
    ...sourceManifest.compact_artifacts.map(artifact => ({
      ...artifact,
      path: artifact.path.replace(V2_DIR, V3_DIR),
      authorization_transfer_promises: undefined,
      carried_forward: true,
    })),
    {
      kind: 'reviewed_type_corrections',
      path: correctionsArtifact.replace(/^\.\//, ''),
      sha256: correctionsSha,
      size_bytes: readFileSync(resolve(ROOT, correctionsArtifact)).length,
    },
    {
      kind: 'reviewed_settlement_membership',
      path: settlementArtifact.replace(/^\.\//, ''),
      sha256: settlementSha,
      size_bytes: readFileSync(resolve(ROOT, settlementArtifact)).length,
    },
  ],
};

const manifestPath = `${V3_DIR}/gauteng_source_manifest_v0.3.json`;
writeFileSync(resolve(ROOT, manifestPath), JSON.stringify(manifest, null, 2) + '\n');

/* ------------------------------------------------------------------ *
 * 4. Close the loop: every pin the new manifest advertises must verify.
 * ------------------------------------------------------------------ */

const mismatches = [];
for (const artifact of manifest.compact_artifacts) {
  const actual = sha256Of(artifact.path);
  if (actual !== artifact.sha256) {
    mismatches.push(`${artifact.path}: expected ${artifact.sha256}, actual ${actual}`);
  }
}
if (mismatches.length) {
  fatal(`v0.3 manifest digest verification failed:\n  ${mismatches.join('\n  ')}`);
}

console.log(
  `derived gauteng-source-authority-v0.3: carried ${carriedForward.length} artifacts byte-identically, ` +
    `${correctionTypeRows.length} reviewed type corrections, ${settlementRows.length} settlement membership rows, ` +
    `${manifest.compact_artifacts.length} pinned artifacts`,
);
