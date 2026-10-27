import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Public/runtime geography is owned by admitted Place data. This source
 * contract prevents the old province/city/suburb tables from reappearing as a
 * second consumer path.
 */
const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../..');
const LOCATION_TABLES = new Set(['provinces', 'cities', 'suburbs']);
const SCANNED_ROOTS = ['server', 'shared', 'client/src', 'scripts'];
const IGNORED_PATH = /(\.test\.|\.spec\.|__tests__|\/tests\/|\.backup\.)/;

function collectSourceFiles(root: string, accumulator: string[] = []): string[] {
  const absoluteRoot = path.join(REPOSITORY_ROOT, root);
  let entries: string[] = [];
  try {
    entries = readdirSync(absoluteRoot);
  } catch {
    return accumulator;
  }
  for (const entry of entries) {
    const absolute = path.join(absoluteRoot, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      collectSourceFiles(path.join(root, entry), accumulator);
      continue;
    }
    if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) continue;
    const relative = path.join(root, entry);
    if (IGNORED_PATH.test(relative)) continue;
    accumulator.push(relative);
  }
  return accumulator;
}

function readsLocationTablesDirectly(relativePath: string): string[] {
  const source = readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8');
  const imported = new Set<string>();
  for (const match of source.matchAll(
    /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*drizzle\/schema[^'"]*['"]/gs,
  )) {
    for (const raw of match[1].split(',')) {
      const name = raw
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      if (LOCATION_TABLES.has(name)) imported.add(name);
    }
  }
  return [...imported];
}

describe('single geography authority boundary', () => {
  const files = SCANNED_ROOTS.flatMap(root => collectSourceFiles(root));
  const readers = files.filter(file => readsLocationTablesDirectly(file).length > 0);

  it('keeps legacy location tables out of application and tooling readers', () => {
    expect(
      readers,
      'geography consumers must resolve admitted Place identities only',
    ).toEqual([]);
  });

  it('retires the old runtime resolvers and provider locality writer', () => {
    for (const relativePath of [
      'server/services/locationResolverService.ts',
      'server/services/runtimeGeographyResolverService.ts',
      'server/services/listingLocationResolver.ts',
      'server/services/locationAutoPopulation.ts',
      'server/services/sharedLivingAuthoringService.ts',
      'server/locationPagesRouter.ts',
      'scripts/test-location-pages.ts',
      'scripts/test-location-service.ts',
      'scripts/check-location-data.ts',
      'scripts/check-provinces.ts',
    ]) {
      expect(existsSync(path.join(REPOSITORY_ROOT, relativePath)), relativePath).toBe(false);
    }

    expect(readFileSync(path.join(REPOSITORY_ROOT, 'server/routers.ts'), 'utf8')).not.toContain(
      'locationPages:',
    );
  });
});
