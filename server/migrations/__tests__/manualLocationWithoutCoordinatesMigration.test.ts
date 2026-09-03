import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAndValidateMigrationManifest, parseSqlStatements } from '../migrationManifest';

const migrationPath = resolve('server/migrations/0005_manual_location_without_coordinates.sql');

describe('PLE-6C manual location without coordinates migration', () => {
  it('is the approved exceptional child of the canonical location migration', () => {
    const manifest = loadAndValidateMigrationManifest({
      migrationsDirectory: resolve('server/migrations'),
    });
    const migration = manifest.orderedMigrations.find(
      entry => entry.filename === '0005_manual_location_without_coordinates.sql',
    );

    expect(migration).toMatchObject({
      sequence: 5,
      parent: '0004_canonical_listing_location.sql',
      parentChecksum: 'b772082a269b7e30ed514d9850b129192ddc0bd05842a558f46af017b3726dbe',
      checksum: '8f1e3c8481dc606a89d3fc8e01ffc72fecd02e7aa15cfb4b889a7a78d4abf51b',
      kind: 'exceptional',
      statementPolicy: 'approved-exception',
      approvalReference: 'PLE-6C-2026-08-10-Edward',
    });
    expect(manifest.expectedHead.filename).toBe('0065_auth_verification_token_cleanup.sql');
  });

  it('contains only the approved nullable coordinate alteration', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    const statements = parseSqlStatements(sql);
    const normalized = sql.toLowerCase();
    const normalizedStatement = statements[0]
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/;$/, '')
      .toLowerCase();

    expect(statements).toHaveLength(1);
    expect(normalizedStatement).toBe(
      'alter table `listings` modify column `latitude` decimal(10,7) null, modify column `longitude` decimal(10,7) null',
    );
    expect(normalized).not.toMatch(
      /\b(drop|insert|update|delete|truncate|create table|backfill|seed)\b/,
    );
    expect(normalized).toContain('decimal(10,7) null');
    expect(normalized).not.toContain('default');
    expect(normalized).not.toContain('0/0');
  });
});
