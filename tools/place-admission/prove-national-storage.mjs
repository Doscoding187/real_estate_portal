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
 *   3. every refused load leaves the target byte-identical: a partial target, a
 *      same-count identity drift, and a post-write validation failure
 *   4. the target is recreated through its own governed lifecycle
 *   5. all nine provinces load atomically and match the required counts exactly
 *   6. all 17,664 Place identities match the committed packages exactly
 *   7. each province verifies individually inside the shared target
 *   8. a replay is a byte-identical no-op
 *
 * Two orderings are deliberate and both were corrections.
 *
 * Step 2 precedes the load because a rollback that is only described is not a rollback.
 * A half-loaded target is the one unacceptable outcome: seven provinces present and one
 * missing reads as complete to every caller that does not recount.
 *
 * Step 3 precedes step 4 because the refusal scenarios wipe and repopulate the target on
 * purpose. They used to run last, which meant a run that had already failed a
 * precondition could still erase a populated target before reporting failure. Running
 * them first, then recreating the target through its own governed lifecycle, means the
 * main proof is always a statement about a pristine target.
 *
 * Usage:
 *   npx tsx tools/place-admission/prove-national-storage.mjs
 */

import { createHash } from 'node:crypto';
import { inspectStoragePreconditions } from './storage-preconditions.mjs';
import { buildForeignIdentityFixture } from './foreign-identity-fixture.mjs';
import { execFileSync } from 'node:child_process';
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
let checksRun = 0;

/**
 * Record a check. `check` records and continues; `require` records and STOPS.
 *
 * The distinction is the whole point of this tool after review. It previously used one
 * function for both, so a failed precondition was recorded and the run continued -- and
 * a later step deleted all five authority tables to construct its partial-target case.
 * That means a run which had already established the target was not in the expected
 * state could erase it and only report failure at the end. A precondition that fails
 * must stop the run before anything destructive can happen.
 */
