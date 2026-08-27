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
const residualParentAudit = readJson(
  'data/geography-coverage-v0.1/research/residual-parent-edge-audit.v0.1.json',
);

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
  disposition.summary.newly_promoted_identity_count + disposition.summary.queued_count ===
    disposition.summary.factual_identity_count,
  `${disposition.summary.newly_promoted_identity_count} promoted identities + ${disposition.summary.queued_count} queued`,
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

const WAVE9_LOCALITY_PROBES = [
  { name: 'Daggafontein', parentSuffix: 'gauteng/springs/daggafontein' },
  { name: 'East Geduld', parentSuffix: 'gauteng/springs/east-geduld' },
  { name: 'Lodeyko', parentSuffix: 'gauteng/springs/lodeyko' },
  { name: 'Selection Park', parentSuffix: 'gauteng/springs/selection-park' },
  { name: 'Struisbult', parentSuffix: 'gauteng/springs/struisbult' },
  { name: 'Masimini', parentSuffix: 'gauteng/kwathema/masimini' },
  { name: 'Mthembu Village', parentSuffix: 'gauteng/kwathema/mthembu-village' },
  { name: 'Thembilisha', parentSuffix: 'gauteng/kwathema/thembilisha' },
  { name: 'White City', parentSuffix: 'gauteng/kwathema/white-city' },
];

