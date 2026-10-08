import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import { listings, properties } from '../../../drizzle/schema/listings';
import { loadAndValidateMigrationManifest } from '../migrationManifest';

describe('Canonical Listing Place persistence expansion', () => {
  it.each([listings, properties])(
    'persists one stable assignment separately from provider evidence',
    table => {
      const config = getTableConfig(table);
      const reference = config.columns.find(column => column.name === 'canonical_place_id')!;
      expect(reference).toBeDefined();
      expect(reference.notNull).toBe(false);
      expect(reference.getSQLType()).toBe('varchar(40)');
      expect(config.columns.at(-1)).toBe(reference);
      const provider = config.columns.find(column => column.name === 'placeId')!;
      expect(provider.getSQLType()).toBe('varchar(255)');
      const keys = config.foreignKeys.filter(key => key.reference().columns.includes(reference));
      expect(keys).toHaveLength(1);
      expect(keys[0].onDelete).toBe('restrict');
      expect(keys[0].onUpdate).toBe('restrict');
      expect(keys[0].reference().foreignColumns.map(column => column.name)).toEqual(['place_id']);
      expect(
        config.indexes.some(index => index.config.name === `idx_${config.name}_canonical_place_id`),
      ).toBe(true);
    },
  );

  it('orders each column before its index and restrictive key, with no text or numeric backfill', () => {
    const manifest = loadAndValidateMigrationManifest({
      migrationsDirectory: resolve('server/migrations'),
    });
    const entries = manifest.orderedMigrations.filter(entry =>
      /_(listings|properties)_canonical_place_reference/.test(entry.filename),
    );
    expect(entries).toHaveLength(6);
    expect(entries.map(entry => entry.sequence)).toEqual([106, 107, 108, 109, 110, 111]);
    expect(entries[0].parent).toBe('0105_saved_searches_canonical_place_reference_fk.sql');
    for (const entry of entries) {
      expect(entry.kind).toBe('ddl');
      expect(entry.statementPolicy).toBe('single-ddl');
      expect(entry.statementCount).toBe(1);
    }
    expect(manifest.expectedHead.filename).toBe('0111_properties_canonical_place_reference_fk.sql');
  });
});
