import { readFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { connect } from '@tidbcloud/serverless';
import mysql from 'mysql2/promise';
import { loadAppRuntimeEnv } from '../_core/runtimeBootstrap';
import { buildMysqlConnectionSecurityConfig } from '../_core/databaseTls';

const { runtimeEnv } = loadAppRuntimeEnv({ cwd: process.cwd() });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDirectExecution = Boolean(process.argv[1]) && resolve(process.argv[1]) === __filename;

type SqlConnection = {
  execute: (statement: string) => Promise<any>;
  end?: () => Promise<void>;
};

const MIGRATION_LOCK_NAME = 'real_estate_portal_sql_migrations';
const MIGRATION_HISTORY_TABLE = 'sql_migration_history';

type AppliedMigration = { fileName: string; checksum: string };

export type SqlMigrationOptions = {
  filePattern?: RegExp;
  migrationsDir?: string;
  connection?: SqlConnection;
};

function isMysqlUrl(url: string): boolean {
  return /^mysql:\/\//i.test(url);
}


export function buildMysqlMigrationConnectionConfig(
  databaseUrl: string,
  environment: string = runtimeEnv,
) {
  return {
    ...buildMysqlConnectionSecurityConfig(
      databaseUrl,
      environment,
    ),
    waitForConnections: true,
    connectionLimit: 4,
    maxIdle: 4,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

async function createSqlConnection(databaseUrl: string): Promise<SqlConnection> {
  if (isMysqlUrl(databaseUrl)) {
    const connection = await mysql.createConnection(buildMysqlMigrationConnectionConfig(databaseUrl));

    return {
      execute: statement => connection.query(statement),
      end: () => connection.end(),
    };
  }

  return connect({ url: databaseUrl });
}

function parseSqlStatements(sql: string): string[] {
  const withoutBlockComments = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLineComments = withoutBlockComments
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(line => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('--') || trimmed.startsWith('#')) {
        return '';
      }
      return line;
    })
    .join('\n');

  const executablePrefix =
    /^(alter|create|drop|update|insert|delete|replace|truncate|rename|set|prepare|execute|deallocate)\b/i;

  const fragments = withoutLineComments
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  for (const fragment of fragments) {
    if (!executablePrefix.test(fragment)) {
      throw new Error(
        `Unsupported SQL migration statement: ${statementPreview(fragment)}`,
      );
    }
  }

  return fragments;
}

export function migrationChecksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

export function sortMigrationFiles(files: string[]): string[] {
  for (const file of files) {
    if (!/^\d{4}_[a-zA-Z0-9_]+\.sql$/.test(file)) {
      throw new Error(`Malformed SQL migration filename "${file}". Expected a four-digit numeric prefix followed by an underscore.`);
    }
  }
  return [...files].sort((left, right) => {
    const leftNumber = Number.parseInt(left.match(/^(\d+)/)?.[1] || '0', 10);
    const rightNumber = Number.parseInt(right.match(/^(\d+)/)?.[1] || '0', 10);
    return leftNumber - rightNumber || left.localeCompare(right);
  });
}

function getRowValue<T = unknown>(row: Record<string, unknown>, key: string): T | undefined {
  return (row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()]) as T | undefined;
}

async function queryRows(connection: SqlConnection, statement: string): Promise<Array<Record<string, unknown>>> {
  const result: any = await connection.execute(statement);
  if (Array.isArray(result?.[0])) {
    return result[0] as Array<Record<string, unknown>>;
  }
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }
  if (Array.isArray(result?.rows)) {
    return result.rows as Array<Record<string, unknown>>;
  }
  return [];
}

async function acquireMigrationLock(connection: SqlConnection) {
  const rows = await queryRows(connection, `SELECT GET_LOCK('${MIGRATION_LOCK_NAME}', 30) AS lock_status`);
  const lockStatus = Number(getRowValue(rows[0] ?? {}, 'lock_status') ?? 0);

  if (lockStatus !== 1) {
    throw new Error(`Failed to acquire migration lock "${MIGRATION_LOCK_NAME}" within 30 seconds.`);
  }
}

