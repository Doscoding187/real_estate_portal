import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build } from 'vite';
import { guideEditorialHtml } from '../../vite.config';

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
  root = await mkdtemp(path.join(os.tmpdir(), 'property-listify-guide-build-'));
  outDir = path.join(root, 'out');
  await writeFile(path.join(root, 'index.html'), SHELL);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

async function buildGuides() {
  await build({
    configFile: false,
    root,
    envDir: root,
    publicDir: false,
    logLevel: 'silent',
    plugins: [guideEditorialHtml()],
    build: { outDir, emptyOutDir: true, minify: false },
  });
}

describe('guide static document build contract', () => {
  it('emits a delivered document for every pilot guide route', async () => {
    await buildGuides();

    for (const guidePath of [
      'south-africa/index.html',
      'gauteng/index.html',
      'gauteng/johannesburg/index.html',
      'gauteng/johannesburg/sandton/index.html',
    ]) {
      const html = await readFile(path.join(outDir, guidePath), 'utf8');
      expect(html.length).toBeGreaterThan(0);
      expect(html).not.toContain('Site</title>');
    }
  });

  it('delivers the guide body, canonical and robots metadata for each pilot route', async () => {
    await buildGuides();

    const country = await readFile(path.join(outDir, 'south-africa/index.html'), 'utf8');
    expect(country).toContain('country-discovery-initial');
    expect(country).toContain('Property for sale in South Africa');
    expect(country).toContain(
      '<link rel="canonical" href="https://www.propertylistifysa.co.za/south-africa" />',
    );
    expect(country).toContain('<meta name="robots" content="index, follow" />');
    expect(country).toContain('"@type":"ItemList"');

    const province = await readFile(path.join(outDir, 'gauteng/index.html'), 'utf8');
    expect(province).toContain('province-guide-initial');
    expect(province).toContain(
      '<title>Explore Gauteng: regions, cities &amp; neighbourhoods | Property Listify</title>',
    );
    expect(province).toContain(
      '<link rel="canonical" href="https://www.propertylistifysa.co.za/gauteng" />',
    );
    expect(province).toContain('<meta name="robots" content="index, follow" />');

    const city = await readFile(path.join(outDir, 'gauteng/johannesburg/index.html'), 'utf8');
    expect(city).toContain('city-guide-initial');
    expect(city).toContain(
      '<link rel="canonical" href="https://www.propertylistifysa.co.za/gauteng/johannesburg" />',
    );
    expect(city).toContain('<meta name="robots" content="index, follow" />');

    const suburb = await readFile(
      path.join(outDir, 'gauteng/johannesburg/sandton/index.html'),
      'utf8',
    );
    expect(suburb).toContain('suburb-guide-initial');
    expect(suburb).toContain(
      '<link rel="canonical" href="https://www.propertylistifysa.co.za/gauteng/johannesburg/sandton" />',
    );
    expect(suburb).toContain('<meta name="robots" content="index, follow" />');
  });

  it('delivers structured data that a crawler can read without running JavaScript', async () => {
    await buildGuides();

    const province = await readFile(path.join(outDir, 'gauteng/index.html'), 'utf8');
    expect(province).toContain('<script type="application/ld+json" data-seo-managed="true">');
    expect(province).toContain('"@type":"BreadcrumbList"');
    expect(province).toContain('"@type":"AdministrativeArea"');
    expect(province).toContain('"name":"Gauteng"');

    const city = await readFile(path.join(outDir, 'gauteng/johannesburg/index.html'), 'utf8');
    expect(city).toContain('"@type":"City"');
    expect(city).toContain('"name":"Johannesburg"');

    const suburb = await readFile(
      path.join(outDir, 'gauteng/johannesburg/sandton/index.html'),
      'utf8',
    );
    expect(suburb).toContain('"@type":"Place"');
    expect(suburb).toContain('"name":"Sandton"');
    expect(suburb).toContain('"addressLocality":"Johannesburg"');
  });

  it('never ships a draft marker on a published guide document', async () => {
    await buildGuides();

    for (const guidePath of [
      'south-africa/index.html',
      'gauteng/index.html',
      'gauteng/johannesburg/index.html',
      'gauteng/johannesburg/sandton/index.html',
    ]) {
      const html = await readFile(path.join(outDir, guidePath), 'utf8');
      expect(html).not.toContain('Local-review draft.');
      expect(html).not.toContain('Local preview draft.');
    }
  });

  it('does not fabricate live metrics in the delivered guide documents', async () => {
    await buildGuides();

    for (const guidePath of [
      'south-africa/index.html',
      'gauteng/index.html',
      'gauteng/johannesburg/index.html',
      'gauteng/johannesburg/sandton/index.html',
    ]) {
      const html = await readFile(path.join(outDir, guidePath), 'utf8');
      expect(html).not.toContain('avgPrice');
      expect(html).not.toContain('display:none');
      expect(html).not.toMatch(/\bR\s?\d[\d.,]*\s*(?:million|thousand|billion|per month)\b/i);
    }
  });
});
