import { describe, expect, it } from 'vitest';
import { injectSeoHead, resolveSeoPageData } from '../_core/seoHead';
import { selectPublishedGuides } from '../../shared/guidePublication';
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

  it('publishes the reviewed Gauteng guide on its clean route', () => {
    const guide = getProvinceGuideContent('gauteng')!;
    expect(guide.status).toBe('published');
    expect(getPublishedProvinceGuides().map(candidate => candidate.slug)).toContain('gauteng');

    const data = resolveSeoPageData('/gauteng');
    expect(data.robots).toBe('index, follow');
    expect(data.title).toBe(guide.title);
    expect(data.canonicalUrl).toBe('https://www.propertylistifysa.co.za/gauteng');
  });

  it('never presents a published guide with a local-review marker', () => {
    const html = provinceGuideInitialHtml('/gauteng')!;
    expect(html).toContain('Sources checked 2026-10-15.');
    expect(html).not.toContain('Local-review draft.');
    expect(html).not.toContain('Local preview draft.');
  });

  it('keeps local editorial review separate from publication and sitemap readiness', () => {
    // The rule, not the pilot's current state: a guide in local review is never published.
    expect(
      selectPublishedGuides([
        { slug: 'draft', status: 'local-review' as const },
        { slug: 'approved', status: 'published' as const },
      ]).map(guide => guide.slug),
    ).toEqual(['approved']);
    // A place record without reviewed content is still not a guide.
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

it('retains complete region chapters and adds sourced discovery context to the initial document', () => {
  const guide = getProvinceGuideContent('gauteng')!;
  const html = provinceGuideInitialHtml('/gauteng')!;
  const escape = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  for (const region of guide.regions)
    for (const paragraph of region.paragraphs) expect(html).toContain(escape(paragraph));
  for (const collection of guide.collections) {
    expect(html).toContain(escape(collection.context));
    for (const id of collection.sourceIds)
      expect(guide.sources.some(source => source.id === id)).toBe(true);
    for (const place of collection.places)
      expect(guide.regions.some(region => region.id === place.regionId)).toBe(true);
  }
  expect(guide.regions).toHaveLength(5);
  expect(guide.collections).toHaveLength(6);
  expect(html).toContain('Emmarentia Dam');
});
