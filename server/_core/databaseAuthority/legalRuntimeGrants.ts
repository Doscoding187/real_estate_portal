import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import * as schema from '../../../drizzle/schema';
import {
  authorizeDatabaseOperation,
  B08_RUNTIME_IDENTITY,
  LEGAL_RUNTIME_GRANT_DIGEST,
  CANONICAL_PLACE_RUNTIME_GRANT_DIGEST,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';
import { canonicalPlaceRuntimeGrantPlan } from './canonicalPlaceRuntimeGrants';
import { legalRuntimeGrantPlan } from './legalRuntimeGrantPlan';
import { assertIsolatedCiGrants } from './isolatedCiGrantVerification';
import {
  compareNormalizedSchemas,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
} from './schemaCongruency';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';
import { acquireMigrationLock } from '../../migrations/runSqlMigrations';

const DATABASE = 'propertylistify_database';
const HEAD = '0114_user_legal_acceptances.sql';
const MODEL_DIGEST = '65996db8ffc4fe1b8906108abe58c6202aae247d8ee8f0fef1e2e7c3da345721';
const MANIFEST_DIGEST = '7c5a7c8f514ea9be21ec668a9953a7de428ecf5719b746876ef64aae78b0dc9c';
const fingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Fixed offline plan; applying it requires its own protected authorization. */
export function legalRuntimeGrantExecutionPlan(root = process.cwd()) {
  const delta = legalRuntimeGrantPlan(root);
  const predecessor = canonicalPlaceRuntimeGrantPlan(root);
  if (
    delta.previousGrantDigest !== CANONICAL_PLACE_RUNTIME_GRANT_DIGEST ||
    delta.resultingGrantDigest !== LEGAL_RUNTIME_GRANT_DIGEST ||
    delta.expectedModelDigest !== MODEL_DIGEST ||
    delta.manifestDigest !== MANIFEST_DIGEST
  )
    throw new Error('Legal runtime grant source differs from the reviewed release.');
  const binding = {
    planVersion: 1,
    operation: 'runtime-legal-grant' as const,
    targetFingerprintHash: delta.targetFingerprintHash,
    database: delta.database,
    identity: delta.identity,
    expectedHead: HEAD,
    expectedMigrationCount: 115,
    expectedModelDigest: MODEL_DIGEST,
    manifestDigest: MANIFEST_DIGEST,
    previousGrantDigest: delta.previousGrantDigest,
    resultingGrantDigest: delta.resultingGrantDigest,
    statements: delta.statements,
  };
  return {
    ...binding,
    planDigest: fingerprint(binding),
    before: [...predecessor.after],
    after: [...predecessor.after, ...delta.statements],
  };
}

export type LegalGrantProgress = {
  completedStatements: number;
  activeStatement: number | null;
  outcome: 'not-started' | 'unknown' | 'complete';
};

export class LegalRuntimeGrantFailure extends Error {
  readonly safeToReplay = false;
  constructor(
    readonly progress: LegalGrantProgress,
    readonly primaryFailure: unknown,
    readonly cleanupFailures: readonly unknown[],
    readonly failureStage: string,
  ) {
    super(
      'Legal runtime grant operation did not complete verification and connection closure; preserve evidence and inspect before recovery.',
    );
    this.name = 'LegalRuntimeGrantFailure';
  }
}

const physicalGrants = (statements: readonly string[]) =>
  statements.map(statement => statement.replace('`propertyImages`', '`propertyimages`'));
export function assertLegalRuntimeGrants(
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
export async function executeLegalRuntimeGrantPlan(
  connection: AuthoritySqlConnection,
  plan: ReturnType<typeof legalRuntimeGrantExecutionPlan>,
  verifyPhysical: () => Promise<void>,
  observe: (progress: LegalGrantProgress) => void,
  releaseLock: () => Promise<void> = async () => {},
) {
  let progress: LegalGrantProgress = {
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
    const reviewedPlan = legalRuntimeGrantExecutionPlan();
    if (fingerprint(plan) !== fingerprint(reviewedPlan)) {
      throw new Error(
        'Legal runtime grant refused: execution plan differs from the fixed reviewed plan.',
      );
    }
    appliedPlanDigest = reviewedPlan.planDigest;
    stage = 'verify-physical';
    await verifyPhysical();
    stage = 'verify-prior-grants';
    const before = await rows(connection, `SHOW GRANTS FOR '${B08_RUNTIME_IDENTITY}'@'%'`);
    assertLegalRuntimeGrants(
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
    actualGrantDigest = assertLegalRuntimeGrants(
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
    throw new LegalRuntimeGrantFailure(
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
export async function applyLegalRuntimeGrants(input: {
  adminDatabaseUrl: string;
  planDigest: string;
  acknowledgement: string;
  processEnv?: NodeJS.ProcessEnv;
  root?: string;
  observe: (progress: LegalGrantProgress) => void;
}) {
  const root = input.root ?? process.cwd();
  const env = input.processEnv ?? process.env;
  const plan = legalRuntimeGrantExecutionPlan(root);
  if (input.planDigest !== plan.planDigest)
    throw new Error('Legal runtime grant refused: exact plan digest is required.');
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(root, 'server/migrations'),
    manifestPath: resolve(root, 'server/migrations/manifest.json'),
  });
  const desired = normalizedDesiredSchema(schema);
  if (
    manifest.document.expectedHead !== HEAD ||
    manifest.manifestDigest !== MANIFEST_DIGEST ||
    manifest.orderedMigrations.length !== 115 ||
    desired.digest !== MODEL_DIGEST
  ) {
    throw new Error('Legal runtime grant refused: accepted schema source changed.');
  }
  const authority = resolveDatabaseAuthority({
    operation: 'runtime-legal-grant',
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
    throw new Error('Legal runtime grant refused: target or TLS binding changed.');
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
        'Legal runtime grant refused: bootstrap identity or physical table case changed.',
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
        'Legal runtime grant refused: migration history differs from accepted source.',
      );
    }
    const attempts = await rows(
      connection,
      "SELECT attempt_id FROM sql_migration_attempts WHERE state IN ('running', 'failed', 'blocked') LIMIT 1",
    );
    if (attempts.length)
      throw new Error('Legal runtime grant refused: migration state is active or unknown.');
    const physical = await normalizedPhysicalSchema(connection, 'mysql', desired);
    if (!compareNormalizedSchemas(desired, physical).congruent || physical.digest !== MODEL_DIGEST)
      throw new Error('Legal runtime grant refused: physical schema is not congruent.');
  };
  const releaseLock = async () => {
    if (!lockHeld) return;
    const result = (
      await rows(connection, 'SELECT RELEASE_LOCK(?) AS released', [manifest.document.lockName])
    )[0];
    if (Number(result?.released) !== 1)
      throw new Error('Legal runtime grant lock release did not confirm ownership release.');
    lockHeld = false;
  };
  return executeLegalRuntimeGrantPlan(connection, plan, verifyPhysical, input.observe, releaseLock);
}
