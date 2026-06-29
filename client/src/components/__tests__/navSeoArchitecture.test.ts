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

  it('covers Buyers desktop menu static routes', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).toContain('href="/property-for-sale"');
    expect(nav).toContain('href="/new-developments"');
    expect(nav).toContain('href="/insights/market-trends"');
  });

  it('covers Renters desktop menu static routes', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).toContain('href="/property-to-rent"');
    expect(nav).toContain('FALLBACK_CITY_LINKS');
    expect(nav).toContain('cityToNavLink');
    expect(nav).toContain('/property-to-rent');
  });

  it('nav rent fallback links use cityToNavLink adapter not string replacement', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).toContain('cityToNavLink(');
    expect(nav).toContain('FALLBACK_CITY_LINKS');
    expect(nav).not.toContain(".replace('/property-for-sale'");
    expect(nav).not.toContain('href="/property-to-rent/gauteng/johannesburg"');
    expect(nav).not.toContain('href="/property-to-rent/western-cape/cape-town"');
    expect(nav).not.toContain('href="/property-to-rent/kwazulu-natal/durban"');
  });

  it('fallback city links in the adapter use only canonical path-based hrefs', () => {
    const adapter = readRepoFile('client/src/lib/locationDataAdapter.ts');

    expect(adapter).toContain('/property-for-sale/gauteng/johannesburg');
    expect(adapter).toContain('/property-for-sale/western-cape/cape-town');
    expect(adapter).toContain('/property-for-sale/kwazulu-natal/durban');
    expect(adapter).toContain('/property-to-rent/western-cape/cape-town');
    expect(adapter).not.toContain('city=');
    expect(adapter).not.toContain('locations=');
    expect(adapter).not.toContain('suburb=');
  });

  it('covers Sellers desktop menu static routes', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).toContain('href="/agents"');
    expect(nav).toContain('href="/developers"');
    expect(nav).toContain('href="/advertise"');
    expect(nav).toContain('href="/dashboard"');
    expect(nav).toContain('href="/tools/property-valuation"');
    expect(nav).toContain('href="/tools/sold-house-prices"');
    expect(nav).toContain('href="/guides/selling-property"');
    expect(nav).toContain('ctaHref="/advertise/sell/developers"');
  });

  it('covers Insights desktop menu static routes', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).toContain('href="/insights/market-trends"');
    expect(nav).toContain('href="/insights/property-insights"');
    expect(nav).toContain('href="/guides/buying-property"');
    expect(nav).toContain('href="/guides/selling-property"');
    expect(nav).toContain('href="/insights/blog"');
  });

  it('covers Explore desktop menu static routes', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).toContain('href="/explore/home"');
    expect(nav).toContain('href="/new-developments"');
    expect(nav).toContain('href="/agents"');
  });

  it('covers Services desktop menu static routes', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).toContain('href="/services"');
    expect(nav).toContain('href="/services/home-loans"');
    expect(nav).toContain('href="/services/property-valuation"');
    expect(nav).toContain('href="/services/home-insurance"');
    expect(nav).toContain('href="/services/legal-services"');
    expect(nav).toContain('href="/services/interior-design"');
  });

  it('covers global desktop action routes', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).toContain('href="/distribution-network"');
    expect(nav).toContain('href="/advertise"');
    expect(nav).toContain("'/favorites'");
    expect(nav).toContain('href="/"');
  });

  it('has no stale /search paths in desktop nav', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).not.toContain("'/search'");
    expect(nav).not.toContain('"/search"');
  });

  it('has no raw <a href tags in desktop nav', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).not.toMatch(/<a\s+href=/);
  });

  it('has no placeholder # hrefs in desktop nav', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(nav).not.toContain('href="#"');
    expect(nav).not.toContain("href: '#'");
  });

  it('covers new public SEO pages in the static sitemap', () => {
    const sitemap = readRepoFile('server/routes/sitemap.ts');

    expect(sitemap).toContain('/explore/home');
    expect(sitemap).toContain('/agents');
  });
});
