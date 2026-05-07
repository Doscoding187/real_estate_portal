import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERVICE_TOPIC_PAGES } from '@/pages/services/ServiceTopicPage';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('nav SEO architecture guardrails', () => {
  it('keeps service nav topics inside the services engine', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).toContain("href: '/services/home-loans'");
    expect(nav).toContain("href: '/services/property-valuation'");
    expect(nav).toContain("href: '/services/legal-services'");
    expect(nav).toContain("href: '/services/home-insurance'");
    expect(nav).toContain("href: '/services/interior-design'");
  });

  it('keeps insights and guides inside their content engines', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).toContain("href: '/insights/market-trends'");
    expect(nav).toContain("href: '/insights/property-insights'");
    expect(nav).toContain("href: '/guides/buying-property'");
    expect(nav).toContain("href: '/guides/selling-property'");
    expect(nav).toContain("href: '/insights/blog'");
  });

  it('does not route location autosuggest to the removed /search endpoint', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).not.toContain('/search?location');
    expect(nav).toContain('/property-for-sale/${provinceSlug}/${citySlug}');
  });

  it('keeps public location canonicals on the production domain helper', () => {
    const schema = readRepoFile('client/src/components/location/LocationSchema.tsx');
    const urlUtils = readRepoFile('client/src/lib/urlUtils.ts');

    expect(schema).toContain('toAbsoluteUrl(url)');
    expect(schema).not.toContain('https://propertylistify.com');
    expect(urlUtils).toContain('toAbsoluteUrl(generateIntentUrl(intent))');
    expect(urlUtils).not.toContain('https://propertylistify.com');
    expect(toAbsoluteUrl('/services/home-loans', 'https://www.propertylistifysa.co.za')).toBe(
      'https://www.propertylistifysa.co.za/services/home-loans',
    );
  });

  it('registers real service topic pages for nav service links', () => {
    expect(Object.keys(SERVICE_TOPIC_PAGES).sort()).toEqual([
      'home-insurance',
      'home-loans',
      'interior-design',
      'legal-services',
      'property-valuation',
    ]);
  });

  it('adds new engine landing pages to the static sitemap route', () => {
    const sitemap = readRepoFile('server/routes/sitemap.ts');

    expect(sitemap).toContain('/services/home-loans');
    expect(sitemap).toContain('/insights/market-trends');
    expect(sitemap).toContain('/guides/buying-property');
    expect(sitemap).toContain('/tools/property-valuation');
    expect(sitemap).toContain('/company/about');
  });
});
