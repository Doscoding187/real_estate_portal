import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import * as schema from '../../../../drizzle/schema';
import { authorizeDatabaseOperation, loadDatabaseOperationPolicy } from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import {
  applyRuntimeGrant0200,
  executeRuntime0200GrantPlan,
  parseRuntime0200Grants,
  reconcileRuntime0200Grants,
  runtimeGrant0200Acknowledgement,
  runtimeGrant0200ApplyPlan,
  Runtime0200GrantFailure,
} from '../runtimeGrant0200Apply';
import { RUNTIME_GRANT_0200_TABLES, runtimeGrant0200Plan } from '../runtimeGrant0200Plan';
import { normalizedDesiredSchema } from '../schemaCongruency';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';

const SECRET = 'S3cr3t-Passw0rd';
const GOOD_URL = `mysql://admin:${SECRET}@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database`;
const plan = runtimeGrant0200ApplyPlan();

const expectedGrants = [
  "GRANT SELECT, INSERT, UPDATE, DELETE ON `propertylistify_database`.`service_provider_projects` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`service_provider_credentials` TO 'propertylistify_app_runtime'@'%'",
];

const baseline = [
  'GRANT USAGE ON *.* TO `propertylistify_app_runtime`@`%`',
  'GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`users` TO `propertylistify_app_runtime`@`%`',
];
const asObserved = (privileges: readonly string[]) => {
  const byScope = new Map<string, string[]>();
  for (const entry of privileges) {
    const [scope, privilege] = entry.split(':');
    byScope.set(scope, [...(byScope.get(scope) ?? []), privilege]);
  }
  return [...byScope].map(
    ([scope, privs]) => `GRANT ${privs.join(', ')} ON ${scope} TO \`propertylistify_app_runtime\`@\`%\``,
  );
};
const plannedObserved = asObserved(plan.plannedPrivileges);

function fakeConnection(options: { before?: string[]; after?: string[]; endFails?: boolean } = {}) {
  const before = options.before ?? baseline;
  const after = options.after ?? [...baseline, ...plannedObserved];
  let shows = 0;
  return {
    query: vi.fn(async (statement: string) => {
      if (statement.startsWith('SHOW GRANTS')) {
        shows += 1;
        return [(shows === 1 ? before : after).map(grant => ({ grant })), []];
      }
      return [[], []];
    }),
    execute: vi.fn(async () => [[], []]),
    end: vi.fn(async () => {
      if (options.endFails) throw new Error(`driver text with ${GOOD_URL}`);
    }),
  };
}

const run = (
  connection: ReturnType<typeof fakeConnection>,
  mode: 'apply' | 'rollback' = 'apply',
  observe = vi.fn(),
) => executeRuntime0200GrantPlan(connection as any, plan, mode, async () => {}, observe);

function fixtureIdentity() {
  const root = mkdtempSync(join(tmpdir(), 'grant0200-'));
  const common = join(root, '.git-common');
  const worktree = join(root, 'wt');
  mkdirSync(common);
  mkdirSync(worktree);
  return deriveGitWorktreeIdentity({
    repositoryRoot: worktree,
    gitCommonDirectory: common,
    worktreePath: worktree,
    branch: 'feat/x',
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    upstream: 'origin/main',
    registered: true,
    clean: true,
  });
}

describe('0200 runtime grant plan', () => {
  it('pins the 0200 lineage and emits only the two new-table grants', () => {
    const source = runtimeGrant0200Plan();
    expect(source).toMatchObject({
      expectedHead: '0200_services_provider_credentials.sql',
      expectedMigrationCount: 201,
      manifestDigest: '19c5a60156f850cca36567ad47f00938d544070d89c309d870fd135289b0acc2',
      expectedTableCount: 227,
      expectedModelDigest: '4bf6f12700b27b86b5b38119223be245681a3c4ff1c1c1eccf555a65f49df23d',
      applyAuthority: 'none',
    });
    expect(RUNTIME_GRANT_0200_TABLES.map(t => t.table)).toEqual([
      'service_provider_projects',
      'service_provider_credentials',
    ]);
    expect(source.grants).toEqual(expectedGrants);
    expect(source.revokes.every(s => !s.includes('GRANT OPTION'))).toBe(true);
    expect(RUNTIME_GRANT_0200_TABLES.every(t => t.callSites.length > 0)).toBe(true);
    // Least privilege: credentials are never deleted via SQL.
    expect(source.grants[1]).not.toContain('DELETE');
  });

  it('emits exactly the reviewed GRANT statements and mirrored REVOKE statements', () => {
    expect(plan.statements).toEqual(expectedGrants);
    expect(plan.rollbackStatements).toEqual(
      expectedGrants.map(s => s.replace(/^GRANT /, 'REVOKE ').replace(' TO ', ' FROM ')),
    );
    for (const statement of [...plan.statements, ...plan.rollbackStatements]) {
      expect(statement).not.toMatch(/GRANT OPTION|\*|ALL PRIVILEGES|@'(?!%')/);
    }
    expect(plan.planDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(runtimeGrant0200Acknowledgement('apply', plan.planDigest)).toBe(
      `CONFIRM_RUNTIME_GRANT_0200_APPLY_${plan.planDigest.slice(0, 16)}`,
    );
  });

  it('is bound to the model digest produced by the drizzle schema', () => {
    expect(normalizedDesiredSchema(schema).digest).toBe(plan.expectedModelDigest);
  });
});

