import { resolve } from 'node:path';
import { reprovisionCommandSequence } from './localDbWorkflow';

/** Compatibility entrypoint; it intentionally does not execute state changes. */
export function localBootstrapCommandSequence() {
  return reprovisionCommandSequence();
}

async function main() {
  throw new Error(
    'The legacy local bootstrap is retired; run the exact Database Authority service, worktree, migration, reference, and scenario commands individually.',
  );
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error(
      error instanceof Error ? error.message : 'Database Authority bootstrap is retired.',
    );
    process.exit(1);
  });
}
