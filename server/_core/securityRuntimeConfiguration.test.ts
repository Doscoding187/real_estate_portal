import { describe, expect, it } from 'vitest';
import {
  assertDeployedSecurityConfiguration,
  assertNoDeployedTestConfiguration,
  deployedSecurityConfigurationIssues,
  isStrongRuntimeSecret,
} from './securityRuntimeConfiguration';

function deployedEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    APP_ENV: 'production',
    JWT_SECRET: 'strong-production-session-secret-with-unique-material',
    MEDIA_STORAGE_ADAPTER: 's3',
    S3_BUCKET_NAME: 'property-listify-public-media',
    AWS_REGION: 'af-south-1',
    MEDIA_UPLOAD_TOKEN_SECRET: 'different-strong-production-media-token-secret',
    PAID_MVP_ENABLED_PRODUCT_KEYS:
      'agent_launch_access,agency_launch_access,developer_launch_access',
    PAID_MVP_RELEASE_ID: 'paid-mvp-rc-1',
    PAID_MVP_APPROVAL_REF: 'b16-approval-1',
    ...overrides,
  };
}

describe('deployed security configuration', () => {
  it('accepts explicit secure production configuration', () => {
    expect(deployedSecurityConfigurationIssues(deployedEnv(), 'production')).toEqual([]);
    expect(() => assertDeployedSecurityConfiguration(deployedEnv(), 'production')).not.toThrow();
  });

  it.each(['production', 'staging'] as const)(
    'rejects governed test selectors in %s',
    runtimeEnv => {
      const env = deployedEnv({
        NODE_ENV: runtimeEnv,
        APP_ENV: runtimeEnv,
        PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS: 'agent_launch_access',
      });
      expect(deployedSecurityConfigurationIssues(env, runtimeEnv).join(' ')).toMatch(
        /PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS/,
      );
      expect(() => assertNoDeployedTestConfiguration(env, runtimeEnv)).toThrow(/test-only/);
    },
  );

  it('rejects capture paths, fake database selectors, and environment contradictions', () => {
    expect(() => assertNoDeployedTestConfiguration(
      deployedEnv({ PROPERTY_LISTIFY_GOVERNED_B06_EMAIL_CAPTURE_PATH: '/tmp/capture.jsonl' }),
      'production',
    )).toThrow(/PROPERTY_LISTIFY_GOVERNED_B06_EMAIL_CAPTURE_PATH/);
    expect(() => assertNoDeployedTestConfiguration(
      deployedEnv({ LISTIFY_E2E_DATABASE_URL: 'mysql://127.0.0.1/test' }),
      'production',
    )).toThrow(/LISTIFY_E2E_DATABASE_URL/);
    expect(() => assertNoDeployedTestConfiguration(
      deployedEnv({ NODE_ENV: 'test' }),
      'production',
    )).toThrow(/declarations disagree/);
    expect(() => assertDeployedSecurityConfiguration(
      deployedEnv({ APP_ENV: 'test', NODE_ENV: 'production' }),
    )).toThrow(/declarations disagree/);
  });

  it('requires dedicated, strong media signing and explicit S3 selection', () => {
    expect(deployedSecurityConfigurationIssues(
      deployedEnv({ MEDIA_UPLOAD_TOKEN_SECRET: '' }),
      'staging',
    )).toContain(
      'MEDIA_UPLOAD_TOKEN_SECRET must be present, non-placeholder, and at least 32 characters.',
    );
    expect(deployedSecurityConfigurationIssues(
      deployedEnv({ MEDIA_UPLOAD_TOKEN_SECRET: 'strong-production-session-secret-with-unique-material' }),
      'production',
    )).toContain('MEDIA_UPLOAD_TOKEN_SECRET must be distinct from JWT_SECRET.');
    expect(deployedSecurityConfigurationIssues(
      deployedEnv({ MEDIA_STORAGE_ADAPTER: 'local' }),
      'production',
    )).toContain('MEDIA_STORAGE_ADAPTER must be explicitly set to s3 in deployed runtime.');
  });

  it('rejects absent, short, and placeholder session secrets without disclosing their values', () => {
    expect(isStrongRuntimeSecret('x'.repeat(31))).toBe(false);
    expect(isStrongRuntimeSecret('replace-with-production-secret'.padEnd(40, 'x'))).toBe(false);
    expect(isStrongRuntimeSecret('your-super-secret-key-at-least-32-chars-long')).toBe(false);
    const errors = deployedSecurityConfigurationIssues(deployedEnv({ JWT_SECRET: 'short' }), 'production');
    expect(errors).toContain('JWT_SECRET must be present, non-placeholder, and at least 32 characters.');
    expect(errors.join(' ')).not.toContain('short');
    expect(() =>
      assertDeployedSecurityConfiguration(deployedEnv({ JWT_SECRET: '' }), 'production'),
    ).toThrow(/JWT_SECRET must be present/);
  });

  it('does not require hosted configuration for local development or test mode', () => {
    expect(deployedSecurityConfigurationIssues({}, 'development')).toEqual([]);
    expect(deployedSecurityConfigurationIssues({}, 'test')).toEqual([]);
  });
});
