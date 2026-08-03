import type { AuthorizedDatabaseOperation } from './authorization';
import {
  createLocalLifecycleAdminConnection,
  type AuthoritySqlConnection,
} from './connectionAuthority';
import type { GitWorktreeIdentity, ResolvedDatabaseAuthority } from './types';
import {
  readWorktreeDatabaseProfile,
  removeWorktreeDatabaseProfile,
  writeWorktreeDatabaseProfile,
} from './worktreeProfile';

export type WorktreeLifecycleEvidence = {
  operation: 'create' | 'dispose';
  targetFingerprintHash: string;
  databaseName: string;
  ownershipKey: string;
  changed: boolean;
};

function assertOwnedDisposableTarget(authority: ResolvedDatabaseAuthority): void {
  const { context } = authority;
  if (
    context.targetClass !== 'disposable-worktree' ||
    !context.worktree.ownershipMatches ||
    context.databaseName !== context.worktree.expectedDatabase ||
    context.databaseName === 'listify_local' ||
    !/^listify_wt_[a-z0-9_]+_[a-f0-9]{12}$/.test(context.databaseName)
  ) {
    throw new Error(
      'Worktree lifecycle refused: target is not the exact owned disposable worktree database.',
    );
  }
}

function identityFromAuthority(authority: ResolvedDatabaseAuthority): GitWorktreeIdentity {
  const { context } = authority;
  return {
    repositoryRoot: context.repository.root,
    gitCommonDirectory: '(private-not-required-by-profile)',
    gitCommonDirectoryFingerprint: context.repository.gitCommonDirectoryFingerprint,
    worktreePath: context.worktree.path,
    branch: context.worktree.branch,
    head: context.repository.head,
    upstream: context.worktree.upstream,
    originMainHead: null,
    registered: context.worktree.registered,
    clean: context.worktree.clean,
    ownershipKey: context.worktree.ownershipKey,
    expectedWorktreeDatabase: context.worktree.expectedDatabase,
  };
}

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  const value: any = result;
  if (Array.isArray(value?.[0])) return value[0];
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
}

async function databaseExists(
  connection: AuthoritySqlConnection,
  databaseName: string,
): Promise<boolean> {
  const result = await connection.execute(
    'SELECT SCHEMA_NAME AS schema_name FROM information_schema.schemata WHERE SCHEMA_NAME = ?',
    [databaseName],
  );
  return rowsFromResult(result).some(
    row => String(row.schema_name ?? row.SCHEMA_NAME ?? '') === databaseName,
  );
}

async function grantLocalApplicationOwnership(
  connection: AuthoritySqlConnection,
  databaseName: string,
): Promise<void> {
  const result = await connection.execute(
    "SELECT Host AS host_name FROM mysql.user WHERE User = 'listify_app' ORDER BY Host",
  );
  const hosts = rowsFromResult(result)
    .map(row => String(row.host_name ?? row.HOST_NAME ?? ''))
    .filter(host => host === '%' || host === '127.0.0.1' || host === 'localhost');
  if (hosts.length === 0) {
    throw new Error('Worktree lifecycle refused: approved local application user is unavailable.');
  }
  for (const host of hosts) {
    await connection.execute(
      `GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO 'listify_app'@'${host}'`,
    );
  }
  await connection.execute('FLUSH PRIVILEGES');
}

export async function createOwnedWorktreeDatabase(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  profileRoot?: string;
  connectAdmin?: typeof createLocalLifecycleAdminConnection;
}): Promise<WorktreeLifecycleEvidence> {
  const { authority, decision } = input;
  assertOwnedDisposableTarget(authority);
  const identity = identityFromAuthority(authority);
  const existingProfile = readWorktreeDatabaseProfile(identity, input.profileRoot);
  const connection = await (input.connectAdmin ?? createLocalLifecycleAdminConnection)(
    authority,
    decision,
  );
  let created = false;
  try {
    const exists = await databaseExists(connection, authority.context.databaseName);
    if (exists && !existingProfile) {
      throw new Error(
        'Worktree lifecycle refused: database exists without the matching ownership profile.',
      );
    }
    if (!exists) {
      await connection.execute(`CREATE DATABASE \`${authority.context.databaseName}\``);
      created = true;
      try {
        await grantLocalApplicationOwnership(connection, authority.context.databaseName);
      } catch (error) {
        await connection.execute(`DROP DATABASE \`${authority.context.databaseName}\``);
        created = false;
        throw error;
      }
    }
    writeWorktreeDatabaseProfile(identity, {}, input.profileRoot);
    return {
      operation: 'create',
      targetFingerprintHash: authority.context.targetFingerprintHash,
      databaseName: authority.context.databaseName,
      ownershipKey: authority.context.worktree.ownershipKey,
      changed: created,
    };
  } finally {
    await connection.end();
  }
}
export async function disposeOwnedWorktreeDatabase(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  profileRoot?: string;
  connectAdmin?: typeof createLocalLifecycleAdminConnection;
}): Promise<WorktreeLifecycleEvidence> {
  const { authority, decision } = input;
  assertOwnedDisposableTarget(authority);
  const identity = identityFromAuthority(authority);
  const profile = readWorktreeDatabaseProfile(identity, input.profileRoot);
  if (!profile) {
    throw new Error('Worktree lifecycle refused: exact ownership profile is absent.');
  }
  const connection = await (input.connectAdmin ?? createLocalLifecycleAdminConnection)(
    authority,
    decision,
  );
  try {
    const exists = await databaseExists(connection, authority.context.databaseName);
    if (exists) {
      await connection.execute(`DROP DATABASE \`${authority.context.databaseName}\``);
    }
    removeWorktreeDatabaseProfile(identity, input.profileRoot);
    return {
      operation: 'dispose',
      targetFingerprintHash: authority.context.targetFingerprintHash,
      databaseName: authority.context.databaseName,
      ownershipKey: authority.context.worktree.ownershipKey,
      changed: exists,
    };
  } finally {
    await connection.end();
  }
}
