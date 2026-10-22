import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');
const OLD_OUTPUT = 'data/geography-coverage-v0.1/output';
const NEW_OUTPUT = 'data/geography-coverage-v0.2/output';

function sha256File(relativePath) {
  return createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest('hex');
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

function contextKey(entry) {
  return (entry.factual_context?.administrative_context_names ?? [])
    .map(normalize)
    .sort()
    .join('|');
}

function exactKey(entry) {
  return [
    normalize(entry.factual_preferred_name),
    normalize(entry.factual_type),
    normalize(entry.runtime_natural_key),
    contextKey(entry),
  ].join('\u0001');
}

function runtimeKey(entry) {
  return normalize(entry.runtime_natural_key);
}

function groupBy(rows, keyFunction) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFunction(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return groups;
}

function publicSample(rows) {
  return rows.slice(0, 25).map(row => ({
    old_factual_location_id: row.oldEntry?.factual_location_id ?? null,
    new_factual_location_id: row.newEntry?.factual_location_id ?? null,
    name: row.newEntry?.factual_preferred_name ?? row.oldEntry?.factual_preferred_name ?? null,
    old_runtime_natural_key: row.oldEntry?.runtime_natural_key ?? null,
    new_runtime_natural_key: row.newEntry?.runtime_natural_key ?? null,
    old_projection_status: row.oldEntry?.projection_status ?? null,
    new_projection_status: row.newEntry?.projection_status ?? null,
  }));
}

function main() {
  const oldMapping = readJsonl(`${OLD_OUTPUT}/gauteng_factual_runtime_mapping_v0.2.jsonl`);
  const newMapping = readJsonl(`${NEW_OUTPUT}/gauteng_factual_runtime_mapping_v0.3.jsonl`);
  const oldProjection = readJson(`${OLD_OUTPUT}/gauteng_runtime_reference_projection_v0.2.json`);
  const newProjection = readJson(`${NEW_OUTPUT}/gauteng_runtime_reference_projection_v0.3.json`);
  const oldDisposition = readJson(`${OLD_OUTPUT}/gauteng_coverage_disposition_v0.1.json`);
  const newDisposition = readJson(`${NEW_OUTPUT}/gauteng_coverage_disposition_v0.2.json`);
  const oldRecovery = readJson('data/geography-coverage-v0.1/source-recovery.v0.1.json');
  const newSourceSummary = readJson(
    'data/gauteng-source-authority-v0.2/gauteng_source_build_summary_v0.2.json',
  );
  const newProbeResults = readJson(`${NEW_OUTPUT}/gauteng_vnext_probe_results_v0.2.json`);

  const oldReady = oldMapping.filter(row => row.projection_status === 'projection_ready');
  const newReady = newMapping.filter(row => row.projection_status === 'projection_ready');
  const oldExact = groupBy(oldReady, exactKey);
  const newExact = groupBy(newReady, exactKey);
  const oldRuntime = groupBy(oldReady, runtimeKey);
  const newRuntime = groupBy(newReady, runtimeKey);
  const usedNew = new Set();
  const retained = [];
  const keyRetained = [];
  const ambiguous = [];
  const removed = [];

  for (const oldEntry of oldReady) {
    const exactCandidates = newExact.get(exactKey(oldEntry)) ?? [];
    if (exactCandidates.length === 1) {
      const newEntry = exactCandidates[0];
      usedNew.add(newEntry.factual_location_id);
      retained.push({ oldEntry, newEntry });
      continue;
    }
    if (exactCandidates.length > 1) {
      ambiguous.push({ oldEntry, newEntries: exactCandidates });
      continue;
    }
    const keyCandidates = newRuntime.get(runtimeKey(oldEntry)) ?? [];
    if (keyCandidates.length === 1) {
      const newEntry = keyCandidates[0];
      usedNew.add(newEntry.factual_location_id);
      keyRetained.push({ oldEntry, newEntry });
      continue;
    }
    if (keyCandidates.length > 1) {
      ambiguous.push({ oldEntry, newEntries: keyCandidates });
      continue;
    }
    removed.push({ oldEntry });
  }

  const added = newReady
    .filter(row => !usedNew.has(row.factual_location_id))
    .map(newEntry => ({ newEntry }));
  const oldQueued = oldMapping.filter(row => row.projection_status !== 'projection_ready');
  const newQueued = newMapping.filter(row => row.projection_status !== 'projection_ready');
  const oldNames = new Map(oldProjection.rows.map(row => [normalize(row.name), row]));
  const newNames = new Map(newProjection.rows.map(row => [normalize(row.name), row]));
  const coreDiff = newProbeResults.core_probes.map(probe => ({
    probe: probe.probe,
    old_runtime_keys: oldNames.has(normalize(probe.probe))
      ? [oldNames.get(normalize(probe.probe)).runtime_natural_key]
      : [],
    new_runtime_keys: probe.runtime_rows,
    outcome: probe.outcome,
  }));

  const report = {
    report_version: 'gauteng-vnext-source-diff-v0.2',
    comparison_only: true,
    old_generated_output_used_as_vnext_source: false,
    old_authority: {
      source_status: oldRecovery.status,
      source_recovery: 'data/geography-coverage-v0.1/source-recovery.v0.1.json',
      projection_path: `${OLD_OUTPUT}/gauteng_runtime_reference_projection_v0.2.json`,
      projection_sha256: sha256File(`${OLD_OUTPUT}/gauteng_runtime_reference_projection_v0.2.json`),
      mapping_path: `${OLD_OUTPUT}/gauteng_factual_runtime_mapping_v0.2.jsonl`,
      mapping_sha256: sha256File(`${OLD_OUTPUT}/gauteng_factual_runtime_mapping_v0.2.jsonl`),
      disposition_path: `${OLD_OUTPUT}/gauteng_coverage_disposition_v0.1.json`,
      disposition_sha256: sha256File(`${OLD_OUTPUT}/gauteng_coverage_disposition_v0.1.json`),
      runtime_row_count: oldProjection.rows.length,
      factual_mapping_count: oldMapping.length,
      ready_identity_count: oldReady.length,
      queued_identity_count: oldQueued.length,
    },
    new_authority: {
      source_snapshot_id: newSourceSummary.source_snapshot_id,
      source_summary_path:
        'data/gauteng-source-authority-v0.2/gauteng_source_build_summary_v0.2.json',
      projection_path: `${NEW_OUTPUT}/gauteng_runtime_reference_projection_v0.3.json`,
      projection_sha256: sha256File(`${NEW_OUTPUT}/gauteng_runtime_reference_projection_v0.3.json`),
      mapping_path: `${NEW_OUTPUT}/gauteng_factual_runtime_mapping_v0.3.jsonl`,
      mapping_sha256: sha256File(`${NEW_OUTPUT}/gauteng_factual_runtime_mapping_v0.3.jsonl`),
      disposition_path: `${NEW_OUTPUT}/gauteng_coverage_disposition_v0.2.json`,
      disposition_sha256: sha256File(`${NEW_OUTPUT}/gauteng_coverage_disposition_v0.2.json`),
      runtime_row_count: newProjection.rows.length,
      factual_mapping_count: newMapping.length,
      ready_identity_count: newReady.length,
      queued_identity_count: newQueued.length,
    },
    summary: {
      old_runtime_rows_removed_or_not_replaced: removed.length,
      old_ready_rows_retained_by_semantics: retained.length,
      old_ready_rows_retained_by_runtime_key: keyRetained.length,
      old_ready_rows_ambiguous: ambiguous.length,
      new_ready_rows_without_old_semantic_match: added.length,
      old_to_new_factual_count_delta: newMapping.length - oldMapping.length,
      old_to_new_runtime_row_delta: newProjection.rows.length - oldProjection.rows.length,
      old_queue_delta: newQueued.length - oldQueued.length,
    },
    disposition_change: {
      old: oldDisposition.summary,
      new: newDisposition.summary,
    },
    core_probe_diff: coreDiff,
    samples: {
      removed_or_not_replaced: publicSample(removed),
      retained_by_runtime_key: publicSample(keyRetained),
      added: publicSample(added),
      ambiguous: ambiguous.slice(0, 25).map(value => ({
        old_factual_location_id: value.oldEntry.factual_location_id,
        old_name: value.oldEntry.factual_preferred_name,
        old_runtime_natural_key: value.oldEntry.runtime_natural_key,
        new_candidates: value.newEntries.map(entry => ({
          factual_location_id: entry.factual_location_id,
          name: entry.factual_preferred_name,
          runtime_natural_key: entry.runtime_natural_key,
        })),
      })),
    },
  };
  fs.writeFileSync(
    path.join(ROOT, `${NEW_OUTPUT}/gauteng_vnext_diff_v0.2.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report.summary, null, 2));
}

main();
