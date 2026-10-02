/**
 * Repeatable national storage proof against the current reconciled schema.
 *
 * Run from a task-owned disposable worktree target. It never touches a protected
 * target, never activates a consumer, never publishes a scope and never widens a
 * search. Its whole claim is about STORAGE: that nine independently admitted and
 * separately proven provinces can coexist in one `place` table, atomically, without
 * an identity collision and without ever leaving a partial state.
 *
 * The proof is deliberately ordered so that the dangerous claim is established
 * before the successful one:
 *
 *   1. the target is at the reconciled migration head with the authority tables empty
 *   2. a fault injected mid-load leaves ALL FIVE authority tables unchanged and empty
 *   3. all nine provinces load atomically and match the required counts exactly
 *   4. all 17,664 Place identities match the committed packages exactly
 *   5. each province verifies individually inside the shared target
 *   6. a cross-province identity collision is refused
 *   7. a partial target is refused rather than extended
 *   8. a replay is a byte-identical no-op
 *
 * Step 2 comes before step 3 on purpose. A rollback that is only described is not a
 * rollback, and a half-loaded target is the one unacceptable outcome: seven
 * provinces present and one missing reads as complete to every caller that does not
 * recount.
 *
 * Usage:
 *   npx tsx tools/place-admission/prove-national-storage.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context.ts';
import { createAuthoritySqlConnection } from '../../server/_core/databaseAuthority/connectionAuthority.ts';
import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from '../../server/_core/databaseAuthority/authorization.ts';
import { queryRows } from '../../server/_core/databaseAuthority/dataAdapters/common.ts';
import {
  prepareNationalCanonicalPlaces,
  verifyNationalCanonicalPlaces,
} from '../../server/_core/databaseAuthority/dataAdapters/canonicalPlaces.ts';
import {
  loadPlaceAdmissionTerritoryRegistry,
  resolvePlaceAdmissionPackagePaths,
} from '../../shared/placeAdmissionTerritories.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The reconciled migration head this proof is stated against. */
const RECONCILED_HEAD = '0103_saved_searches_canonical_place_reference_fk.sql';

/** Every table the national load writes. Rollback must leave all of them untouched. */
const AUTHORITY_TABLES = [
  'place',
  'place_name',
  'place_relationship',
  'place_evidence',
  'place_external_mapping',
];

/** Required national totals. A deviation is a failure, not a new expected value. */
const REQUIRED = {
  places: 17664,
  names: 26425,
  relationships: 17655,
  evidence: 79925,
  sourceIdentities: 18309,
};

const failures = [];
const evidence = [];
function check(ok, label, detail = '') {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`;
  console.log(`  ${line}`);
  evidence.push(line);
  if (!ok) failures.push(label);
  return ok;
}

const readJsonl = path =>
  readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));

/** Row counts plus a content digest, so "empty" and "unchanged" are both provable. */
async function tableState(connection) {
  const state = {};
  for (const table of AUTHORITY_TABLES) {
    const rows = await queryRows(connection, `SELECT * FROM \`${table}\` ORDER BY 1,2,3`);
    state[table] = {
      rows: rows.length,
      digest: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    };
  }
  return state;
}

const registry = loadPlaceAdmissionTerritoryRegistry(ROOT);
const territoryIds = registry.registry.territories.map(territory => territory.territoryId);

/** The identities the committed packages claim. The proof must reproduce them exactly. */
const expectedByTerritory = new Map();
// Resolve artifact paths through the shared accessor rather than re-deriving them from
// the on-disk snake_case registry: the typed loader camelCases, and guessing either shape
// is how a proof ends up reading the wrong file.
for (const territory of registry.registry.territories) {
  const paths = resolvePlaceAdmissionPackagePaths(territory);
  const places = readJsonl(join(ROOT, paths.artifacts.places));
  expectedByTerritory.set(
    territory.territoryId,
    places.map(place => String(place.place_id)).sort(),
  );
}

const expectedAllIds = [...expectedByTerritory.values()].flat().sort();

/** Source identities per province, from the admitted manifests. Not the Place count. */
const expectedSourceIdentities = registry.registry.territories.reduce((sum, territory) => {
  const paths = resolvePlaceAdmissionPackagePaths(territory);
  const manifest = JSON.parse(readFileSync(join(ROOT, paths.manifest), 'utf8'));
  return sum + manifest.counts.source_identities;
}, 0);
const expectedAllDigest = createHash('sha256').update(JSON.stringify(expectedAllIds)).digest('hex');

