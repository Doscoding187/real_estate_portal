import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import * as schema from '../../../drizzle/schema';
import {
  authorizeDatabaseOperation,
  B08_RUNTIME_IDENTITY,
  expectedDatabaseAcknowledgement,
  LEGAL_RUNTIME_GRANT_DIGEST,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';
import { LEGAL_RUNTIME_GRANT_DATABASE, legalRuntimeGrantPlan } from './legalRuntimeGrantPlan';
import {
  compareNormalizedSchemas,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
} from './schemaCongruency';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';
import { acquireMigrationLock } from '../../migrations/runSqlMigrations';

export const LEGAL_RUNTIME_GRANT_ADMIN_HOST = 'propertylistify-mysql.mysql.database.azure.com';
export const LEGAL_RUNTIME_GRANT_ADMIN_URL_ENV = 'DATABASE_BOOTSTRAP_ADMIN_URL';
export const LEGAL_RUNTIME_GRANT_DIGEST_ENV = 'LEGAL_RUNTIME_GRANT_PLAN_DIGEST';
export const LEGAL_RUNTIME_GRANT_ACK_ENV = 'LEGAL_RUNTIME_GRANT_ACK';
const WITHHELD_ADMIN_IDENTITIES = [
  'propertylistify_app_runtime',
  'propertylistify_job_worker',
  'propertylistify_release_migrator',
  'propertylistify_b08_inspector',
];

export type LegalGrantMode = 'apply' | 'rollback';

const sha256 = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Fixed offline plan; applying it requires its own protected authorization. */
export function legalRuntimeGrantExecutionPlan(root = process.cwd()) {
  const plan = legalRuntimeGrantPlan(root);
  if (plan.planDigest !== LEGAL_RUNTIME_GRANT_DIGEST) {
    throw new Error('Legal runtime grant source differs from the reviewed release.');
  }
  return plan;
}

export type LegalRuntimeGrantPlan = ReturnType<typeof legalRuntimeGrantExecutionPlan>;

export function legalRuntimeGrantAcknowledgement(mode: LegalGrantMode, planDigest: string) {
  return `CONFIRM_RUNTIME_LEGAL_GRANT_${mode === 'apply' ? 'APPLY' : 'ROLLBACK'}_${planDigest.slice(0, 16)}`;
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

/** Fail-closed parser: only direct table/database/global grants for the runtime account. */
export function parseLegalRuntimeGrants(observed: readonly string[]): string[] {
  const entries = new Set<string>();
  for (const statement of observed) {
    const match = statement
      .trim()
      .match(
        /^GRANT ([A-Z_ ,]+) ON (`[A-Za-z0-9_]+`|\*)\.(`[A-Za-z0-9_]+`|\*) TO ([`'])([a-z0-9_]+)\4@([`'])%\6$/,
      );
    if (!match || match[5] !== B08_RUNTIME_IDENTITY) {
      throw new Error('Legal runtime grant refused: observed grants contain an unsupported statement.');
    }
    const privileges = match[1].split(',').map(value => value.trim());
    const scope = `${match[2]}.${match[3]}`;
    for (const privilege of privileges) entries.add(`${scope}:${privilege}`);
  }
  return [...entries].sort();
}

/**
 * Precondition on the observed BEFORE grants: apply requires none of the planned
 * privileges to exist; rollback requires all of them. Runs before any dispatch.
 */
export function assertLegalGrantPrecondition(
  beforeObserved: readonly string[],
  plannedPrivileges: readonly string[],
  mode: LegalGrantMode,
) {
  const beforeSet = new Set(parseLegalRuntimeGrants(beforeObserved));
  const overlap = plannedPrivileges.filter(entry => beforeSet.has(entry));
  if (mode === 'apply' && overlap.length > 0) {
    throw new Error('Legal runtime grant refused: planned privileges already exist before apply.');
  }
  if (mode === 'rollback' && overlap.length !== new Set(plannedPrivileges).size) {
    throw new Error('Legal runtime grant refused: planned privileges are not all present for rollback.');
  }
}

/** After must equal before plus (apply) or minus (rollback) exactly the planned privileges. */
export function reconcileLegalRuntimeGrants(
  beforeObserved: readonly string[],
  afterObserved: readonly string[],
  plannedPrivileges: readonly string[],
  mode: LegalGrantMode,
) {
  assertLegalGrantPrecondition(beforeObserved, plannedPrivileges, mode);
  const before = parseLegalRuntimeGrants(beforeObserved);
  const planned = new Set(plannedPrivileges);
  const expected =
    mode === 'apply'
      ? [...new Set([...before, ...plannedPrivileges])].sort()
      : before.filter(entry => !planned.has(entry));
  const after = parseLegalRuntimeGrants(afterObserved);
  if (JSON.stringify(after) !== JSON.stringify(expected)) {
    throw new Error('Legal runtime grant verification failed: grants differ from before plus the exact plan.');
  }
  return {
    beforeGrantDigest: sha256(before),
    afterGrantDigest: sha256(after),
    changedPrivileges: [...plannedPrivileges],
  };
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

const showGrants = async (connection: AuthoritySqlConnection) =>
  (await rows(connection, `SHOW GRANTS FOR '${B08_RUNTIME_IDENTITY}'@'%'`)).flatMap(row =>
    Object.values(row).map(String),
  );

/** Used only after canonical authorization/connection creation. No retries or DDL/data writes. */
export async function executeLegalRuntimeGrantPlan(
  connection: AuthoritySqlConnection,
  plan: LegalRuntimeGrantPlan,
  mode: LegalGrantMode,
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
  let reconciliation: ReturnType<typeof reconcileLegalRuntimeGrants> | undefined;
  let appliedPlanDigest: string | undefined;
  const cleanupFailures: unknown[] = [];
  let stage = 'validate-plan';
  try {
    const reviewedPlan = legalRuntimeGrantExecutionPlan();
    if (sha256(plan) !== sha256(reviewedPlan)) {
      throw new Error(
        'Legal runtime grant refused: execution plan differs from the fixed reviewed plan.',
      );
    }
    appliedPlanDigest = reviewedPlan.planDigest;
    const statements =
      mode === 'apply' ? reviewedPlan.statements : reviewedPlan.rollbackStatements;
    stage = 'verify-physical';
    await verifyPhysical();
    stage = 'verify-prior-grants';
    const before = await showGrants(connection);
    assertLegalGrantPrecondition(before, reviewedPlan.plannedPrivileges, mode);
    observe({ ...progress }); // external custody must retain this intent before dispatch
    stage = 'grant-dispatch';
    for (const [index, statement] of statements.entries()) {
      progress = { completedStatements: index, activeStatement: index, outcome: 'unknown' };
      observe({ ...progress }); // uncertainty begins before dispatch, not after acknowledgement
      await connection.execute(statement);
      progress = {
        completedStatements: index + 1,
        activeStatement: null,
        outcome: index === statements.length - 1 ? 'complete' : 'unknown',
      };
      observe({ ...progress });
    }
    stage = 'verify-resulting-grants';
    const after = await showGrants(connection);
    reconciliation = reconcileLegalRuntimeGrants(before, after, reviewedPlan.plannedPrivileges, mode);
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
    mode,
    planDigest: appliedPlanDigest!,
    beforeGrantDigest: reconciliation!.beforeGrantDigest,
    afterGrantDigest: reconciliation!.afterGrantDigest,
    addedPrivileges: mode === 'apply' ? reconciliation!.changedPrivileges : [],
    removedPrivileges: mode === 'rollback' ? reconciliation!.changedPrivileges : [],
    statementsExecuted: progress.completedStatements,
    outcome: progress.outcome,
    connectionClosed: true as const,
  };
}

function assertAdminHost(adminDatabaseUrl: string) {
  let host = '';
  try {
    host = new URL(adminDatabaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error('Legal runtime grant refused: admin connection target is not a valid URL.');
  }
  if (host !== LEGAL_RUNTIME_GRANT_ADMIN_HOST) {
    throw new Error('Legal runtime grant refused: admin host is not the approved production server.');
  }
}

/**
 * Operator inputs for a job without stdin: flag or env, never both different.
 * Never echoes values in errors.
 */
export function resolveLegalGrantOperatorInputs(
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): { planDigest: string; acknowledgement: string } {
  const clean = (raw: string | undefined, label: string) => {
    if (raw === undefined) return undefined;
    const value = raw.trim();
    if (!value || value === 'undefined' || value === 'null' || value.startsWith('--'))
      throw new Error(`Invalid value for ${label}.`);
    return value;
  };
  const pick = (flagName: string, envName: string) => {
    const indexes = args.flatMap((arg, i) => (arg === flagName ? [i] : []));
    if (indexes.length > 1) throw new Error(`Duplicated flag ${flagName}.`);
    const fromFlag = indexes.length ? clean(args[indexes[0] + 1] ?? '', flagName) : undefined;
    const fromEnv = clean(env[envName], envName);
    if (fromFlag && fromEnv && fromFlag !== fromEnv)
      throw new Error(`${flagName} and ${envName} disagree; refusing.`);
    const value = fromFlag ?? fromEnv;
    if (!value) throw new Error(`Provide ${flagName} or ${envName}.`);
    return value;
  };
  return {
    planDigest: pick('--plan-digest', LEGAL_RUNTIME_GRANT_DIGEST_ENV),
    acknowledgement: pick('--ack', LEGAL_RUNTIME_GRANT_ACK_ENV),
  };
}

/** Admin URL is ephemeral operator input (job secretref); it is never printed or persisted. */
export async function applyLegalRuntimeGrants(input: {
  mode: LegalGrantMode;
  adminDatabaseUrl: string;
  planDigest: string;
  acknowledgement: string;
  processEnv?: NodeJS.ProcessEnv;
  root?: string;
  observe: (progress: LegalGrantProgress) => void;
}) {
  const root = input.root ?? process.cwd();
  const env = input.processEnv ?? process.env;
  if (input.mode !== 'apply' && input.mode !== 'rollback')
    throw new Error('Legal runtime grant refused: mode must be apply or rollback.');
  const plan = legalRuntimeGrantExecutionPlan(root);
  if (input.planDigest !== plan.planDigest)
    throw new Error('Legal runtime grant refused: exact plan digest is required.');
  if (input.acknowledgement !== legalRuntimeGrantAcknowledgement(input.mode, plan.planDigest))
    throw new Error('Legal runtime grant refused: exact acknowledgement is required.');
  assertAdminHost(input.adminDatabaseUrl);
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(root, 'server/migrations'),
    manifestPath: resolve(root, 'server/migrations/manifest.json'),
  });
  const desired = normalizedDesiredSchema(schema);
  if (
    manifest.document.expectedHead !== plan.expectedHead ||
    manifest.manifestDigest !== plan.manifestDigest ||
    manifest.orderedMigrations.length !== plan.expectedMigrationCount ||
    desired.digest !== plan.expectedModelDigest
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
    authority.context.databaseName !== LEGAL_RUNTIME_GRANT_DATABASE ||
    !authority.context.tls.required ||
    !authority.context.tls.certificateVerificationRequired
  ) {
    throw new Error('Legal runtime grant refused: target or TLS binding changed.');
  }
  const approval = protectedDatabaseApprovalFromEnvironment(authority, env);
  if (approval?.runtimeGrantDigest !== plan.planDigest)
    throw new Error('Legal runtime grant refused: approval is not bound to this plan digest.');
  const decision = authorizeDatabaseOperation(authority, {
    root,
    approval,
    acknowledgement: expectedDatabaseAcknowledgement(authority.context),
  });
  let connection: AuthoritySqlConnection;
  try {
    connection = await createAuthoritySqlConnection(authority, decision);
  } catch (error) {
    throw new LegalRuntimeGrantFailure(
      { completedStatements: 0, activeStatement: null, outcome: 'not-started' },
      error,
      [],
      'connect',
    );
  }
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
      WITHHELD_ADMIN_IDENTITIES.includes(expectedAdmin) ||
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
    if (
      !compareNormalizedSchemas(desired, physical).congruent ||
      physical.digest !== plan.expectedModelDigest
    )
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
  return executeLegalRuntimeGrantPlan(
    connection,
    plan,
    input.mode,
    verifyPhysical,
    input.observe,
    releaseLock,
  );
}
