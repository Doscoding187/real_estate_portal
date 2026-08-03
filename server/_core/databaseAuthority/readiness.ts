import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  authorizeDatabaseOperation,
  type AuthorizedDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import {
  createAuthoritySqlConnection,
  DatabaseTargetMismatchError,
  type AuthoritySqlConnection,
} from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';
import type { ResolvedDatabaseAuthority } from './types';
import {
  buildMigrationPlan,
  type AppliedMigration,
  type MigrationAttempt,
} from '../../migrations/runSqlMigrations';
import {
  loadAndValidateMigrationManifest,
  type ValidatedMigrationManifest,
} from '../../migrations/migrationManifest';

export type ReadinessState = 'ready' | 'not-ready' | 'not-required' | 'not-evaluated';

export type ReadinessLayer = {
  state: ReadinessState;
  code: string;
  detail: string;
};

export type LayeredDatabaseReadiness = {
  reportVersion: 1;
  checkedAt: string;
  targetFingerprintHash: string;
  targetClass: string;
  applicationReady: boolean;
  layers: {
    processLiveness: ReadinessLayer;
    targetConnectivity: ReadinessLayer;
    migrationHead: ReadinessLayer;
    incompleteAttemptState: ReadinessLayer;
    structuralSchema: ReadinessLayer;
    requiredData: ReadinessLayer;
    consumerApi: ReadinessLayer;
    browserJourney: ReadinessLayer;
    release: ReadinessLayer;
    fullDiagnostics: ReadinessLayer;
  };
};

function layer(
  state: ReadinessState,
  code: string,
  detail: string,
): ReadinessLayer {
  return { state, code, detail };
}

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  const value: any = result;
  if (Array.isArray(value?.[0])) return value[0];
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
}

function rowValue(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
}

async function queryRows(
  connection: AuthoritySqlConnection,
  statement: string,
  values: readonly unknown[] = [],
): Promise<Array<Record<string, unknown>>> {
  return rowsFromResult(await connection.execute(statement, values));
}

function notEvaluatedLayers() {
  return {
    consumerApi: layer('not-evaluated', 'consumer-not-evaluated', 'Consumer/API smoke is a separate readiness layer.'),
    browserJourney: layer('not-evaluated', 'browser-not-evaluated', 'Browser journey readiness is verified separately.'),
    release: layer('not-evaluated', 'release-not-evaluated', 'Release readiness requires protected release evidence.'),
    fullDiagnostics: layer(
      'not-evaluated',
      'diagnostics-not-evaluated',
      'Full structural diagnostics are intentionally separate from routine readiness.',
    ),
  };
}

