import { lstatSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { parse } from 'dotenv';
import {
  authorizeDatabaseOperation,
  B08_TIDB_SOURCE_READER_IDENTITY,
  B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';

const readerFile = join(homedir(), '.config', 'property-listify', 'b08-tidb-source-reader.env');
const database = 'listify_property_sa';

export function readB08TidbReaderUrl(): string {
  const parent = lstatSync(dirname(readerFile));
  const file = lstatSync(readerFile);
  if (
    !parent.isDirectory() || (parent.mode & 0o777) !== 0o700 || parent.uid !== process.getuid?.() ||
    !file.isFile() || (file.mode & 0o777) !== 0o600 || file.uid !== process.getuid?.()
  ) {
    throw new Error('B08 TiDB inventory refused: reader secret permissions are unsafe.');
  }
  const url = parse(readFileSync(readerFile, 'utf8')).DATABASE_URL;
  if (!url) throw new Error('B08 TiDB inventory refused: reader credential is absent.');
  const parsed = new URL(url);
  if (
    parsed.hostname !== 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com' ||
    parsed.port !== '4000' || parsed.pathname !== `/${database}` ||
    decodeURIComponent(parsed.username) !== B08_TIDB_SOURCE_READER_IDENTITY
  ) {
    throw new Error('B08 TiDB inventory refused: source reader identity differs.');
  }
  return url;
}

async function rows(connection: AuthoritySqlConnection, statement: string, values?: readonly unknown[]): Promise<Record<string, unknown>[]> {
  const result = await connection.query(statement, values);
  return Array.isArray(result) && Array.isArray(result[0])
    ? result[0] as Record<string, unknown>[] : [];
}

export async function inventoryB08TidbV1(): Promise<{
  targetFingerprintHash: string;
  authenticatedIdentity: string;
  database: string;
  tlsCipher: string;
  hostnameVerified: true;
  observedAt: string;
  tableCount: number;
  nonEmptyTableCount: number;
  totalRows: number;
  rowCounts: Array<{ table: string; rows: number }>;
}> {
  const authority = resolveDatabaseAuthority({
    operation: 'read-only-connect',
    explicitDatabaseUrl: readB08TidbReaderUrl(),
    credentialClass: 'read-only',
  });
  if (
    authority.context.targetFingerprintHash !== B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH ||
    authority.context.targetClass !== 'production' || authority.context.provider !== 'tidb' ||
    !authority.context.tls.required || !authority.context.tls.certificateVerificationRequired
  ) {
    throw new Error('B08 TiDB inventory refused: source target or TLS policy differs.');
  }
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const identity = await rows(connection, 'SELECT CURRENT_USER() AS authenticated_user, DATABASE() AS selected_database');
    const tls = await rows(connection, "SHOW STATUS LIKE 'Ssl_cipher'");
    const authenticatedIdentity = String(identity[0]?.authenticated_user ?? '').split('@')[0];
    const tlsCipher = String(tls[0]?.Value ?? '');
    if (authenticatedIdentity !== B08_TIDB_SOURCE_READER_IDENTITY || identity[0]?.selected_database !== database || !tlsCipher) {
      throw new Error('B08 TiDB inventory refused: connection identity or TLS differs.');
    }
    const tables = await rows(connection,
      "SELECT TABLE_NAME AS table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
      [database],
    );
    if (tables.length === 0 || tables.length > 500) {
      throw new Error('B08 TiDB inventory refused: unexpected source table count.');
    }
    const rowCounts: Array<{ table: string; rows: number }> = [];
    for (const tableRow of tables) {
      const table = String(tableRow.table_name ?? '');
      if (!/^[A-Za-z0-9_]+$/.test(table)) {
        throw new Error('B08 TiDB inventory refused: unexpected source table identity.');
      }
      const result = await rows(connection, `SELECT COUNT(*) AS row_count FROM \`${database}\`.\`${table}\``);
      const count = Number(result[0]?.row_count);
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error('B08 TiDB inventory refused: unsafe row count.');
      }
      rowCounts.push({ table, rows: count });
    }
    return {
      targetFingerprintHash: B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH,
      authenticatedIdentity,
      database,
      tlsCipher,
      hostnameVerified: true,
      observedAt: new Date().toISOString(),
      tableCount: rowCounts.length,
      nonEmptyTableCount: rowCounts.filter(item => item.rows > 0).length,
      totalRows: rowCounts.reduce((total, item) => total + item.rows, 0),
      rowCounts,
    };
  } finally {
    await connection.end();
  }
}
