#!/usr/bin/env node
/* global console, process */
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

const recordsByNormalizedName = new Map();
const recordsById = new Map();
for (const record of canonical) {
  recordsById.set(record.canonical_location_id, record);
  const normalized = normalizeName(record.preferred_name);
  const records = recordsByNormalizedName.get(normalized) ?? [];
  records.push(record);
  recordsByNormalizedName.set(normalized, records);
}

const resolved = [];
const matchedAlreadyProjected = [];
const notInCanonical = [];
const ambiguousCanonicalMatches = [];
const processedFactualIds = new Set();

function resolveRecord(record, name) {
  if (processedFactualIds.has(record.canonical_location_id)) {
    throw new Error(
      `Research artifact ${evidencePath} references canonical identity ${record.canonical_location_id} more than once; refusing to emit duplicate edges.`,
    );
  }
  processedFactualIds.add(record.canonical_location_id);

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
    return;
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

const identitySpecificRecords = evidence.identity_specific_records ?? [];
if (!Array.isArray(identitySpecificRecords)) {
  throw new Error(`Research artifact ${evidencePath} identity_specific_records must be an array when present.`);
}

for (const identity of identitySpecificRecords) {
  if (!identity || typeof identity.factual_location_id !== 'string') {
    throw new Error(
      `Research artifact ${evidencePath} identity_specific_records entries must declare factual_location_id.`,
    );
  }
  const record = recordsById.get(identity.factual_location_id);
  if (!record) {
    throw new Error(
      `Research artifact ${evidencePath} references unknown canonical identity ${identity.factual_location_id}; refusing to invent an edge.`,
    );
  }
  if (
    identity.preferred_name &&
    normalizeName(identity.preferred_name) !== normalizeName(record.preferred_name)
  ) {
    throw new Error(
      `Research artifact ${evidencePath} identity ${identity.factual_location_id} names ${identity.preferred_name}, but canonical preferred_name is ${record.preferred_name}; refusing to guess.`,
    );
  }
  if (record.administrative_context?.adm2?.[0]?.name !== expectedAdministrativeContext) {
    throw new Error(
      `Research artifact ${evidencePath} identity ${identity.factual_location_id} resolves to unexpected municipality ${record.administrative_context?.adm2?.[0]?.name ?? 'unknown'}; expected ${expectedAdministrativeContext}; refusing to emit an edge.`,
    );
  }
  resolveRecord(record, identity.preferred_name ?? record.preferred_name);
}

for (const name of evidence.suburb_names ?? []) {
  const normalized = normalizeName(name);
  const nameMatches = recordsByNormalizedName.get(normalized) ?? [];
  if (nameMatches.length === 0) {
    notInCanonical.push(name);
    continue;
  }

  const contextMatches = nameMatches.filter(
    record => record.administrative_context?.adm2?.[0]?.name === expectedAdministrativeContext,
  );
  if (contextMatches.length === 0) {
    const contexts = [...
      new Set(nameMatches.map(record => record.administrative_context?.adm2?.[0]?.name ?? null)),
    ];
    throw new Error(
      `Researched suburb ${name} resolves only to unexpected municipalities ${contexts.join(', ')}; expected ${expectedAdministrativeContext}; refusing to emit an edge.`,
    );
  }

  const projectedMatches = contextMatches
    .map(record => ({ record, row: projectedRowByFactualId.get(record.canonical_location_id) }))
    .filter(candidate => candidate.row);
  const matchingProjected = projectedMatches.filter(
    candidate => candidate.row.runtime_parent_natural_key === evidence.parent_natural_key,
  );

  let record;
  if (contextMatches.length === 1) {
    record = contextMatches[0];
  } else if (matchingProjected.length === 1) {
    // A repeated name can be safely referenced when exactly one same-context
    // identity is already projected under this researched parent. This keeps
    // existing evidence idempotent while refusing to guess for queued twins.
    record = matchingProjected[0].record;
  } else {
    ambiguousCanonicalMatches.push({
      name,
      factual_location_ids: contextMatches.map(candidate => candidate.canonical_location_id),
      reason: 'multiple same-context canonical identities require an identity-specific artifact',
    });
    continue;
  }

  resolveRecord(record, name);
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
    researched_names: (evidence.suburb_names ?? []).length,
    identity_specific_records: identitySpecificRecords.length,
    matched_already_projected: matchedAlreadyProjected,
    names_not_in_canonical_layer: notInCanonical,
    ambiguous_canonical_matches: ambiguousCanonicalMatches,
  },
};

fs.writeFileSync(
  path.join(ROOT, OUTPUT_DIR, `${path.basename(evidencePath, '.json')}.resolved.json`),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(
  `resolve-edges: ${resolved.length} edges for ${evidence.town}; ${matchedAlreadyProjected.length} already projected; ${notInCanonical.length} not in canonical layer`,
);