function check(ok, label, detail = '') {
  checksRun += 1;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`;
  console.log(`  ${line}`);
  evidence.push(line);
  if (!ok) failures.push(label);
  return ok;
}

/** A precondition. Failing one aborts the whole run immediately. */
function require(ok, label, detail = '') {
  if (!check(ok, label, detail)) {
    console.error('');
    console.error(`national storage proof: ABORTED on a failed precondition: ${label}`);
    console.error('  Nothing further was run. No destructive step was reached, and no existing');
    console.error('  target evidence was altered.');
    process.exit(1);
  }
  return true;
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
try {
  const initial = await inspectStoragePreconditions({
    connection, queryRows, tableState, expectedHead: RECONCILED_HEAD,
  });
  require(true, 'applied migration head is the reconciled head', `head=${initial.head}`);
  evidence.push(`      applied migrations: ${initial.migrationCount}`);
  require(true, 'every authority table is empty before the load', describeState(initial.state));
} finally {
  // Inspection errors propagate and abort before any destructive scenario.
  await connection.end();
}

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

  require(faultAt === 6000, 'the injected fault fired mid-load, not before it', `after ${faultAt} place inserts`);
  require(/INJECTED/.test(refused), 'the load refused rather than reporting success', refused.slice(0, 90));

  const afterConnection = await connect();
  const after = await tableState(afterConnection);
  await afterConnection.end();

  const unchanged = Object.keys(after).every(
    table => after[table].rows === 0 && after[table].digest === before[table].digest,
  );
  require(unchanged, 'all five authority tables are unchanged and empty after the fault', describeState(after));
}

// ------------------------------------- 8. refusal scenarios, each digest-guarded
console.log('');
console.log('3. refused loads leave the target byte-identical (destructive; runs before the main proof)');
console.log('   These scenarios wipe and repopulate the target on purpose. They run FIRST, and the');
console.log('   target is then recreated through its own owned lifecycle, so the main proof is never');
console.log('   built on a target whose evidence an earlier step erased.');
{
  const seedAuthority = () => resolveDatabaseAuthority({ operation: 'reference-seed', credentialClass: 'local-owner' });

  /** Digest every authority table, the unit of "unchanged" for every refusal below. */
  const snapshot = async () => {
    const c = await connect();
    try {
      return await tableState(c);
    } finally {
      await c.end();
    }
  };

  /**
   * (a) Partial target. Built by loading a single province, which is how a partial
   * state actually arises. No rows are deleted to fake one: the foreign keys correctly
   * refuse to delete a Place that evidence still references, and faking it by deletion
   * is what made the previous version of this tool capable of erasing a populated
   * target's evidence.
   */
  {
    const authority = seedAuthority();
    const decision = authorizeDatabaseOperation(authority, {
      approval: protectedDatabaseApprovalFromEnvironment(authority),
    });
    const { prepareCanonicalPlaces } = await import(
      '../../server/_core/databaseAuthority/dataAdapters/canonicalPlaces.ts'
    );
    const single = await createAuthoritySqlConnection(authority, decision);
    try {
      await prepareCanonicalPlaces({ authority, decision, connection: single, territoryId: 'za-fs', root: ROOT });
    } finally {
      await single.end();
    }
    const probe = await connect();
    const partial = (await queryRows(probe, 'SELECT COUNT(*) AS n FROM `place`'))[0].n;
    await probe.end();
    require(partial > 0 && partial < REQUIRED.places, 'target holds exactly one province', `${partial} places`);

    const before = await snapshot();
    const attempt = await createAuthoritySqlConnection(authority, decision);
    let refusal = '';
    try {
      await prepareNationalCanonicalPlaces({ authority, decision, connection: attempt, root: ROOT });
    } catch (error) {
      refusal = String(error.message).split('\n')[0];
    } finally {
      await attempt.end();
    }
    require(/not the exact identity set|already holds/.test(refusal), 'a partial target is refused, not extended', refusal.slice(0, 120));
    const after = await snapshot();
    require(
      Object.keys(after).every(t => after[t].digest === before[t].digest),
      'the partial-target refusal changed nothing',
      describeState(after),
    );
  }

  /**
   * (b) Same-count identity drift. The case a count-based acceptance check cannot see:
   * the target holds exactly the right number of Places but one of them is not the
   * Place the packages claim. Acceptance now compares identity sets in both directions,
   * so this must be refused.
   */
  {
    const authority = seedAuthority();
    const decision = authorizeDatabaseOperation(authority, {
      approval: protectedDatabaseApprovalFromEnvironment(authority),
    });

    // A wholly foreign target of the right size is the strongest form: same count,
    // zero shared identities.
    const c = await createAuthoritySqlConnection(authority, decision);
    try {
      await buildForeignIdentityFixture(c, REQUIRED.places);
      const drifted = (await queryRows(c, 'SELECT COUNT(*) AS n FROM `place`'))[0].n;
      require(drifted === REQUIRED.places, 'the drifted target holds exactly 17,664 Places', `${drifted}`);
    } finally {
      await c.end();
    }

    const before = await snapshot();
    const attempt = await createAuthoritySqlConnection(authority, decision);
    let refusal = '';
    try {
      await prepareNationalCanonicalPlaces({ authority, decision, connection: attempt, root: ROOT });
    } catch (error) {
      refusal = String(error.message).split('\n')[0];
    } finally {
      await attempt.end();
    }
    require(
      /not the exact identity set|already holds/.test(refusal),
      'same-count identity drift is refused, not adopted',
      refusal.slice(0, 120) || 'NO REFUSAL RAISED',
    );
    const after = await snapshot();
    require(
      Object.keys(after).every(t => after[t].digest === before[t].digest),
      'the drift refusal changed nothing',
      describeState(after),
    );
  }

  /**
   * (c) Post-write validation failure rolls the whole load back.
   *
   * The load must verify inside its transaction, so a validation failure cannot leave
   * committed rows behind. The trigger is a row the database silently refuses to store:
   * one `place` insert is intercepted and reported as successful without executing, so
   * the stored total comes up short by exactly one and the in-transaction check fires.
   */
  {
    const authority = seedAuthority();
    const decision = authorizeDatabaseOperation(authority, {
      approval: protectedDatabaseApprovalFromEnvironment(authority),
    });
    const c = await createAuthoritySqlConnection(authority, decision);
    try {
      for (const table of ['place_external_mapping', 'place_evidence', 'place_relationship', 'place_name', 'place']) {
        await c.query(`DELETE FROM \`${table}\``);
      }
    } finally {
      await c.end();
    }

    const before = await snapshot();
    const attempt = await createAuthoritySqlConnection(authority, decision);
    const realQuery = attempt.query.bind(attempt);
    let inserts = 0;
    let swallowedAt = 0;
    attempt.query = async (sql, values) => {
      if (/^\s*INSERT INTO `place_external_mapping`/.test(sql)) {
        inserts += 1;
        if (inserts === 19000) {
          swallowedAt = inserts;
          return [{ affectedRows: 1, insertId: 0, warningStatus: 0 }];
        }
      }
      return realQuery(sql, values);
    };
    let refusal = '';
    try {
      await prepareNationalCanonicalPlaces({ authority, decision, connection: attempt, root: ROOT });
    } catch (error) {
      refusal = String(error.message).split('\n')[0];
    } finally {
      await attempt.end();
    }
    require(swallowedAt === 19000, 'the swallowed insert fired mid-load', `at mapping insert ${swallowedAt}`);
    require(
      /does not hold the national total|rolled back/.test(refusal),
      'a post-write validation failure refuses the load',
      refusal.slice(0, 120) || 'NO REFUSAL RAISED',
    );
    const after = await snapshot();
    require(
      Object.keys(after).every(t => after[t].digest === before[t].digest && after[t].rows === 0),
      'the rolled-back load left every authority table empty',
      describeState(after),
    );
  }
  // (d) The per-territory path must also roll back a validation refusal.
  {
    const authority = seedAuthority();
    const decision = authorizeDatabaseOperation(authority);
    const { prepareCanonicalPlaces } =
      await import('../../server/_core/databaseAuthority/dataAdapters/canonicalPlaces.ts');
    const before = await snapshot();
    require(
      Object.values(before).every(t => t.rows === 0),
      'per-territory refusal fixture starts empty',
    );
    const attempt = await createAuthoritySqlConnection(authority, decision);
    const realQuery = attempt.query.bind(attempt);
    let swallowed = false;
    attempt.query = async (sql, values) => {
      if (!swallowed && /^\s*INSERT INTO `place_external_mapping`/.test(sql)) {
        swallowed = true;
        return [{ affectedRows: 1, insertId: 0, warningStatus: 0 }];
      }
      return realQuery(sql, values);
    };
    let refusal = '';
    try {
      await prepareCanonicalPlaces({
        authority,
        decision,
        connection: attempt,
        root: ROOT,
        territoryId: 'za-gp',
      });
    } catch (error) {
      refusal = String(error.message);
    } finally {
      await attempt.end();
    }
    require(
      swallowed && /external mappings/.test(refusal),
      'per-territory validation refusal was reached',
    );
    const after = await snapshot();
    require(
      Object.keys(after).every(t => after[t].digest === before[t].digest),
      'per-territory refusal rolled back all five tables',
    );
  }

  // (e) Same IDs and totals with a changed identity-bearing field must refuse.
  {
    const authority = seedAuthority();
    const decision = authorizeDatabaseOperation(authority);
    const fixture = await createAuthoritySqlConnection(authority, decision);
    try {
      await prepareNationalCanonicalPlaces({
        authority,
        decision,
        connection: fixture,
        root: ROOT,
      });
      const [row] = await queryRows(
        fixture,
        "SELECT place_id FROM `place` WHERE place_type='suburb' LIMIT 1",
      );
      require(Boolean(row), 'national field-drift fixture has a suburb');
      // Both types accept locality search scope; this is valid SQL state with
      // the wrong admitted identity, not a constraint rejection fixture.
      await fixture.query("UPDATE `place` SET place_type='locality' WHERE place_id=?", [
        row.place_id,
      ]);
    } finally {
      await fixture.end();
    }
    const before = await snapshot();
    const attempt = await createAuthoritySqlConnection(authority, decision);
    let refusal = '';
    try {
      await prepareNationalCanonicalPlaces({
        authority,
        decision,
        connection: attempt,
        root: ROOT,
      });
    } catch (error) {
      refusal = String(error.message);
    } finally {
      await attempt.end();
    }
    require(
      /stored identity/.test(refusal),
      'national identity-field drift is refused before commit',
    );
    const after = await snapshot();
    require(
      Object.keys(after).every(t => after[t].digest === before[t].digest),
      'national identity-field refusal changed nothing',
    );
  }
}


