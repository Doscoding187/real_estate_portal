#!/usr/bin/env node
// Resolves a researched parent-evidence artifact into concrete locality parent
// edges by exact normalized-name match against the factual canonical layer.
// Only queued (awaiting_accepted_parent_edge) identities are eligible; the
// resolver never re-parents an accepted row and never invents identities.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUTPUT_DIR = 'data/geography-coverage-v0.1/output';

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

function readJsonl(relative) {
  return fs
    .readFileSync(path.join(ROOT, relative), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function normalizeName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const evidencePath = process.argv[2];
if (!evidencePath) {
  console.error('Usage: node resolve-researched-edges.mjs <research-evidence.json>');
  process.exit(1);
}
const evidence = readJson(evidencePath);
const expectedAdministrativeContext = evidence.administrative_context;
if (!expectedAdministrativeContext) {
  throw new Error(
    `Research artifact ${evidencePath} must declare administrative_context before parent edges can be resolved.`,
  );
}

const canonicalRoot =
  process.env.PL_GEOGRAPHY_CANONICAL_ROOT ||
  '/home/edwardspc/Desktop/Dev/listify-gauteng-factual-canonical-v0-1/data/gauteng-factual-canonical-v0.1/output';
const canonical = readJsonl(
  path.relative(ROOT, path.join(canonicalRoot, 'gauteng_factual_canonical_geography_v0.1.jsonl')),
);

const projection = readJson(`${OUTPUT_DIR}/gauteng_runtime_reference_projection_v0.2.json`);
const projectedRowByFactualId = new Map();
for (const row of projection.rows) {
  for (const factualId of row.factual_location_ids ?? []) {
    projectedRowByFactualId.set(factualId, row);
  }
}

const byNormalizedName = new Map();
for (const record of canonical) {
  byNormalizedName.set(normalizeName(record.preferred_name), record);
}

const resolved = [];
const matchedAlreadyProjected = [];
const notInCanonical = [];

for (const name of evidence.suburb_names) {
  const normalized = normalizeName(name);
  const record = byNormalizedName.get(normalized);
  if (!record) {
    notInCanonical.push(name);
    continue;
  }
  const projectedRow = projectedRowByFactualId.get(record.canonical_location_id);
  if (projectedRow) {
    matchedAlreadyProjected.push({
      name,
      factual_location_id: record.canonical_location_id,
      existing_parent_natural_key: projectedRow.runtime_parent_natural_key,
      parent_matches_evidence: projectedRow.runtime_parent_natural_key === evidence.parent_natural_key,
    });
    if (projectedRow.runtime_parent_natural_key === evidence.parent_natural_key) {
      resolved.push({
        factual_location_id: record.canonical_location_id,
        preferred_name: record.preferred_name,
        factual_type: record.canonical_type,
        parent_natural_key: evidence.parent_natural_key,
        evidence_class: evidence.evidence_class,
        citation: `${evidence.source.url}#${encodeURIComponent(evidence.source.section)} (retrieved ${evidence.source.retrieved})`,
      });
    }
    continue;
  }
  const context = record.administrative_context?.adm2?.[0]?.name ?? null;
  if (context !== expectedAdministrativeContext) {
    throw new Error(
      `Researched suburb ${name} resolves to ${record.canonical_location_id} under unexpected municipality ${context}; expected ${expectedAdministrativeContext}; refusing to emit an edge.`,
    );
  }
  resolved.push({
    factual_location_id: record.canonical_location_id,
    preferred_name: record.preferred_name,
    factual_type: record.canonical_type,
    parent_natural_key: evidence.parent_natural_key,
    evidence_class: evidence.evidence_class,
    citation: `${evidence.source.url}#${encodeURIComponent(evidence.source.section)} (retrieved ${evidence.source.retrieved})`,
  });
}

resolved.sort((left, right) => left.factual_location_id.localeCompare(right.factual_location_id));

const output = {
  resolved_edges_version: `${path.basename(evidencePath, '.json')}.resolved`,
  town: evidence.town,
  parent_natural_key: evidence.parent_natural_key,
  source: evidence.source,
  edge_count: resolved.length,
  edges: resolved,
  diagnostics: {
    researched_names: evidence.suburb_names.length,
    matched_already_projected: matchedAlreadyProjected,
    names_not_in_canonical_layer: notInCanonical,
  },
};

fs.writeFileSync(
  path.join(ROOT, OUTPUT_DIR, `${path.basename(evidencePath, '.json')}.resolved.json`),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(
  `resolve-edges: ${resolved.length} edges for ${evidence.town}; ${matchedAlreadyProjected.length} already projected; ${notInCanonical.length} not in canonical layer`,
);
