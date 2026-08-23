import { describe, expect, it } from 'vitest';
import { injectSeoHead, resolveSeoPageData } from '../_core/seoHead';

describe('seo head agent routes', () => {
  it('resolves the agent directory route', () => {
    const seo = resolveSeoPageData('https://www.propertylistifysa.co.za/agents');
    expect(seo.title).toContain('Property Practitioners');
    expect(seo.canonicalUrl.endsWith('/agents')).toBe(true);
    expect(seo.robots).toBe('index, follow');
  });

  it('resolves an individual agent presence slug with a canonical /agents URL', () => {
    const seo = resolveSeoPageData(
      'https://www.propertylistifysa.co.za/agents/amina-nkosi-33?tab=listings',
    );
    expect(seo.title).toContain('Property Practitioner');
    expect(seo.canonicalUrl).toBe('https://www.propertylistifysa.co.za/agents/amina-nkosi-33');
    expect(seo.robots).toBe('index, follow');
  });

  it('normalises the short /a/:slug alias onto the canonical agents route', () => {
    const seo = resolveSeoPageData('https://www.propertylistifysa.co.za/a/amina-nkosi-33');
    expect(seo.canonicalUrl).toBe('https://www.propertylistifysa.co.za/agents/amina-nkosi-33');
    expect(seo.robots).toBe('index, follow');
  });

  it('injects the resolved canonical link into the served HTML shell', () => {
    const template =
      '<html><head><title>Property Listify</title>' +
      '<link rel="canonical" href="https://www.propertylistifysa.co.za/" /></head><body></body></html>';
    const html = injectSeoHead(template, 'https://www.propertylistifysa.co.za/a/amina-nkosi-33');
    expect(html).toContain('href="https://www.propertylistifysa.co.za/agents/amina-nkosi-33"');
  });
});
