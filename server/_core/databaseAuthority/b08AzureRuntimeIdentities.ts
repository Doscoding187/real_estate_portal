import { randomBytes } from 'node:crypto';
import { closeSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { parse } from 'dotenv';
import {
  authorizeDatabaseOperation,
  B08_AZURE_TARGET_FINGERPRINT_HASH,
  B08_RUNTIME_GRANT_DIGEST,
  B08_RUNTIME_LEDGER_READ_GRANT_DIGEST,
  B08_RUNTIME_IDENTITY,
  B08_WORKER_GRANT_DIGEST,
  B08_WORKER_IDENTITY,
  expectedDatabaseAcknowledgement,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthorityRuntimePool, createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';
import { assertIsolatedCiGrants } from './isolatedCiGrantVerification';
import { buildIsolatedCiGrantPlan } from './isolatedCiCredentials';
import { verifyB08AzureEstablishment } from './b08AzurePostApplyVerification';

const directory = join(homedir(), '.config', 'property-listify');
const adminFile = join(directory, 'azure-db.env');
const roles = {
  runtime: { name: B08_RUNTIME_IDENTITY, file: join(directory, 'b08-runtime.env') },
  worker: { name: B08_WORKER_IDENTITY, file: join(directory, 'b08-worker.env') },
} as const;

function secureFile(path: string): string {
  const parent = lstatSync(dirname(path));
  const file = lstatSync(path);
  if (
    !parent.isDirectory() || (parent.mode & 0o777) !== 0o700 || parent.uid !== process.getuid?.() ||
    !file.isFile() || (file.mode & 0o777) !== 0o600 || file.uid !== process.getuid?.()
  ) throw new Error('B08 runtime identity refused: machine-local secret permissions are unsafe.');
  return readFileSync(path, 'utf8');
}

function credentialUrl(path: string): string {
  const url = parse(secureFile(path)).DATABASE_URL;
  if (!url) throw new Error('B08 runtime identity refused: credential is absent.');
  return url;
}

function plan(runtimeLedgerRead = false) {
  const result = buildIsolatedCiGrantPlan({
    databaseName: 'propertylistify_database',
    roleUsers: {
      runtime: B08_RUNTIME_IDENTITY,
      worker: B08_WORKER_IDENTITY,
      'read-only': 'propertylistify_b08_inspector',
      migration: 'propertylistify_release_migrator',
    },
    runtimeLedgerRead,
  });
  if (
    result.applicationTables.length !== 214 || result.workerTables.length !== 16 ||
    result.fingerprints.runtime !== (runtimeLedgerRead
      ? B08_RUNTIME_LEDGER_READ_GRANT_DIGEST : B08_RUNTIME_GRANT_DIGEST) ||
    result.fingerprints.worker !== B08_WORKER_GRANT_DIGEST ||
    result.applicationTables.some(name => /^sql_migration_/.test(name))
  ) throw new Error('B08 runtime identity refused: canonical grant plan differs from reviewed inventory.');
  return result;
}

async function rows(connection: AuthoritySqlConnection, statement: string): Promise<Array<Record<string, unknown>>> {
  const result = await connection.query(statement);
  return Array.isArray(result) && Array.isArray(result[0])
    ? result[0] as Array<Record<string, unknown>> : [];
}

function assertGrants(observed: string[], expected: readonly string[], identity: string): string {
  // Azure lower_case_table_names=1 records the one mixed-case logical table in lower case.
  const physicalExpected = expected.map(statement => statement.replace('`propertyImages`', '`propertyimages`'));
  return assertIsolatedCiGrants(observed, physicalExpected, identity);
}

function assertTarget(fingerprint: string, database: string, tlsRequired: boolean, hostnameRequired: boolean): void {
  if (
    fingerprint !== B08_AZURE_TARGET_FINGERPRINT_HASH || database !== 'propertylistify_database' ||
    !tlsRequired || !hostnameRequired
  ) throw new Error('B08 runtime identity refused: target or TLS policy differs.');
}

export async function provisionB08AzureRuntimeIdentities(acknowledgement: string): Promise<{
  targetFingerprintHash: string;
  runtime: { identity: string; tableCount: number; grantPlanDigest: string; actualGrantDigest: string };
  worker: { identity: string; tableCount: number; grantPlanDigest: string; actualGrantDigest: string };
}> {
  const grants = plan();
  const establishment = await verifyB08AzureEstablishment();
  if (
    establishment.migrationHead !== '0094_content_topics_primary_key.sql' ||
    establishment.migrationCount !== 95 || establishment.incompleteAttemptCount !== 0 ||
    establishment.applyPlanDigest !== '632f66e7eb10a16a4642a73fb4d2d8c0ebe15d4736ba17209141fa8dbab373ec' ||
    establishment.manifestDigest !== '93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc' ||
    establishment.desiredModelDigest !== 'a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9' ||
    !establishment.schemaCongruent || establishment.lowerCaseTableNames !== 1
  ) throw new Error('B08 runtime identity refused: established schema proof changed.');

  const adminUrl = credentialUrl(adminFile);
  const authority = resolveDatabaseAuthority({
    operation: 'runtime-identities-provision', explicitDatabaseUrl: adminUrl, credentialClass: 'bootstrap-admin',
  });
  assertTarget(authority.context.targetFingerprintHash, authority.context.databaseName,
    authority.context.tls.required, authority.context.tls.certificateVerificationRequired);
  if (acknowledgement !== expectedDatabaseAcknowledgement(authority.context)) {
    throw new Error('B08 runtime identity refused: exact acknowledgement is required.');
  }
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority), acknowledgement,
  });
  const connection = await createAuthoritySqlConnection(authority, decision);
  const actual: Partial<Record<'runtime' | 'worker', string>> = {};
  try {
    for (const role of ['runtime', 'worker'] as const) {
      const identity = roles[role];
      const password = randomBytes(48).toString('base64url');
      const url = new URL(adminUrl);
      url.username = identity.name;
      url.password = password;
      const descriptor = openSync(identity.file, 'wx', 0o600);
      try { writeFileSync(descriptor, `DATABASE_URL=${url.toString()}\n`, 'utf8'); }
      finally { closeSync(descriptor); }
      secureFile(identity.file);
      try {
        await connection.execute(`CREATE USER '${identity.name}'@'%' IDENTIFIED BY '${password}' REQUIRE SSL`);
        for (const statement of grants.statementsByCredential[role]) {
          await connection.execute(statement);
        }
        const grantRows = await rows(connection, `SHOW GRANTS FOR '${identity.name}'@'%'`);
        actual[role] = assertGrants(grantRows.flatMap(row => Object.values(row).map(String)),
          grants.statementsByCredential[role], identity.name);
      } catch {
        throw new Error(`B08 ${role} identity provisioning did not complete; preserve account and secret for reconciliation.`);
      }
    }
  } finally {
    await connection.end();
  }
  return {
    targetFingerprintHash: authority.context.targetFingerprintHash,
    runtime: { identity: B08_RUNTIME_IDENTITY, tableCount: grants.applicationTables.length,
      grantPlanDigest: grants.fingerprints.runtime, actualGrantDigest: actual.runtime! },
    worker: { identity: B08_WORKER_IDENTITY, tableCount: grants.workerTables.length,
      grantPlanDigest: grants.fingerprints.worker, actualGrantDigest: actual.worker! },
  };
}

