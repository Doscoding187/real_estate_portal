#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');
const OUTPUT_DIR = 'data/geography-coverage-v0.1/output';

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

function readJsonl(relative) {
  return fs
    .readFileSync(path.join(ROOT, relative), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function buildCoverageReport() {
  const disposition = readJson(`${OUTPUT_DIR}/gauteng_coverage_disposition_v0.1.json`);
  const projection = readJson(`${OUTPUT_DIR}/gauteng_runtime_reference_projection_v0.2.json`);
  const queue = readJsonl(`${OUTPUT_DIR}/gauteng_review_queue_v0.1.jsonl`);

  const levelCounts = { province: 0, city: 0, suburb: 0 };
  const tierCounts = { verified: 0, provisional: 0, carried_v01: 0 };
  let aliasRowCount = 0;
  let aliasTotal = 0;
  const scopeKinds = { province: 0, metro_city: 0, locality: 0 };

  for (const row of projection.rows) {
    levelCounts[row.runtime_storage_level] += 1;
    scopeKinds[row.runtime_search_scope_kind] += 1;
    if (row.publication_status === undefined) tierCounts.carried_v01 += 1;
    else tierCounts[row.publication_status] += 1;
    if ((row.searchable_aliases ?? []).length > 0) {
      aliasRowCount += 1;
      aliasTotal += row.searchable_aliases.length;
    }
  }

  const queueByReason = {};
  for (const entry of queue) {
    queueByReason[entry.reason] = (queueByReason[entry.reason] ?? 0) + 1;
  }

  const summary = disposition.summary;
  return {
    report_version: 'gauteng-coverage-status-v0.1',
    contract: 'docs/architecture/geography-coverage-contract.md',
    inputs_digests: projection.checkpoints ?? {},
    coverage: {
      factual_identity_count: summary.factual_identity_count,
      runtime_row_count: summary.runtime_row_count,
      public_catalog_coverage:
        `${((summary.runtime_row_count / summary.factual_identity_count) * 100).toFixed(1)}%`,
      newly_promoted: summary.newly_promoted_identity_count,
      newly_promoted_rows: summary.newly_promoted_row_count,
      represented_by_carried_slice: summary.represented_by_carried_count,
      queued_total: summary.queued_count,
    },
    runtime_rows: {
      by_storage_level: levelCounts,
      by_scope_kind: scopeKinds,
      by_tier: tierCounts,
      alias_rows: aliasRowCount,
      alias_forms: aliasTotal,
    },
    research_queue: {
      total: queue.length,
      by_reason: Object.fromEntries(
        Object.entries(queueByReason).sort((left, right) => right[1] - left[1]),
      ),
    },
    gates: {
      production_odbl_gate:
        'osm_only_odbl_provisional rows require founder gate before staging/production',
      search_area_activation: 'separate approval boundary; not activated here',
      materialization_targets: 'disposable worktrees only until gates clear',
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Gauteng Geography Coverage Status',
    '',
    `- Contract: ${report.contract}`,
    `- Factual identities: ${report.coverage.factual_identity_count}`,
    `- Runtime rows: ${report.coverage.runtime_row_count} (${report.coverage.public_catalog_coverage} of identities; ${report.coverage.newly_promoted} identities promoted this wave in ${report.coverage.newly_promoted_rows} new rows, ${report.coverage.represented_by_carried_slice} via founder-reviewed slice)`,
    `- Research queue: ${report.research_queue.total} identities`,
    '',
    '## Runtime rows',
    '',
    `- Storage: province=${report.runtime_rows.by_storage_level.province}, city=${report.runtime_rows.by_storage_level.city}, suburb=${report.runtime_rows.by_storage_level.suburb}`,
    `- Scope: metro_city=${report.runtime_rows.by_scope_kind.metro_city}, locality=${report.runtime_rows.by_scope_kind.locality}`,
    `- Tier: verified=${report.runtime_rows.by_tier.verified}, provisional=${report.runtime_rows.by_tier.provisional}, carried=${report.runtime_rows.by_tier.carried_v01}`,
    `- Aliases: ${report.runtime_rows.alias_forms} forms across ${report.runtime_rows.alias_rows} rows`,
    '',
    '## Research queue reasons',
    '',
    ...Object.entries(report.research_queue.by_reason).map(
      ([reason, count]) => `- ${reason}: ${count}`,
    ),
    '',
    '## Gates',
    '',
    ...Object.entries(report.gates).map(([gate, note]) => `- **${gate}**: ${note}`),
    '',
  ];
  return lines.join('\n');
}

const asJson = process.argv.includes('--json');
const report = buildCoverageReport();
if (asJson) console.log(JSON.stringify(report, null, 2));
else console.log(renderMarkdown(report));
