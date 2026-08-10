import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAndValidateMigrationManifest, parseSqlStatements } from '../migrationManifest';

const migrationPath = resolve('server/migrations/0004_canonical_listing_location.sql');

describe('PLE-6B canonical listing location migration', () => {
  it('is manifest-authorized as the next exceptional migration without database mutation', () => {
    const manifest = loadAndValidateMigrationManifest({
      migrationsDirectory: resolve('server/migrations'),
    });
    const migration = manifest.orderedMigrations.find(
      entry => entry.filename === '0004_canonical_listing_location.sql',
    );

    expect(migration).toMatchObject({
      sequence: 4,
      parent: '0003_canonical_property_measurements.sql',
      kind: 'exceptional',
      statementPolicy: 'approved-exception',
      approvalReference: 'PLE-6B-2026-08-10-Edward',
    });
    expect(manifest.expectedHead.filename).toBe('0004_canonical_listing_location.sql');
  });

  it('contains only additive DDL and the approved location invariants', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    const statements = parseSqlStatements(sql);
    const normalized = sql.toLowerCase();

    expect(statements).toHaveLength(6);
    expect(statements.every(statement => /^(alter table|create table)\b/i.test(statement))).toBe(
      true,
    );
    expect(normalized).not.toMatch(/\b(drop|insert|truncate)\b/);
    expect(normalized).toContain("enum('verified','provisional','retired')");
    expect(normalized).toContain("enum('internal','provider','manual')");
    expect(normalized).toContain('location_provider_mappings_exactly_one_target');
    expect(normalized).toContain('location_provider_mappings_provider_place_uq');
    expect(normalized).toContain('location_confirmation_state');
    expect(normalized).toContain("enum('confirmed','needs_confirmation')");
    expect(normalized).toContain('public_location_precision');
    expect(normalized).toContain("enum('approximate','exact')");
    expect(normalized).toContain('modify column `address` text null');
    expect(normalized).toContain('foreign key (`province_id`) references `provinces`');
    expect(normalized).toContain('foreign key (`city_id`) references `cities`');
    expect(normalized).toContain('foreign key (`suburb_id`) references `suburbs`');
  });
});
