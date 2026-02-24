import { readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { connect } from '@tidbcloud/serverless';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test', override: true });
} else if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production', override: true });
}

// ESM-safe __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type MigrationDriver = 'mysql' | 'tidb-serverless';

interface MigrationExecutor {
  driver: MigrationDriver;
  execute: (statement: string) => Promise<void>;
  queryRows: (statement: string) => Promise<Array<Record<string, unknown>>>;
  close: () => Promise<void>;
}

type RequiredColumnsAssertion = {
  kind: 'columns';
  table: string;
  columns: string[];
};

type RequiredIndexesAssertion = {
  kind: 'indexes';
  table: string;
  indexes: string[];
};

export type SchemaAssertion = RequiredColumnsAssertion | RequiredIndexesAssertion;

export const onboardingV2SchemaAssertions: SchemaAssertion[] = [
  {
    kind: 'columns',
    table: 'users',
    columns: ['plan', 'trialStatus', 'trialStartedAt', 'trialEndsAt'],
  },
  {
    kind: 'columns',
    table: 'agents',
    columns: ['slug', 'profileCompletionScore', 'profileCompletionFlags', 'email'],
  },
  {
    kind: 'indexes',
    table: 'agents',
    indexes: ['uq_agents_slug', 'idx_agents_slug'],
  },
];

export const pricingGovernanceSchemaAssertions: SchemaAssertion[] = [
  {
    kind: 'columns',
    table: 'plans',
    columns: ['segment', 'price_monthly', 'trial_days', 'metadata'],
  },
  {
    kind: 'columns',
    table: 'plan_entitlements',
    columns: ['plan_id', 'feature_key', 'value_json'],
  },
  {
    kind: 'indexes',
    table: 'plan_entitlements',
    indexes: ['uq_plan_entitlements_plan_feature', 'idx_plan_entitlements_plan'],
  },
  {
    kind: 'columns',
    table: 'subscriptions',
    columns: [
      'owner_type',
      'owner_id',
      'plan_id',
      'status',
      'trial_ends_at',
      'billing_cycle_anchor',
    ],
  },
  {
    kind: 'indexes',
    table: 'subscriptions',
    indexes: ['uq_subscriptions_owner', 'idx_subscriptions_owner', 'idx_subscriptions_status'],
  },
  {
    kind: 'columns',
    table: 'agency_agent_memberships',
    columns: ['agency_id', 'agent_id', 'status', 'governance_mode', 'role'],
  },
  {
    kind: 'indexes',
    table: 'agency_agent_memberships',
    indexes: [
      'uq_agency_agent_memberships_pair',
      'idx_agency_agent_memberships_agency',
      'idx_agency_agent_memberships_agent',
    ],
  },
  {
    kind: 'columns',
    table: 'managerial_audit_logs',
    columns: ['actor_user_id', 'action', 'target_type', 'target_id'],
  },
  {
    kind: 'indexes',
    table: 'managerial_audit_logs',
    indexes: ['idx_managerial_audit_actor', 'idx_managerial_audit_target', 'idx_managerial_audit_created'],
  },
];

export const demandEngineSchemaAssertions: SchemaAssertion[] = [
  {
    kind: 'columns',
    table: 'demand_campaigns',
    columns: ['id', 'owner_type', 'owner_id', 'status', 'source_channel', 'distribution_mode'],
  },
  {
    kind: 'indexes',
    table: 'demand_campaigns',
    indexes: ['idx_demand_campaigns_owner', 'idx_demand_campaigns_status', 'idx_demand_campaigns_source'],
  },
  {
    kind: 'columns',
    table: 'demand_leads',
    columns: ['id', 'campaign_id', 'source_channel', 'status', 'buyer_name', 'buyer_email'],
  },
  {
    kind: 'indexes',
    table: 'demand_leads',
    indexes: ['idx_demand_leads_campaign', 'idx_demand_leads_status', 'idx_demand_leads_source'],
  },
  {
    kind: 'columns',
    table: 'demand_lead_matches',
    columns: ['id', 'demand_lead_id', 'campaign_id', 'lead_id', 'agent_id', 'match_score', 'confidence'],
  },
  {
    kind: 'indexes',
    table: 'demand_lead_matches',
    indexes: [
      'idx_demand_lead_matches_demand_lead',
      'idx_demand_lead_matches_lead',
      'idx_demand_lead_matches_campaign',
      'idx_demand_lead_matches_agent',
    ],
  },
  {
    kind: 'columns',
    table: 'demand_lead_assignments',
    columns: ['id', 'demand_lead_id', 'campaign_id', 'lead_id', 'assigned_agent_id', 'assignment_type'],
  },
  {
    kind: 'indexes',
    table: 'demand_lead_assignments',
    indexes: [
      'idx_demand_lead_assignments_demand_lead',
      'idx_demand_lead_assignments_lead',
      'idx_demand_lead_assignments_campaign',
      'idx_demand_lead_assignments_agent',
      'idx_demand_lead_assignments_group',
    ],
  },
  {
    kind: 'columns',
    table: 'demand_unmatched_leads',
    columns: ['id', 'campaign_id', 'status', 'buyer_name', 'buyer_email', 'created_at'],
  },
  {
    kind: 'indexes',
    table: 'demand_unmatched_leads',
    indexes: ['idx_demand_unmatched_campaign', 'idx_demand_unmatched_status', 'idx_demand_unmatched_created'],
  },
  {
    kind: 'columns',
    table: 'plan_entitlements',
    columns: ['plan_id', 'feature_key', 'value_json'],
  },
];

