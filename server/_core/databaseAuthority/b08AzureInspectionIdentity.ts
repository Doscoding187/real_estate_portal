import { randomBytes } from 'node:crypto';
import { closeSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { parse } from 'dotenv';
import {
  authorizeDatabaseOperation,
  B08_AZURE_TARGET_FINGERPRINT_HASH,
  B08_INSPECTION_IDENTITY,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';

const secretDirectory = join(homedir(), '.config', 'property-listify');
const adminFile = join(secretDirectory, 'azure-db.env');
const inspectorFile = join(secretDirectory, 'b08-inspector.env');
const account = `'${B08_INSPECTION_IDENTITY}'@'%'`;

function secureFile(path: string): string {
  const parent = lstatSync(dirname(path));
  const file = lstatSync(path);
  if (
    !parent.isDirectory() ||
    (parent.mode & 0o777) !== 0o700 ||
    parent.uid !== process.getuid?.() ||
    !file.isFile() ||
    (file.mode & 0o777) !== 0o600 ||
    file.uid !== process.getuid?.()
  ) {
    throw new Error('B08 inspection identity refused: machine-local secret permissions are unsafe.');
  }
  return readFileSync(path, 'utf8');
}

export async function provisionB08AzureInspectionIdentity(): Promise<{
  identity: string;
  targetFingerprintHash: string;
  databaseSelectOnly: boolean;
  tlsRequired: boolean;
  credentialFileCreated: boolean;
}> {
  const adminUrl = parse(secureFile(adminFile)).DATABASE_URL;
  if (!adminUrl) throw new Error('B08 inspection identity refused: administrator credential is absent.');
  const authority = resolveDatabaseAuthority({
    operation: 'inspection-identity-provision',
    explicitDatabaseUrl: adminUrl,
    credentialClass: 'bootstrap-admin',
  });
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  if (
    authority.context.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
    !authority.context.tls.required ||
    !authority.context.tls.certificateVerificationRequired
  ) {
    throw new Error('B08 inspection identity refused: target or TLS policy differs.');
  }

  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const password = randomBytes(48).toString('base64url');
    const inspectorUrl = new URL(adminUrl);
    inspectorUrl.username = B08_INSPECTION_IDENTITY;
    inspectorUrl.password = password;
    const descriptor = openSync(inspectorFile, 'wx', 0o600);
    try {
      writeFileSync(descriptor, `DATABASE_URL=${inspectorUrl.toString()}\n`, 'utf8');
    } finally {
      closeSync(descriptor);
    }
    secureFile(inspectorFile);

    try {
      await connection.execute(`CREATE USER ${account} IDENTIFIED BY '${password}' REQUIRE SSL`);
    } catch {
      throw new Error('B08 inspection identity creation failed; review account state before retrying.');
    }
    try {
      await connection.execute(
        `GRANT SELECT ON \`propertylistify_database\`.* TO ${account}`,
      );
    } catch {
      throw new Error('B08 inspection identity grant failed; review account state before retrying.');
    }
    const result = await connection.query(`SHOW GRANTS FOR ${account}`);
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : [];
    const grants = rows.flatMap(row => Object.values(row as Record<string, unknown>)).map(String);
    const usageOnly = grants.filter(grant => /^GRANT USAGE ON \*\.\*/i.test(grant)).length === 1;
    const selectOnly = grants.filter(grant =>
      /^GRANT SELECT ON [`']?propertylistify_database[`']?\.\* TO /i.test(grant),
    ).length === 1;
    if (!usageOnly || !selectOnly || grants.length !== 2) {
      throw new Error('B08 inspection identity grants differ from the approved read-only boundary.');
    }
    return {
      identity: B08_INSPECTION_IDENTITY,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      databaseSelectOnly: true,
      tlsRequired: true,
      credentialFileCreated: true,
    };
  } finally {
    await connection.end();
  }
}
