import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DatabaseCredentialClass, DatabaseOperation } from './types';

/**
 * This channel exists only for the disposable GitHub Actions MySQL service.
 * It is deliberately stricter than the general disposable-test target so
 * setting CI=true against a developer service can never select CI privileges.
 */
export const ISOLATED_CI_DATABASE_NAME = 'listify_test';
export const ISOLATED_CI_HOST = '127.0.0.1';
export const ISOLATED_CI_PORT = '3306';

export const ISOLATED_CI_ROLE_USERS = {
  runtime: 'listify_ci_app',
  worker: 'listify_ci_worker',
  'read-only': 'listify_ci_verifier',
  migration: 'listify_ci_migration',
  'bootstrap-admin': 'root',
} as const satisfies Partial<Record<DatabaseCredentialClass, string>>;

export const ISOLATED_CI_ROLE_URL_ENV = {
  runtime: 'DATABASE_RUNTIME_URL',
  worker: 'DATABASE_WORKER_URL',
  'read-only': 'DATABASE_VERIFIER_URL',
  migration: 'DATABASE_MIGRATION_URL',
  'bootstrap-admin': 'DATABASE_BOOTSTRAP_URL',
} as const satisfies Partial<Record<DatabaseCredentialClass, string>>;

const OPERATION_CREDENTIALS: Partial<Record<DatabaseOperation, DatabaseCredentialClass>> = {
  'runtime-connect': 'runtime',
  'worker-connect': 'worker',
  'read-only-connect': 'read-only',
  'ci-identity-bootstrap': 'bootstrap-admin',
  'migration-plan': 'migration',
  'migration-apply': 'migration',
  // Seed/setup commands inspect the migration ledger before writing data.
  // Keep that control-table read on the migration identity; application
  // behavior remains bound to runtime-connect below.
  'reference-seed': 'migration',
  'foundation-seed': 'migration',
  'demo-seed': 'migration',
  'scenario-seed': 'migration',
  'test-fixture': 'migration',
  verification: 'read-only',
  'browser-verification': 'runtime',
  readiness: 'read-only',
  diagnostics: 'read-only',
};

export function isolatedCiCredentialClassForOperation(
  operation: DatabaseOperation,
): DatabaseCredentialClass | undefined {
  return OPERATION_CREDENTIALS[operation];
}

export function isIsolatedGitHubCiService(input: {
  runtimeMode: string;
  processEnv: NodeJS.ProcessEnv;
  host: string;
  port: string;
  databaseName: string;
}): boolean {
  return (
    input.runtimeMode === 'test' &&
    input.processEnv.CI === 'true' &&
    input.processEnv.GITHUB_ACTIONS === 'true' &&
    input.host === ISOLATED_CI_HOST &&
    input.port === ISOLATED_CI_PORT &&
    input.databaseName === ISOLATED_CI_DATABASE_NAME
  );
}

function canonicalUsername(url: URL): string {
  try {
    return decodeURIComponent(url.username).trim().toLowerCase();
  } catch {
    throw new Error('Isolated CI credential refused: username is invalid.');
  }
}

function targetFingerprint(url: URL): string {
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const port = url.port || '3306';
  const database = url.pathname.replace(/^\//, '');
  return `${url.protocol.replace(':', '')}://${host}:${port}/${database}`;
}

/** Select and validate a physical role URL only after the target is resolved. */
export function selectIsolatedCiCredential(input: {
  operation: DatabaseOperation;
  requestedClass: DatabaseCredentialClass;
  processEnv: NodeJS.ProcessEnv;
  runtimeTarget: URL;
}): { credentialUrl: string; source: 'isolated-ci-role-url' | 'isolated-ci-bootstrap-url' } {
  const expectedClass = isolatedCiCredentialClassForOperation(input.operation);
  if (!expectedClass || expectedClass !== input.requestedClass) {
    throw new Error('Isolated CI credential refused: operation and credential role do not match.');
  }
  const variable = ISOLATED_CI_ROLE_URL_ENV[expectedClass];
  const raw = variable ? String(input.processEnv[variable] ?? '').trim() : '';
  if (!raw) {
    throw new Error(`Isolated CI credential refused: ${variable} is required for this operation.`);
  }
  let selected: URL;
  try {
    selected = new URL(raw);
  } catch {
    throw new Error('Isolated CI credential refused: role credential is invalid.');
  }
  if (
    selected.protocol !== 'mysql:' ||
    targetFingerprint(selected) !== targetFingerprint(input.runtimeTarget) ||
    canonicalUsername(selected) !== ISOLATED_CI_ROLE_USERS[expectedClass] ||
    !selected.password
  ) {
    throw new Error(
      'Isolated CI credential refused: role credential must be a distinct, nonempty expected identity for the exact approved target.',
    );
  }
  return {
    credentialUrl: selected.toString(),
    source:
      expectedClass === 'bootstrap-admin' ? 'isolated-ci-bootstrap-url' : 'isolated-ci-role-url',
  };
}

function quotedIdentifier(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value))
    throw new Error('Isolated CI grant plan has an invalid identifier.');
  return `\`${value}\``;
}