async function releaseMigrationLock(connection: SqlConnection) {
  try {
    await connection.execute(`DO RELEASE_LOCK('${MIGRATION_LOCK_NAME}')`);
  } catch (error) {
    console.warn(`[Migrations] Failed to release migration lock ${MIGRATION_LOCK_NAME}`, error);
  }
}

function statementPreview(statement: string, maxLength = 180): string {
  const flattened = statement.replace(/\s+/g, ' ').trim();
  if (flattened.length <= maxLength) return flattened;
  return `${flattened.slice(0, maxLength)}...`;
}

async function ensureMigrationHistoryTable(connection: SqlConnection) {
  await connection.execute(`CREATE TABLE IF NOT EXISTS \`${MIGRATION_HISTORY_TABLE}\` (
    \`numeric_version\` int NOT NULL,
    \`version\` varchar(255) NOT NULL,
    \`filename\` varchar(255) NOT NULL,
    \`checksum\` char(64) NOT NULL,
    \`applied_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`duration_ms\` int NULL,
    \`runtime_env\` varchar(32) NULL,
    PRIMARY KEY (\`filename\`),
    UNIQUE KEY \`uq_sql_migration_history_version\` (\`version\`)
  )`);
}

async function readAppliedMigrations(connection: SqlConnection): Promise<Map<string, AppliedMigration>> {
  const rows = await queryRows(connection, `SELECT filename, checksum FROM \`${MIGRATION_HISTORY_TABLE}\` ORDER BY filename`);
  return new Map(rows.map(row => {
    const fileName = String(getRowValue(row, 'filename') || '');
    return [fileName, { fileName, checksum: String(getRowValue(row, 'checksum') || '') }];
  }));
}

const CANONICAL_BASELINE_FILE = '0000_canonical_launch_baseline.sql';

async function countApplicationTables(connection: SqlConnection): Promise<number> {
  const rows = await queryRows(
    connection,
    `
      SELECT COUNT(*) AS count_value
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name <> '${MIGRATION_HISTORY_TABLE}'
    `,
  );

  return Number(getRowValue(rows[0] ?? {}, 'count_value') ?? 0);
}

export function canonicalBaselineCutoverError(
  orderedSqlFiles: string[],
  appliedFileNames: string[],
  applicationTableCount: number,
): string | null {
  if (
    orderedSqlFiles.length === 0 ||
    orderedSqlFiles[0] !== CANONICAL_BASELINE_FILE
  ) {
    return (
      `Canonical SQL authority requires ${CANONICAL_BASELINE_FILE} ` +
      'as the first active migration.'
    );
  }

  const activeFiles = new Set(orderedSqlFiles);
  const retiredLedgerFiles = appliedFileNames.filter(
    fileName => !activeFiles.has(fileName),
  );

  if (retiredLedgerFiles.length > 0) {
    return (
      'The database contains migration history from the retired ' +
      `pre-canonical SQL chain (${retiredLedgerFiles.join(', ')}). ` +
      'Refusing an implicit upgrade. Rebuild the database from the ' +
      'canonical launch baseline.'
    );
  }

  const baselineApplied = appliedFileNames.includes(
    CANONICAL_BASELINE_FILE,
  );

  if (!baselineApplied && appliedFileNames.length > 0) {
    return (
      `The canonical baseline ${CANONICAL_BASELINE_FILE} is absent, ` +
      'but migration history already exists. Refusing an implicit ' +
      'upgrade. Rebuild the database from the canonical launch baseline.'
    );
  }

  if (!baselineApplied && applicationTableCount > 0) {
    return (
      `The canonical baseline ${CANONICAL_BASELINE_FILE} is absent, ` +
      `but the database already contains ${applicationTableCount} ` +
      'application table(s). Refusing to overlay the consolidated ' +
      'baseline. Rebuild the database explicitly.'
    );
  }

  return null;
}