export const exploreCanonicalSchemaAssertions: SchemaAssertion[] = [
  {
    kind: 'columns',
    table: 'explore_content',
    columns: [
      'id',
      'content_type',
      'reference_id',
      'actor_id',
      'creator_id',
      'creator_type',
      'title',
      'description',
      'thumbnail_url',
      'video_url',
      'metadata',
      'category',
      'duration_sec',
      'width',
      'height',
      'orientation',
      'view_count',
      'engagement_score',
      'is_active',
      'is_featured',
      'created_at',
      'updated_at',
    ],
  },
  {
    kind: 'indexes',
    table: 'explore_content',
    indexes: ['idx_explore_content_actor_id', 'idx_explore_content_category'],
  },
];

function resolveDriver(databaseUrl: string): MigrationDriver {
  if (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql2://')) {
    return 'mysql';
  }
  return 'tidb-serverless';
}

async function createExecutor(databaseUrl: string): Promise<MigrationExecutor> {
  const driver = resolveDriver(databaseUrl);

  if (driver === 'mysql') {
    const connection = await mysql.createConnection(databaseUrl);
    return {
      driver,
      execute: async statement => {
        await connection.query(statement);
      },
      queryRows: async statement => {
        const [rows] = await connection.query(statement);
        return rows as Record<string, unknown>[];
      },
      close: async () => {
        await connection.end();
      },
    };
  }

  const connection = connect({ url: databaseUrl });
  return {
    driver,
    execute: async statement => {
      await connection.execute(statement);
    },
    queryRows: async statement => {
      const result: any = await connection.execute(statement);
      if (Array.isArray(result)) {
        return result as Record<string, unknown>[];
      }
      if (Array.isArray(result?.rows)) {
        return result.rows as Record<string, unknown>[];
      }
      return [];
    },
    close: async () => {
      // Serverless driver does not require explicit close.
    },
  };
}

