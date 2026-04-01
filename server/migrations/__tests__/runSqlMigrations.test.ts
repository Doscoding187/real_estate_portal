import { describe, expect, it } from 'vitest';

import { buildMysqlMigrationConnectionConfig } from '../runSqlMigrations';

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
});
