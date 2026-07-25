import {
  existsSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

const RETIRED_PATHS = [
  "scripts/verify-development-page.ts",
  "scripts/verify-showings-migration.ts",
  "scripts/verify-wizard-e2e.ts",
  "scripts/seed.ts",
  "scripts/_validation_scripts.json",
  "scripts/validate-schema-sync.ts",
  "scripts/run-location-migration.ts",
  "scripts/extract-legacy-location-data.ts",
  "scripts/generate-location-slugs.ts",
  "scripts/sync-locations-table.ts",
  "scripts/migrate-listings-location-id.ts",
  "scripts/verify-location-migration.ts",
  "scripts/debug-create-development.ts",
  "scripts/debug-db.ts",
  "scripts/debug_schema.sql",
  "scripts/manual_schema_verify.sql",
  "scripts/repro-500.ts",
  "scripts/test-persistence.ts",
  "scripts/validate-phase4.ts",
  "scripts/verify_unit_types_schema.sql",
  "server/scripts/init-local-db.sql",
  "server/scripts/simulate-save.ts",
  "server/scripts/verify-dev-service.ts",
  "server/scripts/verify_development_flow.ts",
  "verify_fix.ts"
] as const;

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function exists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

describe('database residual utility authority', () => {
  it('removes unauthorized package database entrypoints', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).not.toHaveProperty('test:wizard:e2e');
    expect(packageJson.scripts).not.toHaveProperty('verify');
    expect(packageJson.scripts).not.toHaveProperty('verify:showings');
    expect(packageJson.scripts).not.toHaveProperty(
      'verify:showings:production',
    );

    const commands = Object.values(packageJson.scripts).join('\n');

    for (const path of RETIRED_PATHS) {
      expect(
        commands,
        `Package command invokes retired database utility: ${path}`,
      ).not.toContain(path);
    }
  });

  it('routes Makefile seeding through canonical local authority', () => {
    const makefile = read('Makefile');

    expect(makefile).toContain('\t@pnpm db:seed:local');
    expect(makefile).not.toContain('scripts/seed.ts');
  });

  it('keeps every S3C6B1 retirement absent and prohibited', () => {
    const manifest = JSON.parse(
      read('docs/database-authority/migration-tree-authority.json'),
    ) as {
      prohibitedPaths: string[];
      supportedDiagnosticAuthority: {
        retiredPaths: string[];
      };
    };

    for (const path of RETIRED_PATHS) {
      expect(
        exists(path),
        `Retired residual database utility returned: ${path}`,
      ).toBe(false);

      expect(
        manifest.prohibitedPaths,
        `Retired utility missing from prohibited paths: ${path}`,
      ).toContain(path);
    }

    for (const path of [
      'scripts/verify-development-page.ts',
      'scripts/verify-showings-migration.ts',
      'scripts/verify-wizard-e2e.ts',
      'scripts/validate-schema-sync.ts',
    ]) {
      expect(
        manifest.supportedDiagnosticAuthority.retiredPaths,
      ).toContain(path);
    }
  });

  it('retains prospect security verification only as guarded local fixture', () => {
    const verifier = read(
      'scripts/verify-prospect-journey-security.ts',
    );
    const runner = read('scripts/run-prospect-journey-e2e.ts');
    const manifest = JSON.parse(
      read('docs/database-authority/migration-tree-authority.json'),
    ) as {
      manualUtilityAuthority: {
        knownManualSchemaExecutorCandidates: string[];
        directSchemaCandidateClasses: Record<string, string[]>;
        localTestSeedOrFixtureUtilities: string[];
        deferredGap3Utilities: string[];
      };
    };

    expect(verifier).toContain(
      "const database = 'listify_prospect_journey_e2e'",
    );
    expect(verifier).toContain(
      "['localhost', '127.0.0.1', '::1'].includes(url.hostname)",
    );

    expect(verifier).not.toMatch(
      /\.(?:query|execute)\s*\(\s*['"`]\s*(?:CREATE|ALTER|DROP|TRUNCATE|RENAME)\b/i,
    );

    expect(verifier).toMatch(/INSERT INTO properties/);
    expect(verifier).toMatch(
      /UPDATE prospect_action_claim_tokens SET expires_at/,
    );

    expect(runner).toContain(
      "['exec', 'tsx', 'server/migrations/runSqlMigrations.ts']",
    );
    expect(runner).toContain(
      "['exec', 'tsx', 'scripts/verify-prospect-journey-security.ts']",
    );

    for (const path of [
      'scripts/run-listing-performance-e2e.ts',
      'scripts/run-prospect-journey-e2e.ts',
      'scripts/verify-prospect-journey-security.ts',
    ]) {
      expect(
        manifest.manualUtilityAuthority
          .localTestSeedOrFixtureUtilities,
      ).toContain(path);

      expect(
        manifest.manualUtilityAuthority
          .knownManualSchemaExecutorCandidates,
      ).not.toContain(path);

      expect(
        manifest.manualUtilityAuthority.deferredGap3Utilities,
      ).not.toContain(path);

      for (
        const candidates of Object.values(
          manifest.manualUtilityAuthority.directSchemaCandidateClasses,
        )
      ) {
        expect(candidates).not.toContain(path);
      }
    }
  });
});
