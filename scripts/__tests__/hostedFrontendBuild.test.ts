import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build } from 'vite';
import { hostedFrontendBuild } from '../../vite.config';

const metadata = {
  gitSha: '1234567890abcdef1234567890abcdef12345678',
  buildTime: '2026-10-11T19:00:00.000Z',
};
let root: string;
let outDir: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'property-listify-frontend-contract-'));
  outDir = path.join(root, 'custom-output');
  await writeFile(
    path.join(root, 'index.html'),
    '<html><body>Build contract fixture</body></html>',
  );
  for (const name of [
    'VERCEL_ENV',
    'VITE_DEPLOY_ENV',
    'VITE_APP_URL',
    'VITE_API_URL',
    'VITE_API_BASE_URL',
    'VITE_USE_MOCK_EMAILS',
  ])
    vi.stubEnv(name, undefined);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

const fixtureBuild = (source = metadata) =>
  build({
    configFile: false,
    root,
    envDir: root,
    publicDir: false,
    logLevel: 'silent',
    plugins: [hostedFrontendBuild(source)],
    build: { outDir, emptyOutDir: true, minify: false },
  });

describe('hosted frontend build contract (real minimal Vite builds)', () => {
  it('emits version and preview crawler assets into the actual configured output directory', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VITE_DEPLOY_ENV', 'preview');
    vi.stubEnv('VITE_API_URL', 'https://api-staging.propertylistifysa.co.za');
    await fixtureBuild();
    expect(JSON.parse(await readFile(path.join(outDir, 'version.json'), 'utf8'))).toEqual({
      ...metadata,
      env: 'preview',
    });
    expect(await readFile(path.join(outDir, 'robots-staging.txt'), 'utf8')).toBe(
      'User-agent: *\nDisallow: /\n',
    );
    expect(await readFile(path.join(outDir, 'sitemap-staging.xml'), 'utf8')).toContain('<urlset');
  });

  it('preserves the original missing-preview-environment failure without emitting false metadata', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    await expect(fixtureBuild()).rejects.toThrow(
      'Vercel preview requires explicit VITE_DEPLOY_ENV=staging or preview.',
    );
    await expect(access(path.join(outDir, 'version.json'))).rejects.toThrow();
  });

  it('rejects a preview that would call the production API', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VITE_DEPLOY_ENV', 'preview');
    vi.stubEnv('VITE_API_URL', 'https://api.propertylistifysa.co.za');
    await expect(fixtureBuild()).rejects.toThrow(
      'Unauthenticated previews may call only the staging API origin.',
    );
  });

  it('emits production identity while omitting staging crawler assets', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VITE_DEPLOY_ENV', 'production');
    vi.stubEnv('VITE_APP_URL', 'https://www.propertylistifysa.co.za');
    vi.stubEnv('VITE_API_URL', 'https://api.propertylistifysa.co.za');
    await fixtureBuild();
    expect(JSON.parse(await readFile(path.join(outDir, 'version.json'), 'utf8'))).toEqual({
      ...metadata,
      env: 'production',
    });
    await expect(access(path.join(outDir, 'robots-staging.txt'))).rejects.toThrow();
    await expect(access(path.join(outDir, 'sitemap-staging.xml'))).rejects.toThrow();
  });

  it.each([
    ['VITE_APP_URL', 'https://wrong.invalid', 'exact HTTPS VITE_APP_URL and VITE_API_URL'],
    ['VITE_API_BASE_URL', 'https://wrong.invalid', 'VITE_API_BASE_URL must equal VITE_API_URL'],
    ['VITE_USE_MOCK_EMAILS', 'true', 'Hosted frontend must not enable mock email'],
  ])('preserves hosted validation for %s', async (key, value, error) => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VITE_DEPLOY_ENV', 'production');
    vi.stubEnv('VITE_APP_URL', 'https://www.propertylistifysa.co.za');
    vi.stubEnv('VITE_API_URL', 'https://api.propertylistifysa.co.za');
    vi.stubEnv(key, value);
    await expect(fixtureBuild()).rejects.toThrow(error);
  });

  it('still rejects hosted source identities that are not full commit SHAs', async () => {
    vi.stubEnv('VITE_DEPLOY_ENV', 'staging');
    vi.stubEnv('VITE_APP_URL', 'https://staging.propertylistifysa.co.za');
    vi.stubEnv('VITE_API_URL', 'https://api-staging.propertylistifysa.co.za');
    await expect(fixtureBuild({ ...metadata, gitSha: 'short' })).rejects.toThrow(
      'Hosted frontend requires a full 40-character build SHA',
    );
  });

  it('does not create version metadata when compilation fails after build validation', async () => {
    await writeFile(
      path.join(root, 'index.html'),
      '<script type="module" src="/missing.js"></script>',
    );
    await expect(fixtureBuild()).rejects.toThrow();
    await expect(access(path.join(outDir, 'version.json'))).rejects.toThrow();
  });
});
