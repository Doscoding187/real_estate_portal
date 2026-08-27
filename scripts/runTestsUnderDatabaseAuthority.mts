import { spawnSync } from 'node:child_process';
import { authorizeDatabaseOperation } from '../server/_core/databaseAuthority/authorization';
import {
  databaseAuthorityChildEnvironment,
  resolveDatabaseAuthority,
} from '../server/_core/databaseAuthority/context';

/**
 * Runs an arbitrary command (default: the full vitest suite) inside the
 * database authority's child environment, so database-backed tests receive
 * the authorized disposable worktree credential instead of a stale fixed
 * test database URL.
 *
 * Usage:
 *   pnpm test:authority                      # full suite
 *   pnpm test:authority -- path/to/x.test.ts # focused run
 *
 * Refuses anything that is not an owned disposable target.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'test' || process.env.APP_ENV !== 'test') {
    throw new Error(
      'test:authority refused: NODE_ENV and APP_ENV must both be test so fixtures target the disposable worktree authority.',
    );
  }
  const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
  if (!['disposable-worktree', 'disposable-test'].includes(authority.context.targetClass)) {
    throw new Error('test:authority refused: target is not disposable test authority.');
  }
  authorizeDatabaseOperation(authority);

  const rawArgs = process.argv.slice(2);
  const passthrough = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
  const [command, ...args] = ['vitest', 'run', '--reporter=basic', ...passthrough];

  console.log(
    `[test:authority] target ${authority.context.targetFingerprintHash.slice(0, 16)} (${authority.context.targetClass})`,
  );
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: databaseAuthorityChildEnvironment(authority, process.env),
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'test:authority failed.');
  process.exit(1);
});
