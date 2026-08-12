import mysql from 'mysql2/promise';
import { buildMysqlConnectionSecurityConfig } from '../databaseTls';
import {
  assertAuthorizedDatabaseOperation,
  type AuthorizedDatabaseOperation,
} from './authorization';
import { readDatabaseCredentialUrl } from './credentialVault';
import { localServiceSocketPath } from './localServicePaths';
import type { DatabaseOperation, ResolvedDatabaseAuthority } from './types';

export type AuthoritySqlConnection = {
  execute: (statement: string, values?: readonly unknown[]) => Promise<unknown>;
  query: (statement: string, values?: readonly unknown[]) => Promise<unknown>;
  end: () => Promise<void>;
};

export type AuthorityRuntimePool = {
  pool: mysql.Pool;
  end: () => Promise<void>;
};

export class DatabaseTargetMismatchError extends Error {
  readonly code = 'DATABASE_TARGET_MISMATCH';

  constructor(targetFingerprintHash: string) {
    super(
      `Database connection refused: selected database does not match authorized fingerprint ${targetFingerprintHash.slice(0, 16)}.`,
    );
    this.name = 'DatabaseTargetMismatchError';
  }
}

const SQL_CONNECTION_OPERATIONS: readonly DatabaseOperation[] = [
  'read-only-connect',
  'migration-plan',
  'migration-apply',
  'reference-seed',
  'foundation-seed',
  'demo-seed',
  'scenario-seed',
  'test-fixture',
  'verification',
  'browser-verification',
  'readiness',
  'diagnostics',
  'release-plan',
  'release-apply',
  'release-reference-plan',
  'release-reference-apply',
  'release-reference-verify',
];

async function selectedDatabase(connection: {
  execute: (statement: string) => Promise<unknown>;
}): Promise<string> {
  const result: any = await connection.execute('SELECT DATABASE() AS database_name');
  const rows = Array.isArray(result?.[0])
    ? result[0]
    : Array.isArray(result?.rows)
      ? result.rows
      : Array.isArray(result)
        ? result
        : [];
  const row = rows[0] ?? {};
  return String(row.database_name ?? row.DATABASE_NAME ?? '');
}

async function verifySelectedTarget(
  connection: { execute: (statement: string) => Promise<unknown> },
  authority: ResolvedDatabaseAuthority,
): Promise<void> {
  const selected = await selectedDatabase(connection);
  if (selected !== authority.context.databaseName) {
    throw new DatabaseTargetMismatchError(authority.context.targetFingerprintHash);
  }
}

export async function createAuthoritySqlConnection(
  authority: ResolvedDatabaseAuthority,
  decision: AuthorizedDatabaseOperation,
): Promise<AuthoritySqlConnection> {
  assertAuthorizedDatabaseOperation(authority, decision, SQL_CONNECTION_OPERATIONS);
  if (authority.context.dialect !== 'mysql') {
    throw new Error('Database connection refused: only the approved MySQL dialect is supported.');
  }
  const databaseUrl = readDatabaseCredentialUrl(authority.credential);
  try {
    const config = buildMysqlConnectionSecurityConfig(databaseUrl, authority.context.runtimeMode);
    const connection = await mysql.createConnection(config);
    const wrapped: AuthoritySqlConnection = {
      execute: (statement, values) => connection.execute(statement, values as any),
      query: (statement, values) => connection.query(statement, values as any),
      end: () => connection.end(),
    };
    try {
      await verifySelectedTarget(wrapped, authority);
    } catch (error) {
      await wrapped.end();
      throw error;
    }
    return wrapped;
  } catch (error) {
    if (error instanceof DatabaseTargetMismatchError) {
      throw error;
    }
    throw new Error(
      `Database connection failed for authorized fingerprint ${authority.context.targetFingerprintHash.slice(0, 16)}.`,
    );
  }
}

export async function createAuthorityRuntimePool(
  authority: ResolvedDatabaseAuthority,
  decision: AuthorizedDatabaseOperation,
): Promise<AuthorityRuntimePool> {
  assertAuthorizedDatabaseOperation(authority, decision, ['runtime-connect']);
  if (authority.context.dialect !== 'mysql') {
    throw new Error('Runtime connection refused: only the approved MySQL dialect is supported.');
  }
  const databaseUrl = readDatabaseCredentialUrl(authority.credential);
  try {
    const config = buildMysqlConnectionSecurityConfig(databaseUrl, authority.context.runtimeMode);
    const pool = mysql.createPool({
      ...config,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    const verifier: AuthoritySqlConnection = {
      execute: statement => pool.execute(statement),
      query: statement => pool.query(statement),
      end: () => pool.end(),
    };
    await verifySelectedTarget(verifier, authority);
    return { pool, end: () => pool.end() };
  } catch (error) {
    if (error instanceof DatabaseTargetMismatchError) throw error;
    throw new Error(
      `Runtime database connection failed for authorized fingerprint ${authority.context.targetFingerprintHash.slice(0, 16)}.`,
    );
  }
}

export async function createLocalLifecycleAdminConnection(
  authority: ResolvedDatabaseAuthority,
  decision: AuthorizedDatabaseOperation,
  input: {
    socketPath?: string;
    password?: string;
  } = {},
): Promise<AuthoritySqlConnection> {
  assertAuthorizedDatabaseOperation(authority, decision, [
    'database-create',
    'database-dispose',
    'reset',
    'rebuild',
    'lifecycle-admin',
  ]);
  if (
    !authority.context.local ||
    authority.context.port !== '3307' ||
    authority.context.credentialClass !== 'lifecycle-admin'
  ) {
    throw new Error('Lifecycle administration refused: target is not the approved local topology.');
  }
  try {
    const connection = await mysql.createConnection({
      socketPath: input.socketPath ?? localServiceSocketPath(),
      user: 'root',
      ...(input.password === undefined ? {} : { password: input.password }),
    });
    return {
      execute: (statement, values) => connection.execute(statement, values as any),
      query: (statement, values) => connection.query(statement, values as any),
      end: () => connection.end(),
    };
  } catch {
    throw new Error('Lifecycle administration could not connect to the approved local server.');
  }
}
