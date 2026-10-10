import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as schema from '../../../drizzle/schema';
import {
  authorizeDatabaseOperation,
  B08_AZURE_TARGET_FINGERPRINT_HASH,
  B08_RUNTIME_IDENTITY,
  B08_RUNTIME_LEDGER_READ_GRANT_DIGEST,
  CANONICAL_PLACE_RUNTIME_GRANT_DIGEST,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';
import { buildIsolatedCiGrantPlan } from './isolatedCiCredentials';
import { assertIsolatedCiGrants } from './isolatedCiGrantVerification';
import {
  compareNormalizedSchemas,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
} from './schemaCongruency';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';
import { acquireMigrationLock } from '../../migrations/runSqlMigrations';

const TABLES = [
  'place',
  'place_evidence',
  'place_external_mapping',
  'place_name',
  'place_relationship',
  'search_area',
  'search_area_member',
] as const;
const DATABASE = 'propertylistify_database';
const HEAD = '0111_properties_canonical_place_reference_fk.sql';
const MODEL_DIGEST = 'a3567c76721b8c3526c83287478ce51284aa102b365435c3daf28dc6bac99b97';
const fingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Offline, fixed least-privilege extension. This does not inspect or change a database. */
export function canonicalPlaceRuntimeGrantPlan(root = process.cwd()) {
  const inventory = JSON.parse(
    readFileSync(resolve(root, 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
  ) as { tables: string[] };
  if (
    inventory.tables.length !== 221 ||
    new Set(inventory.tables).size !== 221 ||
    TABLES.some(table => !inventory.tables.includes(table))
  ) {
    throw new Error('Place runtime grant plan refused: canonical table inventory changed.');
  }
  const before = buildIsolatedCiGrantPlan({
    tables: inventory.tables.filter(table => !(TABLES as readonly string[]).includes(table)),
    databaseName: DATABASE,
    roleUsers: {
      runtime: B08_RUNTIME_IDENTITY,
      worker: 'propertylistify_job_worker',
      'read-only': 'propertylistify_b08_inspector',
      migration: 'propertylistify_release_migrator',
    },
    runtimeLedgerRead: true,
  });
  if (before.fingerprints.runtime !== B08_RUNTIME_LEDGER_READ_GRANT_DIGEST) {
    throw new Error('Place runtime grant plan refused: reviewed prior grants changed.');
  }
  const statements = TABLES.map(
    table =>
      `GRANT ${table === 'place_evidence' ? 'SELECT, INSERT, UPDATE' : 'SELECT'} ON \`${DATABASE}\`.\`${table}\` TO '${B08_RUNTIME_IDENTITY}'@'%'`,
  );
  const after = [...before.statementsByCredential.runtime, ...statements];
  if (fingerprint([...after].sort()) !== CANONICAL_PLACE_RUNTIME_GRANT_DIGEST) {
    throw new Error('Place runtime grant plan refused: reviewed extension changed.');
  }
  const binding = {
    planVersion: 1,
    operation: 'runtime-place-grant' as const,
    targetFingerprintHash: B08_AZURE_TARGET_FINGERPRINT_HASH,
    database: DATABASE,
    identity: B08_RUNTIME_IDENTITY,
    expectedHead: HEAD,
    expectedMigrationCount: 112,
    expectedModelDigest: MODEL_DIGEST,
    previousGrantDigest: before.fingerprints.runtime,
    resultingGrantDigest: CANONICAL_PLACE_RUNTIME_GRANT_DIGEST,
    statements,
  };
  return {
    ...binding,
    planDigest: fingerprint(binding),
    before: [...before.statementsByCredential.runtime],
    after,
  };
}

export type PlaceGrantProgress = {
  completedStatements: number;
  activeStatement: number | null;
  outcome: 'not-started' | 'unknown' | 'complete';
};

export class PlaceRuntimeGrantFailure extends Error {
  readonly safeToReplay = false;
  constructor(
    readonly progress: PlaceGrantProgress,
    readonly primaryFailure: unknown,
    readonly cleanupFailures: readonly unknown[],
    readonly failureStage: string,
  ) {
    super(
      'Place runtime grant operation did not complete verification and connection closure; preserve evidence and inspect before recovery.',
    );
    this.name = 'PlaceRuntimeGrantFailure';
  }
}

const physicalGrants = (statements: readonly string[]) =>
  statements.map(statement => statement.replace('`propertyImages`', '`propertyimages`'));
export function assertPlaceRuntimeGrants(
  observed: readonly string[],
  expected: readonly string[],
): string {
  return assertIsolatedCiGrants(observed, physicalGrants(expected), B08_RUNTIME_IDENTITY);
}

async function rows(
  connection: AuthoritySqlConnection,
  statement: string,
  values: readonly unknown[] = [],
) {
  const result = await connection.query(statement, values);
  return (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : []) as Record<
    string,
    unknown
  >[];
}

/** Used only after canonical authorization/connection creation. No retries or DDL/data writes. */
export async function executePlaceRuntimeGrantPlan(
  connection: AuthoritySqlConnection,
  plan: ReturnType<typeof canonicalPlaceRuntimeGrantPlan>,
  verifyPhysical: () => Promise<void>,
  observe: (progress: PlaceGrantProgress) => void,
  releaseLock: () => Promise<void> = async () => {},
) {
  let progress: PlaceGrantProgress = {
    completedStatements: 0,
    activeStatement: null,
    outcome: 'not-started',
  };
  let primaryFailure: unknown;
  let failed = false;
  let actualGrantDigest: string | undefined;
  let appliedPlanDigest: string | undefined;
  const cleanupFailures: unknown[] = [];
  let stage = 'validate-plan';
  try {
    const reviewedPlan = canonicalPlaceRuntimeGrantPlan();
    if (fingerprint(plan) !== fingerprint(reviewedPlan)) {
      throw new Error(
        'Place runtime grant refused: execution plan differs from the fixed reviewed plan.',
      );
    }
    appliedPlanDigest = reviewedPlan.planDigest;
    stage = 'verify-physical';
    await verifyPhysical();
    stage = 'verify-prior-grants';
    const before = await rows(connection, `SHOW GRANTS FOR '${B08_RUNTIME_IDENTITY}'@'%'`);
    assertPlaceRuntimeGrants(
      before.flatMap(row => Object.values(row).map(String)),
      reviewedPlan.before,
    );
    observe({ ...progress }); // external custody must retain this intent before dispatch
    stage = 'grant-dispatch';
    for (const [index, statement] of reviewedPlan.statements.entries()) {
      progress = { completedStatements: index, activeStatement: index, outcome: 'unknown' };
      observe({ ...progress }); // uncertainty begins before dispatch, not after acknowledgement
      await connection.execute(statement);
      progress = {
        completedStatements: index + 1,
        activeStatement: null,
        outcome: index === reviewedPlan.statements.length - 1 ? 'complete' : 'unknown',
      };
      observe({ ...progress });
    }
    stage = 'verify-resulting-grants';
    const after = await rows(connection, `SHOW GRANTS FOR '${B08_RUNTIME_IDENTITY}'@'%'`);
    actualGrantDigest = assertPlaceRuntimeGrants(
      after.flatMap(row => Object.values(row).map(String)),
      reviewedPlan.after,
    );
  } catch (error) {
    primaryFailure = error;
    failed = true;
  }
  try {
    await releaseLock();
  } catch (error) {
    cleanupFailures.push(error);
  }
  try {
    await connection.end();
  } catch (error) {
    cleanupFailures.push(error);
  }
  if (failed || cleanupFailures.length)
    throw new PlaceRuntimeGrantFailure(
      { ...progress },
      primaryFailure,
      cleanupFailures,
      failed ? stage : 'cleanup',
    );
  return {
    planDigest: appliedPlanDigest!,
    actualGrantDigest: actualGrantDigest!,
    ...progress,
    connectionClosed: true as const,
  };
}

/** Admin URL is ephemeral operator input; it must never be persisted on an application service. */
export async function applyCanonicalPlaceRuntimeGrants(input: {
  adminDatabaseUrl: string;
  planDigest: string;
  acknowledgement: string;
  processEnv?: NodeJS.ProcessEnv;
  root?: string;
  observe: (progress: PlaceGrantProgress) => void;
}) {
  const root = input.root ?? process.cwd();
  const env = input.processEnv ?? process.env;
  const plan = canonicalPlaceRuntimeGrantPlan(root);
  if (input.planDigest !== plan.planDigest)
    throw new Error('Place runtime grant refused: exact plan digest is required.');
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(root, 'server/migrations'),
    manifestPath: resolve(root, 'server/migrations/manifest.json'),
  });
  const desired = normalizedDesiredSchema(schema);
  if (
    manifest.document.expectedHead !== HEAD ||
    manifest.orderedMigrations.length !== 112 ||
    desired.digest !== MODEL_DIGEST
  ) {
    throw new Error('Place runtime grant refused: accepted schema source changed.');
  }
  const authority = resolveDatabaseAuthority({
    operation: 'runtime-place-grant',
    cwd: root,
    processEnv: env,
    explicitDatabaseUrl: input.adminDatabaseUrl,
    credentialClass: 'bootstrap-admin',
  });
  if (
    authority.context.targetFingerprintHash !== plan.targetFingerprintHash ||
    authority.context.databaseName !== DATABASE ||
    !authority.context.tls.required ||
    !authority.context.tls.certificateVerificationRequired
  ) {
    throw new Error('Place runtime grant refused: target or TLS binding changed.');
  }
  const decision = authorizeDatabaseOperation(authority, {
    root,
    approval: protectedDatabaseApprovalFromEnvironment(authority, env),
    acknowledgement: input.acknowledgement,
  });
  const connection = await createAuthoritySqlConnection(authority, decision);
  let lockHeld = false;
  const verifyPhysical = async () => {
    await acquireMigrationLock(connection, manifest.document.lockName);
    lockHeld = true;
    const session = (
      await rows(
        connection,
        'SELECT CURRENT_USER() AS current_identity, @@global.lower_case_table_names AS lower_case_table_names',
      )
    )[0];
    const expectedAdmin = decodeURIComponent(new URL(input.adminDatabaseUrl).username);
    if (
      !expectedAdmin ||
      [
        'propertylistify_app_runtime',
        'propertylistify_job_worker',
        'propertylistify_release_migrator',
        'propertylistify_b08_inspector',
      ].includes(expectedAdmin) ||
      String(session?.current_identity).split('@')[0] !== expectedAdmin ||
      Number(session?.lower_case_table_names) !== 1
    ) {
      throw new Error(
        'Place runtime grant refused: bootstrap identity or physical table case changed.',
      );
    }
    const history = await rows(
      connection,
      'SELECT filename, checksum FROM sql_migration_history ORDER BY numeric_version',
    );
    if (
      history.length !== manifest.orderedMigrations.length ||
      history.some(
        (entry, index) =>
          entry.filename !== manifest.orderedMigrations[index].filename ||
          entry.checksum !== manifest.orderedMigrations[index].checksum,
      )
    ) {
      throw new Error(
        'Place runtime grant refused: migration history differs from accepted source.',
      );
    }
    const attempts = await rows(
      connection,
      "SELECT attempt_id FROM sql_migration_attempts WHERE state IN ('running', 'failed', 'blocked') LIMIT 1",
    );
    if (attempts.length)
      throw new Error('Place runtime grant refused: migration state is active or unknown.');
    const physical = await normalizedPhysicalSchema(connection, 'mysql', desired);
    if (!compareNormalizedSchemas(desired, physical).congruent || physical.digest !== MODEL_DIGEST)
      throw new Error('Place runtime grant refused: physical schema is not congruent.');
  };
  const releaseLock = async () => {
    if (!lockHeld) return;
    const result = (
      await rows(connection, 'SELECT RELEASE_LOCK(?) AS released', [manifest.document.lockName])
    )[0];
    if (Number(result?.released) !== 1)
      throw new Error('Place runtime grant lock release did not confirm ownership release.');
    lockHeld = false;
  };
  return executePlaceRuntimeGrantPlan(connection, plan, verifyPhysical, input.observe, releaseLock);
}
