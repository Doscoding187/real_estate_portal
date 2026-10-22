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
  /** Bounded query capability. Present on canonical connections; optional for existing test doubles. */
  queryBounded?: (
    statement: string,
    timeoutMs: number,
    values?: readonly unknown[],
  ) => Promise<unknown>;
  /** Bounded transaction-control capability. B09 uses only these fixed commands. */
  queryControlBounded?: (statement: string, timeoutMs: number) => Promise<unknown>;
  /** Bounded, allow-listed synthetic billing inserts; exposed only to test-fixture operations. */
  executeFixtureBounded?: (
    statement: string,
    timeoutMs: number,
    values?: readonly unknown[],
  ) => Promise<unknown>;
  /** Server connection id used only to terminate this connection's own timed-out work. */
  connectionId?: number;
  isTerminated?: () => boolean;
  destroy?: () => void;
  end: () => Promise<void>;
};

const MAX_AUTHORITY_QUERY_TIMEOUT_MS = 15_000;
const MAX_AUTHORITY_CONTROL_TIMEOUT_MS = 1_000;
const MAX_AUTHORITY_CANCEL_CLEANUP_MS = 3_000;
const MAX_AUTHORITY_CONNECTION_END_MS = 1_000;
const SERVER_EXECUTION_TIMEOUT_GRACE_MS = 1_000;

class AuthorityOperationTimeout extends Error {
  constructor() {
    super('Authority operation timed out.');
  }
}

async function awaitWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error('Database query refused: timeout is outside the authority limit.');
  }
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new AuthorityOperationTimeout()), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function maxExecutionTimeHint(statement: string, timeoutMs: number): string {
  if (!/^\s*SELECT\b/i.test(statement) || statement.includes(';') || /\/\*\+/i.test(statement)) {
    throw new Error('Database query refused: bounded reads require one static SELECT statement.');
  }
  return statement.replace(/^(\s*SELECT\b)/i, `$1 /*+ MAX_EXECUTION_TIME(${timeoutMs}) */`);
}

