import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  buildMysqlMigrationConnectionConfig,
  isBaselineWitnessSuperseded,
  isDistributionCommissionBackfillStatement,
  isLegacyShowingsBackfillStatement,
  migrationChecksum,
  runSqlMigrations,
  schemaWitnesses,
  sortMigrationFiles,
} from '../runSqlMigrations';

describe('buildMysqlMigrationConnectionConfig', () => {
  it('normalizes legacy boolean ssl query parameters for mysql2', () => {
    const config = buildMysqlMigrationConnectionConfig(
      'mysql://user:pass@host:4000/db?ssl=true&rejectUnauthorized=true',
    );

    expect(config.uri).toBe('mysql://user:pass@host:4000/db');
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(schemaWitnesses(`-- A comment must not become a schema witness.
ALTER TABLE listings ADD INDEX idx_listings_brand_profile_id (brand_profile_id);`)).toEqual([
      { kind: 'index', table: 'listings', name: 'idx_listings_brand_profile_id' },
    ]);
    expect(schemaWitnesses(`ALTER TABLE service_lead_events MODIFY COLUMN event_type enum('created', 'nearby_market_clicked') NOT NULL;`)).toEqual([
      { kind: 'column', table: 'service_lead_events', name: 'event_type', expectedColumnType: "enum('created', 'nearby_market_clicked')" },
    ]);
    expect(schemaWitnesses(`ALTER TABLE development_required_documents ADD COLUMN IF NOT EXISTS category varchar(64) NULL;`)).toEqual([
      { kind: 'column', table: 'development_required_documents', name: 'category' },
    ]);
    expect(schemaWitnesses(`ALTER TABLE showings ADD COLUMN scheduledTime timestamp NULL;
ALTER TABLE showings MODIFY COLUMN status enum('scheduled') NOT NULL;
ALTER TABLE showings MODIFY COLUMN status enum('confirmed') NOT NULL;
ALTER TABLE showings DROP COLUMN scheduledTime;`)).toEqual([
      { kind: 'column', table: 'showings', name: 'status', expectedColumnType: "enum('confirmed')" },
    ]);
    const legacyLeadTypeWitness = { kind: 'column' as const, table: 'lead_activities', name: 'type', expectedColumnType: "enum('note','call','email','meeting','status_change')" };
    expect(isBaselineWitnessSuperseded('0061_reconcile_agency_workspace_schema.sql', legacyLeadTypeWitness, 61)).toBe(false);
    expect(isBaselineWitnessSuperseded('0061_reconcile_agency_workspace_schema.sql', legacyLeadTypeWitness, 71)).toBe(true);
    const legacyShowingStatusWitness = { kind: 'column' as const, table: 'showings', name: 'status', expectedColumnType: "enum('requested','confirmed')" };
    expect(isBaselineWitnessSuperseded('0052_reconcile_showings_schema.sql', legacyShowingStatusWitness, 62)).toBe(false);
    expect(isBaselineWitnessSuperseded('0052_reconcile_showings_schema.sql', legacyShowingStatusWitness, 71)).toBe(true);
  });

  it('preserves object-based ssl config from newer DATABASE_URL values', () => {
    const config = buildMysqlMigrationConnectionConfig(
      'mysql://user:pass@host:4000/db?ssl=%7B%22minVersion%22%3A%22TLSv1.2%22%7D',
    );

    expect(config.uri).toBe('mysql://user:pass@host:4000/db');
    expect(config.ssl).toEqual({ minVersion: 'TLSv1.2' });
  });

  it('treats sslaccept=strict as strict certificate validation', () => {
    const config = buildMysqlMigrationConnectionConfig(
      'mysql://user:pass@host:4000/db?sslaccept=strict',
    );

    expect(config.uri).toBe('mysql://user:pass@host:4000/db');
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it('detects the legacy showings backfill statement that depends on showings.listingId', () => {
    expect(
      isLegacyShowingsBackfillStatement(`UPDATE showings s
JOIN properties p
  ON p.sourceListingId = s.listingId
SET s.propertyId = p.id
WHERE s.propertyId IS NULL`),
    ).toBe(true);

    expect(
      isLegacyShowingsBackfillStatement(`UPDATE showings
SET scheduledAt = CURRENT_TIMESTAMP
WHERE scheduledAt IS NULL`),
    ).toBe(false);
  });

  it('detects the distribution commission backfill that depends on distribution_commission_entries', () => {
    expect(
      isDistributionCommissionBackfillStatement(`UPDATE \`distribution_deals\` d
LEFT JOIN (
  SELECT
    ce.\`deal_id\` AS \`deal_id\`,
    MAX(ce.\`commission_amount\`) AS \`referrer_commission_amount\`
  FROM \`distribution_commission_entries\` ce
  GROUP BY ce.\`deal_id\`
) x
  ON x.\`deal_id\` = d.\`id\`
SET d.\`referrer_commission_amount\` = COALESCE(d.\`referrer_commission_amount\`, x.\`referrer_commission_amount\`)`),
    ).toBe(true);

    expect(
      isDistributionCommissionBackfillStatement(`UPDATE \`distribution_deals\`
SET \`platform_commission_amount\` = 0
WHERE \`platform_commission_amount\` IS NULL`),
    ).toBe(false);
  });
});

class MigrationConnection {
  calls: string[] = [];
  history = new Map<string, string>();
  failStatement?: RegExp;
  historicalEffects = false;

  async execute(statement: string) {
    this.calls.push(statement);
    if (statement.includes('GET_LOCK')) return [[{ lock_status: 1 }]];
    if (statement.includes('information_schema.columns') && statement.includes("table_name = \"sql_migration_history\"")) return [[{ count_value: 1 }]];
    if (statement.includes("'plan_entitlements'")) return [[{ count_value: this.historicalEffects ? 1 : 0 }]];
    if (statement.startsWith('SELECT filename, checksum')) return [[...this.history.entries()].map(([filename, checksum]) => ({ filename, checksum }))];
    if (statement.startsWith('INSERT INTO `sql_migration_history`')) {
      const quoted = statement.match(/"(?:[^"\\]|\\.)*"/g) ?? [];
      if (quoted.length < 3) throw new Error(`Unable to parse history insert: ${statement}`);
      this.history.set(JSON.parse(quoted[1]), JSON.parse(quoted[2]));
    }
    if (this.failStatement?.test(statement)) throw Object.assign(new Error('intentional failure'), { code: 'ER_PARSE_ERROR' });
    return {};
  }
}

function tempMigrations(files: Record<string, string>) {
  const directory = mkdtempSync(join(tmpdir(), 'sql-migrations-'));
  for (const [name, contents] of Object.entries(files)) writeFileSync(join(directory, name), contents);
  return directory;
}

describe('custom SQL migration history', () => {
  it('refuses historical replay when a database has custom schema effects but no ledger', async () => {
    const directory = tempMigrations({ '0061_reconcile.sql': 'ALTER TABLE plans ADD COLUMN segment varchar(20);' });
    const connection = new MigrationConnection();
    connection.historicalEffects = true;
    try {
      await expect(runSqlMigrations({ migrationsDir: directory, connection })).rejects.toThrow('Refusing to replay migrations');
      expect(connection.calls.some(call => call.startsWith('ALTER TABLE plans'))).toBe(false);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it('runs every file once for a fresh database and then is a no-op', async () => {
    const directory = tempMigrations({
      '0072_add_contact_date.sql': 'ALTER TABLE agency_listing_performance_reviews ADD COLUMN contact_date timestamp NULL;',
      '0071_create_performance.sql': 'CREATE TABLE agency_listing_performance_reviews (id int);',
    });
    const connection = new MigrationConnection();
    try {
      await runSqlMigrations({ migrationsDir: directory, connection });
      expect(connection.history.size).toBe(2);
      const migrationStatements = () => connection.calls.filter(call => /^(CREATE TABLE agency_|ALTER TABLE agency_)/.test(call));
      expect(migrationStatements()).toHaveLength(2);
      await runSqlMigrations({ migrationsDir: directory, connection });
      expect(migrationStatements()).toHaveLength(2);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it('orders numerically and proves an incremental 0071 to 0072 upgrade is repeat-safe', async () => {
    const directory = tempMigrations({
      '0072_add_contact_date.sql': 'ALTER TABLE agency_listing_performance_reviews ADD COLUMN contact_date timestamp NULL;',
      '0071_create_performance.sql': 'CREATE TABLE agency_listing_performance_reviews (id int);',
    });
    const connection = new MigrationConnection();
    connection.history.set('0071_create_performance.sql', migrationChecksum('CREATE TABLE agency_listing_performance_reviews (id int);'));
    try {
      expect(sortMigrationFiles(['0072_b.sql', '0071_a.sql'])).toEqual(['0071_a.sql', '0072_b.sql']);
      await runSqlMigrations({ migrationsDir: directory, connection });
      expect(connection.calls.filter(call => call.startsWith('ALTER TABLE agency_listing_performance_reviews'))).toHaveLength(1);
      expect(connection.history.has('0072_add_contact_date.sql')).toBe(true);

      await runSqlMigrations({ migrationsDir: directory, connection });
      expect(connection.calls.filter(call => call.startsWith('ALTER TABLE agency_listing_performance_reviews'))).toHaveLength(1);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it('fails before execution when an applied migration checksum changes', async () => {
    const directory = tempMigrations({ '0072_add_contact_date.sql': 'ALTER TABLE agency_listing_performance_reviews ADD COLUMN contact_date timestamp NULL;' });
    const connection = new MigrationConnection();
    connection.history.set('0072_add_contact_date.sql', migrationChecksum('ALTER TABLE elsewhere ADD COLUMN unexpected int;'));
    try {
      await expect(runSqlMigrations({ migrationsDir: directory, connection })).rejects.toThrow('Checksum mismatch');
      expect(connection.calls.some(call => call.startsWith('ALTER TABLE agency_listing_performance_reviews'))).toBe(false);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it('does not record a migration that fails', async () => {
    const directory = tempMigrations({ '0072_broken.sql': 'ALTER TABLE agency_listing_performance_reviews ADD COLUMN contact_date timestamp NULL;' });
    const connection = new MigrationConnection();
    connection.failStatement = /ALTER TABLE/;
    try {
      await expect(runSqlMigrations({ migrationsDir: directory, connection })).rejects.toThrow('intentional failure');
      expect(connection.history.size).toBe(0);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it('refuses an explicit baseline when schema evidence is absent', async () => {
    const directory = tempMigrations({ '0071_create_performance.sql': 'CREATE TABLE agency_listing_performance_reviews (id int);' });
    const connection = new MigrationConnection();
    try {
      await expect(runSqlMigrations({ migrationsDir: directory, connection, baselineThrough: '0071' })).rejects.toThrow('expected schema effects are missing');
      expect(connection.history.size).toBe(0);
      expect(connection.calls).not.toContain('START TRANSACTION');
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
