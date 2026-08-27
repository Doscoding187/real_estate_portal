import { resolve } from 'node:path';

/**
 * The former fixed-database harness is retired. Keep direct invocation
 * fail-closed until the browser lifecycle is backed by a registered worktree.
 */
export function prospectJourneyDatabaseUrl(): never {
  throw new Error(
    'Prospect Journey E2E database lifecycle is retired; use a registered worktree and the operation-specific scenario adapter.',
  );
}

function main(): never {
  return prospectJourneyDatabaseUrl();
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main();
}
