import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { authorizeDatabaseOperation, expectedDatabaseAcknowledgement } from '../authorization';
import { databaseAuthorityChildEnvironment, resolveDatabaseAuthority } from '../context';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';

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
  it('enforces the local runtime, migration, and verifier credential matrix', () => {
    const identity = fixtureIdentity('listify-security-matrix');
    const target = `mysql://local-user:local-password@127.0.0.1:3307/${identity.expectedWorktreeDatabase}`;
    const authority = (
      operation: 'runtime-connect' | 'migration-apply' | 'verification',
      credentialClass: 'runtime' | 'migration' | 'read-only' | 'lifecycle-admin',
    ) =>
      resolveDatabaseAuthority({
        operation,
        cwd: identity.worktreePath,
        gitIdentity: identity,
        explicitDatabaseUrl: target,
        credentialClass,
        processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
      });

    const runtime = authority('runtime-connect', 'runtime');
    const migration = authority('migration-apply', 'migration');
    const verifier = authority('verification', 'read-only');

    expect(() => authorizeDatabaseOperation(runtime, { root: process.cwd() })).not.toThrow();
    expect(() => authorizeDatabaseOperation(migration, { root: process.cwd() })).not.toThrow();
    expect(() => authorizeDatabaseOperation(verifier, { root: process.cwd() })).not.toThrow();

    const runtimeAsVerifier = authority('runtime-connect', 'read-only');
    const migrationAsRuntime = authority('migration-apply', 'runtime');
    const verifierAsAdmin = authority('verification', 'lifecycle-admin');
    expect(() => authorizeDatabaseOperation(runtimeAsVerifier, { root: process.cwd() })).toThrow(
      'credential class read-only is not allowed for runtime-connect',
    );
    expect(() => authorizeDatabaseOperation(migrationAsRuntime, { root: process.cwd() })).toThrow(
      'credential class runtime is not allowed for migration-apply',
    );
    expect(() => authorizeDatabaseOperation(verifierAsAdmin, { root: process.cwd() })).toThrow(
      'credential class lifecycle-admin is not allowed for verification',
    );
  });

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
    expect(authority.context.credentialSource).toBe('database-url');
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

  it('requires a distinct, same-target migration credential for protected applies', () => {
    const identity = fixtureIdentity();
    const runtimeUrl =
      'mysql://runtime-user:runtime-password@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/listify_property_sa';
    const input = {
      operation: 'release-apply' as const,
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: runtimeUrl,
      credentialClass: 'migration' as const,
    };

    expect(() =>
      resolveDatabaseAuthority({
        ...input,
        processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
      }),
    ).toThrow('DATABASE_MIGRATION_URL is required');

    expect(() =>
      resolveDatabaseAuthority({
        ...input,
        processEnv: {
          NODE_ENV: 'production',
          APP_ENV: 'production',
          DATABASE_MIGRATION_URL:
            'mysql://migration-user:migration-password@other.example.com:4000/listify_property_sa',
        },
      }),
    ).toThrow('must exactly match the approved runtime target');

    expect(() =>
      resolveDatabaseAuthority({
        ...input,
        processEnv: {
          NODE_ENV: 'production',
          APP_ENV: 'production',
          DATABASE_MIGRATION_URL:
            'mysql://runtime-user:another-password@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/listify_property_sa',
        },
      }),
    ).toThrow('distinct nonempty database username and password');

    expect(() =>
      resolveDatabaseAuthority({
        ...input,
        processEnv: {
          NODE_ENV: 'production',
          APP_ENV: 'production',
          DATABASE_MIGRATION_URL:
            'mysql://runtime%2Duser:another-password@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/listify_property_sa',
        },
      }),
    ).toThrow('distinct nonempty database username and password');

    const authority = resolveDatabaseAuthority({
      ...input,
      processEnv: {
        NODE_ENV: 'production',
        APP_ENV: 'production',
        DATABASE_MIGRATION_URL:
          'mysql://migration-user:migration-password@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/listify_property_sa',
      },
    });

    expect(authority.context.credentialSource).toBe('protected-migration-url');
    const output = JSON.stringify(authority);
    expect(output).not.toContain('runtime-user');
    expect(output).not.toContain('runtime-password');
    expect(output).not.toContain('migration-user');
    expect(output).not.toContain('migration-password');

    const child = resolveDatabaseAuthority({
      ...input,
      processEnv: databaseAuthorityChildEnvironment(authority, {
        DATABASE_MIGRATION_URL:
          'mysql://stale-user:stale-password@wrong.example.com/listify_property_sa',
      }),
    });
    expect(child.context.targetFingerprintHash).toBe(authority.context.targetFingerprintHash);
    expect(child.context.credentialSource).toBe('protected-migration-url');
  });

  it('does not load a protected migration credential from a repository environment file', () => {
    const identity = fixtureIdentity();
    const runtimeUrl =
      'mysql://runtime-user:runtime-password@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/listify_property_sa';
    writeFileSync(
      join(identity.worktreePath, '.env.production'),
      'DATABASE_MIGRATION_URL=mysql://migration-user:migration-password@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/listify_property_sa\n',
    );

    expect(() =>
      resolveDatabaseAuthority({
        operation: 'release-apply',
        cwd: identity.worktreePath,
        gitIdentity: identity,
        explicitDatabaseUrl: runtimeUrl,
        credentialClass: 'migration',
        processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
      }),
    ).toThrow('DATABASE_MIGRATION_URL is required');
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
    expect(() => authorizeDatabaseOperation(remote, { root: process.cwd() })).toThrow(
      'fails closed',
    );

    const mislabeledProduction = resolveDatabaseAuthority({
      operation: 'release-plan',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: 'mysql://user:secret@db.prod.example.com/unclassified_database',
      credentialClass: 'read-only',
      processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
    });
    expect(mislabeledProduction.context.targetClass).toBe('shared-remote');
    expect(() => authorizeDatabaseOperation(mislabeledProduction, { root: process.cwd() })).toThrow(
      'fails closed',
    );

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

  it('registers only the exact Azure production target for approved read-only operations', () => {
    const identity = fixtureIdentity();
    const target =
      'mysql://propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database';
    const resolve = (
      operation: 'read-only-connect' | 'diagnostics' | 'readiness' | 'release-plan' | 'release-apply' | 'runtime-connect',
      credentialClass: 'read-only' | 'runtime' | 'lifecycle-admin' = 'read-only',
      databaseUrl = target,
    ) =>
      resolveDatabaseAuthority({
        operation,
        cwd: identity.worktreePath,
        gitIdentity: identity,
        explicitDatabaseUrl: databaseUrl,
        credentialClass,
        processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
      });

    for (const operation of ['read-only-connect', 'diagnostics', 'readiness', 'release-plan'] as const) {
      const authority = resolve(operation);
      expect(authority.context.targetClass).toBe('production');
      expect(authority.context.targetFingerprint).toBe(target);
      expect(authority.context.targetFingerprintHash).toBe(
        'b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced',
      );
      expect(authority.context.tls).toEqual({
        required: true,
        certificateVerificationRequired: true,
      });
      expect(() => authorizeDatabaseOperation(authority, { root: process.cwd() })).toThrow(
        'protected target requires an exact operation and fingerprint approval',
      );
      expect(() =>
        authorizeDatabaseOperation(authority, {
          root: process.cwd(),
          approval: {
            reference: 'B08-TEST-ONLY',
            actor: 'test-reviewer',
            operation: 'runtime-connect',
            targetFingerprintHash: authority.context.targetFingerprintHash,
          },
        }),
      ).toThrow('protected target requires an exact operation and fingerprint approval');
      expect(() =>
        authorizeDatabaseOperation(authority, {
          root: process.cwd(),
          approval: {
            reference: 'B08-TEST-ONLY',
            actor: 'test-reviewer',
            operation,
            targetFingerprintHash: 'not-the-approved-target',
          },
        }),
      ).toThrow('protected target requires an exact operation and fingerprint approval');
      expect(() =>
        authorizeDatabaseOperation(authority, {
          root: process.cwd(),
          approval: {
            reference: 'B08-TEST-ONLY',
            actor: 'test-reviewer',
            operation,
            targetFingerprintHash: authority.context.targetFingerprintHash,
          },
        }),
      ).not.toThrow();
    }

    for (const other of [
      'mysql://other.mysql.database.azure.com:3306/propertylistify_database',
      'mysql://propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_other',
      'mysql://propertylistify-mysql.mysql.database.azure.com:3307/propertylistify_database',
    ]) {
      const authority = resolve('read-only-connect', 'read-only', other);
      expect(authority.context.targetClass).toBe('shared-remote');
      expect(() => authorizeDatabaseOperation(authority, { root: process.cwd() })).toThrow(
        'fails closed',
      );
    }

    for (const [operation, credentialClass] of [
      ['release-apply', 'read-only'],
      ['runtime-connect', 'read-only'],
      ['read-only-connect', 'lifecycle-admin'],
    ] as const) {
      const authority = resolve(operation, credentialClass);
      expect(() => authorizeDatabaseOperation(authority, { root: process.cwd() })).toThrow(
        'credential class',
      );
    }
  });

  it('confines B08 inspection identity provisioning to the exact Azure target and account', () => {
    const identity = fixtureIdentity();
    const resolve = (databaseUrl: string, credentialClass: 'bootstrap-admin' | 'runtime' = 'bootstrap-admin') =>
      resolveDatabaseAuthority({
        operation: 'inspection-identity-provision',
        cwd: identity.worktreePath,
        gitIdentity: identity,
        explicitDatabaseUrl: databaseUrl,
        credentialClass,
        processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
      });
    const target = 'mysql://propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database';
    const authority = resolve(target);
    const approval = {
      reference: 'B08-TEST-ONLY',
      actor: 'test-reviewer',
      operation: 'inspection-identity-provision' as const,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      credentialClass: 'bootstrap-admin' as const,
      inspectionIdentity: 'propertylistify_b08_inspector',
    };
    expect(() => authorizeDatabaseOperation(authority, { root: process.cwd() })).toThrow(
      'exact B08 Azure inspection identity approval',
    );
    expect(() => authorizeDatabaseOperation(authority, {
      root: process.cwd(),
      approval: { ...approval, inspectionIdentity: 'some_other_user' },
    })).toThrow('exact B08 Azure inspection identity approval');
    expect(() => authorizeDatabaseOperation(authority, {
      root: process.cwd(),
      approval: { ...approval, credentialClass: 'read-only' },
    })).toThrow('exact B08 Azure inspection identity approval');
    expect(() => authorizeDatabaseOperation(authority, {
      root: process.cwd(),
      approval: { ...approval, targetFingerprintHash: 'wrong' },
    })).toThrow('protected target requires an exact operation and fingerprint approval');
    expect(() => authorizeDatabaseOperation(authority, { root: process.cwd(), approval })).not.toThrow();

    const tidb = resolve('mysql://old.tidbcloud.com:3306/listify_property_sa');
    expect(tidb.context.targetClass).toBe('production');
    expect(() => authorizeDatabaseOperation(tidb, {
      root: process.cwd(),
      approval: { ...approval, targetFingerprintHash: tidb.context.targetFingerprintHash },
    })).toThrow('exact B08 Azure inspection identity approval');
    const wrongClass = resolve(target, 'runtime');
    expect(() => authorizeDatabaseOperation(wrongClass, { root: process.cwd(), approval })).toThrow(
      'credential class',
    );
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

  it('binds GitHub Actions disposable CI operations to distinct physical role URLs', () => {
    const identity = fixtureIdentity();
    const processEnv = {
      CI: 'true',
      GITHUB_ACTIONS: 'true',
      APP_ENV: 'test',
      NODE_ENV: 'test',
      DATABASE_RUNTIME_URL: 'mysql://listify_ci_app:app-secret@127.0.0.1:3306/listify_test',
      DATABASE_WORKER_URL: 'mysql://listify_ci_worker:worker-secret@127.0.0.1:3306/listify_test',
      DATABASE_VERIFIER_URL:
        'mysql://listify_ci_verifier:verify-secret@127.0.0.1:3306/listify_test',
      DATABASE_MIGRATION_URL:
        'mysql://listify_ci_migration:migration-secret@127.0.0.1:3306/listify_test',
    };
    const resolve = (
      operation: 'runtime-connect' | 'worker-connect' | 'verification' | 'migration-apply',
    ) =>
      resolveDatabaseAuthority({
        operation,
        cwd: identity.worktreePath,
        gitIdentity: identity,
        centralPath: join(identity.repositoryRoot, 'missing-central.env'),
        explicitDatabaseUrl: 'mysql://listify_ci_app:app-secret@127.0.0.1:3306/listify_test',
        processEnv,
      });
    expect(resolve('runtime-connect').context).toMatchObject({
      credentialClass: 'runtime',
      credentialSource: 'isolated-ci-role-url',
    });
    expect(resolve('worker-connect').context.credentialClass).toBe('worker');
    expect(resolve('verification').context.credentialClass).toBe('read-only');
    expect(resolve('migration-apply').context.credentialClass).toBe('migration');
    expect(() =>
      resolveDatabaseAuthority({
        operation: 'runtime-connect',
        cwd: identity.worktreePath,
        gitIdentity: identity,
        centralPath: join(identity.repositoryRoot, 'missing-central.env'),
        explicitDatabaseUrl: 'mysql://listify_ci_app:app-secret@127.0.0.1:3306/listify_test',
        credentialClass: 'migration',
        processEnv,
      }),
    ).toThrow('credential class cannot override the operation role');
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
    const protectedProcessEnv = {
      NODE_ENV: 'production',
      APP_ENV: 'production',
      DATABASE_MIGRATION_URL:
        'mysql://release-migration:private@db.prod.example.com/listify_property_sa',
    };
    const generic = resolveDatabaseAuthority({
      operation: 'migration-apply',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: target,
      credentialClass: 'migration',
      processEnv: protectedProcessEnv,
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
      processEnv: protectedProcessEnv,
    });
    const approval = {
      reference: 'CHANGE-123',
      actor: 'release-owner',
      operation: release.context.operation,
      targetFingerprintHash: release.context.targetFingerprintHash,
    };
    expect(() => authorizeDatabaseOperation(release, { root: process.cwd(), approval })).toThrow(
      'exact acknowledgement',
    );
    expect(
      authorizeDatabaseOperation(release, {
        root: process.cwd(),
        approval,
        acknowledgement: expectedDatabaseAcknowledgement(release.context),
      }),
    ).toMatchObject({ operation: 'release-apply', targetClass: 'production' });
  });

  it('authorizes canonical commercial reference release operations without widening disposable reference seeding', () => {
    const identity = fixtureIdentity();
    const target = 'mysql://release-user:private@db.prod.example.com/listify_property_sa';
    const protectedProcessEnv = {
      NODE_ENV: 'production',
      APP_ENV: 'production',
      DATABASE_MIGRATION_URL:
        'mysql://release-migration:private@db.prod.example.com/listify_property_sa',
    };
    const plan = resolveDatabaseAuthority({
      operation: 'release-reference-plan',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: target,
      credentialClass: 'read-only',
      processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
    });
    const planApproval = {
      reference: 'CHANGE-456',
      actor: 'release-owner',
      operation: plan.context.operation,
      targetFingerprintHash: plan.context.targetFingerprintHash,
    };
    expect(
      authorizeDatabaseOperation(plan, { root: process.cwd(), approval: planApproval }),
    ).toMatchObject({ operation: 'release-reference-plan', targetClass: 'production' });

    const apply = resolveDatabaseAuthority({
      operation: 'release-reference-apply',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: target,
      credentialClass: 'migration',
      processEnv: protectedProcessEnv,
    });
    const applyApproval = {
      reference: 'CHANGE-456',
      actor: 'release-owner',
      operation: apply.context.operation,
      targetFingerprintHash: apply.context.targetFingerprintHash,
    };
    expect(() =>
      authorizeDatabaseOperation(apply, { root: process.cwd(), approval: applyApproval }),
    ).toThrow('exact acknowledgement');
    expect(
      authorizeDatabaseOperation(apply, {
        root: process.cwd(),
        approval: applyApproval,
        acknowledgement: expectedDatabaseAcknowledgement(apply.context),
      }),
    ).toMatchObject({ operation: 'release-reference-apply', targetClass: 'production' });

    const generic = resolveDatabaseAuthority({
      operation: 'reference-seed',
      cwd: identity.worktreePath,
      gitIdentity: identity,
      explicitDatabaseUrl: target,
      credentialClass: 'local-owner',
      processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
    });
    expect(() => authorizeDatabaseOperation(generic, { root: process.cwd() })).toThrow(
      'not allowed for production',
    );
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
