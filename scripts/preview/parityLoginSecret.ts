import { pathToFileURL } from 'node:url';
import {
  assertCentralEnvironmentReady,
  inspectCentralLocalEnvironment,
  resolveCentralLocalEnvironment,
} from '../localEnvironmentAuthority';

const GUIDANCE = 'Run `pnpm db:authority:status` to see which required names need attention.';

/**
 * Returns JWT_SECRET from the central local environment, validated by the same
 * authority checks as `db:authority:status`. Local development only. Error
 * messages never include any value.
 */
export function readParityLoginSecret(
  path = resolveCentralLocalEnvironment(),
  runtimeEnv: NodeJS.ProcessEnv = process.env,
) {
  const deployment = `${runtimeEnv.APP_ENV ?? ''} ${runtimeEnv.NODE_ENV ?? ''}`.toLowerCase();
  if (/prod|stag/.test(deployment)) {
    throw new Error('Parity login secret refused: local development only.');
  }
  const environment = inspectCentralLocalEnvironment(path);
  try {
    assertCentralEnvironmentReady(environment);
  } catch (error) {
    throw new Error(`${(error as Error).message} ${GUIDANCE}`);
  }
  const secret = environment.values.JWT_SECRET;
  if (!secret) {
    throw new Error(`Central local environment has no JWT_SECRET. ${GUIDANCE}`);
  }
  return secret;
}

/** Exports only JWT_SECRET into the given environment object. */
export function exportParityLoginSecret(
  target: NodeJS.ProcessEnv = process.env,
  path = resolveCentralLocalEnvironment(),
) {
  target.JWT_SECRET = readParityLoginSecret(path, target);
}

export function parityLoginSecretStatus(path = resolveCentralLocalEnvironment()) {
  try {
    readParityLoginSecret(path, {});
    return 'available' as const;
  } catch {
    return 'missing' as const;
  }
}

function main(args: string[]) {
  if (args[0] === '--status') {
    console.log(`login secret: ${parityLoginSecretStatus()}`);
    return 0;
  }
  try {
    // Stdout is captured by the launcher script (command substitution), never a terminal.
    process.stdout.write(readParityLoginSecret());
    return 0;
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
