import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import * as schema from '../../../../drizzle/schema';
import { authorizeDatabaseOperation, loadDatabaseOperationPolicy } from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import {
  applyRuntimeGrant0197,
  executeRuntime0197GrantPlan,
  parseRuntime0197Grants,
  reconcileRuntime0197Grants,
  runtimeGrant0197Acknowledgement,
  runtimeGrant0197ApplyPlan,
  Runtime0197GrantFailure,
} from '../runtimeGrant0197Apply';
import { RUNTIME_GRANT_0197_TABLES } from '../runtimeGrant0197Plan';
import { normalizedDesiredSchema } from '../schemaCongruency';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';

const SECRET = 'S3cr3t-Passw0rd';
const GOOD_URL = `mysql://admin:${SECRET}@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database`;
const ACCOUNT = "'propertylistify_app_runtime'@'%'";
const DB = 'propertylistify_database';
const plan = runtimeGrant0197ApplyPlan();

const expectedGrants = [
  "GRANT SELECT ON `propertylistify_database`.`development_inventory_items` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`development_place_assignments` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT ON `propertylistify_database`.`development_team_contacts` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`distribution_deal_document_deliveries` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`distribution_listing_lead_queue` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT ON `propertylistify_database`.`distribution_listing_lead_queue_events` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, DELETE ON `propertylistify_database`.`distribution_prospect_check_fit_matches` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`distribution_prospect_check_fits` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT ON `propertylistify_database`.`distribution_referral_intake_events` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`distribution_referral_intake_evidence` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`distribution_referral_intake_policy_releases` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`distribution_referral_intake_sessions` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`distribution_referrer_search_assessments` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`distribution_selected_practitioners` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`service_provider_review_reports` TO 'propertylistify_app_runtime'@'%'",
];

// Existing direct grants on the account (unrelated to the 15-table delta).
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
) => executeRuntime0197GrantPlan(connection as any, plan, mode, async () => {}, observe);

