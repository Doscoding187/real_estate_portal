/**
 * Place readiness report.
 *
 * The runtime projection marks a place provisional or verified with a single tier, and the
 * runtime reads that tier as the answer to whether a place may be searched, offered as a city
 * guide and listed in the guide sitemap. This report says which places the runtime would
 * hold, and why, so the hold can always be traced to the one authority that permits it.
 *
 * It reads only committed data: the runtime projection and the factual runtime mapping. It
 * never fetches anything and never writes to a database.
 *
 * The invariant the gate holds:
 *
 *   the only reason a place is held is the production Place release policy holding its
 *   licensing. A place that policy releases is usable, whatever the projection recorded.
 *
 * Usage:
 *   pnpm place:readiness            # print the report
 *   pnpm place:readiness --json     # machine-readable
 *   pnpm place:readiness:check      # fail on any hold the release policy does not permit
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runtimePlaceStatus } from '../../shared/placeReadiness.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECTION = join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
);
const MAPPING = join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_factual_runtime_mapping_v0.2.jsonl',
);

const HELD_LICENSING = 'osm_only_odbl_provisional';

function readJsonl(path) {
  const rows = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line));
  }
  return rows;
}

export function buildReadiness() {
  const projection = JSON.parse(readFileSync(PROJECTION, 'utf8'));
  const mappingByKey = new Map();
  for (const row of readJsonl(MAPPING)) {
    if (row.runtime_natural_key) mappingByKey.set(row.runtime_natural_key, row);
  }

  const rows = projection.rows.map(row => {
    // A carried row comes from the founder-reviewed slice and has no tier of its own.
    const recordedTier = row.publication_status === 'provisional' ? 'provisional' : 'verified';
    const licensing = row.licensing_classification || 'unknown';
    const mappingRow = mappingByKey.get(row.runtime_natural_key);
    const parentAccepted = Boolean(row.runtime_parent_natural_key);
    const projectionReady = mappingRow?.projection_status === 'projection_ready';

    // The status the runtime applies: the release policy decides, not the recorded tier.
    const effectiveTier = runtimePlaceStatus({
      publicationStatus: recordedTier === 'provisional' ? 'provisional' : 'verified',
      licensingClassification: licensing,
    });

    const heldForLicensing = licensing === HELD_LICENSING;
    const blockers = [];
    if (effectiveTier === 'provisional' && !heldForLicensing) blockers.push('held_without_licence');
    if (!parentAccepted) blockers.push('parent_edge_unaccepted');
    if (!projectionReady) blockers.push('projection_not_ready');

    return {
      key: row.runtime_natural_key,
      name: row.name,
      scope: row.runtime_search_scope_kind,
      recordedTier,
      effectiveTier,
      carried: !row.publication_status,
      licensing,
      parentAccepted,
      projectionReady,
      blockers,
      // The projection still records a tier that disagrees with the release policy. The runtime
      // no longer follows it; regenerating the projection removes the disagreement.
      tierDisagrees: recordedTier !== effectiveTier,
    };
  });

  const tally = (key, of = rows) =>
    of.reduce((acc, row) => {
      acc[row[key]] = (acc[row[key]] || 0) + 1;
      return acc;
    }, {});

  const held = rows.filter(row => row.effectiveTier === 'provisional');
  const unlicensedHolds = held.filter(row => row.licensing !== HELD_LICENSING);
  const disagreeing = rows.filter(row => row.tierDisagrees);

  return {
    total: rows.length,
    byScope: tally('scope'),
    byLicensing: tally('licensing'),
    recordedTier: tally('recordedTier'),
    effectiveTier: tally('effectiveTier'),
    blockers: rows
      .flatMap(row => row.blockers)
      .reduce((acc, blocker) => {
        acc[blocker] = (acc[blocker] || 0) + 1;
        return acc;
      }, {}),
    held: held.length,
    heldForLicensing: held.filter(row => row.licensing === HELD_LICENSING).length,
    heldWithoutLicence: unlicensedHolds.length,
    tierDisagreement: disagreeing.length,
    tierDisagreementByScope: disagreeing.reduce((acc, row) => {
      acc[row.scope] = (acc[row.scope] || 0) + 1;
      return acc;
    }, {}),
    tierDisagreementByLicensing: disagreeing.reduce((acc, row) => {
      acc[row.licensing] = (acc[row.licensing] || 0) + 1;
      return acc;
    }, {}),
    examples: disagreeing.slice(0, 12).map(row => `${row.key} (${row.licensing})`),
  };
}

function main() {
  const report = buildReadiness();
  if (process.argv.includes('--check')) {
    if (report.heldWithoutLicence > 0) {
      console.error(
        `place-readiness: ${report.heldWithoutLicence} runtime rows are held although the production release policy releases them.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `place-readiness: every held row is held by the release policy (${report.heldForLicensing} licence-held, 0 otherwise).`,
    );
    if (report.tierDisagreement > 0) {
      console.log(
        `  ${report.tierDisagreement} rows still carry a projection tier that disagrees with the release policy; the runtime no longer follows it.`,
      );
    }
    return;
  }
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  console.log('# Place readiness — Gauteng runtime projection\n');
  console.log(`Runtime rows: ${report.total}`);
  console.log(`Scope: ${JSON.stringify(report.byScope)}`);
  console.log(`Licensing: ${JSON.stringify(report.byLicensing)}`);
  console.log(`Recorded tier in the projection: ${JSON.stringify(report.recordedTier)}`);
  console.log(`Effective tier the runtime applies: ${JSON.stringify(report.effectiveTier)}`);
  console.log(`Blockers: ${JSON.stringify(report.blockers)}`);
  console.log(
    `\nHeld: ${report.held} — of which ${report.heldForLicensing} are held by the release policy and ${report.heldWithoutLicence} for any other reason.`,
  );
  console.log(
    `\nProjection rows whose recorded tier disagrees with the release policy: ${report.tierDisagreement}`,
  );
  console.log(`  by scope:    ${JSON.stringify(report.tierDisagreementByScope)}`);
  console.log(`  by licensing: ${JSON.stringify(report.tierDisagreementByLicensing)}`);
  if (report.examples.length) {
    console.log('\nExamples:');
    for (const example of report.examples) console.log(`  ${example}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('place-readiness.mjs')) main();
