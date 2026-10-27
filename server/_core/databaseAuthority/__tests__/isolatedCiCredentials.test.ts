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
    expect(plan.applicationTables).toHaveLength(239);
    expect(plan.applicationTables).toContain('development_place_assignments');
    expect(plan.applicationTables).toContain('distribution_referrer_search_assessments');
    expect(
      plan.statementsByCredential.runtime.filter(statement =>
        /legal_releases|legal_active_release|user_legal_acceptances/.test(statement),
      ),
    ).toEqual([
      "GRANT SELECT ON `listify_test`.`legal_active_release` TO 'listify_ci_app'@'%'",
      "GRANT SELECT ON `listify_test`.`legal_releases` TO 'listify_ci_app'@'%'",
      "GRANT SELECT, INSERT ON `listify_test`.`user_legal_acceptances` TO 'listify_ci_app'@'%'",
    ]);
    expect(plan.statementsByCredential.runtime.every(statement => !statement.includes('.*'))).toBe(
      true,
    );
    expect(
      plan.statementsByCredential.runtime.every(statement => !statement.includes('sql_migration_')),
    ).toBe(true);
    expect(plan.statementsByCredential.migration[0]).toContain(
      'CREATE, ALTER, DROP, INDEX, REFERENCES',
    );
    expect(plan.statementsByCredential.migration[1]).toBe(
      "GRANT SESSION_VARIABLES_ADMIN ON *.* TO 'listify_ci_migration'@'%'",
    );
    expect(plan.statementsByCredential.migration[2]).toBe(
      "GRANT CREATE TEMPORARY TABLES ON `listify_test`.* TO 'listify_ci_migration'@'%'",
    );
    expect(plan.statementsByCredential.runtime.join(' ')).not.toContain('SESSION_VARIABLES_ADMIN');
    expect(plan.statementsByCredential.worker.join(' ')).not.toContain('SESSION_VARIABLES_ADMIN');
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
    // The jobs that reach the isolated CI database are named, so a new job that
    // touches it has to be added here deliberately. Each named job provisions
    // its own migration identity and its own runtime identity.
    const BOOTSTRAP_JOBS = ['db-contract-verification', 'test', 'browser-journey'];
    for (const job of BOOTSTRAP_JOBS) {
      const block =
        workflow.match(new RegExp(`\\n  ${job}:[\\s\\S]*?(?=\\n  [a-z-]+:)`))?.[0] ?? '';
      expect(block, `${job} must provision its own migration identity`).toContain(
        '- name: Provision isolated CI migration identity',
      );
      expect(block, `${job} must provision its own runtime identity`).toContain(
        '- name: Provision isolated CI runtime identities',
      );
    }
    const bootstrapBlocks = workflow.match(
      /- name: Provision isolated CI migration identity[\s\S]*?run: pnpm db:ci:identities:bootstrap/g,
    );
    expect(bootstrapBlocks).toHaveLength(BOOTSTRAP_JOBS.length);
    const allBootstrapBlocks = workflow.match(
      /- name: Provision isolated CI (?:migration identity|runtime identities)[\s\S]*?run: pnpm db:ci:identities:bootstrap/g,
    );
    expect(allBootstrapBlocks).toHaveLength(BOOTSTRAP_JOBS.length * 2);
    for (const block of allBootstrapBlocks ?? []) {
      expect(block).toContain("DATABASE_URL: ''");
      expect(block).toContain("LISTIFY_E2E_DATABASE_URL: ''");
      expect(block).toContain('DATABASE_BOOTSTRAP_URL:');
    }
    expect(workflow).toContain('export DATABASE_URL="${DATABASE_MIGRATION_URL}"');
    expect(workflow).toContain('export DATABASE_URL="${DATABASE_VERIFIER_URL}"');
  });

  it('proves fresh authority before the admitted Place fixtures and dependent journeys', () => {
    const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
    const orderedSteps = [
      'Verify role and session authority before reviewer fixtures',
      'Verify founder identity authority before reviewer fixtures',
      'Prepare canonical disposable reference data',
      'Prepare admitted Place integration fixtures',
      'Verify admitted Place integration fixtures',
      'Require dependent admitted Place identities',
      'Prepare canonical disposable foundation data',
      'Prepare canonical disposable scenario data',
      'Run tests',
    ].map(name => workflow.indexOf(`- name: ${name}`));
    expect(orderedSteps.every(position => position >= 0)).toBe(true);
    expect(orderedSteps).toEqual([...orderedSteps].sort((left, right) => left - right));
    expect(workflow).toContain('pnpm db:places:prepare -- --territory=za-gp');
    expect(workflow).toContain('pnpm db:places:verify -- --territory=za-gp');
    expect(workflow).toContain('pnpm vitest run --project place-command');
  });
});
