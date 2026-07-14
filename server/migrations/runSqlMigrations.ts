import { readFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { connect } from '@tidbcloud/serverless';
import mysql from 'mysql2/promise';
import { loadAppRuntimeEnv } from '../_core/runtimeBootstrap';

loadAppRuntimeEnv({ cwd: process.cwd() });

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
  /** Explicit, schema-verified history initialization. Never enabled by normal migration commands. */
  baselineThrough?: string;
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

  return withoutLineComments
    .split(';')
    .map(s => s.trim())
    .filter(statement => Boolean(statement) && executablePrefix.test(statement));
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

async function foreignKeyExists(
  connection: SqlConnection,
  tableName: string,
  constraintName: string,
): Promise<boolean> {
  const rows = await queryRows(
    connection,
    `
      SELECT COUNT(*) AS count_value
      FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = '${tableName.replace(/'/g, "''")}'
        AND constraint_name = '${constraintName.replace(/'/g, "''")}'
        AND constraint_type = 'FOREIGN KEY'
    `,
  );

  return Number(getRowValue(rows[0] ?? {}, 'count_value') ?? 0) > 0;
}

async function indexExists(
  connection: SqlConnection,
  tableName: string,
  indexName: string,
): Promise<boolean> {
  const rows = await queryRows(
    connection,
    `
      SELECT COUNT(*) AS count_value
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = '${tableName.replace(/'/g, "''")}'
        AND index_name = '${indexName.replace(/'/g, "''")}'
    `,
  );

  return Number(getRowValue(rows[0] ?? {}, 'count_value') ?? 0) > 0;
}

async function rewriteStatementForCurrentSchema(
  connection: SqlConnection,
  statement: string,
): Promise<string> {
  const dropForeignKeyMatch = statement.match(
    /^\s*ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+DROP\s+FOREIGN\s+KEY\s+`?([a-zA-Z0-9_]+)`?\s*,\s*([\s\S]+)$/i,
  );

  if (!dropForeignKeyMatch) {
    return statement;
  }

  const [, tableName, constraintName, remainingClause] = dropForeignKeyMatch;
  const hasConstraint = await foreignKeyExists(connection, tableName, constraintName);

  if (hasConstraint) {
    return statement;
  }

  return `ALTER TABLE \`${tableName}\`\n${remainingClause.trim()}`;
}

async function rewriteIndexStatementForCurrentSchema(
  connection: SqlConnection,
  statement: string,
): Promise<string> {
  const dropIndexMatch = statement.match(
    /^\s*ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+DROP\s+INDEX\s+`?([a-zA-Z0-9_]+)`?\s*(?:,\s*([\s\S]+))?$/i,
  );

  if (!dropIndexMatch) {
    return statement;
  }

  const [, tableName, indexName, remainingClause] = dropIndexMatch;
  const hasIndex = await indexExists(connection, tableName, indexName);

  if (hasIndex) {
    return statement;
  }

  if (!remainingClause?.trim()) {
    return '';
  }

  return `ALTER TABLE \`${tableName}\`\n${remainingClause.trim()}`;
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

async function columnExists(
  connection: SqlConnection,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const rows = await queryRows(
    connection,
    `
      SELECT COUNT(*) AS count_value
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = '${tableName.replace(/'/g, "''")}'
        AND column_name = '${columnName.replace(/'/g, "''")}'
    `,
  );

  return Number(getRowValue(rows[0] ?? {}, 'count_value') ?? 0) > 0;
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

export function isLegacyShowingsBackfillStatement(statement: string): boolean {
  return /update\s+showings\s+s[\s\S]*p\.sourceListingId\s*=\s*s\.listingId/i.test(statement);
}

export function isDistributionCommissionBackfillStatement(statement: string): boolean {
  return (
    /update\s+`?distribution_deals`?\s+d[\s\S]*from\s+`?distribution_commission_entries`?\s+ce/i.test(
      statement,
    ) && /referrer_commission_amount/i.test(statement)
  );
}

function shouldIgnoreStatementError(error: unknown, statement?: string): boolean {
  const message = String((error as any)?.message ?? '');
  const code = String((error as any)?.code ?? '');

  if (
    message.includes('Duplicate column') ||
    message.includes('Duplicate key name') ||
    message.includes('Duplicate foreign key constraint name') ||
    message.includes('already exists')
  ) {
    return true;
  }

  if (
    code === 'ER_BAD_FIELD_ERROR' &&
    /^\s*ALTER\s+TABLE\s+`?[a-zA-Z0-9_]+`?\s+RENAME\s+COLUMN\s+/i.test(statement ?? '')
  ) {
    return true;
  }

  return ['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_FK_DUP_NAME'].includes(code);
}

async function shouldSkipStatementForMissingPrereq(
  connection: SqlConnection,
  fileName: string,
  statement: string,
  tableExistsCache: Map<string, boolean>,
): Promise<string | null> {
  if (
    fileName === '0006_add_agent_os_inventory_bridge.sql' &&
    isLegacyShowingsBackfillStatement(statement)
  ) {
    const hasLegacyListingColumn = await columnExists(connection, 'showings', 'listingId');
    if (!hasLegacyListingColumn) {
      return 'missing column showings.listingId';
    }
  }

  if (
    fileName === '0039_add_distribution_dual_commission_tracks.sql' &&
    isDistributionCommissionBackfillStatement(statement)
  ) {
    const hasCommissionEntries = await tableExists(
      connection,
      'distribution_commission_entries',
      tableExistsCache,
    );
    if (!hasCommissionEntries) {
      return 'missing table distribution_commission_entries';
    }
  }

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

async function hasHistoricalCustomSqlEffects(connection: SqlConnection): Promise<boolean> {
  // These tables are introduced by the custom SQL stream rather than Drizzle's base schema.
  const rows = await queryRows(connection, `
    SELECT COUNT(*) AS count_value
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN ('plan_entitlements', 'subscriptions', 'seller_prospects', 'seller_mandate_operations', 'agency_commission_settlements')
  `);
  return Number(getRowValue(rows[0] ?? {}, 'count_value') ?? 0) > 0;
}

async function recordMigration(connection: SqlConnection, fileName: string, checksum: string, durationMs: number) {
  const numericVersion = Number.parseInt(fileName.match(/^(\d+)/)?.[1] ?? '', 10);
  if (!Number.isInteger(numericVersion)) throw new Error(`Malformed SQL migration filename "${fileName}".`);
  // Historical files have duplicate numeric prefixes, so the stable identity is the full stem plus numeric prefix.
  const version = fileName.replace(/\.sql$/, '');
  await connection.execute(
    `INSERT INTO \`${MIGRATION_HISTORY_TABLE}\` (numeric_version, version, filename, checksum, duration_ms, runtime_env) VALUES (${numericVersion}, ${JSON.stringify(version)}, ${JSON.stringify(fileName)}, ${JSON.stringify(checksum)}, ${Math.max(0, Math.round(durationMs))}, ${JSON.stringify(process.env.NODE_ENV || 'development')})`,
  );
}

type SchemaWitness = { kind: 'table' | 'column' | 'index' | 'foreignKey'; table: string; name?: string };

function schemaWitnesses(sql: string): SchemaWitness[] {
  const witnesses: SchemaWitness[] = [];
  const add = (witness: SchemaWitness) => {
    if (!witnesses.some(candidate => candidate.kind === witness.kind && candidate.table === witness.table && candidate.name === witness.name)) witnesses.push(witness);
  };
  for (const match of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/gi)) add({ kind: 'table', table: match[1] });
  for (const match of sql.matchAll(/ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+(?:[\s\S]*?\s)?ADD\s+(?:COLUMN\s+)?`?([a-zA-Z0-9_]+)`?\s/gi)) add({ kind: 'column', table: match[1], name: match[2] });
  for (const match of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+`?([a-zA-Z0-9_]+)`?\s+ON\s+`?([a-zA-Z0-9_]+)`?/gi)) add({ kind: 'index', table: match[2], name: match[1] });
  for (const match of sql.matchAll(/ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?[\s\S]*?ADD\s+CONSTRAINT\s+`?([a-zA-Z0-9_]+)`?\s+FOREIGN\s+KEY/gi)) add({ kind: 'foreignKey', table: match[1], name: match[2] });
  return witnesses;
}

async function schemaWitnessExists(connection: SqlConnection, witness: SchemaWitness): Promise<boolean> {
  if (witness.kind === 'table') return tableExists(connection, witness.table, new Map());
  const source = witness.kind === 'column' ? 'columns' : witness.kind === 'index' ? 'statistics' : 'table_constraints';
  const nameColumn = witness.kind === 'column' ? 'column_name' : witness.kind === 'index' ? 'index_name' : 'constraint_name';
  const rows = await queryRows(connection, `SELECT COUNT(*) AS count_value FROM information_schema.${source} WHERE table_schema = DATABASE() AND table_name = ${JSON.stringify(witness.table)} AND ${nameColumn} = ${JSON.stringify(witness.name)}`);
  return Number(getRowValue(rows[0] ?? {}, 'count_value') ?? 0) > 0;
}

async function baselineMigration(connection: SqlConnection, fileName: string, sql: string) {
  const witnesses = schemaWitnesses(sql);
  if (witnesses.length === 0) throw new Error(`Cannot baseline ${fileName}: no structural schema witnesses were found. Add a migration-specific verifier rather than marking it applied.`);
  const missing: string[] = [];
  for (const witness of witnesses) if (!await schemaWitnessExists(connection, witness)) missing.push(`${witness.kind}:${witness.table}${witness.name ? `.${witness.name}` : ''}`);
  if (missing.length) throw new Error(`Cannot baseline ${fileName}: expected schema effects are missing (${missing.join(', ')}).`);
  await recordMigration(connection, fileName, migrationChecksum(sql), 0);
  console.log(`   - Baselined: ${fileName} (${witnesses.length} schema witness(es) verified)`);
}

export async function runSqlMigrations(options?: SqlMigrationOptions) {
  const migrationsDir = options?.migrationsDir ?? __dirname;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && !options?.connection) {
    throw new Error('DATABASE_URL is required to run SQL migrations');
  }

  const mysqlDialect = databaseUrl ? isMysqlUrl(databaseUrl) : true;
  const connection = options?.connection ?? await createSqlConnection(databaseUrl!);
  const ownsConnection = !options?.connection;
  const tableExistsCache = new Map<string, boolean>();

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

    if (sqlFiles.length === 0) {
      console.log('   - No SQL migration files found');
      return;
    }

    console.log(`   Found ${orderedSqlFiles.length} migration file(s)`);

    if (options?.baselineThrough) {
      if (!['development', 'test'].includes(process.env.NODE_ENV || 'development')) {
        throw new Error('Schema baselining is permitted only for development or test databases. It is never available for staging or production.');
      }
      if (appliedMigrations.size > 0) throw new Error('Baseline requires an empty custom SQL migration history. It is not a repair mechanism for partial history.');
      const boundary = Number.parseInt(options.baselineThrough, 10);
      const baselineFiles = orderedSqlFiles.filter(file => Number.parseInt(file.match(/^(\d+)/)?.[1] ?? '0', 10) <= boundary);
      if (baselineFiles.length === 0) throw new Error(`No migration files found through baseline boundary ${options.baselineThrough}.`);
      console.log(`   Explicit baseline through ${options.baselineThrough}; verifying schema before recording history.`);
      for (const file of baselineFiles) await baselineMigration(connection, file, readFileSync(join(migrationsDir, file), 'utf-8'));
      console.log('SQL migration baseline completed\n');
      return;
    }

    if (appliedMigrations.size === 0 && await hasHistoricalCustomSqlEffects(connection)) {
      throw new Error('Custom SQL migration history is empty but historical custom schema effects exist. Refusing to replay migrations; run the explicit, schema-verified baseline workflow first.');
    }

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
      let skippedCount = 0;

      for (const statement of statements) {
        const mysqlNormalizedStatement = mysqlDialect ? normalizeStatementForMysql(statement) : statement;
        const foreignKeyAdjustedStatement = mysqlDialect
          ? await rewriteStatementForCurrentSchema(connection, mysqlNormalizedStatement)
          : mysqlNormalizedStatement;
        const executableStatement = mysqlDialect
          ? await rewriteIndexStatementForCurrentSchema(connection, foreignKeyAdjustedStatement)
          : foreignKeyAdjustedStatement;
        if (!executableStatement.trim()) {
          skippedCount += 1;
          console.log(`     -> skipped statement (${statementPreview(mysqlNormalizedStatement)})`);
          continue;
        }
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
          if (shouldIgnoreStatementError(error, executableStatement)) {
            skippedCount += 1;
            console.log(`     -> skipped statement (${statementPreview(executableStatement)})`);
            continue;
          }

          console.error(`   Failed: ${file}`);
          console.error(`   Statement: ${statementPreview(executableStatement, 260)}`);
          throw error;
        }
      }

      await recordMigration(connection, file, checksum, Date.now() - startedAt);
      console.log(`   Applied: ${file} (executed=${executedCount}, skipped=${skippedCount})`);
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
  const baselineThrough = process.argv.find(argument => argument.startsWith('--baseline-through='))?.split('=', 2)[1];
  runSqlMigrations({ baselineThrough })
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