const SYNTHETIC_BILLING_INSERTS = new Set([
  'INSERT INTO billing_invoices (owner_type, owner_id, billable_account_id, subscription_id, invoice_number, payment_reference, amount_due) VALUES (?, ?, ?, ?, ?, ?, ?)',
  'INSERT INTO billing_payments (invoice_id, subscription_id, owner_type, owner_id, billable_account_id, amount, payment_reference, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  'INSERT INTO billing_payment_documents (payment_id, invoice_id, owner_type, owner_id, billable_account_id, storage_key, original_file_name, mime_type, file_size_bytes, sha256_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  'INSERT INTO billing_audit_events (owner_type, owner_id, billable_account_id, subscription_id, invoice_id, payment_id, event_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
]);

function assertSyntheticBillingInsert(statement: string): void {
  if (!SYNTHETIC_BILLING_INSERTS.has(statement)) {
    throw new Error(
      'Database fixture refused: only an exact bounded synthetic billing insert is allowed.',
    );
  }
}

export type AuthorityRuntimePool = {
  pool: mysql.Pool;
  end: () => Promise<void>;
};

/**
 * Every durable timestamp is represented as UTC. MySQL's TIMESTAMP type
 * converts values through the session timezone, so leaving a local server on
 * SYSTEM time silently changes a UTC timestamp string at write time.
 */
const UTC_SESSION_TIME_ZONE = '+00:00';

async function configureUtcSession(connection: {
  execute: (statement: string, values?: readonly unknown[]) => Promise<unknown>;
}): Promise<void> {
  await connection.execute(`SET time_zone = '${UTC_SESSION_TIME_ZONE}'`);
}

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
  'ci-identity-bootstrap',
  'inspection-identity-provision',
  'tidb-source-reader-provision',
  'migration-identity-provision',
  'runtime-identities-provision',
  'runtime-ledger-read-grant',
  'b08-behavior-verify',
  'b09-source-census',
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
    const connection = await mysql.createConnection({ ...config, timezone: 'Z' });
    const connectionId = Number(connection.threadId);
    if (!Number.isSafeInteger(connectionId) || connectionId < 1) {
      connection.destroy();
      throw new Error('Database connection refused: server connection identity is unavailable.');
    }
    let terminated = false;
    const destroy = (): void => {
      if (terminated) return;
      terminated = true;
      connection.destroy();
    };
    const terminateTimedOutWork = async (pendingQuery: Promise<unknown>): Promise<void> => {
      const deadline = Date.now() + MAX_AUTHORITY_CANCEL_CLEANUP_MS;
      let cancellationConnection: mysql.Connection | undefined;
      const remaining = (): number => Math.max(0, deadline - Date.now());
      const abandon = (): void => {
        cancellationConnection?.destroy();
        destroy();
      };
      try {
        const connectTimeout = Math.min(MAX_AUTHORITY_CONTROL_TIMEOUT_MS, remaining());
        if (connectTimeout < 1) throw new AuthorityOperationTimeout();
        const opening = mysql.createConnection({
          ...config,
          timezone: 'Z',
          connectTimeout,
        });
        try {
          cancellationConnection = await awaitWithin(opening, connectTimeout);
        } catch (error) {
          void opening.then(
            candidate => candidate.destroy(),
            () => undefined,
          );
          throw error;
        }
        const killTimeout = Math.min(MAX_AUTHORITY_CONTROL_TIMEOUT_MS, remaining());
        if (killTimeout < 1) throw new AuthorityOperationTimeout();
        await awaitWithin(
          cancellationConnection.query(`KILL CONNECTION ${connectionId}`),
          killTimeout,
        );
        const settleTimeout = remaining();
        if (settleTimeout < 1) throw new AuthorityOperationTimeout();
        await awaitWithin(
          pendingQuery.then(
            () => undefined,
            () => undefined,
          ),
          settleTimeout,
        );
        terminated = true;
      } catch {
        abandon();
        throw new Error(
          `Database query refused: execution deadline expired; the server did not confirm termination within ${MAX_AUTHORITY_CANCEL_CLEANUP_MS} ms. Preserve the disposable target and review Authority status.`,
        );
      } finally {
        cancellationConnection?.destroy();
      }
      // KILL CONNECTION closes the read-only transaction as well as its query.
      // Closing the local socket makes the client-side terminal state explicit.
      connection.destroy();
    };
    const wrapped: AuthoritySqlConnection = {
      execute: (statement, values) => connection.execute(statement, values as any),
      query: (statement, values) => connection.query(statement, values as any),
      queryBounded: async (statement, timeoutMs, values) => {
        if (
          !Number.isSafeInteger(timeoutMs) ||
          timeoutMs < 1 ||
          timeoutMs > MAX_AUTHORITY_QUERY_TIMEOUT_MS
        ) {
          throw new Error(
            'Database query refused: bounded timeout is outside the authority limit.',
          );
        }
        if (terminated) {
          throw new Error('Database query refused: authorized connection has been terminated.');
        }
        const serverTimeoutMs = Math.min(
          MAX_AUTHORITY_QUERY_TIMEOUT_MS,
          timeoutMs + SERVER_EXECUTION_TIMEOUT_GRACE_MS,
        );
        const serverBoundedStatement = maxExecutionTimeHint(statement, serverTimeoutMs);
        const pendingQuery = connection.query(serverBoundedStatement, values as any);
        try {
          return await awaitWithin(pendingQuery, timeoutMs);
        } catch (error) {
          if (!(error instanceof AuthorityOperationTimeout)) throw error;
          await terminateTimedOutWork(pendingQuery);
          throw new Error(
            'Database query refused: execution deadline expired; the server session was terminated and the active query settled.',
          );
        }
      },
      queryControlBounded: async (statement, timeoutMs) => {
        const command = statement.trim().toUpperCase();
        const allowedCommands = ['START TRANSACTION READ ONLY', 'COMMIT', 'ROLLBACK'];
        if (decision.operation === 'test-fixture') allowedCommands.push('START TRANSACTION');
        if (!allowedCommands.includes(command)) {
          throw new Error(
            'Database query refused: bounded transaction control is not allow-listed.',
          );
        }
        if (
          !Number.isSafeInteger(timeoutMs) ||
          timeoutMs < 1 ||
          timeoutMs > MAX_AUTHORITY_CONTROL_TIMEOUT_MS
        ) {
          throw new Error(
            'Database query refused: transaction-control timeout is outside the authority limit.',
          );
        }
        if (terminated) {
          throw new Error('Database query refused: authorized connection has been terminated.');
        }
        const pendingCommand = connection.query(statement);
        try {
          return await awaitWithin(pendingCommand, timeoutMs);
        } catch (error) {
          if (!(error instanceof AuthorityOperationTimeout)) throw error;
          await terminateTimedOutWork(pendingCommand);
          throw new Error(
            `Database query refused: transaction control exceeded ${timeoutMs} ms; the server session was terminated.`,
          );
        }
      },
      ...(decision.operation === 'test-fixture'
        ? {
            executeFixtureBounded: async (
              statement: string,
              timeoutMs: number,
              values?: readonly unknown[],
            ) => {
              assertSyntheticBillingInsert(statement);
              if (
                !Number.isSafeInteger(timeoutMs) ||
                timeoutMs < 1 ||
                timeoutMs > MAX_AUTHORITY_QUERY_TIMEOUT_MS
              ) {
                throw new Error(
                  'Database fixture refused: insert timeout is outside the authority limit.',
                );
              }
              if (terminated) {
                throw new Error(
                  'Database fixture refused: authorized connection has been terminated.',
                );
              }
              const pendingInsert = connection.execute(statement, values as any);
              try {
                return await awaitWithin(pendingInsert, timeoutMs);
              } catch (error) {
                if (!(error instanceof AuthorityOperationTimeout)) throw error;
                await terminateTimedOutWork(pendingInsert);
                throw new Error(
                  'Database fixture refused: insert deadline expired; the server session was terminated and the active statement settled.',
                );
              }
            },
          }
        : {}),
      connectionId,
      isTerminated: () => terminated,
      destroy,
      end: async () => {
        if (terminated) return;
        try {
          await awaitWithin(connection.end(), MAX_AUTHORITY_CONNECTION_END_MS);
          terminated = true;
        } catch {
          destroy();
          throw new Error(
            `Database query refused: connection cleanup exceeded ${MAX_AUTHORITY_CONNECTION_END_MS} ms; the client socket was destroyed.`,
          );
        }
      },
    };
    try {
      await configureUtcSession(wrapped);
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
  assertAuthorizedDatabaseOperation(authority, decision, ['runtime-connect', 'worker-connect']);
  if (authority.context.dialect !== 'mysql') {
    throw new Error('Runtime connection refused: only the approved MySQL dialect is supported.');
  }
  const databaseUrl = readDatabaseCredentialUrl(authority.credential);
  let pool: mysql.Pool | undefined;
  try {
    const config = buildMysqlConnectionSecurityConfig(databaseUrl, authority.context.runtimeMode);
    const createdPool = mysql.createPool({
      ...config,
      timezone: 'Z',
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    pool = createdPool;
    // mysql2 emits `connection` before a newly created socket is leased from
    // the pool. Queueing this command here establishes UTC for every physical
    // connection, not only the verifier connection below.
    createdPool.on('connection', connection => {
      connection.query(`SET time_zone = '${UTC_SESSION_TIME_ZONE}'`, error => {
        if (error) connection.destroy();
      });
    });
    const verifier: AuthoritySqlConnection = {
      execute: statement => createdPool.execute(statement),
      query: statement => createdPool.query(statement),
      end: () => createdPool.end(),
    };
    await configureUtcSession(verifier);
    await verifySelectedTarget(verifier, authority);
    return { pool: createdPool, end: () => createdPool.end() };
  } catch (error) {
    if (pool) await pool.end().catch(() => undefined);
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
      timezone: 'Z',
      ...(input.password === undefined ? {} : { password: input.password }),
    });
    const wrapped: AuthoritySqlConnection = {
      execute: (statement, values) => connection.execute(statement, values as any),
      query: (statement, values) => connection.query(statement, values as any),
      end: () => connection.end(),
    };
    try {
      await configureUtcSession(wrapped);
    } catch (error) {
      await wrapped.end();
      throw error;
    }
    return wrapped;
  } catch {
    throw new Error('Lifecycle administration could not connect to the approved local server.');
  }
}
