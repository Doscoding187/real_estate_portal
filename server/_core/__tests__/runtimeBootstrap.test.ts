import { describe, expect, it } from 'vitest';
import { resolveAppRuntimeEnv, resolveTrustProxySetting } from '../runtimeBootstrap';

describe('resolveAppRuntimeEnv', () => {
  it('prefers Railway staging metadata over a production NODE_ENV fallback', () => {
    expect(
      resolveAppRuntimeEnv({
        NODE_ENV: 'production',
        RAILWAY_ENVIRONMENT_NAME: 'Staging',
      }),
    ).toBe('staging');
  });

  it('keeps production when Railway reports production', () => {
    expect(
      resolveAppRuntimeEnv({
        NODE_ENV: 'production',
        RAILWAY_ENVIRONMENT_NAME: 'production',
      }),
    ).toBe('production');
  });

  it('falls back to development when no deployment metadata exists', () => {
    expect(resolveAppRuntimeEnv({})).toBe('development');
  });
});

describe('resolveTrustProxySetting', () => {
  it('trusts one proxy hop on Railway by default', () => {
    expect(
      resolveTrustProxySetting({
        RAILWAY_ENVIRONMENT_NAME: 'Staging',
      }),
    ).toBe(1);
  });

  it('allows explicit opt-out', () => {
    expect(
      resolveTrustProxySetting({
        RAILWAY_ENVIRONMENT_NAME: 'Staging',
        TRUST_PROXY: 'false',
      }),
    ).toBe(false);
  });
});
