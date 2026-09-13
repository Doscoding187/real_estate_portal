import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { authorizeDatabaseOperation } from '../server/_core/databaseAuthority/authorization';
import {
  createAuthorityRuntimePool,
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import {
  buildIsolatedCiGrantPlan,
  ISOLATED_CI_ROLE_USERS,
} from '../server/_core/databaseAuthority/isolatedCiCredentials';
import type { DatabaseOperation } from '../server/_core/databaseAuthority/types';

function denied(error: unknown): boolean {
  const candidate = error as { errno?: unknown; code?: unknown; message?: unknown };
  const errno = Number(candidate?.errno);
  return (
    [1044, 1045, 1142, 1227, 1370].includes(errno) &&
    /(denied|access|privilege)/i.test(String(candidate?.message ?? candidate?.code ?? ''))
  );
}

async function assertDenied(connection: AuthoritySqlConnection, statement: string): Promise<void> {
  try {
    await connection.execute(statement);
  } catch (error) {
    if (denied(error)) return;
    throw new Error('Isolated CI credential verification received a non-permission failure.');
  }
  throw new Error(
    'Isolated CI credential verification unexpectedly permitted a forbidden operation.',
  );
}

async function currentUser(connection: AuthoritySqlConnection, expected: string): Promise<void> {
  const result: any = await connection.execute(
    'SELECT CURRENT_USER() AS authenticated_user',
  );
  const rows = Array.isArray(result?.[0]) ? result[0] : [];
  if (
    !String(rows[0]?.authenticated_user ?? '')
      .toLowerCase()
      .startsWith(`${expected}@`)
  ) {
    throw new Error('Isolated CI credential verification resolved the wrong physical identity.');
  }
}

async function grantsFingerprint(connection: AuthoritySqlConnection): Promise<string> {
  // MySQL supports SHOW GRANTS without a subject for the authenticated user;
  // `FOR CURRENT_USER()` is not valid syntax on MySQL 8.4.
  const result: any = await connection.query('SHOW GRANTS');
  const rows = Array.isArray(result?.[0]) ? result[0] : [];
  const values = rows
    .flatMap((row: Record<string, unknown>) => Object.values(row).map(value => String(value)))
    .sort();
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
}

async function mysqlRuntimeVersion(
  connection: AuthoritySqlConnection,
): Promise<{ version: string; comment: string }> {
  const result: any = await connection.query(
    'SELECT VERSION() AS version, @@version_comment AS version_comment',
  );
  const row = Array.isArray(result?.[0]) ? result[0][0] : undefined;
  const version = String(row?.version ?? '').trim();
  const comment = String(row?.version_comment ?? '').trim();
  if (!version || version.length > 128 || /[\r\n]/.test(version + comment)) {
    throw new Error('Isolated CI credential verification received an invalid MySQL version.');
  }
  return { version, comment: comment.slice(0, 128) };
}

async function authorityConnection(operation: DatabaseOperation) {
  const authority = resolveDatabaseAuthority({ operation });
  const decision = authorizeDatabaseOperation(authority);
  return { authority, connection: await createAuthoritySqlConnection(authority, decision) };
}

async function main(): Promise<void> {
  if (process.env.CI !== 'true' || process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Isolated CI credential verification refused: GitHub Actions CI is required.');
  }
  if (process.env.DATABASE_BOOTSTRAP_URL) {
    throw new Error(
      'Isolated CI credential verification refused: bootstrap credential leaked beyond provisioning.',
    );
  }
  const plan = buildIsolatedCiGrantPlan();
  const observed: Record<string, string> = {};

  const runtimeAuthority = resolveDatabaseAuthority({ operation: 'runtime-connect' });
  const runtimeDecision = authorizeDatabaseOperation(runtimeAuthority);
  const runtimePool = await createAuthorityRuntimePool(runtimeAuthority, runtimeDecision);
  try {
    const runtimeConnection: AuthoritySqlConnection = {
      execute: (statement, values) => runtimePool.pool.execute(statement, values as any),
      query: (statement, values) => runtimePool.pool.query(statement, values as any),
      end: () => runtimePool.end(),
    };
    await currentUser(runtimeConnection, ISOLATED_CI_ROLE_USERS.runtime);
    await runtimeConnection.execute('SELECT 1 FROM `users` LIMIT 1');
    await runtimeConnection.execute('UPDATE `users` SET `id` = `id` WHERE 1 = 0');
    await assertDenied(
      runtimeConnection,
      'UPDATE `sql_migration_history` SET `duration_ms` = `duration_ms` WHERE 1 = 0',
    );
    await assertDenied(runtimeConnection, 'CREATE TABLE `ci_forbidden_runtime_ddl` (`id` INT)');
    observed.runtime = await grantsFingerprint(runtimeConnection);
  } finally {
    await runtimePool.end();
  }

  const worker = await authorityConnection('worker-connect');
  try {
    await currentUser(worker.connection, ISOLATED_CI_ROLE_USERS.worker);
    await worker.connection.execute('SELECT 1 FROM `lead_deliveries` LIMIT 1');
    await worker.connection.execute('UPDATE `lead_delivery_attempts` SET `id` = `id` WHERE 1 = 0');
    await assertDenied(
      worker.connection,
      'UPDATE `sql_migration_attempts` SET `completed_statement_count` = `completed_statement_count` WHERE 1 = 0',
    );
    await assertDenied(worker.connection, 'CREATE TABLE `ci_forbidden_worker_ddl` (`id` INT)');
    observed.worker = await grantsFingerprint(worker.connection);
  } finally {
    await worker.connection.end();
  }

  const verifier = await authorityConnection('verification');
  let runtimeVersion: { version: string; comment: string };
  try {
    await currentUser(verifier.connection, ISOLATED_CI_ROLE_USERS['read-only']);
    runtimeVersion = await mysqlRuntimeVersion(verifier.connection);
    await verifier.connection.execute(
      'SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = DATABASE()',
    );
    await assertDenied(verifier.connection, 'UPDATE `users` SET `id` = `id` WHERE 1 = 0');
    await assertDenied(verifier.connection, 'CREATE TABLE `ci_forbidden_verifier_ddl` (`id` INT)');
    observed.verifier = await grantsFingerprint(verifier.connection);
  } finally {
    await verifier.connection.end();
  }

  const migration = await authorityConnection('migration-apply');
  try {
    await currentUser(migration.connection, ISOLATED_CI_ROLE_USERS.migration);
    await migration.connection.execute(
      'UPDATE `sql_migration_history` SET `duration_ms` = `duration_ms` WHERE 1 = 0',
    );
    await assertDenied(
      migration.connection,
      "GRANT SELECT ON `listify_test`.`users` TO 'listify_ci_verifier'@'%'",
    );
    const result: any = await migration.connection.query('SHOW GRANTS');
    const grants = JSON.stringify(result?.[0] ?? []).toUpperCase();
    if (grants.includes('GRANT OPTION') || grants.includes('CREATE USER')) {
      throw new Error('Isolated CI migration identity has an administrative grant.');
    }
    observed.migration = await grantsFingerprint(migration.connection);
  } finally {
    await migration.connection.end();
  }

  console.log(
    JSON.stringify({
      targetFingerprintHash: runtimeAuthority.context.targetFingerprintHash,
      mysqlServerVersion: runtimeVersion.version,
      mysqlServerVersionComment: runtimeVersion.comment,
      operationRoleBindings: {
        'runtime-connect': 'runtime',
        'worker-connect': 'worker',
        verification: 'read-only',
        'migration-apply': 'migration',
        'ci-identity-bootstrap': 'bootstrap-admin (provisioning step only)',
      },
      grantPlanFingerprints: plan.fingerprints,
      observedGrantFingerprints: observed,
      positiveOperations: [
        'application-dml',
        'worker-job-dml',
        'verifier-metadata-read',
        'migration-ledger-dml',
      ],
      negativeOperations: [
        'application-control-write-and-ddl',
        'worker-control-write-and-ddl',
        'verifier-write-and-ddl',
        'migration-grant-option',
      ],
      bootstrapCredentialPresent: Boolean(process.env.DATABASE_BOOTSTRAP_URL),
    }),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error(
      error instanceof Error ? error.message : 'Isolated CI identity verification failed.',
    );
    process.exit(1);
  });
}
