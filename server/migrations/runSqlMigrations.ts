import { readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { connect } from '@tidbcloud/serverless';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test', override: true });
}
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production', override: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDirectExecution = Boolean(process.argv[1]) && resolve(process.argv[1]) === __filename;

type SqlConnection = {
  execute: (statement: string) => Promise<any>;
  end?: () => Promise<void>;
};

function isMysqlUrl(url: string): boolean {
  return /^mysql:\/\//i.test(url);
}

function parseBooleanQueryParam(value: string | null): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

export function buildMysqlMigrationConnectionConfig(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl);
  const sslParam = parsedUrl.searchParams.get('ssl');
  const rejectUnauthorizedParam = parsedUrl.searchParams.get('rejectUnauthorized');
  const sslAcceptParam = parsedUrl.searchParams.get('sslaccept');

  parsedUrl.searchParams.delete('ssl');
  parsedUrl.searchParams.delete('rejectUnauthorized');
  parsedUrl.searchParams.delete('sslaccept');

  const explicitRejectUnauthorized = parseBooleanQueryParam(rejectUnauthorizedParam);
  const normalizedSslAccept = sslAcceptParam?.trim().toLowerCase();
  let sslConfig: Record<string, unknown> = { rejectUnauthorized: false };

  if (sslParam) {
    const normalizedSslParam = sslParam.trim();
    const booleanSsl = parseBooleanQueryParam(normalizedSslParam);

    if (typeof booleanSsl === 'boolean') {
      sslConfig = {
        rejectUnauthorized: explicitRejectUnauthorized ?? booleanSsl,
      };
    } else if (normalizedSslParam.startsWith('{') || normalizedSslParam.startsWith('[')) {
      try {
        const parsedSsl = JSON.parse(normalizedSslParam);
        if (parsedSsl && typeof parsedSsl === 'object' && !Array.isArray(parsedSsl)) {
          sslConfig = parsedSsl as Record<string, unknown>;
        }
      } catch {
        // Ignore invalid JSON and fall back to the default config below.
      }
    }
  }

  if (normalizedSslAccept === 'strict' || normalizedSslAccept === 'required') {
    sslConfig = { ...sslConfig, rejectUnauthorized: true };
  } else if (typeof explicitRejectUnauthorized === 'boolean') {
    sslConfig = { ...sslConfig, rejectUnauthorized: explicitRejectUnauthorized };
  }

  return {
    uri: parsedUrl.toString(),
    waitForConnections: true,
    connectionLimit: 4,
    maxIdle: 4,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: sslConfig,
  };
}

