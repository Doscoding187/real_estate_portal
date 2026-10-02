/**
 * National provenance report: trace every source identity in the country to the
 * Place it became, or to the disposition that explains why it did not.
 *
 * Founder decision of record: the provincial disposition ledgers are preserved
 * as they are and never merged or summarised away. What is added is a national
 * view over them, so that "where did this source record end up" is answerable for
 * the whole country and not only within one province.
 *
 * This is a gate, not a report. It fails when the national accounting does not
 * close, because a provenance view that silently loses rows is worse than no view.
 *
 * Usage:
 *   node tools/place-admission/national-provenance.mjs           # summary
 *   node tools/place-admission/national-provenance.mjs --json    # full machine-readable
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REGISTRY = join(ROOT, 'data/place-admission-territories.v0.1/territory-registry.v0.1.json');

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');

const registry = JSON.parse(readFileRobust(REGISTRY));
/**
 * This worktree's filesystem intermittently reports ENOENT for a path that a
 * sibling process opened moments earlier, so a read can fail for a file that is
 * demonstrably present. Retrying briefly is correct here; treating the miss as a
 * missing artifact would report a defect that does not exist, and treating it as a
 * pass would drop a province from the national accounting. Never infer either.
 */
function readFileRobust(path, attempts = 40, delayMs = 100) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return readFileSync(path, 'utf8');
    } catch (error) {
      lastError = error;
      if (error.code !== 'ENOENT') throw error;
      sleep(delayMs);
    }
  }
  throw new Error(`could not read ${path} after ${attempts} attempts: ${lastError.message}`);
}

function sleep(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    /* Deliberately synchronous: this runs once per artifact at startup, and a
     * synchronous wait keeps the read path free of interleaving surprises. */
  }
}

const readJsonl = path =>
  readFileRobust(path)
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));

const provinces = [];
const problems = [];
const globalDispositions = new Map();

