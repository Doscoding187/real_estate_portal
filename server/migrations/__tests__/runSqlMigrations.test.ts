import { describe, expect, it } from 'vitest';

import {
  buildMysqlMigrationConnectionConfig,
  isLegacyShowingsBackfillStatement,
} from '../runSqlMigrations';

describe('buildMysqlMigrationConnectionConfig', () => {
  it('normalizes legacy boolean ssl query parameters for mysql2', () => {
    const config = buildMysqlMigrationConnectionConfig(
      'mysql://user:pass@host:4000/db?ssl=true&rejectUnauthorized=true',
    );

    expect(config.uri).toBe('mysql://user:pass@host:4000/db');
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
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
});