function quotedAccount(value: string): string {
  if (!/^[a-z0-9_]+$/.test(value))
    throw new Error('Isolated CI grant plan has an invalid account name.');
  return `'${value}'@'%'`;
}

function fingerprint(statements: readonly string[]): string {
  return createHash('sha256')
    .update(JSON.stringify([...statements].sort()))
    .digest('hex');
}

export type IsolatedCiGrantPlan = {
  databaseName: string;
  applicationTables: readonly string[];
  workerTables: readonly string[];
  statementsByCredential: Readonly<
    Record<'runtime' | 'worker' | 'read-only' | 'migration', readonly string[]>
  >;
  fingerprints: Readonly<Record<'runtime' | 'worker' | 'read-only' | 'migration', string>>;
};

/**
 * Explicit per-table application grants deliberately exclude both migration
 * control tables. A database-wide application DML grant would defeat that
 * boundary, so only migration receives database-wide DDL/DML privileges.
 */
export function buildIsolatedCiGrantPlan(
  input: {
    root?: string;
    tables?: readonly string[];
    databaseName?: string;
    roleUsers?: { runtime: string; worker: string; 'read-only': string; migration: string };
    runtimeLedgerRead?: boolean;
  } = {},
): IsolatedCiGrantPlan {
  const root = input.root ?? process.cwd();
  const inventory = input.tables
    ? {
        tables: input.tables,
        excludedRunnerControlTables: ['sql_migration_history', 'sql_migration_attempts'],
      }
    : (JSON.parse(
        readFileSync(resolve(root, 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
      ) as { tables: string[]; excludedRunnerControlTables: string[] });
  const excluded = new Set(inventory.excludedRunnerControlTables);
  const applicationTables = [...inventory.tables].sort();
  if (
    applicationTables.length === 0 ||
    applicationTables.some(table => excluded.has(table)) ||
    new Set(applicationTables).size !== applicationTables.length
  ) {
    throw new Error(
      'Isolated CI grant plan refused: canonical application table inventory is invalid.',
    );
  }

  const databaseName = input.databaseName ?? ISOLATED_CI_DATABASE_NAME;
  const roleUsers = input.roleUsers ?? ISOLATED_CI_ROLE_USERS;
  const database = quotedIdentifier(databaseName);
  const runtime = applicationTables.map(
    table =>
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ${database}.${quotedIdentifier(table)} TO ${quotedAccount(roleUsers.runtime)}`,
  );
  if (input.runtimeLedgerRead) {
    runtime.push(
      `GRANT SELECT ON ${database}.\`sql_migration_history\` TO ${quotedAccount(roleUsers.runtime)}`,
      `GRANT SELECT ON ${database}.\`sql_migration_attempts\` TO ${quotedAccount(roleUsers.runtime)}`,
    );
  }
  const workerTables = [
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
  ] as const;
  const worker = [
    `GRANT SELECT ON ${database}.${quotedIdentifier('billable_accounts')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT ON ${database}.${quotedIdentifier('billing_audit_events')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT ON ${database}.${quotedIdentifier('billing_invoices')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT, UPDATE ON ${database}.${quotedIdentifier('billing_provider_events')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT ON ${database}.${quotedIdentifier('catalogue_publishers')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT ON ${database}.${quotedIdentifier('developer_organisation_memberships')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT ON ${database}.${quotedIdentifier('invitations')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT, UPDATE ON ${database}.${quotedIdentifier('lead_deliveries')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT, INSERT, UPDATE ON ${database}.${quotedIdentifier('lead_delivery_attempts')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT, UPDATE ON ${database}.${quotedIdentifier('leads')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT ON ${database}.${quotedIdentifier('notifications')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT ON ${database}.${quotedIdentifier('plans')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT ON ${database}.${quotedIdentifier('subscriptions')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT, INSERT, UPDATE ON ${database}.${quotedIdentifier('transactional_email_attempts')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT, INSERT, UPDATE ON ${database}.${quotedIdentifier('transactional_email_deliveries')} TO ${quotedAccount(roleUsers.worker)}`,
    `GRANT SELECT ON ${database}.${quotedIdentifier('users')} TO ${quotedAccount(roleUsers.worker)}`,
  ];
  const verifier = [
    `GRANT SELECT ON ${database}.* TO ${quotedAccount(roleUsers['read-only'])}`,
  ];
  const migration = [
    `GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON ${database}.* TO ${quotedAccount(roleUsers.migration)}`,
  ];
  if (
    databaseName === ISOLATED_CI_DATABASE_NAME &&
    roleUsers.migration === ISOLATED_CI_ROLE_USERS.migration
  ) {
    // The fresh-chain runner disables GIPK on its own session before DDL.
    // Keep this global dynamic grant on the exact disposable CI migrator.
    migration.push(
      `GRANT SESSION_VARIABLES_ADMIN ON *.* TO ${quotedAccount(roleUsers.migration)}`,
    );
  }
  const statementsByCredential = { runtime, worker, 'read-only': verifier, migration } as const;
  return {
    databaseName,
    applicationTables,
    workerTables,
    statementsByCredential,
    fingerprints: {
      runtime: fingerprint(runtime),
      worker: fingerprint(worker),
      'read-only': fingerprint(verifier),
      migration: fingerprint(migration),
    },
  };
}