function inventoryTables(root: string): string[] {
  const inventory = JSON.parse(
    readFileSync(resolve(root, 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
  ) as { tables?: unknown };
  if (!Array.isArray(inventory.tables) || inventory.tables.some(value => typeof value !== 'string')) {
    throw new Error('Canonical model inventory is malformed.');
  }
  return inventory.tables as string[];
}

export async function assessAuthorizedDatabaseReadiness(input: {
  authority: ResolvedDatabaseAuthority;
  connection: AuthoritySqlConnection;
  manifest?: ValidatedMigrationManifest;
  root?: string;
  now?: Date;
}): Promise<LayeredDatabaseReadiness> {
  const root = input.root ?? input.authority.context.repository.root;
  const manifest =
    input.manifest ??
    loadAndValidateMigrationManifest({
      migrationsDirectory: resolve(root, 'server/migrations'),
    });
  const context = input.authority.context;
  const selectedRows = await queryRows(input.connection, 'SELECT DATABASE() AS database_name');
  const selected = String(rowValue(selectedRows[0] ?? {}, 'database_name') ?? '');
  const targetMatches = selected === context.databaseName;
  const targetConnectivity = targetMatches
    ? layer('ready', 'target-connected', `Connected to authorized database ${selected}.`)
    : layer(
        'not-ready',
        'wrong-database',
        `Authorized database ${context.databaseName}; connection selected ${selected || '(none)'}.`,
      );

  const tableRows = await queryRows(
    input.connection,
    'SELECT TABLE_NAME AS table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY TABLE_NAME',
  );
  const tables = new Set(tableRows.map(row => String(rowValue(row, 'table_name') ?? '')));
  const historyPresent = tables.has(manifest.document.historyTable);
  const attemptPresent = tables.has(manifest.document.attemptTable);
  const applied: AppliedMigration[] = historyPresent
    ? (await queryRows(
        input.connection,
        `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
      )).map(row => ({
        fileName: String(rowValue(row, 'filename') ?? ''),
        checksum: String(rowValue(row, 'checksum') ?? ''),
      }))
    : [];
  const incompleteAttempts: MigrationAttempt[] = attemptPresent
    ? (await queryRows(
        input.connection,
        `SELECT attempt_id, migration_filename, state FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
      )).map(row => ({
        attemptId: String(rowValue(row, 'attempt_id') ?? ''),
        fileName: String(rowValue(row, 'migration_filename') ?? ''),
        state: String(rowValue(row, 'state') ?? 'blocked') as MigrationAttempt['state'],
      }))
    : [];

  let migrationHead: ReadinessLayer;
  try {
    const plan = buildMigrationPlan({
      manifest,
      targetFingerprintHash: context.targetFingerprintHash,
      applied,
      incompleteAttempts: [],
      applicationTableCount: 0,
    });
    migrationHead =
      historyPresent && plan.pending.length === 0
        ? layer('ready', 'manifest-head-ready', `Ledger is at ${plan.expectedNewHead}.`)
        : layer(
            'not-ready',
            historyPresent ? 'manifest-head-behind' : 'migration-ledger-missing',
            historyPresent
              ? `Pending manifest migrations: ${plan.pending.map(item => item.filename).join(', ')}.`
              : 'Successful migration history table is missing.',
          );
  } catch (error) {
    migrationHead = layer(
      'not-ready',
      'migration-lineage-invalid',
      error instanceof Error ? error.message : 'Migration lineage is invalid.',
    );
  }
  let incompleteAttemptState: ReadinessLayer;
  if (attemptPresent && !historyPresent) {
    incompleteAttemptState = layer(
      'not-ready',
      'migration-control-authority-incoherent',
      `Attempt-state table ${manifest.document.attemptTable} exists while successful history table ${manifest.document.historyTable} is missing; reviewed recovery is required.`,
    );
  } else if (!attemptPresent) {
    incompleteAttemptState = layer(
      'not-ready',
      'migration-attempt-authority-missing',
      `Attempt-state table ${manifest.document.attemptTable} is missing, so the absence of running, failed, or blocked attempts cannot be proven.`,
    );
  } else if (incompleteAttempts.length === 0) {
    incompleteAttemptState = layer(
      'ready',
      'no-incomplete-attempts',
      'No running, failed, or blocked migration attempt exists.',
    );
  } else {
    incompleteAttemptState = layer(
      'not-ready',
      'incomplete-migration-attempt',
      `Attempt ${incompleteAttempts[0].attemptId} for ${incompleteAttempts[0].fileName} requires reviewed recovery.`,
    );
  }

  const requiredTables = inventoryTables(root);
  const missingTables = requiredTables.filter(table => !tables.has(table));
  const structuralSchema =
    missingTables.length === 0
      ? layer('ready', 'required-schema-present', `All ${requiredTables.length} application tables are present.`)
      : layer(
          'not-ready',
          'required-schema-missing',
          `Missing required application tables: ${missingTables.slice(0, 12).join(', ')}${
            missingTables.length > 12 ? ` (+${missingTables.length - 12} more)` : ''
          }.`,
        );
  const requiredDataVersion = manifest.expectedHead.requiredReferenceDataVersion;
  const requiredData = requiredDataVersion
    ? layer(
        'not-ready',
        'required-data-version-unverified',
        `Required data version ${requiredDataVersion} needs its registered verifier.`,
      )
    : layer('not-required', 'required-data-not-declared', 'Manifest head declares no required data version.');
  const applicationReady =
    targetConnectivity.state === 'ready' &&
    migrationHead.state === 'ready' &&
    incompleteAttemptState.state === 'ready' &&
    structuralSchema.state === 'ready' &&
    requiredData.state !== 'not-ready';
  const separatelyEvaluatedLayers = notEvaluatedLayers();
  if (incompleteAttemptState.state === 'not-ready') {
    separatelyEvaluatedLayers.release = layer(
      'not-ready',
      'release-blocked-by-migration-attempt-authority',
      'Release readiness is blocked until migration attempt-state authority is coherent and clear.',
    );
  }

  return {
    reportVersion: 1,
    checkedAt: (input.now ?? new Date()).toISOString(),
    targetFingerprintHash: context.targetFingerprintHash,
    targetClass: context.targetClass,
    applicationReady,
    layers: {
      processLiveness: layer('ready', 'process-alive', 'The process is able to answer.'),
      targetConnectivity,
      migrationHead,
      incompleteAttemptState,
      structuralSchema,
      requiredData,
      ...separatelyEvaluatedLayers,
    },
  };
}

export async function assessRuntimeDatabaseReadiness(input: {
  authority?: ResolvedDatabaseAuthority;
  authorization?: AuthorizedDatabaseOperation;
  root?: string;
  connectionFactory?: (
    authority: ResolvedDatabaseAuthority,
    decision: AuthorizedDatabaseOperation,
  ) => Promise<AuthoritySqlConnection>;
  now?: Date;
} = {}): Promise<LayeredDatabaseReadiness> {
  let authority: ResolvedDatabaseAuthority;
  try {
    authority =
      input.authority ??
      resolveDatabaseAuthority({
        operation: 'readiness',
        cwd: input.root ?? process.cwd(),
        credentialClass: (process.env.DATABASE_CREDENTIAL_CLASS as any) ?? undefined,
      });
  } catch {
    return unavailableReadiness({
      checkedAt: input.now ?? new Date(),
      targetFingerprintHash: 'unresolved',
      targetClass: 'unknown',
      connectivityCode: 'authority-unresolved',
      connectivityDetail: 'Database target authority could not be resolved.',
    });
  }
  let connection: AuthoritySqlConnection | null = null;
  let stage: 'authorization' | 'connection' | 'assessment' = 'authorization';
  try {
    const authorization =
      input.authorization ??
      authorizeDatabaseOperation(authority, {
        root: input.root,
        approval: protectedDatabaseApprovalFromEnvironment(authority),
      });
    stage = 'connection';
    connection = await (input.connectionFactory ?? createAuthoritySqlConnection)(
      authority,
      authorization,
    );
    stage = 'assessment';
    return await assessAuthorizedDatabaseReadiness({
      authority,
      connection,
      root: input.root,
      now: input.now,
    });
  } catch (error) {
    const context = authority.context;
    const mismatch = error instanceof DatabaseTargetMismatchError;
    const connectivityCode = mismatch
      ? 'wrong-database'
      : stage === 'authorization'
        ? 'authority-denied'
        : stage === 'connection'
          ? 'database-unreachable'
          : 'readiness-check-failed';
    const connectivityDetail = mismatch
      ? `Connection selection differs from authorized target ${context.targetFingerprintHash.slice(0, 16)}.`
      : stage === 'authorization'
        ? `Operation authority denied target ${context.targetFingerprintHash.slice(0, 16)}.`
        : stage === 'connection'
          ? `Authorized target ${context.targetFingerprintHash.slice(0, 16)} is unreachable.`
          : `Readiness verification failed for authorized target ${context.targetFingerprintHash.slice(0, 16)}.`;
    return unavailableReadiness({
      checkedAt: input.now ?? new Date(),
      targetFingerprintHash: context.targetFingerprintHash,
      targetClass: context.targetClass,
      connectivityCode,
      connectivityDetail,
    });
  } finally {
    await connection?.end();
  }
}

function unavailableReadiness(input: {
  checkedAt: Date;
  targetFingerprintHash: string;
  targetClass: string;
  connectivityCode: string;
  connectivityDetail: string;
}): LayeredDatabaseReadiness {
  return {
    reportVersion: 1,
    checkedAt: input.checkedAt.toISOString(),
    targetFingerprintHash: input.targetFingerprintHash,
    targetClass: input.targetClass,
    applicationReady: false,
    layers: {
      processLiveness: layer('ready', 'process-alive', 'The process is able to answer.'),
      targetConnectivity: layer(
        'not-ready',
        input.connectivityCode,
        input.connectivityDetail,
      ),
      migrationHead: layer(
        'not-evaluated',
        'head-not-evaluated',
        'Target readiness failed before ledger verification.',
      ),
      incompleteAttemptState: layer(
        'not-evaluated',
        'attempts-not-evaluated',
        'Target readiness failed before attempt verification.',
      ),
      structuralSchema: layer(
        'not-evaluated',
        'schema-not-evaluated',
        'Target readiness failed before required-schema verification.',
      ),
      requiredData: layer(
        'not-evaluated',
        'data-not-evaluated',
        'Target readiness failed before required-data verification.',
      ),
      ...notEvaluatedLayers(),
    },
  };
}
