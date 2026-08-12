import { existsSync, readFileSync } from 'node:fs';
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
import { assertOwnedDisposableTarget, identityFromAuthority } from './lifecycle';
import { readWorktreeDatabaseProfile } from './worktreeProfile';
import { requireReferenceAdapterTarget } from './dataAdapters/common';
import { verifyCanonicalGeography } from './dataAdapters/canonicalGeography';
import { verifyCanonicalCommercialReference } from './dataAdapters/canonicalCommercial';
import { verifySearchToLeadScenario } from './dataAdapters/searchToLeadScenario';
import {
  compareNormalizedSchemas,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
} from './schemaCongruency';
import * as canonicalSchema from '../../../drizzle/schema';
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

export type RuntimeReadinessPurpose = 'database' | 'location-discovery' | 'search-to-lead';

export type LayeredDatabaseReadiness = {
  reportVersion: 1;
  checkedAt: string;
  targetFingerprintHash: string;
  targetClass: string;
  requestedRuntime: RuntimeReadinessPurpose;
  applicationReady: boolean;
  layers: {
    processLiveness: ReadinessLayer;
    serviceAvailable: ReadinessLayer;
    targetOwned: ReadinessLayer;
    schemaMigrated: ReadinessLayer;
    schemaCongruent: ReadinessLayer;
    canonicalReferenceData: ReadinessLayer;
    commercialReferenceData: ReadinessLayer;
    acceptanceScenario: ReadinessLayer;
    application: ReadinessLayer;
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

function layer(state: ReadinessState, code: string, detail: string): ReadinessLayer {
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
    consumerApi: layer(
      'not-evaluated',
      'consumer-not-evaluated',
      'Consumer/API smoke is a separate readiness layer.',
    ),
    browserJourney: layer(
      'not-evaluated',
      'browser-not-evaluated',
      'Browser journey readiness is verified separately.',
    ),
    release: layer(
      'not-evaluated',
      'release-not-evaluated',
      'Release readiness requires protected release evidence.',
    ),
    fullDiagnostics: layer(
      'not-evaluated',
      'diagnostics-not-evaluated',
      'Full structural diagnostics are intentionally separate from routine readiness.',
    ),
  };
}

function targetOwnershipLayer(authority: ResolvedDatabaseAuthority): ReadinessLayer {
  try {
    const ownership = requireReferenceAdapterTarget(authority);
    if (authority.context.targetClass === 'disposable-test') {
      return layer(
        'ready',
        'authorized-disposable-test',
        `Authorized isolated test target ${ownership.databaseName} is available for reference verification.`,
      );
    }
    assertOwnedDisposableTarget(authority);
    const profile = readWorktreeDatabaseProfile(identityFromAuthority(authority));
    return profile
      ? layer(
          'ready',
          'exact-worktree-owned',
          `Exact worktree target ${profile.databaseName} has a matching ownership profile.`,
        )
      : layer(
          'not-ready',
          'worktree-profile-missing',
          'Exact disposable target ownership profile is missing.',
        );
  } catch (error) {
    return layer(
      'not-ready',
      'target-not-exact-owned-worktree',
      error instanceof Error
        ? error.message
        : 'Target is not the exact owned disposable worktree target.',
    );
  }
}

async function schemaCongruencyLayer(
  connection: AuthoritySqlConnection,
  root: string,
): Promise<ReadinessLayer> {
  if (!existsSync(resolve(root, 'drizzle/schema/index.ts'))) {
    return layer(
      'not-evaluated',
      'canonical-schema-not-available',
      'The canonical Drizzle schema root is not available in this readiness fixture.',
    );
  }
  try {
    const report = compareNormalizedSchemas(
      normalizedDesiredSchema(canonicalSchema),
      await normalizedPhysicalSchema(connection),
    );
    return report.congruent
      ? layer(
          'ready',
          'schema-congruent',
          `Physical schema matches canonical digest ${report.desiredDigest}.`,
        )
      : layer(
          'not-ready',
          'schema-not-congruent',
          `Physical schema differs from canonical digest ${report.desiredDigest}; ${report.differences.length} difference(s) found.`,
        );
  } catch (error) {
    return layer(
      'not-ready',
      'schema-congruency-check-failed',
      error instanceof Error ? error.message : 'Schema congruency could not be established.',
    );
  }
}

function inventoryTables(root: string): string[] {
  const inventory = JSON.parse(
    readFileSync(resolve(root, 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
  ) as { tables?: unknown };
  if (
    !Array.isArray(inventory.tables) ||
    inventory.tables.some(value => typeof value !== 'string')
  ) {
    throw new Error('Canonical model inventory is malformed.');
  }
  return inventory.tables as string[];
}

export async function assessAuthorizedDatabaseReadiness(input: {
  authority: ResolvedDatabaseAuthority;
  connection: AuthoritySqlConnection;
  authorization?: AuthorizedDatabaseOperation;
  manifest?: ValidatedMigrationManifest;
  root?: string;
  purpose?: RuntimeReadinessPurpose;
  now?: Date;
}): Promise<LayeredDatabaseReadiness> {
  const root = input.root ?? input.authority.context.repository.root;
  const manifest =
    input.manifest ??
    loadAndValidateMigrationManifest({
      migrationsDirectory: resolve(root, 'server/migrations'),
    });
  const context = input.authority.context;
  const requestedRuntime = input.purpose ?? 'database';
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
    ? (
        await queryRows(
          input.connection,
          `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
        )
      ).map(row => ({
        fileName: String(rowValue(row, 'filename') ?? ''),
        checksum: String(rowValue(row, 'checksum') ?? ''),
      }))
    : [];
  const incompleteAttempts: MigrationAttempt[] = attemptPresent
    ? (
        await queryRows(
          input.connection,
          `SELECT attempt_id, migration_filename, state FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
        )
      ).map(row => ({
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
      ? layer(
          'ready',
          'required-schema-present',
          `All ${requiredTables.length} application tables are present.`,
        )
      : layer(
          'not-ready',
          'required-schema-missing',
          `Missing required application tables: ${missingTables.slice(0, 12).join(', ')}${
            missingTables.length > 12 ? ` (+${missingTables.length - 12} more)` : ''
          }.`,
        );
  const serviceAvailable = targetConnectivity;
  const targetOwned = targetOwnershipLayer(input.authority);
  const schemaMigrated = migrationHead;
  const schemaCongruent = await schemaCongruencyLayer(input.connection, root);
  let canonicalReferenceData = layer(
    'not-evaluated',
    'reference-not-evaluated',
    'Canonical reference data is evaluated for a requested location runtime.',
  );
  let commercialReferenceData = layer(
    'not-evaluated',
    'commercial-reference-not-evaluated',
    'Canonical commercial reference data is evaluated for database readiness.',
  );
  let acceptanceScenario = layer(
    'not-evaluated',
    'scenario-not-evaluated',
    'The isolated acceptance scenario is evaluated for a requested location runtime.',
  );
  if (requestedRuntime !== 'database') {
    if (targetOwned.state !== 'ready') {
      canonicalReferenceData = layer(
        'not-ready',
        'reference-blocked-by-target-ownership',
        'Canonical reference data cannot be ready until the exact disposable target is owned.',
      );
      acceptanceScenario = layer(
        'not-ready',
        'scenario-blocked-by-target-ownership',
        'Acceptance scenario data cannot be ready until the exact disposable target is owned.',
      );
    } else if (migrationHead.state !== 'ready' || schemaCongruent.state !== 'ready') {
      canonicalReferenceData = layer(
        'not-ready',
        'reference-blocked-by-schema',
        'Canonical reference data requires the accepted migration head and a congruent schema.',
      );
      acceptanceScenario = layer(
        'not-ready',
        'scenario-blocked-by-schema',
        'Acceptance scenario data requires the accepted migration head and a congruent schema.',
      );
    } else if (!input.authorization) {
      canonicalReferenceData = layer(
        'not-evaluated',
        'reference-authorization-not-supplied',
        'Reference verification requires the authorized readiness operation.',
      );
      acceptanceScenario = layer(
        'not-evaluated',
        'scenario-authorization-not-supplied',
        'Scenario verification requires the authorized readiness operation.',
      );
    } else {
      try {
        const reference = await verifyCanonicalGeography({
          authority: input.authority,
          decision: input.authorization,
          connection: input.connection,
        });
        canonicalReferenceData = layer(
          'ready',
          'canonical-reference-ready',
          `${reference.version} (${reference.digest.slice(0, 16)}) verified: ${reference.verified.provinces} provinces, ${reference.verified.cities} cities, ${reference.verified.suburbs} suburb(s).`,
        );
      } catch (error) {
        canonicalReferenceData = layer(
          'not-ready',
          'canonical-reference-not-ready',
          error instanceof Error
            ? error.message
            : 'Canonical geography reference data is not ready.',
        );
      }
      try {
        const scenario = await verifySearchToLeadScenario({
          authority: input.authority,
          decision: input.authorization,
          connection: input.connection,
        });
        acceptanceScenario = layer(
          'ready',
          'acceptance-scenario-ready',
          `${scenario.version} (${scenario.digest.slice(0, 16)}) verified: ${scenario.verified.eligibleProperties} property and ${scenario.verified.eligibleDevelopments} development prerequisite(s).`,
        );
      } catch (error) {
        acceptanceScenario = layer(
          'not-ready',
          'acceptance-scenario-not-ready',
          error instanceof Error
            ? error.message
            : 'Search-to-Lead acceptance scenario is not ready.',
        );
      }
    }
  }
  if (requestedRuntime === 'database') {
    if (migrationHead.state !== 'ready' || schemaCongruent.state !== 'ready') {
      commercialReferenceData = layer(
        'not-ready',
        'commercial-reference-blocked-by-schema',
        'Canonical commercial reference data requires the accepted migration head and a congruent schema.',
      );
    } else if (!input.authorization) {
      commercialReferenceData = layer(
        'not-evaluated',
        'commercial-reference-authorization-not-supplied',
        'Commercial reference verification requires the authorized readiness operation.',
      );
    } else {
      try {
        const commercial = await verifyCanonicalCommercialReference({
          authority: input.authority,
          decision: input.authorization,
          connection: input.connection,
        });
        commercialReferenceData = layer(
          'ready',
          'canonical-commercial-reference-ready',
          `${commercial.version} (${commercial.digest.slice(0, 16)}) verified: ${commercial.verified.products.length} Launch Access products and their entitlements.`,
        );
      } catch (error) {
        commercialReferenceData = layer(
          'not-ready',
          'canonical-commercial-reference-not-ready',
          error instanceof Error
            ? error.message
            : 'Canonical commercial reference data is not ready.',
        );
      }
    }
  }
  const requiredData =
    requestedRuntime === 'database'
      ? layer(
          'not-required',
          'requested-data-not-required',
          'The database-only readiness purpose does not claim feature reference or scenario data readiness.',
        )
      : canonicalReferenceData.state === 'ready' && acceptanceScenario.state === 'ready'
        ? layer(
            'ready',
            'requested-data-ready',
            'Canonical geography and the isolated Search-to-Lead acceptance scenario are ready.',
          )
        : layer(
            'not-ready',
            'requested-data-not-ready',
            'The requested runtime still lacks canonical geography or acceptance scenario data.',
          );
  const baseReady =
    serviceAvailable.state === 'ready' &&
    targetOwned.state === 'ready' &&
    schemaMigrated.state === 'ready' &&
    schemaCongruent.state === 'ready' &&
    incompleteAttemptState.state === 'ready' &&
    structuralSchema.state === 'ready' &&
    (requestedRuntime !== 'database' || commercialReferenceData.state === 'ready');
  const applicationReady =
    baseReady && (requestedRuntime === 'database' || requiredData.state === 'ready');
  const application = applicationReady
    ? layer(
        'ready',
        'application-ready-for-requested-runtime',
        `Database Authority is ready for ${requestedRuntime} verification.`,
      )
    : layer(
        'not-ready',
        'application-not-ready-for-requested-runtime',
        `Database Authority is not ready for ${requestedRuntime} verification.`,
      );
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
    requestedRuntime,
    applicationReady,
    layers: {
      processLiveness: layer('ready', 'process-alive', 'The process is able to answer.'),
      serviceAvailable,
      targetOwned,
      schemaMigrated,
      schemaCongruent,
      canonicalReferenceData,
      commercialReferenceData,
      acceptanceScenario,
      application,
      targetConnectivity,
      migrationHead,
      incompleteAttemptState,
      structuralSchema,
      requiredData,
      ...separatelyEvaluatedLayers,
    },
  };
}

export async function assessRuntimeDatabaseReadiness(
  input: {
    authority?: ResolvedDatabaseAuthority;
    authorization?: AuthorizedDatabaseOperation;
    root?: string;
    connectionFactory?: (
      authority: ResolvedDatabaseAuthority,
      decision: AuthorizedDatabaseOperation,
    ) => Promise<AuthoritySqlConnection>;
    purpose?: RuntimeReadinessPurpose;
    now?: Date;
  } = {},
): Promise<LayeredDatabaseReadiness> {
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
      purpose: input.purpose,
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
      authorization,
      root: input.root,
      purpose: input.purpose,
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
      purpose: input.purpose,
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
  purpose?: RuntimeReadinessPurpose;
  connectivityCode: string;
  connectivityDetail: string;
}): LayeredDatabaseReadiness {
  return {
    reportVersion: 1,
    checkedAt: input.checkedAt.toISOString(),
    targetFingerprintHash: input.targetFingerprintHash,
    targetClass: input.targetClass,
    requestedRuntime: input.purpose ?? 'database',
    applicationReady: false,
    layers: {
      processLiveness: layer('ready', 'process-alive', 'The process is able to answer.'),
      serviceAvailable: layer('not-ready', input.connectivityCode, input.connectivityDetail),
      targetOwned: layer(
        'not-evaluated',
        'target-ownership-not-evaluated',
        'Target ownership could not be evaluated before database connectivity.',
      ),
      schemaMigrated: layer(
        'not-evaluated',
        'schema-migration-not-evaluated',
        'Target readiness failed before migration-head verification.',
      ),
      schemaCongruent: layer(
        'not-evaluated',
        'schema-congruency-not-evaluated',
        'Target readiness failed before schema-congruency verification.',
      ),
      canonicalReferenceData: layer(
        'not-evaluated',
        'reference-not-evaluated',
        'Target readiness failed before canonical reference-data verification.',
      ),
      commercialReferenceData: layer(
        'not-evaluated',
        'commercial-reference-not-evaluated',
        'Target readiness failed before canonical commercial reference-data verification.',
      ),
      acceptanceScenario: layer(
        'not-evaluated',
        'scenario-not-evaluated',
        'Target readiness failed before acceptance-scenario verification.',
      ),
      application: layer(
        'not-ready',
        'application-not-ready-for-requested-runtime',
        `Database Authority is not ready for ${input.purpose ?? 'database'} verification.`,
      ),
      targetConnectivity: layer('not-ready', input.connectivityCode, input.connectivityDetail),
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
