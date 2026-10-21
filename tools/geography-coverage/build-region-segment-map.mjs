/**
 * Builds the governed region-segment compatibility map.
 *
 * The public URL of a place has always been province/region/place, where the region is the
 * familiar local label, such as Alberton, Benoni or Katlehong. The canonical Place Authority
 * asserts the municipality edge, and for some places it does not carry the town-cluster edge
 * at all. This map records the region segment we already publish, so a published URL never
 * moves under a customer.
 *
 * The map is a URL and display convention. It is not an administrative claim, and it never
 * decides whether a place exists, is searchable or is publishable.
 *
 * Usage:
 *   node tools/geography-coverage/build-region-segment-map.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECTION = join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
);
const ADMISSION = join(
  ROOT,
  'data/gauteng-place-admission-v0.1/gauteng_place_admission_v0.1.jsonl',
);
const OUTPUT = join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_region_segment_map_v0.1.json',
);

function readJsonl(path) {
  const rows = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line));
  }
  return rows;
}

export function buildRegionSegmentMap() {
  const projection = JSON.parse(readFileSync(PROJECTION, 'utf8'));
  const admitted = readJsonl(ADMISSION);

  // The projection and the admitted package carry the same places under different identity
  // namespaces, so they are joined on the preferred public name the projection recorded. A name
  // claimed by more than one Place is refused rather than guessed.
  const placesByName = new Map();
  for (const place of admitted) {
    for (const id of [place.primary_source_identity_id, ...(place.source_identity_ids || [])]) {
      if (!id) continue;
      if (!placesByName.has(id)) placesByName.set(id, place);
    }
  }
  const preferredByName = new Map();
  const NAMES = join(ROOT, 'data/gauteng-place-admission-v0.1/gauteng_place_names_v0.1.jsonl');
  for (const row of readJsonl(NAMES)) {
    if (row.name_role !== 'preferred_public') continue;
    const key = String(row.name || '')
      .trim()
      .toLowerCase();
    if (!key) continue;
    const held = preferredByName.get(key) || [];
    held.push(row.place_id);
    preferredByName.set(key, held);
  }

  const segments = {};
  let matched = 0;
  let unmatched = 0;
  for (const row of projection.rows) {
    const parts = row.runtime_natural_key.split('/');
    // A place published directly under its province has no region segment.
    if (parts.length !== 2 && parts.length !== 3) continue;
    const region = parts.length === 3 ? parts[1] : null;
    const place = parts[parts.length - 1];
    const name = String(row.name || '')
      .trim()
      .toLowerCase();
    const candidates = preferredByName.get(name) || [];
    if (candidates.length !== 1) {
      unmatched += 1;
      continue;
    }
    matched += 1;
    segments[candidates[0]] = { region, place, name: row.name };
  }

  return {
    mapVersion: 'gauteng-region-segment-v0.1',
    policy: 'published-url-compatibility',
    note: 'The region segment we already publish for each place. A URL and display convention only.',
    source: 'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
    matched,
    unmatched,
    segments,
  };
}

function main() {
  const result = buildRegionSegmentMap();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    `region segment map: ${Object.keys(result.segments).length} places (${result.matched} matched, ${result.unmatched} unmatched) -> ${OUTPUT}`,
  );
}

if (process.argv[1] && process.argv[1].endsWith('build-region-segment-map.mjs')) main();
