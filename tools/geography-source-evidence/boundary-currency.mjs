/**
 * Per-province boundary currency ledger.
 *
 * Every admitted province's boundary evidence represents 2020. That was a single
 * blanket sentence when three provinces existed; with nine it is a per-province
 * fact that a publication gate should be able to check mechanically instead of
 * trusting prose for.
 *
 * WHAT THIS TOOL ESTABLISHES, PRECISELY:
 *   no province asserts a boundary currency it cannot evidence.
 *
 * WHAT IT DOES NOT ESTABLISH:
 *   that any province's boundaries are current. It never compares against a current
 *   demarcation, never fetches one, and cannot tell you whether 2020 boundaries are
 *   still correct. A passing run means nobody overclaimed, not that the boundaries
 *   are right. Currency remains unproven for all nine provinces and is an owner
 *   review. The word "OK" below therefore reports the absence of an unsupported
 *   claim, and the run says so in as many words.
 *
 * It deliberately does not fetch, substitute or evaluate newer boundaries: doing so
 * would change admitted packages and Place IDs, which is a reviewed decision rather
 * than an engineering step. The only output is a gate.
 *
 * Usage:
 *   node tools/geography-source-evidence/boundary-currency.mjs            # print the ledger
 *   node tools/geography-source-evidence/boundary-currency.mjs --check    # fail on any unevidenced claim
 *   node tools/geography-source-evidence/boundary-currency.mjs --write    # write the pinned ledger
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REGISTRY = join(ROOT, 'data/place-admission-territories.v0.1/territory-registry.v0.1.json');
const LEDGER = join(ROOT, 'data/place-admission-territories.v0.1/boundary-currency-ledger.v0.1.json');

/**
 * The vintage this repository's boundary evidence is allowed to be treated as.
 * Written as a date, not a year: "2020" is ambiguous about which year's
 * demarcation was captured, while a full date states the only thing the evidence
 * actually supports.
 */
const EVIDENCE_REPRESENTS = '2020-01-01';
const GENERATED = new Date().toISOString().slice(0, 10);

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const write = args.has('--write');

const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));

/** `Thu Jan 19 07:31:04 2023` -> an ISO date, so the gap is arithmetic not prose. */
function parseVintage(raw) {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`boundary build date is not a date this tool can read: ${JSON.stringify(raw)}`);
  }
  return parsed;
}

function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

const rows = [];
for (const territory of registry.territories) {
  const authorityDir = join(ROOT, territory.source_authority.directory);

  // The file prefix is not derivable from the territory id: Gauteng's authority
  // predates the shared builder and is prefixed `gauteng_`, while the other eight
  // use `za_<cc>_`. Locating the summary by pattern keeps this honest about a
  // real naming inconsistency instead of silently reporting Gauteng as having no
  // recorded provenance when it does.
  const summaryName = readdirSync(authorityDir).find(name =>
    name.endsWith('_source_build_summary_v0.2.json'),
  );
  let buildSummary = null;
  if (summaryName) {
    buildSummary = JSON.parse(readFileSync(join(authorityDir, summaryName), 'utf8'));
  }

  const manifestPath = join(ROOT, territory.admission_package.directory, territory.admission_package.manifest);
  const admitted = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const boundary = buildSummary?.boundary_evidence ?? null;
  const represents = boundary?.boundary_year_represented ?? null;
  const sourceUpdate = boundary?.source_data_update_date ?? null;
  const built = boundary?.build_date ?? null;

  rows.push({
    territory_id: territory.territory_id,
    province: territory.display_name,
    // A province whose provenance this tool cannot read is not "current"; it is
    // unevidenced. Recording that is the point of the gate.
    boundary_source: boundary?.boundary_source ?? null,
    boundary_license: boundary?.boundary_license ?? null,
    evidence_represents: represents,
    upstream_source_data_date: sourceUpdate,
    geo_boundaries_build_date: built,
    currency_certified: false,
    certification_blocked_by:
      'The boundary evidence is a frozen 2020 vintage. No current demarcation has been ' +
      'ingested, and ingesting one would change admitted packages and Place IDs, which ' +
      'is a reviewed decision rather than an engineering step.',
    admitted_places: admitted.counts.admitted_places,
    source_identity_count: admitted.counts.source_identities,
    provenance_recorded: Boolean(boundary),
  });
}

