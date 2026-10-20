/**
 * Place readiness report.
 *
 * The runtime projection marks a place provisional or verified by a single tier rule. That
 * tier is what the runtime reads, so a provisional row is invisible to search, to the city
 * guide and to the guide sitemap. This report says, for every runtime row, which signals
 * it actually has, so the tier rule can be decided from evidence instead of from a count.
 *
 * It reads only committed data: the runtime projection, the factual runtime mapping and the
 * coverage status. It never fetches anything and never writes to a database.
 *
 * Usage:
 *   node tools/geography-coverage/place-readiness.mjs            # print the report
 *   node tools/geography-coverage/place-readiness.mjs --json     # machine-readable
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECTION = join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
);
const MAPPING = join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_factual_runtime_mapping_v0.2.jsonl',
);

/** The production Place release policy releases these and holds the OSM-only rows. */
const RELEASED_LICENSING = new Set(['permissive_supported', 'mixed_odbl_supported']);
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
  const mapping = readFileSync(MAPPING, 'utf8');
  const mappingByKey = new Map();
  for (const line of mapping.split('\n')) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (row.runtime_natural_key) mappingByKey.set(row.runtime_natural_key, row);
  }

  const rows = projection.rows.map(row => {
    // A carried row comes from the founder-reviewed slice and has no publication status of
    // its own. The loader maps an absent status to verified, so the runtime gate sees it as
    // verified and it must not be counted as blocked here.
    const tier = row.publication_status === 'provisional' ? 'provisional' : 'verified';
    const carried = !row.publication_status;
    const licensing = row.licensing_classification || 'unknown';
    const mappingRow = mappingByKey.get(row.runtime_natural_key);
    const parentRelationship = mappingRow?.runtime_parent_relationship || null;

    const releasable = RELEASED_LICENSING.has(licensing);
    const parentAccepted = parentRelationship === 'accepted_market_or_administrative_parent';
    const projectionReady = mappingRow?.projection_status === 'projection_ready';

    // Why this row is not currently usable by the runtime.
    const blockers = [];
    if (tier !== 'verified') blockers.push('tier_not_verified');
    if (!releasable) blockers.push('licensing_held');
    if (!parentAccepted) blockers.push('parent_edge_unaccepted');
    if (!projectionReady) blockers.push('projection_not_ready');

    return {
      key: row.runtime_natural_key,
      name: row.name,
      scope: row.runtime_search_scope_kind,
      tier,
      carried,
      licensing,
      releasable,
      parentAccepted,
      projectionReady,
      blockers,
      // The rows a tier rule alone would unlock: released, parented and ready, but not verified.
      unlockedByTierRuleOnly:
        tier !== 'verified' && releasable && parentAccepted && projectionReady,
    };
  });

  const byScope = {};
  const byLicensing = {};
  const blockers = {};
  for (const row of rows) {
    byScope[row.scope] = (byScope[row.scope] || 0) + 1;
    byLicensing[row.licensing] = (byLicensing[row.licensing] || 0) + 1;
    for (const blocker of row.blockers) blockers[blocker] = (blockers[blocker] || 0) + 1;
  }

  const unlocked = rows.filter(row => row.unlockedByTierRuleOnly);

  return {
    total: rows.length,
    byScope,
    byLicensing,
    blockers,
    verified: rows.filter(row => row.tier === 'verified').length,
    carried: rows.filter(row => row.carried).length,
    provisional: rows.filter(row => row.tier === 'provisional').length,
    unlockedByTierRuleOnly: unlocked.length,
    unlockedByScope: unlocked.reduce((acc, row) => {
      acc[row.scope] = (acc[row.scope] || 0) + 1;
      return acc;
    }, {}),
    unlockedByLicensing: unlocked.reduce((acc, row) => {
      acc[row.licensing] = (acc[row.licensing] || 0) + 1;
      return acc;
    }, {}),
    examples: unlocked.slice(0, 12).map(row => `${row.key} (${row.licensing})`),
  };
}

function main() {
  const report = buildReadiness();
  if (process.argv.includes('--check')) {
    // The gate: a place that the production release policy allows, that has an accepted
    // parent edge and a ready projection, must not be hidden by the tier rule alone.
    const hidden = report.unlockedByTierRuleOnly;
    if (hidden > 0) {
      console.error(
        `place-readiness: ${hidden} runtime rows are released, parented and projection-ready but still tiered provisional.`,
      );
      console.error(
        '  They are hidden from search, the city guide and the guide sitemap by the tier rule alone.',
      );
      process.exitCode = 1;
      return;
    }
    console.log('place-readiness: no runtime row is hidden by the tier rule alone.');
    return;
  }
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  console.log('# Place readiness — Gauteng runtime projection\n');
  console.log(`Runtime rows: ${report.total}`);
  console.log(
    `Tier: verified ${report.verified} (of which ${report.carried} carried from the founder-reviewed slice) · provisional ${report.provisional}`,
  );
  console.log(`Scope: ${JSON.stringify(report.byScope)}`);
  console.log(`Licensing: ${JSON.stringify(report.byLicensing)}`);
  console.log(`Blockers: ${JSON.stringify(report.blockers)}`);
  console.log(
    `\nRows that are released, parented and projection-ready but still tiered provisional: ${report.unlockedByTierRuleOnly}`,
  );
  console.log(`  by scope:    ${JSON.stringify(report.unlockedByScope)}`);
  console.log(`  by licensing: ${JSON.stringify(report.unlockedByLicensing)}`);
  if (report.examples.length) {
    console.log('\nExamples:');
    for (const example of report.examples) console.log(`  ${example}`);
  }
  console.log(
    '\nA row counted as unlocked is releasable under the production Place release policy, has an',
  );
  console.log('accepted parent edge and a ready projection. It is hidden only by the tier rule.');
}

if (process.argv[1] && process.argv[1].endsWith('place-readiness.mjs')) main();