describe('0200 runtime grant refusals', () => {
  const base = { adminDatabaseUrl: GOOD_URL, observe: vi.fn() };
  const goodAck = runtimeGrant0200Acknowledgement('apply', plan.planDigest);

  it('refuses a wrong plan digest, wrong acknowledgement and wrong host before connecting', async () => {
    await expect(
      applyRuntimeGrant0200({ ...base, mode: 'apply', planDigest: 'x', acknowledgement: goodAck }),
    ).rejects.toThrow('exact plan digest');
    await expect(
      applyRuntimeGrant0200({
        ...base,
        mode: 'apply',
        planDigest: plan.planDigest,
        acknowledgement: runtimeGrant0200Acknowledgement('rollback', plan.planDigest),
      }),
    ).rejects.toThrow('exact acknowledgement');
    const wrongHost = applyRuntimeGrant0200({
      ...base,
      adminDatabaseUrl: `mysql://admin:${SECRET}@evil.example.com:3306/propertylistify_database`,
      mode: 'apply',
      planDigest: plan.planDigest,
      acknowledgement: goodAck,
    });
    await expect(wrongHost).rejects.toThrow('admin host');
    await wrongHost.catch(error => expect(String(error.message)).not.toContain(SECRET));
  });

  it('policy allows only production with the bootstrap-admin credential class', () => {
    const rule = loadDatabaseOperationPolicy().operations['runtime-0200-grant'];
    expect(rule.allowedTargetClasses).toEqual(['production']);
    expect(rule.credentialClasses).toEqual(['bootstrap-admin']);
    expect(rule.approval).toBe('protected-target');
  });

  it('authorization refuses wrong credential class, non-production target and missing approval', () => {
    const identity = fixtureIdentity();
    const resolveFor = (url: string, credentialClass: any, env: Record<string, string>) =>
      resolveDatabaseAuthority({
        operation: 'runtime-0200-grant',
        cwd: identity.worktreePath,
        gitIdentity: identity,
        explicitDatabaseUrl: url,
        credentialClass,
        processEnv: env,
      });
    const prod = { NODE_ENV: 'production', APP_ENV: 'production' };
    const authority = resolveFor(GOOD_URL, 'bootstrap-admin', prod);
    const approval = {
      reference: 'T',
      actor: 'a',
      operation: 'runtime-0200-grant' as const,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      credentialClass: 'bootstrap-admin' as const,
      runtimeIdentity: 'propertylistify_app_runtime',
    };
    const input = {
      root: process.cwd(),
      approval,
      acknowledgement: 'CONFIRM_RUNTIME_0200_GRANT_' + authority.context.targetFingerprintHash.slice(0, 16),
    };
    expect(() => authorizeDatabaseOperation(authority, input)).not.toThrow();
    expect(() => authorizeDatabaseOperation(authority, { ...input, approval: undefined })).toThrow();
    expect(() =>
      authorizeDatabaseOperation(authority, {
        ...input,
        approval: { ...approval, runtimeIdentity: 'propertylistify_job_worker' },
      }),
    ).toThrow('exact 0200 runtime grant approval');
    expect(() =>
      authorizeDatabaseOperation(
        resolveFor('mysql://u:p@127.0.0.1:3307/listify_local', 'bootstrap-admin', {
          NODE_ENV: 'development',
          APP_ENV: 'development',
        }),
        input,
      ),
    ).toThrow();
  });
});

