import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock('../db-connection', () => ({ getDb: getDbMock }));

import sitemapRouter from '../routes/sitemap';
import { injectSeoHead, resolveSeoPageData } from '../_core/seoHead';
import { GUIDE_HTML_ROUTES } from '../../shared/guideRoutes';
import { getPublishedCityGuides } from '../../shared/cityGuideContent';
import { getPublishedProvinceGuides } from '../../shared/provinceGuideContent';
import { getPublishedSuburbGuidePaths } from '../../shared/suburbGuidePolicy';
import { SITEMAP_INDEX_CHILDREN } from '../../shared/sitemapIndex';
import { provinceGuideInitialHtml } from '../../shared/provinceGuideHtml';
import { cityGuideInitialHtml } from '../../shared/cityGuideHtml';
import { suburbGuideInitialHtml } from '../../shared/suburbGuideHtml';

const SHELL =
  '<html><head><title>Site</title><meta name="description" content="Site"><meta name="robots" content="index, follow"><link rel="canonical" href="/"></head><body><div id="root"></div></body></html>';

const PILOT_ROUTES = [
  { path: '/gauteng', canonical: 'https://www.propertylistifysa.co.za/gauteng' },
  {
    path: '/gauteng/johannesburg',
    canonical: 'https://www.propertylistifysa.co.za/gauteng/johannesburg',
  },
  {
    path: '/gauteng/johannesburg/sandton',
    canonical: 'https://www.propertylistifysa.co.za/gauteng/johannesburg/sandton',
  },
];

async function requestSitemap(path: string): Promise<string> {
  getDbMock.mockResolvedValue({
    select: vi.fn(() => ({ from: () => ({ where: async () => [] }) })),
  });
  let body = '';
  await new Promise<void>((resolve, reject) => {
    const res = {
      setHeader: () => undefined,
      status: () => res,
      send: (payload: string) => {
        body = payload;
        resolve();
      },
    };
    (
      sitemapRouter as unknown as (
        req: unknown,
        res: unknown,
        next: (error?: unknown) => void,
      ) => void
    )(
      {
        method: 'GET',
        url: path,
        originalUrl: path,
        headers: {},
        get: (name: string) => (name === 'host' ? 'www.propertylistifysa.co.za' : undefined),
      },
      res,
      error => (error ? reject(error) : resolve()),
    );
  });
  return body;
}

describe('published guide pilot', () => {
  it('serves indexable metadata on every clean pilot route', () => {
    for (const route of PILOT_ROUTES) {
      const metadata = resolveSeoPageData(route.path);
      expect(metadata.robots).toBe('index, follow');
      expect(metadata.canonicalUrl).toBe(route.canonical);
      expect(metadata.title).not.toBe(
        'Property Listify | South African Property Search and New Developments',
      );
    }
  });

  it('keeps filtered and non-pilot geography routes noindex', () => {
    for (const route of PILOT_ROUTES) {
      expect(resolveSeoPageData(`${route.path}?journey=buy`).robots).toBe('noindex, follow');
    }
    expect(resolveSeoPageData('/gauteng/johannesburg/rosebank').robots).toBe('noindex, follow');
    expect(resolveSeoPageData('/western-cape/cape-town/claremont').robots).toBe('noindex, follow');
  });

  it('delivers a distinct first document for each pilot route', () => {
    expect(provinceGuideInitialHtml('/gauteng')).toContain('province-guide-initial');
    expect(cityGuideInitialHtml('/gauteng/johannesburg')).toContain('city-guide-initial');
    expect(suburbGuideInitialHtml('/gauteng/johannesburg/sandton')).toContain(
      'suburb-guide-initial',
    );
  });

  it('gives the suburb pilot the reviewed city context without inventing metrics', () => {
    const html = suburbGuideInitialHtml('/gauteng/johannesburg/sandton')!;
    expect(html).toContain('Explore Sandton');
    expect(html).toContain('Where Sandton fits in the city');
    expect(html).toContain('Alexandra and parts of Sandton and Rosebank sit within Region E');
    expect(html).toContain(
      'https://joburg.org.za/about_/regions/Pages/Region%20E%20-%20Sandton%2C%20Alexandra/region-e.aspx',
    );
    expect(html).not.toContain('avgPrice');
    expect(html).not.toContain('display:none');
    // Live counts, prices and amenities are not part of the delivered document.
    expect(html).not.toMatch(/\bR\s?\d[\d.,]*\s*(?:million|thousand|billion|per month)\b/i);
    expect(html).not.toContain('ZAR');
    expect(html).not.toContain('eligible listings for sale in Sandton');
    expect(html).not.toContain('eligible listings to rent in Sandton');
  });

  it('never shows a draft marker on a published guide document', () => {
    for (const path of ['/gauteng', '/gauteng/johannesburg', '/gauteng/johannesburg/sandton']) {
      const html = injectSeoHead(SHELL, path);
      expect(html).not.toContain('Local-review draft.');
      expect(html).not.toContain('Local preview draft.');
      expect(html).toContain('Sources checked 2026-10-15.');
    }
  });

  it('builds a delivered document for every pilot guide route', () => {
    expect(GUIDE_HTML_ROUTES).toEqual([
      'gauteng',
      'gauteng/johannesburg',
      'gauteng/johannesburg/sandton',
    ]);
  });
});

describe('published guide sitemap', () => {
  it('lists every published guide route and no unpublished one', async () => {
    const body = await requestSitemap('/sitemap-guides.xml');
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/gauteng</loc>');
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/gauteng/johannesburg</loc>');
    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/gauteng/johannesburg/sandton</loc>',
    );
    expect(body).not.toContain('/gauteng/johannesburg/rosebank');
    expect(body).not.toContain('/western-cape');
  });

  it('advertises the guide sitemap in the public index', async () => {
    const body = await requestSitemap('/sitemap.xml');
    expect(body).toContain('/sitemap-guides.xml');
  });

  it('serves the same sitemap index children from the static fallback document', async () => {
    const staticIndex = await readFile(
      path.resolve(import.meta.dirname, '../../client/public/sitemap.xml'),
      'utf8',
    );
    const children = [...staticIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    expect(children).toEqual(
      SITEMAP_INDEX_CHILDREN.map(child => `https://www.propertylistifysa.co.za${child}`),
    );
  });

  it('publishes exactly the routes the guide registries mark as published', () => {
    expect(getPublishedProvinceGuides().map(guide => guide.slug)).toEqual(['gauteng']);
    expect(getPublishedCityGuides().map(guide => `${guide.provinceSlug}/${guide.slug}`)).toEqual([
      'gauteng/johannesburg',
    ]);
    expect(getPublishedSuburbGuidePaths()).toEqual(['gauteng/johannesburg/sandton']);
  });
});
