import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertAuthorizedDatabaseOperation,
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
  type AuthorizedDatabaseOperation,
  type ProtectedDatabaseApproval,
} from '../_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../_core/databaseAuthority/context';
import type { ResolvedDatabaseAuthority } from '../_core/databaseAuthority/types';
import { buildMysqlConnectionSecurityConfig } from '../_core/databaseTls';
import {
  loadAndValidateMigrationManifest,
  migrationChecksum,
  parseSqlStatements,
  type MigrationManifestEntry,
  type ValidatedMigrationManifest,
} from './migrationManifest';

export { migrationChecksum } from './migrationManifest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDirectExecution = Boolean(process.argv[1]) && resolve(process.argv[1]) === __filename;

export type AppliedMigration = {
  fileName: string;
  checksum: string;
};

export type MigrationAttempt = {
  attemptId: string;
  fileName: string;
  state: 'running' | 'failed' | 'blocked' | 'succeeded';
};

export type MigrationLockEvidence = {
  lockName: string;
  ownerConnectionId: string;
  ownershipVerified: true;
};

export type MigrationPlan = {
  planVersion: 1;
  planId: string;
  planDigest: string;
  manifestDigest: string;
  targetFingerprintHash: string;
  acceptedOldHead: string | null;
  pending: ReadonlyArray<{
    sequence: number;
    filename: string;
    checksum: string;
    kind: MigrationManifestEntry['kind'];
    statementCount: number;
  }>;
  expectedNewHead: string;
  incompleteAttempts: ReadonlyArray<MigrationAttempt>;
};

export type SqlMigrationOptions = {
  mode?: 'plan' | 'apply';
  operation?: 'migration-plan' | 'migration-apply' | 'release-plan' | 'release-apply';
  migrationsDir?: string;
  manifestPath?: string;
  authority?: ResolvedDatabaseAuthority;
  authorization?: AuthorizedDatabaseOperation;
  acceptedOldHead?: string | null;
  expectedNewHead?: string;
  applicationArtifact?: string;
  approval?: ProtectedDatabaseApproval;
  acknowledgement?: string;
  connectionFactory?: (
    authority: ResolvedDatabaseAuthority,
    decision: AuthorizedDatabaseOperation,
  ) => Promise<AuthoritySqlConnection>;
};

type DatabaseMigrationState = {
  historyTablePresent: boolean;
  attemptTablePresent: boolean;
  applied: AppliedMigration[];
  incompleteAttempts: MigrationAttempt[];
  applicationTableCount: number;
};

type MigrationControlState = 'coherent' | 'fresh-establishment';

function planHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function sortMigrationFiles(files: string[]): string[] {
  const numeric = new Map<number, string[]>();
  for (const file of files) {
    const match = file.match(/^(\d{4})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/);
    if (!match) {
      throw new Error(
        `Malformed SQL migration filename "${file}". Expected a four-digit numeric prefix and lowercase identity.`,
      );
    }
    const sequence = Number(match[1]);
    const group = numeric.get(sequence) ?? [];
    group.push(file);
    numeric.set(sequence, group);
  }
  const duplicate = [...numeric.entries()].find(([, names]) => names.length > 1);
  if (duplicate) {
    throw new Error(
      `Duplicate numeric SQL migration identity ${String(duplicate[0]).padStart(4, '0')}: ${duplicate[1].join(', ')}.`,
    );
  }
  return [...files].sort(
    (left, right) => Number(left.slice(0, 4)) - Number(right.slice(0, 4)),
  );
}

export function buildMysqlMigrationConnectionConfig(
  databaseUrl: string,
  environment = 'development',
) {
  return {
    ...buildMysqlConnectionSecurityConfig(databaseUrl, environment),
    waitForConnections: true,
    connectionLimit: 4,
    maxIdle: 4,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

function rowValue<T = unknown>(row: Record<string, unknown>, key: string): T | undefined {
  return (row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()]) as T | undefined;
}

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  const value: any = result;
  if (Array.isArray(value?.[0])) return value[0];
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
}

async function queryRows(
  connection: AuthoritySqlConnection,
  statement: string,
  values: readonly unknown[] = [],
): Promise<Array<Record<string, unknown>>> {
  return rowsFromResult(await connection.execute(statement, values));
}

