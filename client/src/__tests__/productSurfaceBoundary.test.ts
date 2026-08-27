import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  EXPLORE_ENTITY_PARTICIPATION_CONTRACTS,
  PRODUCT_SURFACES,
  SURFACE_DISPOSITIONS,
  type ProductSurface,
} from '../../../shared/productSurfaces/productSurfaceRegistry';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relativePath: string): string =>
  readFileSync(join(repoRoot, relativePath), 'utf8');

const APP_TSX = 'client/src/App.tsx';
const DEVELOPER_ROUTES = 'client/src/pages/DeveloperRoutes.tsx';
const ADMIN_REGISTRY = 'client/src/pages/admin/adminRouteRegistry.tsx';

/** System routes that are not product surfaces. */
const SYSTEM_ROUTE_PATHS = new Set(['/404']);

function collectSourceFiles(dir: string, extensionFilter: Set<string>): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...collectSourceFiles(fullPath, extensionFilter));
    } else if (extensionFilter.has(extname(entry))) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractLiteralRoutePaths(source: string): string[] {
  const paths: string[] = [];
  const doubleQuoted = /<Route\s+path="([^"]+)"/g;
  const singleQuoted = /<Route\s+path=\{'([^']+)'\}/g;
  const adminEntries = /path:\s*'([^']+)'/g;
  for (const regex of [doubleQuoted, singleQuoted, adminEntries]) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      paths.push(match[1]);
    }
  }
  return paths;
}

export function surfacePatternToRegExp(pattern: string): RegExp {
  // Tokenise before escaping so wildcard characters are never treated as
  // regex quantifiers. A trailing "/*" owns its preceding slash. Sentinels
  // use the private-use area so lint's no-control-regex rule is satisfied.
  const tokenised = pattern
    .replace(/:[A-Za-z0-9_]+\*/g, '\uE000REST\uE000')
    .replace(/\/\*/g, '\uE000SLASH_WILD\uE000')
    .replace(/\*/g, '\uE000BARE_WILD\uE000')
    .replace(/:[A-Za-z0-9_]+/g, '\uE000PARAM\uE000');
  const escaped = tokenised.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const transformed = escaped
    .replace(/\uE000REST\uE000/g, '(.*)')
    .replace(/\uE000SLASH_WILD\uE000/g, '(?:/.*)?')
    .replace(/\uE000BARE_WILD\uE000/g, '.*')
    .replace(/\uE000PARAM\uE000/g, '([^/]+)');
  return new RegExp(`^${transformed}$`);
}

/**
 * Resolves the governing surface the same way wouter's Switch resolves a
 * mounted route: first registered match in PRODUCT_SURFACES declaration
 * order wins. The registry is therefore priority-ordered on purpose.
 */
function findGoverningSurface(
  path: string,
): { surface: ProductSurface; kind: 'route' | 'alias' } | null {
  for (const surface of PRODUCT_SURFACES) {
    for (const pattern of surface.routePatterns) {
      if (surfacePatternToRegExp(pattern).test(path)) return { surface, kind: 'route' };
    }
    for (const pattern of surface.aliasPatterns ?? []) {
      if (surfacePatternToRegExp(pattern).test(path)) return { surface, kind: 'alias' };
    }
  }
  return null;
}

describe('product surface registry integrity', () => {
  it('only uses known dispositions', () => {
    for (const surface of PRODUCT_SURFACES) {
      expect(
        SURFACE_DISPOSITIONS as readonly string[],
        `surface ${surface.id} has unknown disposition`,
      ).toContain(surface.disposition);
    }
  });

  it('requires notes on every pilot and hidden surface', () => {
    for (const surface of PRODUCT_SURFACES) {
      if (surface.disposition === 'launch') continue;
      expect(
        surface.notes?.trim().length ?? 0,
        `surface ${surface.id} needs a reason`,
      ).toBeGreaterThan(0);
    }
  });

  it('requires promotion criteria on hidden surfaces', () => {
    for (const surface of PRODUCT_SURFACES) {
      if (surface.disposition !== 'hidden') continue;
      expect(
        surface.promotionCriteria?.length ?? 0,
        `hidden surface ${surface.id} needs explicit promotion criteria`,
      ).toBeGreaterThan(0);
    }
  });

  it('never reuses an exact route or alias pattern across surfaces', () => {
    const ownership = new Map<string, string>();
    for (const surface of PRODUCT_SURFACES) {
      for (const pattern of [...surface.routePatterns, ...(surface.aliasPatterns ?? [])]) {
        const existing = ownership.get(pattern);
        expect(
          existing,
          `pattern ${pattern} claimed by ${existing ?? '-'} and ${surface.id}`,
        ).toBeUndefined();
        ownership.set(pattern, surface.id);
      }
    }
  });

  it('satisfies or explicitly explains every entity participation contract', () => {
    for (const participation of EXPLORE_ENTITY_PARTICIPATION_CONTRACTS) {
      if (participation.status === 'unmet') {
        expect(participation.unmetBecause?.trim().length ?? 0).toBeGreaterThan(0);
      }
      expect(participation.contract.length).toBeGreaterThan(0);
    }
  });
});

describe('mounted client routes respect the launch boundary', () => {
  const mountedPaths = [
    ...extractLiteralRoutePaths(read(APP_TSX)),
    ...extractLiteralRoutePaths(read(DEVELOPER_ROUTES)),
    ...extractLiteralRoutePaths(read(ADMIN_REGISTRY)),
  ].filter(path => !SYSTEM_ROUTE_PATHS.has(path));

  it('found a meaningful number of mounted routes to govern', () => {
    expect(mountedPaths.length).toBeGreaterThan(80);
  });

  it('every mounted path is governed by a registered surface', () => {
    const failures: string[] = [];
    for (const path of mountedPaths) {
      if (!findGoverningSurface(path)) {
        failures.push(`UNREGISTERED: ${path}`);
      }
    }
    expect(failures, `\n${failures.join('\n')}`).toEqual([]);
  });

  it('no hidden surface is mounted', () => {
    const violations: string[] = [];
    for (const path of mountedPaths) {
      const governing = findGoverningSurface(path);
      if (governing && governing.surface.disposition === 'hidden' && governing.kind === 'route') {
        violations.push(`${path} mounts hidden surface ${governing.surface.id}`);
      }
    }
    expect(violations, `\n${violations.join('\n')}`).toEqual([]);
  });
});

describe('shipped client source carries no placeholder vocabulary', () => {
  const clientSrcDir = join(repoRoot, 'client/src');
  const extensions = new Set(['.ts', '.tsx']);
  const bannedPatterns: Array<{ name: string; regex: RegExp }> = [
    { name: 'coming-soon copy', regex: /coming soon/i },
    { name: 'construction placeholder marker', regex: /🚧/ },
  ];

  it('contains no banned placeholder vocabulary outside tests and examples', () => {
    const violations: string[] = [];
    const files = collectSourceFiles(clientSrcDir, extensions);
    for (const filePath of files) {
      const normalized = filePath.replaceAll('\\', '/');
      if (
        normalized.includes('/__tests__/') ||
        /\.test\./.test(normalized) ||
        /\.example\./.test(normalized) ||
        /\.stories\./.test(normalized)
      ) {
        continue;
      }
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        for (const banned of bannedPatterns) {
          if (banned.regex.test(line)) {
            violations.push(`${normalized.replace(repoRoot + '/', '')}:${index + 1}: ${banned.name}`);
          }
        }
      });
    }
    expect(violations, `\n${violations.join('\n')}`).toEqual([]);
  });
});
