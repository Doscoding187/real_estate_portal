import { describe, expect, it } from 'vitest';
import { hostedRuntimeConfigurationIssues, resolveHostedBuildSha } from './hostedRuntimeConfiguration';
import { loadAppRuntimeEnv } from './runtimeBootstrap';

const sha = 'a'.repeat(40);
function hostedEnv(target: 'production' | 'staging'): NodeJS.ProcessEnv {
  const prod = target === 'production';
  const app = prod ? 'https://www.propertylistifysa.co.za' : 'https://staging.propertylistifysa.co.za';
  const api = prod ? 'https://api.propertylistifysa.co.za' : 'https://api-staging.propertylistifysa.co.za';
  return {
    APP_ENV: target,
    NODE_ENV: 'production',
    BUILD_SHA: sha,
    APP_URL: app,
    FRONTEND_URL: app,
    VITE_APP_URL: app,
    API_URL: api,
    VITE_API_URL: api,
    CORS_ALLOWED_ORIGINS: app,
    TRUST_PROXY: '1',
    SKIP_FRONTEND: 'true',
    DATABASE_URL: 'mysql://runtime:private@db.example.test/listify',
    REDIS_URL: 'rediss://redis.example.test:6379',
    JWT_SECRET: 'strong-hosted-session-secret-with-unique-material',
    MEDIA_STORAGE_ADAPTER: 's3',
    MEDIA_UPLOAD_TOKEN_SECRET: 'different-strong-hosted-media-signing-secret',
    S3_BUCKET_NAME: 'public-media',
    AWS_S3_BUCKET: 'public-media',
    AWS_REGION: 'af-south-1',
    AWS_ACCESS_KEY_ID: 'public-media-key',
    AWS_SECRET_ACCESS_KEY: 'public-media-secret',
    BILLING_PROOF_STORAGE_ADAPTER: 's3',
    BILLING_PROOF_S3_BUCKET: 'private-proofs',
    BILLING_PROOF_AWS_ACCESS_KEY_ID: 'private-proof-key',
    BILLING_PROOF_AWS_SECRET_ACCESS_KEY: 'private-proof-secret',
    RESEND_API_KEY: 're_configured-key',
    RESEND_FROM_EMAIL: 'Property Listify <mail@propertylistifysa.co.za>',
    SAVED_SEARCH_SCHEDULER_ENABLED: 'false',
  };
}

describe('hosted runtime configuration', () => {
  it.each(['production', 'staging'] as const)('accepts explicit %s preparation configuration', target => {
    expect(hostedRuntimeConfigurationIssues(hostedEnv(target))).toEqual([]);
  });

  it('runs staging with production Node behavior and rejects stale staging Node mode', () => {
    const env = { APP_ENV: 'staging', NODE_ENV: 'production' } as NodeJS.ProcessEnv;
    loadAppRuntimeEnv({ cwd: '/tmp/does-not-exist', env });
    expect(env.NODE_ENV).toBe('production');
    expect(() => loadAppRuntimeEnv({ cwd: '/tmp/does-not-exist', env: {
      APP_ENV: 'staging', NODE_ENV: 'staging',
    } })).toThrow(/NODE_ENV=production/);
  });

  it.each([
    [{ APP_URL: 'http://staging.propertylistifysa.co.za' }, /APP_URL/],
    [{ VITE_API_URL: 'https://api.propertylistifysa.co.za' }, /canonical API origin|Staging frontend/],
    [{ CORS_ALLOWED_ORIGINS: 'https://preview.vercel.app' }, /CORS_ALLOWED_ORIGINS/],
    [{ REDIS_URL: '' }, /REDIS_URL/],
    [{ MEDIA_STORAGE_ADAPTER: 'local' }, /MEDIA_STORAGE_ADAPTER/],
    [{ AWS_S3_BUCKET: 'other-bucket' }, /AWS_S3_BUCKET/],
    [{ BILLING_PROOF_STORAGE_ADAPTER: 'local' }, /BILLING_PROOF_STORAGE_ADAPTER/],
    [{ RESEND_API_KEY: '' }, /Resend/],
    [{ VITE_USE_MOCK_EMAILS: 'true' }, /VITE_USE_MOCK_EMAILS/],
    [{ SL_PHONE_OTP_DEV_MODE: '1' }, /SL_PHONE_OTP_DEV_MODE/],
    [{ SAVED_SEARCH_SCHEDULER_ENABLED: '' }, /SAVED_SEARCH_SCHEDULER_ENABLED/],
    [{ BUILD_SHA: 'unknown' }, /40-character/],
    [{ PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE: 'true' }, /test-only/],
  ] as const)('rejects unsafe staging override %j', (override, expected) => {
    expect(hostedRuntimeConfigurationIssues({ ...hostedEnv('staging'), ...override }).join(' ')).toMatch(expected);
  });

  it('uses one valid provider SHA and rejects an invalid explicit override', () => {
    expect(resolveHostedBuildSha({ RAILWAY_GIT_COMMIT_SHA: sha })).toBe(sha);
    expect(resolveHostedBuildSha({ BUILD_SHA: 'unknown', RAILWAY_GIT_COMMIT_SHA: sha })).toBeNull();
  });
});