async function assertRunnerConnectionTarget(
  connection: AuthoritySqlConnection,
  authority: ResolvedDatabaseAuthority,
): Promise<void> {
  const rows = await queryRows(connection, 'SELECT DATABASE() AS database_name');
  const selected = String(rowValue(rows[0] ?? {}, 'database_name') ?? '');
  if (selected !== authority.context.databaseName) {
    throw new Error('Migration runner refused: supplied connection target is not the authorized target.');
  }
}

export function canonicalBaselineCutoverError(
  orderedSqlFiles: string[],
  appliedFileNames: string[],
  applicationTableCount: number,
): string | null {
  const baseline = '0000_canonical_launch_baseline.sql';
  if (orderedSqlFiles[0] !== baseline) {
    return `Canonical SQL authority requires ${baseline} as the first active migration.`;
  }
  const active = new Set(orderedSqlFiles);
  const retired = appliedFileNames.filter(file => !active.has(file));
  if (retired.length > 0) {
    return `The database contains migration history absent from the canonical manifest (${retired.join(', ')}). Use a matching isolated target; do not rewrite the ledger.`;
  }
  if (!appliedFileNames.includes(baseline) && appliedFileNames.length > 0) {
    return `The canonical baseline ${baseline} is absent while migration history exists.`;
  }
  if (!appliedFileNames.includes(baseline) && applicationTableCount > 0) {
    return `The canonical baseline ${baseline} is absent while ${applicationTableCount} application table(s) exist.`;
  }
  return null;
}

async function readDatabaseMigrationState(
  connection: AuthoritySqlConnection,
  manifest: ValidatedMigrationManifest,
): Promise<DatabaseMigrationState> {
  const controlRows = await queryRows(
    connection,
    'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?, ?)',
    [manifest.document.historyTable, manifest.document.attemptTable],
  );
  const controlTables = new Set(
    controlRows.map(row => String(rowValue(row, 'table_name') ?? '')),
  );
  const historyTablePresent = controlTables.has(manifest.document.historyTable);
  const attemptTablePresent = controlTables.has(manifest.document.attemptTable);
  const applied = historyTablePresent
    ? (await queryRows(
        connection,
        `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
      )).map(row => ({
        fileName: String(rowValue(row, 'filename') ?? ''),
        checksum: String(rowValue(row, 'checksum') ?? ''),
      }))
    : [];
  const incompleteAttempts = attemptTablePresent
    ? (await queryRows(
        connection,
        `SELECT attempt_id, migration_filename, state FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
      )).map(row => ({
        attemptId: String(rowValue(row, 'attempt_id') ?? ''),
        fileName: String(rowValue(row, 'migration_filename') ?? ''),
        state: String(rowValue(row, 'state') ?? 'blocked') as MigrationAttempt['state'],
      }))
    : [];
  const countRows = await queryRows(
    connection,
    'SELECT COUNT(*) AS count_value FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name NOT IN (?, ?)',
    [manifest.document.historyTable, manifest.document.attemptTable],
  );
  const rawApplicationTableCount = rowValue(countRows[0] ?? {}, 'count_value');
  const applicationTableCount = Number(rawApplicationTableCount);
  if (
    rawApplicationTableCount === undefined ||
    !Number.isSafeInteger(applicationTableCount) ||
    applicationTableCount < 0
  ) {
    throw new Error(
      'Migration control verification blocked: application-table freshness could not be proven.',
    );
  }
  return {
    historyTablePresent,
    attemptTablePresent,
    applied,
    incompleteAttempts,
    applicationTableCount,
  };
}

function assertMigrationControlState(input: {
  state: DatabaseMigrationState;
  manifest: ValidatedMigrationManifest;
  acceptedOldHead?: string | null;
  allowFreshEstablishment: boolean;
}): MigrationControlState {
  const { state, manifest } = input;
  if (state.historyTablePresent && !state.attemptTablePresent) {
    throw new Error(
      `Migration control state is incoherent: successful history table ${manifest.document.historyTable} exists but attempt-state table ${manifest.document.attemptTable} is missing; reviewed recovery is required.`,
    );
  }
  if (!state.historyTablePresent && state.attemptTablePresent) {
    throw new Error(
      `Migration control state is incoherent: attempt-state table ${manifest.document.attemptTable} exists but successful history table ${manifest.document.historyTable} is missing; reviewed recovery is required.`,
    );
  }
  if (state.historyTablePresent && state.attemptTablePresent) {
    return 'coherent';
  }
  if (!input.allowFreshEstablishment) {
    throw new Error(
      'Migration establishment blocked: both control tables must exist after establishment.',
    );
  }
  if (
    state.applicationTableCount !== 0 ||
    state.applied.length !== 0 ||
    state.incompleteAttempts.length !== 0
  ) {
    throw new Error(
      `Migration establishment blocked: both control tables are absent but ${state.applicationTableCount} application table(s) exist; reviewed recovery is required.`,
    );
  }
  const rootMigration = manifest.orderedMigrations[0];
  if (
    !rootMigration ||
    rootMigration.sequence !== 0 ||
    rootMigration.parent !== null ||
    rootMigration.kind !== 'establishment'
  ) {
    throw new Error(
      'Migration establishment blocked: the validated manifest does not begin with an establishment root.',
    );
  }
  if (input.acceptedOldHead !== undefined && input.acceptedOldHead !== null) {
    throw new Error(
      'Migration establishment blocked: a fresh target requires an explicitly empty accepted old head.',
    );
  }
  return 'fresh-establishment';
}

