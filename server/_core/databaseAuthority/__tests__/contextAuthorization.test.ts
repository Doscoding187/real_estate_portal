import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  authorizeDatabaseOperation,
  expectedDatabaseAcknowledgement,
} from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import {
  deriveGitWorktreeIdentity,
} from '../worktreeIdentity';

const temporaryRoots: string[] = [];

function fixtureIdentity(name = 'listify-feature-control', branch = 'fix/database-control') {
  const root = mkdtempSync(join(tmpdir(), `${name}-`));
  const common = join(root, '.git-common');
  const worktree = join(root, name);
  mkdirSync(common);
  mkdirSync(worktree);
  temporaryRoots.push(root);
  return deriveGitWorktreeIdentity({
    repositoryRoot: worktree,
    gitCommonDirectory: common,
    worktreePath: worktree,
    branch,
    head: 'a'.repeat(40),
    originMainHead: branch === 'main' ? 'a'.repeat(40) : 'b'.repeat(40),
    upstream: branch === 'main' ? 'origin/main' : 'origin/main',
    registered: true,
    clean: true,
  });
}

function centralEnvironment(identity: ReturnType<typeof fixtureIdentity>) {
  const central = join(identity.repositoryRoot, 'central.env');
  writeFileSync(
    central,
    'DATABASE_URL=mysql://listify_app:private-password@127.0.0.1:3307/listify_local\nAPP_ENV=development\nNODE_ENV=development\n',
    { mode: 0o600 },
  );
  chmodSync(central, 0o600);
  return central;
}