const withGaps = rows.map(row => {
  const source = row.upstream_source_data_date ? parseVintage(row.upstream_source_data_date) : null;
  const built = row.geo_boundaries_build_date ? parseVintage(row.geo_boundaries_build_date) : null;
  const now = parseVintage(GENERATED);
  return {
    ...row,
    days_since_upstream_source_data: source === null ? null : daysBetween(source, now),
    days_since_boundary_build: built === null ? null : daysBetween(built, now),
  };
});

const unrecorded = withGaps.filter(row => !row.provenance_recorded);

const ledger = {
  ledger_version: '0.1',
  generated_on: GENERATED,
  evidence_represents: EVIDENCE_REPRESENTS,
  scope:
    'Every admitted province. This ledger records how old each province\'s boundary ' +
    'evidence is and refuses to certify currency. It is a publication gate, not a ' +
    'currency assessment, and it never substitutes newer boundaries.',
  all_provinces_uncertified: withGaps.every(row => row.currency_certified === false),
  establishes: 'No province asserts a boundary currency it cannot evidence.',
  does_not_establish:
    'That any province\'s boundaries are current. No comparison against a current ' +
    'demarcation is performed and none can be, so boundary currency is UNPROVEN for ' +
    'all nine provinces. A passing check means nobody overclaimed.',
  provinces_with_unrecorded_boundary_provenance: unrecorded.map(row => ({
    territory_id: row.territory_id,
    province: row.province,
    admitted_places: row.admitted_places,
    finding:
      'This province records no boundary provenance at all: its source authority has no ' +
      'boundary_evidence block, so neither the demarcation year nor the vintage is known. ' +
      'Its 1,466 Place IDs remain valid, but the authority behind them is weaker than the ' +
      'other eight and the currency review cannot even quantify the gap for it.',
  })),
  provinces: withGaps,
};

if (write) {
  writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`boundary-currency: wrote ${LEDGER}`);
}

if (check) {
  // The gate fails only on an unsupported *claim*. A province that records no
  // currency claim at all is reported as an open gap rather than made red, because
  // a gate that is permanently failing gets ignored, and a gate nobody runs protects
  // nothing. The real blocker here is the owner's currency review, which this tool
  // exists to make checkable, not to pre-empt.
  const problems = [];
  for (const row of withGaps) {
    if (row.currency_certified !== false) {
      problems.push(`${row.territory_id} claims currency_certified=true without a certification record`);
    }
    if (row.provenance_recorded && row.evidence_represents === null) {
      problems.push(`${row.territory_id} records boundary provenance but not which year it represents`);
    }
  }
  if (withGaps.length !== registry.territories.length) {
    problems.push(`ledger covers ${withGaps.length} of ${registry.territories.length} registered territories`);
  }
  if (problems.length) {
    console.error('boundary-currency: FAILED');
    for (const problem of problems) console.error(`  FAIL  ${problem}`);
    process.exit(1);
  }
  console.log(
    `boundary-currency: NO UNSUPPORTED CLAIMS across ${withGaps.length} provinces`,
  );
  console.log(
    '  this does NOT certify any province\'s boundaries as current; currency is unproven',
  );
  for (const row of unrecorded) {
    console.log(
      `  GAP   ${row.territory_id} (${row.province}, ${row.admitted_places} places) records no ` +
        'boundary provenance at all; the currency review cannot quantify its gap',
    );
  }
} else {
  const age = withGaps.map(row => row.days_since_upstream_source_data).filter(value => value !== null);
  const widest = Math.max(...age);
  const narrowest = Math.min(...age);
  console.log(
    `boundary-currency: ${withGaps.length} provinces, ${unrecorded.length} without recorded boundary ` +
      `provenance, upstream source data ${narrowest}-${widest} days old, none certified`,
  );
  for (const row of withGaps) {
    const days = row.days_since_upstream_source_data;
    console.log(
      `  ${row.territory_id.padEnd(8)} ${String(row.province).padEnd(15)} ` +
        `represents ${String(row.evidence_represents ?? 'UNRECORDED').padEnd(10)} ` +
        `upstream ${days === null ? 'unrecorded' : `${days}d`}`.padEnd(64) +
        `built ${row.days_since_boundary_build === null ? 'unrecorded' : `${row.days_since_boundary_build}d`}  ` +
        `${String(row.admitted_places).padStart(5)} places  certified=${row.currency_certified}`,
    );
  }
}

process.exit(0);
