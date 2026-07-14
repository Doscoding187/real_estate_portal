import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { verifyLocalDemoSeed } from '../server/scripts/verifyLocalDemoSeed';

const LOCAL_DATABASE = 'listify_local';
const REPROVISION_ACKNOWLEDGEMENT = 'I_UNDERSTAND_LISTIFY_LOCAL_WILL_BE_DESTROYED';
const LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'host.docker.internal',
  'listify-mysql-local',
  'real-estate-mysql',
  'mysql',
  'db',
]);
const SHOWING_STATUS_ENUM = "enum('requested','awaiting_confirmation','confirmed','completed','cancelled','no_show','rescheduled')";

type Env = Record<string, string | undefined>;
type LocalDatabaseTarget = { url: URL; host: string; database: string };

function loadLocalEnv() {
  dotenv.config({ path: resolve(process.cwd(), '.env.local'), override: false });
}

function environmentValue(env: Env, name: string) {
  return String(env[name] ?? '').trim().toLowerCase();
}

/** Exact, intentionally narrow target guard shared by local workflow commands. */
export function assertLocalDatabaseTarget(env: Env = process.env): LocalDatabaseTarget {
  const nodeEnv = environmentValue(env, 'NODE_ENV');
  const appEnv = environmentValue(env, 'APP_ENV');
  if (nodeEnv !== 'development') {
    throw new Error(`Local database workflow refused: NODE_ENV must be exactly development, received ${nodeEnv || '(unset)'}.`);
  }
  if (['production', 'staging'].includes(appEnv)) {
    throw new Error(`Local database workflow refused: APP_ENV=${appEnv} is not a development environment.`);
  }

  const raw = env.DATABASE_URL;
  if (!raw) throw new Error('Local database workflow refused: DATABASE_URL is required.');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Local database workflow refused: DATABASE_URL is invalid.');
  }
  if (url.protocol !== 'mysql:') {
    throw new Error(`Local database workflow refused: expected mysql DATABASE_URL, received ${url.protocol || '(none)'}.`);
  }
  const host = url.hostname.toLowerCase();
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Local database workflow refused: host must be a repository-approved local service host, received "${host || '(none)'}".`);
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (database !== LOCAL_DATABASE || url.pathname !== `/${LOCAL_DATABASE}`) {
    throw new Error(`Local database workflow refused: database must be exactly "${LOCAL_DATABASE}", received "${database || '(none)'}".`);
  }
  return { url, host, database };
}

export function assertReprovisionAcknowledgement(env: Env = process.env) {
  if (env.LISTIFY_LOCAL_DB_REPROVISION_CONFIRM !== REPROVISION_ACKNOWLEDGEMENT) {
    throw new Error(
      `Local database reprovision refused: set LISTIFY_LOCAL_DB_REPROVISION_CONFIRM=${REPROVISION_ACKNOWLEDGEMENT} to acknowledge that ${LOCAL_DATABASE} will be destroyed.`,
    );
  }
}

function printTarget(target: LocalDatabaseTarget) {
  console.log(`[Local DB] Host: ${target.host}`);
  console.log(`[Local DB] Database: ${target.database}`);
}

function run(command: string, args: string[]) {
  console.log(`[Local DB] Running: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: process.cwd(), stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`[Local DB] Command failed (${result.status ?? 'unknown'}): ${command} ${args.join(' ')}`);
}

function runForTarget(target: LocalDatabaseTarget, command: string, args: string[]) {
  console.log(`[Local DB] Running: ${command} ${args.join(' ')}`);
  // runtimeBootstrap intentionally lets .env.local override DATABASE_URL. Pin child migration
  // processes to the target that passed the exact local guard before invoking them.
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: target.url.toString(),
      LISTIFY_E2E_DATABASE_URL: target.url.toString(),
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`[Local DB] Command failed (${result.status ?? 'unknown'}): ${command} ${args.join(' ')}`);
}

export function reprovisionCommandSequence() {
  return [
    ['pnpm', ['db:local:start']],
    ['pnpm', ['db:migrate:fresh:local']],
    ['pnpm', ['db:seed:local']],
    ['pnpm', ['db:verify:local']],
  ] as const;
}

export async function executeCommandSequence(
  steps: readonly (readonly [string, readonly string[]])[],
  invoke: (command: string, args: readonly string[]) => void | Promise<void>,
) {
  for (const [command, args] of steps) await invoke(command, args);
}

async function recreateDatabase(target: LocalDatabaseTarget) {
  const adminUrl = new URL(target.url.toString());
  adminUrl.pathname = '/';
  const connection = await mysql.createConnection(adminUrl.toString());
  try {
    console.log(`[Local DB] Recreating ${target.database} on ${target.host}. Local data will be destroyed.`);
    await connection.query(`DROP DATABASE IF EXISTS \`${LOCAL_DATABASE}\``);
    await connection.query(`CREATE DATABASE \`${LOCAL_DATABASE}\``);
  } finally {
    await connection.end();
  }
}

function migrationFiles() {
  const directory = join(process.cwd(), 'server', 'migrations');
  return readdirSync(directory)
    .filter(file => /^\d{4}_[a-zA-Z0-9_]+\.sql$/.test(file))
    .sort((a, b) => Number(a.slice(0, 4)) - Number(b.slice(0, 4)) || a.localeCompare(b))
    .map(file => ({ file, checksum: createHash('sha256').update(readFileSync(join(directory, file))).digest('hex') }));
}

