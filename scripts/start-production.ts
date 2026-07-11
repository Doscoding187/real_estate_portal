#!/usr/bin/env tsx
import { spawnSync } from 'child_process';
import { assertDatabaseTargetMatchesRuntime } from '../server/_core/databaseTarget';
import { assertLaunchPreflight, formatLaunchPreflight } from '../server/_core/launchPreflight';
import { loadAppRuntimeEnv } from '../server/_core/runtimeBootstrap';

function run(command: string, args: string[]) {
  console.log(`\n> ${command} ${args.join(' ')}`.trim());

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      APP_ENV: 'production',
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function main() {
  process.env.NODE_ENV = 'production';
  process.env.APP_ENV = 'production';
  const { runtimeEnv, loadedFiles } = loadAppRuntimeEnv({ cwd: process.cwd() });
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for production startup.');
  }

  const target = assertDatabaseTargetMatchesRuntime(databaseUrl, runtimeEnv);
  console.log(
    `[Startup] Runtime env=${runtimeEnv}; env files=${loadedFiles.join(', ') || '(none)'}; target=${target.fingerprint}`,
  );

  const preflight = assertLaunchPreflight({ runtimeEnv });
  console.log(formatLaunchPreflight(preflight));

  run('pnpm', ['db:target']);
  run('pnpm', ['db:migrate']);
  run('pnpm', ['start:prod:core']);
}

try {
  main();
} catch (error) {
  console.error('Startup pipeline failed.');
  console.error(error);
  process.exit(1);
}