export function buildMigrationPlan(input: {
  manifest: ValidatedMigrationManifest;
  targetFingerprintHash: string;
  applied: AppliedMigration[];
  incompleteAttempts?: MigrationAttempt[];
  applicationTableCount?: number;
  acceptedOldHead?: string | null;
  expectedNewHead?: string;
}): MigrationPlan {
  const { manifest } = input;
  const appliedByName = new Map(input.applied.map(item => [item.fileName, item]));
  const manifestByName = new Map(
    manifest.orderedMigrations.map(item => [item.filename, item]),
  );
  const unknownApplied = input.applied.filter(item => !manifestByName.has(item.fileName));
  if (unknownApplied.length > 0) {
    throw new Error(
      `Migration planning blocked: ledger contains manifest-absent entries (${unknownApplied.map(item => item.fileName).join(', ')}).`,
    );
  }
  for (const item of input.applied) {
    const canonical = manifestByName.get(item.fileName)!;
    if (canonical.checksum !== item.checksum) {
      throw new Error(`Migration planning blocked: checksum drift for ${item.fileName}.`);
    }
  }

  let foundPending = false;
  let oldHead: string | null = null;
  for (const migration of manifest.orderedMigrations) {
    if (appliedByName.has(migration.filename)) {
      if (foundPending) {
        throw new Error('Migration planning blocked: applied history is not a contiguous manifest prefix.');
      }
      oldHead = migration.filename;
    } else {
      foundPending = true;
    }
  }
  const incompleteAttempts = input.incompleteAttempts ?? [];
  if (incompleteAttempts.length > 0) {
    throw new Error(
      `Migration planning blocked: incomplete or failed attempt ${incompleteAttempts[0].attemptId} for ${incompleteAttempts[0].fileName} requires reviewed recovery.`,
    );
  }
  if (!oldHead && (input.applicationTableCount ?? 0) > 0) {
    throw new Error(
      'Migration planning blocked: application tables exist without the canonical baseline ledger.',
    );
  }
  if (input.acceptedOldHead !== undefined && input.acceptedOldHead !== oldHead) {
    throw new Error(
      `Migration planning blocked: accepted old head ${input.acceptedOldHead ?? '(none)'} does not match ${oldHead ?? '(none)'}.`,
    );
  }
  if (
    input.expectedNewHead !== undefined &&
    input.expectedNewHead !== manifest.document.expectedHead
  ) {
    throw new Error('Migration planning blocked: expected new head differs from the manifest head.');
  }
  const pending = manifest.orderedMigrations
    .filter(migration => !appliedByName.has(migration.filename))
    .map(migration => ({
      sequence: migration.sequence,
      filename: migration.filename,
      checksum: migration.checksum,
      kind: migration.kind,
      statementCount: migration.statementCount,
    }));
  const digestMaterial = {
    manifestDigest: manifest.manifestDigest,
    targetFingerprintHash: input.targetFingerprintHash,
    acceptedOldHead: oldHead,
    pending,
    expectedNewHead: manifest.document.expectedHead,
  };
  const planDigest = planHash(digestMaterial);
  return Object.freeze({
    planVersion: 1,
    planId: planDigest.slice(0, 24),
    planDigest,
    ...digestMaterial,
    pending: Object.freeze(pending),
    incompleteAttempts: Object.freeze([...incompleteAttempts]),
  });
}

