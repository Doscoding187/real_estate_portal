import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import * as schema from '../../../drizzle/schema';
import {
  authorizeDatabaseOperation,
  B08_RUNTIME_IDENTITY,
  expectedDatabaseAcknowledgement,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';
import { RUNTIME_GRANT_0197_TABLES, runtimeGrant0197Plan } from './runtimeGrant0197Plan';
import {
  compareNormalizedSchemas,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
} from './schemaCongruency';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';
import { acquireMigrationLock } from '../../migrations/runSqlMigrations';

export const RUNTIME_0197_ADMIN_HOST = 'propertylistify-mysql.mysql.database.azure.com';
export const RUNTIME_0197_ADMIN_URL_ENV = 'DATABASE_BOOTSTRAP_ADMIN_URL';
const DATABASE = 'propertylistify_database';
const WITHHELD_ADMIN_IDENTITIES = [
  'propertylistify_app_runtime',
  'propertylistify_job_worker',
  'propertylistify_release_migrator',
  'propertylistify_b08_inspector',
];

export type Runtime0197Mode = 'apply' | 'rollback';

const sha256 = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Fixed offline plan. Statements derive ONLY from RUNTIME_GRANT_0197_TABLES and
 * the runtime identity constant; no wildcard, grant option or other account.
 */
export function runtimeGrant0197ApplyPlan(root = process.cwd()) {
  const source = runtimeGrant0197Plan(root);
  const account = `'${B08_RUNTIME_IDENTITY}'@'%'`;
  const grants = RUNTIME_GRANT_0197_TABLES.map(
    ({ table, privileges }) =>
      `GRANT ${privileges.join(', ')} ON \`${DATABASE}\`.\`${table}\` TO ${account}`,
  );
  const rollback = RUNTIME_GRANT_0197_TABLES.map(
    ({ table, privileges }) =>
      `REVOKE ${privileges.join(', ')} ON \`${DATABASE}\`.\`${table}\` FROM ${account}`,
  );
  if (
    JSON.stringify(grants) !== JSON.stringify(source.grants) ||
    JSON.stringify(rollback) !== JSON.stringify(source.revokes) ||
    source.identity !== B08_RUNTIME_IDENTITY ||
    source.database !== DATABASE
  ) {
    throw new Error('Runtime 0197 grant refused: statements differ from the reviewed plan source.');
  }
  const plannedPrivileges = RUNTIME_GRANT_0197_TABLES.flatMap(({ table, privileges }) =>
    privileges.map(privilege => `\`${DATABASE}\`.\`${table}\`:${privilege}`),
  ).sort();
  const binding = {
    planVersion: 1,
    operation: 'runtime-0197-grant' as const,
    database: DATABASE,
    identity: B08_RUNTIME_IDENTITY,
    expectedHead: source.expectedHead,
    expectedMigrationCount: source.expectedMigrationCount,
    expectedModelDigest: source.expectedModelDigest,
    manifestDigest: source.manifestDigest,
    statements: grants,
    rollbackStatements: rollback,
  };
  return { ...binding, plannedPrivileges, planDigest: sha256(binding) };
}

export type Runtime0197Plan = ReturnType<typeof runtimeGrant0197ApplyPlan>;

export function runtimeGrant0197Acknowledgement(mode: Runtime0197Mode, planDigest: string) {
  return `CONFIRM_RUNTIME_GRANT_0197_${mode === 'apply' ? 'APPLY' : 'ROLLBACK'}_${planDigest.slice(0, 16)}`;
}

export type Runtime0197Progress = {
  completedStatements: number;
  activeStatement: number | null;
  outcome: 'not-started' | 'unknown' | 'complete';
};

export class Runtime0197GrantFailure extends Error {
  readonly safeToReplay = false;
  constructor(
    readonly progress: Runtime0197Progress,
    readonly primaryFailure: unknown,
    readonly cleanupFailures: readonly unknown[],
    readonly failureStage: string,
  ) {
    super(
      '0197 runtime grant operation did not complete verification and connection closure; preserve evidence and inspect before recovery.',
    );
    this.name = 'Runtime0197GrantFailure';
  }
}

/** Fail-closed parser: only direct table/database table-scoped grants for the runtime account. */
export function parseRuntime0197Grants(observed: readonly string[]): string[] {
  const entries = new Set<string>();
  for (const statement of observed) {
    const match = statement
      .trim()
      .match(
        /^GRANT ([A-Z_ ,]+) ON (`[A-Za-z0-9_]+`|\*)\.(`[A-Za-z0-9_]+`|\*) TO ([`'])([a-z0-9_]+)\4@([`'])%\6$/,
      );
    if (!match || match[5] !== B08_RUNTIME_IDENTITY) {
      throw new Error('Runtime 0197 grant refused: observed grants contain an unsupported statement.');
    }
    const privileges = match[1].split(',').map(value => value.trim());
    const scope = `${match[2]}.${match[3]}`;
    if (scope === '*.*' && privileges.length === 1 && privileges[0] === 'USAGE') {
      entries.add(`${scope}:USAGE`);
      continue;
    }
    for (const privilege of privileges) entries.add(`${scope}:${privilege}`);
  }
  return [...entries].sort();
}

/** After must equal before plus (apply) or minus (rollback) exactly the planned privileges. */
export function reconcileRuntime0197Grants(
  beforeObserved: readonly string[],
  afterObserved: readonly string[],
  plannedPrivileges: readonly string[],
  mode: Runtime0197Mode,
) {
  const before = parseRuntime0197Grants(beforeObserved);
  const planned = new Set(plannedPrivileges);
  const beforeSet = new Set(before);
  const overlap = plannedPrivileges.filter(entry => beforeSet.has(entry));
  if (mode === 'apply' && overlap.length > 0) {
    throw new Error('Runtime 0197 grant refused: planned privileges already exist before apply.');
  }
  if (mode === 'rollback' && overlap.length !== planned.size) {
    throw new Error('Runtime 0197 grant refused: planned privileges are not all present for rollback.');
  }
  const expected =
    mode === 'apply'
      ? [...new Set([...before, ...plannedPrivileges])].sort()
      : before.filter(entry => !planned.has(entry));
  const after = parseRuntime0197Grants(afterObserved);
  if (JSON.stringify(after) !== JSON.stringify(expected)) {
    throw new Error('Runtime 0197 grant verification failed: grants differ from before plus the exact plan.');
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
export async function executeRuntime0197GrantPlan(
  connection: AuthoritySqlConnection,
  plan: Runtime0197Plan,
  mode: Runtime0197Mode,
  verifyPhysical: () => Promise<void>,
  observe: (progress: Runtime0197Progress) => void,
  releaseLock: () => Promise<void> = async () => {},
) {
  let progress: Runtime0197Progress = {
    completedStatements: 0,
    activeStatement: null,
    outcome: 'not-started',
  };
  let primaryFailure: unknown;
  let failed = false;
  let reconciliation: ReturnType<typeof reconcileRuntime0197Grants> | undefined;
  let appliedPlanDigest: string | undefined;
  const cleanupFailures: unknown[] = [];
  let stage = 'validate-plan';
  try {
    const reviewedPlan = runtimeGrant0197ApplyPlan();
    if (sha256(plan) !== sha256(reviewedPlan)) {
      throw new Error('Runtime 0197 grant refused: execution plan differs from the reviewed plan.');
    }
    appliedPlanDigest = reviewedPlan.planDigest;
    const statements =
      mode === 'apply' ? reviewedPlan.statements : reviewedPlan.rollbackStatements;
    stage = 'verify-physical';
    await verifyPhysical();
    stage = 'verify-prior-grants';
    const before = await showGrants(connection);
    parseRuntime0197Grants(before);
    observe({ ...progress }); // external custody retains intent before dispatch
    stage = 'grant-dispatch';
    for (const [index, statement] of statements.entries()) {
      progress = { completedStatements: index, activeStatement: index, outcome: 'unknown' };
      observe({ ...progress });
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
    reconciliation = reconcileRuntime0197Grants(before, after, reviewedPlan.plannedPrivileges, mode);
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
    throw new Runtime0197GrantFailure(
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
    nextStep: 'Run the read-only runtime probe (db:runtime-grants:0197:probe) to confirm all 14 granted tables are selectable (development_inventory_items is deliberately ungranted).',
  };
}

function assertAdminHost(adminDatabaseUrl: string) {
  let host = '';
  try {
    host = new URL(adminDatabaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error('Runtime 0197 grant refused: admin connection target is not a valid URL.');
  }
  if (host !== RUNTIME_0197_ADMIN_HOST) {
    throw new Error('Runtime 0197 grant refused: admin host is not the approved production server.');
  }
}

/** Admin URL is ephemeral operator input (job secretref); it is never printed or persisted. */
export async function applyRuntimeGrant0197(input: {
  mode: Runtime0197Mode;
  adminDatabaseUrl: string;
  planDigest: string;
  acknowledgement: string;
  processEnv?: NodeJS.ProcessEnv;
  root?: string;
  observe: (progress: Runtime0197Progress) => void;
}) {
  const root = input.root ?? process.cwd();
  const env = input.processEnv ?? process.env;
  if (input.mode !== 'apply' && input.mode !== 'rollback')
    throw new Error('Runtime 0197 grant refused: mode must be apply or rollback.');
  const plan = runtimeGrant0197ApplyPlan(root);
  if (input.planDigest !== plan.planDigest)
    throw new Error('Runtime 0197 grant refused: exact plan digest is required.');
  if (input.acknowledgement !== runtimeGrant0197Acknowledgement(input.mode, plan.planDigest))
    throw new Error('Runtime 0197 grant refused: exact acknowledgement is required.');
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
    throw new Error('Runtime 0197 grant refused: accepted schema source changed.');
  }
  const authority = resolveDatabaseAuthority({
    operation: 'runtime-0197-grant',
    cwd: root,
    processEnv: env,
    explicitDatabaseUrl: input.adminDatabaseUrl,
    credentialClass: 'bootstrap-admin',
  });
  if (
    authority.context.databaseName !== DATABASE ||
    !authority.context.tls.required ||
    !authority.context.tls.certificateVerificationRequired
  ) {
    throw new Error('Runtime 0197 grant refused: target or TLS binding changed.');
  }
  const approval = protectedDatabaseApprovalFromEnvironment(authority, env);
  if (approval?.runtimeGrantDigest !== plan.planDigest)
    throw new Error('Runtime 0197 grant refused: approval is not bound to this plan digest.');
  const decision = authorizeDatabaseOperation(authority, {
    root,
    approval,
    acknowledgement: expectedDatabaseAcknowledgement(authority.context),
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
      WITHHELD_ADMIN_IDENTITIES.includes(expectedAdmin) ||
      String(session?.current_identity).split('@')[0] !== expectedAdmin ||
      Number(session?.lower_case_table_names) !== 1
    ) {
      throw new Error(
        'Runtime 0197 grant refused: bootstrap identity or physical table case changed.',
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
      throw new Error('Runtime 0197 grant refused: migration history differs from accepted source.');
    }
    const attempts = await rows(
      connection,
      "SELECT attempt_id FROM sql_migration_attempts WHERE state IN ('running', 'failed', 'blocked') LIMIT 1",
    );
    if (attempts.length)
      throw new Error('Runtime 0197 grant refused: migration state is active or unknown.');
    const physical = await normalizedPhysicalSchema(connection, 'mysql', desired);
    if (
      !compareNormalizedSchemas(desired, physical).congruent ||
      physical.digest !== plan.expectedModelDigest
    )
      throw new Error('Runtime 0197 grant refused: physical schema is not congruent.');
  };
  const releaseLock = async () => {
    if (!lockHeld) return;
    const result = (
      await rows(connection, 'SELECT RELEASE_LOCK(?) AS released', [manifest.document.lockName])
    )[0];
    if (Number(result?.released) !== 1)
      throw new Error('Runtime 0197 grant lock release did not confirm ownership release.');
    lockHeld = false;
  };
  return executeRuntime0197GrantPlan(
    connection,
    plan,
    input.mode,
    verifyPhysical,
    input.observe,
    releaseLock,
  );
}
