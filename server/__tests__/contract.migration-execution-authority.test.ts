import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const CANONICAL_RUNNER = 'server/migrations/runSqlMigrations.ts';
const APPROVED_OPERATIONAL_ENTRYPOINTS = new Set([
  'db:migrate',
  'db:migrate:test',
  'db:migrate:local',
  'db:migrate:fresh:local',
  'db:migrate:dev',
  'db:start:local',
  'db:reprovision:local',
  'db:bootstrap:local',
  'release:predeploy:production',
]);
const APPROVED_TEST_ENTRYPOINTS = new Set([
  'test:listing-performance',
  'test:prospect-journey',
  'test:prospect-journey:security',
  'test:prospect-journey:auth',
  'test:prospect-journey:cross-agency',
  'test:prospect-journey:setup',
]);

type PackageManifest = { scripts: Record<string, string> };

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function readPackageManifest(): PackageManifest {
  return JSON.parse(read('package.json')) as PackageManifest;
}

function normalizeRepoPath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

function scriptReferences(command: string): string[] {
  return Array.from(command.matchAll(/(?:pnpm|npm)\s+(?:run\s+)?([\w:.-]+)/g), match => match[1]);
}

function executableFiles(command: string): string[] {
  return Array.from(command.matchAll(/(?:tsx|ts-node|node)\s+([^\s'"\\]+\.[cm]?[jt]sx?)/g), match =>
    normalizeRepoPath(match[1]),
  );
}

function sourcePackageReferences(source: string): string[] {
  return Array.from(source.matchAll(/['"]((?:db|release):[\w:-]+)['"]/g), match => match[1]);
}

function migrationSignals(source: string): string[] {
  const patterns = [
    /runSqlMigrations/g,
    /drizzle-kit\s+(?:push|migrate)/g,
    /(?:apply-schema|push-schema)/g,
    /run-[\w-]*migration/g,
    /(?:server\/migrations|drizzle(?:_old)?\/migrations|migrations)\/[^\s'"`]+\.(?:sql|[cm]?[jt]s)/g,
  ];

  return patterns.flatMap(pattern => Array.from(source.matchAll(pattern), match => match[0]));
}

function resolvePackageScript(
  name: string,
  manifest: PackageManifest,
  visited = new Set<string>(),
): { runners: Set<string>; signals: string[] } {
  if (visited.has(name)) return { runners: new Set(), signals: [] };
  visited.add(name);

  const command = manifest.scripts[name];
  expect(command, `Package script ${name} must exist while resolving its graph.`).toBeTypeOf(
    'string',
  );

  const runners = new Set<string>();
  const signals = migrationSignals(command);
  if (command.includes(CANONICAL_RUNNER)) runners.add(CANONICAL_RUNNER);

  for (const reference of scriptReferences(command)) {
    if (!manifest.scripts[reference]) continue;
    const resolved = resolvePackageScript(reference, manifest, visited);
    resolved.runners.forEach(runner => runners.add(runner));
    signals.push(...resolved.signals);
  }

  for (const executable of executableFiles(command)) {
    const absolute = resolve(ROOT, executable);
    if (!existsSync(absolute)) continue;
    const source = readFileSync(absolute, 'utf8');
    signals.push(...migrationSignals(source));
    if (source.includes(CANONICAL_RUNNER)) runners.add(CANONICAL_RUNNER);

    const isReadOnlyLocalWorkflowAction =
      executable === 'scripts/localDbWorkflow.ts' && /\s(?:target|verify)$/.test(command);

    for (const reference of isReadOnlyLocalWorkflowAction ? [] : sourcePackageReferences(source)) {
      if (!manifest.scripts[reference]) continue;
      const resolved = resolvePackageScript(reference, manifest, visited);
      resolved.runners.forEach(runner => runners.add(runner));
      signals.push(...resolved.signals);
    }
  }

  return { runners, signals };
}

function isMigrationCapable(name: string, manifest: PackageManifest): boolean {
  const resolved = resolvePackageScript(name, manifest);
  return resolved.runners.size > 0 || resolved.signals.length > 0;
}

function trackedWorkflowFiles(): string[] {
  const directory = join(ROOT, '.github', 'workflows');
  return readdirSync(directory)
    .filter(file => /\.ya?ml$/.test(file))
    .map(file => `.github/workflows/${file}`)
    .sort();
}

function deploymentFiles(): string[] {
  return readdirSync(ROOT)
    .filter(file =>
      /^(Dockerfile.*|Procfile.*|docker-compose.*\.ya?ml|railway\.json|render\.ya?ml|fly\.toml|vercel\.json)$/.test(
        file,
      ),
    )
    .sort();
}

describe('migration execution authority', () => {
  it('allows only the exhaustive approved package migration graph', () => {
    const manifest = readPackageManifest();
    const migrationCapableScripts = Object.keys(manifest.scripts)
      .filter(name => isMigrationCapable(name, manifest))
      .sort();
    const approvedScripts = new Set([
      ...APPROVED_OPERATIONAL_ENTRYPOINTS,
      ...APPROVED_TEST_ENTRYPOINTS,
    ]);

    expect(migrationCapableScripts).toEqual([...approvedScripts].sort());
    expect(manifest.scripts['db:migrate']).toContain(CANONICAL_RUNNER);
    expect(manifest.scripts['db:migrate:test']).toContain(CANONICAL_RUNNER);
    expect(manifest.scripts['db:migrate:local']).toContain(CANONICAL_RUNNER);
    expect(manifest.scripts['db:push']).toBeUndefined();
    expect(manifest.scripts['db:generate']).toBeUndefined();
    expect(manifest.scripts['db:reset']).toBeUndefined();

    const operationalRunners = new Set<string>();
    for (const name of APPROVED_OPERATIONAL_ENTRYPOINTS) {
      const resolved = resolvePackageScript(name, manifest);
      expect(resolved.signals).not.toContain('drizzle-kit push');
      expect(resolved.signals).not.toContain('drizzle-kit migrate');
      resolved.runners.forEach(runner => operationalRunners.add(runner));
    }

    expect([...operationalRunners]).toEqual([CANONICAL_RUNNER]);
    expect(operationalRunners.size, 'OPERATIONAL_PACKAGE_MIGRATION_RUNNER_COUNT').toBe(1);
  });

  it('allows only the approved CI migration command in every workflow', () => {
    const manifest = readPackageManifest();
    const workflowFiles = trackedWorkflowFiles();

    expect(workflowFiles).toEqual([
      '.github/workflows/ci.yml',
      '.github/workflows/frontend-build.yml',
    ]);

    for (const workflow of workflowFiles) {
      const source = read(workflow);
      expect(migrationSignals(source)).not.toContain('drizzle-kit push');
      expect(migrationSignals(source)).not.toContain('drizzle-kit migrate');
      expect(migrationSignals(source)).not.toContain('apply-schema');
      expect(migrationSignals(source)).not.toContain('push-schema');
      expect(migrationSignals(source).filter(signal => /run-.*migration/.test(signal))).toEqual([]);

      const references = scriptReferences(source);
      for (const reference of references) {
        if (!manifest.scripts[reference]) continue;
        if (!isMigrationCapable(reference, manifest)) continue;
        expect(reference, `${workflow} may only invoke the canonical CI migration wrapper.`).toBe(
          'db:migrate:test',
        );
      }
    }

    const ci = read('.github/workflows/ci.yml');
    expect(ci.match(/pnpm db:migrate:test/g)).toHaveLength(2);
  });

  it('keeps every operational startup and deployment path migration-free', () => {
    const manifest = readPackageManifest();
    const startupScripts = [
      'start',
      'start:prod',
      'start:prod:core',
      'start:server',
      'start:server:prodlike',
    ];

    for (const name of startupScripts) {
      const resolved = resolvePackageScript(name, manifest);
      expect(resolved.signals, `${name} must not resolve to a migration authority.`).toEqual([]);
      expect(resolved.runners, `${name} must not resolve to a migration runner.`).toEqual(
        new Set(),
      );
    }

    const operationalSources = [
      'server/_core/start.ts',
      'server/_core/index.ts',
      'scripts/start-production.ts',
      ...deploymentFiles(),
    ];

    for (const file of operationalSources) {
      const source = read(file);
      expect(
        migrationSignals(source),
        `${file} must not contain a migration execution path.`,
      ).toEqual([]);
      expect(source).not.toContain('db:migrate');
      expect(source).not.toContain('db:migrate:test');
    }

    expect(read('railway.json')).toContain('"startCommand": "pnpm start:prod"');
  });

  it('proves top-level canonical discovery excludes archived SQL', () => {
    const runner = read(CANONICAL_RUNNER);
    const migrationsDirectory = join(ROOT, 'server', 'migrations');
    const archiveDirectory = join(migrationsDirectory, '_archived');
    const activeSqlFiles = readdirSync(migrationsDirectory)
      .filter(file => file.endsWith('.sql'))
      .sort();
    const archivedSqlFiles = readdirSync(archiveDirectory, { recursive: true })
      .filter(file => String(file).endsWith('.sql'))
      .map(String);

    expect(runner).toContain('const migrationsDir = options?.migrationsDir ?? __dirname;');
    expect(runner).toContain('readdirSync(migrationsDir)');
    expect(runner).not.toMatch(/readdirSync\([^\n]+recursive\s*:/);
    expect(runner).toContain(".filter(file => file.endsWith('.sql'))");
    expect(activeSqlFiles).toEqual(['0000_canonical_launch_baseline.sql']);
    expect(archivedSqlFiles.length).toBeGreaterThan(0);
    expect(activeSqlFiles.some(file => file.includes('_archived'))).toBe(false);
    expect(runner).toContain("const MIGRATION_HISTORY_TABLE = 'sql_migration_history'");
    expect(runner).toContain('leftNumber - rightNumber || left.localeCompare(right)');
    expect(runner).toContain("createHash('sha256')");
    expect(runner).toContain('Checksum mismatch for applied SQL migration');
    expect(runner).toContain('await acquireMigrationLock(connection);');
    expect(runner.indexOf('await recordMigration(connection, file, checksum')).toBeGreaterThan(
      runner.indexOf('await connection.execute(statement)'),
    );
    expect(runner).toContain('Refusing an implicit upgrade');
    expect(runner).toContain('process.exit(1)');
    expect(basename(migrationsDirectory)).toBe('migrations');
  });
});
