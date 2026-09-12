import { describe, expect, it } from 'vitest';
import {
  buildIsolatedCiGrantPlan,
  isIsolatedGitHubCiService,
  isolatedCiCredentialClassForOperation,
  selectIsolatedCiCredential,
} from '../isolatedCiCredentials';

describe('isolated CI physical credential boundary', () => {
  it('requires the GitHub Actions service marker in addition to CI=true', () => {
    const base = {
      runtimeMode: 'test',
      host: '127.0.0.1',
      port: '3306',
      databaseName: 'listify_test',
    };
    expect(isIsolatedGitHubCiService({ ...base, processEnv: { CI: 'true' } })).toBe(false);
    expect(
      isIsolatedGitHubCiService({
        ...base,
        processEnv: { CI: 'true', GITHUB_ACTIONS: 'true' },
      }),
    ).toBe(true);
  });

  it('builds explicit application and worker grants without control-table DML', () => {
    const plan = buildIsolatedCiGrantPlan();
    expect(plan.applicationTables).toHaveLength(212);
    expect(plan.statementsByCredential.runtime.every(statement => !statement.includes('.*'))).toBe(
      true,
    );
    expect(
      plan.statementsByCredential.runtime.every(statement => !statement.includes('sql_migration_')),
    ).toBe(true);
    expect(plan.statementsByCredential.migration[0]).toContain(
      'CREATE, ALTER, DROP, INDEX, REFERENCES',
    );
    expect(plan.workerTables).toEqual([
      'billing_provider_events',
      'catalogue_publishers',
      'lead_deliveries',
      'lead_delivery_attempts',
      'leads',
    ]);
  });

  it('binds a role to the operation and exact target identity', () => {
    expect(isolatedCiCredentialClassForOperation('worker-connect')).toBe('worker');
    const processEnv = {
      DATABASE_WORKER_URL: 'mysql://listify_ci_worker:worker-pass@127.0.0.1:3306/listify_test',
    };
    const selected = selectIsolatedCiCredential({
      operation: 'worker-connect',
      requestedClass: 'worker',
      processEnv,
      runtimeTarget: new URL('mysql://listify_ci_app:app-pass@127.0.0.1:3306/listify_test'),
    });
    expect(selected.source).toBe('isolated-ci-role-url');
    expect(selected.credentialUrl).toContain('listify_ci_worker');
    expect(() =>
      selectIsolatedCiCredential({
        operation: 'worker-connect',
        requestedClass: 'runtime',
        processEnv,
        runtimeTarget: new URL('mysql://listify_ci_app:app-pass@127.0.0.1:3306/listify_test'),
      }),
    ).toThrow('operation and credential role do not match');
  });
});
