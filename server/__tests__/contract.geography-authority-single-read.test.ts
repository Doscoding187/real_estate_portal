import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * One geography authority.
 *
 * Location identity is owned by the Place Authority. While its runtime projection is still in
 * service, exactly one module may read it. This contract holds that boundary so the legacy
 * three-level tables can only shrink, and so a new feature cannot quietly start a second
 * geography.
 *
 * The allow-list below is the retirement inventory. Removing an entry is progress; adding one
 * is a regression and fails this test.
 */

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../..');

/**
 * Files permitted to read the runtime location projection directly.
 *
 * `server/services/geographyAuthorityService.ts` is the registered boundary and the intended
 * replacement for every entry here. The remaining entries are recorded retirement work.
 */
const PERMITTED_DIRECT_PROJECTION_READERS: readonly string[] = [
  // The registered boundary.
  'server/services/geographyAuthorityService.ts',
  // Authoring and public projection writes still carry the legacy handles.
  'server/db.ts',
  // Discovery and public search.
  'server/locationRouter.ts',
  'server/enhancedLocationRouter.ts',
  'server/services/locationResolverService.ts',
  'server/services/searchDiscoveryService.ts',
  'server/services/locationPagesService.ts',
  'server/services/locationInsightsService.ts',
  'server/services/locationAutoPopulation.ts',
  'server/services/homeMarketInsightsService.ts',
  'server/services/priceInsightsService.ts',
  'server/services/propertySearchService.ts',
  'server/services/agentPublicProfileService.ts',
  'server/services/listingLocationResolver.ts',
  'server/services/landWorkflowService.ts',
  'server/services/sharedLivingAuthoringService.ts',
  'server/services/sharedLivingPublicService.ts',
  // Diagnostics.
  'scripts/check-location-data.ts',
  'scripts/check-provinces.ts',
  'scripts/test-location-pages.ts',
];

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

  it('reads the runtime location projection from the recorded boundary only', () => {
    expect([...readers].sort()).toEqual([...PERMITTED_DIRECT_PROJECTION_READERS].sort());
  });

  it('does not let a consumer read the location tables directly', () => {
    const consumers = readers.filter(file => !PERMITTED_DIRECT_PROJECTION_READERS.includes(file));
    expect(
      consumers,
      'a consumer must read place identity through the geography authority',
    ).toEqual([]);
  });

  it('keeps the guide read path on the geography authority', () => {
    for (const guideService of [
      'server/services/provinceGuideService.ts',
      'server/services/cityGuideDiscoveryService.ts',
    ]) {
      expect(readsLocationTablesDirectly(guideService)).toEqual([]);
    }
  });

  it('records a retirement inventory that only shrinks', () => {
    // Every permitted reader that is not the boundary is outstanding retirement work.
    const outstanding = PERMITTED_DIRECT_PROJECTION_READERS.filter(
      file => file !== 'server/services/geographyAuthorityService.ts',
    );
    expect(outstanding.length).toBeGreaterThan(0);
    for (const file of outstanding) {
      expect(
        readers.includes(file),
        `${file} is recorded for retirement; remove it from the allow-list when it is switched over`,
      ).toBe(true);
    }
  });
});