export function parseSqlStatements(sql: string): string[] {
  // Strip block comments and full-line "--" comments before splitting.
  // This avoids dropping the first real statement when a file starts with comments.
  const withoutBlockComments = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLineComments = withoutBlockComments
    .split('\n')
    .map(line => line.replace(/^\s*--.*$/, ''))
    .join('\n');

  return withoutLineComments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function sqlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function statementPreview(statement: string, maxLength = 120): string {
  const flattened = statement.replace(/\s+/g, ' ').trim();
  if (flattened.length <= maxLength) {
    return flattened;
  }
  return `${flattened.slice(0, maxLength)}...`;
}

function shouldIgnoreMigrationError(error: any): boolean {
  const message = String(error?.message ?? '');
  const code = String(error?.code ?? '');

  if (
    message.includes('Duplicate column') ||
    message.includes('Duplicate key name') ||
    message.includes('Duplicate foreign key constraint name') ||
    message.includes("Key column '") ||
    message.includes("doesn't exist in table") ||
    message.includes("Can't DROP") ||
    message.includes('check that column/key exists') ||
    message.includes("Unknown column 'lead_id'") ||
    message.includes('already exists')
  ) {
    return true;
  }

  return [
    'ER_DUP_FIELDNAME',
    'ER_DUP_KEYNAME',
    'ER_CANT_DROP_FIELD_OR_KEY',
    'ER_FK_DUP_NAME',
    'ER_TABLE_EXISTS_ERROR',
    'ER_KEY_COLUMN_DOES_NOT_EXIST',
    'ER_KEY_DOES_NOT_EXITS',
    'ER_KEY_DOES_NOT_EXIST',
    'ER_KEY_COLUMN_DOES_NOT_EXITS',
  ].includes(code);
}

function shouldRetryMigrationError(error: any): boolean {
  const message = String(error?.message ?? '');
  const code = String(error?.code ?? '');
  return (
    message.includes('Deadlock found when trying to get lock') ||
    message.includes('Lock wait timeout exceeded') ||
    code === 'ER_LOCK_DEADLOCK' ||
    code === 'ER_LOCK_WAIT_TIMEOUT'
  );
}

function getRowValue<T = unknown>(row: Record<string, unknown>, key: string): T | undefined {
  const upper = key.toUpperCase();
  const lower = key.toLowerCase();
  return (row[key] ?? row[upper] ?? row[lower]) as T | undefined;
}

export async function runSchemaAssertions(
  executor: Pick<MigrationExecutor, 'queryRows'>,
  assertions: SchemaAssertion[],
): Promise<void> {
  if (assertions.length === 0) return;

  const errors: string[] = [];

  for (const assertion of assertions) {
    if (assertion.kind === 'columns') {
      const expectedColumns = Array.from(new Set(assertion.columns)).sort();
      if (expectedColumns.length === 0) continue;
      const inClause = expectedColumns.map(sqlQuote).join(', ');
      const rows = await executor.queryRows(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
            AND table_name = ${sqlQuote(assertion.table)}
            AND column_name IN (${inClause})
        `,
      );
      const present = new Set(
        rows
          .map(row => getRowValue<string>(row, 'column_name'))
          .filter((name): name is string => typeof name === 'string'),
      );
      const missing = expectedColumns.filter(column => !present.has(column));
      if (missing.length > 0) {
        errors.push(`Missing columns in ${assertion.table}: ${missing.join(', ')}`);
      }
      continue;
    }

    const expectedIndexes = Array.from(new Set(assertion.indexes)).sort();
    if (expectedIndexes.length === 0) continue;
    const inClause = expectedIndexes.map(sqlQuote).join(', ');
    const rows = await executor.queryRows(
      `
        SELECT index_name
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = ${sqlQuote(assertion.table)}
          AND index_name IN (${inClause})
      `,
    );
    const present = new Set(
      rows
        .map(row => getRowValue<string>(row, 'index_name'))
        .filter((name): name is string => typeof name === 'string'),
    );
    const missing = expectedIndexes.filter(index => !present.has(index));
    if (missing.length > 0) {
      errors.push(`Missing indexes in ${assertion.table}: ${missing.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Migration self-check failed:\n - ${errors.join('\n - ')}`);
  }
}

async function runDistributionDriftPrecheck(executor: MigrationExecutor): Promise<void> {
  if (executor.driver !== 'mysql') {
    console.log('   - Distribution drift precheck skipped (only enabled for local mysql URLs).');
    return;
  }

  const distributionTables = (await executor.queryRows(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name LIKE 'distribution_%'
    `,
  )) as Array<{ table_name: string }>;

  if (distributionTables.length === 0) {
    console.log('   - Distribution drift precheck: no existing distribution tables found.');
    return;
  }

  const leadColumnRows = (await executor.queryRows(
    `
      SELECT COUNT(*) AS count_value
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'distribution_deals'
        AND column_name = 'lead_id'
    `,
  )) as Array<{ count_value: number }>;

  const legacyIndexRows = (await executor.queryRows(
    `
      SELECT table_name, index_name
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND index_name IN (
          'idx_distribution_program_active',
          'idx_distribution_deal_agent',
          'idx_distribution_deal_development',
          'idx_distribution_deal_stage',
          'idx_distribution_deal_commission_status',
          'ux_distribution_viewing_deal',
          'idx_distribution_viewing_program',
          'idx_distribution_viewing_development',
          'idx_distribution_viewing_agent',
          'idx_distribution_viewing_manager',
          'idx_distribution_viewing_start',
          'idx_distribution_viewing_status',
          'idx_distribution_commission_program',
          'idx_distribution_commission_agent',
          'idx_distribution_commission_status',
          'idx_distribution_manager_user',
          'idx_distribution_manager_development',
          'idx_distribution_manager_active'
        )
    `,
  )) as Array<{ table_name: string; index_name: string }>;

  const hasLegacyLead = Number(getRowValue<number>(leadColumnRows[0] ?? {}, 'count_value') ?? 0) > 0;

  if (!hasLegacyLead && legacyIndexRows.length === 0) {
    console.log('   - Distribution drift precheck: no legacy index/column drift detected.');
    return;
  }

  console.warn('   - Distribution drift precheck detected legacy schema artifacts:');
  if (hasLegacyLead) {
    console.warn("     * Legacy column: distribution_deals.lead_id");
  }
  for (const row of legacyIndexRows) {
    const tableName = getRowValue<string>(row, 'table_name') ?? 'unknown_table';
    const indexName = getRowValue<string>(row, 'index_name') ?? 'unknown_index';
    console.warn(`     * Legacy index: ${tableName}.${indexName}`);
  }
  console.warn('   - 0022 reconciliation migration will normalize this schema drift.');
}

/**
 * Run SQL migrations in order
 * Executes all .sql files in server/migrations/ directory
 */
export type RunSqlMigrationsOptions = {
  migrationsDir?: string;
  filePattern?: RegExp;
  schemaAssertions?: SchemaAssertion[];
};

export async function runSqlMigrations(options: RunSqlMigrationsOptions = {}) {
  const migrationsDir = options.migrationsDir ?? __dirname;
  const filePattern = options.filePattern ?? /\.sql$/;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run SQL migrations');
  }

  const executor = await createExecutor(databaseUrl);

  try {
    console.log('Running SQL migrations...');
    console.log(`   Driver: ${executor.driver}`);

    await runDistributionDriftPrecheck(executor);

    // Get all .sql files and sort them
    const sqlFiles = readdirSync(migrationsDir).filter(file => filePattern.test(file)).sort();

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
      let applied = 0;
      let skipped = 0;

      for (const statement of statements) {
        const maxAttempts = 3;
        let attempt = 1;
        while (true) {
          try {
            await executor.execute(statement);
            applied += 1;
            break;
          } catch (error: any) {
            if (shouldIgnoreMigrationError(error)) {
              skipped += 1;
              console.log(`     -> skipped statement (${statementPreview(statement)})`);
              break;
            }

            if (shouldRetryMigrationError(error) && attempt < maxAttempts) {
              const delayMs = 200 * attempt;
              console.warn(
                `     -> retrying statement after transient lock error (attempt ${attempt + 1}/${maxAttempts})`,
              );
              await new Promise(resolve => setTimeout(resolve, delayMs));
              attempt += 1;
              continue;
            }

            console.error(`   Failed: ${file}`);
            console.error(`   Statement: ${statementPreview(statement, 240)}`);
            throw error;
          }
        }
      }

      console.log(`   Applied: ${file} (executed=${applied}, skipped=${skipped})`);
    }

    if (options.schemaAssertions && options.schemaAssertions.length > 0) {
      console.log(`Running schema self-check (${options.schemaAssertions.length} assertion set(s))...`);
      await runSchemaAssertions(executor, options.schemaAssertions);
      console.log('Schema self-check passed');
    }

    console.log('SQL migrations completed\n');
  } catch (error) {
    console.error('SQL migration failed:', error);
    throw error;
  } finally {
    await executor.close();
  }
}

function isExecutedDirectly() {
  const entryArg = process.argv[1];
  if (!entryArg) return false;
  const entryUrl = pathToFileURL(resolve(entryArg)).href;
  return import.meta.url === entryUrl;
}

function parseCliOptions(argv: string[]): RunSqlMigrationsOptions {
  const options: RunSqlMigrationsOptions = {};
  const selfCheckArg = argv.find(arg => arg.startsWith('--self-check='));
  if (!selfCheckArg) {
    return options;
  }

  const profile = selfCheckArg.split('=')[1]?.trim().toLowerCase();
  if (profile === 'onboarding-v2') {
    options.schemaAssertions = onboardingV2SchemaAssertions;
    return options;
  }

  if (profile === 'pricing-governance') {
    options.schemaAssertions = pricingGovernanceSchemaAssertions;
    return options;
  }

  if (profile === 'demand-engine') {
    options.schemaAssertions = demandEngineSchemaAssertions;
    return options;
  }

  if (profile === 'explore-canonical') {
    options.schemaAssertions = exploreCanonicalSchemaAssertions;
    return options;
  }

  throw new Error(
    `Unknown self-check profile "${profile}". Supported profiles: onboarding-v2, pricing-governance, demand-engine, explore-canonical`,
  );
}

if (isExecutedDirectly()) {
  const cliOptions = parseCliOptions(process.argv.slice(2));
  runSqlMigrations(cliOptions)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
