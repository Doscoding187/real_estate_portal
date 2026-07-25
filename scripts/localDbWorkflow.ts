import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const LOCAL_DATABASE = 'listify_local';
const REPROVISION_ACKNOWLEDGEMENT = 'I_UNDERSTAND_LISTIFY_LOCAL_WILL_BE_DESTROYED';
const LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'host.docker.internal',
  'listify-mysql-local',
]);
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
    ['pnpm', ['db:migrate:local']],
    ['pnpm', ['db:seed:local']],
    ['pnpm', ['db:verify:local']],
  ] as const;
}

export function verificationCommandSequence() {
  return [
    ['pnpm', ['db:verify:distribution']],
    ['pnpm', ['db:verify:local-demo']],
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

async function main() {
  loadLocalEnv();
  const action = process.argv[2] ?? 'help';
  if (!['target', 'verify', 'start', 'reprovision'].includes(action)) {
    throw new Error('Usage: tsx scripts/localDbWorkflow.ts <target|verify|start|reprovision>');
  }
  const target = assertLocalDatabaseTarget();
  printTarget(target);
  if (action === 'target') return;
  if (action === 'verify') {
    await executeCommandSequence(
      verificationCommandSequence(),
      (command, args) => runForTarget(target, command, [...args]),
    );
    return;
  }
  if (action === 'start') {
    run('pnpm', ['db:local:start']);
    runForTarget(target, 'pnpm', ['db:migrate:local']);
    runForTarget(target, 'pnpm', ['db:verify:local-demo']);
    return;
  }
  assertReprovisionAcknowledgement();
  run('pnpm', ['db:local:start']);
  await recreateDatabase(target);
  await executeCommandSequence(
    reprovisionCommandSequence().slice(1),
    (command, args) => runForTarget(target, command, [...args]),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