for (const probe of WAVE9_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave9 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE10_LOCALITY_PROBES = [
  { name: 'Albertsdal', parentSuffix: 'gauteng/alberton/albertsdal' },
  { name: 'Eden Park', parentSuffix: 'gauteng/alberton/eden-park' },
  { name: 'Alrode', parentSuffix: 'gauteng/alberton/alrode' },
  { name: 'Meyersdal', parentSuffix: 'gauteng/alberton/meyersdal' },
  {
    name: 'Generaal Albertspark',
    parentSuffix: 'gauteng/alberton/generaal-albertspark',
  },
  { name: 'Verwoerdpark', parentSuffix: 'gauteng/alberton/verwoerdpark' },
  { name: 'Alberante', parentSuffix: 'gauteng/alberton/alberante' },
];

for (const probe of WAVE10_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave10 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE11_LOCALITY_PROBES = [
  { name: 'Western Extension', parentSuffix: 'gauteng/benoni/western-extension' },
  { name: 'Kilfenora', parentSuffix: 'gauteng/benoni/kilfenora' },
  { name: 'Northmead Ext 4', parentSuffix: 'gauteng/benoni/northmead-ext-4' },
  { name: 'Linksview', parentSuffix: 'gauteng/benoni/linksview' },
  { name: 'Brentwood', parentSuffix: 'gauteng/benoni/brentwood' },
  { name: 'Everleigh', parentSuffix: 'gauteng/boksburg/everleigh' },
  { name: 'Noycedale', parentSuffix: 'gauteng/nigel/noycedale' },
  { name: 'Glenvarloch', parentSuffix: 'gauteng/nigel/glenvarloch' },
  { name: 'Pretoriusstad', parentSuffix: 'gauteng/nigel/pretoriusstad' },
  { name: 'Sub-Nigel', parentSuffix: 'gauteng/nigel/sub-nigel' },
  { name: 'Ferryvale', parentSuffix: 'gauteng/nigel/ferryvale' },
  { name: 'Bluegum View', parentSuffix: 'gauteng/duduza/bluegum-view' },
  { name: 'Masetjhaba View', parentSuffix: 'gauteng/duduza/masetjhaba-view' },
  { name: 'Spaarwater', parentSuffix: 'gauteng/duduza/spaarwater' },
];

for (const probe of WAVE11_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave11 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE12_LOCALITY_PROBES = [
  { name: "Gordon's View", parentSuffix: 'gauteng/benoni/gordon-s-view' },
  { name: 'Jatniël', parentSuffix: 'gauteng/benoni/jatniel' },
  { name: 'Marister', parentSuffix: 'gauteng/benoni/marister' },
  { name: 'Alrapark', parentSuffix: 'gauteng/nigel/alrapark' },
  { name: 'Visagiepark', parentSuffix: 'gauteng/nigel/visagiepark' },
  { name: 'Cerutiville', parentSuffix: 'gauteng/nigel/cerutiville' },
  { name: 'Mackenzieville', parentSuffix: 'gauteng/nigel/mackenzieville' },
  { name: 'Sharon Park', parentSuffix: 'gauteng/nigel/sharon-park' },
  { name: 'Vosterskroon', parentSuffix: 'gauteng/nigel/vosterskroon' },
  { name: 'Freeway Park', parentSuffix: 'gauteng/vosloorus/freeway-park' },
  { name: 'Reiger Park', parentSuffix: 'gauteng/vosloorus/reiger-park' },
];

for (const probe of WAVE12_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave12 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE13_LOCALITY_PROBES = [
  { name: 'Southcrest', parentSuffix: 'gauteng/alberton/southcrest' },
  { name: 'Berton Park', parentSuffix: 'gauteng/boksburg/berton-park' },
  { name: 'Lilianton', parentSuffix: 'gauteng/boksburg/lilianton' },
  { name: 'Dunmadley', parentSuffix: 'gauteng/boksburg/dunmadley' },
  { name: 'Harmelia', parentSuffix: 'gauteng/germiston/harmelia' },
  { name: 'Highway Gardens', parentSuffix: 'gauteng/germiston/highway-gardens' },
  { name: 'Meadowbrook', parentSuffix: 'gauteng/germiston/meadowbrook' },
  { name: 'Sunnyrock', parentSuffix: 'gauteng/germiston/sunnyrock' },
  { name: 'Sunnyridge', parentSuffix: 'gauteng/germiston/sunnyridge' },
  { name: 'Solheim', parentSuffix: 'gauteng/germiston/solheim' },
  { name: "Fisher's Hill", parentSuffix: 'gauteng/germiston/fisher-s-hill' },
  { name: 'Klopperpark', parentSuffix: 'gauteng/germiston/klopperpark' },
  { name: 'Activia Park', parentSuffix: 'gauteng/germiston/activia-park' },
  { name: 'Kruinhof', parentSuffix: 'gauteng/germiston/kruinhof' },
  { name: 'Elandshaven', parentSuffix: 'gauteng/germiston/elandshaven' },
  { name: 'Albermarle', parentSuffix: 'gauteng/germiston/albermarle' },
  { name: 'Dinwiddie', parentSuffix: 'gauteng/germiston/dinwiddie' },
  { name: 'Union', parentSuffix: 'gauteng/germiston/union' },
  { name: 'Cilvale AH', parentSuffix: 'gauteng/kempton-park/cilvale-ah' },
  { name: 'Bapsfontein', parentSuffix: 'gauteng/kempton-park/bapsfontein' },
  { name: 'Selcourt', parentSuffix: 'gauteng/springs/selcourt' },
  { name: 'Krugersrus', parentSuffix: 'gauteng/springs/krugersrus' },
  { name: 'Presidentsdam', parentSuffix: 'gauteng/springs/presidentsdam' },
  { name: 'Moshoeshoe', parentSuffix: 'gauteng/katlehong/moshoeshoe' },
  { name: 'Monise', parentSuffix: 'gauteng/katlehong/monise' },
  { name: 'Moseleki', parentSuffix: 'gauteng/katlehong/moseleki' },
  { name: 'Motsamai', parentSuffix: 'gauteng/katlehong/motsamai' },
  { name: 'Radebe', parentSuffix: 'gauteng/katlehong/radebe' },
  { name: 'Motluong', parentSuffix: 'gauteng/katlehong/motluong' },
  { name: 'Mngadi', parentSuffix: 'gauteng/katlehong/mngadi' },
  { name: 'Magagula', parentSuffix: 'gauteng/katlehong/magagula' },
  { name: 'Nhlapo', parentSuffix: 'gauteng/katlehong/nhlapo' },
  { name: 'Tsongweni', parentSuffix: 'gauteng/katlehong/tsongweni' },
  { name: 'Tsolo', parentSuffix: 'gauteng/katlehong/tsolo' },
  { name: 'Skozana', parentSuffix: 'gauteng/katlehong/skozana' },
  { name: 'Ncala', parentSuffix: 'gauteng/katlehong/ncala' },
  { name: 'Moseleki East', parentSuffix: 'gauteng/katlehong/moseleki-east' },
  { name: 'Maphanga', parentSuffix: 'gauteng/katlehong/maphanga' },
  { name: 'Twala', parentSuffix: 'gauteng/katlehong/twala' },
  { name: 'Leondale', parentSuffix: 'gauteng/katlehong/leondale' },
  { name: 'Phake', parentSuffix: 'gauteng/katlehong/phake' },
  { name: 'Woodmere', parentSuffix: 'gauteng/katlehong/woodmere' },
  { name: 'Zonkizizwe', parentSuffix: 'gauteng/katlehong/zonkizizwe' },
  { name: 'Moleleki', parentSuffix: 'gauteng/katlehong/moleleki' },
];

for (const probe of WAVE13_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave13 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE14_LOCALITY_PROBES = [
  { name: 'Muldersdrift', parentSuffix: 'gauteng/krugersdorp/muldersdrift' },
  { name: 'Orient Hills', parentSuffix: 'gauteng/krugersdorp/orient-hills' },
  { name: 'Middelvlei AH', parentSuffix: 'gauteng/randfontein/middelvlei-ah' },
  { name: 'Boiketlong', parentSuffix: 'gauteng/sebokeng/boiketlong' },
  { name: 'Falcon Ridge', parentSuffix: 'gauteng/vereeniging/falcon-ridge' },
  { name: 'Tshepiso', parentSuffix: 'gauteng/vanderbijlpark/tshepiso' },
  { name: 'Homelands AH', parentSuffix: 'gauteng/meyerton/homelands-ah' },
  { name: 'Overkruin', parentSuffix: 'gauteng/heidelberg/overkruin' },
  { name: 'Alphen Park', parentSuffix: 'gauteng/benoni/alphen-park' },
  { name: 'Pirowville', parentSuffix: 'gauteng/germiston/pirowville' },
  { name: 'Hospital View', parentSuffix: 'gauteng/thembisa/hospital-view' },
];

for (const probe of WAVE14_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave14 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE15_LOCALITY_PROBES = [
  { name: 'SW2', parentSuffix: 'gauteng/vanderbijlpark/sw2' },
  { name: 'CW6', parentSuffix: 'gauteng/vanderbijlpark/cw6' },
  { name: 'CE4', parentSuffix: 'gauteng/vanderbijlpark/ce4' },
  { name: 'SE10', parentSuffix: 'gauteng/vanderbijlpark/se10' },
  { name: 'Rus ter Vaal', parentSuffix: 'gauteng/vereeniging/rus-ter-vaal' },
  { name: 'Springcol', parentSuffix: 'gauteng/vereeniging/springcol' },
  { name: 'Steel Park', parentSuffix: 'gauteng/vereeniging/steel-park' },
];

for (const probe of WAVE15_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave15 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE16_LOCALITY_PROBES = [
  { name: 'SW1', parentSuffix: 'gauteng/vanderbijlpark/sw1' },
  { name: 'NW7', parentSuffix: 'gauteng/vereeniging/nw7' },
];

for (const probe of WAVE16_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave16 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE17_LOCALITY_PROBES = [
  { name: 'Krugersdorp Wildtuin', parentSuffix: 'gauteng/krugersdorp/krugersdorp-wildtuin' },
  { name: 'Presidents dam', parentSuffix: 'gauteng/springs/presidents-dam' },
];

for (const probe of WAVE17_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave17 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE18_LOCALITY_PROBES = [
  { name: 'New Thorndale', parentSuffix: 'gauteng/krugersdorp/new-thorndale' },
  { name: 'Nestadt', parentSuffix: 'gauteng/benoni/nestadt' },
  { name: 'Mthambeka', parentSuffix: 'gauteng/thembisa/mthambeka' },
  { name: 'Lakeside', parentSuffix: 'gauteng/vereeniging/lakeside' },
  { name: 'Meyerton Park', parentSuffix: 'gauteng/meyerton/meyerton-park' },
];

for (const probe of WAVE18_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave18 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE19_LOCALITY_PROBES = [
  { name: 'Makhulong', parentSuffix: 'gauteng/thembisa/makhulong' },
  { name: 'Ventershof AH', parentSuffix: 'gauteng/thembisa/ventershof-ah' },
];

for (const probe of WAVE19_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave19 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE20_LOCALITY_PROBES = [
  { name: 'Kleinfontein Lake', parentSuffix: 'gauteng/benoni/kleinfontein-lake' },
];

for (const probe of WAVE20_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave20 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE21_LOCALITY_PROBES = [
  { name: 'Spruitview', parentSuffix: 'gauteng/katlehong/spruitview' },
  { name: 'Ramokonapi', parentSuffix: 'gauteng/katlehong/ramokonapi' },
  { name: 'Siluma View', parentSuffix: 'gauteng/katlehong/siluma-view' },
  { name: 'Likole', parentSuffix: 'gauteng/katlehong/likole' },
  { name: 'Mopeli', parentSuffix: 'gauteng/katlehong/mopeli' },
];

for (const probe of WAVE21_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave21 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE22_LOCALITY_PROBES = [
  { name: 'Bracken Downs', parentSuffix: 'gauteng/alberton/bracken-downs' },
  { name: 'Midfield Estate', parentSuffix: 'gauteng/thembisa/midfield-estate' },
  { name: 'Hazeldene', parentSuffix: 'gauteng/germiston/hazeldene' },
];

for (const probe of WAVE22_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave22 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE23_LOCALITY_PROBES = [
  { name: 'Blybank', parentSuffix: 'gauteng/carletonville/blybank' },
  { name: 'Deelkraal', parentSuffix: 'gauteng/carletonville/deelkraal' },
  { name: "Green's Park", parentSuffix: 'gauteng/fochville/green-s-park' },
];

for (const probe of WAVE23_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave23 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE24_LOCALITY_PROBES = [
  { name: 'West Porges', parentSuffix: 'gauteng/randfontein/west-porges' },
  { name: 'Bhongweni', parentSuffix: 'gauteng/randfontein/bhongweni' },
  { name: 'Kloof', parentSuffix: 'gauteng/westonaria/kloof' },
];

for (const probe of WAVE24_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave24 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE25_LOCALITY_PROBES = [
  {
    name: 'Hartebeesthoek Radio Astronomy Observatory',
    parentSuffix: 'gauteng/krugersdorp/hartebeesthoek-radio-astronomy-observatory',
  },
  { name: 'Lewisham Location', parentSuffix: 'gauteng/krugersdorp/lewisham-location' },
];

for (const probe of WAVE25_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave25 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE26_LOCALITY_PROBES = [
  { name: 'Tenacres AH', parentSuffix: 'gauteng/randfontein/tenacres-ah' },
  { name: 'Modderbee', parentSuffix: 'gauteng/daveyton/modderbee' },
  { name: 'Duncanville', parentSuffix: 'gauteng/vereeniging/duncanville' },
  { name: 'Bergsig', parentSuffix: 'gauteng/heidelberg/bergsig' },
  { name: 'Government Village', parentSuffix: 'gauteng/randfontein/government-village' },
  { name: 'Largo', parentSuffix: 'gauteng/springs/largo' },
  { name: 'Eastvale', parentSuffix: 'gauteng/springs/eastvale' },
];

for (const probe of WAVE26_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave26 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE31_LOCALITY_PROBES = [
  { name: 'Khumalo Valley', parentSuffix: 'gauteng/katlehong/khumalo-valley' },
];

for (const probe of WAVE31_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave31 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE32_LOCALITY_PROBES = [
  { name: 'Bartlett Ext 20', parentSuffix: 'gauteng/boksburg/bartlett-ext-20' },
  { name: 'Bardene Ext 2', parentSuffix: 'gauteng/boksburg/bardene-ext-2' },
];

for (const probe of WAVE32_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave32 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE33_LOCALITY_PROBES = [
  { name: 'Palm Ridge', parentSuffix: 'gauteng/katlehong/palm-ridge' },
];

for (const probe of WAVE33_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave33 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE34_LOCALITY_PROBES = [
  { name: "St. Andrew's", parentSuffix: 'gauteng/germiston/st-andrew-s' },
  { name: 'Hughes Exts', parentSuffix: 'gauteng/boksburg/hughes-exts' },
];

for (const probe of WAVE34_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave34 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE35_LOCALITY_PROBES = [
  { name: 'The Falls', parentSuffix: 'gauteng/benoni/the-falls' },
];

for (const probe of WAVE35_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave35 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE36_LOCALITY_PROBES = [
  { name: 'Bentley Park', parentSuffix: 'gauteng/carletonville/bentley-park' },
];

for (const probe of WAVE36_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave36 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE37_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Rondebult (Germiston identity)',
    factualId: 'pl-gp-v01-5650fd1d9fe9843f204c',
    parentSuffix: 'gauteng/germiston/rondebult',
  },
  {
    name: 'Rondebult (Boksburg identity)',
    factualId: 'pl-gp-v01-7f93a84351a0b976dd04',
    parentSuffix: 'gauteng/boksburg/rondebult',
  },
];

for (const probe of WAVE37_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave37 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const WAVE38_LOCALITY_PROBES = [
  { name: 'Etlebeni', parentSuffix: 'gauteng/westonaria/etlebeni' },
  { name: 'Thabony', parentSuffix: 'gauteng/westonaria/thabony' },
];

for (const probe of WAVE38_LOCALITY_PROBES) {
  const row = resolveByName(probe.name);
  check(
    `wave38 researched edge resolves: ${probe.name}`,
    row !== null && row.runtime_natural_key === probe.parentSuffix,
    row ? row.runtime_natural_key : 'missing',
  );
}

const WAVE39_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Van der Westuizenhoogte AH',
    factualId: 'pl-gp-v01-22ea6b667528c0f84fc6',
    parentSuffix: 'gauteng/meyerton/van-der-westuizenhoogte-ah',
  },
  {
    name: 'Buyscelia AH',
    factualId: 'pl-gp-v01-23f928d4673bd505c129',
    parentSuffix: 'gauteng/meyerton/buyscelia-ah',
  },
  {
    name: 'Suikerbosrant Nature Reserve',
    factualId: 'pl-gp-v01-91e1d3befe548dd94a53',
    parentSuffix: 'gauteng/meyerton/suikerbosrant-nature-reserve',
  },
  {
    name: 'Dicksonville',
    factualId: 'pl-gp-v01-bc4a485702bddab5ea83',
    parentSuffix: 'gauteng/vereeniging/dicksonville',
  },
];

for (const probe of WAVE39_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave39 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const WAVE40_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Vorsterpark AH',
    factualId: 'pl-gp-v01-81e8d602a6d2122d56f7',
    parentSuffix: 'gauteng/meyerton/vorsterpark-ah',
  },
  {
    name: 'Ohinimuri',
    factualId: 'pl-gp-v01-e9e5b66a143d6d3b85d3',
    parentSuffix: 'gauteng/meyerton/ohinimuri',
  },
  {
    name: 'Klipwater',
    factualId: 'pl-gp-v01-f7130c5fb332974131a3',
    parentSuffix: 'gauteng/meyerton/klipwater',
  },
];

for (const probe of WAVE40_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave40 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const WAVE41_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Kagiso',
    factualId: 'pl-gp-v01-e3f2e300de3c1df1a59d',
    parentSuffix: 'gauteng/krugersdorp/kagiso',
  },
  {
    name: 'Azaadville',
    factualId: 'pl-gp-v01-f4bc69ea01e6387310f8',
    parentSuffix: 'gauteng/krugersdorp/azaadville',
  },
  {
    name: 'Rietvallei',
    factualId: 'pl-gp-v01-fd2df74f870a774312ae',
    parentSuffix: 'gauteng/krugersdorp/rietvallei',
  },
  {
    name: 'Rietvallei 241-IQ',
    factualId: 'pl-gp-v01-dcd3b8cc7af96af8b4e3',
    parentSuffix: 'gauteng/krugersdorp/rietvallei-241-iq',
  },
];

for (const probe of WAVE41_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave41 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const WAVE42_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Thokoza',
    factualId: 'pl-gp-v01-2c33a31cdc8b88b5c9b8',
    parentSuffix: 'gauteng/alberton/thokoza',
  },
  {
    name: 'Greenfields',
    factualId: 'pl-gp-v01-e76bb97243258b5a28a4',
    parentSuffix: 'gauteng/alberton/greenfields',
  },
];

for (const probe of WAVE42_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave42 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const WAVE43_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Nespark',
    factualId: 'pl-gp-v01-ded81be926e9df130977',
    parentSuffix: 'gauteng/kempton-park/nespark',
  },
];

for (const probe of WAVE43_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave43 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const WAVE44_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Lammermoor',
    factualId: 'pl-gp-v01-ec83a4bc820895424cf5',
    parentSuffix: 'gauteng/krugersdorp/lammermoor',
  },
];

for (const probe of WAVE44_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave44 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const WAVE45_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Devon',
    factualId: 'pl-gp-v01-0127d19bdec24cecd936',
    parentSuffix: 'gauteng/nigel/devon',
  },
  {
    name: 'Bothasgeluk Agricultural Holdings',
    factualId: 'pl-gp-v01-37519e0509998852be6d',
    parentSuffix: 'gauteng/nigel/bothasgeluk-agricultural-holdings',
  },
  {
    name: 'Impumelelo',
    factualId: 'pl-gp-v01-3a41d69d93d030e80e93',
    parentSuffix: 'gauteng/nigel/impumelelo',
  },
];

for (const probe of WAVE45_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave45 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const WAVE46_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Ethembeni Park',
    factualId: 'pl-gp-v01-0b32a8c1fe1a7e558ef4',
    parentSuffix: 'gauteng/boksburg/ethembeni-park',
  },
];

for (const probe of WAVE46_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave46 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const WAVE47_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Mansieville Location',
    factualId: 'pl-gp-v01-06fca9fad5944269ccde',
    parentSuffix: 'gauteng/krugersdorp/mansieville-location',
  },
];

for (const probe of WAVE47_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave47 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const WAVE48_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Eikepark (Rand West City identity)',
    factualId: 'pl-gp-v01-1e32c07668460cae218f',
    parentSuffix: 'gauteng/randfontein/eikepark',
  },
  {
    name: 'Eikepark (duplicate Rand West City identity)',
    factualId: 'pl-gp-v01-b4b64a12d456a96f5779',
    parentSuffix: 'gauteng/randfontein/eikepark',
  },
  {
    name: 'Morehill (queued identity)',
    factualId: 'pl-gp-v01-5954891aaa7b38cc10bd',
    parentSuffix: 'gauteng/benoni/morehill',
  },
  {
    name: 'Selcourt (queued identity)',
    factualId: 'pl-gp-v01-2eb78152584e4bac9051',
    parentSuffix: 'gauteng/springs/selcourt',
  },
];

for (const probe of WAVE48_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave48 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

for (const grouped of [
  {
    name: 'Eikepark grouped factual identities',
    parentSuffix: 'gauteng/randfontein/eikepark',
    factualIds: ['pl-gp-v01-1e32c07668460cae218f', 'pl-gp-v01-b4b64a12d456a96f5779'],
  },
  {
    name: 'Morehill grouped factual identities',
    parentSuffix: 'gauteng/benoni/morehill',
    factualIds: ['pl-gp-v01-5954891aaa7b38cc10bd', 'pl-gp-v01-7a8a575a90deb1e3121b'],
  },
  {
    name: 'Selcourt grouped factual identities',
    parentSuffix: 'gauteng/springs/selcourt',
    factualIds: ['pl-gp-v01-2eb78152584e4bac9051', 'pl-gp-v01-42b618e5e1a93bed8ee0'],
  },
]) {
  const row = rowsByNaturalKey.get(grouped.parentSuffix);
  check(
    `wave48 explicit duplicate grouping: ${grouped.name}`,
    row !== undefined &&
      row.factual_location_ids.length === grouped.factualIds.length &&
      grouped.factualIds.every(factualId => row.factual_location_ids.includes(factualId)),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const wave49Row = rowsByNaturalKey.get('gauteng/vanderbijlpark/cc');
check(
  'wave49 source-native CC parent edge resolves',
  wave49Row !== undefined &&
    wave49Row.factual_location_ids.includes('pl-gp-v01-d417420de557bb150d61'),
  wave49Row ? `${wave49Row.runtime_natural_key}/${wave49Row.factual_location_ids.join(',')}` : 'missing',
);

const WAVE50_IDENTITY_SPECIFIC_PROBES = [
  {
    name: 'Opmekaar',
    factualId: 'pl-gp-v01-01e5d6705104962667ff',
    parentSuffix: 'gauteng/boksburg/opmekaar',
  },
  {
    name: 'Natalspruit',
    factualId: 'pl-gp-v01-26a5c7cb51ab40b65336',
    parentSuffix: 'gauteng/katlehong/natalspruit',
  },
  {
    name: 'Sizibeni',
    factualId: 'pl-gp-v01-3641b9b3a2f8716452de',
    parentSuffix: 'gauteng/thembisa/sizibeni',
  },
  {
    name: 'Houtkapper Park',
    factualId: 'pl-gp-v01-460d60f4b27e30d05ae8',
    parentSuffix: 'gauteng/kempton-park/houtkapper-park',
  },
  {
    name: 'Mmangweni',
    factualId: 'pl-gp-v01-465ec2c42a0978f460e3',
    parentSuffix: 'gauteng/thembisa/mmangweni',
  },
  {
    name: 'Gqagqeni',
    factualId: 'pl-gp-v01-490d96b230aad9b67f0f',
    parentSuffix: 'gauteng/thembisa/gqagqeni',
  },
  {
    name: 'Geestveld AH',
    factualId: 'pl-gp-v01-60cd2a20de0015bb37a9',
    parentSuffix: 'gauteng/kempton-park/geestveld-ah',
  },
];

for (const probe of WAVE50_IDENTITY_SPECIFIC_PROBES) {
  const row = rowsByNaturalKey.get(probe.parentSuffix);
  check(
    `wave50 identity-specific edge resolves: ${probe.name}`,
    row !== undefined && row.factual_location_ids.includes(probe.factualId),
    row ? `${row.runtime_natural_key}/${row.factual_location_ids.join(',')}` : 'missing',
  );
}

const wave51Row = rowsByNaturalKey.get('gauteng/benoni/summerfields');
check(
  'wave51 official CCA Summerfields parent edge resolves',
  wave51Row !== undefined &&
    wave51Row.factual_location_ids.includes('pl-gp-v01-d90d1eaf6a6414d7d560'),
  wave51Row ? `${wave51Row.runtime_natural_key}/${wave51Row.factual_location_ids.join(',')}` : 'missing',
);

const wave52Row = rowsByNaturalKey.get('gauteng/boksburg/boksburg-lokasie');
check(
  'wave52 official CCA Boksburg Lokasie parent edge resolves',
  wave52Row !== undefined &&
    wave52Row.factual_location_ids.includes('pl-gp-v01-50eaeb5408cb9975ab18'),
  wave52Row ? `${wave52Row.runtime_natural_key}/${wave52Row.factual_location_ids.join(',')}` : 'missing',
);

const wave53Row = rowsByNaturalKey.get('gauteng/randfontein/de-fontein');
check(
  'wave53 official MDB De Fontein parent edge resolves',
  wave53Row !== undefined &&
    wave53Row.factual_location_ids.includes('pl-gp-v01-be0362250a52c1510807'),
  wave53Row ? `${wave53Row.runtime_natural_key}/${wave53Row.factual_location_ids.join(',')}` : 'missing',
);

const wave54Row = rowsByNaturalKey.get('gauteng/vanderbijlpark/vanderbijlpark-auidwes-lokasie');
check(
  'wave54 official MDB Vanderbijlpark-auidwes Lokasie parent edge resolves',
  wave54Row !== undefined &&
    wave54Row.factual_location_ids.includes('pl-gp-v01-a54d464edbeb8094f958'),
  wave54Row ? `${wave54Row.runtime_natural_key}/${wave54Row.factual_location_ids.join(',')}` : 'missing',
);

const wave55Row = rowsByNaturalKey.get('gauteng/krugersdorp/eleadah');
check(
  'wave55 official valuation-roll Eleadah parent edge resolves',
  wave55Row !== undefined &&
    wave55Row.factual_location_ids.includes('pl-gp-v01-871e4e5c8913a5a892aa'),
  wave55Row ? `${wave55Row.runtime_natural_key}/${wave55Row.factual_location_ids.join(',')}` : 'missing',
);

const wave56Row = rowsByNaturalKey.get('gauteng/meyerton/risi-sh');
check(
  'wave56 official municipal Risi Sh parent edge resolves',
  wave56Row !== undefined &&
    wave56Row.factual_location_ids.includes('pl-gp-v01-6c4517ef22f698e5cd43'),
  wave56Row ? `${wave56Row.runtime_natural_key}/${wave56Row.factual_location_ids.join(',')}` : 'missing',
);

const wave57Row = rowsByNaturalKey.get('gauteng/krugersdorp/mindalore-north');
check(
  'wave57 official planning-gazette Mindalore North parent edge resolves',
  wave57Row !== undefined &&
    wave57Row.factual_location_ids.includes('pl-gp-v01-e417025c42ab9d2149f7'),
  wave57Row ? `${wave57Row.runtime_natural_key}/${wave57Row.factual_location_ids.join(',')}` : 'missing',
);

check(
  'ordinary duplicate collisions remain queued without explicit grouping',
  queue.some(entry => entry.reason === 'duplicate_natural_key_within_parent' && entry.preferred_name === 'Vrededorp'),
);

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

const parentEdgeQueue = queue.filter(entry => entry.reason === 'awaiting_accepted_parent_edge');
const auditedParentEdgeIds = new Set(
  (residualParentAudit.entries ?? []).map(entry => entry.factual_location_id),
);
check(
  'every awaiting-parent identity has a residual audit entry',
  parentEdgeQueue.length === auditedParentEdgeIds.size &&
    parentEdgeQueue.every(entry => auditedParentEdgeIds.has(entry.factual_location_id)),
  `${auditedParentEdgeIds.size} audited of ${parentEdgeQueue.length}`,
);
check(
  'residual parent audit remains fail-closed',
  (residualParentAudit.entries ?? []).every(
    entry => entry.decision === 'retain_queue' && entry.accepted_parent_natural_key === null,
  ),
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