async function scalar(connection: mysql.Connection, statement: string, params: unknown[] = []) {
  const [rows] = await connection.execute(statement, params);
  return (rows as Array<Record<string, unknown>>)[0] ?? {};
}

function field(row: Record<string, unknown>, name: string) {
  return row[name] ?? row[name.toUpperCase()] ?? row[name.toLowerCase()];
}

type VerificationConnection = Pick<mysql.Connection, 'execute' | 'query' | 'end'>;

export async function verifyLocalDatabase(target: LocalDatabaseTarget, providedConnection?: VerificationConnection) {
  const connection = providedConnection ?? await mysql.createConnection(target.url.toString());
  const ownsConnection = !providedConnection;
  try {
    const identity = await scalar(connection, 'SELECT DATABASE() AS database_name');
    if (identity.database_name !== LOCAL_DATABASE) throw new Error(`[Local DB] Connected database mismatch: expected ${LOCAL_DATABASE}.`);

    const requiredTables = ['users', 'agencies', 'agency_branding', 'showings', 'listings', 'sql_migration_history', 'agency_listing_performance_reviews', 'agency_listing_performance_activity'];
    for (const table of requiredTables) {
      const row = await scalar(connection, `SELECT COUNT(*) AS count_value FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`, [table]);
      if (Number(row.count_value) !== 1) throw new Error(`[Local DB] Required table is missing: ${table}.`);
    }
    for (const column of ['email', 'passwordHash', 'emailVerified', 'role', 'agencyId']) {
      const row = await scalar(connection, `SELECT COUNT(*) AS count_value FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = ?`, [column]);
      if (Number(row.count_value) !== 1) throw new Error(`[Local DB] Authentication-critical column is missing: users.${column}.`);
    }
    const showing = await scalar(connection, `SELECT column_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'showings' AND column_name = 'status'`);
    if (String(field(showing, 'column_type')).toLowerCase() !== SHOWING_STATUS_ENUM) throw new Error(`[Local DB] showings.status is stale; expected ${SHOWING_STATUS_ENUM}.`);
    const contactDate = await scalar(connection, `SELECT column_type, is_nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'agency_listing_performance_reviews' AND column_name = 'contact_date'`);
    if (String(field(contactDate, 'column_type')).toLowerCase() !== 'timestamp' || String(field(contactDate, 'is_nullable')).toUpperCase() !== 'YES') throw new Error('[Local DB] Listing Performance contact_date must be a nullable timestamp.');

    const expectedMigrations = migrationFiles();
    const historyRows = await connection.query('SELECT filename, checksum, application_mode FROM sql_migration_history ORDER BY filename');
    const history = new Map((historyRows[0] as Array<Record<string, unknown>>).map(row => [String(row.filename), row]));
    for (const expected of expectedMigrations) {
      const row = history.get(expected.file);
      if (!row) throw new Error(`[Local DB] Custom migration history is missing: ${expected.file}.`);
      if (row.checksum !== expected.checksum) throw new Error(`[Local DB] Custom migration checksum mismatch: ${expected.file}.`);
      if (row.application_mode !== 'executed') throw new Error(`[Local DB] Custom migration was not executed: ${expected.file}.`);
    }
    const lock = await scalar(connection, "SELECT IS_USED_LOCK('real_estate_portal_sql_migrations') AS lock_owner");
    if (lock.lock_owner !== null) throw new Error('[Local DB] Custom SQL migration lock is still held.');

    const demo = await scalar(connection, "SELECT COUNT(*) AS count_value FROM users WHERE email = 'agency@listify.local' AND emailVerified = 1 AND passwordHash IS NOT NULL");
    if (Number(demo.count_value) !== 1) throw new Error('[Local DB] Demo login is not ready; run pnpm db:seed:local after migrations.');
    const workspace = await scalar(connection, "SELECT COUNT(*) AS count_value FROM users u INNER JOIN agencies a ON a.id = u.agencyId INNER JOIN agency_branding ab ON ab.agencyId = a.id WHERE u.email = 'agency@listify.local' AND u.role = 'agency_admin' AND a.slug = 'local-demo-referral-agency' AND ab.isEnabled = 1");
    if (Number(workspace.count_value) !== 1) throw new Error('[Local DB] Agency workspace demo fixture is not ready; run pnpm db:seed:local.');
    await verifyLocalDemoSeed('local');
    console.log(`[Local DB] Verification passed through ${expectedMigrations.at(-1)?.file ?? 'no custom migrations'}.`);
  } finally {
    if (ownsConnection) await connection.end();
  }
}

async function main() {
  loadLocalEnv();
  const action = process.argv[2] ?? 'help';
  if (!['target', 'verify', 'start', 'reprovision'].includes(action)) {
    throw new Error('Usage: tsx scripts/localDbWorkflow.ts <target|verify|start|reprovision>');
  }
  const target = assertLocalDatabaseTarget();
  printTarget(target);
  if (action === 'target') return;
  if (action === 'verify') return verifyLocalDatabase(target);
  if (action === 'start') {
    run('pnpm', ['db:local:start']);
    runForTarget(target, 'pnpm', ['db:migrate:local']);
    return verifyLocalDatabase(target);
  }
  assertReprovisionAcknowledgement();
  run('pnpm', ['db:local:start']);
  await recreateDatabase(target);
  await executeCommandSequence(reprovisionCommandSequence().slice(1), (command, args) => runForTarget(target, command, [...args]));
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
