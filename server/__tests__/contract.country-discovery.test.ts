import { describe, expect, it } from 'vitest';
import {
  COUNTRY_DISCOVERY_DESCRIPTION,
  COUNTRY_DISCOVERY_PATH,
  COUNTRY_DISCOVERY_TITLE,
  COUNTRY_PROVINCES,
  countryDiscoveryInitialHtml,
} from '../../shared/countryDiscovery';
import { GUIDE_HTML_ROUTES } from '../../shared/guideRoutes';
import { injectSeoHead, resolveSeoPageData } from '../_core/seoHead';
import { PROVINCIAL_CONFIGS } from '../../shared/provincialDiscovery';

const SHELL =
  '<html><head><title>Site</title><meta name="description" content="Site"><meta name="robots" content="index, follow"><link rel="canonical" href="/"></head><body><div id="root"></div></body></html>';

describe('national discovery entry', () => {
  it('lists every province exactly once and links to its guide', () => {
    const slugs = COUNTRY_PROVINCES.map(province => province.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.sort()).toEqual(Object.keys(PROVINCIAL_CONFIGS).sort());
    for (const province of COUNTRY_PROVINCES) {
      expect(province.path).toBe(`/${province.slug}`);
      expect(province.name.trim().length).toBeGreaterThan(0);
      expect(province.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('serves its own metadata and canonical route', () => {
    const metadata = resolveSeoPageData(COUNTRY_DISCOVERY_PATH);
    expect(metadata).toMatchObject({
      title: COUNTRY_DISCOVERY_TITLE,
      description: COUNTRY_DISCOVERY_DESCRIPTION,
      canonicalUrl: `https://www.propertylistifysa.co.za${COUNTRY_DISCOVERY_PATH}`,
      robots: 'index, follow',
    });
    expect(resolveSeoPageData(`${COUNTRY_DISCOVERY_PATH}?journey=buy`).robots).toBe(
      'noindex, follow',
    );
  });

  it('delivers a visible document with the province directory and the ladder', () => {
    const html = countryDiscoveryInitialHtml(COUNTRY_DISCOVERY_PATH)!;
    expect(html).toContain('country-discovery-initial');
    expect(html).toContain('Property for sale in South Africa');
    for (const province of COUNTRY_PROVINCES) {
      expect(html).toContain(`href="/${province.slug}"`);
      expect(html).toContain(province.name);
    }
    expect(html).toContain('Province');
    expect(html).toContain('City');
    expect(html).toContain('Suburb');
    expect(html).not.toContain('display:none');
  });

  it('does not claim a document for any other route', () => {
    for (const path of ['/', '/gauteng', '/gauteng/johannesburg', '/south-africa/extra']) {
      expect(countryDiscoveryInitialHtml(path)).toBeUndefined();
    }
  });

  it('is delivered as a document and carries place and breadcrumb structured data', () => {
    expect(GUIDE_HTML_ROUTES).toContain('south-africa');

    const html = injectSeoHead(SHELL, COUNTRY_DISCOVERY_PATH);
    expect(html).toContain('country-discovery-initial');
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain(
      `<link rel="canonical" href="https://www.propertylistifysa.co.za${COUNTRY_DISCOVERY_PATH}" />`,
    );
  });
});