async function acquireMigrationLock(
  connection: AuthoritySqlConnection,
  lockName: string,
): Promise<MigrationLockEvidence> {
  const rows = await queryRows(connection, 'SELECT GET_LOCK(?, 30) AS lock_status', [lockName]);
  if (Number(rowValue(rows[0] ?? {}, 'lock_status') ?? 0) !== 1) {
    throw new Error(`Migration apply blocked: lock ${lockName} was not acquired.`);
  }
  const ownershipRows = await queryRows(
    connection,
    'SELECT CONNECTION_ID() AS connection_id, IS_USED_LOCK(?) AS lock_owner_connection_id',
    [lockName],
  );
  const connectionId = String(rowValue(ownershipRows[0] ?? {}, 'connection_id') ?? '');
  const lockOwnerConnectionId = String(
    rowValue(ownershipRows[0] ?? {}, 'lock_owner_connection_id') ?? '',
  );
  if (!connectionId || lockOwnerConnectionId !== connectionId) {
    await releaseMigrationLock(connection, lockName);
    throw new Error(`Migration apply blocked: lock ${lockName} ownership could not be proven.`);
  }
  return Object.freeze({
    lockName,
    ownerConnectionId: connectionId,
    ownershipVerified: true as const,
  });
}

async function releaseMigrationLock(
  connection: AuthoritySqlConnection,
  lockName: string,
): Promise<void> {
  try {
    await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
  } catch {
    // The attempt state and server lock lifetime remain authoritative; do not mask the primary result.
  }
}

async function ensureControlTables(
  connection: AuthoritySqlConnection,
  manifest: ValidatedMigrationManifest,
): Promise<void> {
  await connection.execute(`CREATE TABLE IF NOT EXISTS \`${manifest.document.historyTable}\` (
    \`numeric_version\` int NOT NULL,
    \`version\` varchar(255) NOT NULL,
    \`filename\` varchar(255) NOT NULL,
    \`checksum\` char(64) NOT NULL,
    \`applied_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`duration_ms\` int NULL,
    \`runtime_env\` varchar(32) NULL,
    PRIMARY KEY (\`filename\`),
    UNIQUE KEY \`uq_sql_migration_history_version\` (\`version\`),
    UNIQUE KEY \`uq_sql_migration_history_numeric_version\` (\`numeric_version\`)
  )`);
  await connection.execute(`CREATE TABLE IF NOT EXISTS \`${manifest.document.attemptTable}\` (
    \`attempt_id\` varchar(64) NOT NULL,
    \`plan_digest\` char(64) NOT NULL,
    \`target_fingerprint_hash\` char(64) NOT NULL,
    \`migration_filename\` varchar(255) NOT NULL,
    \`migration_checksum\` char(64) NOT NULL,
    \`accepted_old_head\` varchar(255) NULL,
    \`expected_new_head\` varchar(255) NOT NULL,
    \`state\` varchar(32) NOT NULL,
    \`completed_statement_count\` int NOT NULL DEFAULT 0,
    \`last_statement_digest\` char(64) NULL,
    \`failure_class\` varchar(128) NULL,
    \`failure_digest\` char(64) NULL,
    \`application_artifact\` varchar(255) NULL,
    \`correlation_id\` varchar(64) NOT NULL,
    \`lock_owner_connection_id\` varchar(64) NOT NULL,
    \`started_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`finished_at\` timestamp(3) NULL,
    PRIMARY KEY (\`attempt_id\`),
    KEY \`idx_sql_migration_attempts_state\` (\`state\`),
    KEY \`idx_sql_migration_attempts_filename\` (\`migration_filename\`)
  )`);
}

async function beginAttempt(
  connection: AuthoritySqlConnection,
  authority: ResolvedDatabaseAuthority,
  plan: MigrationPlan,
  migration: MigrationPlan['pending'][number],
  applicationArtifact: string | undefined,
  lockEvidence: MigrationLockEvidence,
): Promise<string> {
  const attemptId = `${plan.planId}-${String(migration.sequence).padStart(4, '0')}`;
  await connection.execute(
    `INSERT INTO \`sql_migration_attempts\` (attempt_id, plan_digest, target_fingerprint_hash, migration_filename, migration_checksum, accepted_old_head, expected_new_head, state, application_artifact, correlation_id, lock_owner_connection_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, ?, ?)`,
    [
      attemptId,
      plan.planDigest,
      authority.context.targetFingerprintHash,
      migration.filename,
      migration.checksum,
      plan.acceptedOldHead,
      plan.expectedNewHead,
      applicationArtifact ?? null,
      authority.context.correlationId,
      lockEvidence.ownerConnectionId,
    ],
  );
  return attemptId;
}

