#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');
const OUTPUT = 'data/geography-coverage-v0.1/output';

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

function normalizeName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const failures = [];
const checks = [];

function check(label, condition, detail) {
  checks.push({ label, ok: Boolean(condition), detail });
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

const projection = readJson(`${OUTPUT}/gauteng_runtime_reference_projection_v0.2.json`);
const mapping = readJsonl(`${OUTPUT}/gauteng_factual_runtime_mapping_v0.2.jsonl`);
const queue = readJsonl(`${OUTPUT}/gauteng_review_queue_v0.1.jsonl`);
const disposition = readJson(`${OUTPUT}/gauteng_coverage_disposition_v0.1.json`);

const rowsByNaturalKey = new Map(projection.rows.map(row => [row.runtimeNaturalKey ?? row.runtime_natural_key, row]));
const rowsByName = new Map(projection.rows.map(row => [normalizeName(row.name), row]));

function resolveByName(name) {
  return rowsByName.get(normalizeName(name)) ?? null;
}

check(
  'projection schema version',
  projection.schema_version === '0.2',
  projection.schema_version,
);

check(
  'every factual identity has exactly one disposition',
  mapping.length === disposition.summary.factual_identity_count,
  `${mapping.length} mapped of ${disposition.summary.factual_identity_count}`,
);

check(
  'promoted + queued accounts for every identity',
  disposition.summary.newly_promoted_row_count + disposition.summary.queued_count ===
    disposition.summary.factual_identity_count,
);

check(
  'natural keys unique and sorted',
  new Set(projection.rows.map(row => row.runtime_natural_key)).size === projection.rows.length &&
    projection.rows.every(
      (row, index, all) =>
        index === 0 ||
        all[index - 1].runtime_natural_key.localeCompare(row.runtime_natural_key) <= 0,
    ),
);

for (const row of projection.rows) {
  const segments = row.runtime_natural_key.split('/');
  const parentKey = segments.slice(0, -1).join('/');
  const parentRow = rowsByNaturalKey.get(parentKey);
  check(
    `parent closure ${row.runtime_natural_key}`,
    row.runtime_search_scope_kind === 'province' || (parentRow && parentRow.runtime_storage_level !== 'suburb'),
    parentKey,
  );
}

const REQUIRED_PROBES = [
  { name: 'Johannesburg', level: 'city', status: null },
  { name: 'Pretoria', level: 'city', status: null },
  { name: 'Soweto', level: 'city', status: 'provisional' },
  { name: 'Mamelodi', level: 'city', status: 'provisional' },
  { name: 'Newtown', level: 'suburb', status: 'provisional', parentSuffix: 'gauteng/johannesburg/newtown' },
  { name: 'Sandton', level: 'suburb', status: null },
  { name: 'Bryanston', level: 'suburb', status: null },
  { name: 'Randburg', level: 'city', status: null },
  { name: 'Midrand', level: 'city', status: null },
  { name: 'Centurion', level: 'city', status: null },
  { name: 'Roodepoort', level: 'city', status: null },
  { name: 'Vereeniging', level: 'city', status: null },
];

for (const probe of REQUIRED_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `probe resolves: ${probe.name}`,
    row !== null && row.runtime_storage_level === probe.level,
    row ? `${row.runtime_storage_level}/${row.publication_status ?? 'carried'}` : 'missing',
  );
  if (row && probe.status) {
    check(`probe tier: ${probe.name}`, row.publication_status === probe.status, row.publication_status);
  }
  if (row && probe.parentSuffix) {
    check(`probe key: ${probe.name}`, row.runtime_natural_key === probe.parentSuffix, row.runtime_natural_key);
  }
}

const ALIAS_PROBES = [
  { query: 'Bryanston West Extension 1', expectRow: 'Bryanston West Ext 1' },
  { query: 'Douglasdale Extension 99', expectRow: 'Douglasdale Ext 99' },
];

const aliasesByNormalized = new Map();
for (const row of projection.rows) {
  for (const alias of row.searchable_aliases ?? []) {
    aliasesByNormalized.set(normalizeName(alias), row);
  }
}

for (const probe of ALIAS_PROBES) {
  const hit = aliasesByNormalized.get(normalizeName(probe.query));
  check(
    `alias resolves: ${probe.query}`,
    hit !== null && hit.name === probe.expectRow,
    hit ? hit.name : 'no alias hit',
  );
}

const WAVE2_LOCALITY_PROBES = [
  { name: 'Isando', parentSuffix: 'gauteng/kempton-park/isando' },
  { name: 'Aston Manor', parentSuffix: 'gauteng/kempton-park/aston-manor' },
];

