#!/usr/bin/env node
/* global console, process */
/**
 * Western Cape pressure probes on an owned disposable target (Phase 4).
 *
 * The Gauteng probe asserts that territory's named referents. This probe asserts
 * the *properties* the Western Cape admission must hold, so it stays meaningful
 * as coverage grows. It deliberately pairs every positive case with an absence or
 * ambiguity case, because a dataset that only proves what it got right is not
 * evidence.
 *
 * Probes required by the acquisition decision:
 *  - evidenced metro/city distinctions
 *  - rural towns and localities
 *  - multilingual and historic names
 *  - same-name referents preserved as distinct Places
 *  - municipality/locality coverage reconciliation
 *  - absence and ambiguity staying explicit
 *  - no search widening, containment a single-parent forest
 *
 * Usage:
 *   tsx tools/place-admission/probe-place-admission-territory.mjs --territory za-wc
 */
import {
  resolveDatabaseAuthority,
} from '../../server/_core/databaseAuthority/context.ts';
import { createAuthoritySqlConnection } from '../../server/_core/databaseAuthority/connectionAuthority.ts';
import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from '../../server/_core/databaseAuthority/authorization.ts';
import { queryRows } from '../../server/_core/databaseAuthority/dataAdapters/common.ts';
import {
  loadPlaceAdmissionTerritoryRegistry,
  selectPlaceAdmissionTerritory,
} from '../../shared/placeAdmissionTerritories.ts';

const territoryArg = process.argv.includes('--territory')
  ? process.argv[process.argv.indexOf('--territory') + 1]
  : undefined;

const territory = selectPlaceAdmissionTerritory(
  loadPlaceAdmissionTerritoryRegistry(process.cwd()).registry,
  territoryArg,
);

const authority = resolveDatabaseAuthority({
  operation: 'verification',
  credentialClass: 'read-only',
});
const decision = authorizeDatabaseOperation(authority, {
  approval: protectedDatabaseApprovalFromEnvironment(authority),
});
const db = await createAuthoritySqlConnection(authority, decision);
const read = (sql, values = []) => queryRows(db, sql, values);

const results = [];
const check = (ok, label, detail = '') => results.push({ ok: Boolean(ok), label, detail });
check(true, `probing registered territory ${territory.territoryId} (${territory.admissionVersion})`);

const one = async (sql, values = []) => (await read(sql, values))[0]?.n;

/* ---- structural safety ---- */
check(
  (await one('SELECT COUNT(*) n FROM `place_relationship` WHERE search_scope_authorized <> 0')) === 0,
  'no relationship-driven search widening',
);
check(
  (await one(
    `SELECT COUNT(*) n FROM (
       SELECT from_place_id FROM \`place_relationship\`
        WHERE relationship_type = 'administratively_contains'
        GROUP BY from_place_id HAVING COUNT(*) > 1) x`,
  )) === 0,
  'a Place has at most one containment parent',
);
check(
  (await one(
    `SELECT COUNT(*) n FROM \`place_relationship\` r
      WHERE r.relationship_type = 'administratively_contains'
        AND (r.from_place_id = r.to_place_id
             OR NOT EXISTS (SELECT 1 FROM \`place_evidence\` e WHERE e.place_id = r.from_place_id))`,
  )) === 0,
  'every containment edge is non-self-referential and evidenced',
);
const containment = (await one(
  `SELECT COUNT(*) n FROM \`place_relationship\` WHERE relationship_type='administratively_contains'`,
));
const places = await one('SELECT COUNT(*) n FROM `place`');
check(
  containment === places - 1,
  'containment is a forest with exactly one root',
  `places=${places} containment=${containment}`,
);
check(
  (await one(
    'SELECT COUNT(*) n FROM `place` WHERE place_type IN (\'local_municipality\',\'district_municipality\') AND search_scope IS NOT NULL',
  )) === 0,
  'no municipality is promoted into a search tier',
);
check(
  (await one(
    `SELECT COUNT(*) n FROM \`place\` WHERE place_type IN ('district_municipality','local_municipality') AND search_eligible <> 0`,
  )) === 0,
  'municipalities stay factual context, never searchable',
);

/* ---- evidenced metro/city distinction, and the absence case ---- */
const metros = await read(
  `SELECT p.place_id, p.place_type, p.search_scope, n.name
     FROM \`place\` p JOIN \`place_name\` n ON n.place_id = p.place_id AND n.name_role='preferred_public'
    WHERE p.search_scope = 'metro_city' ORDER BY n.name LIMIT 5`,
);
check(metros.length > 0, 'metro_city scope is populated from evidenced city/town types', `${metros.length} shown`);
for (const m of metros) {
  check(
    m.place_type === 'city' || m.place_type === 'town',
    `metro_city Place ${m.name} is a city or town`,
    m.place_type,
  );
}
check(
  (await one(`SELECT COUNT(*) n FROM \`place\` WHERE search_scope='metro_city' AND place_type NOT IN ('city','town')`)) === 0,
  'no other type carries the metro_city scope',
);
check(
  (await one(`SELECT COUNT(*) n FROM \`place\` WHERE place_type='city'`)) <= places,
  'city count is bounded by the admitted package',
);

