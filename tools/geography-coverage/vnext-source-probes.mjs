import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');
const ID_PREFIX = 'pl-geo-v01-za-gp-';
const SOURCE_ROOT = 'data/gauteng-source-authority-v0.2';
const COVERAGE_ROOT = 'data/geography-coverage-v0.2';
const OUTPUT_ROOT = `${COVERAGE_ROOT}/output`;

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readJsonl(relativePath) {
  return fs
    .readFileSync(path.join(ROOT, relativePath), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function writeJson(relativePath, value) {
  fs.writeFileSync(path.join(ROOT, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function main() {
  const sourceSummary = readJson(`${SOURCE_ROOT}/gauteng_source_build_summary_v0.2.json`);
  const sourceManifest = readJson(`${SOURCE_ROOT}/gauteng_source_manifest_v0.2.json`);
  const geography = readJsonl(`${SOURCE_ROOT}/gauteng_factual_canonical_geography_v0.2.jsonl`);
  const names = readJsonl(`${SOURCE_ROOT}/gauteng_factual_canonical_names_v0.2.jsonl`);
  const sourceLinks = readJsonl(`${SOURCE_ROOT}/gauteng_factual_canonical_source_links_v0.2.jsonl`);
  const candidateDispositions = readJsonl(
    `${SOURCE_ROOT}/gauteng_candidate_dispositions_v0.2.jsonl`,
  );
  const manifest = readJson(`${COVERAGE_ROOT}/gauteng-territory-manifest.v0.2.json`);
  const projection = readJson(`${OUTPUT_ROOT}/gauteng_runtime_reference_projection_v0.3.json`);
  const mapping = readJsonl(`${OUTPUT_ROOT}/gauteng_factual_runtime_mapping_v0.3.jsonl`);
  const queue = readJsonl(`${OUTPUT_ROOT}/gauteng_review_queue_v0.2.jsonl`);
  const disposition = readJson(`${OUTPUT_ROOT}/gauteng_coverage_disposition_v0.2.json`);

  assert(
    sourceSummary.authority_version === 'gauteng-source-authority-v0.2',
    'Unexpected source authority version',
  );
  assert(
    sourceManifest.authority_version === sourceSummary.authority_version,
    'Source manifest authority mismatch',
  );
  assert(
    sourceSummary.source_snapshot_id === sourceManifest.source_snapshot_id,
    'Source snapshot mismatch',
  );
  assert(
    sourceSummary.raw_source_pack_committed === false,
    'Raw source pack must not be committed',
  );
  assert(
    sourceSummary.supersession.old_generated_output_used_as_vnext_input === false,
    'Old generated output leaked into vNext source',
  );
  assert(
    sourceSummary.supersession.old_runtime_projection_activated_by_this_pack === false,
    'vNext pack activated runtime projection',
  );
  assert(
    manifest.source_authority.status === 'vnext_compact_authority_ready',
    'Manifest is not source-ready',
  );
  assert(
    manifest.activation.default_runtime_catalog.endsWith('territory-catalog.v0.1.json'),
    'vNext must not replace the default consumer catalog',
  );

  const expectedGeographyDigest = manifest.inputs.expected_sha256.factual_geography_sha256;
  const expectedNamesDigest = manifest.inputs.expected_sha256.factual_names_sha256;
  assert(
    sha256File(path.join(ROOT, SOURCE_ROOT, manifest.inputs.geography_jsonl)) ===
      expectedGeographyDigest,
    'vNext geography digest mismatch',
  );
  assert(
    sha256File(path.join(ROOT, SOURCE_ROOT, manifest.inputs.names_jsonl)) === expectedNamesDigest,
    'vNext names digest mismatch',
  );
  assert(
    projection.checkpoints.factual_canonical_geography_sha256 === expectedGeographyDigest,
    'Projection geography checkpoint mismatch',
  );
  assert(
    projection.checkpoints.factual_canonical_names_sha256 === expectedNamesDigest,
    'Projection names checkpoint mismatch',
  );
  assert(
    projection.checkpoints.territory_manifest_sha256 ===
      sha256File(path.join(ROOT, COVERAGE_ROOT, 'gauteng-territory-manifest.v0.2.json')),
    'Projection manifest checkpoint mismatch',
  );

  const geographyById = new Map();
  for (const row of geography) {
    assert(
      row.canonical_location_id.startsWith(ID_PREFIX),
      `Legacy identity in vNext geography: ${row.canonical_location_id}`,
    );
    assert(
      !geographyById.has(row.canonical_location_id),
      `Duplicate geography identity: ${row.canonical_location_id}`,
    );
    geographyById.set(row.canonical_location_id, row);
  }
  const namesById = new Map();
  for (const row of names) {
    assert(
      row.canonical_location_id.startsWith(ID_PREFIX),
      `Legacy identity in vNext names: ${row.canonical_location_id}`,
    );
    assert(
      !namesById.has(row.name_assertion_id),
      `Duplicate name assertion: ${row.name_assertion_id}`,
    );
    assert(
      geographyById.has(row.canonical_location_id),
      `Name references unknown identity: ${row.canonical_location_id}`,
    );
    namesById.set(row.name_assertion_id, row);
  }
  const sourceLinksByRecord = new Map();
  for (const row of sourceLinks) {
    assert(
      row.canonical_location_id.startsWith(ID_PREFIX),
      `Legacy identity in vNext source links: ${row.canonical_location_id}`,
    );
    assert(
      geographyById.has(row.canonical_location_id),
      `Source link references unknown identity: ${row.canonical_location_id}`,
    );
    assert(
      !sourceLinksByRecord.has(row.source_record_id),
      `Duplicate source record link: ${row.source_record_id}`,
    );
    sourceLinksByRecord.set(row.source_record_id, row);
  }
  for (const row of geography) {
    for (const recordId of row.source_record_ids ?? []) {
      assert(
        sourceLinksByRecord.has(recordId),
        `Missing source link for ${row.canonical_location_id}: ${recordId}`,
      );
    }
    for (const nameId of row.name_assertion_ids ?? []) {
      assert(
        namesById.has(nameId),
        `Missing name assertion for ${row.canonical_location_id}: ${nameId}`,
      );
    }
  }
  const candidateIds = new Set();
  for (const row of candidateDispositions) {
    assert(
      row.candidate_location_id.startsWith(ID_PREFIX),
      `Legacy identity in vNext candidate dispositions: ${row.candidate_location_id}`,
    );
    assert(
      !candidateIds.has(row.candidate_location_id),
      `Duplicate candidate disposition: ${row.candidate_location_id}`,
    );
    candidateIds.add(row.candidate_location_id);
  }
  assert(
    candidateDispositions.length === sourceSummary.counts.candidate_dispositions,
    'Candidate disposition count mismatch',
  );
  const candidateResults = candidateDispositions.map(row => ({
    candidate_location_id: row.candidate_location_id,
    preferred_name: row.preferred_name,
    candidate_type: row.candidate_type,
    promotion_class: row.promotion_class,
    outcome: 'retained_outside_canonical',
  }));

  const mappingById = new Map();
  for (const row of mapping) {
    assert(
      row.factual_location_id.startsWith(ID_PREFIX),
      `Legacy identity in vNext mapping: ${row.factual_location_id}`,
    );
    assert(
      !mappingById.has(row.factual_location_id),
      `Duplicate mapping identity: ${row.factual_location_id}`,
    );
    mappingById.set(row.factual_location_id, row);
  }
  assert(
    mappingById.size === geographyById.size,
    'Every geography identity must have one mapping disposition',
  );
  const projectionByKey = new Map();
  for (const row of projection.rows) {
    assert(
      !projectionByKey.has(row.runtime_natural_key),
      `Duplicate projection key: ${row.runtime_natural_key}`,
    );
    projectionByKey.set(row.runtime_natural_key, row);
  }
  const previousKey = '';
  for (const row of projection.rows) {
    assert(
      row.runtime_natural_key.localeCompare(previousKey) >= 0,
      'Projection rows are not sorted',
    );
    if (row.runtime_search_scope_kind !== 'province') {
      const parentKey = row.runtime_natural_key.split('/').slice(0, -1).join('/');
      const parent = projectionByKey.get(parentKey);
      assert(
        parent && parent.runtime_storage_level !== 'suburb',
        `Projection parent closure failed: ${row.runtime_natural_key}`,
      );
    }
  }
  const queueById = new Map(queue.map(row => [row.factual_location_id, row]));
  const identityResults = [];
  for (const row of geography) {
    const dispositionEntry = mappingById.get(row.canonical_location_id);
    assert(dispositionEntry, `Missing mapping for ${row.canonical_location_id}`);
    const ready = dispositionEntry.projection_status === 'projection_ready';
    if (ready) {
      const runtimeRow = projectionByKey.get(dispositionEntry.runtime_natural_key);
      assert(runtimeRow, `Ready mapping has no projection row: ${row.canonical_location_id}`);
      assert(
        runtimeRow.factual_location_ids.includes(row.canonical_location_id),
        `Projection does not contain ready identity: ${row.canonical_location_id}`,
      );
      assert(
        runtimeRow.runtime_search_scope_kind === dispositionEntry.runtime_search_scope_kind,
        `Projection scope mismatch: ${row.canonical_location_id}`,
      );
    } else {
      assert(
        !dispositionEntry.runtime_natural_key,
        `Blocked mapping has runtime key: ${row.canonical_location_id}`,
      );
      assert(
        queueById.has(row.canonical_location_id),
        `Blocked mapping has no queue entry: ${row.canonical_location_id}`,
      );
    }
    identityResults.push({
      probe: row.preferred_name,
      factual_location_id: row.canonical_location_id,
      factual_type: row.canonical_type,
      outcome: ready ? 'resolved' : 'queued',
      projection_status: dispositionEntry.projection_status,
      runtime_natural_key: dispositionEntry.runtime_natural_key ?? null,
      queue_reason: queueById.get(row.canonical_location_id)?.reason ?? null,
    });
  }

  const nameResults = [];
  for (const row of names) {
    const geographyRow = geographyById.get(row.canonical_location_id);
    const mappingEntry = mappingById.get(row.canonical_location_id);
    const ready = mappingEntry?.projection_status === 'projection_ready';
    nameResults.push({
      probe: row.name,
      name_assertion_id: row.name_assertion_id,
      factual_location_id: row.canonical_location_id,
      factual_preferred_name: geographyRow.preferred_name,
      searchable: row.searchable,
      outcome: !row.searchable ? 'non_searchable' : ready ? 'resolved' : 'queued',
      projection_status: mappingEntry?.projection_status ?? null,
      runtime_natural_key: mappingEntry?.runtime_natural_key ?? null,
    });
  }

  const rowsByName = new Map();
  for (const row of projection.rows) {
    const list = rowsByName.get(normalize(row.name)) ?? [];
    list.push(row);
    rowsByName.set(normalize(row.name), list);
  }
  const coreProbeResults = [];
  for (const probe of manifest.acceptance.core_probes) {
    const candidates = rowsByName.get(normalize(probe)) ?? [];
    const accepted = geography.filter(row => normalize(row.preferred_name) === normalize(probe));
    coreProbeResults.push({
      probe,
      outcome:
        candidates.length > 0
          ? 'resolved'
          : accepted.length > 0
            ? 'queued'
            : 'not_in_accepted_source',
      runtime_rows: candidates.map(row => row.runtime_natural_key),
      accepted_identity_count: accepted.length,
    });
  }
  const kyalami = coreProbeResults.find(result => result.probe === 'Kyalami') ?? {
    probe: 'Kyalami',
    outcome: geography.some(row => normalize(row.preferred_name) === 'kyalami')
      ? 'queued'
      : 'not_in_accepted_source',
    runtime_rows: [],
    accepted_identity_count: geography.filter(row => normalize(row.preferred_name) === 'kyalami')
      .length,
  };
  assert(
    kyalami.outcome !== 'resolved',
    'Kyalami must not be publicly projected while its gate is open',
  );

  assert(
    mapping.length === disposition.summary.factual_identity_count,
    'Mapping/disposition identity count mismatch',
  );
  assert(
    disposition.summary.newly_promoted_identity_count + disposition.summary.queued_count ===
      disposition.summary.factual_identity_count,
    'Disposition invariant failed',
  );
  assert(
    queue.length ===
      [...mappingById.values()].filter(row => row.projection_status !== 'projection_ready').length,
    'Queue/disposition count mismatch',
  );
  assert(
    sourceSummary.counts.geography_identities === geography.length,
    'Source summary geography count mismatch',
  );
  assert(
    sourceSummary.counts.name_assertions === names.length,
    'Source summary name count mismatch',
  );
  assert(
    sourceSummary.counts.source_links === sourceLinks.length,
    'Source summary source-link count mismatch',
  );
  assert(
    sourceSummary.count_reconciliation.vnext_identity_count === geography.length,
    'vNext count reconciliation mismatch',
  );
  assert(
    sourceSummary.count_reconciliation.status ===
      'fresh_source_snapshot_delta_recorded_not_a_v0_1_reconstruction_gate',
    'vNext count reconciliation status mismatch',
  );

  const result = {
    report_version: 'gauteng-vnext-source-probe-v0.2',
    authority_version: sourceSummary.authority_version,
    source_snapshot_id: sourceSummary.source_snapshot_id,
    contract: manifest.contract,
    source_manifest: `${SOURCE_ROOT}/gauteng_source_manifest_v0.2.json`,
    coverage_manifest: `${COVERAGE_ROOT}/gauteng-territory-manifest.v0.2.json`,
    counts: {
      identity_probes: identityResults.length,
      name_probes: nameResults.length,
      candidate_disposition_probes: candidateDispositions.length,
      total_governed_probes: identityResults.length + nameResults.length + candidateResults.length,
      resolved_identities: identityResults.filter(row => row.outcome === 'resolved').length,
      queued_identities: identityResults.filter(row => row.outcome === 'queued').length,
      resolved_core_probes: coreProbeResults.filter(row => row.outcome === 'resolved').length,
      queued_core_probes: coreProbeResults.filter(row => row.outcome === 'queued').length,
      absent_core_probes: coreProbeResults.filter(row => row.outcome === 'not_in_accepted_source')
        .length,
    },
    invariants: {
      all_identities_have_one_disposition: true,
      all_names_have_one_identity_disposition: true,
      all_candidates_have_one_disposition: true,
      all_projected_rows_have_closed_parents: true,
      no_legacy_identity_in_vnext_source: true,
      kyalami_non_public: true,
      raw_source_pack_not_committed: true,
      old_generated_output_not_used_as_source: true,
    },
    core_probes: coreProbeResults,
    identity_results: identityResults,
    name_results: nameResults,
    candidate_results: candidateResults,
  };
  writeJson(`${OUTPUT_ROOT}/gauteng_vnext_probe_results_v0.2.json`, result);
  console.log(JSON.stringify(result.counts, null, 2));
}

main();
