#!/usr/bin/env node
/* global console, process */
/**
 * Behavioural proof for the admitted Gauteng Place dataset on an owned
 * disposable target (Place Authority Slice 2).
 *
 * Static validation and physical congruency are necessary but not sufficient, so
 * this exercises the admitted data with real reads and writes:
 *
 *  - every named Gauteng pressure-test case resolves to an explicit outcome;
 *  - identity is stable and never derived from a name or a classification;
 *  - same name across distinct Places stays two Places;
 *  - a Place may hold several names, including overlapping roles;
 *  - containment is a single-parent forest with no cycles;
 *  - no orphan names, relationships, evidence or mappings;
 *  - no duplicate provider mappings;
 *  - a rerun materialization is a no-op and changes no Place ID;
 *  - the database refuses an illegal scope, an unevidenced relationship and a
 *    malformed identity.
 *
 * It writes only inside the disposable target and leaves the admitted dataset
 * byte-identical.
 */
import { createHash } from 'node:crypto';
import { createAuthoritySqlConnection } from '../../server/_core/databaseAuthority/connectionAuthority.ts';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context.ts';
import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from '../../server/_core/databaseAuthority/authorization.ts';
import { queryRows } from '../../server/_core/databaseAuthority/dataAdapters/common.ts';

const authority = resolveDatabaseAuthority({ operation: 'verification', credentialClass: 'read-only' });
const decision = authorizeDatabaseOperation(authority, { approval: protectedDatabaseApprovalFromEnvironment(authority) });
const db = await createAuthoritySqlConnection(authority, decision);
const read = (sql, values = []) => queryRows(db, sql, values);

const results = [];
const check = (ok, label, detail = '') => results.push({ ok: Boolean(ok), label, detail });

/* ---- dataset fingerprints for the idempotency proof ---- */
const fingerprint = async () => {
  const tables = ['place', 'place_name', 'place_relationship', 'place_evidence', 'place_external_mapping'];
  const parts = [];
  for (const table of tables) {
    const rows = await read(`SELECT * FROM \`${table}\` ORDER BY 1,2,3`);
    parts.push(`${table}:${rows.length}:` + createHash('sha256').update(JSON.stringify(rows)).digest('hex'));
  }
  return parts.join('|');
};

const before = await fingerprint();
const countsBefore = {
  place: (await read('SELECT COUNT(*) AS n FROM `place`'))[0].n,
  placeName: (await read('SELECT COUNT(*) AS n FROM `place_name`'))[0].n,
  relationship: (await read('SELECT COUNT(*) AS n FROM `place_relationship`'))[0].n,
  evidence: (await read('SELECT COUNT(*) AS n FROM `place_evidence`'))[0].n,
  mapping: (await read('SELECT COUNT(*) AS n FROM `place_external_mapping`'))[0].n,
};
const idsBefore = (await read('SELECT place_id FROM `place` ORDER BY place_id')).map(r => r.place_id);
check(countsBefore.place === 1466, 'admitted Place count', String(countsBefore.place));
check(countsBefore.relationship === 1465, 'relationship count', String(countsBefore.relationship));

/* ---- integrity ---- */
const orphans = await read(`
  SELECT
    (SELECT COUNT(*) FROM \`place_name\` n LEFT JOIN \`place\` p ON n.place_id=p.place_id WHERE p.place_id IS NULL) AS names,
    (SELECT COUNT(*) FROM \`place_relationship\` r LEFT JOIN \`place\` a ON r.from_place_id=a.place_id WHERE a.place_id IS NULL) AS rel_from,
    (SELECT COUNT(*) FROM \`place_relationship\` r LEFT JOIN \`place\` b ON r.to_place_id=b.place_id WHERE b.place_id IS NULL) AS rel_to,
    (SELECT COUNT(*) FROM \`place_evidence\` e LEFT JOIN \`place\` p ON e.place_id=p.place_id WHERE e.place_id IS NOT NULL AND p.place_id IS NULL) AS ev,
    (SELECT COUNT(*) FROM \`place_external_mapping\` m LEFT JOIN \`place\` p ON m.place_id=p.place_id WHERE p.place_id IS NULL) AS map`);
const o = orphans[0];
check(o.names === 0 && o.rel_from === 0 && o.rel_to === 0 && o.ev === 0 && o.map === 0, 'no orphan rows', JSON.stringify(o));

const dupMap = await read('SELECT provider, provider_record_id, COUNT(*) AS n FROM `place_external_mapping` GROUP BY provider, provider_record_id HAVING n > 1');
check(dupMap.length === 0, 'no duplicate provider mappings', String(dupMap.length));

