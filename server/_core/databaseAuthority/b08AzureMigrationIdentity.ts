import { randomBytes } from 'node:crypto';
import { closeSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { parse } from 'dotenv';
import {
  authorizeDatabaseOperation,
  B08_AZURE_TARGET_FINGERPRINT_HASH,
  B08_MIGRATION_IDENTITY,
  B08_MIGRATION_PRIVILEGE_SET,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';

const secretDirectory = join(homedir(), '.config', 'property-listify');
const adminFile = join(secretDirectory, 'azure-db.env');
const inspectorFile = join(secretDirectory, 'b08-inspector.env');
const migratorFile = join(secretDirectory, 'b08-migrator.env');
const account = `'${B08_MIGRATION_IDENTITY}'@'%'`;
const databasePrivileges = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'INDEX', 'REFERENCES',
] as const;

function secureFile(path: string): string {
  const parent = lstatSync(dirname(path));
  const file = lstatSync(path);
  if (
    !parent.isDirectory() || (parent.mode & 0o777) !== 0o700 ||
    parent.uid !== process.getuid?.() || !file.isFile() ||
    (file.mode & 0o777) !== 0o600 || file.uid !== process.getuid?.()
  ) {
    throw new Error('B08 migration identity refused: machine-local secret permissions are unsafe.');
  }
  return readFileSync(path, 'utf8');
}

function urlFrom(path: string): string {
  const url = parse(secureFile(path)).DATABASE_URL;
  if (!url) throw new Error('B08 migration identity refused: credential is absent.');
  return url;
}

async function rows(connection: AuthoritySqlConnection, statement: string): Promise<Array<Record<string, unknown>>> {
  const result = await connection.query(statement);
  return Array.isArray(result) && Array.isArray(result[0])
    ? result[0] as Array<Record<string, unknown>> : [];
}

function assertExactGrants(grants: string[]): void {
  const found = new Map<string, Set<string>>();
  for (const grant of grants) {
    const match = /^GRANT (.+) ON (.+) TO /i.exec(grant);
    if (!match || /WITH GRANT OPTION/i.test(grant)) {
      throw new Error('B08 migration identity grants differ from the approved boundary.');
    }
    const scope = match[2].replace(/[`']/g, '').toLowerCase();
    const scopePrivileges = found.get(scope) ?? new Set<string>();
    for (const privilege of match[1].split(',')) {
      scopePrivileges.add(privilege.trim().toUpperCase());
    }
    found.set(scope, scopePrivileges);
  }
  const global = found.get('*.*');
  const database = found.get('propertylistify_database.*');
  if (
    found.size !== 2 || !global || !database ||
    !global.has('SESSION_VARIABLES_ADMIN') ||
    [...global].some(privilege => !['USAGE', 'SESSION_VARIABLES_ADMIN'].includes(privilege)) ||
    database.size !== databasePrivileges.length ||
    databasePrivileges.some(privilege => !database.has(privilege))
  ) {
    throw new Error('B08 migration identity grants differ from the approved boundary.');
  }
}

function assertExactTarget(context: {
  targetFingerprintHash: string;
  databaseName: string;
  tls: { required: boolean; certificateVerificationRequired: boolean };
}): void {
  if (
    context.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
    context.databaseName !== 'propertylistify_database' ||
    !context.tls.required || !context.tls.certificateVerificationRequired
  ) {
    throw new Error('B08 migration identity refused: target or TLS policy differs.');
  }
}

export async function provisionB08AzureMigrationIdentity(): Promise<{
  identity: string;
  targetFingerprintHash: string;
  privilegeSet: string;
  tlsRequired: boolean;
  credentialFileCreated: boolean;
}> {
  const adminUrl = urlFrom(adminFile);
  const authority = resolveDatabaseAuthority({
    operation: 'migration-identity-provision',
    explicitDatabaseUrl: adminUrl,
    credentialClass: 'bootstrap-admin',
  });
  assertExactTarget(authority.context);
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const password = randomBytes(48).toString('base64url');
    const migratorUrl = new URL(adminUrl);
    migratorUrl.username = B08_MIGRATION_IDENTITY;
    migratorUrl.password = password;
    const descriptor = openSync(migratorFile, 'wx', 0o600);
    try {
      writeFileSync(descriptor, `DATABASE_URL=${migratorUrl.toString()}\n`, 'utf8');
    } finally {
      closeSync(descriptor);
    }
    secureFile(migratorFile);

    try {
      await connection.execute(`CREATE USER ${account} IDENTIFIED BY '${password}' REQUIRE SSL`);
    } catch {
      throw new Error('B08 migration identity creation failed; review account state before retrying.');
    }
    try {
      await connection.execute(
        `GRANT ${databasePrivileges.join(', ')} ON \`propertylistify_database\`.* TO ${account}`,
      );
      await connection.execute(`GRANT SESSION_VARIABLES_ADMIN ON *.* TO ${account}`);
    } catch {
      throw new Error('B08 migration identity grant failed; review account state before retrying.');
    }
    const grantRows = await rows(connection, `SHOW GRANTS FOR ${account}`);
    const grants = grantRows.flatMap(row => Object.values(row)).map(String);
    assertExactGrants(grants);
    return {
      identity: B08_MIGRATION_IDENTITY,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      privilegeSet: B08_MIGRATION_PRIVILEGE_SET,
      tlsRequired: true,
      credentialFileCreated: true,
    };
  } finally {
    await connection.end();
  }
}

export async function verifyB08AzureMigrationIdentity(): Promise<{
  identity: string;
  targetFingerprintHash: string;
  selectedDatabase: string;
  tls: { cipherPresent: boolean; version: string; hostnameVerificationRequired: boolean };
  grantsExact: boolean;
  session: {
    connectionId: number;
    generateInvisiblePrimaryKeyBefore: number;
    generateInvisiblePrimaryKeyAfter: number;
    requirePrimaryKey: number;
    timezone: string;
  };
}> {
  const inspectorUrl = urlFrom(inspectorFile);
  const migratorUrl = urlFrom(migratorFile);
  const env = {
    ...process.env,
    APP_ENV: 'production',
    NODE_ENV: 'production',
    DATABASE_URL: inspectorUrl,
    DATABASE_MIGRATION_URL: migratorUrl,
  };
  const authority = resolveDatabaseAuthority({
    operation: 'verification',
    processEnv: env,
    credentialClass: 'migration',
  });
  assertExactTarget(authority.context);
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority, env),
  });
  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const session = (await rows(connection, `SELECT DATABASE() AS selected_database,
      CURRENT_USER() AS current_identity, CONNECTION_ID() AS connection_id,
      @@session.sql_generate_invisible_primary_key AS gipk,
      @@session.sql_require_primary_key AS require_primary_key,
      @@session.time_zone AS timezone`))[0];
    if (
      session?.selected_database !== 'propertylistify_database' ||
      !String(session.current_identity).startsWith(`${B08_MIGRATION_IDENTITY}@`)
    ) {
      throw new Error('B08 migration identity verification refused: identity or selected database differs.');
    }
    const tlsCipher = (await rows(connection, "SHOW SESSION STATUS LIKE 'Ssl_cipher'"))[0];
    const tlsVersion = (await rows(connection, "SHOW SESSION STATUS LIKE 'Ssl_version'"))[0];
    if (!tlsCipher?.Value || !tlsVersion?.Value) {
      throw new Error('B08 migration identity verification refused: TLS is absent.');
    }
    const grantRows = await rows(connection, 'SHOW GRANTS');
    assertExactGrants(grantRows.flatMap(row => Object.values(row)).map(String));
    await connection.query('SET SESSION sql_generate_invisible_primary_key=OFF');
    const after = (await rows(connection, `SELECT CONNECTION_ID() AS connection_id,
      @@session.sql_generate_invisible_primary_key AS gipk`))[0];
    if (Number(after?.connection_id) !== Number(session.connection_id) || Number(after?.gipk) !== 0) {
      throw new Error('B08 migration identity verification refused: same-session GIPK disable failed.');
    }
    return {
      identity: B08_MIGRATION_IDENTITY,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      selectedDatabase: String(session.selected_database),
      tls: {
        cipherPresent: true,
        version: String(tlsVersion.Value),
        hostnameVerificationRequired: authority.context.tls.certificateVerificationRequired,
      },
      grantsExact: true,
      session: {
        connectionId: Number(session.connection_id),
        generateInvisiblePrimaryKeyBefore: Number(session.gipk),
        generateInvisiblePrimaryKeyAfter: Number(after.gipk),
        requirePrimaryKey: Number(session.require_primary_key),
        timezone: String(session.timezone),
      },
    };
  } finally {
    await connection.end();
  }
}
