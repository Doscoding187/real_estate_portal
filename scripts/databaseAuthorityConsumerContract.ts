import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { loadAuthorityManifest, validateAuthorityManifest } from './databaseAuthorityStatus';

const CONSUMER_CONTRACT_STEPS = [
  ['pnpm', ['db:migrate:test']],
  ['pnpm', ['db:seed:test']],
  ['pnpm', ['db:verify:distribution']],
  ['pnpm', ['db:verify:test-demo']],
] as const;

export function consumerContractCommandSequence() {
  return CONSUMER_CONTRACT_STEPS;
}

type Environment = Record<string, string | undefined>;

/** A direct tsx invocation must be no more capable than the approved command. */
export function assertFreshDisposableTestTarget(
  rawUrl: string | undefined,
  env: Environment = process.env,
) {
  const nodeEnv = String(env.NODE_ENV ?? '')
    .trim()
    .toLowerCase();
  const appEnv = String(env.APP_ENV ?? '')
    .trim()
    .toLowerCase();
  if (nodeEnv !== 'test' || appEnv !== 'test') {
    throw new Error(
      'Fresh-schema consumer contract refused: NODE_ENV and APP_ENV must both be exactly test.',
    );
  }
  if (!rawUrl) throw new Error('Fresh-schema consumer contract refused: DATABASE_URL is required.');
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Fresh-schema consumer contract refused: DATABASE_URL is invalid.');
  }
  const host = url.hostname.toLowerCase();
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (
    url.protocol !== 'mysql:' ||
    !['127.0.0.1', 'localhost', '::1'].includes(host) ||
    database !== 'listify_test'
  ) {
    throw new Error(
      'Fresh-schema consumer contract refused: target must be a local listify_test MySQL database.',
    );
  }
  return url;
}

async function assertDatabaseIsFresh(url: URL) {
  const connection = await mysql.createConnection(url.toString());
  try {
    const [rows] = await connection.query(
      `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE()`,
    );
    const count = Number((rows as Array<{ count: number | string }>)[0]?.count ?? 0);
    if (count !== 0) {
      throw new Error(
        'Fresh-schema consumer contract refused: listify_test already contains tables. Use a newly provisioned CI service or the explicitly acknowledged db:test:rebuild workflow.',
      );
    }
  } finally {
    await connection.end();
  }
}

function runStep(command: string, args: readonly string[], databaseUrl: string) {
  console.log(`[Consumer Contract] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `[Consumer Contract] ${args.join(' ')} failed; canonical schema consumer drift detected.`,
    );
  }
}

async function main() {
  dotenv.config({ path: resolve(process.cwd(), '.env.test'), override: false, quiet: true });
  const manifest = loadAuthorityManifest();
  validateAuthorityManifest(manifest);
  const target = assertFreshDisposableTestTarget(process.env.DATABASE_URL);
  await assertDatabaseIsFresh(target);
  console.log(
    `[Consumer Contract] Fresh local test target: ${target.hostname}/${decodeURIComponent(target.pathname.slice(1))}`,
  );
  for (const [command, args] of CONSUMER_CONTRACT_STEPS) runStep(command, args, target.toString());
  console.log(
    '[Consumer Contract] Fresh canonical schema, demo seed, distribution verification, and demo verification passed.',
  );
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error(
      error instanceof Error ? error.message : 'Fresh-schema consumer contract failed.',
    );
    process.exit(1);
  });
}
