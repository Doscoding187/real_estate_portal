import { resolve } from 'node:path';

/**
 * Compatibility surface for old callers. Direct local-database orchestration
 * is retired; the service lifecycle and exact worktree lifecycle are separate
 * Database Authority operations.
 */
export type RetiredLocalWorkflowTarget = never;

export function assertLocalDatabaseTarget(): never {
  throw new Error(
    'localDbWorkflow direct execution is retired; use the Database Authority service and exact owned worktree commands.',
  );
}

export function assertReprovisionAcknowledgement(): never {
  throw new Error(
    'Local database reprovision is retired; use db:worktree:create and the exact operation-specific adapters.',
  );
}

export function reprovisionCommandSequence() {
  return [
    ['pnpm', ['db:authority:service:start']],
    ['pnpm', ['db:worktree:create']],
    ['pnpm', ['db:migrate:plan']],
    ['pnpm', ['db:migrate:apply']],
    ['pnpm', ['db:reference:prepare']],
    ['pnpm', ['db:scenario:prepare']],
    ['pnpm', ['db:readiness', '--', '--purpose=location-discovery']],
  ] as const;
}

export function verificationCommandSequence() {
  return [
    ['pnpm', ['db:reference:verify']],
    ['pnpm', ['db:scenario:verify']],
    ['pnpm', ['db:readiness', '--', '--purpose=location-discovery']],
  ] as const;
}

export async function executeCommandSequence(
  steps: readonly (readonly [string, readonly string[]])[],
  invoke: (command: string, args: readonly string[]) => void | Promise<void>,
) {
  for (const [command, args] of steps) await invoke(command, args);
}

async function main() {
  throw new Error(
    'localDbWorkflow direct execution is retired; use the Database Authority service and exact owned worktree commands.',
  );
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
