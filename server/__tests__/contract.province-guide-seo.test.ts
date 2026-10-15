import { describe, expect, it } from 'vitest';
import { injectSeoHead, resolveSeoPageData } from '../_core/seoHead';
import {
  getProvinceGuideContent,
  getPublishedProvinceGuides,
} from '../../shared/provinceGuideContent';
import { provinceGuideInitialHtml } from '../../shared/provinceGuideHtml';
describe('Province editorial SEO contract', () => {
  it('uses one canonical route and matching guide metadata in initial HTML', () => {
    const guide = getProvinceGuideContent('gauteng')!;
    const data = resolveSeoPageData('/gauteng/?journey=buy');
    expect(data.title).toBe(guide.title);
    expect(data.description).toBe(guide.description);
    expect(data.canonicalUrl).toBe('https://www.propertylistifysa.co.za/gauteng');
    expect(data.robots).toBe('noindex, follow');
    const html = injectSeoHead(
      '<html><head><title>Site</title><meta name="description" content="Site" /><meta name="robots" content="index, follow" /><link rel="canonical" href="/" /></head><body><div id="root"></div></body></html>',
      '/gauteng',
    );
    expect(html).toContain('Explore Gauteng: regions, cities &amp; neighbourhoods');
    expect(html).toContain('province-guide-initial');
    expect(html).toContain('West Rand');
    expect(html).toContain('Sedibeng &amp; the Vaal');
    expect(html).not.toContain('avgPrice');
    expect(html).not.toContain('display:none');
  });
  it('keeps local editorial review separate from publication and sitemap readiness', () => {
    expect(getProvinceGuideContent('gauteng')?.status).toBe('local-review');
    expect(getPublishedProvinceGuides()).toEqual([]);
    expect(provinceGuideInitialHtml('/western-cape')).toBeUndefined();
  });
  it('renders stable sourced content without asking the database or inventory service', () => {
    const html = provinceGuideInitialHtml('/gauteng');
    expect(html).toContain('everyday');
    expect(html).toContain('https://www.gautrain.co.za/');
    expect(html).not.toContain('R1.8');
    expect(html).not.toContain('50,000');
  });
});