async function recordMigration(
  connection: SqlConnection,
  fileName: string,
  checksum: string,
  durationMs: number,
) {
  const numericVersion = Number.parseInt(
    fileName.match(/^(\d+)/)?.[1] ?? '',
    10,
  );

  if (!Number.isInteger(numericVersion)) {
    throw new Error(
      `Malformed SQL migration filename "${fileName}".`,
    );
  }

  const version = fileName.replace(/\.sql$/, '');

  await connection.execute(
    `INSERT INTO \`${MIGRATION_HISTORY_TABLE}\` ` +
    '(numeric_version, version, filename, checksum, duration_ms, runtime_env) ' +
    `VALUES (` +
    `${numericVersion}, ` +
    `${JSON.stringify(version)}, ` +
    `${JSON.stringify(fileName)}, ` +
    `${JSON.stringify(checksum)}, ` +
    `${Math.max(0, Math.round(durationMs))}, ` +
    `${JSON.stringify(process.env.NODE_ENV || 'development')})`,
  );
}

export async function runSqlMigrations(options?: SqlMigrationOptions) {
  const migrationsDir = options?.migrationsDir ?? __dirname;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && !options?.connection) {
    throw new Error('DATABASE_URL is required to run SQL migrations');
  }

  const connection = options?.connection ?? await createSqlConnection(databaseUrl!);
  const ownsConnection = !options?.connection;

  try {
    console.log('Running SQL migrations...');
    await acquireMigrationLock(connection);
    console.log(`   Migration lock acquired: ${MIGRATION_LOCK_NAME}`);
    await ensureMigrationHistoryTable(connection);
    const appliedMigrations = await readAppliedMigrations(connection);

    const filePattern = options?.filePattern ?? /\.sql$/;
    const sqlFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => filePattern.test(file))
    const orderedSqlFiles = sortMigrationFiles(sqlFiles);

    const baselineApplied = appliedMigrations.has(
      CANONICAL_BASELINE_FILE,
    );

    const applicationTableCount = baselineApplied
      ? 0
      : await countApplicationTables(connection);

    const cutoverError = canonicalBaselineCutoverError(
      orderedSqlFiles,
      [...appliedMigrations.keys()],
      applicationTableCount,
    );

    if (cutoverError) {
      throw new Error(cutoverError);
    }

    if (sqlFiles.length === 0) {
      console.log('   - No SQL migration files found');
      return;
    }

    console.log(`   Found ${orderedSqlFiles.length} migration file(s)`);

    for (const file of orderedSqlFiles) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');
      const checksum = migrationChecksum(sql);
      const applied = appliedMigrations.get(file);
      if (applied) {
        if (applied.checksum !== checksum) throw new Error(`Checksum mismatch for applied SQL migration ${file}. Historical migration files must not be changed.`);
        console.log(`   - Skipped: ${file} (already applied)`);
        continue;
      }
      const statements = parseSqlStatements(sql);

      if (statements.length === 0) {
        await recordMigration(connection, file, checksum, 0);
        console.log(`   - Applied: ${file} (no executable SQL statements)`);
        continue;
      }

      console.log(`   - Applying: ${file} (${statements.length} statement(s))`);
      const startedAt = Date.now();
      let executedCount = 0;

      for (const statement of statements) {
        try {
          await connection.execute(statement);
          executedCount += 1;
        } catch (error) {
          console.error(`   Failed: ${file}`);
          console.error(
            `   Statement: ${statementPreview(statement, 260)}`,
          );
          throw error;
        }
      }

      await recordMigration(connection, file, checksum, Date.now() - startedAt);
      console.log(`   Applied: ${file} (executed=${executedCount})`);
    }

    console.log('SQL migrations completed\n');
  } catch (error) {
    console.error('SQL migration failed:', error);
    throw error;
  } finally {
    await releaseMigrationLock(connection);
    if (ownsConnection) await connection.end?.();
  }
}

if (isDirectExecution) {
  runSqlMigrations()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
