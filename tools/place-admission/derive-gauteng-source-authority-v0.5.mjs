#!/usr/bin/env node
/* global console, process */

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
const PRIOR_DIR = 'data/gauteng-source-authority-v0.4';
const OUTPUT_DIR = 'data/gauteng-source-authority-v0.5';
const PRIOR_MANIFEST = `${PRIOR_DIR}/gauteng_source_manifest_v0.4.json`;
const OUTPUT_MANIFEST = `${OUTPUT_DIR}/gauteng_source_manifest_v0.5.json`;
const TERRITORY_REGISTRY_PATH = 'data/place-admission-territories.v0.2/territory-registry.v0.2.json';
const CANDIDATE_ID = 'pl-geo-v01-za-gp-bf3bda5e9b73324fb944';
const CENTURION_ID = 'pl-geo-v01-za-gp-480fa75f70ff01496501';
const CENTURION_NAME_ASSERTION_ID = 'cln-name-c2a9290da744d6504625';
const LYTTELTON_NAME_ASSERTION_ID = 'cln-name-b76101fee2de8cb4c1ef';
const DECISION_PATH = `${OUTPUT_DIR}/gauteng_founder_geography_decisions_2026-11-02.json`;
const GEO_PATH = `${OUTPUT_DIR}/gauteng_factual_canonical_geography_v0.2.jsonl`;
const NAMES_PATH = `${OUTPUT_DIR}/gauteng_factual_canonical_names_v0.2.jsonl`;
const LINKS_PATH = `${OUTPUT_DIR}/gauteng_factual_canonical_source_links_v0.2.jsonl`;
const CANDIDATES_PATH = `${OUTPUT_DIR}/gauteng_candidate_dispositions_v0.2.jsonl`;
const TYPE_CORRECTIONS_PATH = `${OUTPUT_DIR}/gauteng_factual_canonical_reviewed_type_corrections_v0.3.jsonl`;

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readBytes = path => readFileSync(resolve(ROOT, path));
const readJson = path => JSON.parse(readBytes(path).toString('utf8'));
const readJsonl = path =>
  readBytes(path)
    .toString('utf8')
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const jsonl = rows => `${rows.map(row => JSON.stringify(row)).join('\n')}\n`;
const fail = message => {
  throw new Error(`derive-gauteng-source-authority-v0.5 refused: ${message}`);
};
const exactlyOne = (rows, predicate, label) => {
  const found = rows.filter(predicate);
  if (found.length !== 1) fail(`${label}: expected one row, found ${found.length}`);
  return found[0];
};
const stableId = (prefix, value) => `${prefix}${hash(Buffer.from(value)).slice(0, 20)}`;
const isGoogleMapsUrlAlias = value => {
  try {
    const url = new URL(String(value));
    return /(^|\.)google\.[a-z.]+$/i.test(url.hostname) && /^\/maps(?:\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
};

const oldManifestBytes = readBytes(PRIOR_MANIFEST);
const oldManifest = JSON.parse(oldManifestBytes.toString('utf8'));
if (oldManifest.authority_version !== 'gauteng-source-authority-v0.4') {
  fail('the prior source authority is not v0.4');
}
for (const artifact of oldManifest.compact_artifacts ?? []) {
  if (hash(readBytes(artifact.path)) !== artifact.sha256) {
    fail(`prior source artifact digest drift: ${artifact.path}`);
  }
}

const geographyPath = `${PRIOR_DIR}/gauteng_factual_canonical_geography_v0.2.jsonl`;
const namesPath = `${PRIOR_DIR}/gauteng_factual_canonical_names_v0.2.jsonl`;
const linksPath = `${PRIOR_DIR}/gauteng_factual_canonical_source_links_v0.2.jsonl`;
const candidatesPath = `${PRIOR_DIR}/gauteng_candidate_dispositions_v0.2.jsonl`;
const typeCorrectionsPath = `${PRIOR_DIR}/gauteng_factual_canonical_reviewed_type_corrections_v0.3.jsonl`;
const settlementMembershipPath = `${PRIOR_DIR}/gauteng_factual_canonical_reviewed_settlement_membership_v0.3.jsonl`;
const identityHoldDecisionPath = `${PRIOR_DIR}/gauteng_fordsburg_identity_hold_decision_v0.1.json`;
const identityHoldEvidencePath = `${PRIOR_DIR}/gauteng_factual_canonical_reviewed_identity_hold_v0.4.jsonl`;

const geography = readJsonl(geographyPath);
const names = readJsonl(namesPath);
const sourceLinks = readJsonl(linksPath);
const candidates = readJsonl(candidatesPath);
const typeCorrections = readJsonl(typeCorrectionsPath);
const googleMapsUrlAliasAssertions = names.filter(row => isGoogleMapsUrlAlias(row.name));
if (googleMapsUrlAliasAssertions.length !== 17) {
  fail(`expected the 17 known Google Maps URL alias assertions to remove from the active Gauteng source package, found ${googleMapsUrlAliasAssertions.length}`);
}
const candidate = exactlyOne(
  candidates,
  row => row.candidate_location_id === CANDIDATE_ID,
  'exact Kyalami candidate',
);
if (candidate.preferred_name !== 'Kyalami' || candidate.candidate_type !== 'neighbourhood') {
  fail('the exact candidate identity or source type has changed');
}
if (candidate.source_support?.source_count !== 1 || candidate.source_support?.sources?.[0] !== 'geonames') {
  fail('the reviewed candidate no longer has its one GeoNames source');
}
const centurionName = exactlyOne(
  names,
  row => row.name_assertion_id === CENTURION_NAME_ASSERTION_ID,
  'existing Centurion name assertion',
);
const lytteltonName = exactlyOne(
  names,
  row => row.name_assertion_id === LYTTELTON_NAME_ASSERTION_ID,
  'existing Lyttelton name assertion',
);
if (
  centurionName.canonical_location_id !== CENTURION_ID ||
  centurionName.name !== 'Centurion' ||
  centurionName.name_roles?.includes('preferred_common') ||
  lytteltonName.canonical_location_id !== CENTURION_ID ||
  lytteltonName.name !== 'Lyttelton' ||
  !lytteltonName.name_roles?.includes('preferred_common')
) {
  fail('the standing Centurion/Lyttelton name assertions changed and require review');
}
if (
  geography.some(row => row.canonical_location_id === CANDIDATE_ID) ||
  sourceLinks.some(row => row.canonical_location_id === CANDIDATE_ID) ||
  names.some(row => row.canonical_location_id === CANDIDATE_ID)
) {
  fail('Kyalami is already present in the factual source artifacts');
}
if (geography.some(row => row.normalized_name === 'kyalami')) {
  fail('a Kyalami factual identity already exists and must be reviewed before admission');
}

const nameAssertionId = stableId('cln-name-', `${CANDIDATE_ID}|founder-approved-name|2026-11-02`);
const sourceLinkId = stableId('cln-source-', `${CANDIDATE_ID}|geonames:7302796|2026-11-02`);
const sourceType = candidate.source_support.source_native_types[0];
const sourceRecordId = sourceType.source_record_id;
const sourceArtifacts = [
  'geonames:ZA.zip',
  'geonames:admin1CodesASCII.txt',
  'geonames:admin2Codes.txt',
  'geonames:alternatenames:ZA.zip',
  'geonames:featureCodes_en.txt',
  'geonames:hierarchy.zip',
];
const reviewedExternalEvidence = [
  {
    authority: 'City of Johannesburg',
    title: 'Suburbs in Region A',
    url: 'https://joburg.org.za/about_/regions/Pages/Region%20A%20-%20Diepsloot,%20Midrand/suburbs.aspx',
    retrieved_at: '2026-11-02',
    finding: 'The City lists Kyalami among the suburbs in Region A.',
  },
  {
    authority: 'South African Government Gazette',
    title: 'Gazette 40081, Government Notice 730',
    published_at: '2016-06-17',
    url: 'https://www.gov.za/sites/default/files/gcis_document/201606/40081gon730.pdf',
    retrieved_at: '2026-11-02',
    finding: 'Khayalami is recorded as a spelling correction from Kyalami and as a township in the City of Joburg Municipality area, Gauteng.',
  },
];
const reviewedIdentityEvidence = {
  class: 'reviewed_official_corroboration',
  confidence: 'high',
  direct_cross_identifier: false,
  exact_contextual: true,
  fuzzy_proposals_withheld: 0,
  match_methods: { reviewed_official_name_type_context: reviewedExternalEvidence.length },
  match_statuses: { high_confidence: reviewedExternalEvidence.length },
  not_based_on_name_equality_alone: true,
  robust: true,
  very_strong: false,
};

const founderDecision = {
  decision_id: 'gauteng-founder-geography-decisions-2026-11-02',
  decision: 'admit_kyalami_and_relabel_centurion',
  founder_approval: 'Edward',
  reviewed_and_approved_by_founder_on: '2026-11-02',
  centurion_label_decision: {
    place_id: 'pl-place-01-1a30ae4d635ef747d6c987df',
    canonical_location_id: CENTURION_ID,
    current_preferred_label: 'Lyttelton',
    preferred_label: 'Centurion',
    retained_search_alias: 'Lyttelton',
    preferred_name_assertion_id: CENTURION_NAME_ASSERTION_ID,
    alias_name_assertion_id: LYTTELTON_NAME_ASSERTION_ID,
    permanent_redirect: {
      from: '/gauteng/lyttelton',
      to: '/gauteng/centurion',
      status_code: 308,
    },
  },
  kyalami_admission: {
  candidate_location_id: CANDIDATE_ID,
  preferred_name: 'Kyalami',
  decision: 'verify_as_suburb_with_official_corroboration',
  founder_approval: 'Edward',
  reviewed_and_approved_by_founder_on: '2026-11-02',
  founder_checked_on_map: 'N',
  source_count: 1,
  source: {
    provider: 'geonames',
    record_id: '7302796',
    feature_class: 'P',
    feature_code: 'PPLX',
    licence: 'CC BY 4.0',
    attribution: 'GeoNames geographic database; attribution required by the GeoNames licence.',
  },
  reviewed_external_evidence: reviewedExternalEvidence,
  identity_evidence_decision: reviewedIdentityEvidence,
  verification_limits: [
    'The official references support the named settlement, suburb type, and City of Johannesburg context; they do not define a surveyed Kyalami perimeter.',
    'No boundary was inferred or changed. The founder map-check remains N.',
  ],
  parent_context: {
    name: 'City of Johannesburg',
    factual_type: 'local_municipality',
    role: 'administrative context, not a searchable Place scope',
  },
  type_decision: {
    preferred_type: 'suburb',
    prior_source_type: 'neighbourhood',
    status: 'supported',
    reason: 'The City of Johannesburg lists Kyalami as a Region A suburb; the Government Gazette corroborates the Kyalami/Khayalami settlement identity and classifies it as a township in the City of Joburg area.',
  },
  second_source_required: false,
  place_id: 'allocated by the canonical Place ID registry during package generation',
  distinct_candidates_not_merged: [
    'Kyalami Park',
    'Kyalami Grand Prix Circuit',
    'Kyalami Manor',
    'Kyalami View (two distinct candidates)',
  ],
  },
};

const correctedNames = names.filter(row => !isGoogleMapsUrlAlias(row.name)).map(row => {
  if (row.name_assertion_id === CENTURION_NAME_ASSERTION_ID) {
    return { ...row, name_type: 'preferred_common', name_roles: ['preferred_common'], searchable: true };
  }
  if (row.name_assertion_id === LYTTELTON_NAME_ASSERTION_ID) {
    return { ...row, name_type: 'alias', name_roles: ['alias', 'historical'], searchable: true };
  }
  return row;
});

const newIdentity = {
  source_authority_version: 'gauteng-source-authority-v0.2',
  canonical_location_id: CANDIDATE_ID,
  identity_namespace: 'Property Listify',
  canonical_status: 'factual_canonical',
  lifecycle_status: 'active',
  promotion_class: 'auto_promotable_factual_identity',
  promotion_policy_version: '0.2.0',
  identity_confidence: reviewedIdentityEvidence.confidence,
  identity_evidence_class: reviewedIdentityEvidence.class,
  identity_evidence: reviewedIdentityEvidence,
  reviewed_external_evidence: reviewedExternalEvidence,
  preferred_name: 'Kyalami',
  official_name: null,
  normalized_name: 'kyalami',
  name_assertion_ids: [nameAssertionId],
  name_confidence: 'medium',
  name_state: 'supported',
  canonical_type: 'suburb',
  proposed_type: 'suburb',
  type_confidence: 'high',
  type_state: 'supported',
  type_assessment: 'reviewed_official_corroboration',
  type_assessment_reason: 'The City of Johannesburg lists Kyalami among Region A suburbs, and the Government Gazette records the Kyalami/Khayalami township identity in the City of Joburg area.',
  source_native_classifications: candidate.source_support.source_native_types.map(row => ({
    classification: row.classification,
    proposed_type_hints: row.proposed_type_hints,
    source: row.source,
    source_native_id: row.source_native_id,
    source_record_id: row.source_record_id,
  })),
  representative_latitude: candidate.representative_latitude,
  representative_longitude: candidate.representative_longitude,
  representative_geometry: {
    coordinates: [candidate.representative_longitude, candidate.representative_latitude],
    type: 'Point',
  },
  spatial_confidence: 'supported',
  administrative_context: candidate.administrative_context,
  administrative_assignment_confidence: candidate.administrative_assignment_confidence,
  boundary_conflict: false,
  unresolved_attributes: [],
  source_record_ids: candidate.source_support.source_record_ids,
  source_names: ['geonames'],
  source_count: 1,
  source_modification_dates: candidate.source_modification_dates,
  first_seen: candidate.first_seen,
  last_verified_at: candidate.last_verified_at,
  licence_classes: ['CC_BY_4'],
  licensing_classification: 'permissive_supported',
  licence_state: 'PERMISSIVE_OR_ATTRIBUTION_ONLY',
  licence_gate: 'source attribution must remain attached to the promoted evidence',
  odbl_evidence_present: false,
  licence_review_state: 'attribution_required',
  osm_only: false,
  source_representation: candidate.source_representation,
  promotion_reasons: [
    'GeoNames supplies the exact machine-readable point; City of Johannesburg and Government Gazette references independently corroborate the named settlement and suburb classification',
  ],
};

const newName = {
  source_authority_version: 'gauteng-source-authority-v0.2',
  name_assertion_id: nameAssertionId,
  canonical_location_id: CANDIDATE_ID,
  name: 'Kyalami',
  normalized_name: 'kyalami',
  name_type: 'preferred_common',
  name_roles: ['preferred_common'],
  status: 'active',
  searchable: true,
  source_record_ids: [sourceRecordId],
  source_names: ['geonames'],
  derived_from_candidate: true,
};

const newSourceLink = {
  source_authority_version: 'gauteng-source-authority-v0.2',
  source_link_id: sourceLinkId,
  canonical_location_id: CANDIDATE_ID,
  source_record_id: sourceRecordId,
  source: 'geonames',
  source_native_id: '7302796',
  source_native_stable_id: '7302796',
  exact_source_name: 'Kyalami',
  source_native_classification: sourceType.classification,
  source_artifact_ids: sourceArtifacts,
  source_modification_date: candidate.source_modification_dates[0],
  retrieved_at: candidate.first_seen,
  licence_class: 'CC_BY_4',
  attribution: 'GeoNames geographic database; attribution required by the GeoNames licence.',
  match_evidence: [],
  reviewed_external_evidence: reviewedExternalEvidence,
  promotion_class: 'auto_promotable_factual_identity',
  evidence_role: 'supporting_identity_evidence',
  odbl_evidence: false,
};

const updatedCandidate = {
  ...candidate,
  promotion_class: 'auto_promotable_factual_identity',
  factual_identity_status: 'promotable',
  founder_review_category: 'founder_approved_single_source',
  human_review_required: false,
  priority_probe_review: false,
  required_probe_names: [],
  review_set_reason: null,
  promotion_reasons: [
    'GeoNames supplies the exact machine-readable point; City of Johannesburg and Government Gazette references independently corroborate the named settlement and suburb classification',
  ],
  conflict_reasons: [],
  unresolved_attributes: [],
  type_assessment: 'reviewed_official_corroboration',
  type_assessment_reason: 'The City of Johannesburg lists Kyalami among Region A suburbs; the Government Gazette records the Kyalami/Khayalami township identity in the City of Joburg area.',
  identity_evidence: reviewedIdentityEvidence,
  reviewed_external_evidence: reviewedExternalEvidence,
};

const typeCorrection = {
  identity_anchor: CANDIDATE_ID,
  corrected_type: 'suburb',
  reviewed_search_scope: 'locality',
  type_basis: 'reviewed_official_corroboration_and_founder_classification',
  type_evidence: 'The City of Johannesburg Region A suburb list includes Kyalami; Government Gazette 40081 records Khayalami as a spelling correction from Kyalami and as a township in the City of Joburg area. The founder-approved consumer type is suburb.',
  reason: 'The official references support the named settlement and suburb type. This correction does not assert a new boundary or merge other Kyalami candidates.',
  confidence: 'high',
  edge_present: false,
};

const changedGeography = [...geography, newIdentity].sort((a, b) => a.canonical_location_id.localeCompare(b.canonical_location_id));
const changedNames = [...correctedNames, newName].sort((a, b) =>
  a.canonical_location_id.localeCompare(b.canonical_location_id) ||
  a.name_assertion_id.localeCompare(b.name_assertion_id),
);
const changedLinks = [...sourceLinks, newSourceLink].sort((a, b) =>
  a.canonical_location_id.localeCompare(b.canonical_location_id) ||
  a.source_link_id.localeCompare(b.source_link_id),
);
const changedCandidates = candidates
  .map(row => row.candidate_location_id === CANDIDATE_ID ? updatedCandidate : row)
  .sort((a, b) => a.candidate_location_id.localeCompare(b.candidate_location_id));
const changedTypeCorrections = [...typeCorrections, typeCorrection].sort((a, b) =>
  a.identity_anchor.localeCompare(b.identity_anchor),
);

const outputArtifacts = [
  { kind: 'candidate_dispositions', path: CANDIDATES_PATH, content: jsonl(changedCandidates), derivedFrom: candidatesPath },
  { kind: 'factual_geography', path: GEO_PATH, content: jsonl(changedGeography), derivedFrom: geographyPath },
  { kind: 'factual_names', path: NAMES_PATH, content: jsonl(changedNames), derivedFrom: namesPath },
  { kind: 'factual_source_links', path: LINKS_PATH, content: jsonl(changedLinks), derivedFrom: linksPath },
  {
    kind: 'reviewed_type_corrections',
    path: TYPE_CORRECTIONS_PATH,
    content: jsonl(changedTypeCorrections),
    derivedFrom: typeCorrectionsPath,
  },
  {
    kind: 'reviewed_settlement_membership',
    path: `${OUTPUT_DIR}/gauteng_factual_canonical_reviewed_settlement_membership_v0.3.jsonl`,
    content: readBytes(settlementMembershipPath).toString('utf8'),
    derivedFrom: settlementMembershipPath,
  },
  {
    kind: 'reviewed_identity_hold_decision',
    path: `${OUTPUT_DIR}/gauteng_fordsburg_identity_hold_decision_v0.1.json`,
    content: readBytes(identityHoldDecisionPath).toString('utf8'),
    derivedFrom: identityHoldDecisionPath,
  },
  {
    kind: 'reviewed_identity_hold',
    path: `${OUTPUT_DIR}/gauteng_factual_canonical_reviewed_identity_hold_v0.4.jsonl`,
    content: readBytes(identityHoldEvidencePath).toString('utf8'),
    derivedFrom: identityHoldEvidencePath,
  },
  { kind: 'founder_decision', path: DECISION_PATH, content: json(founderDecision), derivedFrom: null },
];

const artifactMetadata = outputArtifacts.map(artifact => {
  const bytes = Buffer.from(artifact.content);
  const derivedFrom = artifact.derivedFrom
    ? {
        path: artifact.derivedFrom,
        sha256: hash(readBytes(artifact.derivedFrom)),
      }
    : null;
  return {
    kind: artifact.kind,
    path: artifact.path,
    sha256: hash(bytes),
    size_bytes: bytes.length,
    ...(derivedFrom ? { carried_forward: bytes.equals(readBytes(artifact.derivedFrom)), derived_from: derivedFrom } : {}),
  };
});

const decisionDigest = artifactMetadata.find(row => row.path === DECISION_PATH).sha256;
const snapshotId = hash(Buffer.from(JSON.stringify({
  prior_snapshot_id: oldManifest.source_snapshot_id,
  founder_decision_sha256: decisionDigest,
  artifact_sha256s: artifactMetadata.map(row => [row.path, row.sha256]),
})));
const priorAuthorityDecision = oldManifest.provenance_review;
const history = [...(oldManifest.provenance_review_history ?? [])];
if (
  priorAuthorityDecision &&
  !history.some(row => row.review_id === priorAuthorityDecision.review_id)
) {
  history.push(priorAuthorityDecision);
}
const sourceManifest = {
  ...oldManifest,
  authority_version: 'gauteng-source-authority-v0.5',
  generated_at: '2026-11-02T00:00:00Z',
  source_snapshot_id: snapshotId,
  supersedes: {
    authority_version: oldManifest.authority_version,
    status: 'superseded_by_reviewed_official_kyalami_corroboration',
    exact_source_status: 'source_snapshot_preserved_with_reviewed_official_evidence_for_kyalami',
    prior_manifest: {
      path: PRIOR_MANIFEST,
      sha256: hash(oldManifestBytes),
    },
  },
  compact_artifacts: artifactMetadata,
  provenance_review: {
    review_id: founderDecision.decision_id,
    package: DECISION_PATH,
    decision: founderDecision.decision,
    purpose: 'Record City of Johannesburg and Government Gazette corroboration for Kyalami, verify its founder-approved suburb type without inferring a boundary, and apply the founder-approved Centurion preferred label while retaining Lyttelton as a searchable alias.',
    counts: {
      candidate_identities_admitted: 1,
      source_links_added: 1,
      reviewed_type_corrections_added: 1,
      reviewed_official_references: reviewedExternalEvidence.length,
      identity_verification_upgrades: 1,
      preferred_name_assertions_reclassified: 2,
      searchable_legacy_names_retained: 1,
      google_maps_url_alias_assertions_removed: googleMapsUrlAliasAssertions.length,
      distinct_kyalami_candidates_kept_separate: 5,
    },
    policy: {
      single_traceable_source_sufficient: true,
      second_source_required: false,
      verified_using_reviewed_official_corroboration: true,
      founder_map_check: 'N',
      boundaries_inferred: false,
      other_kyalami_candidates_merged: false,
    },
    reviewed_and_approved_by_founder_on: '2026-11-02',
  },
  provenance_review_history: history,
};

const manifestBytes = Buffer.from(json(sourceManifest));
const territoryRegistry = readJson(TERRITORY_REGISTRY_PATH);
const gautengTerritory = exactlyOne(
  territoryRegistry.territories ?? [],
  row => row.territory_id === 'za-gp',
  'Gauteng territory registry entry',
);
if (
  gautengTerritory.source_authority?.authority_version !== 'gauteng-source-authority-v0.5' ||
  gautengTerritory.source_authority?.manifest?.path !== OUTPUT_MANIFEST
) {
  fail('the territory registry no longer points Gauteng at source authority v0.5');
}
const updatedTerritoryRegistry = structuredClone(territoryRegistry);
updatedTerritoryRegistry.territories.find(row => row.territory_id === 'za-gp').source_authority.manifest.sha256 =
  hash(manifestBytes);
const registryBytes = Buffer.from(json(updatedTerritoryRegistry));

const outputFiles = [
  ...outputArtifacts.map(row => ({ path: row.path, content: row.content })),
  { path: OUTPUT_MANIFEST, content: manifestBytes.toString('utf8') },
  { path: TERRITORY_REGISTRY_PATH, content: registryBytes.toString('utf8') },
];

if (CHECK_ONLY) {
  const mismatches = outputFiles.filter(file => {
    try {
      return readBytes(file.path).toString('utf8') !== file.content;
    } catch {
      return true;
    }
  });
  if (mismatches.length) fail(`derived artifacts differ: ${mismatches.map(row => row.path).join(', ')}`);
  console.log('Kyalami source-authority v0.5 derivation is reproducible.');
} else {
  for (const file of outputFiles) {
    const fullPath = resolve(ROOT, file.path);
    if (!existsSync(fullPath)) mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.content);
  }
  console.log(`Wrote Gauteng source authority v0.5 with the founder geography decisions: ${OUTPUT_DIR}.`);
}