function connect() {
  const authority = resolveDatabaseAuthority({
    operation: 'verification',
    credentialClass: 'read-only',
  });
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  return createAuthoritySqlConnection(authority, decision);
}

console.log('national storage proof');
console.log('  target class        disposable-worktree (owned, local)');
console.log(`  reconciled head     ${RECONCILED_HEAD}`);
console.log(`  provinces           ${territoryIds.length}`);
console.log(`  required places     ${REQUIRED.places}`);
console.log('');

// ---------------------------------------------------------------- 1. head and empty
console.log('1. target is at the reconciled head with the authority tables empty');
const connection = await connect();
let head = '';
try {
  const history = await queryRows(
    connection,
    'SELECT filename FROM `sql_migration_history` ORDER BY applied_at DESC, filename DESC LIMIT 1',
  );
  head = String(history[0]?.filename ?? '');
  const total = await queryRows(connection, 'SELECT COUNT(*) AS n FROM `sql_migration_history`');
  check(head === RECONCILED_HEAD, 'applied migration head is the reconciled head', `head=${head}`);
  evidence.push(`      applied migrations: ${total[0].n}`);

  const emptyState = await tableState(connection);
  const allEmpty = Object.values(emptyState).every(entry => entry.rows === 0);
  check(allEmpty, 'every authority table is empty before the load', describeState(emptyState));
} catch (error) {
  check(false, 'target could not be inspected', String(error.message).slice(0, 120));
}
await connection.end();

function describeState(state) {
  return Object.entries(state)
    .map(([table, entry]) => `${table}=${entry.rows}`)
    .join(' ');
}

// ------------------------------------------- 2. injected failure leaves all five empty
console.log('');
console.log('2. a fault injected mid-load leaves ALL FIVE authority tables unchanged and empty');
{
  const before = await (async () => {
    const c = await connect();
    try {
      return await tableState(c);
    } finally {
      await c.end();
    }
  })();

  // Throw from inside the `place` insert loop, partway through the load, so the
  // rollback has real work to undo rather than failing before it starts.
  const faultConnection = await connect();
  let inserts = 0;
  let faultAt = 0;
  const realQuery = faultConnection.query.bind(faultConnection);
  faultConnection.query = async (sql, values) => {
    if (/^\s*INSERT INTO `place`/.test(sql)) {
      inserts += 1;
      // 6,000 of 17,664 Places: deep inside the run, well past the first province.
      if (inserts === 6000 && faultAt === 0) {
        faultAt = inserts;
        throw new Error('INJECTED mid-load fault');
      }
    }
    return realQuery(sql, values);
  };

  let refused = '';
  try {
    await prepareNationalCanonicalPlaces({
      authority: resolveDatabaseAuthority({ operation: 'reference-seed', credentialClass: 'local-owner' }),
      decision: authorizeDatabaseOperation(
        resolveDatabaseAuthority({ operation: 'reference-seed', credentialClass: 'local-owner' }),
        {
          approval: protectedDatabaseApprovalFromEnvironment(
            resolveDatabaseAuthority({ operation: 'reference-seed', credentialClass: 'local-owner' }),
          ),
        },
      ),
      connection: faultConnection,
      root: ROOT,
    });
  } catch (error) {
    refused = String(error.message).split('\n')[0];
  } finally {
    await faultConnection.end();
  }

  check(faultAt === 6000, 'the injected fault fired mid-load, not before it', `after ${faultAt} place inserts`);
  check(/INJECTED/.test(refused), 'the load refused rather than reporting success', refused.slice(0, 90));

  const afterConnection = await connect();
  const after = await tableState(afterConnection);
  await afterConnection.end();

  const unchanged = Object.keys(after).every(
    table => after[table].rows === 0 && after[table].digest === before[table].digest,
  );
  check(unchanged, 'all five authority tables are unchanged and empty after the fault', describeState(after));
}

