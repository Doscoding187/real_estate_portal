import { describe, expect, it } from 'vitest';
import {
  COUNTRY_DISCOVERY_DESCRIPTION,
  COUNTRY_DISCOVERY_PATH,
  COUNTRY_DISCOVERY_TITLE,
} from '../../shared/countryDiscovery';
import { canonicalPlaceUrlByPath } from '../services/canonicalPlaceUrlService';
import { injectSeoHead, resolveSeoPageData } from '../_core/seoHead';

const SHELL =
  '<html><head><title>Site</title><meta name="description" content="Site"><meta name="robots" content="index, follow"><link rel="canonical" href="/"></head><body><div id="root"></div></body></html>';

describe('canonical national discovery entry', () => {
  it('is the single country route above admitted Place routes', () => {
    expect(COUNTRY_DISCOVERY_PATH).toBe('/south-africa');
    expect(COUNTRY_DISCOVERY_TITLE).toContain('South Africa');
    expect(COUNTRY_DISCOVERY_DESCRIPTION).toContain('canonical Place Authority');
    expect(canonicalPlaceUrlByPath(COUNTRY_DISCOVERY_PATH)).toBeNull();
  });

  it('serves its own metadata and canonical URL', () => {
    expect(resolveSeoPageData(COUNTRY_DISCOVERY_PATH)).toMatchObject({
      title: COUNTRY_DISCOVERY_TITLE,
      description: COUNTRY_DISCOVERY_DESCRIPTION,
      canonicalUrl: `https://www.propertylistifysa.co.za${COUNTRY_DISCOVERY_PATH}`,
      robots: 'index, follow',
    });
    expect(resolveSeoPageData(`${COUNTRY_DISCOVERY_PATH}?journey=buy`).robots).toBe(
      'noindex, follow',
    );
  });

  it('resolves geographic paths only when they belong to the canonical Place projection', () => {
    expect(canonicalPlaceUrlByPath('/gauteng')?.place_type).toBe('province');
    expect(canonicalPlaceUrlByPath('/gauteng/johannesburg')?.search_scope).toBe('metro_city');
    expect(resolveSeoPageData('/gauteng').robots).toBe('noindex, follow');
    expect(resolveSeoPageData('/gauteng/johannesburg').robots).toBe('noindex, follow');
    expect(canonicalPlaceUrlByPath('/south-africa/extra')).toBeNull();
  });

  it('injects country discovery structured data into its static document', () => {
    const html = injectSeoHead(SHELL, COUNTRY_DISCOVERY_PATH);
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain(
      `<link rel="canonical" href="https://www.propertylistifysa.co.za${COUNTRY_DISCOVERY_PATH}" />`,
    );
  });
});
