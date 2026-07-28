import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { getLocalDemoCredentials } from '../server/scripts/localDemoSeed';
import { assertLocalDatabaseTarget } from './localDbWorkflow';
import { loadAuthorityManifest, validateAuthorityManifest } from './databaseAuthorityStatus';

const BOOTSTRAP_STEPS = [
  ['pnpm', ['db:local:start']],
  ['pnpm', ['db:local:wait']],
  ['pnpm', ['db:migrate:local']],
  ['pnpm', ['db:seed:local']],
  ['pnpm', ['db:verify:local']],
] as const;

export function localBootstrapCommandSequence() {
  return BOOTSTRAP_STEPS;
}

function runStep(command: string, args: readonly string[], databaseUrl: string) {
  console.log(`[Database Authority] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      LISTIFY_E2E_DATABASE_URL: databaseUrl,
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `[Database Authority] ${args.join(' ')} failed. ` +
        'Local setup stopped before the next step; inspect the command output for schema-consumer drift or local setup failure.',
    );
  }
}

async function main() {
  dotenv.config({ path: resolve(process.cwd(), '.env.local'), override: false, quiet: true });
  const manifest = loadAuthorityManifest();
  validateAuthorityManifest(manifest);
  const target = assertLocalDatabaseTarget();
  try {
    getLocalDemoCredentials();
  } catch {
    throw new Error(
      'Local setup failure: configure LOCAL_DEMO_AGENCY_PASSWORD in .env.local or the approved local environment before bootstrapping.',
    );
  }
  console.log(`[Database Authority] Approved local target: ${target.host}/${target.database}`);

  for (const [command, args] of BOOTSTRAP_STEPS) {
    runStep(command, args, target.url.toString());
  }

  console.log(`[Database Authority] Local bootstrap complete: ${target.host}/${target.database}`);
  console.log(
    '[Database Authority] Canonical migrations, demo seed, distribution schema, and demo data verified.',
  );
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error(
      error instanceof Error ? error.message : 'Database authority local bootstrap failed.',
    );
    process.exit(1);
  });
}
