import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

const RETIRED_RESIDUAL_EXECUTORS = [
  'generate-hash.ts',
  'scripts/diagnose-location-pages.ts',
  'scripts/integrate-subscription-system.ts',
  'scripts/reproduce_listing_500.ts',
  'scripts/run-google-places-migration.ts',
  'scripts/run-property-results-optimization-migration.ts',
  'scripts/run-tidb-explore-migration.ts',
  'server/scripts/debug-schema.ts',
] as const;

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function collectServerSourceFiles(directory: string): string[] {
  const absoluteDirectory = join(ROOT, directory);

  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name).replaceAll('\\', '/');

    if (entry.isDirectory()) {
      return collectServerSourceFiles(path);
    }

    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

describe('database final closure residual executor authority', () => {
  it('retires and prohibits every residual executor', () => {
    const manifest = JSON.parse(
      read('docs/database-authority/' + 'migration-tree-authority.json'),
    ) as {
      version: number;
      prohibitedPaths: string[];
      operationalDocumentation: Array<{
        path: string;
        disposition: string;
      }>;
      manualUtilityAuthority: {
        knownManualSchemaExecutorCandidates: string[];
        directSchemaCandidateClasses: Record<string, string[]>;
        deferredGap3Utilities: string[];
        prohibitedManualSchemaExecutors: string[];
        retiredPaths: string[];
      };
    };

    const manual = manifest.manualUtilityAuthority;

    expect(manifest.version).toBe(7);
    expect(manual.directSchemaCandidateClasses['deferred schema executor']).toEqual([]);
    expect(manual.deferredGap3Utilities).toEqual([]);

    for (const path of RETIRED_RESIDUAL_EXECUTORS) {
      expect(existsSync(join(ROOT, path)), `Residual executor returned: ${path}`).toBe(false);

      expect(manual.knownManualSchemaExecutorCandidates).toContain(path);

      expect(manual.directSchemaCandidateClasses['retired prohibited']).toContain(path);

      expect(manual.prohibitedManualSchemaExecutors).toContain(path);

      expect(manual.retiredPaths).toContain(path);

      expect(manifest.prohibitedPaths).toContain(path);
    }

    expect(manifest.operationalDocumentation).toContainEqual({
      path: 'docs/database-authority/' + 'dba-s4a2-residual-executor-' + 'containment.md',
      disposition: 'canonical DBA-S4A2 residual ' + 'executor containment authority',
    });
  });

  it('keeps package commands free of retired executors', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    };

    const commands = Object.values(packageJson.scripts).join('\n');

    for (const path of RETIRED_RESIDUAL_EXECUTORS) {
      expect(commands).not.toContain(path);
    }
  });

  it('keeps one directly executable canonical migration', () => {
    const manifest = JSON.parse(
      read('docs/database-authority/' + 'migration-tree-authority.json'),
    ) as {
      canonicalAuthority: {
        activeSqlDirectory: string;
      };
    };

    const activeSqlFiles = readdirSync(join(ROOT, manifest.canonicalAuthority.activeSqlDirectory), {
      withFileTypes: true,
    })
      .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
      .map(entry => entry.name)
      .sort();
    const executionManifest = JSON.parse(read('server/migrations/manifest.json')) as {
      expectedHead: string;
      migrations: Array<{ filename: string }>;
    };
    const manifestFiles = executionManifest.migrations.map(entry => entry.filename);

    expect(activeSqlFiles).toEqual([...manifestFiles].sort());
    expect(executionManifest.expectedHead).toBe(manifestFiles.at(-1));
  });

  it('retains launch Explore compatibility separately from future cutover', () => {
    const inventory = JSON.parse(read('drizzle/schema/' + 'canonical-model-inventory.json')) as {
      explore: {
        compatibilityAuthority: string[];
      };
    };

    const futureContract = read(
      'server/__tests__/' + 'contract.database-explore-' + 'future-authority.test.ts',
    );

    expect(inventory.explore.compatibilityAuthority).toEqual(['content_topics', 'explore_shorts']);

    expect(futureContract).toContain('RUN_FUTURE_EXPLORE_AUTHORITY_CONTRACT');

    expect(futureContract).toContain(': describe.skip');
  });

  it('keeps live schema probing in the centralized authority service', () => {
    const probePattern =
      /db\.execute\(\s*sql`[\s\S]{0,1200}?\binformation_schema\b|\.execute\(\s*['"`]\s*(?:SHOW|DESCRIBE)\b/i;

    const probeFiles = collectServerSourceFiles('server')
      .filter(
        path =>
          !path.startsWith('server/scripts/') &&
          !path.startsWith('server/__tests__/') &&
          !path.startsWith('server/migrations/') &&
          !path.includes('/__tests__/') &&
          !path.includes('.test.') &&
          !path.includes('.spec.'),
      )
      .filter(path => {
        const source = read(path)
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');

        return probePattern.test(source);
      })
      .sort();

    expect(probeFiles).toEqual(['server/services/' + 'runtimeSchemaCapabilities.ts']);
  });
});
