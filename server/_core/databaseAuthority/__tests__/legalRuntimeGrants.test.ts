import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { authorizeDatabaseOperation, loadDatabaseOperationPolicy } from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import {
  applyLegalRuntimeGrants,
  executeLegalRuntimeGrantPlan,
  legalRuntimeGrantAcknowledgement,
  legalRuntimeGrantExecutionPlan,
  LegalRuntimeGrantFailure,
  parseLegalRuntimeGrants,
  reconcileLegalRuntimeGrants,
  resolveLegalGrantOperatorInputs,
} from '../legalRuntimeGrants';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';

const SECRET = 'S3cr3t-Passw0rd';
const GOOD_URL = `mysql://admin:${SECRET}@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database`;
const DB = 'propertylistify_database';
const plan = legalRuntimeGrantExecutionPlan();

const expectedGrants = [
  "GRANT SELECT ON `propertylistify_database`.`legal_releases` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT ON `propertylistify_database`.`legal_active_release` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT ON `propertylistify_database`.`user_legal_acceptances` TO 'propertylistify_app_runtime'@'%'",
];

// Production-like baseline: USAGE, 0197 grants, leftovers on dropped tables.
const baseline = [
  'GRANT USAGE ON *.* TO `propertylistify_app_runtime`@`%`',
  'GRANT SELECT, INSERT, UPDATE, DELETE ON `propertylistify_database`.`users` TO `propertylistify_app_runtime`@`%`',
  'GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`development_place_assignments` TO `propertylistify_app_runtime`@`%`',
  'GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`service_provider_review_reports` TO `propertylistify_app_runtime`@`%`',
  'GRANT SELECT, INSERT, UPDATE, DELETE ON `propertylistify_database`.`propertyimages` TO `propertylistify_app_runtime`@`%`',
  'GRANT SELECT ON `propertylistify_database`.`dropped_table_one` TO `propertylistify_app_runtime`@`%`',
  'GRANT SELECT, INSERT ON `propertylistify_database`.`dropped_table_two` TO `propertylistify_app_runtime`@`%`',
];
const plannedObserved = [
  'GRANT SELECT ON `propertylistify_database`.`legal_active_release` TO `propertylistify_app_runtime`@`%`',
  'GRANT SELECT ON `propertylistify_database`.`legal_releases` TO `propertylistify_app_runtime`@`%`',
  'GRANT SELECT, INSERT ON `propertylistify_database`.`user_legal_acceptances` TO `propertylistify_app_runtime`@`%`',
];

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
) => executeLegalRuntimeGrantPlan(connection as any, plan, mode, async () => {}, observe);