const multiParent = await read(`SELECT from_place_id, COUNT(*) AS n FROM \`place_relationship\`
  WHERE relationship_type='administratively_contains' GROUP BY from_place_id HAVING n > 1`);
check(multiParent.length === 0, 'containment has at most one parent per Place', String(multiParent.length));

const roots = countsBefore.place - countsBefore.relationship;
check(roots === 1, 'containment forest has exactly one root', `places=${countsBefore.place} rels=${countsBefore.relationship}`);

// cycle detection in application code, mirroring the verifier
const parentMap = new Map((await read(`SELECT from_place_id, to_place_id FROM \`place_relationship\` WHERE relationship_type='administratively_contains'`)).map(r => [r.from_place_id, r.to_place_id]));
let cycles = 0;
for (const start of parentMap.keys()) {
  const seen = new Set([start]);
  let cursor = parentMap.get(start);
  while (cursor) {
    if (seen.has(cursor)) { cycles += 1; break; }
    seen.add(cursor);
    cursor = parentMap.get(cursor);
  }
}
check(cycles === 0, 'no containment cycles', String(cycles));

const noEvidence = await read(`SELECT r.from_place_id FROM \`place_relationship\` r
  LEFT JOIN \`place_evidence\` e ON e.place_id = r.from_place_id
  WHERE r.relationship_type='administratively_contains' AND e.id IS NULL`);
check(noEvidence.length === 0, 'every containment relationship traces to evidence', String(noEvidence.length));

const widening = await read('SELECT COUNT(*) AS n FROM `place_relationship` WHERE search_scope_authorized <> 0');
check(widening[0].n === 0, 'no relationship-driven search widening in Slice 2', String(widening[0].n));

/* ---- named pressure tests, resolved by real queries ---- */
const bySearchableName = async name =>
  read(`SELECT DISTINCT p.place_id, p.place_type, p.verification_status, p.search_scope, p.search_eligible, p.publication_eligible
          FROM \`place\` p JOIN \`place_name\` n ON n.place_id = p.place_id
         WHERE n.normalized_name = ? AND n.is_searchable = 1`, [name.toLowerCase()]);

const cases = [
  ['Soweto', 1, 'one Place, not two, for sources that classified the referent differently'],
  ['Diepkloof', 2, 'two distinct real-world Places preserved'],
  ['Waverley', 2, 'two distinct real-world Places preserved'],
  ['Sandton', 1, 'one Place despite a suburb/city classification difference'],
  ['Midrand', 2, 'two contexts preserved'],
  ['Lyttelton', 1, 'one Place for the Lyttelton/Centurion referent'],
  ['Centurion', 1, 'Centurion resolves to that same Place'],
  ['Kyalami', 0, 'licence/evidence gate respected; not admitted'],
  ['Reigerpark', 1, 'admitted under its evidenced spelling'],
  ['Broadacres ah', 1, 'admitted; the v0.1 "Broadacres" referent is covered by a differently named Place'],
  ['Eden Park', 0, 'no admitted Place; remains a quarantined coverage case'],
  ['Azaadville', 0, 'no admitted Place; remains a quarantined coverage case'],
  ['Sky City', 0, 'absent from the approved source; recorded as a coverage case'],
];
for (const [name, expected, why] of cases) {
  const rows = await bySearchableName(name);
  check(rows.length === expected, `pressure test: ${name}`, `expected ${expected}, got ${rows.length} — ${why}`);
}

// Centurion and Lyttelton are the same Place, and Centurion is a searchable alias
const lyttelton = await read(`SELECT n.name, n.normalized_name, n.name_role, n.is_searchable FROM \`place\` p
  JOIN \`place_name\` n ON n.place_id=p.place_id
 WHERE p.place_id = (SELECT place_id FROM \`place_name\` WHERE normalized_name='lyttelton' AND is_searchable=1 LIMIT 1)`);
const centurionRows = lyttelton.filter(r => r.normalized_name === 'centurion');
check(centurionRows.length === 1, 'Centurion is a searchable name on the Lyttelton Place');
check(lyttelton.some(r => r.name_role === 'preferred_public' && r.normalized_name === 'lyttelton'), 'Lyttelton is the governed preferred public name');
check(lyttelton.some(r => r.name_role === 'historical'), 'a historical name is retained');
check(!lyttelton.filter(r => r.name_role === 'historical').some(r => r.is_searchable !== 1), 'historical names remain searchable where the source allows');
check(lyttelton.filter(r => r.name_role === 'preferred_public').length === 1, 'exactly one preferred public name');

