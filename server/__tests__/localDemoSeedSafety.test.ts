import { describe, expect, it } from 'vitest';
import { assertLocalSeedSafety, getLocalDemoCredentials } from '../scripts/localDemoSeed';

const baseEnv = {
  NODE_ENV: 'development',
  APP_ENV: 'development',
  LOCAL_SEED_ALLOWED: 'true',
  DATABASE_URL: 'mysql://user:password@127.0.0.1:3307/listify_local',
};

describe('local demo seed safety guard', () => {
  it('allows explicit local seed against the local database', () => {
    expect(() => assertLocalSeedSafety(baseEnv, { target: 'local' })).not.toThrow();
  });

  it('refuses when LOCAL_SEED_ALLOWED is missing', () => {
    expect(() =>
      assertLocalSeedSafety({ ...baseEnv, LOCAL_SEED_ALLOWED: undefined }, { target: 'local' }),
    ).toThrow(/LOCAL_SEED_ALLOWED=true/);
  });

  it('refuses production runtime values', () => {
    expect(() =>
      assertLocalSeedSafety({ ...baseEnv, NODE_ENV: 'production' }, { target: 'local' }),
    ).toThrow(/production runtime/i);
  });

  it('refuses production database names', () => {
    expect(() =>
      assertLocalSeedSafety(
        {
          ...baseEnv,
          DATABASE_URL: 'mysql://user:password@127.0.0.1:3307/listify_property_sa',
        },
        { target: 'local' },
      ),
    ).toThrow(/production database/i);
  });

  it('refuses non-local database hosts', () => {
    expect(() =>
      assertLocalSeedSafety(
        {
          ...baseEnv,
          DATABASE_URL: 'mysql://user:password@prod-db.example.com:3306/listify_local',
        },
        { target: 'local' },
      ),
    ).toThrow(/host must be local/i);
  });

  it('requires the test seed to target listify_test', () => {
    expect(() => assertLocalSeedSafety(baseEnv, { target: 'test' })).toThrow(/listify_test/);
  });

  it('allows explicit test seed against the isolated test database', () => {
    expect(() =>
      assertLocalSeedSafety(
        {
          ...baseEnv,
          NODE_ENV: 'test',
          DATABASE_URL: 'mysql://user:password@127.0.0.1:3307/listify_test',
        },
        { target: 'test' },
      ),
    ).not.toThrow();
  });

  it('reads the local demo password from the development environment when supplied', () => {
    expect(
      getLocalDemoCredentials({
        NODE_ENV: 'development',
        LOCAL_DEMO_AGENCY_PASSWORD: 'ConfiguredOnly123!',
      }),
    ).toEqual({
      password: 'ConfiguredOnly123!',
      passwordSource: 'environment',
    });
  });

  it('refuses to resolve local demo credentials without an environment-supplied password', () => {
    expect(() =>
      getLocalDemoCredentials({
        NODE_ENV: 'development',
      }),
    ).toThrow(/LOCAL_DEMO_AGENCY_PASSWORD/i);
  });

  it('refuses to resolve local demo credentials in production', () => {
    expect(() =>
      getLocalDemoCredentials({
        NODE_ENV: 'production',
        LOCAL_DEMO_AGENCY_PASSWORD: 'ConfiguredOnly123!',
      }),
    ).toThrow(/production runtime/i);
  });
});
