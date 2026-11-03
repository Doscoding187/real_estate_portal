import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build } from 'vite';
import { canonicalDiscoveryHtml } from '../../vite.config';

let root: string;
let outDir: string;

const SHELL = [
  '<!doctype html><html><head>',
  '<title>Property Listify</title>',
  '<meta name="description" content="Site" />',
  '<meta name="robots" content="index, follow" />',
  '<meta property="og:url" content="https://www.propertylistifysa.co.za/" />',
  '<meta property="og:title" content="Property Listify" />',
  '<meta property="og:description" content="Site" />',
  '<meta property="og:site_name" content="Property Listify" />',
  '<meta name="twitter:url" content="https://www.propertylistifysa.co.za/" />',
  '<meta name="twitter:title" content="Property Listify" />',
  '<meta name="twitter:description" content="Site" />',
  '<link rel="canonical" href="https://www.propertylistifysa.co.za/" />',
  '</head><body><div id="root"></div></body></html>',
].join('');

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'property-listify-place-build-'));
  outDir = path.join(root, 'out');
  await writeFile(path.join(root, 'index.html'), SHELL);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

async function buildDiscovery() {
  await build({
    configFile: false,
    root,
    envDir: root,
    publicDir: false,
    logLevel: 'silent',
    plugins: [canonicalDiscoveryHtml()],
    build: { outDir, emptyOutDir: true, minify: false },
  });
}

describe('canonical Place discovery document build', () => {
  it('emits one static country entry document and no province, city, or locality copies', async () => {
    await buildDiscovery();

    const country = await readFile(path.join(outDir, 'south-africa/index.html'), 'utf8');
    expect(country).toContain('Search property locations in South Africa');
    expect(country).toContain(
      '<link rel="canonical" href="https://www.propertylistifysa.co.za/south-africa" />',
    );
    expect(country).toContain('<meta name="robots" content="index, follow" />');

    for (const legacyGuidePath of [
      'gauteng/index.html',
      'gauteng/johannesburg/index.html',
      'gauteng/johannesburg/sandton/index.html',
    ]) {
      await expect(stat(path.join(outDir, legacyGuidePath))).rejects.toThrow();
    }
  });

  it('provides the country breadcrumb while Place structured data comes from the canonical projection', async () => {
    await buildDiscovery();

    const country = await readFile(path.join(outDir, 'south-africa/index.html'), 'utf8');
    expect(country).toContain('<script type="application/ld+json" data-seo-managed="true">');
    expect(country).toContain('"@type":"BreadcrumbList"');
    expect(country).not.toContain('province-guide-initial');
    expect(country).not.toContain('city-guide-initial');
    expect(country).not.toContain('suburb-guide-initial');
  });
});
