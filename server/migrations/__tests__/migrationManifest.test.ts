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

  it('rejects a TiDB ALTER TABLE job that creates columns with dependent keys or constraints', () => {
    expect(() =>
      assertTidbCompatibleMigrationSql(
        'ALTER TABLE leads ADD COLUMN capture_request_id varchar(128), ADD UNIQUE KEY uq_leads_capture_request (capture_request_id);',
      ),
    ).toThrow('sequence them as separate statements');
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
      filename: '0001_public_search_to_lead_reliability_sequenced.sql',
      parent: baseline.filename,
      parentChecksum: baseline.checksum,
      checksum: '510ae023e9c3bc04a7d92f7a533843939412f82d4f04cd1bf11c312fb89bc4a3',
      kind: 'exceptional',
      statementPolicy: 'approved-exception',
      approvalReference: 'DBX-TIDB-0001-REPLACEMENT-2026-09-04-Edward',
    });
    expect(incremental.statementCount).toBe(2);
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
      checksum: 'e0b199683c211064257cc8b1b518ab2323120c48140e55d4e1df2dee43761aa7',
      kind: 'exceptional',
      statementPolicy: 'approved-exception',
      approvalReference: 'DBX-TIDB-INCREMENTAL-DDL-SEQUENCING-2026-09-04-Edward',
    });
    expect(measurements.statementCount).toBe(4);
    expect(location).toMatchObject({
      sequence: 4,
      filename: '0004_canonical_listing_location.sql',
      parent: measurements.filename,
      parentChecksum: measurements.checksum,
      checksum: '10a1ab6089c2b066e3565b8c5d061d4f7a70bf577974db8d2ce9388139cf8a6e',
      kind: 'exceptional',
      statementPolicy: 'approved-exception',
      approvalReference: 'DBX-TIDB-INCREMENTAL-DDL-SEQUENCING-2026-09-04-Edward',
    });
    expect(location.statementCount).toBe(15);
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
    const fullCapabilities = manifest.orderedMigrations.find(
      entry => entry.filename === '0062_agent_launch_access_full_capabilities.sql',
    );
    const earningsFeature = manifest.orderedMigrations.find(
      entry => entry.filename === '0063_agent_launch_access_earnings_feature.sql',
    );
    const authSessionSecurity = manifest.orderedMigrations.find(
      entry => entry.filename === '0064_auth_session_security.sql',
    );
    const commercialQuoteTerms = manifest.orderedMigrations.find(
      entry => entry.filename === '0046_commercial_office_quote_terms_sequenced.sql',
    );
    const authVerificationTokenCleanup = manifest.orderedMigrations.find(
      entry => entry.filename === '0065_auth_verification_token_cleanup.sql',
    );
    expect(commercialQuoteTerms).toMatchObject({
      sequence: 46,
      parent: '0045_commercial_space_positive_area_integrity.sql',
      parentChecksum: 'f3708a6df7c6ec47d0665f4b9d012cc7004b4f01cc63c4d8864b9c2475636a28',
      checksum: '827c59f6e441fa0d9cbaacd0ff9411fa19eb525b8b7938856c3f14d1a5f1046c',
      kind: 'exceptional',
      statementPolicy: 'approved-exception',
      approvalReference: 'DBX-TIDB-0046-QUOTE-TERMS-RECOVERY-2026-09-04-Edward',
    });
    expect(commercialQuoteTerms?.statementCount).toBe(2);
    expect(fullCapabilities).toMatchObject({
      sequence: 62,
      parent: '0061_sl_messages_authorship.sql',
      parentChecksum: '4b07ca2038c51683b573f9ed780a58efd1817e27ea75460364c6f80d14cd4109',
      checksum: 'de1e31655ebb152af383c18197bf299cacee4b365ee9639f35c0ec3257915eff',
      kind: 'transactional-data',
      statementPolicy: 'transactional-dml',
    });
    expect(earningsFeature).toMatchObject({
      sequence: 63,
      parent: '0062_agent_launch_access_full_capabilities.sql',
      parentChecksum: 'de1e31655ebb152af383c18197bf299cacee4b365ee9639f35c0ec3257915eff',
      checksum: 'b3e8227ba6224de1b7d7426fdafbd8e872dd53f9191a77b271ed1a61dae44cef',
      kind: 'transactional-data',
      statementPolicy: 'transactional-dml',
    });
    expect(authSessionSecurity).toMatchObject({
      sequence: 64,
      parent: '0063_agent_launch_access_earnings_feature.sql',
      parentChecksum: 'b3e8227ba6224de1b7d7426fdafbd8e872dd53f9191a77b271ed1a61dae44cef',
      checksum: '8c5add9fe3c7cc2739738975c2067a73a5c6db7a4c160d40f260988ae72eac5d',
      kind: 'ddl',
      statementPolicy: 'single-ddl',
    });
    expect(authVerificationTokenCleanup).toMatchObject({
      sequence: 65,
      parent: '0064_auth_session_security.sql',
      parentChecksum: '8c5add9fe3c7cc2739738975c2067a73a5c6db7a4c160d40f260988ae72eac5d',
      checksum: '0cd1523e5467f73dd0534a04116d25a974e9e2b9a900692e6c3933a67a3182eb',
      kind: 'transactional-data',
      statementPolicy: 'transactional-dml',
    });
    const tidbSequenced = manifest.orderedMigrations.filter(
      entry => entry.approvalReference === 'DBX-TIDB-INCREMENTAL-DDL-SEQUENCING-2026-09-04-Edward',
    );
    expect(tidbSequenced.map(entry => entry.filename)).toEqual([
      '0003_canonical_property_measurements.sql',
      '0004_canonical_listing_location.sql',
      '0011_catalogue_publisher_developments.sql',
      '0012_catalogue_publisher_properties.sql',
      '0013_catalogue_publisher_leads.sql',
      '0014_catalogue_publisher_drafts.sql',
      '0015_catalogue_publisher_distribution_partnerships.sql',
      '0016_catalogue_publisher_distribution_access.sql',
      '0034_listing_lead_association.sql',
      '0050_commercial_asset_physical_location.sql',
    ]);
    expect(tidbSequenced.map(entry => entry.statementCount)).toEqual([
      4, 15, 3, 3, 3, 4, 3, 3, 3, 3,
    ]);
    expect(manifest.expectedHead.filename).toBe('0065_auth_verification_token_cleanup.sql');
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
      expectedNewHead: '0065_auth_verification_token_cleanup.sql',
    });

    expect(plan.acceptedOldHead).toBe('0007_paid_launch_access_invoice_term.sql');
    expect(plan.pending).toHaveLength(58);
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
      '0046_commercial_office_quote_terms_sequenced.sql',
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
    expect(plan.expectedNewHead).toBe('0065_auth_verification_token_cleanup.sql');
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
