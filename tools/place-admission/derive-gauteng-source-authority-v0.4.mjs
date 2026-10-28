#!/usr/bin/env node
/* global console, process */
/**
 * Derive the reviewed Fordsburg identity hold as a new Gauteng source-authority
 * version. The decision input pins the v0.3 authority and the v0.2 admission
 * evidence it reviewed. This derivation carries the earlier source facts and
 * Johannesburg settlement-membership review forward, moves the ambiguous
 * locality out of the factual geography/name/source-link artifacts, and keeps
 * its source links inside a digest-pinned hold-evidence artifact.
 *
 * `--check` regenerates the expected artifacts in memory and compares every
 * output byte. A normal invocation is a one-time derivation and refuses to
 * overwrite an existing v0.4 authority directory.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes('--check');
const PRIOR_DIR = 'data/gauteng-source-authority-v0.3';
const OUTPUT_DIR = 'data/gauteng-source-authority-v0.4';
const DECISION_PATH = `${OUTPUT_DIR}/gauteng_fordsburg_identity_hold_decision_v0.1.json`;
const PRIOR_ADMISSION_DIR = 'data/gauteng-place-admission-v0.2';
const IDENTITY_ID = 'pl-geo-v01-za-gp-cdaee93a6835fd8f1544';
const OLD_PLACE_ID = 'pl-place-01-99dcb8ba9d808741e35b258e';
const SUPPORTED_IDENTITY_ID = 'pl-geo-v01-za-gp-936e54828376d972dcf8';
const SUPPORTED_PLACE_ID = 'pl-place-01-435b493de124264b676f708f';

const sha256Bytes = value => createHash('sha256').update(value).digest('hex');
const readBytes = path => readFileSync(resolve(ROOT, path));
const sha256Path = path => sha256Bytes(readBytes(path));
const readJson = path => JSON.parse(readBytes(path).toString('utf8'));
const readJsonl = path => {
  const raw = readBytes(path).toString('utf8');
  return raw
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line));
};
const jsonl = rows => rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
const fail = message => {
  throw new Error(`derive-gauteng-source-authority-v0.4 refused: ${message}`);
};
const exactlyOne = (rows, predicate, label) => {
  const found = rows.filter(predicate);
  if (found.length !== 1) fail(`${label}: expected one row, found ${found.length}`);
  return found[0];
};

const inputFiles = {
  geography: `${PRIOR_DIR}/gauteng_factual_canonical_geography_v0.2.jsonl`,
  names: `${PRIOR_DIR}/gauteng_factual_canonical_names_v0.2.jsonl`,
  source_links: `${PRIOR_DIR}/gauteng_factual_canonical_source_links_v0.2.jsonl`,
  candidate_dispositions: `${PRIOR_DIR}/gauteng_candidate_dispositions_v0.2.jsonl`,
  reviewed_type_corrections:
    `${PRIOR_DIR}/gauteng_factual_canonical_reviewed_type_corrections_v0.3.jsonl`,
  reviewed_settlement_membership:
    `${PRIOR_DIR}/gauteng_factual_canonical_reviewed_settlement_membership_v0.3.jsonl`,
};

const decision = readJson(DECISION_PATH);
if (sha256Path(decision.prior_source_authority.manifest_path) !== decision.prior_source_authority.manifest_sha256) {
  fail('the reviewed prior source manifest digest has drifted');
}
if (sha256Path(decision.prior_admission_package.manifest_path) !== decision.prior_admission_package.manifest_sha256) {
  fail('the reviewed prior admission manifest digest has drifted');
}
if (
  sha256Path(decision.prior_admission_package.place_id_registry_path) !==
  decision.prior_admission_package.place_id_registry_sha256
) {
  fail('the reviewed prior Place-ID registry digest has drifted');
}

const priorManifest = readJson(decision.prior_source_authority.manifest_path);
if (priorManifest.authority_version !== decision.prior_source_authority.authority_version) {
  fail('the reviewed source-authority version does not match its manifest');
}
if (priorManifest.source_snapshot_id !== decision.prior_source_authority.source_snapshot_id) {
  fail('the reviewed raw source snapshot does not match its manifest');
}
for (const artifact of priorManifest.compact_artifacts ?? []) {
  if (sha256Path(artifact.path) !== artifact.sha256) {
    fail(`prior compact artifact digest drift: ${artifact.path}`);
  }
}

const oldPlaceRegistry = readJson(decision.prior_admission_package.place_id_registry_path);
if (oldPlaceRegistry.allocated?.[IDENTITY_ID] !== OLD_PLACE_ID) {
  fail('the prior Place-ID allocation does not reserve the reviewed candidate Place identity');
}

const geography = readJsonl(inputFiles.geography);
const names = readJsonl(inputFiles.names);
const sourceLinks = readJsonl(inputFiles.source_links);
const candidates = readJsonl(inputFiles.candidate_dispositions);
const typeCorrections = readJsonl(inputFiles.reviewed_type_corrections);
const settlementMembership = readJsonl(inputFiles.reviewed_settlement_membership);

const heldGeography = exactlyOne(
  geography,
  row => row.canonical_location_id === IDENTITY_ID,
  'outlying Fordsburg factual identity',
);
const heldCandidate = exactlyOne(
  candidates,
  row => row.candidate_location_id === IDENTITY_ID,
  'outlying Fordsburg candidate disposition',
);
const heldNames = names.filter(row => row.canonical_location_id === IDENTITY_ID);
const heldSourceLinks = sourceLinks.filter(row => row.canonical_location_id === IDENTITY_ID);
if (heldNames.length !== 2) fail(`expected two source name assertions for the held identity, found ${heldNames.length}`);
if (heldSourceLinks.length !== 2) fail(`expected two provenance links for the held identity, found ${heldSourceLinks.length}`);
if (heldGeography.preferred_name !== decision.held_candidate.preferred_name) {
  fail('the reviewed candidate name does not match factual geography');
}
if (heldCandidate.preferred_name !== decision.held_candidate.preferred_name) {
  fail('the reviewed candidate name does not match the candidate disposition');
}
if (heldGeography.canonical_type !== decision.held_candidate.candidate_type) {
  fail('the reviewed candidate type does not match factual geography');
}
if (heldCandidate.promotion_class === 'candidate_only') {
  fail('the reviewed identity is already candidate-only in the prior source authority');
}

const supportedIdentity = exactlyOne(
  geography,
  row => row.canonical_location_id === SUPPORTED_IDENTITY_ID,
  'supported Fordsburg suburb identity',
);
if (supportedIdentity.preferred_name !== decision.retained_identity.preferred_name) {
  fail('the reviewed retained name does not match the supported factual identity');
}
const settlementEdge = exactlyOne(
  settlementMembership,
  row =>
    row.child_canonical_location_id === SUPPORTED_IDENTITY_ID &&
    row.parent_canonical_location_id === decision.retained_identity.settlement_membership.parent_canonical_location_id &&
    row.relationship_type === 'settlement_within',
  'reviewed Fordsburg suburb to Johannesburg settlement edge',
);
if (settlementEdge.evidence_source !== decision.retained_identity.settlement_membership.evidence_source) {
  fail('the reviewed retained membership evidence does not match the pinned decision');
}
if (typeCorrections.some(row => row.identity_anchor === IDENTITY_ID)) {
  fail('the held candidate unexpectedly has a reviewed type correction');
}

const priorPlacesPath = `${PRIOR_ADMISSION_DIR}/gauteng_place_admission_v0.2.jsonl`;
const priorNamesPath = `${PRIOR_ADMISSION_DIR}/gauteng_place_names_v0.2.jsonl`;
const priorRelationshipsPath = `${PRIOR_ADMISSION_DIR}/gauteng_place_relationships_v0.2.jsonl`;
const priorLedgerPath = `${PRIOR_ADMISSION_DIR}/gauteng_place_disposition_ledger_v0.2.jsonl`;
const priorPlace = exactlyOne(
  readJsonl(priorPlacesPath),
  row => row.place_id === OLD_PLACE_ID && row.source_identity_ids?.includes(IDENTITY_ID),
  'previously admitted outlying Fordsburg Place',
);
const priorPublicNames = readJsonl(priorNamesPath).filter(row => row.place_id === OLD_PLACE_ID);
const priorRelationships = readJsonl(priorRelationshipsPath).filter(row => row.from_place_id === OLD_PLACE_ID);
const priorLedger = exactlyOne(
  readJsonl(priorLedgerPath),
  row => row.source_identity_id === IDENTITY_ID,
  'previous Fordsburg candidate ledger disposition',
);
if (priorPlace.place_id !== decision.held_candidate.prior_place_id) {
  fail('the prior admission package Place ID does not match the reviewed decision');
}
if (priorLedger.place_id !== OLD_PLACE_ID || priorLedger.disposition !== 'admitted_as_place_primary') {
  fail('the prior admission ledger no longer records the expected admitted Fordsburg identity');
}

const priorSupportedPlaceRegistry = readJson(decision.prior_admission_package.place_id_registry_path);
if (priorSupportedPlaceRegistry.allocated?.[SUPPORTED_IDENTITY_ID] !== SUPPORTED_PLACE_ID) {
  fail('the supported suburb Place-ID allocation does not match the reviewed decision');
}
const priorSupportedRelationships = readJsonl(priorRelationshipsPath).filter(
  row => row.from_place_id === SUPPORTED_PLACE_ID && row.relationship_type === 'settlement_within',
);
const priorSupportedEdge = exactlyOne(
  priorSupportedRelationships,
  row => row.to_place_id === priorSupportedPlaceRegistry.allocated[settlementEdge.parent_canonical_location_id],
  'previously admitted reviewed Fordsburg settlement edge',
);

const priorAuthorityCompact = new Map(
  priorManifest.compact_artifacts.map(row => [row.kind, row]),
);
const outputByKind = new Map();
for (const artifact of priorManifest.compact_artifacts) {
  const relative = artifact.path.split('/').pop();
  if (!relative) fail(`prior artifact has no filename: ${artifact.path}`);
  const content = readBytes(artifact.path);
  outputByKind.set(artifact.kind, {
    path: `${OUTPUT_DIR}/${relative}`,
    content,
    carriedForward: !['geography', 'names', 'source_links', 'candidate_dispositions'].includes(artifact.kind),
    sourceArtifact: artifact,
  });
}
for (const requiredKind of Object.keys(inputFiles)) {
  if (!priorAuthorityCompact.has(requiredKind)) fail(`prior manifest does not pin required artifact kind ${requiredKind}`);
}

const candidateOnlyDisposition = {
  ...heldCandidate,
  promotion_class: 'candidate_only',
  factual_identity_status: 'candidate',
  human_review_required: true,
  priority_probe_review: true,
  required_probe_names: ['Fordsburg'],
  review_set_reason:
    `${decision.review_id}: independent identity support is insufficient to promote the outlying locality`,
  promotion_reasons: [
    `held candidate-only by reviewed identity disposition ${decision.review_id}; independent identity support is required before factual canonical promotion`,
  ],
  identity_hold_review_id: decision.review_id,
  identity_hold_evidence_artifact:
    `${OUTPUT_DIR}/gauteng_factual_canonical_reviewed_identity_hold_v0.4.jsonl`,
};

const removedIdentityId = decision.held_candidate.canonical_location_id;
const filtered = {
  geography: geography.filter(row => row.canonical_location_id !== removedIdentityId),
  names: names.filter(row => row.canonical_location_id !== removedIdentityId),
  source_links: sourceLinks.filter(row => row.canonical_location_id !== removedIdentityId),
  candidate_dispositions: candidates.map(row =>
    row.candidate_location_id === removedIdentityId ? candidateOnlyDisposition : row,
  ),
};
for (const kind of Object.keys(filtered)) {
  const prior = outputByKind.get(kind);
  if (!prior) fail(`missing prior output artifact for ${kind}`);
  prior.content = Buffer.from(jsonl(filtered[kind]), 'utf8');
  prior.carriedForward = false;
}

const holdEvidence = {
  review_id: decision.review_id,
  reviewed_at: decision.reviewed_at,
  disposition: decision.decision,
  decision_scope: decision.decision_scope,
  source_authority: {
    authority_version: priorManifest.authority_version,
    manifest_path: decision.prior_source_authority.manifest_path,
    manifest_sha256: decision.prior_source_authority.manifest_sha256,
    source_snapshot_id: priorManifest.source_snapshot_id,
  },
  candidate: {
    canonical_location_id: removedIdentityId,
    prior_place_id: OLD_PLACE_ID,
    prior_factual_identity: heldGeography,
    prior_candidate_disposition: heldCandidate,
    prior_name_assertions: heldNames,
    preserved_source_links: heldSourceLinks,
    prior_admission: {
      admission_version: decision.prior_admission_package.admission_version,
      manifest_path: decision.prior_admission_package.manifest_path,
      manifest_sha256: decision.prior_admission_package.manifest_sha256,
      place_id_registry_path: decision.prior_admission_package.place_id_registry_path,
      place_id_registry_sha256: decision.prior_admission_package.place_id_registry_sha256,
      place_row: priorPlace,
      name_rows: priorPublicNames,
      relationship_rows: priorRelationships,
      disposition_ledger_row: priorLedger,
    },
  },
  retained_supported_identity: {
    canonical_location_id: SUPPORTED_IDENTITY_ID,
    place_id: SUPPORTED_PLACE_ID,
    factual_identity: supportedIdentity,
    reviewed_membership_row: settlementEdge,
    prior_admitted_relationship_row: priorSupportedEdge,
  },
  policy: decision.policy,
  rationale: decision.rationale,
  reconsider_when: decision.reconsider_when,
};
const holdPath = `${OUTPUT_DIR}/gauteng_factual_canonical_reviewed_identity_hold_v0.4.jsonl`;
outputByKind.set('reviewed_identity_hold', {
  path: holdPath,
  content: Buffer.from(jsonl([holdEvidence]), 'utf8'),
  carriedForward: false,
  sourceArtifact: null,
});

const decisionBytes = readBytes(DECISION_PATH);
outputByKind.set('review_decision', {
  path: DECISION_PATH,
  content: decisionBytes,
  carriedForward: true,
  sourceArtifact: null,
});

const compactArtifacts = [...outputByKind.entries()].map(([kind, artifact]) => {
  const item = {
    kind,
    path: artifact.path,
    sha256: sha256Bytes(artifact.content),
    size_bytes: artifact.content.length,
  };
  if (artifact.carriedForward) item.carried_forward = true;
  else item.carried_forward = false;
  if (artifact.sourceArtifact) {
    item.derived_from = {
      path: artifact.sourceArtifact.path,
      sha256: artifact.sourceArtifact.sha256,
    };
  }
  return item;
});
compactArtifacts.sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));

const sourceManifestPath = `${OUTPUT_DIR}/gauteng_source_manifest_v0.4.json`;
const sourceManifest = {
  ...priorManifest,
  authority_version: 'gauteng-source-authority-v0.4',
  manifest_version: '0.4',
  generated_at: decision.reviewed_at,
  scope:
    `${priorManifest.scope}; records a reviewed candidate-only hold for the outlying Fordsburg locality while retaining its source evidence and the supported Fordsburg suburb membership edge`,
  supersedes: {
    authority_version: priorManifest.authority_version,
    status: 'superseded_by_reviewed_identity_hold',
    exact_source_status: 'raw_source_snapshot_unchanged_adjudication_updated',
    prior_manifest: {
      path: decision.prior_source_authority.manifest_path,
      sha256: decision.prior_source_authority.manifest_sha256,
    },
  },
  provenance_review_history: [
    ...(priorManifest.provenance_review_history ?? []),
    ...(priorManifest.provenance_review ? [priorManifest.provenance_review] : []),
  ],
  provenance_review: {
    review_id: decision.review_id,
    package: DECISION_PATH,
    decision: decision.decision,
    purpose: decision.decision_scope,
    counts: {
      candidate_identities_held: 1,
      preserved_source_links: heldSourceLinks.length,
      preserved_source_name_assertions_in_hold_evidence: heldNames.length,
      retained_supported_identities: 1,
      retained_reviewed_settlement_membership_edges: 1,
    },
    policy: decision.policy,
    reconsider_when: decision.reconsider_when,
    evidence_artifact: holdPath,
    previous_place_id_reserved: OLD_PLACE_ID,
  },
  compact_artifacts: compactArtifacts,
};

const sourceBuildSummary = {
  authority_version: sourceManifest.authority_version,
  source_snapshot_id: sourceManifest.source_snapshot_id,
  derived_from: {
    authority_version: priorManifest.authority_version,
    manifest_path: decision.prior_source_authority.manifest_path,
    manifest_sha256: decision.prior_source_authority.manifest_sha256,
  },
  review_decision: {
    path: DECISION_PATH,
    sha256: sha256Bytes(decisionBytes),
  },
  counts: {
    factual_geography_identities_before: geography.length,
    factual_geography_identities_after: filtered.geography.length,
    source_names_before: names.length,
    source_names_after: filtered.names.length,
    source_links_before: sourceLinks.length,
    source_links_after: filtered.source_links.length,
    candidate_dispositions: filtered.candidate_dispositions.length,
    held_candidate_source_links: heldSourceLinks.length,
  },
  compact_artifacts: compactArtifacts,
};

const generated = new Map();
for (const artifact of outputByKind.values()) generated.set(artifact.path, artifact.content);
generated.set(sourceManifestPath, Buffer.from(JSON.stringify(sourceManifest, null, 2) + '\n', 'utf8'));
generated.set(
  `${OUTPUT_DIR}/gauteng_source_build_summary_v0.4.json`,
  Buffer.from(JSON.stringify(sourceBuildSummary, null, 2) + '\n', 'utf8'),
);

const manifestBytes = generated.get(sourceManifestPath);
const checkedManifest = JSON.parse(manifestBytes.toString('utf8'));
for (const artifact of checkedManifest.compact_artifacts) {
  const bytes = generated.get(artifact.path) ?? readBytes(artifact.path);
  const actual = sha256Bytes(bytes);
  if (actual !== artifact.sha256 || bytes.length !== artifact.size_bytes) {
    fail(`generated compact artifact pin mismatch for ${artifact.path}`);
  }
}

if (CHECK_ONLY) {
  const mismatches = [];
  for (const [path, expected] of generated) {
    let actual;
    try {
      actual = readBytes(path);
    } catch (error) {
      mismatches.push(`${path}: missing (${error.code ?? error.message})`);
      continue;
    }
    if (!actual.equals(expected)) mismatches.push(`${path}: bytes differ`);
  }
  if (mismatches.length) fail(`generated authority differs from committed output:\n  ${mismatches.join('\n  ')}`);
  console.log(
    `derive-gauteng-source-authority-v0.4:check OK identities=${filtered.geography.length} ` +
      `held_source_links=${heldSourceLinks.length} artifacts=${compactArtifacts.length}`,
  );
  process.exit(0);
}

const outputDirectory = resolve(ROOT, OUTPUT_DIR);
for (const path of generated.keys()) {
  if (path === DECISION_PATH) continue;
  if (existsSync(resolve(ROOT, path))) fail(`output already exists: ${path}; refusing to overwrite`);
}
mkdirSync(outputDirectory, { recursive: true });
for (const [path, bytes] of generated) {
  if (path === DECISION_PATH) continue;
  mkdirSync(dirname(resolve(ROOT, path)), { recursive: true });
  writeFileSync(resolve(ROOT, path), bytes);
}

console.log(
  `derived gauteng-source-authority-v0.4: identities=${filtered.geography.length} ` +
    `held_source_links=${heldSourceLinks.length} artifacts=${compactArtifacts.length}`,
);