async function updateAttemptProgress(
  connection: AuthoritySqlConnection,
  attemptId: string,
  completedStatementCount: number,
  statement: string,
): Promise<void> {
  await connection.execute(
    'UPDATE `sql_migration_attempts` SET completed_statement_count = ?, last_statement_digest = ? WHERE attempt_id = ?',
    [completedStatementCount, migrationChecksum(statement), attemptId],
  );
}

function failureEvidence(error: unknown): { failureClass: string; failureDigest: string } {
  const candidate = error as { name?: string; code?: string; errno?: string | number };
  const failureClass = String(candidate?.code ?? candidate?.errno ?? candidate?.name ?? 'migration_error')
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .slice(0, 128);
  return {
    failureClass,
    failureDigest: planHash({ failureClass }),
  };
}

async function failAttempt(
  connection: AuthoritySqlConnection,
  attemptId: string,
  error: unknown,
): Promise<void> {
  const evidence = failureEvidence(error);
  try {
    await connection.execute(
      "UPDATE `sql_migration_attempts` SET state = 'failed', failure_class = ?, failure_digest = ?, finished_at = CURRENT_TIMESTAMP(3) WHERE attempt_id = ?",
      [evidence.failureClass, evidence.failureDigest, attemptId],
    );
  } catch {
    // A still-running durable row is intentionally blocking evidence if failure recording loses connectivity.
  }
}