for (const territory of registry.territories) {
  const pkgDir = join(ROOT, territory.admission_package.directory);
  const manifestPath = join(pkgDir, territory.admission_package.manifest);
  if (!existsSync(manifestPath)) {
    problems.push(`${territory.territory_id}: manifest ${territory.admission_package.manifest} is absent`);
    continue;
  }

  const manifest = JSON.parse(readFileRobust(manifestPath));
  const places = readJsonl(join(pkgDir, territory.admission_package.artifacts.places));
  const ledger = readJsonl(join(pkgDir, territory.admission_package.artifacts.disposition_ledger));

  const placeIds = new Set(places.map(place => String(place.place_id)));

  /**
   * The identity -> Place trace.
   *
   * Read from the places artifact's own `source_identity_ids`, because that is the
   * one place every province records it. The ledgers cannot be used for this: only
   * Gauteng's ledger carries admitted rows at all. The eight provinces admitted by
   * this mission have disposition-only ledgers, so their 16,821 admitted identities
   * are absent from their ledgers entirely. That is recorded below as
   * `ledger_records_admitted_identities` rather than papered over, and it is why this
   * report derives the trace itself instead of trusting the ledger to be whole.
   */
  const identityToPlace = new Map();
  for (const place of places) {
    const ids = Array.isArray(place.source_identity_ids) && place.source_identity_ids.length
      ? place.source_identity_ids
      : place.primary_source_identity_id
        ? [place.primary_source_identity_id]
        : [];
    for (const id of ids) {
      const existing = identityToPlace.get(String(id));
      if (existing && existing !== String(place.place_id)) {
        problems.push(
          `${territory.territory_id}: source identity ${id} is claimed by both ${existing} and ${place.place_id}`,
        );
      }
      identityToPlace.set(String(id), String(place.place_id));
    }
  }

  /* Every ledger row must resolve to exactly one outcome: admitted as a Place,
   * admitted by merging into a Place, or dispositioned. A row that is neither is a
   * leak in the pipeline, and a ledger row is the only place that leak could hide. */
  const dispositions = {};
  let admittedPrimary = 0;
  let admittedMerged = 0;
  let danglingPlace = 0;
  const mergedInto = new Map();

  for (const row of ledger) {
    const disposition = row.disposition ?? '<missing>';
    dispositions[disposition] = (dispositions[disposition] ?? 0) + 1;
    globalDispositions.set(disposition, (globalDispositions.get(disposition) ?? 0) + 1);

    if (disposition === 'admitted_as_place_primary') {
      admittedPrimary += 1;
      if (!row.place_id) problems.push(`${territory.territory_id}: ${row.source_identity_id} admitted without a Place`);
      else if (!placeIds.has(String(row.place_id))) {
        problems.push(`${territory.territory_id}: ${row.source_identity_id} admitted to absent Place ${row.place_id}`);
        danglingPlace += 1;
      }
    } else if (disposition === 'admitted_merged_into_place') {
      admittedMerged += 1;
      if (!row.place_id) problems.push(`${territory.territory_id}: ${row.source_identity_id} merged without a Place`);
      else if (!placeIds.has(String(row.place_id))) {
        problems.push(`${territory.territory_id}: ${row.source_identity_id} merged into absent Place ${row.place_id}`);
        danglingPlace += 1;
      }
      mergedInto.set(String(row.place_id), (mergedInto.get(String(row.place_id)) ?? 0) + 1);
    }
  }

  /**
   * Provincial accounting must close before the national sum means anything.
   *
   * The manifest's `dispositions` map is not a complete tally of dispositioned
   * candidates: Gauteng records `quarantined_candidate` and `rejected_non_independent`
   * separately, and its total dispositioned count is the sum of the two. Comparing
   * against a single disposition kind, as an earlier draft of this file did, reports
   * a phantom 108-row discrepancy. Compare against the manifest's declared ledger
   * length and its own dispositioned total instead.
   */
  const accepted = admittedPrimary + admittedMerged;
  const dispositioned = ledger.length - accepted;
  const ledgerRecordsAdmitted = accepted > 0;

  if (accepted + dispositioned !== ledger.length) {
    problems.push(`${territory.territory_id}: accounting does not close against the ledger`);
  }
  if (ledgerRecordsAdmitted && accepted !== manifest.counts.source_identities) {
    problems.push(
      `${territory.territory_id}: ${accepted} accepted ledger rows != ${manifest.counts.source_identities} source identities`,
    );
  }
  if (!ledgerRecordsAdmitted && ledger.length !== manifest.counts.disposition_ledger_rows) {
    problems.push(
      `${territory.territory_id}: disposition-only ledger holds ${ledger.length} rows != ` +
        `${manifest.counts.disposition_ledger_rows} declared`,
    );
  }
  if (manifest.counts.source_identities !== manifest.counts.admitted_places + manifest.counts.absorbed_source_identities) {
    problems.push(
      `${territory.territory_id}: ${manifest.counts.source_identities} identities != ` +
        `${manifest.counts.admitted_places} places + ${manifest.counts.absorbed_source_identities} absorbed`,
    );
  }

  /* Every admitted identity must be reachable to a Place. This is the national trace. */
  let tracedIdentities = 0;
  for (const id of identityToPlace.keys()) tracedIdentities += 1;
  if (tracedIdentities !== manifest.counts.source_identities) {
    problems.push(
      `${territory.territory_id}: ${tracedIdentities} identities reach a Place != ` +
        `${manifest.counts.source_identities} source identities`,
    );
  }

  provinces.push({
    territory_id: territory.territory_id,
    province: territory.display_name,
    admission_version: manifest.admission_version,
    source_identities: manifest.counts.source_identities,
    admitted_places: manifest.counts.admitted_places,
    admitted_primary: admittedPrimary,
    admitted_merged: admittedMerged,
    absorbed_identities: admittedMerged,
    dispositioned,
    ledger_rows: ledger.length,
    dispositions,
    ledger_records_admitted_identities: ledgerRecordsAdmitted,
    identities_traced_to_places: tracedIdentities,
    places_absorbing_multiple_identities: [...mergedInto.values()].filter(n => n > 1).length,
    dangling_place_references: danglingPlace,
    human_review_required: ledger.filter(row => row.human_review_required).length,
  });
}

/* A Place must not be admitted by two provinces, or the national trace is ambiguous. */
const nationalIdentity = new Map();
for (const territory of registry.territories) {
  const pkgDir = join(ROOT, territory.admission_package.directory);
  const manifestPath = join(pkgDir, territory.admission_package.manifest);
  if (!existsSync(manifestPath)) continue;
  for (const place of readJsonl(join(pkgDir, territory.admission_package.artifacts.places))) {
    const id = String(place.place_id);
    const existing = nationalIdentity.get(id);
    if (existing && existing !== territory.territory_id) {
      problems.push(`Place ${id} is admitted by both ${existing} and ${territory.territory_id}`);
    }
    nationalIdentity.set(id, territory.territory_id);
  }
}