async function createSqlConnection(databaseUrl: string): Promise<SqlConnection> {
  if (isMysqlUrl(databaseUrl)) {
    const pool = mysql.createPool(buildMysqlMigrationConnectionConfig(databaseUrl));

    return {
      execute: statement => pool.query(statement),
      end: () => pool.end(),
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

  const executablePrefix = /^(alter|create|drop|update|insert|delete|replace|truncate|rename|set)\b/i;

  return withoutLineComments
    .split(';')
    .map(s => s.trim())
    .filter(statement => Boolean(statement) && executablePrefix.test(statement));
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

async function tableExists(
  connection: SqlConnection,
  tableName: string,
  cache: Map<string, boolean>,
): Promise<boolean> {
  const cached = cache.get(tableName);
  if (typeof cached === 'boolean') {
    return cached;
  }

  const rows = await queryRows(
    connection,
    `
      SELECT COUNT(*) AS count_value
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = '${tableName.replace(/'/g, "''")}'
    `,
  );

  const countValue = Number(getRowValue(rows[0] ?? {}, 'count_value') ?? 0);
  const exists = countValue > 0;
  cache.set(tableName, exists);
  return exists;
}

function statementPreview(statement: string, maxLength = 180): string {
  const flattened = statement.replace(/\s+/g, ' ').trim();
  if (flattened.length <= maxLength) return flattened;
  return `${flattened.slice(0, maxLength)}...`;
}

function normalizeStatementForMysql(statement: string): string {
  return statement
    .replace(/\bCREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\b/gi, 'CREATE INDEX')
    .replace(/\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/gi, 'ADD COLUMN');
}

function shouldIgnoreStatementError(error: unknown): boolean {
  const message = String((error as any)?.message ?? '');
  const code = String((error as any)?.code ?? '');

  if (
    message.includes('Duplicate column') ||
    message.includes('Duplicate key name') ||
    message.includes('Duplicate foreign key constraint name') ||
    message.includes('already exists') ||
    message.includes("Unknown column '") ||
    message.includes("doesn't exist in table") ||
    message.includes("Table '") ||
    message.includes("Can't DROP")
  ) {
    return true;
  }

  return [
    'ER_DUP_FIELDNAME',
    'ER_DUP_KEYNAME',
    'ER_NO_SUCH_TABLE',
    'ER_CANT_DROP_FIELD_OR_KEY',
    'ER_FK_DUP_NAME',
  ].includes(code);
}

async function shouldSkipStatementForMissingPrereq(
  connection: SqlConnection,
  fileName: string,
  statement: string,
  tableExistsCache: Map<string, boolean>,
): Promise<string | null> {
  if (
    fileName !== '0045_create_distribution_referral_accelerator.sql' &&
    fileName !== '0046_distribution_referral_assessment_locking.sql' &&
    fileName !== '0047_create_distribution_execution_tables.sql'
  ) {
    return null;
  }

  const lowerStatement = statement.toLowerCase();
  const requiredTables: string[] = [];

  if (lowerStatement.includes('distribution_deals')) {
    requiredTables.push('distribution_deals');
  }
  if (lowerStatement.includes('distribution_programs')) {
    requiredTables.push('distribution_programs');
  }
  if (lowerStatement.includes('affordability_assessments')) {
    requiredTables.push('affordability_assessments');
  }

  if (requiredTables.length === 0) {
    return null;
  }

  for (const tableName of requiredTables) {
    const exists = await tableExists(connection, tableName, tableExistsCache);
    if (!exists) {
      return `missing table ${tableName}`;
    }
  }

  return null;
}

async function runSqlMigrations() {
  const migrationsDir = __dirname;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run SQL migrations');
  }

  const mysqlDialect = isMysqlUrl(databaseUrl);
  const connection = await createSqlConnection(databaseUrl);
  const tableExistsCache = new Map<string, boolean>();

  try {
    console.log('Running SQL migrations...');

    const sqlFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (sqlFiles.length === 0) {
      console.log('   - No SQL migration files found');
      return;
    }

    console.log(`   Found ${sqlFiles.length} migration file(s)`);

    for (const file of sqlFiles) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');
      const statements = parseSqlStatements(sql);

      if (statements.length === 0) {
        console.log(`   - Skipped: ${file} (no executable SQL statements)`);
        continue;
      }

      console.log(`   - Applying: ${file} (${statements.length} statement(s))`);
      let executedCount = 0;
      let skippedCount = 0;

      for (const statement of statements) {
        const executableStatement = mysqlDialect
          ? normalizeStatementForMysql(statement)
          : statement;
        const skipReason = await shouldSkipStatementForMissingPrereq(
          connection,
          file,
          executableStatement,
          tableExistsCache,
        );
        if (skipReason) {
          skippedCount += 1;
          console.log(`     -> skipped statement (${skipReason})`);
          continue;
        }

        try {
          await connection.execute(executableStatement);
          executedCount += 1;
        } catch (error: any) {
          if (shouldIgnoreStatementError(error)) {
            skippedCount += 1;
            console.log(`     -> skipped statement (${statementPreview(executableStatement)})`);
            continue;
          }

          console.error(`   Failed: ${file}`);
          console.error(`   Statement: ${statementPreview(executableStatement, 260)}`);
          throw error;
        }
      }

      console.log(`   Applied: ${file} (executed=${executedCount}, skipped=${skippedCount})`);
    }

    console.log('SQL migrations completed\n');
  } catch (error) {
    console.error('SQL migration failed:', error);
    throw error;
  } finally {
    await connection.end?.();
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
