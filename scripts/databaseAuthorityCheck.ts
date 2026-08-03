import { execFileSync } from 'node:child_process';

type Check = {
  command: string;
  args: string[];
};

const CHECKS: Check[] = [
  {
    command: 'pnpm',
    args: ['test:db-authority:static'],
  },
  {
    command: 'pnpm',
    args: ['db:authority:utilities'],
  },
  {
    command: 'pnpm',
    args: ['schema:sanity'],
  },
  {
    command: 'pnpm',
    args: ['schema:inventory:check'],
  },
];

function staticOnlyEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };

  for (const key of Object.keys(environment)) {
    if (/(?:DATABASE|MYSQL|PASSWORD|SECRET|TOKEN|CREDENTIAL)/i.test(key)) {
      delete environment[key];
    }
  }

  return environment;
}

export function databaseAuthorityCheckSequence(): Check[] {
  return CHECKS.map(check => ({ ...check, args: [...check.args] }));
}

export function runDatabaseAuthorityCheck(cwd = process.cwd()): void {
  const environment = staticOnlyEnvironment();

  for (const check of databaseAuthorityCheckSequence()) {
    execFileSync(check.command, check.args, {
      cwd,
      env: environment,
      stdio: 'inherit',
    });
  }
}

if (process.argv[1] && process.argv[1].endsWith('databaseAuthorityCheck.ts')) {
  try {
    runDatabaseAuthorityCheck();
    console.log('Database authority static gate passed.');
  } catch {
    console.error('Database authority static gate failed.');
    process.exit(1);
  }
}
