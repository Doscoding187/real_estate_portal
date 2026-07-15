import { createHash } from 'node:crypto';
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { ProspectJourneyChildError, ProspectJourneyProcessRunner } from './prospectJourneyProcessRunner';

export const PROSPECT_JOURNEY_E2E_DATABASE = 'listify_prospect_journey_e2e';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false, quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.playwright.local'), override: true, quiet: true });

export function prospectJourneyDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const runtime = String(env.APP_ENV || env.NODE_ENV || '').toLowerCase();
  if (runtime !== 'development' && runtime !== 'test') throw new Error('Prospect Journey E2E refused: runtime must be development or test.');
  if (!env.DATABASE_URL) throw new Error('Prospect Journey E2E refused: DATABASE_URL is required.');
  if (!env.LOCAL_DEMO_AGENCY_PASSWORD) throw new Error('Prospect Journey E2E refused: LOCAL_DEMO_AGENCY_PASSWORD is required.');
  const url = new URL(env.DATABASE_URL);
  if (!LOCAL_HOSTS.has(url.hostname.toLowerCase())) throw new Error('Prospect Journey E2E refused: database host must be local.');
  if (/production|staging|prod|stage/i.test(String(env.NODE_ENV || '') + String(env.APP_ENV || '') + url.hostname)) throw new Error('Prospect Journey E2E refused: production/staging target detected.');
  url.pathname = `/${PROSPECT_JOURNEY_E2E_DATABASE}`;
  return url.toString();
}

const RUN_LOCK = '/tmp/prospect-journey-e2e.lock';
const runner = new ProspectJourneyProcessRunner();

function acquireRunLock() {
  if (existsSync(RUN_LOCK)) {
    const existingPid = Number(readFileSync(RUN_LOCK, 'utf8').trim());
    try {
      if (Number.isInteger(existingPid) && existingPid > 0) {
        process.kill(existingPid, 0);
        throw new Error(`Prospect Journey E2E refused: harness run ${existingPid} is already active.`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('already active')) throw error;
      unlinkSync(RUN_LOCK);
    }
  }
  const descriptor = openSync(RUN_LOCK, 'wx', 0o600);
  try { writeFileSync(descriptor, `${process.pid}\n`); } finally { closeSync(descriptor); }
}

function releaseRunLock() {
  try { unlinkSync(RUN_LOCK); } catch (error: any) { if (error?.code !== 'ENOENT') throw error; }
}

async function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  try {
    const result = await runner.run(command, args, {
      cwd: process.cwd(),
      env,
      onChildStart: pid => console.log(`[Prospect Journey E2E] started pid=${pid ?? 'unknown'}: ${command} ${args.join(' ')}`),
    });
    const report = result.output.split(/\r?\n/).filter(line => line.trim() && !line.includes('applying migrations...')).slice(-80).join('\n');
    if (report) console.log(report);
  } catch (error) {
    if (error instanceof ProspectJourneyChildError) {
      const report = error.result.output.split(/\r?\n/).filter(line => line.trim()).slice(-80).join('\n');
      if (report) console.error(report);
    }
    throw error;
  }
}

async function verifyMigration(url: string) {
  const connection = await mysql.createConnection(url);
  try {
    const [ledger] = await connection.query<mysql.RowDataPacket[]>("SELECT filename, checksum, application_mode FROM sql_migration_history WHERE filename = '0073_create_prospect_journey_tracker_mvp.sql'");
    const checksum = createHash('sha256').update(readFileSync(path.join(process.cwd(), 'server/migrations/0073_create_prospect_journey_tracker_mvp.sql'))).digest('hex');
    const [tables] = await connection.query<mysql.RowDataPacket[]>("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('prospect_identities', 'prospect_action_attributions', 'prospect_action_claim_tokens')");
    const [columns] = await connection.query<mysql.RowDataPacket[]>("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND ((table_name = 'leads' AND column_name = 'prospect_identity_id') OR (table_name = 'showings' AND column_name = 'prospect_identity_id'))");
    if (ledger.length !== 1 || ledger[0].checksum !== checksum || ledger[0].application_mode !== 'executed' || tables.length !== 3 || columns.length !== 2) throw new Error('Prospect Journey E2E migration witness failed.');
  } finally { await connection.end(); }
}

