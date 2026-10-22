import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');
const AUTHORITY_VERSION = 'gauteng-source-authority-v0.2';
const ID_PREFIX = 'pl-geo-v01-za-gp-';

function sha256Bytes(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  return sha256Bytes(fs.readFileSync(filePath));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, stableValue(value[key])]),
  );
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(filePath, rows, sortKey) {
  const sorted = [...rows].sort((left, right) =>
    String(left[sortKey]).localeCompare(String(right[sortKey])),
  );
  fs.writeFileSync(filePath, `${sorted.map(row => JSON.stringify(row)).join('\n')}\n`);
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--input-root') options.inputRoot = argv[++index];
    else if (value === '--output-root') options.outputRoot = argv[++index];
    else throw new Error(`Unknown argument ${value}`);
  }
  if (!options.inputRoot || !options.outputRoot) {
    throw new Error('--input-root and --output-root are required');
  }
  return {
    inputRoot: path.resolve(options.inputRoot),
    outputRoot: path.resolve(options.outputRoot),
  };
}

function compactGeography(row) {
  if (!row.canonical_location_id?.startsWith(ID_PREFIX)) {
    throw new Error(`Unexpected vNext factual identity ${row.canonical_location_id}`);
  }
  return {
    source_authority_version: AUTHORITY_VERSION,
    canonical_location_id: row.canonical_location_id,
    identity_namespace: row.identity_namespace,
    canonical_status: row.canonical_status,
    lifecycle_status: row.lifecycle_status,
    promotion_class: row.promotion_class,
    promotion_policy_version: row.promotion_policy_version,
    identity_confidence: row.identity_confidence,
    identity_evidence_class: row.identity_evidence_class,
    identity_evidence: row.identity_evidence,
    preferred_name: row.preferred_name,
    official_name: row.official_name,
    normalized_name: row.normalized_name,
    name_assertion_ids: row.name_assertion_ids,
    name_confidence: row.name_confidence,
    name_state: row.name_state,
    canonical_type: row.canonical_type,
    proposed_type: row.proposed_type,
    type_confidence: row.type_confidence,
    type_state: row.type_state,
    type_assessment: row.type_assessment,
    type_assessment_reason: row.type_assessment_reason,
    source_native_classifications: row.source_native_classifications,
    representative_latitude: row.representative_latitude,
    representative_longitude: row.representative_longitude,
    representative_geometry: row.representative_geometry,
    spatial_confidence: row.spatial_confidence,
    administrative_context: row.administrative_context,
    administrative_relationships: row.administrative_relationships,
    administrative_assignment_confidence: row.administrative_assignment_confidence,
    boundary_conflict: row.boundary_conflict,
    unresolved_attributes: row.unresolved_attributes,
    source_record_ids: row.source_record_ids,
    source_names: row.source_names,
    source_count: row.source_count,
    source_modification_dates: row.source_modification_dates,
    first_seen: row.first_seen,
    last_verified_at: row.last_verified_at,
    licence_classes: row.licence_classes,
    licensing_classification: row.licensing_classification,
    licence_state: row.licence_state,
    licence_gate: row.licence_gate,
    odbl_evidence_present: row.odbl_evidence_present,
    licence_review_state: row.licence_review_state,
    osm_only: row.osm_only,
    source_representation: row.source_representation,
    promotion_reasons: row.promotion_reasons,
  };
}

function compactName(row) {
  if (!row.canonical_location_id?.startsWith(ID_PREFIX)) {
    throw new Error(`Unexpected vNext name identity ${row.canonical_location_id}`);
  }
  return {
    source_authority_version: AUTHORITY_VERSION,
    name_assertion_id: row.name_assertion_id,
    canonical_location_id: row.canonical_location_id,
    name: row.name,
    normalized_name: row.normalized_name,
    name_type: row.name_type,
    name_roles: row.name_roles,
    status: row.status,
    searchable: row.searchable,
    source_record_ids: row.source_record_ids,
    source_names: row.source_names,
    derived_from_candidate: row.derived_from_candidate,
  };
}

