import { describe, expect, it } from 'vitest';

import {
  assertDatabaseTargetMatchesRuntime,
  getDatabaseFingerprint,
  getExpectedDatabaseName,
} from '../databaseTarget';

describe('databaseTarget', () => {
  it('returns expected database names for protected environments', () => {
    expect(getExpectedDatabaseName('production')).toBe('listify_property_sa');
    expect(getExpectedDatabaseName('staging')).toBe('listify_staging');
    expect(getExpectedDatabaseName('test')).toBe('listify_test');
    expect(getExpectedDatabaseName('development')).toBeNull();
  });

  it('builds a stable fingerprint from DATABASE_URL', () => {
    expect(getDatabaseFingerprint('mysql://user:pass@db.example.com:4000/listify_property_sa')).toEqual({
      protocol: 'mysql',
      host: 'db.example.com',
      port: '4000',
      database: 'listify_property_sa',
      fingerprint: 'mysql://db.example.com:4000/listify_property_sa',
    });
  });

  it('rejects mismatched production targets', () => {
    expect(() =>
      assertDatabaseTargetMatchesRuntime(
        'mysql://user:pass@db.example.com:4000/listify_staging',
        'production',
      ),
    ).toThrow(/Expected database listify_property_sa/);
  });
});
