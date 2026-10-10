import { randomUUID } from 'node:crypto';
import * as canonicalSchema from '../../../drizzle/schema';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';
import {
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
  compareNormalizedSchemas,
} from './schemaCongruency';
import {
  REHEARSAL,
  assertRehearsalAuthorization,
  verifyRehearsalResource,
} from './rehearsalAuthority';
import { compileRehearsalProbe, rehearsalCleanup, type RehearsalProbe } from './rehearsalProbes';
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
  'runtime-place-grant',
  'b08-behavior-verify',
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
  options: { preserveTiDbArchiveTypes?: true } = {},
): Promise<AuthoritySqlConnection> {
  assertAuthorizedDatabaseOperation(authority, decision, SQL_CONNECTION_OPERATIONS);
  if (
    options.preserveTiDbArchiveTypes &&
    (authority.context.operation !== 'read-only-connect' ||
      authority.context.credentialClass !== 'read-only' ||
      authority.context.targetFingerprintHash !==
        '68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e')
  ) {
    throw new Error(
      'Source archive connection refused: exact TiDB source and read-only credential required.',
    );
  }
  if (authority.context.dialect !== 'mysql') {
    throw new Error('Database connection refused: only the approved MySQL dialect is supported.');
  }
  const databaseUrl = readDatabaseCredentialUrl(authority.credential);
  try {
    const config = buildMysqlConnectionSecurityConfig(databaseUrl, authority.context.runtimeMode);
    const connection = await mysql.createConnection({
      ...config,
      timezone: 'Z',
      ...(options.preserveTiDbArchiveTypes
        ? { dateStrings: true, supportBigNumbers: true, bigNumberStrings: true, jsonStrings: true }
        : {}),
    });
    const wrapped: AuthoritySqlConnection = {
      // Each readiness sweep owns a fresh connection. Preparing its static reads
      // again adds network round trips; use the existing text protocol only when
      // there are no bound values. Parameterized reads retain driver preparation.
      execute: (statement, values) =>
        authority.context.operation === 'readiness' && !values?.length
          ? connection.query(statement)
          : connection.execute(statement, values as any),
      query: (statement, values) => connection.query(statement, values as any),
      end: () => connection.end(),
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

/** Dedicated remote rehearsal path. Generic SQL/runtime factories never admit this operation. */
export async function createAuthorityRehearsalSession(
  authority: ResolvedDatabaseAuthority,
  decision: AuthorizedDatabaseOperation,
  mode: 'preflight' | 'regression' = 'regression',
): Promise<{
  run: (connection: 0 | 1, probe: RehearsalProbe, slots?: readonly number[]) => Promise<unknown>;
  end: () => Promise<void>;
  evidence: Record<string, unknown>;
}> {
  assertAuthorizedDatabaseOperation(authority, decision, ['rehearsal-regression']);
  const checkApproval = () =>
    assertRehearsalAuthorization(authority.context, decision.approvalReference ?? undefined);
  checkApproval();
  if (mode !== 'preflight' && mode !== 'regression') throw new Error('Unknown rehearsal mode.');
  await verifyRehearsalResource();
  const u = new URL(readDatabaseCredentialUrl(authority.credential));
  // Do not pass arbitrary URI options to mysql2 (host/socket/multipleStatements overrides).
  if (u.search && u.search !== '?sslaccept=strict')
    throw new Error('Rehearsal refused: unsupported connection options.');
  if (
    u.hostname !== REHEARSAL.hostname ||
    u.pathname !== `/${REHEARSAL.database}` ||
    (u.port && u.port !== '3306') ||
    u.protocol !== 'mysql:'
  )
    throw new Error('Rehearsal credential identity mismatch.');
  const connections: mysql.Connection[] = [];
  const nonce = randomUUID();
  const lock = 'property-listify:azure84:bounded-rehearsal';
  let initialized = false;
  let closed = false;
  let statements = 0;
  let writeAttempted = false;
  const queryRows = async (c: mysql.Connection, sql: string) => (await c.query(sql))[0] as any[];
  try {
    for (let i = 0; i < 2; i++) {
      const c = await mysql.createConnection({
        host: REHEARSAL.hostname,
        port: 3306,
        database: REHEARSAL.database,
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        ssl: { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2' },
        timezone: 'Z',
        multipleStatements: false,
        connectTimeout: 15000,
      });
      connections.push(c);
      await configureUtcSession(c);
      await verifySelectedTarget(c, authority);
      const [identity] = await queryRows(
        c,
        'SELECT VERSION() version,@@session.time_zone time_zone',
      );
      const tls = await queryRows(c, "SHOW SESSION STATUS LIKE 'Ssl_cipher'");
      if (
        !/^8\.(0|4)\./.test(identity?.version) ||
        !String(identity?.version).endsWith('-azure') ||
        identity?.time_zone !== '+00:00' ||
        !tls[0]?.Value
      )
        throw new Error('Rehearsal SQL identity/TLS/UTC verification failed.');
    }
    const [acquired]: any = await connections[0].query('SELECT GET_LOCK(?,0) acquired', [lock]);
    if (Number(acquired[0]?.acquired) !== 1)
      throw new Error('Rehearsal already owned by another session.');
    const desired = normalizedDesiredSchema(canonicalSchema);
    const physical = await normalizedPhysicalSchema(
      connections[0] as AuthoritySqlConnection,
      'mysql',
      desired,
    );
    if (
      desired.digest !== REHEARSAL.modelDigest ||
      !compareNormalizedSchemas(desired, physical).congruent
    )
      throw new Error('Rehearsal schema authority mismatch.');
    const manifest = loadAndValidateMigrationManifest();
    if (manifest.manifestDigest !== REHEARSAL.manifestDigest)
      throw new Error('Rehearsal manifest authority mismatch.');
    const history = await queryRows(
      connections[0],
      'SELECT filename,checksum FROM sql_migration_history ORDER BY numeric_version',
    );
    if (
      history.length !== manifest.orderedMigrations.length ||
      !manifest.orderedMigrations.every(
        (e, i) => e.filename === history[i]?.filename && e.checksum === history[i]?.checksum,
      )
    )
      throw new Error('Rehearsal ledger mismatch.');
    const incomplete = await queryRows(
      connections[0],
      "SELECT state FROM sql_migration_attempts WHERE state <> 'succeeded'",
    );
    if (incomplete.length) throw new Error('Rehearsal incomplete attempt evidence.');
    const triggers = await queryRows(
      connections[0],
      'SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()',
    );
    if (triggers.length) throw new Error('Rehearsal triggers are not permitted.');
    // Strong current-target invariant: only canonical reference rows may pre-exist.
    // This prevents fixture cascades touching an unobserved business/customer row.
    for (const table of desired.tables) {
      if (['plans', 'plan_entitlements'].includes(table.name)) continue;
      if (!/^[A-Za-z0-9_]+$/.test(table.name))
        throw new Error('Invalid canonical table identifier.');
      const rows = await queryRows(connections[0], `SELECT 1 FROM \`${table.name}\` LIMIT 1`);
      if (rows.length) throw new Error(`Rehearsal requires empty business tables: ${table.name}.`);
    }
    const evidence = {
      mode,
      modelDigest: desired.digest,
      manifestDigest: manifest.manifestDigest,
      migrationCount: history.length,
      head: history[history.length - 1]?.filename,
      schema: physical,
      identity: await queryRows(
        connections[0],
        'SELECT VERSION() version,DATABASE() selected_database,@@version_comment version_comment,@@session.time_zone time_zone,@@system_time_zone system_time_zone,@@sql_mode sql_mode,@@lower_case_table_names lower_case_table_names,@@character_set_server character_set_server,@@collation_server collation_server,@@transaction_isolation transaction_isolation',
      ),
      checks: await queryRows(
        connections[0],
        "SELECT CONSTRAINT_NAME,ENFORCED FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_TYPE='CHECK' ORDER BY CONSTRAINT_NAME",
      ),
      variables: await queryRows(
        connections[0],
        "SHOW VARIABLES WHERE Variable_name IN ('sql_generate_invisible_primary_key','sql_require_primary_key','innodb_default_row_format','innodb_page_size','max_allowed_packet','foreign_key_checks','check_constraint_checks','explicit_defaults_for_timestamp','character_set_connection','collation_connection','time_zone','system_time_zone')",
      ),
      plans: await queryRows(connections[0], 'SELECT * FROM plans ORDER BY id'),
      entitlements: await queryRows(connections[0], 'SELECT * FROM plan_entitlements ORDER BY id'),
    };
    initialized = true;
    return {
      evidence,
      run: async (index, probe, slots = []) => {
        if (closed || (index !== 0 && index !== 1) || ++statements > 256)
          throw new Error('Rehearsal closed or probe budget exceeded.');
        checkApproval();
        const statement = compileRehearsalProbe(probe, slots, nonce);
        const mutates = /^(INSERT|UPDATE|DELETE)\b/.test(statement.sql);
        if (mode === 'preflight' && !/^(SELECT|WITH)\b/.test(statement.sql))
          throw new Error('Read-only rehearsal preflight refuses non-read probes.');
        // Mark before dispatch: a failed/ambiguous write still requires bounded cleanup.
        if (mutates) writeAttempted = true;
        return connections[index].query(statement.sql, statement.values);
      },
      end: async () => {
        if (closed) return;
        closed = true;
        try {
          if (!writeAttempted) return;
          for (const c of connections) await c.query('ROLLBACK');
          checkApproval();
          await connections[0].query('START TRANSACTION');
          for (const statement of rehearsalCleanup(nonce))
            await connections[0].query(statement.sql, statement.values);
          await connections[0].query('COMMIT');
        } finally {
          await Promise.all(connections.map(c => c.end()));
        }
      },
    };
  } finally {
    if (!initialized) await Promise.all(connections.map(c => c.end()));
  }
}
