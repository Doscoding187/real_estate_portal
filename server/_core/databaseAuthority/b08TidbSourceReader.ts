import { randomBytes } from 'node:crypto';
import { closeSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  authorizeDatabaseOperation,
  B08_TIDB_SOURCE_ADMIN_IDENTITY,
  B08_TIDB_SOURCE_INSTANCE_ID,
  B08_TIDB_SOURCE_READER_IDENTITY,
  B08_TIDB_SOURCE_READER_PRIVILEGE_SET,
  B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';

const secretDirectory = join(homedir(), '.config', 'property-listify');
const adminPasswordFile = join(secretDirectory, 'b08-tidb-source-admin.password');
const readerFile = join(secretDirectory, 'b08-tidb-source-reader.env');
const host = 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com';
const port = '4000';
const database = 'listify_property_sa';
const account = `'${B08_TIDB_SOURCE_READER_IDENTITY}'@'%'`;

function secureFile(path: string): string {
  const parent = lstatSync(dirname(path));
  const file = lstatSync(path);
  if (
    !parent.isDirectory() || (parent.mode & 0o777) !== 0o700 ||
    parent.uid !== process.getuid?.() || !file.isFile() ||
    (file.mode & 0o777) !== 0o600 || file.uid !== process.getuid?.()
  ) {
    throw new Error('B08 TiDB reader refused: machine-local secret permissions are unsafe.');
  }
  return readFileSync(path, 'utf8');
}

function adminUrl(): string {
  const password = secureFile(adminPasswordFile).replace(/\r?\n$/, '');
  if (!password || /[\r\n]/.test(password)) {
    throw new Error('B08 TiDB reader refused: administrator password file is invalid.');
  }
  const url = new URL(`mysql://${host}:${port}/${database}`);
  url.username = B08_TIDB_SOURCE_ADMIN_IDENTITY;
  url.password = password;
  return url.toString();
}

async function rows(connection: AuthoritySqlConnection, statement: string): Promise<Record<string, unknown>[]> {
  const result = await connection.query(statement);
  return Array.isArray(result) && Array.isArray(result[0])
    ? result[0] as Record<string, unknown>[] : [];
}

function exactGrantEvidence(grants: string[]): boolean {
  if (grants.length !== 2) return false;
  const normalized = grants.map(grant => grant.replace(/[`']/g, '').replace(/\s+/g, ' ').trim().toUpperCase());
  return normalized.some(grant => /^GRANT USAGE ON \*\.\* TO /.test(grant) && !/WITH GRANT OPTION/.test(grant)) &&
    normalized.some(grant => /^GRANT SELECT ON LISTIFY_PROPERTY_SA\.\* TO /.test(grant) && !/WITH GRANT OPTION/.test(grant));
}

export async function provisionB08TidbSourceReader(acknowledgement: string): Promise<{
  instanceId: string;
  targetFingerprintHash: string;
  identity: string;
  privilegeSet: string;
  selectedDatabase: string;
  tlsCipher: string;
  hostnameVerified: boolean;
  grantCount: number;
  tlsRequired: boolean;
}> {
  const sourceUrl = adminUrl();
  const source = new URL(sourceUrl);
  if (
    source.hostname !== host || source.port !== port || source.pathname !== `/${database}` ||
    decodeURIComponent(source.username) !== B08_TIDB_SOURCE_ADMIN_IDENTITY
  ) {
    throw new Error('B08 TiDB reader refused: administrator identity differs from the canonical source.');
  }
  const authority = resolveDatabaseAuthority({
    operation: 'tidb-source-reader-provision',
    explicitDatabaseUrl: sourceUrl,
    credentialClass: 'bootstrap-admin',
  });
  if (
    authority.context.targetFingerprintHash !== B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH ||
    authority.context.provider !== 'tidb' || authority.context.targetClass !== 'production' ||
    !authority.context.tls.required || !authority.context.tls.certificateVerificationRequired
  ) {
    throw new Error('B08 TiDB reader refused: target or TLS policy differs.');
  }
  const approval = protectedDatabaseApprovalFromEnvironment(authority);
  const decision = authorizeDatabaseOperation(authority, { approval, acknowledgement });
  const connection = await createAuthoritySqlConnection(authority, decision);
  let readerUrl: URL;
  try {
    const identity = await rows(connection, 'SELECT CURRENT_USER() AS authenticated_user, DATABASE() AS selected_database, VERSION() AS server_version');
    if (
      identity.length !== 1 ||
      String(identity[0].authenticated_user).split('@')[0] !== B08_TIDB_SOURCE_ADMIN_IDENTITY ||
      identity[0].selected_database !== database ||
      !String(identity[0].server_version).includes('TiDB')
    ) {
      throw new Error('B08 TiDB reader refused: authenticated source identity differs.');
    }
    const password = randomBytes(48).toString('base64url');
    readerUrl = new URL(sourceUrl);
    readerUrl.username = B08_TIDB_SOURCE_READER_IDENTITY;
    readerUrl.password = password;
    const descriptor = openSync(readerFile, 'wx', 0o600);
    try {
      writeFileSync(descriptor, `DATABASE_URL=${readerUrl.toString()}\n`, 'utf8');
    } finally {
      closeSync(descriptor);
    }
    secureFile(readerFile);

    try {
      await connection.execute(`CREATE USER ${account} IDENTIFIED BY '${password}' REQUIRE SSL`);
    } catch {
      throw new Error('B08 TiDB reader creation failed; inspect exact account state before any retry.');
    }
    try {
      await connection.execute(`GRANT SELECT ON \`${database}\`.* TO ${account}`);
    } catch {
      throw new Error('B08 TiDB reader grant failed; inspect exact account state before any retry.');
    }
    const grantRows = await rows(connection, `SHOW GRANTS FOR ${account}`);
    const grants = grantRows.flatMap(row => Object.values(row)).map(String);
    if (!exactGrantEvidence(grants)) {
      throw new Error('B08 TiDB reader grants differ from database-scoped SELECT only.');
    }
    const createRows = await rows(connection, `SHOW CREATE USER ${account}`);
    if (!createRows.some(row => Object.values(row).some(value => /REQUIRE SSL/i.test(String(value))))) {
      throw new Error('B08 TiDB reader account did not retain REQUIRE SSL.');
    }
  } finally {
    await connection.end();
  }

  const readerAuthority = resolveDatabaseAuthority({
    operation: 'read-only-connect',
    explicitDatabaseUrl: readerUrl!.toString(),
    credentialClass: 'read-only',
  });
  const readerDecision = authorizeDatabaseOperation(readerAuthority, {
    approval: {
      reference: approval!.reference,
      actor: approval!.actor,
      operation: 'read-only-connect',
      targetFingerprintHash: B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH,
      credentialClass: 'read-only',
    },
  });
  const readerConnection = await createAuthoritySqlConnection(readerAuthority, readerDecision);
  try {
    const identity = await rows(readerConnection, 'SELECT CURRENT_USER() AS authenticated_user, DATABASE() AS selected_database');
    const tls = await rows(readerConnection, "SHOW STATUS LIKE 'Ssl_cipher'");
    const grants = await rows(readerConnection, 'SHOW GRANTS');
    const grantText = grants.flatMap(row => Object.values(row)).map(String);
    const tlsCipher = String(tls[0]?.Value ?? '');
    if (
      identity.length !== 1 ||
      String(identity[0].authenticated_user).split('@')[0] !== B08_TIDB_SOURCE_READER_IDENTITY ||
      identity[0].selected_database !== database ||
      !tlsCipher || !exactGrantEvidence(grantText)
    ) {
      throw new Error('B08 TiDB reader verification differed from the approved identity, TLS or grants.');
    }
    return {
      instanceId: B08_TIDB_SOURCE_INSTANCE_ID,
      targetFingerprintHash: B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH,
      identity: B08_TIDB_SOURCE_READER_IDENTITY,
      privilegeSet: B08_TIDB_SOURCE_READER_PRIVILEGE_SET,
      selectedDatabase: database,
      tlsCipher,
      hostnameVerified: true,
      grantCount: grantText.length,
      tlsRequired: true,
    };
  } finally {
    await readerConnection.end();
  }
}
