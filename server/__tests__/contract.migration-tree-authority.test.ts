import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const MANIFEST_PATH = 'docs/database-authority/migration-tree-authority.json';
const CANONICAL_RUNNER = 'server/migrations/runSqlMigrations.ts';
const CANONICAL_SQL = 'server/migrations/0000_canonical_launch_baseline.sql';
const APPROVED_DIAGNOSTIC_EXECUTABLES = new Set([
  'scripts/db-verify-distribution-schema.ts',
  'scripts/schema-sanity-check.mjs',
  'scripts/verify-showings-migration.ts',
]);
const ALLOWED_CLASSIFICATIONS = new Set([
  'canonical active',
  'canonical supporting',
  'archived historical',
  'temporary legacy pending Gap 3',
  'approved local/test initialization',
  'test/diagnostic fixture',
  'documentation/example',
]);

type Classification = {
  path: string;
  classification: string;
  purpose: string;
  approvedFiles?: string[];
  allowUntrackedSql?: boolean;
};

type Documentation = {
  path: string;
  disposition: 'updated' | 'superseded';
};

type AuthorityManifest = {
  canonicalAuthority: {
    productionCommand: string;
    testCommand: string;
    localCommand: string;
    runner: string;
    activeSqlDirectory: string;
    ledger: string;
  };
  classifications: Classification[];
  prohibitedPaths: string[];
  operationalDocumentation: Documentation[];
};

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function workingTreePaths(): string[] {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .filter(path => existsSync(join(ROOT, path)))
    .sort();
}

function readManifest(): AuthorityManifest {
  return JSON.parse(read(MANIFEST_PATH)) as AuthorityManifest;
}

function matchesPath(path: string, pattern: string): boolean {
  if (pattern === path) return true;
  if (pattern.startsWith('/*.')) return !path.includes('/') && path.endsWith(pattern.slice(2));
  if (pattern.endsWith('/**')) return path.startsWith(pattern.slice(0, -2));
  if (pattern.includes('/*.')) {
    const [directory, suffix] = pattern.split('/*');
    return (
      path.startsWith(`${directory}/`) &&
      !path.slice(directory.length + 1).includes('/') &&
      path.endsWith(suffix)
    );
  }
  return false;
}

function isGlob(pattern: string): boolean {
  return pattern.includes('*');
}

function classifiedBy(path: string, manifest: AuthorityManifest): Classification[] {
  return manifest.classifications.filter(entry => {
    if (!matchesPath(path, entry.path)) return false;
    if (entry.allowUntrackedSql) return true;
    if (!isGlob(entry.path)) return true;
    return entry.approvedFiles?.includes(path) ?? false;
  });
}

function operationalSourcePaths(paths: string[]): string[] {
  return paths.filter(path => {
    if (path === 'package.json' || path.startsWith('.github/workflows/')) return true;
    if (
      /^(Dockerfile.*|Procfile.*|docker-compose.*\.(?:yml|yaml)|railway\.json|render\.(?:yml|yaml)|fly\.toml|vercel\.json)$/.test(
        path,
      )
    ) {
      return true;
    }
    return (
      path === 'server/_core/start.ts' ||
      path === 'server/_core/index.ts' ||
      /^scripts\/(?:start|deploy|predeploy|release)[\w.-]*\.[cm]?[jt]sx?$/.test(path) ||
      /^server\/(?:scripts|jobs|workers)\/(?:start|deploy|predeploy|release)[\w.-]*\.[cm]?[jt]sx?$/.test(
        path,
      )
    );
  });
}

function legacyOperationalSignals(source: string): string[] {
  const signals = [
    /drizzle_old\//g,
    /server\/db\/migrations\//g,
    /docker\/mysql\/init\.sql/g,
    /drizzle\/migrations\//g,
    /(?:^|[^\w/])migrations\/[\w.-]+\.sql/g,
    /drizzle-kit\s+(?:push|migrate)/g,
    /\bdb:push\b/g,
  ];
  return signals.flatMap(pattern => Array.from(source.matchAll(pattern), match => match[0]));
}

function legacyDocumentationDirectives(source: string): string[] {
  const fencedCommands = Array.from(
    source.matchAll(/```(?:bash|sh|shell)?\s*([\s\S]*?)```/g),
    match => match[1],
  ).join('\n');
  const patterns = [
    /(?:pnpm\s+)?db:push/g,
    /drizzle-kit\s+(?:push|migrate)/g,
    /drizzle\/migrations\//g,
    /(?:^|[^\w/])migrations\/[\w.-]+\.sql/g,
  ];
  const fencedMatches = patterns.flatMap(pattern =>
    Array.from(fencedCommands.matchAll(pattern), match => match[0]),
  );
  const currentLookingInlineMatches = source.split('\n').flatMap(line => {
    const isCurrentLooking = /\b(?:run|use|execute|apply|approved|command)\b/i.test(line);
    const isClearlyProhibited =
      /\b(?:do not|not operational|never|superseded|historical|prohibited)\b/i.test(line);
    if (!isCurrentLooking || isClearlyProhibited) return [];
    return patterns.flatMap(pattern => Array.from(line.matchAll(pattern), match => match[0]));
  });
  return [...fencedMatches, ...currentLookingInlineMatches];
}