function fixtureIdentity() {
  const root = mkdtempSync(join(tmpdir(), 'legalgrant-'));
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

describe('legal runtime grant plan', () => {
  it('emits exactly 3 GRANT and 3 mirrored REVOKE statements and the pinned acknowledgements', () => {
    expect(plan.statements).toEqual(expectedGrants);
    expect(plan.rollbackStatements).toEqual(
      expectedGrants.map(s => s.replace(/^GRANT /, 'REVOKE ').replace(' TO ', ' FROM ')),
    );
    expect(legalRuntimeGrantAcknowledgement('apply', plan.planDigest)).toBe(
      `CONFIRM_RUNTIME_LEGAL_GRANT_APPLY_${plan.planDigest.slice(0, 16)}`,
    );
    expect(legalRuntimeGrantAcknowledgement('rollback', plan.planDigest)).toBe(
      `CONFIRM_RUNTIME_LEGAL_GRANT_ROLLBACK_${plan.planDigest.slice(0, 16)}`,
    );
  });
});

describe('legal runtime grant refusals', () => {
  const base = { adminDatabaseUrl: GOOD_URL, observe: vi.fn() };
  const goodAck = legalRuntimeGrantAcknowledgement('apply', plan.planDigest);

  it('refuses wrong digest, wrong ack, wrong host and bad URL before connecting, without leaking secrets', async () => {
    await expect(
      applyLegalRuntimeGrants({ ...base, mode: 'apply', planDigest: 'x', acknowledgement: goodAck }),
    ).rejects.toThrow('exact plan digest');
    await expect(
      applyLegalRuntimeGrants({
        ...base,
        mode: 'apply',
        planDigest: plan.planDigest,
        acknowledgement: legalRuntimeGrantAcknowledgement('rollback', plan.planDigest),
      }),
    ).rejects.toThrow('exact acknowledgement');
    const wrongHost = applyLegalRuntimeGrants({
      ...base,
      adminDatabaseUrl: `mysql://admin:${SECRET}@evil.example.com:3306/${DB}`,
      mode: 'apply',
      planDigest: plan.planDigest,
      acknowledgement: goodAck,
    });
    await expect(wrongHost).rejects.toThrow('admin host');
    await wrongHost.catch(error => expect(String(error.message)).not.toContain(SECRET));
    await expect(
      applyLegalRuntimeGrants({
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

  it('refuses an approval that is not bound to the plan digest', async () => {
    await expect(
      applyLegalRuntimeGrants({
        ...base,
        mode: 'apply',
        planDigest: plan.planDigest,
        acknowledgement: goodAck,
        processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
      }),
    ).rejects.toThrow();
  });

  it('policy allows only production with the bootstrap-admin credential class', () => {
    const rule = loadDatabaseOperationPolicy().operations['runtime-legal-grant'];
    expect(rule.allowedTargetClasses).toEqual(['production']);
    expect(rule.credentialClasses).toEqual(['bootstrap-admin']);
    expect(rule.approval).toBe('protected-target');
  });

  it('authorization refuses wrong credential class, non-production target and missing approval', () => {
    const identity = fixtureIdentity();
    const resolveFor = (url: string, credentialClass: any, env: Record<string, string>) =>
      resolveDatabaseAuthority({
        operation: 'runtime-legal-grant',
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
      operation: 'runtime-legal-grant' as const,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      credentialClass: 'bootstrap-admin' as const,
      runtimeIdentity: 'propertylistify_app_runtime',
      runtimePreviousGrantDigest:
        'cc6956ba9ba51dad7ceb3678f70658d46623adf66eedcc70a951aae602ae181d',
      runtimeGrantDigest: plan.planDigest,
    };
    const acknowledgement = `CONFIRM_RUNTIME_LEGAL_GRANT_${authority.context.targetFingerprintHash.slice(0, 16)}`;
    const input = { root: process.cwd(), approval, acknowledgement };
    expect(() => authorizeDatabaseOperation(authority, input)).not.toThrow();
    expect(() => authorizeDatabaseOperation(authority, { ...input, approval: undefined })).toThrow();
    expect(() =>
      authorizeDatabaseOperation(authority, {
        ...input,
        approval: { ...approval, runtimeGrantDigest: 'different' },
      }),
    ).toThrow('exact legal runtime grant approval');
    expect(() =>
      authorizeDatabaseOperation(resolveFor(GOOD_URL, 'migration', prod), input),
    ).toThrow();
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

describe('operator inputs (no stdin)', () => {
  it('accepts flags or env, refuses disagreement and absence', () => {
    expect(
      resolveLegalGrantOperatorInputs(['--plan-digest', 'd', '--ack', 'a'], {}),
    ).toEqual({ planDigest: 'd', acknowledgement: 'a' });
    expect(
      resolveLegalGrantOperatorInputs([], {
        LEGAL_RUNTIME_GRANT_PLAN_DIGEST: 'd',
        LEGAL_RUNTIME_GRANT_ACK: 'a',
      }),
    ).toEqual({ planDigest: 'd', acknowledgement: 'a' });
    expect(
      resolveLegalGrantOperatorInputs(['--plan-digest', 'd', '--ack', 'a'], {
        LEGAL_RUNTIME_GRANT_PLAN_DIGEST: 'd',
        LEGAL_RUNTIME_GRANT_ACK: 'a',
      }),
    ).toEqual({ planDigest: 'd', acknowledgement: 'a' });
    expect(() =>
      resolveLegalGrantOperatorInputs(['--plan-digest', 'd', '--ack', 'a'], {
        LEGAL_RUNTIME_GRANT_PLAN_DIGEST: 'other',
      }),
    ).toThrow('disagree');
    expect(
      resolveLegalGrantOperatorInputs(['--plan-digest', ' d ', '--ack', 'a'], {}),
    ).toEqual({ planDigest: 'd', acknowledgement: 'a' });
    for (const bad of ['', '   ', 'undefined', 'null']) {
      expect(() => resolveLegalGrantOperatorInputs(['--plan-digest', bad, '--ack', 'a'], {})).toThrow(
        'Invalid value',
      );
      expect(() =>
        resolveLegalGrantOperatorInputs(['--ack', 'a'], { LEGAL_RUNTIME_GRANT_PLAN_DIGEST: bad }),
      ).toThrow('Invalid value');
    }
    expect(() =>
      resolveLegalGrantOperatorInputs(['--plan-digest', 'd', '--plan-digest', 'd', '--ack', 'a'], {}),
    ).toThrow('Duplicated flag');
    expect(() => resolveLegalGrantOperatorInputs(['--ack', 'a'], {})).toThrow('--plan-digest');
    expect(() =>
      resolveLegalGrantOperatorInputs([], { LEGAL_RUNTIME_GRANT_PLAN_DIGEST: 'd' }),
    ).toThrow('--ack');
  });
});

describe('legal runtime grant execution and reconciliation', () => {
  it('reconciles a production-like baseline (USAGE, 0197 grants, dropped-table leftovers) with exactly the 3 GRANTs', async () => {
    const connection = fakeConnection();
    const observe = vi.fn();
    const result = await run(connection, 'apply', observe);
    expect(connection.execute.mock.calls.map(call => call[0])).toEqual(expectedGrants);
    expect(result).toMatchObject({
      mode: 'apply',
      statementsExecuted: 3,
      outcome: 'complete',
      connectionClosed: true,
      removedPrivileges: [],
    });
    expect(result.addedPrivileges).toEqual(plan.plannedPrivileges);
    expect(result.afterGrantDigest).not.toBe(result.beforeGrantDigest);
    expect(JSON.stringify(result)).not.toContain(SECRET);
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('rollback executes the 3 mirrored REVOKEs and reconciles back to baseline', async () => {
    const connection = fakeConnection({ before: [...baseline, ...plannedObserved], after: baseline });
    const result = await run(connection, 'rollback');
    expect(connection.execute.mock.calls.map(call => call[0])).toEqual(plan.rollbackStatements);
    expect(result).toMatchObject({ mode: 'rollback', statementsExecuted: 3, addedPrivileges: [] });
    expect(result.removedPrivileges).toEqual(plan.plannedPrivileges);
  });

  it('refuses a replay when a planned privilege already exists, executing nothing', async () => {
    const connection = fakeConnection({
      before: [...baseline, plannedObserved[1]],
      after: [...baseline, ...plannedObserved],
    });
    const releaseLock = vi.fn(async () => {});
    const observe = vi.fn();
    await expect(
      executeLegalRuntimeGrantPlan(
        connection as any,
        plan,
        'apply',
        async () => {},
        observe,
        releaseLock,
      ),
    ).rejects.toMatchObject({ failureStage: 'verify-prior-grants', safeToReplay: false });
    expect(connection.execute).toHaveBeenCalledTimes(0);
    expect(observe).not.toHaveBeenCalled();
    expect(releaseLock).toHaveBeenCalledOnce();
    expect(connection.end).toHaveBeenCalledOnce();
    expect(() =>
      reconcileLegalRuntimeGrants(
        [...baseline, plannedObserved[0]],
        [...baseline, ...plannedObserved],
        plan.plannedPrivileges,
        'apply',
      ),
    ).toThrow('already exist');
  });

  it('refuses rollback with one planned privilege missing, executing nothing and releasing the lock', async () => {
    const connection = fakeConnection({
      before: [...baseline, ...plannedObserved.slice(1)],
      after: baseline,
    });
    const releaseLock = vi.fn(async () => {});
    await expect(
      executeLegalRuntimeGrantPlan(
        connection as any,
        plan,
        'rollback',
        async () => {},
        vi.fn(),
        releaseLock,
      ),
    ).rejects.toMatchObject({ failureStage: 'verify-prior-grants' });
    expect(connection.execute).toHaveBeenCalledTimes(0);
    expect(releaseLock).toHaveBeenCalledOnce();
  });

  it('refuses rollback when planned privileges are not all present', () => {
    expect(() =>
      reconcileLegalRuntimeGrants(baseline, baseline, plan.plannedPrivileges, 'rollback'),
    ).toThrow('not all present');
  });

  it('fails when the after state has an extra privilege', async () => {
    const connection = fakeConnection({
      after: [
        ...baseline,
        ...plannedObserved,
        'GRANT DELETE ON `propertylistify_database`.`legal_releases` TO `propertylistify_app_runtime`@`%`',
      ],
    });
    await expect(run(connection)).rejects.toMatchObject({
      failureStage: 'verify-resulting-grants',
      safeToReplay: false,
    });
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('fails when the after state is missing a planned privilege', async () => {
    const connection = fakeConnection({ after: [...baseline, ...plannedObserved.slice(1)] });
    await expect(run(connection)).rejects.toMatchObject({ failureStage: 'verify-resulting-grants' });
  });

  it('fails closed on unsupported SHOW GRANTS shapes before any statement runs', async () => {
    for (const bad of [
      'GRANT SELECT ON `propertylistify_database`.`users` TO `propertylistify_app_runtime`@`%` WITH GRANT OPTION',
      'GRANT SELECT ON `propertylistify_database`.`users` TO `someone_else`@`%`',
      'GRANT `role`@`%` TO `propertylistify_app_runtime`@`%`',
    ]) {
      expect(() => parseLegalRuntimeGrants([bad])).toThrow('unsupported statement');
      const connection = fakeConnection({ before: [...baseline, bad] });
      await expect(run(connection)).rejects.toMatchObject({ failureStage: 'verify-prior-grants' });
      expect(connection.execute).not.toHaveBeenCalled();
    }
  });

  it('rejects a modified execution plan before any query or statement', async () => {
    const connection = fakeConnection();
    const tampered = { ...plan, statements: [...plan.statements, 'GRANT ALL ON *.* TO x'] };
    await expect(
      executeLegalRuntimeGrantPlan(connection as any, tampered as any, 'apply', async () => {}, vi.fn()),
    ).rejects.toMatchObject({ failureStage: 'validate-plan', progress: { outcome: 'not-started' } });
    expect(connection.query).not.toHaveBeenCalled();
    expect(connection.execute).not.toHaveBeenCalled();
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('never leaks the URL or secret from a failing driver into the thrown failure message', async () => {
    const connection = fakeConnection({ endFails: true });
    const error = await run(connection).catch(e => e);
    expect(error).toBeInstanceOf(LegalRuntimeGrantFailure);
    expect(error.failureStage).toBe('cleanup');
    expect(error.message).not.toContain(SECRET);
    expect(error.message).not.toContain('mysql://');
    expect(JSON.stringify({ ...error.progress, stage: error.failureStage })).not.toContain(SECRET);
  });
});
