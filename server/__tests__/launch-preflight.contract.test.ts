import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatLaunchPreflight, runLaunchPreflight } from '../_core/launchPreflight';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

function productionEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    APP_ENV: 'production',
    DATABASE_URL: 'mysql://listify:secret@db.propertylistifysa.co.za:3306/listify_property_sa',
    JWT_SECRET: 'production-session-secret-with-more-than-32-characters',
    APP_URL: 'https://propertylistifysa.co.za',
    NEXT_PUBLIC_APP_URL: 'https://propertylistifysa.co.za',
    VITE_APP_URL: 'https://propertylistifysa.co.za',
    VITE_API_URL: 'https://api.propertylistifysa.co.za',
    AWS_REGION: 'af-south-1',
    AWS_ACCESS_KEY_ID: 'AKIAPRODUCTIONKEY',
    AWS_SECRET_ACCESS_KEY: 'production-media-secret',
    S3_BUCKET_NAME: 'listify-public-media-prod',
    BILLING_EFT_ACCOUNT_NAME: 'Property Listify SA Pty Ltd',
    BILLING_EFT_BANK_NAME: 'Launch Bank',
    BILLING_EFT_BRANCH_CODE: '250655',
    BILLING_EFT_ACCOUNT_NUMBER: '1234567890',
    BILLING_EFT_ACCOUNT_TYPE: 'Business current account',
    BILLING_SUPPORT_EMAIL: 'billing@propertylistifysa.co.za',
    BILLING_PROOF_STORAGE_ADAPTER: 's3',
    BILLING_PROOF_S3_BUCKET: 'listify-private-billing-proofs-prod',
    BILLING_PROOF_S3_REGION: 'af-south-1',
    BILLING_PROOF_AWS_ACCESS_KEY_ID: 'AKIAPROOFKEY',
    BILLING_PROOF_AWS_SECRET_ACCESS_KEY: 'production-proof-secret',
    RESEND_API_KEY: 're_live_launch_ready',
    RESEND_FROM_EMAIL: 'Listify Billing <billing@propertylistifysa.co.za>',
    REDIS_URL: 'rediss://cache.propertylistifysa.co.za:6379',
    GOOGLE_MAPS_API_KEY: 'maps-server-key',
    VITE_GOOGLE_MAPS_API_KEY: 'maps-browser-key',
    SAVED_SEARCH_ACTION_TOKEN_SECRET: 'saved-search-action-token-secret',
    ...overrides,
  };
}

describe('launch preflight contract', () => {
  it('passes with production revenue-critical environment configured', () => {
    const result = runLaunchPreflight({
      runtimeEnv: 'production',
      env: productionEnv(),
    });

    expect(result.ok).toBe(true);
    expect(formatLaunchPreflight(result)).toContain('Launch preflight (production) passed');
  });

  it('fails unsafe production environment before launch', () => {
    const result = runLaunchPreflight({
      runtimeEnv: 'production',
      env: productionEnv({
        DATABASE_URL: 'mysql://listify:secret@127.0.0.1:3307/listify_local',
        JWT_SECRET: 'replace-with-local-random-32-byte-hex',
        APP_URL: 'http://localhost:3009',
        VITE_APP_URL: 'http://localhost:3009',
        VITE_API_URL: '',
        RESEND_API_KEY: '',
        RESEND_FROM_EMAIL: 'Listify Local <onboarding@resend.dev>',
        BILLING_EFT_ACCOUNT_NUMBER: '0000000000',
        BILLING_PROOF_STORAGE_ADAPTER: 'local',
        BILLING_PROOF_S3_BUCKET: '',
      }),
    });

    const failedIds = result.checks.filter(check => !check.ok).map(check => check.id);

    expect(result.ok).toBe(false);
    expect(failedIds).toContain('database-target');
    expect(failedIds).toContain('auth-secret');
    expect(failedIds).toContain('vite-api-url');
    expect(failedIds).toContain('manual-eft-billing');
    expect(failedIds).toContain('billing-proof-storage');
    expect(failedIds).toContain('transactional-email');
  });

  it('runs preflight before production migrations and exposes a direct script', () => {
    const startProduction = readRepoFile('scripts/start-production.ts');
    const packageJson = readRepoFile('package.json');

    expect(startProduction.indexOf('assertLaunchPreflight')).toBeGreaterThan(-1);
    expect(startProduction.indexOf("run('pnpm', ['db:migrate'])")).toBeGreaterThan(
      startProduction.indexOf('assertLaunchPreflight'),
    );
    expect(startProduction).toContain("process.env.APP_ENV = 'production'");
    expect(startProduction).toContain("APP_ENV: 'production'");
    expect(packageJson).toContain('"launch:preflight":');
    expect(packageJson).toContain(
      '"launch:preflight": "cross-env NODE_ENV=production APP_ENV=production tsx scripts/launch-preflight.ts"',
    );
    expect(packageJson).toContain(
      '"release:predeploy:production": "pnpm launch:preflight && cross-env NODE_ENV=production APP_ENV=production pnpm db:migrate"',
    );
  });
});