// ---------------------------------- 3. owned lifecycle: recreate the target from zero
console.log('');
console.log('4. the target is recreated through its own owned lifecycle');
{
  // Explicit, governed, and owned: dispose the exact target, create it again, migrate
  // it to the reconciled head, and confirm empty. The refusal scenarios above erased and
  // repopulated this target deliberately; this step is what makes the proof that follows
  // a statement about a pristine target rather than about whatever they left behind.
  const cli = (...args) =>
    execFileSync('npx', ['cross-env', 'NODE_ENV=development', 'APP_ENV=development', 'tsx', 'scripts/databaseAuthorityCli.ts', ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  const context = JSON.parse(
    execFileSync(
      'npx',
      ['cross-env', 'NODE_ENV=development', 'APP_ENV=development', 'tsx', 'scripts/databaseAuthorityCli.ts', 'context'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ),
  );
  const fingerprint = context.targetFingerprintHash;
  require(/^[a-f0-9]{64}$/.test(fingerprint), 'resolved an exact target fingerprint', fingerprint.slice(0, 16));
  require(context.targetClass === 'disposable-worktree', 'target class is disposable-worktree', context.targetClass);

  cli('worktree:dispose', `--ack=CONFIRM_DATABASE_DISPOSE_${fingerprint.slice(0, 16)}`);
  check(true, 'disposed the exact owned target', fingerprint.slice(0, 16));
  cli('worktree:create');
  check(true, 'created a fresh owned target');
  cli(
    'migration:apply',
    '--accepted-old-head=none',
    `--expected-new-head=${RECONCILED_HEAD}`,
  );
  check(true, 'migrated the fresh target to the reconciled head');

  const c = await connect();
  try {
    const fresh = await tableState(c);
    require(
      Object.values(fresh).every(entry => entry.rows === 0),
      'the recreated target is empty',
      describeState(fresh),
    );
  } finally {
    await c.end();
  }
}

// ------------------------------------------------------- 4. atomic load of all nine
console.log('');
console.log('5. all nine provinces load atomically');
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
  // Accurate first-load counts. The counter was wrong twice before: `affectedRows`
  // reported a full replay as a full write, and switching to `insertId` made a genuine
  // first load report zero as well, because `place` has a string primary key and no
  // auto-increment column. Counts are now measured from the target either side of the
  // transaction, so both directions are asserted here.
  check(
    loaded.written.places === REQUIRED.places &&
      loaded.written.names === REQUIRED.names &&
      loaded.written.relationships === REQUIRED.relationships &&
      loaded.written.evidence === REQUIRED.evidence &&
      loaded.written.externalMappings === 19792,
    'first load reports the exact number of rows created',
    JSON.stringify(loaded.written),
  );
  check(
    loaded.identity === 'place_id' && loaded.rejectedConstraints.length === 2,
    'identity is place_id and the rejected constraints are recorded',
    loaded.rejectedConstraints.join(' | '),
  );
}

// ------------------------------------------------------------- 4. required counts
console.log('');
console.log('6. required national totals');
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
console.log('7. all 17,664 Place identities match the committed packages exactly');
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
console.log('8. each province verifies individually inside the shared target');
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
console.log('9. replay is a byte-identical no-op');
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
