import { spawnSync } from 'node:child_process';
import { authorizeDatabaseOperation } from '../server/_core/databaseAuthority/authorization';
import {
  databaseAuthorityChildEnvironment,
  resolveDatabaseAuthority,
} from '../server/_core/databaseAuthority/context';
import { resolveDatabaseEnvironment } from '../server/_core/databaseAuthority/environment';

/**
 * Runs browser tests in the same owned disposable database context as server
 * integration tests. The spawned application processes inherit the exact
 * target fingerprint, so a browser test cannot silently point at a default or
 * shared database.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'test' || process.env.APP_ENV !== 'test') {
    throw new Error('test:browser:authority refused: NODE_ENV and APP_ENV must both be test.');
  }

  const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
  if (!['disposable-worktree', 'disposable-test'].includes(authority.context.targetClass)) {
    throw new Error('test:browser:authority refused: target is not a disposable test authority.');
  }
  authorizeDatabaseOperation(authority);

  // The database resolver reads the governed central local environment for
  // development credentials and the application needs its non-database local
  // settings (such as the session secret) too. Pass those values only to the
  // child processes; do not print or persist them.
  const environment = resolveDatabaseEnvironment({ processEnv: process.env });
  const browserTestEnvironment = databaseAuthorityChildEnvironment(authority, environment.values);

  const rawArgs = process.argv.slice(2);
  const passthrough = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
  const result = spawnSync('playwright', ['test', ...passthrough], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: browserTestEnvironment,
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Authorized browser test failed.');
  process.exit(1);
});