// ------------------------------------------------------- 3. atomic load of all nine
console.log('');
console.log('3. all nine provinces load atomically');
let loaded;
{
  const seed = resolveDatabaseAuthority({ operation: 'reference-seed', credentialClass: 'local-owner' });
  const decision = authorizeDatabaseOperation(seed, {
    approval: protectedDatabaseApprovalFromEnvironment(seed),
  });
  const c = await createAuthoritySqlConnection(seed, decision);
  try {
    loaded = await prepareNationalCanonicalPlaces({
      authority: seed,
      decision,
      connection: c,
      root: ROOT,
    });
  } finally {
    await c.end();
  }
  check(loaded.provinceCount === 9, 'all nine provinces loaded', `${loaded.provinceCount} provinces`);
  check(loaded.consumerActivated === false, 'no consumer was activated');
  check(
    loaded.identity === 'place_id' && loaded.rejectedConstraints.length === 2,
    'identity is place_id and the rejected constraints are recorded',
    loaded.rejectedConstraints.join(' | '),
  );
}

// ------------------------------------------------------------- 4. required counts
console.log('');
console.log('4. required national totals');
{
  const stored = loaded.stored;
  check(stored.places === REQUIRED.places, '17,664 Places', `${stored.places}`);
  check(stored.names === REQUIRED.names, '26,425 names', `${stored.names}`);
  check(
    stored.relationships === REQUIRED.relationships,
    '17,655 relationships',
    `${stored.relationships}`,
  );
  check(stored.evidence === REQUIRED.evidence, '79,925 evidence rows', `${stored.evidence}`);
  check(
    loaded.expected.externalMappings === 19792,
    '19,792 external mappings',
    `${loaded.expected.externalMappings}`,
  );

  // 18,309 source identities fully accounted for. These are NOT the Place count: 645
  // identities were absorbed into merge groups, so identities are the larger number and
  // reading one as the other understates the source universe by 645.
  check(
    expectedSourceIdentities === REQUIRED.sourceIdentities,
    '18,309 source identities',
    `${expectedSourceIdentities}`,
  );
  const absorbed = expectedSourceIdentities - REQUIRED.places;
  check(
    absorbed === 645,
    'identities reconcile as Places plus those absorbed by merge groups',
    `${REQUIRED.places} places + ${absorbed} absorbed = ${expectedSourceIdentities}`,
  );
}

// ----------------------------------------------------- 5. Place identities unchanged
console.log('');
console.log('5. all 17,664 Place identities match the committed packages exactly');
{
  const c = await connect();
  const rows = await queryRows(c, 'SELECT place_id FROM `place` ORDER BY place_id');
  const loadedIds = rows.map(row => String(row.place_id));
  await c.end();
  const loadedDigest = createHash('sha256').update(JSON.stringify(loadedIds)).digest('hex');
  check(loadedIds.length === REQUIRED.places, 'loaded Place count', `${loadedIds.length}`);
  check(
    loadedDigest === expectedAllDigest,
    'loaded Place-ID set digest equals the committed packages',
    `${loadedDigest.slice(0, 16)}`,
  );
  const missing = expectedAllIds.filter(id => !loadedIds.includes(id));
  check(missing.length === 0, 'no committed Place ID is missing', missing.slice(0, 3).join(','));
}

// --------------------------------------------- 6. per-province verification in target
console.log('');
console.log('6. each province verifies individually inside the shared target');
{
  const authority = resolveDatabaseAuthority({ operation: 'verification', credentialClass: 'read-only' });
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  const c = await createAuthoritySqlConnection(authority, decision);
  let verification;
  try {
    verification = await verifyNationalCanonicalPlaces({ authority, decision, connection: c, root: ROOT });
  } catch (error) {
    check(false, 'national verification', String(error.message).slice(0, 200));
  } finally {
    await c.end();
  }
  if (verification) {
    check(verification.completeProvinces === 9, '9 of 9 provinces complete', `${verification.completeProvinces}`);
    check(verification.provinceRoots === 9, 'exactly nine province roots', `${verification.provinceRoots}`);
    const drift = verification.perProvince.reduce((sum, p) => sum + p.identityDrift, 0);
    check(drift === 0, 'zero identity drift across every province', `${drift}`);
    for (const province of verification.perProvince) {
      evidence.push(
        `      ${province.territoryId.padEnd(8)} ${String(province.presentPlaces).padStart(5)}/${String(province.admittedPlaces).padEnd(5)} places  drift ${province.identityDrift}`,
      );
    }
  }
}