afterEach(() => {
  while (temporaryRoots.length) {
    rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

describe('immutable resolved database context and operation authorization', () => {
  it('preserves an explicit caller target over worktree and central files', () => {
    const identity = fixtureIdentity();
    const central = centralEnvironment(identity);
    writeFileSync(
      join(identity.worktreePath, '.env.local'),
      'DATABASE_URL=mysql://other@127.0.0.1:3307/listify_local\n',
    );
    const explicit = `mysql://listify_app:private-password@127.0.0.1:3307/${identity.expectedWorktreeDatabase}`;
    const authority = resolveDatabaseAuthority({
      operation: 'migration-plan',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: central,
      explicitDatabaseUrl: explicit,
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });

    expect(authority.context.environmentSource).toBe('explicit-caller');
    expect(authority.context.databaseName).toBe(identity.expectedWorktreeDatabase);
    expect(authority.context.targetClass).toBe('disposable-worktree');
    expect(Object.isFrozen(authority.context)).toBe(true);
  });

  it('derives a non-main central fallback into the owned worktree database', () => {
    const identity = fixtureIdentity();
    const central = centralEnvironment(identity);
    const authority = resolveDatabaseAuthority({
      operation: 'migration-apply',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: central,
      profileRoot: join(identity.repositoryRoot, 'profiles'),
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });

    expect(authority.context.environmentSource).toBe('central-local-derived-worktree');
    expect(authority.context.databaseName).toBe(identity.expectedWorktreeDatabase);
    expect(authority.context.databaseName).not.toBe('listify_local');
    expect(authorizeDatabaseOperation(authority, { root: process.cwd() })).toMatchObject({
      operation: 'migration-apply',
      targetClass: 'disposable-worktree',
    });
  });

  it('fails when a child resolves a fingerprint different from its parent', () => {
    const identity = fixtureIdentity();
    expect(() =>
      resolveDatabaseAuthority({
        operation: 'verification',
        cwd: identity.worktreePath,
        gitIdentity: identity,
        explicitDatabaseUrl: `mysql://user:secret@127.0.0.1:3307/${identity.expectedWorktreeDatabase}`,
        processEnv: {
          NODE_ENV: 'development',
          APP_ENV: 'development',
          DATABASE_AUTHORITY_PARENT_FINGERPRINT: '0'.repeat(64),
        },
      }),
    ).toThrow('differs from the parent');
  });

  it('rejects encoded or noncanonical database identifiers before classification', () => {
    const identity = fixtureIdentity();
    for (const databasePath of ['%6cistify_local', 'listify_local/extra']) {
      expect(() =>
        resolveDatabaseAuthority({
          operation: 'readiness',
          cwd: identity.worktreePath,
          gitIdentity: identity,
          explicitDatabaseUrl: `mysql://user:secret@127.0.0.1:3307/${databasePath}`,
          processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
        }),
      ).toThrow('canonical unencoded identifier');
    }
  });

  it('keeps credentials and complete URLs out of context serialization and errors', () => {
    const identity = fixtureIdentity();
    const authority = resolveDatabaseAuthority({
      operation: 'migration-plan',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: `mysql://sensitive-user:sensitive-password@127.0.0.1:3307/${identity.expectedWorktreeDatabase}`,
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    const output = JSON.stringify(authority);
    expect(output).not.toContain('sensitive-user');
    expect(output).not.toContain('sensitive-password');
    expect(output).not.toContain('@');
    expect(output).toContain(authority.context.targetFingerprint);

    let message = '';
    try {
      resolveDatabaseAuthority({
        operation: 'migration-plan',
        cwd: identity.worktreePath,
        gitIdentity: identity,
        explicitDatabaseUrl: 'not-a-url-with-sensitive-password',
        processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).not.toContain('sensitive-password');
  });

  it('fails closed for unknown and remote targets and varies permissions by operation', () => {
    const identity = fixtureIdentity();
    const remote = resolveDatabaseAuthority({
      operation: 'migration-apply',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: 'mysql://user:secret@shared.example.com/listify_preview',
      credentialClass: 'migration',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(remote.context.targetClass).toBe('shared-remote');
    expect(() => authorizeDatabaseOperation(remote, { root: process.cwd() })).toThrow('fails closed');

    const mislabeledProduction = resolveDatabaseAuthority({
      operation: 'release-plan',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: 'mysql://user:secret@db.prod.example.com/unclassified_database',
      credentialClass: 'read-only',
      processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
    });
    expect(mislabeledProduction.context.targetClass).toBe('shared-remote');
    expect(() =>
      authorizeDatabaseOperation(mislabeledProduction, { root: process.cwd() }),
    ).toThrow('fails closed');

    const local = resolveDatabaseAuthority({
      operation: 'test-fixture',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: `mysql://user:secret@127.0.0.1:3307/${identity.expectedWorktreeDatabase}`,
      credentialClass: 'local-owner',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(authorizeDatabaseOperation(local, { root: process.cwd() })).toMatchObject({
      operation: 'test-fixture',
      targetClass: 'disposable-worktree',
    });
  });

  it('prevents a feature worktree from mutating listify_local', () => {
    const identity = fixtureIdentity();
    const authority = resolveDatabaseAuthority({
      operation: 'migration-apply',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: 'mysql://user:secret@127.0.0.1:3307/listify_local',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(authority.context.targetClass).toBe('clean-main-local');
    expect(authority.context.worktree.cleanMainOwnershipMatches).toBe(false);
    expect(() => authorizeDatabaseOperation(authority, { root: process.cwd() })).toThrow(
      'not allowed for clean-main-local',
    );
  });

  it('authorizes an explicitly declared repository-owned CI test target without exposing credentials', () => {
    const identity = fixtureIdentity();
    const first = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: join(identity.repositoryRoot, 'missing-central.env'),
      explicitDatabaseUrl: 'mysql://synthetic:synthetic@127.0.0.1:3306/listify_test',
      processEnv: { CI: 'true', APP_ENV: 'test' },
    });
    const second = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: join(identity.repositoryRoot, 'missing-central.env'),
      explicitDatabaseUrl: 'mysql://different:different@127.0.0.1:3306/listify_test',
      processEnv: { CI: 'true', APP_ENV: 'test' },
    });

    expect(first.context.runtimeMode).toBe('test');
    expect(first.context.targetClass).toBe('disposable-test');
    expect(first.context.credentialClass).toBe('test-owner');
    expect(first.context.targetFingerprint).toBe('mysql://127.0.0.1:3306/listify_test');
    expect(first.context.targetFingerprintHash).toBe(second.context.targetFingerprintHash);
    expect(authorizeDatabaseOperation(first, { root: process.cwd() })).toMatchObject({
      operation: 'verification',
      targetClass: 'disposable-test',
      credentialClass: 'test-owner',
    });

    const output = JSON.stringify(first);
    expect(output).not.toContain('synthetic');
    expect(output).not.toContain('different');
    expect(output).not.toContain('@');
  });

  it('keeps the CI test target unknown without an explicit test runtime', () => {
    const identity = fixtureIdentity();
    const authority = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: join(identity.repositoryRoot, 'missing-central.env'),
      explicitDatabaseUrl: 'mysql://synthetic:synthetic@127.0.0.1:3306/listify_test',
      processEnv: { CI: 'true' },
    });

    expect(authority.context.runtimeMode).toBe('development');
    expect(authority.context.targetClass).toBe('unknown');
    expect(() => authorizeDatabaseOperation(authority, { root: process.cwd() })).toThrow(
      'fails closed',
    );
  });

  it('does not trust CI alone or a test runtime for an arbitrary port-3306 database', () => {
    const identity = fixtureIdentity();
    const ciOnly = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: join(identity.repositoryRoot, 'missing-central.env'),
      explicitDatabaseUrl: 'mysql://synthetic:synthetic@127.0.0.1:3306/arbitrary_database',
      processEnv: { CI: 'true' },
    });
    const explicitlyTestButWrongName = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: join(identity.repositoryRoot, 'missing-central.env'),
      explicitDatabaseUrl: 'mysql://synthetic:synthetic@127.0.0.1:3306/not_listify_test',
      processEnv: { CI: 'true', APP_ENV: 'test', NODE_ENV: 'test' },
    });

    for (const authority of [ciOnly, explicitlyTestButWrongName]) {
      expect(authority.context.targetClass).toBe('unknown');
      expect(() => authorizeDatabaseOperation(authority, { root: process.cwd() })).toThrow(
        'fails closed',
      );
    }
  });

  it('denies remote CI targets and inappropriate CI credential classes', () => {
    const identity = fixtureIdentity();
    const remote = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: join(identity.repositoryRoot, 'missing-central.env'),
      explicitDatabaseUrl: 'mysql://synthetic:synthetic@remote.example/listify_test',
      credentialClass: 'test-owner',
      processEnv: { CI: 'true', APP_ENV: 'test', NODE_ENV: 'test' },
    });
    const wrongCredential = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: join(identity.repositoryRoot, 'missing-central.env'),
      explicitDatabaseUrl: 'mysql://synthetic:synthetic@127.0.0.1:3306/listify_test',
      credentialClass: 'lifecycle-admin',
      processEnv: { CI: 'true', APP_ENV: 'test', NODE_ENV: 'test' },
    });

    expect(remote.context.targetClass).toBe('shared-remote');
    expect(() => authorizeDatabaseOperation(remote, { root: process.cwd() })).toThrow(
      'fails closed',
    );
    expect(wrongCredential.context.targetClass).toBe('disposable-test');
    expect(() => authorizeDatabaseOperation(wrongCredential, { root: process.cwd() })).toThrow(
      'credential class lifecycle-admin is not allowed',
    );
  });

  it('keeps development port 3306 and non-CI fixed test databases denied', () => {
    const identity = fixtureIdentity();
    const development = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: join(identity.repositoryRoot, 'missing-central.env'),
      explicitDatabaseUrl: 'mysql://synthetic:synthetic@127.0.0.1:3306/listify_test',
      processEnv: { CI: 'true', APP_ENV: 'development', NODE_ENV: 'development' },
    });
    const nonCiTest = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: join(identity.repositoryRoot, 'missing-central.env'),
      explicitDatabaseUrl: 'mysql://synthetic:synthetic@127.0.0.1:3307/listify_test',
      processEnv: { APP_ENV: 'test', NODE_ENV: 'test' },
    });

    for (const authority of [development, nonCiTest]) {
      expect(authority.context.targetClass).toBe('unknown');
      expect(() => authorizeDatabaseOperation(authority, { root: process.cwd() })).toThrow(
        'fails closed',
      );
    }
  });

  it('rejects a CI child target whose fingerprint differs from its parent', () => {
    const identity = fixtureIdentity();
    expect(() =>
      resolveDatabaseAuthority({
        operation: 'verification',
        cwd: identity.worktreePath,
        gitIdentity: identity,
        centralPath: join(identity.repositoryRoot, 'missing-central.env'),
        explicitDatabaseUrl: 'mysql://synthetic:synthetic@127.0.0.1:3306/listify_test',
        processEnv: {
          CI: 'true',
          APP_ENV: 'test',
          NODE_ENV: 'test',
          DATABASE_AUTHORITY_PARENT_FINGERPRINT: '0'.repeat(64),
        },
      }),
    ).toThrow('differs from the parent');
  });

  it('accepts a CI child target whose fingerprint matches its parent', () => {
    const identity = fixtureIdentity();
    const input = {
      operation: 'verification' as const,
      cwd: identity.worktreePath,
      gitIdentity: identity,
      centralPath: join(identity.repositoryRoot, 'missing-central.env'),
      explicitDatabaseUrl: 'mysql://synthetic:synthetic@127.0.0.1:3306/listify_test',
      processEnv: {
        CI: 'true',
        APP_ENV: 'test',
        NODE_ENV: 'test',
      },
    };
    const parent = resolveDatabaseAuthority(input);
    const child = resolveDatabaseAuthority({
      ...input,
      processEnv: {
        ...input.processEnv,
        DATABASE_AUTHORITY_PARENT_FINGERPRINT: parent.context.targetFingerprintHash,
      },
    });

    expect(child.context.targetFingerprintHash).toBe(parent.context.targetFingerprintHash);
    expect(() => authorizeDatabaseOperation(child, { root: process.cwd() })).not.toThrow();
  });

  it('requires exact target acknowledgement for disposal', () => {
    const identity = fixtureIdentity();
    const authority = resolveDatabaseAuthority({
      operation: 'database-dispose',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: `mysql://user:secret@127.0.0.1:3307/${identity.expectedWorktreeDatabase}`,
      credentialClass: 'lifecycle-admin',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(() => authorizeDatabaseOperation(authority, { root: process.cwd() })).toThrow(
      'exact acknowledgement',
    );
    expect(
      authorizeDatabaseOperation(authority, {
        root: process.cwd(),
        acknowledgement: expectedDatabaseAcknowledgement(authority.context),
      }),
    ).toMatchObject({ operation: 'database-dispose' });
  });

  it('routes protected migration work only through exact release operations', () => {
    const identity = fixtureIdentity();
    const target = 'mysql://release-user:private@db.prod.example.com/listify_property_sa';
    const generic = resolveDatabaseAuthority({
      operation: 'migration-apply',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: target,
      credentialClass: 'migration',
      processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
    });
    const genericApproval = {
      reference: 'CHANGE-123',
      actor: 'release-owner',
      operation: generic.context.operation,
      targetFingerprintHash: generic.context.targetFingerprintHash,
    };
    expect(() =>
      authorizeDatabaseOperation(generic, {
        root: process.cwd(),
        approval: genericApproval,
      }),
    ).toThrow('not allowed for production');

    const release = resolveDatabaseAuthority({
      operation: 'release-apply',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: target,
      credentialClass: 'migration',
      processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
    });
    const approval = {
      reference: 'CHANGE-123',
      actor: 'release-owner',
      operation: release.context.operation,
      targetFingerprintHash: release.context.targetFingerprintHash,
    };
    expect(() =>
      authorizeDatabaseOperation(release, { root: process.cwd(), approval }),
    ).toThrow('exact acknowledgement');
    expect(
      authorizeDatabaseOperation(release, {
        root: process.cwd(),
        approval,
        acknowledgement: expectedDatabaseAcknowledgement(release.context),
      }),
    ).toMatchObject({ operation: 'release-apply', targetClass: 'production' });
  });
});

describe('collision-resistant worktree database identity', () => {
  it('does not collide for similar or truncated names and survives branch rename', () => {
    const first = fixtureIdentity(`listify-${'same-prefix-'.repeat(5)}one`, 'feat/one');
    const second = fixtureIdentity(`listify-${'same-prefix-'.repeat(5)}two`, 'feat/two');
    expect(first.expectedWorktreeDatabase).not.toBe(second.expectedWorktreeDatabase);

    const renamed = deriveGitWorktreeIdentity({
      repositoryRoot: first.repositoryRoot,
      gitCommonDirectory: first.gitCommonDirectory,
      worktreePath: first.worktreePath,
      branch: 'feat/renamed-completely',
      head: first.head,
      registered: true,
      clean: true,
    });
    expect(renamed.expectedWorktreeDatabase).toBe(first.expectedWorktreeDatabase);
    expect(renamed.ownershipKey).toBe(first.ownershipKey);
  });
});
