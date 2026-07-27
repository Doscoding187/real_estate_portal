import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const TEST_DATABASE = 'listify_test';
const TEST_HOST = '127.0.0.1';
const TEST_PORT = '3307';
const NATIVE_TEST_DATA_ROOT = '/tmp/listify-mysql-3307';
const TEST_REBUILD_ACKNOWLEDGEMENT = 'I_UNDERSTAND_LISTIFY_TEST_WILL_BE_DESTROYED';
const CANONICAL_BASELINE_FILE = '0000_canonical_launch_baseline.sql';

type Env = Record<string, string | undefined>;
export type TestDatabaseTarget = { url: URL; host: string; port: string; database: string };

function value(env: Env, name: string) {
  return String(env[name] ?? '')
    .trim()
    .toLowerCase();
}

/** Validates the only database this destructive test workflow may ever target. */
export function assertTestDatabaseTarget(env: Env = process.env): TestDatabaseTarget {
  if (value(env, 'NODE_ENV') !== 'test') {
    throw new Error('Test database workflow refused: NODE_ENV must be exactly test.');
  }
  if (value(env, 'APP_ENV') !== 'test') {
    throw new Error('Test database workflow refused: APP_ENV must be exactly test.');
  }

  const raw = env.DATABASE_URL;
  if (!raw) throw new Error('Test database workflow refused: DATABASE_URL is required.');

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Test database workflow refused: DATABASE_URL is invalid.');
  }

  if (url.protocol !== 'mysql:') {
    throw new Error('Test database workflow refused: DATABASE_URL must use mysql.');
  }
  if (url.hostname.toLowerCase() !== TEST_HOST) {
    throw new Error(`Test database workflow refused: host must be loopback ${TEST_HOST}.`);
  }
  if (url.port !== TEST_PORT) {
    throw new Error(`Test database workflow refused: port must be exactly ${TEST_PORT}.`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (database !== TEST_DATABASE || url.pathname !== `/${TEST_DATABASE}`) {
    throw new Error(`Test database workflow refused: database must be exactly ${TEST_DATABASE}.`);
  }

  return { url, host: TEST_HOST, port: TEST_PORT, database };
}

export function assertTestRebuildAcknowledgement(env: Env = process.env) {
  if (env.LISTIFY_TEST_DB_REBUILD_CONFIRM !== TEST_REBUILD_ACKNOWLEDGEMENT) {
    throw new Error(
      'Test database rebuild refused: LISTIFY_TEST_DB_REBUILD_CONFIRM must contain the exact acknowledgement.',
    );
  }
}

export function assertApprovedNativeTestDataRoot(path = NATIVE_TEST_DATA_ROOT) {
  if (path !== NATIVE_TEST_DATA_ROOT) {
    throw new Error(
      `Test database workflow refused: native data root must be exactly ${NATIVE_TEST_DATA_ROOT}.`,
    );
  }
}

export function testRebuildCommandSequence() {
  return [
    ['pnpm', ['db:local:start']],
    ['pnpm', ['db:local:wait']],
    ['bash', ['scripts/local-db.sh', 'test:rebuild']],
    ['pnpm', ['db:migrate:test']],
  ] as const;
}

function run(target: TestDatabaseTarget, command: string, args: readonly string[]) {
  console.log(`[Test DB] Running: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      APP_ENV: 'test',
      DATABASE_URL: target.url.toString(),
      LISTIFY_E2E_DATABASE_URL: target.url.toString(),
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`[Test DB] Command failed: ${command} ${args.join(' ')}`);
}

export async function verifyCanonicalTestDatabase(target: TestDatabaseTarget) {
  const connection = await mysql.createConnection(target.url.toString());
  try {
    const [ledgerRows] = await connection.query<Array<{ filename: string }>>(
      'SELECT filename FROM sql_migration_history WHERE filename = ?',
      [CANONICAL_BASELINE_FILE],
    );
    if (ledgerRows.length !== 1) {
      throw new Error('Canonical baseline ledger entry is missing after rebuild.');
    }

    const [schemaRows] = await connection.query<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_type = 'BASE TABLE'
         AND table_name IN ('properties', 'showings')`,
    );
    if (new Set(schemaRows.map(row => row.table_name)).size !== 2) {
      throw new Error('Canonical application schema is not ready after rebuild.');
    }
  } finally {
    await connection.end();
  }
}

async function main() {
  dotenv.config({ path: resolve(process.cwd(), '.env.test'), override: true });
  if (process.argv[2] !== 'rebuild') {
    throw new Error('Usage: tsx scripts/testDbWorkflow.ts rebuild');
  }

  const target = assertTestDatabaseTarget();
  assertApprovedNativeTestDataRoot();
  assertTestRebuildAcknowledgement();
  console.log(`[Test DB] Target: ${target.host}:${target.port}/${target.database}`);

  for (const [command, args] of testRebuildCommandSequence()) {
    run(target, command, args);
  }
  await verifyCanonicalTestDatabase(target);
  console.log('[Test DB] Canonical migration ledger and application schema verified.');
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(() => {
    console.error(
      '[Test DB] Rebuild failed before canonical test database verification completed.',
    );
    process.exit(1);
  });
}