export async function grantB08AzureRuntimeLedgerRead(acknowledgement: string): Promise<{
  targetFingerprintHash: string;
  identity: string;
  addedPrivileges: readonly string[];
  grantPlanDigest: string;
  actualGrantDigest: string;
}> {
  const before = plan();
  const after = plan(true);
  const added = after.statementsByCredential.runtime.filter(
    statement => !before.statementsByCredential.runtime.includes(statement),
  );
  if (added.length !== 2 ||
      !added.some(statement => statement.includes('`sql_migration_history`')) ||
      !added.some(statement => statement.includes('`sql_migration_attempts`'))) {
    throw new Error('B08 ledger-read grant refused: change exceeds the two control-table SELECT grants.');
  }
  const establishment = await verifyB08AzureEstablishment();
  if (establishment.migrationHead !== '0094_content_topics_primary_key.sql' ||
      establishment.incompleteAttemptCount !== 0 || !establishment.schemaCongruent) {
    throw new Error('B08 ledger-read grant refused: established schema proof changed.');
  }
  const authority = resolveDatabaseAuthority({
    operation: 'runtime-ledger-read-grant', explicitDatabaseUrl: credentialUrl(adminFile),
    credentialClass: 'bootstrap-admin',
  });
  assertTarget(authority.context.targetFingerprintHash, authority.context.databaseName,
    authority.context.tls.required, authority.context.tls.certificateVerificationRequired);
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority), acknowledgement,
  });
  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const account = `'${B08_RUNTIME_IDENTITY}'@'%'`;
    const current = await rows(connection, `SHOW GRANTS FOR ${account}`);
    assertGrants(current.flatMap(row => Object.values(row).map(String)),
      before.statementsByCredential.runtime, B08_RUNTIME_IDENTITY);
    for (const statement of added) await connection.execute(statement);
    const verified = await rows(connection, `SHOW GRANTS FOR ${account}`);
    return {
      targetFingerprintHash: authority.context.targetFingerprintHash,
      identity: B08_RUNTIME_IDENTITY,
      addedPrivileges: ['sql_migration_history:SELECT', 'sql_migration_attempts:SELECT'],
      grantPlanDigest: after.fingerprints.runtime,
      actualGrantDigest: assertGrants(verified.flatMap(row => Object.values(row).map(String)),
        after.statementsByCredential.runtime, B08_RUNTIME_IDENTITY),
    };
  } finally { await connection.end(); }
}

