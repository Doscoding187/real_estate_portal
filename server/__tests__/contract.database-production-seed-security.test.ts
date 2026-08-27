import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const RETIRED_SECURITY_UTILITIES = [
  'scripts/check_prod_data.ts',
  'scripts/create-verified-user.ts',
  'scripts/debug_user_status.ts',
  'scripts/repro-superadmin-seed.ts',
  'server/scripts/seed-prod-super-admin.ts',
  'server/scripts/seed_super_admin.ts',
] as const;
const RETIRED_MONOLITHIC_DATA_UTILITIES = [
  'server/scripts/localDemoSeed.ts',
  'server/scripts/verifyLocalDemoSeed.ts',
] as const;

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function collectSourceFiles(directory: string): string[] {
  const absoluteDirectory = join(ROOT, directory);
  if (!existsSync(absoluteDirectory)) return [];

  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [path] : [];
  });
}

function hasLiteralProperty(source: string, property: string): boolean {
  return new RegExp(`\\b${property}\\s*:\\s*['"][^'"\\n]+['"]`, 'i').test(source);
}

function isDirectDatabaseConnection(source: string): boolean {
  return /(?:mysql|mariadb)\.create(?:Connection|Pool)\s*\(|\bcreate(?:Connection|Pool)\s*\(/.test(
    source,
  );
}

function hasLiteralConnectionObject(source: string): boolean {
  return ['host', 'user', 'password', 'database'].every(property =>
    hasLiteralProperty(source, property),
  );
}

function hasEmbeddedAccountPassword(source: string): boolean {
  return /\b(?:password|passwd|pwd)\s*[:=]\s*['"][^'"\n]+['"]/i.test(source);
}

function hasDirectAccountMutation(source: string): boolean {
  return /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:users?|accounts?|super_admins?)\b/i.test(
    source,
  );
}

function isProductionTarget(path: string, source: string): boolean {
  return /(?:production|prod(?:uction)?[-_\s]?(?:db|data|database)|listify_property_sa)/i.test(
    `${path}\n${source}`,
  );
}

describe('database production seed security authority', () => {
  it('keeps all retired production and account-mutation utilities prohibited', () => {
    const manifest = JSON.parse(read('docs/database-authority/migration-tree-authority.json')) as {
      prohibitedPaths: string[];
      manualUtilityAuthority: {
        localTestSeedOrFixtureUtilities: string[];
        controlledDataRepairUtilities: string[];
      };
    };
    const packageJson = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    };
    const commands = Object.values(packageJson.scripts).join('\n');

    for (const path of RETIRED_SECURITY_UTILITIES) {
      expect(existsSync(join(ROOT, path)), `Retired security utility returned: ${path}`).toBe(
        false,
      );
      expect(manifest.prohibitedPaths, `Missing prohibited path: ${path}`).toContain(path);
      expect(manifest.manualUtilityAuthority.localTestSeedOrFixtureUtilities).not.toContain(path);
      expect(manifest.manualUtilityAuthority.controlledDataRepairUtilities).not.toContain(path);
      expect(commands, `Package command invokes retired security utility: ${path}`).not.toContain(
        path,
      );
    }
  });

  it('prohibits embedded bcrypt password inputs in database utilities', () => {
    const sourceFiles = [...collectSourceFiles('scripts'), ...collectSourceFiles('server/scripts')];

    for (const path of sourceFiles) {
      expect(read(path), `Embedded bcrypt input is prohibited: ${path}`).not.toMatch(
        /bcrypt(?:js)?\.hash\(\s*['"][^'"\n]+['"]\s*,/,
      );
    }
  });

  it('prohibits hard-coded production database connection objects', () => {
    const sourceFiles = [...collectSourceFiles('scripts'), ...collectSourceFiles('server/scripts')];

    for (const path of sourceFiles) {
      const source = read(path);
      const isHardCodedProductionConnection =
        isDirectDatabaseConnection(source) &&
        hasLiteralConnectionObject(source) &&
        isProductionTarget(path, source);

      expect(
        isHardCodedProductionConnection,
        `Hard-coded production database connection is prohibited: ${path}`,
      ).toBe(false);
    }
  });

  it('prohibits unguarded direct account mutations with embedded passwords', () => {
    const sourceFiles = [...collectSourceFiles('scripts'), ...collectSourceFiles('server/scripts')];

    for (const path of sourceFiles) {
      const source = read(path);
      const isUnsafeAccountMutation =
        isDirectDatabaseConnection(source) &&
        hasDirectAccountMutation(source) &&
        hasEmbeddedAccountPassword(source);

      expect(
        isUnsafeAccountMutation,
        `Unguarded direct account mutation with an embedded password is prohibited: ${path}`,
      ).toBe(false);
    }
  });

  it('keeps operation-specific data roles explicit and the monolithic seed retired', () => {
    const manifest = JSON.parse(read('docs/database-authority/migration-tree-authority.json')) as {
      prohibitedPaths: string[];
      manualUtilityAuthority: {
        approvedLocalTestInitialization: string[];
        localTestSeedOrFixtureUtilities: string[];
      };
    };

    for (const path of RETIRED_MONOLITHIC_DATA_UTILITIES) {
      expect(existsSync(join(ROOT, path)), `Retired data utility returned: ${path}`).toBe(false);
      expect(manifest.prohibitedPaths, `Missing prohibited path: ${path}`).toContain(path);
      expect(manifest.manualUtilityAuthority.localTestSeedOrFixtureUtilities).not.toContain(path);
    }

    const roleManifest = read(
      'server/_core/databaseAuthority/dataAdapters/dataRoleManifest.ts',
    );
    expect(manifest.manualUtilityAuthority.approvedLocalTestInitialization).toEqual([
      'docker/mysql-local/init/01-create-local-databases.sql',
      'scripts/testDbWorkflow.ts',
    ]);
    expect(roleManifest).toContain("key: 'reference.geography'");
    expect(roleManifest).toContain("key: 'foundation.launch-access'");
    expect(roleManifest).toContain("key: 'demo.listing-preview-authentication'");
    expect(roleManifest).toContain("key: 'scenario.search-to-lead'");
    expect(roleManifest).toContain("prepareOperation: 'foundation-seed'");
    expect(roleManifest).toContain('schemaMutation: false');
    expect(roleManifest).not.toContain('LOCAL_SEED_ALLOWED');
  });

  it('runs through an isolated database-authority workspace only', () => {
    const config = read('vitest.database-authority-static.config.ts');
    const workspace = read('vitest.database-authority-static.workspace.ts');
    const packageJson = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    };

    expect(config).toContain('envDir: false');
    expect(config).not.toContain('setupFiles');
    expect(config).not.toContain('globalSetup');
    expect(config).not.toMatch(/(?:DATABASE_URL|mysql)/i);
    expect(config).not.toMatch(/^\s*import\s/m);
    expect(workspace).toMatch(
      /^export default \[\s*'\.\/vitest\.database-authority-static\.config\.ts'\s*\];\s*$/,
    );
    expect(workspace).not.toMatch(/^\s*import\s/m);
    expect(packageJson.scripts['test:db-authority:static']).toContain(
      'vitest.database-authority-static.config.ts',
    );
    expect(packageJson.scripts['test:db-authority:static']).toContain(
      'vitest.database-authority-static.workspace.ts',
    );
  });
});