function compactSourceLink(row) {
  if (!row.canonical_location_id?.startsWith(ID_PREFIX)) {
    throw new Error(`Unexpected vNext source-link identity ${row.canonical_location_id}`);
  }
  return {
    source_authority_version: AUTHORITY_VERSION,
    source_link_id: row.source_link_id,
    canonical_location_id: row.canonical_location_id,
    source_record_id: row.source_record_id,
    source: row.source,
    source_native_id: row.source_native_id,
    source_native_stable_id: row.source_native_stable_id,
    exact_source_name: row.exact_source_name,
    source_native_classification: row.source_native_classification,
    source_artifact_ids: row.source_artifact_ids,
    source_modification_date: row.source_modification_date,
    retrieved_at: row.retrieved_at,
    licence_class: row.licence_class,
    attribution: row.attribution,
    match_evidence: (row.match_evidence ?? []).map(match => ({
      match_method: match.match_method,
      match_status: match.match_status,
      match_confidence: match.match_confidence,
      conflict_reason: match.conflict_reason,
      notes: match.notes,
      review_required: match.review_required,
      evidence_source_artifact_ids: match.evidence_source_artifact_ids,
    })),
    promotion_class: row.promotion_class,
    evidence_role: row.evidence_role,
    odbl_evidence: row.odbl_evidence,
  };
}

function compactCandidateDisposition(row) {
  if (!row.candidate_location_id?.startsWith(ID_PREFIX)) {
    throw new Error(`Unexpected vNext candidate identity ${row.candidate_location_id}`);
  }
  return {
    source_authority_version: AUTHORITY_VERSION,
    candidate_location_id: row.candidate_location_id,
    preferred_name: row.preferred_name,
    normalized_name: row.normalized_name,
    candidate_type: row.candidate_type,
    assessed_candidate_type: row.assessed_candidate_type,
    candidate_type_status: row.candidate_type_status,
    candidate_type_source_hints: row.candidate_type_source_hints,
    promotion_class: row.promotion_class,
    factual_identity_status: row.factual_identity_status,
    founder_review_category: row.founder_review_category,
    human_review_required: row.human_review_required,
    priority_probe_review: row.priority_probe_review,
    required_probe_names: row.required_probe_names,
    review_set_reason: row.review_set_reason,
    promotion_reasons: row.promotion_reasons,
    conflict_reasons: row.conflict_reasons,
    conflicts: row.conflicts,
    unresolved_attributes: row.unresolved_attributes,
    type_assessment: row.type_assessment,
    type_assessment_reason: row.type_assessment_reason,
    identity_evidence: row.identity_evidence,
    source_support: row.source_support,
    licence_classes: row.licence_classes,
    licence_state: row.licence_state,
    licence_gate: row.licence_gate,
    odb_evidence_present: row.odbl_evidence_present,
    osm_only: row.osm_only,
    administrative_context: row.administrative_context,
    administrative_assignment_confidence: row.administrative_assignment_confidence,
    boundary_conflict: row.boundary_conflict,
    representative_latitude: row.representative_latitude,
    representative_longitude: row.representative_longitude,
    first_seen: row.first_seen,
    last_verified_at: row.last_verified_at,
    source_modification_dates: row.source_modification_dates,
    aliases: row.aliases,
    historical_names: row.historical_names,
    source_representation: row.source_representation,
  };
}

function assertUnique(rows, key, label) {
  const seen = new Set();
  for (const row of rows) {
    const value = row[key];
    if (!value || seen.has(value)) throw new Error(`Duplicate or missing ${label}: ${value}`);
    seen.add(value);
  }
  return seen;
}

function validateSourceLinks(geography, names, sourceLinks) {
  const geographyIds = assertUnique(geography, 'canonical_location_id', 'geography identity');
  assertUnique(names, 'name_assertion_id', 'name assertion');
  assertUnique(sourceLinks, 'source_link_id', 'source link');
  const linkedRecordIds = new Set();
  for (const link of sourceLinks) {
    if (!geographyIds.has(link.canonical_location_id)) {
      throw new Error(`Source link references unknown identity ${link.canonical_location_id}`);
    }
    linkedRecordIds.add(link.source_record_id);
  }
  for (const row of geography) {
    for (const sourceRecordId of row.source_record_ids ?? []) {
      if (!linkedRecordIds.has(sourceRecordId)) {
        throw new Error(
          `Geography ${row.canonical_location_id} has no source link for ${sourceRecordId}`,
        );
      }
    }
    for (const nameAssertionId of row.name_assertion_ids ?? []) {
      if (!names.some(name => name.name_assertion_id === nameAssertionId)) {
        throw new Error(
          `Geography ${row.canonical_location_id} references missing name ${nameAssertionId}`,
        );
      }
    }
  }
  for (const name of names) {
    if (!geographyIds.has(name.canonical_location_id)) {
      throw new Error(`Name references unknown identity ${name.canonical_location_id}`);
    }
  }
}