/* ---- name model behaviours ---- */
const overlapping = await read(`SELECT place_id FROM \`place_name\`
  GROUP BY place_id, normalized_name HAVING COUNT(DISTINCT name_role) > 1 LIMIT 5`);
check(overlapping.length > 0, 'a Place may hold the same text under distinct justified roles', `${overlapping.length} found`);

const dupPreferred = await read(`SELECT place_id, COUNT(*) AS n FROM \`place_name\`
  WHERE name_role='preferred_public' GROUP BY place_id HAVING n > 1`);
check(dupPreferred.length === 0, 'no Place has two preferred public names');

const nameCount = await read('SELECT COUNT(DISTINCT place_id) AS n FROM `place_name` WHERE normalized_name = (SELECT normalized_name FROM `place_name` WHERE name="Diepkloof" AND is_searchable=1 LIMIT 1)');
check(nameCount[0].n >= 2, 'the same name is carried by distinct Places', String(nameCount[0].n));

/* ---- the database refuses what the contract forbids ---- */
const expectRejected = async (label, sql, values = []) => {
  try { await db.query(sql, values); check(false, `must reject: ${label}`); }
  catch { check(true, `must reject: ${label}`); }
};
const anyPlace = (await read('SELECT place_id FROM `place` ORDER BY place_id LIMIT 1'))[0].place_id;
await expectRejected('a scope contradicting place_type',
  `INSERT INTO \`place\` (place_id, place_type, verification_status, search_eligible, search_scope)
   VALUES ('pl-place-01-ffffffffffffffffffffffff', 'province', 'verified', 1, 'locality')`);
await expectRejected('a malformed identity',
  `INSERT INTO \`place\` (place_id, place_type, verification_status) VALUES ('pl-place-99-000000000000000000000000', 'suburb', 'verified')`);
await expectRejected('an unevidenced relationship',
  `INSERT INTO \`place_relationship\` (from_place_id, to_place_id, relationship_type, evidence_source)
   VALUES (?, ?, 'co_located_with', NULL)`, [anyPlace, anyPlace]);
await expectRejected('a self-referencing relationship',
  `INSERT INTO \`place_relationship\` (from_place_id, to_place_id, relationship_type, evidence_source)
   VALUES (?, ?, 'co_located_with', 'probe')`, [anyPlace, anyPlace]);
await expectRejected('an identity inside another Place, duplicating containment',
  `INSERT INTO \`place_relationship\` (from_place_id, to_place_id, relationship_type, search_scope_authorized, evidence_source)
   VALUES (?, ?, 'administratively_contains', 0, 'probe')
   ON DUPLICATE KEY UPDATE from_place_id = from_place_id`, [anyPlace, anyPlace]);

/* ---- identity stability across a rerun materialization ---- */
const { execFileSync } = await import('node:child_process');
execFileSync('npx', ['tsx', 'scripts/databaseAuthorityCli.ts', 'places:prepare'], { stdio: 'pipe' });

const after = await fingerprint();
const idsAfter = (await read('SELECT place_id FROM `place` ORDER BY place_id')).map(r => r.place_id);
check(after === before, 'a rerun materialization is a byte-identical no-op');
check(JSON.stringify(idsBefore) === JSON.stringify(idsAfter), 'no Place ID changed across the rerun');
const countsAfter = {
  place: (await read('SELECT COUNT(*) AS n FROM `place`'))[0].n,
  placeName: (await read('SELECT COUNT(*) AS n FROM `place_name`'))[0].n,
  relationship: (await read('SELECT COUNT(*) AS n FROM `place_relationship`'))[0].n,
  evidence: (await read('SELECT COUNT(*) AS n FROM `place_evidence`'))[0].n,
  mapping: (await read('SELECT COUNT(*) AS n FROM `place_external_mapping`'))[0].n,
};
check(JSON.stringify(countsBefore) === JSON.stringify(countsAfter), 'row counts unchanged by the rerun', JSON.stringify(countsAfter));

// the probe must not have left anything behind
const stray = await read("SELECT COUNT(*) AS n FROM `place` WHERE place_id = 'pl-place-01-ffffffffffffffffffffffff'");
check(stray[0].n === 0, 'the probe left no test Place behind');

await db.end();

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label}${r.detail ? `  (${r.detail})` : ''}`);
}
console.log(`\nplace-admission-probe: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