function nonCanonicalRunnerSignals(source: string): string[] {
  const fileReferences = Array.from(
    source.matchAll(
      /(?:tsx|ts-node|node)\s+([^\s'"\\]+(?:migrat|schema)[^\s'"\\]*\.[cm]?[jt]sx?)/gi,
    ),
    match => match[1],
  );
  return fileReferences.filter(
    path => path !== CANONICAL_RUNNER && !APPROVED_DIAGNOSTIC_EXECUTABLES.has(path),
  );
}

describe('migration tree authority', () => {
  it('classifies every tracked or untracked SQL surface and prohibits retired trees', () => {
    const manifest = readManifest();
    const paths = workingTreePaths();
    const authorityPaths = paths.filter(
      path => path.endsWith('.sql') || path.startsWith('drizzle/meta/'),
    );

    expect(manifest.classifications.length).toBeGreaterThan(0);
    for (const entry of manifest.classifications) {
      expect(ALLOWED_CLASSIFICATIONS.has(entry.classification), entry.path).toBe(true);
      expect(entry.purpose.length, entry.path).toBeGreaterThan(0);
      if (isGlob(entry.path) && !entry.allowUntrackedSql) {
        expect(
          entry.approvedFiles,
          `Broad classification requires an exact allowlist: ${entry.path}`,
        ).toBeDefined();
        expect(entry.approvedFiles?.length, entry.path).toBeGreaterThan(0);
      }
      if (entry.allowUntrackedSql) {
        expect(entry.classification).toBe('test/diagnostic fixture');
        expect(entry.path).toBe('server/__tests__/fixtures/migration-tree-authority/**');
      }
      for (const approvedFile of entry.approvedFiles ?? []) {
        expect(
          matchesPath(approvedFile, entry.path),
          `Manifest file does not match its path: ${approvedFile}`,
        ).toBe(true);
      }
    }

    for (const path of authorityPaths) {
      expect(
        classifiedBy(path, manifest),
        `Unclassified migration-related surface: ${path}`,
      ).toHaveLength(1);
    }

    for (const prohibited of manifest.prohibitedPaths) {
      expect(
        paths.some(path => matchesPath(path, prohibited)),
        `Retired path returned: ${prohibited}`,
      ).toBe(false);
    }

    const activeSql = manifest.classifications
      .filter(entry => entry.classification === 'canonical active')
      .map(entry => entry.path);
    expect(activeSql).toEqual([CANONICAL_SQL]);
  });

  it('keeps canonical discovery top-level and archives non-executable', () => {
    const manifest = readManifest();
    const migrationsDirectory = join(ROOT, 'server', 'migrations');
    const activeSql = readdirSync(migrationsDirectory)
      .filter(file => file.endsWith('.sql'))
      .sort();
    const runner = read(CANONICAL_RUNNER);

    expect(manifest.canonicalAuthority.runner).toBe(CANONICAL_RUNNER);
    expect(manifest.canonicalAuthority.activeSqlDirectory).toBe('server/migrations');
    expect(activeSql).toEqual(['0000_canonical_launch_baseline.sql']);
    expect(runner).toContain('const migrationsDir = options?.migrationsDir ?? __dirname;');
    expect(runner).toContain('readdirSync(migrationsDir)');
    expect(runner).not.toMatch(/readdirSync\([^\n]+recursive\s*:/);
    expect(runner).toContain(".filter(file => file.endsWith('.sql'))");
    expect(
      manifest.classifications.find(entry => entry.path === 'server/migrations/_archived/**')
        ?.classification,
    ).toBe('archived historical');
    expect(runner).not.toContain('_archived');
  });

  it('keeps generated journals and Docker local initialization outside production authority', () => {
    const manifest = readManifest();
    const journal = 'drizzle/meta/_journal.json';
    const localInit = 'docker/mysql-local/init/01-create-local-databases.sql';

    expect(classifiedBy(journal, manifest).map(entry => entry.classification)).toEqual([
      'temporary legacy pending Gap 3',
    ]);
    expect(manifest.canonicalAuthority.ledger).toBe('sql_migration_history');
    expect(read(journal)).not.toContain('sql_migration_history');
    expect(existsSync(join(ROOT, 'docker/mysql/init.sql'))).toBe(false);
    expect(classifiedBy(localInit, manifest).map(entry => entry.classification)).toEqual([
      'approved local/test initialization',
    ]);
    expect(read(localInit)).not.toMatch(/\b(?:CREATE|ALTER)\s+TABLE\b/i);
    expect(read(localInit)).not.toContain('server/migrations');
  });

  it('rejects non-canonical migration trees from operational configuration and current guidance', () => {
    const manifest = readManifest();
    const paths = workingTreePaths();

    for (const path of operationalSourcePaths(paths)) {
      expect(
        legacyOperationalSignals(read(path)),
        `Non-canonical migration reference in ${path}`,
      ).toEqual([]);
      expect(
        nonCanonicalRunnerSignals(read(path)),
        `Non-canonical migration runner in ${path}`,
      ).toEqual([]);
    }

    for (const document of manifest.operationalDocumentation) {
      const source = read(document.path);
      if (document.path !== 'server/migrations/README.md') {
        expect(source).toContain('server/migrations/README.md');
      }
      if (document.disposition === 'superseded') {
        expect(source).toMatch(
          /^#.*\n\n> \*\*Superseded|^> \*\*Superseded migration guidance\.\*\*/,
        );
        continue;
      }
      expect(
        legacyDocumentationDirectives(source),
        `Operational legacy instruction in ${document.path}`,
      ).toEqual([]);
    }

    expect(read('package.json')).toContain('server/migrations/runSqlMigrations.ts');
    expect(read('package.json')).not.toContain('drizzle-kit');
  });
});