async function verifyNoMigrationLock(url: string) {
  const connection = await mysql.createConnection(url);
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>("SELECT IS_USED_LOCK('real_estate_portal_sql_migrations') AS lock_owner");
    if (rows[0]?.lock_owner !== null) throw new Error('Prospect Journey E2E migration lock is still held.');
  } finally { await connection.end(); }
}

async function verifyDatabaseAbsent(url: string) {
  const admin = new URL(url); admin.pathname = '/';
  const connection = await mysql.createConnection(admin.toString());
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count_value FROM information_schema.schemata WHERE schema_name = ?', [PROSPECT_JOURNEY_E2E_DATABASE]);
    if (Number(rows[0]?.count_value ?? 0) !== 0) throw new Error('Prospect Journey E2E database was not removed during cleanup.');
  } finally { await connection.end(); }
}

async function main() {
  const setupOnly = process.argv.includes('--setup-only');
  const securityOnly = process.argv.includes('--security-only');
  const authOnly = process.argv.includes('--auth-only');
  const crossAgencyOnly = process.argv.includes('--cross-agency-only');
  const databaseUrl = prospectJourneyDatabaseUrl();
  // Drizzle's animated TTY spinner can overwhelm buffered parent streams.
  // CI keeps this disposable, non-interactive workflow line-oriented.
  const env = { ...process.env, CI: '1', NODE_ENV: 'development', APP_ENV: 'development', DATABASE_URL: databaseUrl, LISTIFY_E2E_DATABASE_URL: databaseUrl, LISTIFY_PROSPECT_JOURNEY_E2E_DATABASE: PROSPECT_JOURNEY_E2E_DATABASE, LOCAL_SEED_ALLOWED: 'true' };
  acquireRunLock();
  let primaryError: unknown;
  let cleanupError: unknown;
  let cleanupPromise: Promise<void> | null = null;
  const cleanup = () => cleanupPromise ??= (async () => {
    try {
      await runner.stop();
      await run('pnpm', ['db:prospect-journey-e2e:drop'], env);
      await verifyDatabaseAbsent(databaseUrl);
    } catch (error) {
      cleanupError = error;
    } finally {
      releaseRunLock();
    }
  })();
  const signal = (name: string) => {
    primaryError = primaryError || new Error(`Prospect Journey E2E interrupted by ${name}.`);
    void cleanup().finally(() => {
      console.error(primaryError instanceof Error ? primaryError.message : String(primaryError));
      if (cleanupError) console.error(`Prospect Journey E2E cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      process.exit(1);
    });
  };
  process.once('SIGINT', () => signal('SIGINT')); process.once('SIGTERM', () => signal('SIGTERM'));
  try {
    await run('pnpm', ['db:prospect-journey-e2e:reset'], env);
    await run('pnpm', ['exec', 'drizzle-kit', 'migrate', '--config', 'drizzle.config.ts'], env);
    await run('pnpm', ['exec', 'tsx', 'server/migrations/runSqlMigrations.ts'], env);
    await verifyMigration(databaseUrl);
    await verifyNoMigrationLock(databaseUrl);
    if (!setupOnly) {
      await run('pnpm', ['exec', 'tsx', 'server/scripts/localDemoSeed.ts', 'seed', 'prospect-journey-e2e'], env);
      if (crossAgencyOnly) {
        await run('pnpm', ['exec', 'tsx', 'scripts/verify-prospect-journey-cross-agency.ts'], env);
      } else {
        await run('pnpm', ['exec', 'tsx', 'scripts/verify-prospect-journey-security.ts'], env);
      }
      if (!securityOnly && !crossAgencyOnly) {
        await run('pnpm', ['exec', 'tsx', 'scripts/verify-prospect-journey-auth.ts'], env);
      }
      if (!securityOnly && !authOnly && !crossAgencyOnly) await run('pnpm', ['exec', 'playwright', 'test', '--config', 'playwright.prospect-journey.config.ts'], env);
    }
  } catch (error) { primaryError = error; } finally { await cleanup(); }
  if (primaryError && cleanupError) throw new AggregateError([primaryError, cleanupError], String(primaryError));
  if (primaryError) throw primaryError;
  if (cleanupError) throw cleanupError;
  console.log(`[Prospect Journey E2E] ${setupOnly ? 'setup-only' : securityOnly ? 'security-only' : authOnly ? 'auth-only' : crossAgencyOnly ? 'cross-agency-only' : 'browser'} lifecycle completed successfully.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
