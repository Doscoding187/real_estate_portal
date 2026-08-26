#!/usr/bin/env node
// Wave-2 parent-edge analysis: resolve town-level parents for queued
// identities from already-ingested evidence (GeoNames hierarchy, Wikidata P131).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = process.env.PL_CATALOGUE_SOURCE_RECORDS;
if (!SRC) {
  console.error('Set PL_CATALOGUE_SOURCE_RECORDS to gauteng_source_records_v0.1.jsonl');
  process.exit(1);
}

const queue = fs
  .readFileSync(path.join(ROOT, 'data/geography-coverage-v0.1/output/gauteng_review_queue_v0.1.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));

const projection = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json'), 'utf8'),
);
const acceptedTownNames = new Set(
  projection.rows
    .filter(r => r.runtime_search_scope_kind === 'metro_city' && r.runtime_natural_key !== 'gauteng/johannesburg' && r.runtime_natural_key !== 'gauteng/pretoria')
    .map(r => r.name.trim().toLowerCase()),
);

const canonical = fs
  .readFileSync(process.env.PL_CANONICAL_GEOGRAPHY_JSONL, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line));

const recsById = new Map();
const geoNameById = new Map();
const wdLabelByQid = new Map();
for (const line of fs.readFileSync(SRC, 'utf8').split('\n')) {
  if (!line) continue;
  const r = JSON.parse(line);
  recsById.set(r.source_record_id, r);
  const gid = r.cross_identifiers?.geonames?.[0];
  if (gid && !geoNameById.has(gid)) geoNameById.set(gid, r.exact_source_name);
  // wikidata payloads: bindings carry item URIs + itemLabel; index QID -> label
  const payload = r.source_payload;
  if (r.source === 'wikidata' && payload?.bindings) {
    for (const b of payload.bindings) {
      const uri = b.item?.value ?? b.item;
      const qid = typeof uri === 'string' ? uri.split('/').pop() : null;
      const label = b.itemLabel?.value ?? b.itemLabel;
      if (qid && label) wdLabelByQid.set(qid, label);
    }
  }
}

function qidFromUri(value) {
  if (!value) return null;
  const str = typeof value === 'string' ? value : String(value?.value ?? '');
  return str.includes('wikidata') ? str.split('/').pop() : null;
}

let withEdge = 0;
const edgeCounts = {};
const samples = [];
const unresolvedParents = new Map();

for (const entry of queue) {
  if (entry.reason !== 'awaiting_accepted_parent_edge') continue;
  const record = canonical.find(c => c.canonical_location_id === entry.factual_location_id);
  if (!record) continue;

  const parentVotes = [];
  for (const srcId of record.source_record_ids ?? []) {
    const rec = recsById.get(srcId);
    if (!rec) continue;

    if (rec.source === 'geonames' && Array.isArray(rec.source_admin_context?.hierarchy)) {
      for (const h of rec.source_admin_context.hierarchy) {
        const parentName = geoNameById.get(h.parent_id);
        if (!parentName) {
          unresolvedParents.set(h.parent_id, (unresolvedParents.get(h.parent_id) ?? 0) + 1);
          continue;
        }
        const norm = parentName.trim().toLowerCase();
        if (acceptedTownNames.has(norm)) parentVotes.push({ via: 'geonames_hierarchy', town: norm });
      }
    }

    if (rec.source === 'wikidata') {
      const payload = rec.source_payload;
      for (const binding of payload?.bindings ?? []) {
        const parentQid = qidFromUri(binding.parent);
        if (!parentQid) continue;
        const label = wdLabelByQid.get(parentQid);
        if (!label) continue;
        const norm = label.trim().toLowerCase();
        if (acceptedTownNames.has(norm)) parentVotes.push({ via: 'wikidata_p131', town: norm });
      }
    }
  }

  if (parentVotes.length > 0) {
    withEdge += 1;
    const distinct = [...new Set(parentVotes.map(v => v.town))];
    edgeCounts[distinct.join('|')] = (edgeCounts[distinct.join('|')] ?? 0) + 1;
    if (samples.length < 12 && distinct.length === 1) {
      samples.push({ name: entry.preferred_name, town: distinct[0], votes: parentVotes.length });
    }
  }
}

console.log(JSON.stringify({
  queued_total: queue.filter(q => q.reason === 'awaiting_accepted_parent_edge').length,
  resolvable_now: withEdge,
  unambiguous_single_town: Object.entries(edgeCounts).filter(([k]) => !k.includes('|')).reduce((a, [, n]) => a + n, 0),
  multi_town_conflicts: Object.entries(edgeCounts).filter(([k]) => k.includes('|')).length,
  top_towns: Object.fromEntries(Object.entries(edgeCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)),
  unresolved_geonames_parents: [...unresolvedParents.entries()].slice(0, 5),
  samples,
}, null, 1));