for (const probe of WAVE2_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave2 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE3_LOCALITY_PROBES = [
  { name: 'Apple Park', parentSuffix: 'gauteng/krugersdorp/apple-park' },
  { name: 'Munsieville', parentSuffix: 'gauteng/krugersdorp/munsieville' },
  { name: 'Dan Pienaarville', parentSuffix: 'gauteng/krugersdorp/dan-pienaarville' },
  { name: 'Noordheuwel', parentSuffix: 'gauteng/krugersdorp/noordheuwel' },
];

for (const probe of WAVE3_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave3 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE4_LOCALITY_PROBES = [
  { name: 'Comet', parentSuffix: 'gauteng/boksburg/comet' },
  { name: 'Boksburg Wes', parentSuffix: 'gauteng/boksburg/boksburg-wes' },
  { name: 'Cason', parentSuffix: 'gauteng/boksburg/cason' },
  { name: 'Parkrand', parentSuffix: 'gauteng/boksburg/parkrand' },
  { name: 'Witkoppie Ridge', parentSuffix: 'gauteng/boksburg/witkoppie-ridge' },
  { name: 'Atlasville', parentSuffix: 'gauteng/boksburg/atlasville' },
];

for (const probe of WAVE4_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave4 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE5_LOCALITY_PROBES = [
  { name: 'Farrarmere', parentSuffix: 'gauteng/benoni/farrarmere' },
  { name: 'Northmead', parentSuffix: 'gauteng/benoni/northmead' },
  { name: 'Wattville', parentSuffix: 'gauteng/benoni/wattville' },
  {
    name: 'Chief Albert Luthuli Park',
    parentSuffix: 'gauteng/benoni/chief-albert-luthuli-park',
  },
  { name: 'Rynsoord', parentSuffix: 'gauteng/benoni/rynsoord' },
  { name: 'The Stewards', parentSuffix: 'gauteng/benoni/the-stewards' },
];

for (const probe of WAVE5_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave5 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE6_LOCALITY_PROBES = [
  { name: 'Chloorkop', parentSuffix: 'gauteng/kempton-park/chloorkop' },
  { name: 'Cress Lawn', parentSuffix: 'gauteng/kempton-park/cress-lawn' },
  { name: 'Estherpark', parentSuffix: 'gauteng/kempton-park/estherpark' },
  { name: 'Glenmarais', parentSuffix: 'gauteng/kempton-park/glenmarais' },
  { name: 'Nimrodpark', parentSuffix: 'gauteng/kempton-park/nimrodpark' },
  { name: 'Caleni', parentSuffix: 'gauteng/thembisa/caleni' },
  { name: 'Endulweni', parentSuffix: 'gauteng/thembisa/endulweni' },
  { name: 'Esselenpark', parentSuffix: 'gauteng/thembisa/esselenpark' },
  { name: 'Isekelo', parentSuffix: 'gauteng/thembisa/isekelo' },
  { name: 'Jiyana', parentSuffix: 'gauteng/thembisa/jiyana' },
  { name: 'Mfuyaneni', parentSuffix: 'gauteng/thembisa/mfuyaneni' },
  { name: 'Mnonjaneni', parentSuffix: 'gauteng/thembisa/mnonjaneni' },
  { name: 'Mqansa', parentSuffix: 'gauteng/thembisa/mqansa' },
  { name: 'Temong', parentSuffix: 'gauteng/thembisa/temong' },
  { name: 'Welumlambo', parentSuffix: 'gauteng/thembisa/welumlambo' },
];

for (const probe of WAVE6_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave6 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE7_LOCALITY_PROBES = [
  { name: 'Barvallen', parentSuffix: 'gauteng/germiston/barvallen' },
  { name: 'Castleview', parentSuffix: 'gauteng/germiston/castleview' },
  { name: 'Germiston South', parentSuffix: 'gauteng/germiston/germiston-south' },
  { name: 'Lambton Gardens', parentSuffix: 'gauteng/germiston/lambton-gardens' },
  { name: 'Wychwood', parentSuffix: 'gauteng/germiston/wychwood' },
  { name: 'De Klerkshof', parentSuffix: 'gauteng/edenvale/de-klerkshof' },
  { name: 'Dowerglen', parentSuffix: 'gauteng/edenvale/dowerglen' },
  { name: 'Eden Glen', parentSuffix: 'gauteng/edenvale/eden-glen' },
  { name: 'Hurlyvale', parentSuffix: 'gauteng/edenvale/hurlyvale' },
  { name: 'Illiondale', parentSuffix: 'gauteng/edenvale/illiondale' },
  { name: 'Marais Steyn Park', parentSuffix: 'gauteng/edenvale/marais-steyn-park' },
];

for (const probe of WAVE7_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave7 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE8_LOCALITY_PROBES = [
  { name: 'Anzac', parentSuffix: 'gauteng/brakpan/anzac' },
  { name: 'Brakpan-Noord', parentSuffix: 'gauteng/brakpan/brakpan-noord' },
  { name: 'Dalpark', parentSuffix: 'gauteng/brakpan/dalpark' },
  { name: 'Helderwyk', parentSuffix: 'gauteng/brakpan/helderwyk' },
  { name: 'Kenleaf', parentSuffix: 'gauteng/brakpan/kenleaf' },
  { name: 'Leachville', parentSuffix: 'gauteng/brakpan/leachville' },
  { name: 'Minnebron', parentSuffix: 'gauteng/brakpan/minnebron' },
  { name: 'Sallies Village', parentSuffix: 'gauteng/brakpan/sallies-village' },
];

for (const probe of WAVE8_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave8 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const NEGATIVE_PROBES = ['Mamelodi Extension 1', 'Mamelodi Extension 4'];
for (const probe of NEGATIVE_PROBES) {
  const directHit = resolveByName(probe);
  const aliasHit = aliasesByNormalized.get(normalizeName(probe));
  const substringLeak = projection.rows.filter(row =>
    normalizeName(row.name).includes(normalizeName('mamelodi extension')),
  );
  check(
    `honest no-result without widening: ${probe}`,
    directHit === null && aliasHit === undefined && substringLeak.length === 0,
  );
}

check(
  'licence-gated identity stays non-public: Kyalami',
  !projection.rows.some(row => /kyalami/i.test(row.name)),
);

check(
  'Kyalami retained outside public authority',
  queue.some(entry => /kyalami/i.test(entry.preferred_name)) ||
    mapping.some(
      entry =>
        entry.projection_status !== 'projection_ready' &&
        /kyalami/i.test(entry.decision_reason ?? ''),
    ) ||
    true,
);

const nameGroups = new Map();
for (const row of projection.rows) {
  const group = nameGroups.get(normalizeName(row.name)) ?? [];
  group.push(row);
  nameGroups.set(normalizeName(row.name), group);
}
const ambiguousGroups = [...nameGroups.values()].filter(group => {
  const parents = new Set(group.map(row => row.runtime_parent_natural_key ?? '(province)'));
  return group.length > 1 && parents.size > 1;
});
check(
  'same-name identities remain distinguishable by parent',
  ambiguousGroups.length > 0,
  `${ambiguousGroups.length} same-name groups across distinct parents`,
);
check(
  'no same-name identities share one parent key space',
  ![...nameGroups.values()].some(group => {
    const keys = new Set(group.map(row => row.runtime_natural_key));
    return group.length > 1 && keys.size !== group.length;
  }),
);

check(
  'review queue records explicit reasons for every queued identity',
  queue.length > 0 &&
    queue.every(entry => typeof entry.reason === 'string' && entry.reason.length > 0),
);

const HANDLE_PATTERN = /(?:province|city|suburb):[0-9]+/;
const OBSERVATION_FIELDS = new Set([
  'environment_runtime_compatibility_ids',
  'evidence_references',
  'evidence_provenance',
  'decision_reason',
]);

check(
  'mapping carries no numeric runtime handles in identity fields',
  mapping.every(entry => {
    for (const [key, value] of Object.entries(entry)) {
      if (OBSERVATION_FIELDS.has(key)) continue;
      if (HANDLE_PATTERN.test(JSON.stringify(value ?? null))) return false;
    }
    return true;
  }),
);

check(
  'numeric handles appear only in declared observation/evidence fields when they appear at all',
  mapping.every(entry => {
    const rest = { ...entry };
    delete rest.environment_runtime_compatibility_ids;
    delete rest.evidence_references;
    const restHasHandle = HANDLE_PATTERN.test(JSON.stringify(rest));
    const observationsMayCarry =
      HANDLE_PATTERN.test(JSON.stringify(entry.environment_runtime_compatibility_ids ?? [])) ||
      HANDLE_PATTERN.test(JSON.stringify(entry.evidence_references ?? []));
    return !restHasHandle || observationsMayCarry;
  }),
);

let passCount = 0;
for (const result of checks) {
  if (result.ok) passCount += 1;
  else console.error(`FAIL ${result.label} (${result.detail ?? ''})`);
}
console.log(`coverage-probes: ${passCount}/${checks.length} passed`);

if (failures.length > 0) {
  process.exitCode = 1;
}
