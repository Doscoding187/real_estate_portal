import { describe, expect, it } from 'vitest';

import { buildMysqlConnectionSecurityConfig } from '../databaseTls';

describe('database TLS authority', () => {
  it('requires verified TLS for production connections', () => {
    const config = buildMysqlConnectionSecurityConfig(
      'mysql://user:pass@db.example.com:4000/listify_property_sa',
      'production',
    );

    expect(config).toEqual({
      uri: 'mysql://user:pass@db.example.com:4000/listify_property_sa',
      ssl: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
    });
  });

  it('rejects insecure production TLS settings', () => {
    expect(() =>
      buildMysqlConnectionSecurityConfig(
        'mysql://user:pass@db.example.com:4000/listify_property_sa?rejectUnauthorized=false',
        'production',
      ),
    ).toThrow(/Certificate verification cannot be disabled/);

    expect(() =>
      buildMysqlConnectionSecurityConfig(
        'mysql://user:pass@db.example.com:4000/listify_property_sa?ssl=false',
        'production',
      ),
    ).toThrow(/TLS cannot be disabled/);
  });

  it('rejects insecure TLS inside a production ssl object', () => {
    expect(() =>
      buildMysqlConnectionSecurityConfig(
        'mysql://user:pass@db.example.com:4000/listify_property_sa?ssl=%7B%22rejectUnauthorized%22%3Afalse%7D',
        'production',
      ),
    ).toThrow(/Certificate verification cannot be disabled/);
  });

  it('allows local development MySQL without TLS', () => {
    const config = buildMysqlConnectionSecurityConfig(
      'mysql://listify_app@127.0.0.1:3307/listify_local',
      'development',
    );

    expect(config.uri).toBe(
      'mysql://listify_app@127.0.0.1:3307/listify_local',
    );
    expect(config.ssl).toBeUndefined();
  });

  it('keeps remote development targets strict by default', () => {
    const config = buildMysqlConnectionSecurityConfig(
      'mysql://user:pass@remote.example.com:4000/listify_local',
      'development',
    );

    expect(config.ssl).toEqual({
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    });
  });

  it('preserves safe object-based TLS options', () => {
    const config = buildMysqlConnectionSecurityConfig(
      'mysql://user:pass@remote.example.com:4000/listify_test?ssl=%7B%22minVersion%22%3A%22TLSv1.3%22%7D',
      'test',
    );

    expect(config.uri).toBe(
      'mysql://user:pass@remote.example.com:4000/listify_test',
    );
    expect(config.ssl).toEqual({
      minVersion: 'TLSv1.3',
      rejectUnauthorized: true,
    });
  });
});
