import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const DATABASE_NAME = 'listify_listing_performance_e2e';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false, quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.playwright.local'), override: true, quiet: true });

export function fail(message: string): never {
  throw new Error(`Listing Performance E2E setup refused: ${message}`);
}

export function dedicatedDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const runtime = String(env.APP_ENV || env.NODE_ENV || '').toLowerCase();
  if (runtime !== 'development' && runtime !== 'test') fail('runtime must be explicitly development or test.');
  if (!env.LOCAL_DEMO_AGENCY_PASSWORD) fail('LOCAL_DEMO_AGENCY_PASSWORD is required.');
  if (!env.DATABASE_URL) fail('DATABASE_URL is required.');

  const source = new URL(env.DATABASE_URL);
  if (!LOCAL_HOSTS.has(source.hostname.toLowerCase())) fail('database host must be localhost.');
  if (/(production|staging|prod|stage)/i.test(source.hostname)) fail('non-local database hostname detected.');

  source.pathname = `/${DATABASE_NAME}`;
  return source.toString();
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, { cwd: process.cwd(), env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}.`);
}

async function verifyFeatureCleanup(databaseUrl: string) {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [rows] = await connection.query<Array<{ remaining: number }>>(
      "SELECT COUNT(*) AS remaining FROM listings WHERE title LIKE '[E2E Performance]%'",
    );
    if (Number(rows[0]?.remaining ?? 0) !== 0) {
      throw new Error('Listing Performance fixture cleanup left records behind.');
    }
  } finally {
    await connection.end();
  }
}

async function verifyBaselineResult(databaseUrl: string) {
  const connection = await mysql.createConnection(databaseUrl);

  try {
    const [ledger] = await connection.query<
      Array<{
        filename: string;
        application_mode: string;
      }>
    >(
      "SELECT filename, application_mode FROM sql_migration_history WHERE filename = '0000_canonical_launch_baseline.sql'",
    );

    const [column] = await connection.query<
      Array<{
        data_type: string;
        is_nullable: string;
      }>
    >(
      "SELECT data_type, is_nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'agency_listing_performance_reviews' AND column_name = 'contact_date'",
    );

    const columnType = String(
      column[0]?.data_type ?? '',
    ).toLowerCase();

    const nullable = String(
      column[0]?.is_nullable ?? '',
    ).toUpperCase();

    if (
      ledger.length !== 1 ||
      ledger[0]?.filename !==
        '0000_canonical_launch_baseline.sql' ||
      ledger[0]?.application_mode !== 'executed' ||
      column.length !== 1 ||
      columnType !== 'timestamp' ||
      nullable !== 'YES'
    ) {
      throw new Error(
        'Dedicated E2E canonical baseline verification failed for Listing Performance.',
      );
    }
  } finally {
    await connection.end();
  }
}

async function main() {
  const databaseUrl = dedicatedDatabaseUrl();
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    APP_ENV: 'development',
    DATABASE_URL: databaseUrl,
    LISTIFY_E2E_DATABASE_URL: databaseUrl,
    LISTIFY_LISTING_PERFORMANCE_E2E_DATABASE: DATABASE_NAME,
    LOCAL_SEED_ALLOWED: 'true',
  };

  let primaryError: unknown;
  try {
    run('pnpm', ['db:listing-performance-e2e:reset'], env);
    run('pnpm', ['exec', 'tsx', 'server/migrations/runSqlMigrations.ts'], env);
    await verifyBaselineResult(databaseUrl);
    run('pnpm', ['exec', 'tsx', 'server/scripts/localDemoSeed.ts', 'seed', 'e2e'], env);
    run('pnpm', ['exec', 'playwright', 'test', '--config', 'playwright.listing-performance.config.ts'], env);
    await verifyFeatureCleanup(databaseUrl);
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      run('pnpm', ['db:listing-performance-e2e:drop'], env);
    } catch (cleanupError) {
      if (!primaryError) primaryError = cleanupError;
    }
  }

  if (primaryError) throw primaryError;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