async function recordMigrationSuccess(
  connection: AuthoritySqlConnection,
  migration: MigrationPlan['pending'][number],
  durationMs: number,
  runtimeMode: string,
): Promise<void> {
  await connection.execute(
    `INSERT INTO \`sql_migration_history\` (numeric_version, version, filename, checksum, duration_ms, runtime_env) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      migration.sequence,
      migration.filename.replace(/\.sql$/, ''),
      migration.filename,
      migration.checksum,
      Math.max(0, Math.round(durationMs)),
      runtimeMode,
    ],
  );
}

async function completeAttempt(
  connection: AuthoritySqlConnection,
  attemptId: string,
): Promise<void> {
  await connection.execute(
    "UPDATE `sql_migration_attempts` SET state = 'succeeded', finished_at = CURRENT_TIMESTAMP(3) WHERE attempt_id = ?",
    [attemptId],
  );
}

async function applyPlan(input: {
  authority: ResolvedDatabaseAuthority;
  connection: AuthoritySqlConnection;
  manifest: ValidatedMigrationManifest;
  plan: MigrationPlan;
  applicationArtifact?: string;
  lockEvidence: MigrationLockEvidence;
}): Promise<string[]> {
  const applied: string[] = [];
  for (const migration of input.plan.pending) {
    const entry = input.manifest.orderedMigrations.find(
      item => item.filename === migration.filename,
    )!;
    const statements = parseSqlStatements(readFileSync(entry.absolutePath, 'utf8'));
    await assertRunnerConnectionTarget(input.connection, input.authority);
    const attemptId = await beginAttempt(
      input.connection,
      input.authority,
      input.plan,
      migration,
      input.applicationArtifact,
      input.lockEvidence,
    );
    const startedAt = Date.now();
    let completed = 0;
    const transactional = migration.kind === 'transactional-data';
    try {
      if (transactional) await input.connection.execute('START TRANSACTION');
      for (const statement of statements) {
        await input.connection.execute(statement);
        completed += 1;
        await updateAttemptProgress(input.connection, attemptId, completed, statement);
      }
      if (transactional) await input.connection.execute('COMMIT');
      await recordMigrationSuccess(
        input.connection,
        migration,
        Date.now() - startedAt,
        input.authority.context.runtimeMode,
      );
      await completeAttempt(input.connection, attemptId);
      applied.push(migration.filename);
    } catch (error) {
      if (transactional) {
        try {
          await input.connection.execute('ROLLBACK');
        } catch {
          // Durable attempt evidence still blocks continuation.
        }
      }
      await failAttempt(input.connection, attemptId, error);
      throw new Error(
        `Migration apply failed for ${migration.filename}; durable attempt ${attemptId} blocks ordinary continuation.`,
      );
    }
  }
  return applied;
}

export async function runSqlMigrations(options: SqlMigrationOptions = {}) {
  const mode = options.mode ?? 'apply';
  const operation = options.operation ?? (mode === 'plan' ? 'migration-plan' : 'migration-apply');
  const allowedOperations =
    mode === 'plan'
      ? (['migration-plan', 'release-plan'] as const)
      : (['migration-apply', 'release-apply'] as const);
  if (!allowedOperations.includes(operation as never)) {
    throw new Error('Migration runner refused: operation does not match runner mode.');
  }
  const authority =
    options.authority ??
    resolveDatabaseAuthority({
      operation,
      cwd: process.cwd(),
      credentialClass:
        (process.env.DATABASE_CREDENTIAL_CLASS as any) ?? undefined,
    });
  if (authority.context.operation !== operation) {
    throw new Error('Migration runner refused: resolved operation does not match runner mode.');
  }
  const authorization =
    options.authorization ??
    authorizeDatabaseOperation(authority, {
      approval: options.approval ?? protectedDatabaseApprovalFromEnvironment(authority),
      acknowledgement: options.acknowledgement,
    });
  assertAuthorizedDatabaseOperation(authority, authorization, allowedOperations);
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: options.migrationsDir ?? __dirname,
    manifestPath: options.manifestPath,
  });
  if (mode === 'apply' && options.acceptedOldHead === undefined) {
    throw new Error(
      'Migration apply refused: accepted old head must be explicit (use null for a verified fresh target).',
    );
  }
  if (mode === 'apply' && options.expectedNewHead === undefined) {
    throw new Error('Migration apply refused: expected new manifest head must be explicit.');
  }
  const connection = await (options.connectionFactory ?? createAuthoritySqlConnection)(
    authority,
    authorization,
  );
  let lockAcquired = false;
  let lockEvidence: MigrationLockEvidence | null = null;
  try {
    await assertRunnerConnectionTarget(connection, authority);
    if (mode === 'apply') {
      lockEvidence = await acquireMigrationLock(connection, manifest.document.lockName);
      lockAcquired = true;
    }
    const initialState = await readDatabaseMigrationState(connection, manifest);
    const initialControlState = assertMigrationControlState({
      state: initialState,
      manifest,
      acceptedOldHead: options.acceptedOldHead,
      allowFreshEstablishment: true,
    });
    const plan = buildMigrationPlan({
      manifest,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      applied: initialState.applied,
      incompleteAttempts: initialState.incompleteAttempts,
      applicationTableCount: initialState.applicationTableCount,
      acceptedOldHead: options.acceptedOldHead,
      expectedNewHead: options.expectedNewHead,
    });

    if (mode === 'plan') {
      return { mode, plan, lock: null, applied: [] as string[] };
    }

    if (initialControlState === 'fresh-establishment') {
      await ensureControlTables(connection, manifest);
    }
    const lockedState = await readDatabaseMigrationState(connection, manifest);
    assertMigrationControlState({
      state: lockedState,
      manifest,
      acceptedOldHead: plan.acceptedOldHead,
      allowFreshEstablishment: false,
    });
    const lockedPlan = buildMigrationPlan({
      manifest,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      applied: lockedState.applied,
      incompleteAttempts: lockedState.incompleteAttempts,
      applicationTableCount: lockedState.applicationTableCount,
      acceptedOldHead: plan.acceptedOldHead,
      expectedNewHead: plan.expectedNewHead,
    });
    if (lockedPlan.planDigest !== plan.planDigest) {
      throw new Error('Migration apply blocked: plan changed after lock acquisition.');
    }
    const applied = await applyPlan({
      authority,
      connection,
      manifest,
      plan: lockedPlan,
      applicationArtifact:
        options.applicationArtifact ?? process.env.GITHUB_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA,
      lockEvidence: lockEvidence!,
    });
    return { mode, plan: lockedPlan, lock: lockEvidence, applied };
  } finally {
    if (lockAcquired) {
      await releaseMigrationLock(connection, manifest.document.lockName);
    }
    await connection.end();
  }
}

if (isDirectExecution) {
  const mode = process.argv.includes('--plan') ? 'plan' : 'apply';
  runSqlMigrations({ mode })
    .then(result => {
      console.log(
        JSON.stringify(
          {
            mode: result.mode,
            planId: result.plan.planId,
            planDigest: result.plan.planDigest,
            targetFingerprintHash: result.plan.targetFingerprintHash,
            acceptedOldHead: result.plan.acceptedOldHead,
            pending: result.plan.pending.map(item => item.filename),
            expectedNewHead: result.plan.expectedNewHead,
            lock: result.lock,
            applied: result.applied,
          },
          null,
          2,
        ),
      );
    })
    .catch(error => {
      console.error(error instanceof Error ? error.message : 'Migration runner failed.');
      process.exit(1);
    });
}