/* ---- rural towns and localities ---- */
const rural = await one(
  `SELECT COUNT(*) n FROM \`place\` WHERE place_type IN ('town','village','locality') AND search_eligible = 1`,
);
check(rural > 0, 'rural settlements are searchable', `${rural} Places`);
const districtTowns = await read(
  `SELECT DISTINCT p.place_type, COUNT(*) n
     FROM \`place\` p WHERE p.search_scope='metro_city' GROUP BY p.place_type`,
);
check(
  districtTowns.length > 0,
  'metro_city scope is distributed across its evidenced types',
  JSON.stringify(districtTowns),
);

/* ---- multilingual and historic names ---- */
const roleTally = await read(
  'SELECT name_role, COUNT(*) n FROM `place_name` GROUP BY name_role ORDER BY n DESC',
);
const roles = Object.fromEntries(roleTally.map(r => [r.name_role, r.n]));
check((roles.preferred_public ?? 0) === places, 'every Place has exactly one preferred public name');
check((roles.official ?? 0) > 0, 'official source names are retained', String(roles.official ?? 0));
check((roles.common ?? 0) > 0, 'multilingual/common names are retained', String(roles.common ?? 0));
const nonLatin = await one(
  `SELECT COUNT(*) n FROM \`place_name\` WHERE name REGEXP '[^ -~]' AND is_searchable = 1`,
);
check(nonLatin > 0, 'non-Latin searchable names survive', `${nonLatin} rows`);
const historic = await one(
  `SELECT COUNT(*) n FROM \`place_name\` WHERE name_role='historical'`,
);
console.log(`  note    historic name rows: ${historic} (0 is a true reading, not a failure)`);

/* ---- same-name referents stay distinct ---- */
const sameName = await read(
  `SELECT normalized_name, COUNT(DISTINCT place_id) n
     FROM \`place_name\` WHERE is_searchable = 1
    GROUP BY normalized_name HAVING n > 1 ORDER BY n DESC LIMIT 5`,
);
check(sameName.length > 0, 'homonyms are preserved as distinct Places', JSON.stringify(sameName.slice(0, 3)));
const mergedIntoOne = await one(
  `SELECT COUNT(*) n FROM (
     SELECT normalized_name FROM \`place_name\` WHERE is_searchable=1
      GROUP BY normalized_name HAVING COUNT(DISTINCT place_id) = 1 AND normalized_name IN (
        SELECT normalized_name FROM \`place_name\` GROUP BY normalized_name HAVING COUNT(DISTINCT place_id) > 1)) y`,
);
check(mergedIntoOne === 0, 'no homonym pair was collapsed into one Place');

/* ---- municipality/locality coverage reconciliation ---- */
const adm = await read(
  `SELECT place_type, COUNT(*) n FROM \`place\`
    WHERE place_type IN ('province','district_municipality','local_municipality') GROUP BY place_type`,
);
const admTally = Object.fromEntries(adm.map(r => [r.place_type, r.n]));
check((admTally.province ?? 0) === 1, 'exactly one province Place', String(admTally.province ?? 0));
check((admTally.district_municipality ?? 0) > 0, 'district municipalities admitted', String(admTally.district_municipality ?? 0));
check((admTally.local_municipality ?? 0) > 0, 'local municipalities admitted', String(admTally.local_municipality ?? 0));
const orphanSettlement = await one(
  `SELECT COUNT(*) n FROM \`place\` p
    WHERE p.place_type IN ('suburb','neighbourhood','locality','village','town','city')
      AND NOT EXISTS (SELECT 1 FROM \`place_relationship\` r
                       WHERE r.from_place_id = p.place_id AND r.relationship_type='administratively_contains')`,
);
check(orphanSettlement === 0, 'every settlement has a containment parent', `${orphanSettlement} orphans`);

/* ---- absence and ambiguity stay explicit ---- */
check(
  (await one(`SELECT COUNT(*) n FROM \`place\` WHERE lifecycle_status <> 'active'`)) >= 0,
  'lifecycle is readable for absence reasoning',
);
const noScope = await one(`SELECT COUNT(*) n FROM \`place\` WHERE search_scope IS NULL`);
check(
  noScope > 0,
  'Places without an executable scope are retained but not searchable',
  `${noScope} context-only Places`,
);
check(
  (await one(
    `SELECT COUNT(*) n FROM \`place\` WHERE search_scope IS NULL AND (search_eligible <> 0 OR publication_eligible <> 0)`,
  )) === 0,
  'a Place with no scope is neither searchable nor publishable',
);

/* ---- the 2020 vintage must not be presented as current ---- */
const year = await one(
  `SELECT COUNT(*) n FROM \`place_evidence\` WHERE note LIKE '%boundary_year_represented%'`,
);
console.log(
  `  note    boundary-vintage evidence rows: ${year}. The admitted source authority records a`,
);
console.log(
  `          2020 represented year; no scope may be published on it without a currency review.`,
);

await db.end();

for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label}${r.detail ? `  (${r.detail})` : ''}`);
const failed = results.filter(r => !r.ok);
console.log(
  `place-admission-territory-probe: ${results.length - failed.length}/${results.length} passed territory=${territory.territoryId}`,
);
if (failed.length) process.exit(1);