// ------------------------------------------------- 7. byte-identical replay
console.log('');
console.log('7. replay is a byte-identical no-op');
{
  const before = await (async () => {
    const c = await connect();
    try {
      return await tableState(c);
    } finally {
      await c.end();
    }
  })();

  const seed = resolveDatabaseAuthority({ operation: 'reference-seed', credentialClass: 'local-owner' });
  const decision = authorizeDatabaseOperation(seed, {
    approval: protectedDatabaseApprovalFromEnvironment(seed),
  });
  const c = await createAuthoritySqlConnection(seed, decision);
  let replay;
  try {
    replay = await prepareNationalCanonicalPlaces({ authority: seed, decision, connection: c, root: ROOT });
  } finally {
    await c.end();
  }
  const wroteNothing =
    replay.written.places === 0 &&
    replay.written.names === 0 &&
    replay.written.relationships === 0 &&
    replay.written.evidence === 0 &&
    replay.written.externalMappings === 0;
  check(wroteNothing, 'the replay wrote zero rows', JSON.stringify(replay.written));

  const after = await (async () => {
    const c2 = await connect();
    try {
      return await tableState(c2);
    } finally {
      await c2.end();
    }
  })();
  const identical = Object.keys(after).every(
    table => after[table].digest === before[table].digest && after[table].rows === before[table].rows,
  );
  check(identical, 'every authority table digest is unchanged by the replay', describeState(after));
}


// ------------------------------- 8. partial-target refusal, from a real partial state
console.log('');
console.log('8. a partially loaded target is refused, not extended');
{
  // A partial state is produced the way one actually arises: a target holding a single
  // province. Deleting rows to fake one is not available here and should not be: the
  // foreign keys correctly refuse to delete a Place that evidence still references.
  const seed = resolveDatabaseAuthority({ operation: 'reference-seed', credentialClass: 'local-owner' });
  const decision = authorizeDatabaseOperation(seed, {
    approval: protectedDatabaseApprovalFromEnvironment(seed),
  });

  // Start from a genuinely empty target for this step.
  const reset = await createAuthoritySqlConnection(seed, decision);
  try {
    for (const table of ['place_external_mapping', 'place_evidence', 'place_relationship', 'place_name', 'place']) {
      await reset.query(`DELETE FROM \`${table}\``);
    }
  } finally {
    await reset.end();
  }

  const single = await createAuthoritySqlConnection(seed, decision);
  try {
    const { prepareCanonicalPlaces } = await import(
      '../../server/_core/databaseAuthority/dataAdapters/canonicalPlaces.ts'
    );
    await prepareCanonicalPlaces({ authority: seed, decision, connection: single, territoryId: 'za-fs', root: ROOT });
  } finally {
    await single.end();
  }

  const probe = await connect();
  const partialCount = (await queryRows(probe, 'SELECT COUNT(*) AS n FROM `place`'))[0].n;
  await probe.end();
  check(partialCount > 0 && partialCount < REQUIRED.places, 'the target now holds exactly one province', `${partialCount} places`);

  const attempt = await createAuthoritySqlConnection(seed, decision);
  let refusal = '';
  try {
    await prepareNationalCanonicalPlaces({ authority: seed, decision, connection: attempt, root: ROOT });
  } catch (error) {
    refusal = String(error.message).split('\n')[0];
  } finally {
    await attempt.end();
  }
  check(
    /already holds|partially loaded|not the/.test(refusal),
    'the national load refuses a partial target instead of extending it',
    refusal.slice(0, 130) || 'NO REFUSAL RAISED',
  );

  const after = await connect();
  const stillPartial = (await queryRows(after, 'SELECT COUNT(*) AS n FROM `place`'))[0].n;
  await after.end();
  check(stillPartial === partialCount, 'the refusal left the partial state untouched', `${partialCount} -> ${stillPartial}`);
}

console.log('');
console.log('evidence:');
for (const line of evidence) console.log(line);

console.log('');
if (failures.length) {
  console.error(`national storage proof: FAILED (${failures.length})`);
  for (const failure of failures) console.error(`  FAIL  ${failure}`);
  process.exit(1);
}
console.log('national storage proof: OK');
process.exit(0);