describe('0200 runtime grant execution and reconciliation', () => {
  it('executes the 2 statements and reports digests and added privileges only', async () => {
    const connection = fakeConnection();
    const observe = vi.fn();
    const result = await run(connection, 'apply', observe);
    expect(connection.execute.mock.calls.map(call => call[0])).toEqual(expectedGrants);
    expect(result).toMatchObject({
      mode: 'apply',
      statementsExecuted: 2,
      outcome: 'complete',
      connectionClosed: true,
      removedPrivileges: [],
    });
    expect(result.addedPrivileges).toEqual(plan.plannedPrivileges);
    expect(result.afterGrantDigest).not.toBe(result.beforeGrantDigest);
    expect(JSON.stringify(result)).not.toContain(SECRET);
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('rollback executes the mirrored REVOKE statements and reconciles back to baseline', async () => {
    const connection = fakeConnection({ before: [...baseline, ...plannedObserved], after: baseline });
    const result = await run(connection, 'rollback');
    expect(connection.execute.mock.calls.map(call => call[0])).toEqual(plan.rollbackStatements);
    expect(result).toMatchObject({ mode: 'rollback', statementsExecuted: 2, addedPrivileges: [] });
    expect(result.removedPrivileges).toEqual(plan.plannedPrivileges);
  });

  it('fails when the after state has an extra or missing privilege', async () => {
    const extra = fakeConnection({
      after: [
        ...baseline,
        ...plannedObserved,
        'GRANT DELETE ON `propertylistify_database`.`users` TO `propertylistify_app_runtime`@`%`',
      ],
    });
    await expect(run(extra)).rejects.toMatchObject({
      failureStage: 'verify-resulting-grants',
      safeToReplay: false,
    });
    const missing = fakeConnection({ after: [...baseline, ...plannedObserved.slice(1)] });
    await expect(run(missing)).rejects.toMatchObject({ failureStage: 'verify-resulting-grants' });
  });

  it('refuses to apply when a planned privilege already exists', () => {
    expect(() =>
      reconcileRuntime0200Grants(
        [...baseline, plannedObserved[0]],
        [...baseline, ...plannedObserved],
        plan.plannedPrivileges,
        'apply',
      ),
    ).toThrow('already exist');
  });

  it('replay and incomplete rollback refuse before any execute and release the lock', async () => {
    for (const [mode, before] of [
      ['apply', [...baseline, ...plannedObserved]],
      ['rollback', [...baseline, ...plannedObserved.slice(1)]],
    ] as const) {
      const connection = fakeConnection({ before });
      const observe = vi.fn();
      const releaseLock = vi.fn(async () => {});
      await expect(
        executeRuntime0200GrantPlan(connection as any, plan, mode, async () => {}, observe, releaseLock),
      ).rejects.toMatchObject({ failureStage: 'verify-prior-grants', safeToReplay: false });
      expect(connection.execute).not.toHaveBeenCalled();
      expect(observe).not.toHaveBeenCalled();
      expect(releaseLock).toHaveBeenCalledOnce();
    }
  });

  it('fails closed on unsupported grant syntax (grant option, other account, role)', () => {
    for (const bad of [
      'GRANT SELECT ON `propertylistify_database`.`users` TO `propertylistify_app_runtime`@`%` WITH GRANT OPTION',
      'GRANT SELECT ON `propertylistify_database`.`users` TO `someone_else`@`%`',
      'GRANT `role`@`%` TO `propertylistify_app_runtime`@`%`',
    ]) {
      expect(() => parseRuntime0200Grants([bad])).toThrow('unsupported statement');
    }
  });

  it('rejects a modified execution plan before any query or statement', async () => {
    const connection = fakeConnection();
    const tampered = { ...plan, statements: [...plan.statements, 'GRANT ALL ON *.* TO x'] };
    await expect(
      executeRuntime0200GrantPlan(connection as any, tampered as any, 'apply', async () => {}, vi.fn()),
    ).rejects.toMatchObject({ failureStage: 'validate-plan' });
    expect(connection.query).not.toHaveBeenCalled();
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it('never leaks the URL or secret from a failing driver into the thrown failure message', async () => {
    const error = await run(fakeConnection({ endFails: true })).catch(e => e);
    expect(error).toBeInstanceOf(Runtime0200GrantFailure);
    expect(error.failureStage).toBe('cleanup');
    expect(error.message).not.toContain(SECRET);
    expect(error.message).not.toContain('mysql://');
  });
});
