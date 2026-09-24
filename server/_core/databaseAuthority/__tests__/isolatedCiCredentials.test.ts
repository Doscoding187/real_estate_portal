import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    expect(plan.applicationTables).toHaveLength(214);
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
      'billable_accounts',
      'billing_audit_events',
      'billing_invoices',
      'billing_provider_events',
      'catalogue_publishers',
      'developer_organisation_memberships',
      'invitations',
      'lead_deliveries',
      'lead_delivery_attempts',
      'leads',
      'notifications',
      'plans',
      'subscriptions',
      'transactional_email_attempts',
      'transactional_email_deliveries',
      'users',
    ]);
  });

  it('adds only SELECT on both migration ledgers for protected runtime readiness', () => {
    const baseline = buildIsolatedCiGrantPlan();
    const readiness = buildIsolatedCiGrantPlan({ runtimeLedgerRead: true });
    const added = readiness.statementsByCredential.runtime.filter(
      statement => !baseline.statementsByCredential.runtime.includes(statement),
    );
    expect(added).toEqual([
      "GRANT SELECT ON `listify_test`.`sql_migration_history` TO 'listify_ci_app'@'%'",
      "GRANT SELECT ON `listify_test`.`sql_migration_attempts` TO 'listify_ci_app'@'%'",
    ]);
    expect(readiness.statementsByCredential.worker).toEqual(baseline.statementsByCredential.worker);
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

  it('routes consumer-contract setup through migration and inspection through verifier', () => {
    expect(isolatedCiCredentialClassForOperation('reference-seed')).toBe('migration');
    expect(isolatedCiCredentialClassForOperation('foundation-seed')).toBe('migration');
    expect(isolatedCiCredentialClassForOperation('scenario-seed')).toBe('migration');
    expect(isolatedCiCredentialClassForOperation('verification')).toBe('read-only');
    expect(isolatedCiCredentialClassForOperation('runtime-connect')).toBe('runtime');
  });

  it('keeps CI role-bound steps explicit and bootstrap free of DATABASE_URL', () => {
    const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
    const bootstrapBlocks = workflow.match(
      /- name: Provision isolated CI migration identity[\s\S]*?run: pnpm db:ci:identities:bootstrap/g,
    );
    expect(bootstrapBlocks).toHaveLength(2);
    const allBootstrapBlocks = workflow.match(
      /- name: Provision isolated CI (?:migration identity|runtime identities)[\s\S]*?run: pnpm db:ci:identities:bootstrap/g,
    );
    expect(allBootstrapBlocks).toHaveLength(4);
    for (const block of allBootstrapBlocks ?? []) {
      expect(block).toContain("DATABASE_URL: ''");
      expect(block).toContain("LISTIFY_E2E_DATABASE_URL: ''");
      expect(block).toContain('DATABASE_BOOTSTRAP_URL:');
    }
    expect(workflow).toContain('export DATABASE_URL="${DATABASE_MIGRATION_URL}"');
    expect(workflow).toContain('export DATABASE_URL="${DATABASE_VERIFIER_URL}"');
  });
});