function fixtureIdentity() {
  const root = mkdtempSync(join(tmpdir(), 'grant0197-'));
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

describe('0197 runtime grant apply plan', () => {
  it('emits exactly the 15 reviewed GRANT statements and mirrored REVOKE statements', () => {
    expect(plan.statements).toEqual(expectedGrants);
    expect(plan.statements).toHaveLength(RUNTIME_GRANT_0197_TABLES.length);
    expect(plan.rollbackStatements).toEqual(
      expectedGrants.map(statement =>
        statement.replace(/^GRANT /, 'REVOKE ').replace(' TO ', ' FROM '),
      ),
    );
    for (const statement of [...plan.statements, ...plan.rollbackStatements]) {
      expect(statement).not.toMatch(/GRANT OPTION|\*|ALL PRIVILEGES|@'(?!%')/);
      expect(statement).toContain(ACCOUNT);
      expect(statement).toContain(`\`${DB}\`.\``);
    }
    expect(plan.planDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(runtimeGrant0197ApplyPlan().planDigest).toBe(plan.planDigest);
    expect(runtimeGrant0197Acknowledgement('apply', plan.planDigest)).toBe(
      `CONFIRM_RUNTIME_GRANT_0197_APPLY_${plan.planDigest.slice(0, 16)}`,
    );
  });

  it('is bound to the model digest produced by the drizzle schema', () => {
    expect(normalizedDesiredSchema(schema).digest).toBe(plan.expectedModelDigest);
  });
});

describe('0197 runtime grant refusals', () => {
  const base = { adminDatabaseUrl: GOOD_URL, observe: vi.fn() };
  const goodAck = runtimeGrant0197Acknowledgement('apply', plan.planDigest);

  it('refuses a wrong plan digest, wrong acknowledgement and wrong host before connecting', async () => {
    await expect(
      applyRuntimeGrant0197({ ...base, mode: 'apply', planDigest: 'x', acknowledgement: goodAck }),
    ).rejects.toThrow('exact plan digest');
    await expect(
      applyRuntimeGrant0197({
        ...base,
        mode: 'apply',
        planDigest: plan.planDigest,
        acknowledgement: runtimeGrant0197Acknowledgement('rollback', plan.planDigest),
      }),
    ).rejects.toThrow('exact acknowledgement');
    const wrongHost = applyRuntimeGrant0197({
      ...base,
      adminDatabaseUrl: `mysql://admin:${SECRET}@evil.example.com:3306/${DB}`,
      mode: 'apply',
      planDigest: plan.planDigest,
      acknowledgement: goodAck,
    });
    await expect(wrongHost).rejects.toThrow('admin host');
    await wrongHost.catch(error => expect(String(error.message)).not.toContain(SECRET));
    await expect(
      applyRuntimeGrant0197({
        ...base,
        adminDatabaseUrl: `not a url ${SECRET}`,
        mode: 'apply',
        planDigest: plan.planDigest,
        acknowledgement: goodAck,
      }).catch(error => {
        expect(String(error.message)).not.toContain(SECRET);
        throw error;
      }),
    ).rejects.toThrow('not a valid URL');
  });

  it('policy allows only production with the bootstrap-admin credential class', () => {
    const rule = loadDatabaseOperationPolicy().operations['runtime-0197-grant'];
    expect(rule.allowedTargetClasses).toEqual(['production']);
    expect(rule.credentialClasses).toEqual(['bootstrap-admin']);
    expect(rule.approval).toBe('protected-target');
  });

  it('authorization refuses wrong credential class, non-production target and missing approval', () => {
    const identity = fixtureIdentity();
    const resolveFor = (url: string, credentialClass: any, env: Record<string, string>) =>
      resolveDatabaseAuthority({
        operation: 'runtime-0197-grant',
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
      operation: 'runtime-0197-grant' as const,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      credentialClass: 'bootstrap-admin' as const,
      runtimeIdentity: 'propertylistify_app_runtime',
    };
    const input = { root: process.cwd(), approval, acknowledgement: 'CONFIRM_RUNTIME_0197_GRANT_' + authority.context.targetFingerprintHash.slice(0, 16) };
    expect(() => authorizeDatabaseOperation(authority, input)).not.toThrow();
    expect(() => authorizeDatabaseOperation(authority, { ...input, approval: undefined })).toThrow();
    expect(() =>
      authorizeDatabaseOperation(authority, {
        ...input,
        approval: { ...approval, runtimeIdentity: 'propertylistify_job_worker' },
      }),
    ).toThrow('exact 0197 runtime grant approval');
    expect(() => resolveFor(GOOD_URL, 'migration', prod) && authorizeDatabaseOperation(resolveFor(GOOD_URL, 'migration', prod), input)).toThrow();
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

describe('0197 runtime grant execution and reconciliation', () => {
  it('executes the 15 statements and reports digests and added privileges only', async () => {
    const connection = fakeConnection();
    const observe = vi.fn();
    const result = await run(connection, 'apply', observe);
    expect(connection.execute.mock.calls.map(call => call[0])).toEqual(expectedGrants);
    expect(result).toMatchObject({
      mode: 'apply',
      statementsExecuted: 15,
      outcome: 'complete',
      connectionClosed: true,
      removedPrivileges: [],
    });
    expect(result.addedPrivileges).toEqual(plan.plannedPrivileges);
    expect(result.beforeGrantDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.afterGrantDigest).not.toBe(result.beforeGrantDigest);
    expect(JSON.stringify(result)).not.toContain(SECRET);
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('rollback executes the mirrored REVOKE statements and reconciles back to baseline', async () => {
    const connection = fakeConnection({ before: [...baseline, ...plannedObserved], after: baseline });
    const result = await run(connection, 'rollback');
    expect(connection.execute.mock.calls.map(call => call[0])).toEqual(plan.rollbackStatements);
    expect(result).toMatchObject({ mode: 'rollback', statementsExecuted: 15, addedPrivileges: [] });
    expect(result.removedPrivileges).toEqual(plan.plannedPrivileges);
  });

  it('fails when the after state has an extra privilege', async () => {
    const connection = fakeConnection({
      after: [
        ...baseline,
        ...plannedObserved,
        'GRANT DELETE ON `propertylistify_database`.`users` TO `propertylistify_app_runtime`@`%`',
      ],
    });
    await expect(run(connection)).rejects.toMatchObject({
      failureStage: 'verify-resulting-grants',
      safeToReplay: false,
    });
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('fails when the after state is missing a planned privilege', async () => {
    const connection = fakeConnection({
      after: [...baseline, ...plannedObserved.slice(1)],
    });
    await expect(run(connection)).rejects.toMatchObject({ failureStage: 'verify-resulting-grants' });
  });

  it('refuses to apply when a planned privilege already exists', () => {
    expect(() =>
      reconcileRuntime0197Grants(
        [...baseline, plannedObserved[0]],
        [...baseline, ...plannedObserved],
        plan.plannedPrivileges,
        'apply',
      ),
    ).toThrow('already exist');
  });

  it('fails closed on unsupported grant syntax (grant option, other account, role)', () => {
    for (const bad of [
      'GRANT SELECT ON `propertylistify_database`.`users` TO `propertylistify_app_runtime`@`%` WITH GRANT OPTION',
      'GRANT SELECT ON `propertylistify_database`.`users` TO `someone_else`@`%`',
      'GRANT `role`@`%` TO `propertylistify_app_runtime`@`%`',
    ]) {
      expect(() => parseRuntime0197Grants([bad])).toThrow('unsupported statement');
    }
  });

  it('rejects a modified execution plan before any query or statement', async () => {
    const connection = fakeConnection();
    const tampered = { ...plan, statements: [...plan.statements, 'GRANT ALL ON *.* TO x'] };
    await expect(
      executeRuntime0197GrantPlan(connection as any, tampered as any, 'apply', async () => {}, vi.fn()),
    ).rejects.toMatchObject({ failureStage: 'validate-plan' });
    expect(connection.query).not.toHaveBeenCalled();
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it('never leaks the URL or secret from a failing driver into the thrown failure message', async () => {
    const connection = fakeConnection({ endFails: true });
    const error = await run(connection).catch(e => e);
    expect(error).toBeInstanceOf(Runtime0197GrantFailure);
    expect(error.failureStage).toBe('cleanup');
    expect(error.message).not.toContain(SECRET);
    expect(error.message).not.toContain('mysql://');
    expect(JSON.stringify({ ...error.progress, stage: error.failureStage })).not.toContain(SECRET);
  });
});
