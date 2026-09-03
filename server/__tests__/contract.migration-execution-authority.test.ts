import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const CANONICAL_RUNNER = 'server/migrations/runSqlMigrations.ts';
const APPROVED_OPERATIONAL_ENTRYPOINTS = new Set([
  'db:migrate',
  'db:migrate:plan',
  'db:migrate:apply',
  'db:migration-recovery:plan',
  'db:migration-recovery:apply',
  'db:migrate:test',
  'db:migrate:local',
  'db:release:plan',
  'db:release:apply',
  'release:predeploy:production',
]);
const APPROVED_TEST_ENTRYPOINTS = new Set(['db:authority:consumer-contract']);

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
    const authorityCliCommand =
      executable === 'scripts/databaseAuthorityCli.ts'
        ? command.match(/databaseAuthorityCli\.ts\s+([\w:.-]+)/)?.[1]
        : null;
    const authorityCliUsesMigrationRunner =
      authorityCliCommand !== null &&
      [
        'migration:plan',
        'migration:apply',
        'migration-recovery:plan',
        'migration-recovery:apply',
        'release:plan',
        'release:apply',
      ].includes(authorityCliCommand);
    if (executable !== 'scripts/databaseAuthorityCli.ts' || authorityCliUsesMigrationRunner) {
      signals.push(...migrationSignals(source));
      if (source.includes(CANONICAL_RUNNER) || source.includes('migrations/runSqlMigrations')) {
        runners.add(CANONICAL_RUNNER);
      }
    }

    const isReadOnlyLocalWorkflowAction =
      executable === 'scripts/localDbWorkflow.ts' && /\s(?:target|verify)$/.test(command);
    const isReadOnlyAuthorityStatus = executable === 'scripts/databaseAuthorityStatus.ts';

    for (const reference of isReadOnlyLocalWorkflowAction || isReadOnlyAuthorityStatus
      ? []
      : sourcePackageReferences(source)) {
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
    expect(resolvePackageScript('db:migrate', manifest).runners).toEqual(
      new Set([CANONICAL_RUNNER]),
    );
    expect(resolvePackageScript('db:migrate:test', manifest).runners).toEqual(
      new Set([CANONICAL_RUNNER]),
    );
    expect(resolvePackageScript('db:migrate:local', manifest).runners).toEqual(
      new Set([CANONICAL_RUNNER]),
    );
    expect(manifest.scripts['db:release:plan']).toContain('databaseAuthorityCli.ts release:plan');
    expect(manifest.scripts['db:release:apply']).toContain('databaseAuthorityCli.ts release:apply');
    expect(manifest.scripts['release:predeploy:production']).toContain('db:release:plan');
    expect(manifest.scripts['release:predeploy:production']).not.toContain('db:migrate');
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
        expect(
          ['db:migrate:test', 'db:authority:consumer-contract', 'db:verify:ci'],
          `${workflow} may only invoke an approved canonical CI migration or verification wrapper.`,
        ).toContain(reference);
      }
    }

    const ci = read('.github/workflows/ci.yml');
    expect(ci.match(/pnpm db:migrate:test/g)).toHaveLength(1);
    expect(ci.match(/pnpm db:authority:consumer-contract/g)).toHaveLength(1);
    expect(ci.match(/pnpm db:verify:ci/g)).toHaveLength(1);
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
    const executionManifest = JSON.parse(read('server/migrations/manifest.json')) as {
      historyTable: string;
      attemptTable: string;
      expectedHead: string;
      migrations: Array<{
        sequence: number;
        filename: string;
        checksum: string;
        parent: string | null;
        parentChecksum: string | null;
      }>;
    };
    const manifestFiles = executionManifest.migrations.map(entry => entry.filename);
    const archivedSqlFiles = readdirSync(archiveDirectory, { recursive: true })
      .filter(file => String(file).endsWith('.sql'))
      .map(String);

    expect(runner).toContain('loadAndValidateMigrationManifest');
    expect(runner).not.toContain('readdirSync');
    expect(activeSqlFiles).toEqual([...manifestFiles].sort());
    expect(executionManifest.expectedHead).toBe(manifestFiles.at(-1));
    const baseline = executionManifest.migrations.find(entry => entry.sequence === 0);
    const incremental = executionManifest.migrations.find(entry => entry.sequence === 1);
    const taxonomy = executionManifest.migrations.find(entry => entry.sequence === 2);
    const measurements = executionManifest.migrations.find(entry => entry.sequence === 3);
    const location = executionManifest.migrations.find(entry => entry.sequence === 4);
    const manualLocation = executionManifest.migrations.find(entry => entry.sequence === 5);
    const developmentSupersessions = executionManifest.migrations.find(
      entry => entry.sequence === 6,
    );
    const launchAccess = executionManifest.migrations.find(entry => entry.sequence === 7);
    expect(incremental).toMatchObject({
      filename: '0001_public_search_to_lead_reliability.sql',
      parent: baseline?.filename,
      parentChecksum: baseline?.checksum,
    });
    expect(taxonomy).toMatchObject({
      sequence: 2,
      filename: '0002_canonical_property_taxonomy.sql',
      parent: incremental?.filename,
      parentChecksum: incremental?.checksum,
      checksum: 'a0ac7ae582fa0b1910211bc20d99ba13064e74ac00d3413681b77a1476808801',
    });
    expect(measurements).toMatchObject({
      sequence: 3,
      filename: '0003_canonical_property_measurements.sql',
      parent: taxonomy?.filename,
      parentChecksum: taxonomy?.checksum,
      checksum: '773c8488b1b574b958b92d484b2e20b504175ffa30aa035f5608d9d3716fe76c',
    });
    expect(location).toMatchObject({
      sequence: 4,
      filename: '0004_canonical_listing_location.sql',
      parent: measurements?.filename,
      parentChecksum: measurements?.checksum,
      checksum: 'b772082a269b7e30ed514d9850b129192ddc0bd05842a558f46af017b3726dbe',
    });
    expect(manualLocation).toMatchObject({
      sequence: 5,
      filename: '0005_manual_location_without_coordinates.sql',
      parent: location?.filename,
      parentChecksum: location?.checksum,
      checksum: '8f1e3c8481dc606a89d3fc8e01ffc72fecd02e7aa15cfb4b889a7a78d4abf51b',
    });
    expect(developmentSupersessions).toMatchObject({
      sequence: 6,
      filename: '0006_development_supersessions.sql',
      parent: manualLocation?.filename,
      parentChecksum: manualLocation?.checksum,
      checksum: '9171fe61ba526321847ef9615fe0121cd1e89812f4e8ef71c26350db37ae5655',
    });
    expect(launchAccess).toMatchObject({
      sequence: 7,
      filename: '0007_paid_launch_access_invoice_term.sql',
      parent: developmentSupersessions?.filename,
      parentChecksum: developmentSupersessions?.checksum,
      checksum: '84565313674a13833cf033e16a91ee8785bc722d412ae02aecb6a2a19200ab46',
    });
    expect(manifestFiles).toEqual([
      '0000_canonical_launch_baseline.sql',
      '0001_public_search_to_lead_reliability.sql',
      '0002_canonical_property_taxonomy.sql',
      '0003_canonical_property_measurements.sql',
      '0004_canonical_listing_location.sql',
      '0005_manual_location_without_coordinates.sql',
      '0006_development_supersessions.sql',
      '0007_paid_launch_access_invoice_term.sql',
      '0008_developer_organisations.sql',
      '0009_developer_organisation_memberships.sql',
      '0010_catalogue_publishers.sql',
      '0011_catalogue_publisher_developments.sql',
      '0012_catalogue_publisher_properties.sql',
      '0013_catalogue_publisher_leads.sql',
      '0014_catalogue_publisher_drafts.sql',
      '0015_catalogue_publisher_distribution_partnerships.sql',
      '0016_catalogue_publisher_distribution_access.sql',
      '0017_distribution_publisher_authority.sql',
      '0018_distribution_access_publisher_authority.sql',
      '0019_development_launch_date.sql',
      '0020_land_parcels.sql',
      '0021_land_assets.sql',
      '0022_land_asset_parcels.sql',
      '0023_land_listing_links.sql',
      '0024_land_claims.sql',
      '0025_land_evidence_documents.sql',
      '0026_land_marketing_authorities.sql',
      '0027_land_verification_assertions.sql',
      '0028_land_assertion_evidence.sql',
      '0029_land_verification_events.sql',
      '0030_land_conflict_cases.sql',
      '0031_land_review_cases.sql',
      '0032_land_review_events.sql',
      '0033_land_evidence_access_audit.sql',
      '0034_listing_lead_association.sql',
      '0035_commercial_assets.sql',
      '0036_commercial_spaces.sql',
      '0037_commercial_space_specifications.sql',
      '0038_commercial_availabilities.sql',
      '0039_commercial_availability_economics.sql',
      '0040_commercial_availability_listing_links.sql',
      '0041_commercial_availability_freshness_semantics.sql',
      '0042_commercial_economics_value_state_semantics.sql',
      '0043_commercial_specification_value_state_integrity.sql',
      '0044_commercial_positive_availability_provenance.sql',
      '0045_commercial_space_positive_area_integrity.sql',
      '0046_commercial_office_quote_terms.sql',
      '0047_commercial_gross_rental_component.sql',
      '0048_commercial_lease_terms.sql',
      '0049_commercial_lead_contexts.sql',
      '0050_commercial_asset_physical_location.sql',
      '0051_sl_places.sql',
      '0052_sl_spaces.sql',
      '0053_sl_space_availability.sql',
      '0054_sl_space_specifications.sql',
      '0055_sl_place_household.sql',
      '0056_sl_verifications.sql',
      '0057_sl_lead_contexts.sql',
      '0058_sl_messages.sql',
      '0059_sl_moderation_queue.sql',
      '0060_sl_space_availability_bills.sql',
      '0061_sl_messages_authorship.sql',
      '0062_agent_launch_access_full_capabilities.sql',
      '0063_agent_launch_access_earnings_feature.sql',
      '0064_auth_session_security.sql',
      '0065_auth_verification_token_cleanup.sql',
    ]);
    expect(executionManifest.expectedHead).toBe('0065_auth_verification_token_cleanup.sql');
    expect(archivedSqlFiles.length).toBeGreaterThan(0);
    expect(activeSqlFiles.some(file => file.includes('_archived'))).toBe(false);
    expect(executionManifest.historyTable).toBe('sql_migration_history');
    expect(executionManifest.attemptTable).toBe('sql_migration_attempts');
    expect(runner).toContain('checksum drift');
    expect(runner).toContain('await acquireMigrationLock(connection, manifest.document.lockName)');
    expect(runner.indexOf('await recordMigrationSuccess(')).toBeGreaterThan(
      runner.indexOf('await executeMigrationStatement(input.connection, statement)'),
    );
    expect(runner).toContain('accepted old head');
    expect(runner).toContain('incomplete or failed attempt');
    expect(runner).toContain('process.exit(1)');
    expect(basename(migrationsDirectory)).toBe('migrations');
  });
});