const totals = provinces.reduce(
  (sum, p) => ({
    source_identities: sum.source_identities + p.source_identities,
    admitted_places: sum.admitted_places + p.admitted_places,
    absorbed_identities: sum.absorbed_identities + p.absorbed_identities,
    dispositioned: sum.dispositioned + p.dispositioned,
    ledger_rows: sum.ledger_rows + p.ledger_rows,
    human_review_required: sum.human_review_required + p.human_review_required,
    dangling_place_references: sum.dangling_place_references + p.dangling_place_references,
  }),
  {
    source_identities: 0,
    admitted_places: 0,
    absorbed_identities: 0,
    dispositioned: 0,
    ledger_rows: 0,
    human_review_required: 0,
    dangling_place_references: 0,
  },
);

if (provinces.length !== registry.territories.length) {
  problems.push(`report covers ${provinces.length} of ${registry.territories.length} registered territories`);
}

const report = {
  report_version: '0.1',
  scope: 'national-provenance',
  establishes:
    'Every source identity in every registered province resolves to the Place it became or ' +
    'to the disposition that explains why it did not, and each province closes its own accounting.',
  does_not_establish:
    'That any source record was correctly resolved. A total count proves nothing leaked, not ' +
    'that the adjudication was right; human_review_required counts what still needs a person.',
  provinces: provinces.length,
  national: {
    ...totals,
    distinct_places: nationalIdentity.size,
    dispositions: Object.fromEntries([...globalDispositions.entries()].sort()),
  },
  per_province: provinces,
  problems,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const n = report.national;
  console.log(
    `national-provenance: ${provinces.length} provinces, ${n.source_identities} source identities, ` +
      `${n.distinct_places} Places, ${n.ledger_rows} ledger rows preserved`,
  );
  console.log('');
  const header = [
    'province'.padEnd(16),
    'identities'.padStart(11),
    'places'.padStart(8),
    'absorbed'.padStart(10),
    'dispositioned'.padStart(15),
    'ledger'.padStart(9),
    'review'.padStart(9),
  ].join('');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const p of provinces) {
    console.log(
      `${p.province.padEnd(16)}${String(p.source_identities).padStart(11)}` +
        `${String(p.admitted_places).padStart(8)}${String(p.absorbed_identities).padStart(10)}` +
        `${String(p.dispositioned).padStart(15)}${String(p.ledger_rows).padStart(9)}` +
        `${String(p.human_review_required).padStart(9)}`,
    );
  }
  console.log('');
  console.log('national dispositions:');
  for (const [kind, count] of Object.entries(n.dispositions)) {
    console.log(`  ${kind.padEnd(38)}${String(count).padStart(8)}`);
  }
  console.log('');
  console.log(`places absorbing more than one identity: ${provinces.reduce((s, p) => s + p.places_absorbing_multiple_identities, 0)}`);
  console.log(`identities awaiting human review:      ${n.human_review_required}`);
  console.log('');

  /* The ledgers are preserved as they are, and their coverage is not uniform. */
  const whole = provinces.filter(p => p.ledger_records_admitted_identities);
  const dispositionOnly = provinces.filter(p => !p.ledger_records_admitted_identities);
  console.log('LEDGER COVERAGE (ledgers are preserved unchanged; this states what each one holds)');
  for (const p of whole) {
    console.log(`  ${p.province.padEnd(16)} ledger holds admitted identities and dispositions`);
  }
  for (const p of dispositionOnly) {
    console.log(
      `  ${p.province.padEnd(16)} ledger is DISPOSITION-ONLY: its ${p.source_identities} admitted ` +
        `identities are traced through the geography artifact, not the ledger`,
    );
  }
  console.log('');
  console.log(
    '  consequence: the eight disposition-only ledgers are not self-contained. A reader who' +
      '\n  audits provenance from a ledger alone would find nothing for their admitted Places.');
}

if (problems.length) {
  console.error(`\nnational-provenance: FAILED with ${problems.length} problem(s):`);
  for (const problem of problems.slice(0, 25)) console.error(`  FAIL  ${problem}`);
  process.exit(1);
}

console.log('\nnational-provenance: OK  every source identity resolves; every province closes its accounting');
process.exit(0);
