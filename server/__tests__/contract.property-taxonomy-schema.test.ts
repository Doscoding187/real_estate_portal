import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  LISTING_PROPERTY_TYPES,
  PUBLIC_PROPERTY_TYPES,
} from '../../shared/property-taxonomy';

const SCHEMA_SOURCE = readFileSync('drizzle/schema/listings.ts', 'utf8');

function extractEnumValues(tableName: string): string[] {
  const tablePattern = new RegExp(
    `export const ${tableName} = mysqlTable\\([\\s\\S]*?propertyType: mysqlEnum\\(\\[([^\\]]+)\\]`,
  );
  const match = SCHEMA_SOURCE.match(tablePattern);
  if (!match) throw new Error(`propertyType enum not found for table '${tableName}'`);
  return [...match[1].matchAll(/'([a-z_]+)'/g)].map(entry => entry[1]);
}

const sorted = (values: readonly string[]) => [...values].sort();

/**
 * The shared taxonomy module is the single authority for property-type
 * vocabulary. The persisted Drizzle enums must stay in executable agreement
 * with it: `listings.propertyType` is the authoring source vocabulary and
 * `properties.propertyType` is the public projection vocabulary. Any
 * divergence between schema and authority is a database-authority incident,
 * not an implementation detail.
 */
describe('property-type schema/taxonomy authority coherence', () => {
  it('pins listings.propertyType to the shared source vocabulary', () => {
    // MySQL enum declaration order carries no query semantics; membership is
    // the authority contract.
    expect(sorted(extractEnumValues('listings'))).toEqual(sorted(LISTING_PROPERTY_TYPES));
  });

  it('pins properties.propertyType to the shared public vocabulary', () => {
    expect(sorted(extractEnumValues('properties'))).toEqual(sorted(PUBLIC_PROPERTY_TYPES));
  });

  it('keeps the projection vocabulary a deliberate superset of authoring history', () => {
    // `land` exists only in the source column and maps to `plot` on projection;
    // `villa` exists only on the projection as a legacy readable value.
    expect(LISTING_PROPERTY_TYPES).toContain('land');
    expect(PUBLIC_PROPERTY_TYPES).not.toContain('land');
    expect(PUBLIC_PROPERTY_TYPES).toContain('villa');
    expect(LISTING_PROPERTY_TYPES).not.toContain('villa');
  });
});
