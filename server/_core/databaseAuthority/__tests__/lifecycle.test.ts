import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  authorizeDatabaseOperation,
  expectedDatabaseAcknowledgement,
} from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { resolveDatabaseAuthority } from '../context';
import { createOwnedWorktreeDatabase, disposeOwnedWorktreeDatabase } from '../lifecycle';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';
import { readWorktreeDatabaseProfile } from '../worktreeProfile';

const roots: string[] = [];

function identity(name = 'listify-lifecycle-one') {
  const root = mkdtempSync(join(tmpdir(), `${name}-`));
  roots.push(root);
  const common = join(root, 'common');
  const worktree = join(root, 'worktree');
  mkdirSync(common);
  mkdirSync(worktree);
  return deriveGitWorktreeIdentity({
    repositoryRoot: worktree,
    gitCommonDirectory: common,
    worktreePath: worktree,
    branch: 'fix/lifecycle',
    head: 'a'.repeat(40),
    registered: true,
    clean: true,
  });
}

class LifecycleConnection implements AuthoritySqlConnection {
  schemas = new Set<string>();
  statements: string[] = [];
  ended = false;

  async execute(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    this.statements.push(statement);
    if (statement.includes('information_schema.schemata')) {
      const name = String(values[0] ?? '');
      return [this.schemas.has(name) ? [{ schema_name: name }] : []];
    }
    if (statement.includes('FROM mysql.user')) {
      return [[{ host_name: '127.0.0.1' }]];
    }
    const create = statement.match(/^CREATE DATABASE `([a-z0-9_]+)`$/);
    if (create) this.schemas.add(create[1]);
    const drop = statement.match(/^DROP DATABASE `([a-z0-9_]+)`$/);
    if (drop) this.schemas.delete(drop[1]);
    return [[]];
  }

  async query(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    return this.execute(statement, values);
  }

