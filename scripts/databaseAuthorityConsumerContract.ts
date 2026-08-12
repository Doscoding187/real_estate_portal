import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { authorizeDatabaseOperation } from '../server/_core/databaseAuthority/authorization';
import { createAuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';
import {
  databaseAuthorityChildEnvironment,
  resolveDatabaseAuthority,
} from '../server/_core/databaseAuthority/context';
import type { ResolvedDatabaseAuthority } from '../server/_core/databaseAuthority/types';
import { loadAuthorityManifest, validateAuthorityManifest } from './databaseAuthorityStatus';

const CONSUMER_CONTRACT_STEPS = [
  ['pnpm', ['db:migrate:test']],
  ['pnpm', ['db:reference:prepare']],
  ['pnpm', ['db:reference:verify']],
  ['pnpm', ['db:schema:congruency']],
  ['pnpm', ['db:verify:distribution']],
  ['pnpm', ['db:readiness']],
] as const;

export function consumerContractCommandSequence() {
  return CONSUMER_CONTRACT_STEPS;
}

type Environment = Record<string, string | undefined>;

/** A direct invocation must resolve and authorize the same fresh disposable target as its children. */
export function assertFreshDisposableTestTarget(
  rawUrl: string | undefined,
  env: Environment = process.env,
): ResolvedDatabaseAuthority {
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
  const authority = resolveDatabaseAuthority({
    operation: 'test-fixture',
    explicitDatabaseUrl: rawUrl,
    processEnv: env as NodeJS.ProcessEnv,
    credentialClass: env.CI === 'true' ? 'test-owner' : undefined,
  });
  if (!['disposable-worktree', 'disposable-test'].includes(authority.context.targetClass)) {
    throw new Error(
      'Fresh-schema consumer contract refused: target must be an owned worktree database or isolated CI test database.',
    );
  }
  authorizeDatabaseOperation(authority);
  return authority;
}

async function assertDatabaseIsFresh(authority: ResolvedDatabaseAuthority) {
  const decision = authorizeDatabaseOperation(authority);
  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const result: any = await connection.execute(
      'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE()',
    );
    const rows = Array.isArray(result?.[0]) ? result[0] : [];
    const count = Number(rows[0]?.count ?? rows[0]?.COUNT ?? 0);
    if (count !== 0) {
      throw new Error(
        'Fresh-schema consumer contract refused: the authorized disposable target already contains tables.',
      );
    }
  } finally {
    await connection.end();
  }
}

function runStep(command: string, args: readonly string[], authority: ResolvedDatabaseAuthority) {
  console.log(`[Consumer Contract] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: databaseAuthorityChildEnvironment(authority, process.env),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `[Consumer Contract] ${args.join(' ')} failed for authorized fingerprint ${authority.context.targetFingerprintHash.slice(0, 16)}.`,
    );
  }
}

async function main() {
  dotenv.config({ path: resolve(process.cwd(), '.env.test'), override: false, quiet: true });
  const manifest = loadAuthorityManifest();
  validateAuthorityManifest(manifest);
  const authority = assertFreshDisposableTestTarget(process.env.DATABASE_URL);
  await assertDatabaseIsFresh(authority);
  console.log(
    `[Consumer Contract] Fresh authorized target ${authority.context.targetFingerprintHash.slice(0, 16)} (${authority.context.targetClass}).`,
  );
  for (const [command, args] of CONSUMER_CONTRACT_STEPS) {
    runStep(command, args, authority);
  }
  console.log(
    '[Consumer Contract] Canonical migration, commercial reference data, schema congruency, distribution contract, and layered readiness passed.',
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
