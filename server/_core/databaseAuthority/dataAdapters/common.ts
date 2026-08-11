import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import {
  buildMigrationPlan,
  type MigrationAttempt,
  type AppliedMigration,
} from '../../../migrations/runSqlMigrations';
import {
  loadAndValidateMigrationManifest,
  type ValidatedMigrationManifest,
} from '../../../migrations/migrationManifest';
import type { DatabaseOperation, ResolvedDatabaseAuthority } from '../types';
import { assertOwnedDisposableTarget, identityFromAuthority } from '../lifecycle';
import { readWorktreeDatabaseProfile, writeWorktreeDatabaseProfile } from '../worktreeProfile';

export const ACCEPTED_MIGRATION_HEAD = '0002_paid_launch_access_invoice_term.sql' as const;

export type AdapterEvidence = {
  adapter: string;
  version: string;
  digest: string;
  targetFingerprintHash: string;
  databaseName: string;
  ownershipKey: string;
};

export function stableDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  const value: any = result;
  if (Array.isArray(value?.[0])) return value[0];
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
}

export function rowValue(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
}

export async function queryRows(
  connection: AuthoritySqlConnection,
  statement: string,
  values: readonly unknown[] = [],
): Promise<Array<Record<string, unknown>>> {
  return rowsFromResult(await connection.execute(statement, values));
}

export function requireExactAdapterTarget(
  authority: ResolvedDatabaseAuthority,
  profileRoot?: string,
): AdapterEvidence {
  assertOwnedDisposableTarget(authority);
  const identity = identityFromAuthority(authority);
  const profile = readWorktreeDatabaseProfile(identity, profileRoot);
  if (!profile) {
    throw new Error(
      'Database Authority adapter refused: the exact owned worktree database profile is absent.',
    );
  }
  return {
    adapter: 'database-authority-adapter',
    version: 'unassigned',
    digest: 'unassigned',
    targetFingerprintHash: authority.context.targetFingerprintHash,
    databaseName: authority.context.databaseName,
    ownershipKey: authority.context.worktree.ownershipKey,
  };
}

const RELEASE_REFERENCE_OPERATIONS: readonly DatabaseOperation[] = [
  'release-reference-plan',
  'release-reference-apply',
  'release-reference-verify',
];

export function requireProtectedCommercialReferenceTarget(
  authority: ResolvedDatabaseAuthority,
): AdapterEvidence {
  if (!['staging', 'production'].includes(authority.context.targetClass)) {
    throw new Error(
      'Database Authority adapter refused: canonical commercial release reference data requires an authorized staging or production target.',
    );
  }
  return {
    adapter: 'database-authority-release-reference-adapter',
    version: 'unassigned',
    digest: 'unassigned',
    targetFingerprintHash: authority.context.targetFingerprintHash,
    databaseName: authority.context.databaseName,
    ownershipKey: authority.context.worktree.ownershipKey,
  };
}

export function requireReleaseReferenceTarget(
  authority: ResolvedDatabaseAuthority,
): AdapterEvidence {
  if (!RELEASE_REFERENCE_OPERATIONS.includes(authority.context.operation)) {
    throw new Error(
      `Database Authority adapter refused: operation ${authority.context.operation} is not a release reference operation.`,
    );
  }
  return requireProtectedCommercialReferenceTarget(authority);
}

export async function requireAcceptedMigrationHead(input: {
  authority: ResolvedDatabaseAuthority;
  connection: AuthoritySqlConnection;
  manifest?: ValidatedMigrationManifest;
  root?: string;
  profileRoot?: string;
}): Promise<ValidatedMigrationManifest> {
  const manifest =
    input.manifest ??
    loadAndValidateMigrationManifest({
      migrationsDirectory: resolve(
        input.root ?? input.authority.context.repository.root,
        'server/migrations',
      ),
    });
  if (manifest.document.expectedHead !== ACCEPTED_MIGRATION_HEAD) {
    throw new Error(
      `Database Authority adapter refused: repository migration head is ${manifest.document.expectedHead}, expected ${ACCEPTED_MIGRATION_HEAD}.`,
    );
  }

  const controlTables = await queryRows(
    input.connection,
    'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?, ?)',
    [manifest.document.historyTable, manifest.document.attemptTable],
  );
  const names = new Set(controlTables.map(row => String(rowValue(row, 'table_name') ?? '')));
  if (!names.has(manifest.document.historyTable) || !names.has(manifest.document.attemptTable)) {
    throw new Error(
      `Database Authority adapter refused: ${manifest.document.historyTable} and ${manifest.document.attemptTable} must both exist before data preparation.`,
    );
  }
  const applied: AppliedMigration[] = (
    await queryRows(
      input.connection,
      `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
    )
  ).map(row => ({
    fileName: String(rowValue(row, 'filename') ?? ''),
    checksum: String(rowValue(row, 'checksum') ?? ''),
  }));
  const attempts: MigrationAttempt[] = (
    await queryRows(
      input.connection,
      `SELECT attempt_id, migration_filename, state FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
    )
  ).map(row => ({
    attemptId: String(rowValue(row, 'attempt_id') ?? ''),
    fileName: String(rowValue(row, 'migration_filename') ?? ''),
    state: String(rowValue(row, 'state') ?? 'blocked') as MigrationAttempt['state'],
  }));
  if (attempts.length > 0) {
    throw new Error(
      `Database Authority adapter refused: migration attempt ${attempts[0].attemptId} is ${attempts[0].state}.`,
    );
  }
  const plan = buildMigrationPlan({
    manifest,
    targetFingerprintHash: input.authority.context.targetFingerprintHash,
    applied,
    incompleteAttempts: [],
    applicationTableCount: 0,
  });
  if (plan.pending.length > 0 || plan.expectedNewHead !== ACCEPTED_MIGRATION_HEAD) {
    throw new Error(
      `Database Authority adapter refused: target is not at accepted migration head ${ACCEPTED_MIGRATION_HEAD}. Pending: ${plan.pending.map(item => item.filename).join(', ') || '(none)'}.`,
    );
  }
  const identity = identityFromAuthority(input.authority);
  const profile = readWorktreeDatabaseProfile(identity, input.profileRoot);
  if (profile) {
    writeWorktreeDatabaseProfile(
      identity,
      {
        lastVerifiedManifestHead: ACCEPTED_MIGRATION_HEAD,
      },
      input.profileRoot,
    );
  }
  return manifest;
}

export async function withTransaction<T>(
  connection: AuthoritySqlConnection,
  work: () => Promise<T>,
): Promise<T> {
  // mysql2's execute() uses the prepared-statement protocol. MySQL does not
  // support preparing transaction-control statements, so keep control on the
  // driver's non-prepared query path while value-bearing SQL remains prepared.
  await connection.query('START TRANSACTION');
  try {
    const result = await work();
    await connection.query('COMMIT');
    return result;
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}

export function assertOperation(
  decision: AuthorizedDatabaseOperation,
  operations: readonly string[],
): void {
  if (!operations.includes(decision.operation)) {
    throw new Error(
      `Database Authority adapter refused: operation ${decision.operation} is not approved for this adapter.`,
    );
  }
}