  async end(): Promise<void> {
    this.ended = true;
  }
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('owned disposable worktree lifecycle', () => {
  it('creates and disposes only with exact ownership and destructive acknowledgement', async () => {
    const gitIdentity = identity();
    const profileRoot = join(gitIdentity.worktreePath, 'profiles');
    const connection = new LifecycleConnection();
    const createAuthority = resolveDatabaseAuthority({
      operation: 'database-create',
      cwd: gitIdentity.worktreePath,
      gitIdentity,
      explicitDatabaseUrl: `mysql://owner:private@127.0.0.1:3307/${gitIdentity.expectedWorktreeDatabase}`,
      credentialClass: 'lifecycle-admin',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    const createDecision = authorizeDatabaseOperation(createAuthority, { root: process.cwd() });
    const created = await createOwnedWorktreeDatabase({
      authority: createAuthority,
      decision: createDecision,
      profileRoot,
      connectAdmin: async () => connection,
    });
    expect(created).toMatchObject({ operation: 'create', changed: true });
    expect(connection.schemas).toContain(gitIdentity.expectedWorktreeDatabase);

    const disposeAuthority = resolveDatabaseAuthority({
      operation: 'database-dispose',
      cwd: gitIdentity.worktreePath,
      gitIdentity,
      explicitDatabaseUrl: `mysql://owner:private@127.0.0.1:3307/${gitIdentity.expectedWorktreeDatabase}`,
      credentialClass: 'lifecycle-admin',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(() => authorizeDatabaseOperation(disposeAuthority, { root: process.cwd() })).toThrow(
      'exact acknowledgement',
    );
    const disposeDecision = authorizeDatabaseOperation(disposeAuthority, {
      root: process.cwd(),
      acknowledgement: expectedDatabaseAcknowledgement(disposeAuthority.context),
    });
    const disposed = await disposeOwnedWorktreeDatabase({
      authority: disposeAuthority,
      decision: disposeDecision,
      profileRoot,
      connectAdmin: async () => connection,
    });
    expect(disposed).toMatchObject({ operation: 'dispose', changed: true });
    expect(connection.schemas).not.toContain(gitIdentity.expectedWorktreeDatabase);
  });

  it('binds create and dispose to authentic decisions for the exact lifecycle action', async () => {
    const gitIdentity = identity('listify-lifecycle-operation-binding');
    const profileRoot = join(gitIdentity.worktreePath, 'profiles');
    const connection = new LifecycleConnection();
    const databaseUrl = `mysql://owner:private@127.0.0.1:3307/${gitIdentity.expectedWorktreeDatabase}`;
    const createAuthority = resolveDatabaseAuthority({
      operation: 'database-create',
      cwd: gitIdentity.worktreePath,
      gitIdentity,
      explicitDatabaseUrl: databaseUrl,
      credentialClass: 'lifecycle-admin',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    const createDecision = authorizeDatabaseOperation(createAuthority, { root: process.cwd() });
    await createOwnedWorktreeDatabase({
      authority: createAuthority,
      decision: createDecision,
      profileRoot,
      connectAdmin: async () => connection,
    });
    connection.statements = [];

    let rejectedFactoryCalls = 0;
    await expect(
      disposeOwnedWorktreeDatabase({
        authority: createAuthority,
        decision: createDecision,
        profileRoot,
        connectAdmin: async () => {
          rejectedFactoryCalls += 1;
          return connection;
        },
      }),
    ).rejects.toThrow('authorization is absent or mismatched');
    expect(rejectedFactoryCalls).toBe(0);
    expect(connection.statements.some(statement => statement.startsWith('DROP DATABASE'))).toBe(
      false,
    );
    expect(connection.schemas).toContain(gitIdentity.expectedWorktreeDatabase);
    expect(readWorktreeDatabaseProfile(gitIdentity, profileRoot)).not.toBeNull();

    const disposeAuthority = resolveDatabaseAuthority({
      operation: 'database-dispose',
      cwd: gitIdentity.worktreePath,
      gitIdentity,
      explicitDatabaseUrl: databaseUrl,
      credentialClass: 'lifecycle-admin',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(() => authorizeDatabaseOperation(disposeAuthority, { root: process.cwd() })).toThrow(
      'exact acknowledgement',
    );
    const disposeDecision = authorizeDatabaseOperation(disposeAuthority, {
      root: process.cwd(),
      acknowledgement: expectedDatabaseAcknowledgement(disposeAuthority.context),
    });

    await expect(
      createOwnedWorktreeDatabase({
        authority: disposeAuthority,
        decision: disposeDecision,
        profileRoot,
        connectAdmin: async () => {
          rejectedFactoryCalls += 1;
          return connection;
        },
      }),
    ).rejects.toThrow('authorization is absent or mismatched');
    expect(rejectedFactoryCalls).toBe(0);

    const forgedDecision = { ...createDecision, decisionId: 'forged' } as typeof createDecision;
    await expect(
      createOwnedWorktreeDatabase({
        authority: createAuthority,
        decision: forgedDecision,
        profileRoot,
        connectAdmin: async () => {
          rejectedFactoryCalls += 1;
          return connection;
        },
      }),
    ).rejects.toThrow('authorization is absent or mismatched');
    expect(rejectedFactoryCalls).toBe(0);
    expect(readWorktreeDatabaseProfile(gitIdentity, profileRoot)).not.toBeNull();

    const disposed = await disposeOwnedWorktreeDatabase({
      authority: disposeAuthority,
      decision: disposeDecision,
      profileRoot,
      connectAdmin: async () => connection,
    });
    expect(disposed).toMatchObject({ operation: 'dispose', changed: true });
    expect(readWorktreeDatabaseProfile(gitIdentity, profileRoot)).toBeNull();
  });

  it('refuses another worktree database and an unprofiled pre-existing database', async () => {
    const first = identity('listify-lifecycle-first');
    const second = identity('listify-lifecycle-second');
    const wrong = resolveDatabaseAuthority({
      operation: 'database-create',
      cwd: first.worktreePath,
      gitIdentity: first,
      explicitDatabaseUrl: `mysql://owner:private@127.0.0.1:3307/${second.expectedWorktreeDatabase}`,
      credentialClass: 'lifecycle-admin',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(() => authorizeDatabaseOperation(wrong, { root: process.cwd() })).toThrow('fails closed');

    const authority = resolveDatabaseAuthority({
      operation: 'database-create',
      cwd: first.worktreePath,
      gitIdentity: first,
      explicitDatabaseUrl: `mysql://owner:private@127.0.0.1:3307/${first.expectedWorktreeDatabase}`,
      credentialClass: 'lifecycle-admin',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    const connection = new LifecycleConnection();
    connection.schemas.add(first.expectedWorktreeDatabase);
    await expect(
      createOwnedWorktreeDatabase({
        authority,
        decision,
        profileRoot: join(first.worktreePath, 'profiles'),
        connectAdmin: async () => connection,
      }),
    ).rejects.toThrow('exists without the matching ownership profile');
    expect(connection.statements.some(statement => statement.startsWith('DROP DATABASE'))).toBe(false);
  });
});
