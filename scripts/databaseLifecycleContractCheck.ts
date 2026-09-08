import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type PackageJson = { scripts?: Record<string, string> };

const REQUIRED_FILES = [
  'docs/database-authority/00-database-authority-agent-entry.md',
  'docs/database-authority/01-database-operating-playbook.md',
  'docs/database-authority/02-local-to-production-schema-lifecycle.md',
  'docs/architecture/database-authority-policy.md',
  'docs/architecture/database-compatibility-exceptions.md',
  'drizzle/schema/canonical-model-inventory.json',
  'server/migrations/manifest.json',
];

const REQUIRED_SCRIPTS = [
  'db:authority:status',
  'db:authority:check',
  'db:authority:context',
  'db:migrate:plan',
  'db:migrate:apply',
  'db:schema:congruency',
  'db:release:plan',
  'db:release:apply',
];

export function checkDatabaseLifecycleContract(root = process.cwd()): string[] {
  const problems: string[] = [];
  for (const relativePath of REQUIRED_FILES) {
    try {
      readFileSync(resolve(root, relativePath));
    } catch {
      problems.push(`missing authority file: ${relativePath}`);
    }
  }

  try {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as PackageJson;
    for (const script of REQUIRED_SCRIPTS) {
      if (!packageJson.scripts?.[script]) problems.push(`missing package script: ${script}`);
    }
  } catch {
    problems.push('package.json is unreadable');
  }
  return problems;
}

if (process.argv[1]?.endsWith('databaseLifecycleContractCheck.ts')) {
  const problems = checkDatabaseLifecycleContract();
  if (problems.length) {
    console.error('Database lifecycle contract failed.');
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }
  console.log('Database lifecycle contract passed.');
}
