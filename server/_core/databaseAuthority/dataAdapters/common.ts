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

export type MigrationCapabilityAnchor = Readonly<{
  filename: string;
  checksum: string;
}>;

export const PLE_MANUAL_LOCATION_CAPABILITY: MigrationCapabilityAnchor = Object.freeze({
  filename: '0005_manual_location_without_coordinates.sql',
  checksum: '8f1e3c8481dc606a89d3fc8e01ffc72fecd02e7aa15cfb4b889a7a78d4abf51b',
});

export const COMMERCIAL_INVOICE_TERM_CAPABILITY: MigrationCapabilityAnchor = Object.freeze({
  filename: '0007_paid_launch_access_invoice_term.sql',
  checksum: '84565313674a13833cf033e16a91ee8785bc722d412ae02aecb6a2a19200ab46',
});

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

const DISPOSABLE_REFERENCE_OPERATIONS: readonly DatabaseOperation[] = [
  'reference-seed',
  'foundation-seed',
  'verification',
  'browser-verification',
  'readiness',
];

/**
 * Canonical reference adapters may run against either an owned local worktree
 * or an explicitly resolved isolated test target. Worktree lifecycle remains
 * intentionally stricter and is never delegated to this test-target branch.
 */
export function requireReferenceAdapterTarget(
  authority: ResolvedDatabaseAuthority,
  profileRoot?: string,
): AdapterEvidence {
  if (authority.context.targetClass === 'disposable-worktree') {
    return requireExactAdapterTarget(authority, profileRoot);
  }

  if (
    authority.context.targetClass === 'disposable-test' &&
    DISPOSABLE_REFERENCE_OPERATIONS.includes(authority.context.operation) &&
    authority.context.runtimeMode === 'test' &&
    authority.context.local &&
    authority.context.provider === 'mysql' &&
    authority.context.dialect === 'mysql' &&
    authority.context.worktree.registered &&
    authority.context.worktree.ownershipMatches
  ) {
    return {
      adapter: 'database-authority-disposable-test-adapter',
      version: 'unassigned',
      digest: 'unassigned',
      targetFingerprintHash: authority.context.targetFingerprintHash,
      databaseName: authority.context.databaseName,
      ownershipKey: authority.context.worktree.ownershipKey,
    };
  }

  throw new Error(
    'Database Authority adapter refused: target is not the exact owned disposable worktree or an authorized isolated disposable-test target; protected staging/production reference use requires release-reference authority.',
  );
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
  requiredCapabilities?: readonly MigrationCapabilityAnchor[];
}): Promise<ValidatedMigrationManifest> {
  const manifest =
    input.manifest ??
    loadAndValidateMigrationManifest({
      migrationsDirectory: resolve(
        input.root ?? input.authority.context.repository.root,
        'server/migrations',
      ),
    });

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
  if (
    plan.pending.length > 0 ||
    plan.acceptedOldHead !== manifest.document.expectedHead ||
    plan.expectedNewHead !== manifest.document.expectedHead
  ) {
    throw new Error(
      `Database Authority adapter refused: target is not at current manifest head ${manifest.document.expectedHead}. Pending: ${plan.pending.map(item => item.filename).join(', ') || '(none)'}.`,
    );
  }
  for (const capability of input.requiredCapabilities ?? []) {
    const manifestMigration = manifest.orderedMigrations.find(
      migration => migration.filename === capability.filename,
    );
    if (!manifestMigration) {
      throw new Error(
        `Database Authority adapter refused: required migration capability ${capability.filename} is absent from the canonical manifest.`,
      );
    }
    if (manifestMigration.checksum !== capability.checksum) {
      throw new Error(
        `Database Authority adapter refused: required migration capability ${capability.filename} has a canonical checksum mismatch.`,
      );
    }
    const appliedMigration = applied.find(item => item.fileName === capability.filename);
    if (!appliedMigration || appliedMigration.checksum !== capability.checksum) {
      throw new Error(
        `Database Authority adapter refused: required migration capability ${capability.filename} is not applied with its approved checksum.`,
      );
    }
  }
  const identity = identityFromAuthority(input.authority);
  const profile = readWorktreeDatabaseProfile(identity, input.profileRoot);
  if (profile) {
    writeWorktreeDatabaseProfile(
      identity,
      {
        lastVerifiedManifestHead: manifest.document.expectedHead,
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
