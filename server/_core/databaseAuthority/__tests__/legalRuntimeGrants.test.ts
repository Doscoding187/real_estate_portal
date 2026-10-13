import { describe, expect, it, vi } from 'vitest';
import * as schema from '../../../../drizzle/schema';
import { normalizedDesiredSchema } from '../schemaCongruency';
import {
  assertLegalRuntimeGrants,
  legalRuntimeGrantExecutionPlan,
  executeLegalRuntimeGrantPlan,
  LegalRuntimeGrantFailure,
  applyLegalRuntimeGrants,
} from '../legalRuntimeGrants';

const plan = legalRuntimeGrantExecutionPlan();
const asRows = (statements: readonly string[]) => [
  statements.map(statement => ({
    grant: statement.replace('`propertyImages`', '`propertyimages`'),
  })),
  [],
];
function fixture() {
  let reads = 0;
  const connection = {
    query: vi.fn(async () => asRows(reads++ === 0 ? plan.before : plan.after)),
    execute: vi.fn(async (_statement: string) => [[], []]),
    end: vi.fn(async () => {}),
  };
  const verify = vi.fn(async () => {});
  const observe = vi.fn();
  return { connection, verify, observe };
}

describe('canonical legal runtime grant release', () => {
  it('refuses a changed digest before resolving or connecting to the protected target', async () => {
    await expect(
      applyLegalRuntimeGrants({
        adminDatabaseUrl: 'not-a-credential',
        planDigest: 'changed',
        acknowledgement: 'unapproved',
        observe: vi.fn(),
      }),
    ).rejects.toThrow('exact plan digest');
  });

  it('refuses a different target before any protected connection', async () => {
    await expect(
      applyLegalRuntimeGrants({
        adminDatabaseUrl: 'mysql://synthetic:never-used@127.0.0.1:3307/unapproved',
        planDigest: plan.planDigest,
        acknowledgement: 'unapproved',
        observe: vi.fn(),
        processEnv: { APP_ENV: 'production', NODE_ENV: 'production' },
      }),
    ).rejects.toThrow('target or TLS binding changed');
  });

  it('pins the current model and extends only the three legal tables', () => {
    expect(normalizedDesiredSchema(schema).digest).toBe(plan.expectedModelDigest);
    expect(plan.before).toHaveLength(223);
    expect(plan.statements).toHaveLength(3);
    expect(plan.statements.join(' ')).not.toMatch(/UPDATE|DELETE|ALL|WITH GRANT/);
    expect(plan.statements.filter(statement => statement.includes('INSERT'))).toEqual([
      expect.stringContaining('`user_legal_acceptances`'),
    ]);
    expect(plan.expectedHead).toBe('0114_user_legal_acceptances.sql');
  });

  it.each([
    "GRANT SELECT ON `propertylistify_database`.* TO 'propertylistify_app_runtime'@'%'",
    "GRANT DELETE ON `propertylistify_database`.`legal_releases` TO 'propertylistify_app_runtime'@'%'",
    "GRANT SELECT ON `propertylistify_database`.`legal_releases` TO 'propertylistify_job_worker'@'%'",
    "GRANT SELECT ON `propertylistify_database`.`legal_releases` TO 'propertylistify_app_runtime'@'%' WITH GRANT OPTION",
  ])('rejects unexpected observed authority: %s', extra => {
    expect(() => assertLegalRuntimeGrants([...plan.before, extra], plan.before)).toThrow();
  });

  it('verifies before/after grants and closes the connection before returning success', async () => {
    const { connection, verify, observe } = fixture();
    const result = await executeLegalRuntimeGrantPlan(connection, plan, verify, observe);
    expect(connection.execute.mock.calls.map(call => call[0])).toEqual(plan.statements);
    expect(verify).toHaveBeenCalledOnce();
    expect(connection.end).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      outcome: 'complete',
      completedStatements: 3,
      connectionClosed: true,
    });
    expect(observe.mock.calls[1][0]).toMatchObject({
      outcome: 'unknown',
      completedStatements: 0,
      activeStatement: 0,
    });
  });

  it('refuses a modified execution plan before any query or GRANT', async () => {
    const { connection, verify, observe } = fixture();
    await expect(
      executeLegalRuntimeGrantPlan(
        connection,
        { ...plan, statements: ["GRANT ALL ON *.* TO 'propertylistify_app_runtime'@'%'"] },
        verify,
        observe,
      ),
    ).rejects.toBeInstanceOf(LegalRuntimeGrantFailure);
    expect(connection.query).not.toHaveBeenCalled();
    expect(connection.execute).not.toHaveBeenCalled();
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('retains the fixed plan if a callback mutates the caller-owned plan after validation', async () => {
    const { connection, verify, observe } = fixture();
    const callerPlan = legalRuntimeGrantExecutionPlan();
    observe.mockImplementationOnce(() => {
      callerPlan.statements.splice(
        0,
        callerPlan.statements.length,
        "GRANT ALL ON *.* TO 'propertylistify_app_runtime'@'%'",
      );
      callerPlan.planDigest = 'changed-after-validation';
    });
    const result = await executeLegalRuntimeGrantPlan(connection, callerPlan, verify, observe);
    expect(connection.execute.mock.calls.map(call => call[0])).toEqual(plan.statements);
    expect(result.planDigest).toBe(plan.planDigest);
  });

  it('fails closed on a physical verification failure', async () => {
    const { connection, verify, observe } = fixture();
    const primary = new Error('physical verification failed');
    verify.mockRejectedValueOnce(primary);
    await expect(
      executeLegalRuntimeGrantPlan(connection, plan, verify, observe),
    ).rejects.toMatchObject({
      primaryFailure: primary,
      failureStage: 'verify-physical',
      progress: { outcome: 'not-started' },
    });
    expect(connection.execute).not.toHaveBeenCalled();
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('refuses partial or broadened prior grants before mutation', async () => {
    const { connection, verify, observe } = fixture();
    connection.query.mockResolvedValueOnce(asRows(plan.after));
    await expect(
      executeLegalRuntimeGrantPlan(connection, plan, verify, observe),
    ).rejects.toBeInstanceOf(LegalRuntimeGrantFailure);
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it('refuses dispatch when the durable intent observer fails', async () => {
    const { connection, verify, observe } = fixture();
    observe.mockImplementation(() => {
      throw new Error('receipt failed');
    });
    await expect(
      executeLegalRuntimeGrantPlan(connection, plan, verify, observe),
    ).rejects.toMatchObject({ progress: { outcome: 'not-started' } });
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it('preserves an ambiguous statement failure, never retries and still closes', async () => {
    const { connection, verify, observe } = fixture();
    const primary = new Error('acknowledgement lost');
    connection.execute.mockRejectedValueOnce(primary);
    await expect(
      executeLegalRuntimeGrantPlan(connection, plan, verify, observe),
    ).rejects.toMatchObject({
      primaryFailure: primary,
      safeToReplay: false,
      failureStage: 'grant-dispatch',
      progress: { completedStatements: 0, activeStatement: 0, outcome: 'unknown' },
    });
    expect(connection.execute).toHaveBeenCalledOnce();
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('does not report success when grants complete but verification fails', async () => {
    const { connection, verify, observe } = fixture();
    connection.query
      .mockResolvedValueOnce(asRows(plan.before))
      .mockResolvedValueOnce(asRows(plan.before));
    await expect(
      executeLegalRuntimeGrantPlan(connection, plan, verify, observe),
    ).rejects.toMatchObject({
      progress: { outcome: 'complete', completedStatements: 3 },
      safeToReplay: false,
    });
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('keeps the primary failure when both lock release and connection close fail', async () => {
    const { connection, verify, observe } = fixture();
    const primary = new Error('physical failure');
    const lockError = new Error('release failed');
    const closeError = new Error('close failed');
    verify.mockRejectedValueOnce(primary);
    connection.end.mockRejectedValueOnce(closeError);
    await expect(
      executeLegalRuntimeGrantPlan(connection, plan, verify, observe, async () => {
        throw lockError;
      }),
    ).rejects.toMatchObject({
      primaryFailure: primary,
      cleanupFailures: [lockError, closeError],
      safeToReplay: false,
    });
    expect(connection.end).toHaveBeenCalledOnce();
  });

  it('does not imply safe replay after cleanup fails following completed grants', async () => {
    const { connection, verify, observe } = fixture();
    connection.end.mockRejectedValueOnce(new Error('close failed'));
    await expect(
      executeLegalRuntimeGrantPlan(connection, plan, verify, observe),
    ).rejects.toMatchObject({ progress: { outcome: 'complete' }, safeToReplay: false });
  });
});