export async function verifyB08AzureRuntimeIdentities(): Promise<{
  targetFingerprintHash: string;
  runtime: { identity: string; selectedDatabase: string; tlsVersion: string; grantDigest: string };
  worker: { identity: string; selectedDatabase: string; tlsVersion: string; grantDigest: string };
}> {
  const grants = plan(true);
  const verified: Record<string, { identity: string; selectedDatabase: string; tlsVersion: string; grantDigest: string }> = {};
  for (const role of ['runtime', 'worker'] as const) {
    const identity = roles[role];
    const authority = resolveDatabaseAuthority({
      operation: role === 'runtime' ? 'runtime-connect' : 'worker-connect',
      explicitDatabaseUrl: credentialUrl(identity.file), credentialClass: role,
      processEnv: { ...process.env, APP_ENV: 'production', NODE_ENV: 'production' },
    });
    assertTarget(authority.context.targetFingerprintHash, authority.context.databaseName,
      authority.context.tls.required, authority.context.tls.certificateVerificationRequired);
    const decision = authorizeDatabaseOperation(authority, {
      approval: protectedDatabaseApprovalFromEnvironment(authority),
    });
    const pool = await createAuthorityRuntimePool(authority, decision);
    try {
      const leased = await pool.pool.getConnection();
      try {
        const connection: AuthoritySqlConnection = {
          query: (sql, values) => leased.query(sql, values as any),
          execute: (sql, values) => leased.execute(sql, values as any),
          end: async () => { leased.release(); },
        };
        const session = (await rows(connection,
          'SELECT DATABASE() AS selected_database, CURRENT_USER() AS current_identity, @@session.time_zone AS timezone'))[0];
        const tls = (await rows(connection, "SHOW SESSION STATUS LIKE 'Ssl_version'"))[0];
        if (
          session?.selected_database !== 'propertylistify_database' ||
          !String(session.current_identity).startsWith(`${identity.name}@`) ||
          session.timezone !== '+00:00' || !tls?.Value
        ) throw new Error(`B08 ${role} identity verification refused: target, identity, UTC or TLS differs.`);
        const grantRows = await rows(connection, 'SHOW GRANTS');
        const grantDigest = assertGrants(grantRows.flatMap(row => Object.values(row).map(String)),
          grants.statementsByCredential[role], identity.name);
        await rows(connection, 'SELECT 1 AS access_proof FROM `users` LIMIT 1');
        verified[role] = {
          identity: identity.name, selectedDatabase: String(session.selected_database),
          tlsVersion: String(tls.Value), grantDigest,
        };
      } finally { leased.release(); }
    } finally { await pool.end(); }
  }
  return { targetFingerprintHash: B08_AZURE_TARGET_FINGERPRINT_HASH,
    runtime: verified.runtime, worker: verified.worker };
}
