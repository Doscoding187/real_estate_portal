import { describe, expect, it } from 'vitest';
import { getCityGuideContent } from '../../shared/cityGuideContent';
import { cityGuideInitialHtml } from '../../shared/cityGuideHtml';
import { injectSeoHead, resolveSeoPageData } from '../_core/seoHead';
const guide = getCityGuideContent('gauteng', 'johannesburg')!;
describe('City guide initial document', () => {
  it('keeps the canonical city route and local-review metadata', () => {
    const meta = resolveSeoPageData('/gauteng/johannesburg/?journey=buy');
    expect(meta).toMatchObject({
      title: guide.title,
      description: guide.description,
      canonicalUrl: 'https://www.propertylistifysa.co.za/gauteng/johannesburg',
      robots: 'noindex, follow',
    });
  });
  it('includes all seven regional chapters and every lifestyle context without live data', () => {
    const html = cityGuideInitialHtml('/gauteng/johannesburg')!;
    expect(html).toContain('city-guide-initial');
    for (const region of guide.regions) {
      expect(html).toContain(region.text);
      expect(html).toContain(region.consider);
    }
    for (const collection of guide.collections)
      expect(html).toContain(collection.context.replace(/&/g, '&amp;'));
    expect(html).toContain('Emmarentia');
    expect(html).not.toContain('avgPrice');
    expect(html).not.toContain('display:none');
  });
  it('does not apply the pilot to suburb or transaction routes or unresearched cities', () => {
    for (const path of [
      '/gauteng/johannesburg/sandton',
      '/property-for-sale/gauteng/johannesburg',
      '/gauteng/pretoria',
    ])
      expect(cityGuideInitialHtml(path)).toBeUndefined();
  });
  it('injects guide content and preserves the province initial document', () => {
    const template =
      '<html><head><title>Site</title><meta name="description" content="Site"><meta name="robots" content="index, follow"><link rel="canonical" href="/"></head><body><div id="root"></div></body></html>';
    expect(injectSeoHead(template, '/gauteng/johannesburg')).toContain('city-guide-initial');
    expect(injectSeoHead(template, '/gauteng')).toContain('province-guide-initial');
  });
});
