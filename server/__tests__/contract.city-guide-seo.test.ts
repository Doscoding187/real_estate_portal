import { describe, expect, it } from 'vitest';
import { getCityGuideContent, getPublishedCityGuides } from '../../shared/cityGuideContent';
import { cityGuideInitialHtml } from '../../shared/cityGuideHtml';
import { injectSeoHead, resolveSeoPageData } from '../_core/seoHead';
const guide = getCityGuideContent('gauteng', 'johannesburg')!;
describe('City guide initial document', () => {
  it('keeps the canonical city route and review-state metadata', () => {
    const meta = resolveSeoPageData('/gauteng/johannesburg/?journey=buy');
    expect(meta).toMatchObject({
      title: guide.title,
      description: guide.description,
      canonicalUrl: 'https://www.propertylistifysa.co.za/gauteng/johannesburg',
      robots: 'noindex, follow',
    });
  });

  it('publishes the reviewed Johannesburg guide on its clean route', () => {
    expect(guide.status).toBe('published');
    expect(
      getPublishedCityGuides().map(candidate => `${candidate.provinceSlug}/${candidate.slug}`),
    ).toContain('gauteng/johannesburg');

    expect(resolveSeoPageData('/gauteng/johannesburg').robots).toBe('index, follow');
  });

  it('never presents a published guide with a local-review marker', () => {
    const html = cityGuideInitialHtml('/gauteng/johannesburg')!;
    expect(html).toContain('Sources checked 2026-10-15.');
    expect(html).not.toContain('Local-review draft.');
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