function buildLicenseObservations(manifest) {
  const classes = new Map();
  for (const artifact of manifest.artifacts ?? []) {
    const key = artifact.licence_class ?? 'UNKNOWN';
    const current = classes.get(key) ?? { licence_class: key, artifact_count: 0, artifact_ids: [] };
    current.artifact_count += 1;
    current.artifact_ids.push(artifact.artifact_id);
    classes.set(key, current);
  }
  return [...classes.values()]
    .map(value => ({ ...value, artifact_ids: value.artifact_ids.sort() }))
    .sort((left, right) => left.licence_class.localeCompare(right.licence_class));
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const inputOutput = path.join(options.inputRoot, 'output');
  const sourceManifestPath = path.join(inputOutput, 'gauteng_source_manifest_v0.1.json');
  const sourceManifest = readJson(sourceManifestPath);
  const sourcePaths = {
    candidate_catalogue: path.join(inputOutput, 'gauteng_candidate_catalogue_v0.1.jsonl'),
    candidate_matches: path.join(inputOutput, 'gauteng_candidate_matches_v0.1.jsonl'),
    source_records: path.join(inputOutput, 'gauteng_source_records_v0.1.jsonl'),
    source_assertions: path.join(inputOutput, 'gauteng_source_assertions_v0.1.jsonl'),
    promotion_simulation: path.join(
      options.inputRoot,
      '../gauteng-canonical-promotion-v0.2/output/gauteng_canonical_promotion_simulation_v0.2.jsonl',
    ),
  };
  const canonicalPaths = {
    geography: path.join(
      options.inputRoot,
      '../gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_geography_v0.1.jsonl',
    ),
    names: path.join(
      options.inputRoot,
      '../gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_names_v0.1.jsonl',
    ),
    source_links: path.join(
      options.inputRoot,
      '../gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_source_links_v0.1.jsonl',
    ),
    summary: path.join(
      options.inputRoot,
      '../gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_summary_v0.1.json',
    ),
  };
  for (const filePath of [...Object.values(sourcePaths), ...Object.values(canonicalPaths)]) {
    if (!fs.existsSync(filePath)) throw new Error(`Required source output is missing: ${filePath}`);
  }

  const geography = readJsonl(canonicalPaths.geography).map(compactGeography);
  const names = readJsonl(canonicalPaths.names).map(compactName);
  const sourceLinks = readJsonl(canonicalPaths.source_links).map(compactSourceLink);
  const candidateDispositions = readJsonl(sourcePaths.promotion_simulation).map(
    compactCandidateDisposition,
  );
  assertUnique(candidateDispositions, 'candidate_location_id', 'candidate disposition');
  const acceptedCandidateIds = new Set(
    candidateDispositions
      .filter(row =>
        ['auto_promotable_factual_identity', 'promotable_with_provisional_attributes'].includes(
          row.promotion_class,
        ),
      )
      .map(row => row.candidate_location_id),
  );
  if (
    acceptedCandidateIds.size !== geography.length ||
    geography.some(row => !acceptedCandidateIds.has(row.canonical_location_id))
  ) {
    throw new Error('Accepted geography and candidate promotion dispositions do not align');
  }
  validateSourceLinks(geography, names, sourceLinks);
  const canonicalSummary = readJson(canonicalPaths.summary);
  if (canonicalSummary.output_version !== 'v0.1') {
    throw new Error(`Unexpected canonical source version ${canonicalSummary.output_version}`);
  }
  if (candidateDispositions.length !== canonicalSummary.candidate_layer.total_candidates) {
    throw new Error('Candidate disposition count does not match the canonical candidate layer');
  }

  fs.mkdirSync(options.outputRoot, { recursive: true });
  const compactPaths = {
    geography: path.join(options.outputRoot, 'gauteng_factual_canonical_geography_v0.2.jsonl'),
    names: path.join(options.outputRoot, 'gauteng_factual_canonical_names_v0.2.jsonl'),
    source_links: path.join(
      options.outputRoot,
      'gauteng_factual_canonical_source_links_v0.2.jsonl',
    ),
    candidate_dispositions: path.join(
      options.outputRoot,
      'gauteng_candidate_dispositions_v0.2.jsonl',
    ),
  };
  writeJsonl(compactPaths.geography, geography, 'canonical_location_id');
  writeJsonl(compactPaths.names, names, 'name_assertion_id');
  writeJsonl(compactPaths.source_links, sourceLinks, 'source_link_id');
  writeJsonl(compactPaths.candidate_dispositions, candidateDispositions, 'candidate_location_id');

  const compactArtifacts = Object.entries(compactPaths).map(([key, filePath]) => ({
    kind: key,
    path: path.relative(ROOT, filePath).split(path.sep).join('/'),
    sha256: sha256File(filePath),
    size_bytes: fs.statSync(filePath).size,
  }));
  const sourceSnapshotId = sha256Bytes(
    stableJson({
      artifacts: (sourceManifest.artifacts ?? []).map(artifact => ({
        artifact_id: artifact.artifact_id,
        sha256: artifact.sha256,
      })),
      compact_artifacts: compactArtifacts,
    }),
  );
  const sourceManifestV02 = {
    ...sourceManifest,
    manifest_version: '0.2',
    catalogue_version: 'v0.2',
    pipeline_version: '0.2.0-vnext',
    scope:
      'approved source evidence snapshot; compact normalized authority; not production geography',
    authority_version: AUTHORITY_VERSION,
    source_snapshot_id: sourceSnapshotId,
    supersedes: {
      authority_version: 'gauteng-source-authority-v0.1',
      status: 'historical_only',
      exact_source_status: 'exact_source_unrecoverable',
    },
    raw_materialization: {
      committed: false,
      reason:
        'large approved source artifacts remain digest-pinned and are acquired into disposable storage',
      compact_authority_is_repository_source: true,
    },
    license_observations: buildLicenseObservations(sourceManifest),
    compact_artifacts: compactArtifacts,
  };
  const sourceManifestV02Path = path.join(options.outputRoot, 'gauteng_source_manifest_v0.2.json');
  writeJson(sourceManifestV02Path, sourceManifestV02);

  const derivedInputDigests = Object.fromEntries(
    Object.entries({ ...sourcePaths, ...canonicalPaths }).map(([key, filePath]) => [
      key,
      {
        path: path.relative(options.inputRoot, filePath).split(path.sep).join('/'),
        sha256: sha256File(filePath),
        size_bytes: fs.statSync(filePath).size,
      },
    ]),
  );
  const buildSummary = {
    authority_version: AUTHORITY_VERSION,
    source_snapshot_id: sourceSnapshotId,
    source_manifest: {
      path: path.relative(ROOT, sourceManifestV02Path).split(path.sep).join('/'),
      sha256: sha256File(sourceManifestV02Path),
      size_bytes: fs.statSync(sourceManifestV02Path).size,
    },
    compact_artifacts: compactArtifacts,
    derived_input_digests: derivedInputDigests,
    counts: {
      geography_identities: geography.length,
      name_assertions: names.length,
      source_links: sourceLinks.length,
      candidate_dispositions: candidateDispositions.length,
      source_artifacts: sourceManifest.artifacts?.length ?? 0,
    },
    canonical_result: canonicalSummary.canonical_result,
    count_reconciliation: {
      historical_expected_identity_count:
        canonicalSummary.canonical_result.expected_accepted_identity_count,
      vnext_identity_count: geography.length,
      delta: geography.length - canonicalSummary.canonical_result.expected_accepted_identity_count,
      status: 'fresh_source_snapshot_delta_recorded_not_a_v0_1_reconstruction_gate',
    },
    candidate_layer: canonicalSummary.candidate_layer,
    licensing_distribution: canonicalSummary.licensing_distribution,
    special_gates: {
      kyalami: canonicalSummary.kyalami_khayalami,
    },
    source_license_observations: buildLicenseObservations(sourceManifest),
    raw_source_pack_committed: false,
    source_closure_status: 'vnext_compact_authority_ready',
    supersession: {
      old_source: 'gauteng-source-authority-v0.1',
      old_source_status: 'exact_source_unrecoverable',
      old_generated_output_used_as_vnext_input: false,
      old_runtime_projection_activated_by_this_pack: false,
    },
  };
  const summaryPath = path.join(options.outputRoot, 'gauteng_source_build_summary_v0.2.json');
  writeJson(summaryPath, buildSummary);
  console.log(
    JSON.stringify(
      {
        source_snapshot_id: sourceSnapshotId,
        geography_identities: geography.length,
        name_assertions: names.length,
        source_links: sourceLinks.length,
        candidate_dispositions: candidateDispositions.length,
        output_root: path.relative(ROOT, options.outputRoot).split(path.sep).join('/'),
      },
      null,
      2,
    ),
  );
}

main();
