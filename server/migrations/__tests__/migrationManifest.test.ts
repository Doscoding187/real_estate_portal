import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertTidbCompatibleMigrationSql,
  loadAndValidateMigrationManifest,
  parseSqlStatements,
  type MigrationManifestDocument,
  type MigrationManifestEntry,
} from '../migrationManifest';
import { buildMigrationPlan } from '../runSqlMigrations';

const roots: string[] = [];
const checksum = (value: string) => createHash('sha256').update(value).digest('hex');

function entry(
  sequence: number,
  name: string,
  sql: string,
  parent: MigrationManifestEntry | null,
): MigrationManifestEntry {
  return {
    sequence,
    filename: name,
    checksum: checksum(sql),
    parent: parent?.filename ?? null,
    parentChecksum: parent?.checksum ?? null,
    kind: sequence === 0 ? 'establishment' : 'ddl',
    statementPolicy: sequence === 0 ? 'immutable-baseline' : 'single-ddl',
    requiredReferenceDataVersion: null,
  };
}

function fixture(count = 3) {
  const root = mkdtempSync(join(tmpdir(), 'listify-manifest-'));
  roots.push(root);
  mkdirSync(join(root, '_archived'));
  const sql = [
    'CREATE TABLE widget (id int);',
    'ALTER TABLE widget ADD name varchar(20);',
    'ALTER TABLE widget ADD enabled int;',
  ];
  const names = ['0000_canonical_launch_baseline.sql', '0001_add_name.sql', '0002_add_enabled.sql'];
  const entries: MigrationManifestEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    writeFileSync(join(root, names[index]), sql[index]);
    entries.push(entry(index, names[index], sql[index], entries[index - 1] ?? null));
  }
  const document: MigrationManifestDocument = {
    manifestVersion: 1,
    dialect: 'mysql',
    historyTable: 'sql_migration_history',
    attemptTable: 'sql_migration_attempts',
    lockName: 'fixture_migrations',
    expectedHead: entries.at(-1)!.filename,
    migrations: entries,
  };
  const manifestPath = join(root, 'manifest.json');
  const save = () => writeFileSync(manifestPath, `${JSON.stringify(document, null, 2)}\n`);
  save();
  return { root, manifestPath, document, entries, sql, names, save };
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('canonical migration manifest', () => {
  it.each([
    ['trigger', 'CREATE TRIGGER immutable_widget BEFORE UPDATE ON widget FOR EACH ROW SET @x = 1;'],
    ['procedure', 'CREATE PROCEDURE rebuild_widget() SELECT 1;'],
    ['function', 'CREATE FUNCTION widget_value() RETURNS INT RETURN 1;'],
    ['event', 'CREATE EVENT rebuild_widget ON SCHEDULE EVERY 1 DAY DO SELECT 1;'],
    ['delimiter', 'DELIMITER $$\nCREATE TABLE widget_two (id int)$$'],
  ])('rejects TiDB-unsupported %s migration primitives', (_label, sql) => {
    expect(() => assertTidbCompatibleMigrationSql(sql)).toThrow('TiDB compatibility guard');
  });

  it('does not confuse ordinary table or column names with stored programs', () => {
    expect(() =>
      assertTidbCompatibleMigrationSql(
        'CREATE TABLE scheduled_events (trigger_stage varchar(32), event_name varchar(64));',
      ),
    ).not.toThrow();
  });

  it('accepts the integrated repository 0000 -> 0007 manifest with exact ancestry', () => {
    const manifest = loadAndValidateMigrationManifest({
      migrationsDirectory: resolve('server/migrations'),
    });
    const [
      baseline,
      incremental,
      taxonomy,
      measurements,
      location,
      manualLocation,
      supersessions,
      launchAccess,
    ] = manifest.orderedMigrations;

    expect(baseline).toMatchObject({
      sequence: 0,
      filename: '0000_canonical_launch_baseline.sql',
      parent: null,
      parentChecksum: null,
    });
    expect(incremental).toMatchObject({
      sequence: 1,
      filename: '0001_public_search_to_lead_reliability.sql',
      parent: baseline.filename,
      parentChecksum: baseline.checksum,
      checksum: 'adb04a6e5655e4812ddd594d2b85cb5b218c6f54cb2fc0c029ecdc76325da5a0',
      kind: 'ddl',
      statementPolicy: 'single-ddl',
    });
    expect(taxonomy).toMatchObject({
      sequence: 2,
      filename: '0002_canonical_property_taxonomy.sql',
      parent: incremental.filename,
      parentChecksum: incremental.checksum,
      checksum: 'a0ac7ae582fa0b1910211bc20d99ba13064e74ac00d3413681b77a1476808801',
      kind: 'exceptional',
      statementPolicy: 'approved-exception',
    });
    expect(measurements).toMatchObject({
      sequence: 3,
      filename: '0003_canonical_property_measurements.sql',
      parent: taxonomy.filename,
      parentChecksum: taxonomy.checksum,
      checksum: '773c8488b1b574b958b92d484b2e20b504175ffa30aa035f5608d9d3716fe76c',
      kind: 'ddl',
      statementPolicy: 'single-ddl',
    });
    expect(location).toMatchObject({
      sequence: 4,
      filename: '0004_canonical_listing_location.sql',
      parent: measurements.filename,
      parentChecksum: measurements.checksum,
      checksum: 'b772082a269b7e30ed514d9850b129192ddc0bd05842a558f46af017b3726dbe',
      kind: 'exceptional',
      statementPolicy: 'approved-exception',
      approvalReference: 'PLE-6B-2026-08-10-Edward',
    });
    expect(manualLocation).toMatchObject({
      sequence: 5,
      filename: '0005_manual_location_without_coordinates.sql',
      parent: location.filename,
      parentChecksum: location.checksum,
      checksum: '8f1e3c8481dc606a89d3fc8e01ffc72fecd02e7aa15cfb4b889a7a78d4abf51b',
      kind: 'exceptional',
      statementPolicy: 'approved-exception',
      approvalReference: 'PLE-6C-2026-08-10-Edward',
    });
    expect(supersessions).toMatchObject({
      sequence: 6,
      filename: '0006_development_supersessions.sql',
      parent: manualLocation.filename,
      parentChecksum: manualLocation.checksum,
      checksum: '9171fe61ba526321847ef9615fe0121cd1e89812f4e8ef71c26350db37ae5655',
      kind: 'ddl',
      statementPolicy: 'single-ddl',
    });
    expect(launchAccess).toMatchObject({
      sequence: 7,
      filename: '0007_paid_launch_access_invoice_term.sql',
      parent: supersessions.filename,
      parentChecksum: supersessions.checksum,
      checksum: '84565313674a13833cf033e16a91ee8785bc722d412ae02aecb6a2a19200ab46',
      kind: 'ddl',
      statementPolicy: 'single-ddl',
    });
    expect(manifest.expectedHead.filename).toBe('0018_distribution_access_publisher_authority.sql');
  });

  it('plans the identity-and-custody migration chain from the integrated 0007 head', () => {
    const manifest = loadAndValidateMigrationManifest({
      migrationsDirectory: resolve('server/migrations'),
    });
    const currentIntegratedHead = manifest.orderedMigrations[7];
    const plan = buildMigrationPlan({
      manifest,
      targetFingerprintHash: 'a'.repeat(64),
      applied: manifest.orderedMigrations.slice(0, 8).map(item => ({
        fileName: item.filename,
        checksum: item.checksum,
      })),
      acceptedOldHead: currentIntegratedHead.filename,
      expectedNewHead: '0018_distribution_access_publisher_authority.sql',
    });

    expect(plan.acceptedOldHead).toBe('0007_paid_launch_access_invoice_term.sql');
    expect(plan.pending).toHaveLength(11);
    expect(plan.pending.map(item => item.filename)).toEqual([
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
    ]);
    expect(plan.expectedNewHead).toBe('0018_distribution_access_publisher_authority.sql');
  });

  it('accepts an isolated 0000 -> 0001 -> 0002 progression in ancestry order', () => {
    const value = fixture();
    expect(
      loadAndValidateMigrationManifest({
        migrationsDirectory: value.root,
        manifestPath: value.manifestPath,
      }).orderedMigrations.map(item => item.filename),
    ).toEqual(value.names);
  });

  it('rejects duplicate numbers and malformed identities without lexical tie-breaking', () => {
    const value = fixture(2);
    const duplicateSql = 'ALTER TABLE widget ADD other int;';
    writeFileSync(join(value.root, '0001_other.sql'), duplicateSql);
    value.document.migrations.push(entry(1, '0001_other.sql', duplicateSql, value.entries[0]));
    value.document.expectedHead = '0001_other.sql';
    value.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: value.root,
        manifestPath: value.manifestPath,
      }),
    ).toThrow('duplicate numeric migration identity');

    value.document.migrations[2].filename = '0001-Bad.sql';
    value.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: value.root,
        manifestPath: value.manifestPath,
      }),
    ).toThrow('malformed');
  });

  it('rejects missing files, extra active files, and checksum drift', () => {
    const missing = fixture(2);
    missing.document.migrations.push(
      entry(2, '0002_missing.sql', 'ALTER TABLE widget ADD missing int;', missing.entries[1]),
    );
    missing.document.expectedHead = '0002_missing.sql';
    missing.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: missing.root,
        manifestPath: missing.manifestPath,
      }),
    ).toThrow('absent from active SQL directory');

    const extra = fixture(1);
    writeFileSync(join(extra.root, '0001_extra.sql'), 'ALTER TABLE widget ADD extra int;');
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: extra.root,
        manifestPath: extra.manifestPath,
      }),
    ).toThrow('active SQL file is absent from manifest');

    const drift = fixture(1);
    writeFileSync(join(drift.root, drift.names[0]), 'CREATE TABLE changed (id int);');
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: drift.root,
        manifestPath: drift.manifestPath,
      }),
    ).toThrow('checksum drift');
  });

  it('rejects missing parents, cycles, and multiple heads', () => {
    const missingParent = fixture();
    missingParent.document.migrations[2].parent = '0001_absent.sql';
    missingParent.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: missingParent.root,
        manifestPath: missingParent.manifestPath,
      }),
    ).toThrow('missing parent');

    const cycle = fixture();
    cycle.document.migrations[0].parent = cycle.entries[2].filename;
    cycle.document.migrations[0].parentChecksum = cycle.entries[2].checksum;
    cycle.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: cycle.root,
        manifestPath: cycle.manifestPath,
      }),
    ).toThrow('cycle');

    const heads = fixture();
    heads.document.migrations[2].parent = heads.entries[0].filename;
    heads.document.migrations[2].parentChecksum = heads.entries[0].checksum;
    heads.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: heads.root,
        manifestPath: heads.manifestPath,
      }),
    ).toThrow('exactly one head');
  });

  it('rejects archived execution and unsafe multi-DDL incrementals', () => {
    const archived = fixture(1);
    const archivedSql = 'ALTER TABLE widget ADD retired int;';
    writeFileSync(join(archived.root, '_archived', '0001_retired.sql'), archivedSql);
    archived.document.migrations.push({
      ...entry(1, '_archived/0001_retired.sql', archivedSql, archived.entries[0]),
      filename: '_archived/0001_retired.sql',
    });
    archived.document.expectedHead = '_archived/0001_retired.sql';
    archived.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: archived.root,
        manifestPath: archived.manifestPath,
      }),
    ).toThrow('archived');

    const multi = fixture(2);
    const multiSql = 'ALTER TABLE widget ADD first int; ALTER TABLE widget ADD second int;';
    writeFileSync(join(multi.root, multi.names[1]), multiSql);
    multi.document.migrations[1].checksum = checksum(multiSql);
    multi.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: multi.root,
        manifestPath: multi.manifestPath,
      }),
    ).toThrow('exactly one statement');
  });

  it('rejects database lifecycle, cross-schema, and ordinary destructive DDL', () => {
    const lifecycle = fixture(2);
    const lifecycleSql = 'DROP DATABASE another_worktree;';
    writeFileSync(join(lifecycle.root, lifecycle.names[1]), lifecycleSql);
    lifecycle.document.migrations[1].checksum = checksum(lifecycleSql);
    lifecycle.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: lifecycle.root,
        manifestPath: lifecycle.manifestPath,
      }),
    ).toThrow('may not administer databases');

    const crossSchema = fixture(2);
    const crossSchemaSql = 'ALTER TABLE other_worktree.widget ADD escaped int;';
    writeFileSync(join(crossSchema.root, crossSchema.names[1]), crossSchemaSql);
    crossSchema.document.migrations[1].checksum = checksum(crossSchemaSql);
    crossSchema.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: crossSchema.root,
        manifestPath: crossSchema.manifestPath,
      }),
    ).toThrow('cross-schema');

    const destructive = fixture(2);
    const destructiveSql = 'ALTER TABLE widget DROP COLUMN id;';
    writeFileSync(join(destructive.root, destructive.names[1]), destructiveSql);
    destructive.document.migrations[1].checksum = checksum(destructiveSql);
    destructive.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: destructive.root,
        manifestPath: destructive.manifestPath,
      }),
    ).toThrow('approved exceptional migration');
  });
});
